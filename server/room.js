// Manajemen Room, Server Otoritatif, Konfirmasi Kartu 2-Fase, & Signaling WebRTC (Upgrade Tugas 3)

import crypto from "crypto";
import { GameEngine } from "../shared/gameEngine.js";

const TURN_DURATION_MS = 60 * 1000;
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.socketToSession = new Map();

    this._setupSocketHandlers();
    this._startGlobalTurnTimer();
  }

  _setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      socket.on("createRoom", (payload, callback) => {
        const { nama, warna, karakter, token } = payload || {};
        const sessionToken = token || this._generateToken();
        const roomCode = this._generateRoomCode();

        const playerId = "p1";
        const room = {
          code: roomCode,
          status: "LOBBY",
          hostToken: sessionToken,
          players: [
            {
              id: playerId,
              token: sessionToken,
              socketId: socket.id,
              nama: (nama || "Warga 1").slice(0, 20),
              warna: warna || "#ef4444",
              karakter: karakter || "keponakan_pejabat",
              connected: true,
              micMuted: false,
            },
          ],
          engine: new GameEngine(),
          turnDeadline: null,
        };

        this.rooms.set(roomCode, room);
        this.socketToSession.set(socket.id, { roomCode, token: sessionToken });
        socket.join(roomCode);

        callback?.({
          ok: true,
          roomCode,
          playerId,
          token: sessionToken,
          roomSummary: this._getRoomSummary(room),
        });

        this._broadcastRoomLobby(room);
      });

      socket.on("joinRoom", (payload, callback) => {
        const { roomCode: rawCode, nama, warna, karakter, token } = payload || {};
        const roomCode = (rawCode || "").trim().toUpperCase();
        const room = this.rooms.get(roomCode);

        if (!room) {
          return callback?.({
            ok: false,
            pesan: `Room "${roomCode}" tidak ditemukan.`,
          });
        }

        const existingPlayer = room.players.find((p) => p.token === token);
        if (existingPlayer) {
          return this._handleReconnectPlayer(
            socket,
            room,
            existingPlayer,
            callback,
          );
        }

        if (room.status !== "LOBBY") {
          return callback?.({
            ok: false,
            pesan:
              "Permainan di room ini sudah dimulai. Tidak bisa masuk sebagai pemain baru.",
          });
        }

        if (room.players.length >= 4) {
          return callback?.({
            ok: false,
            pesan: "Room sudah penuh (maksimal 4 pemain).",
          });
        }

        const sessionToken = token || this._generateToken();
        const playerId = `p${room.players.length + 1}`;

        const usedColors = new Set(
          room.players.map((p) => p.warna.toLowerCase()),
        );
        const fallbackColors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];
        let chosenColor = warna || fallbackColors[room.players.length % 4];
        if (usedColors.has(chosenColor.toLowerCase())) {
          const unused = fallbackColors.find((c) => !usedColors.has(c));
          if (unused) chosenColor = unused;
        }

        room.players.push({
          id: playerId,
          token: sessionToken,
          socketId: socket.id,
          nama: (nama || `Warga ${room.players.length + 1}`).slice(0, 20),
          warna: chosenColor,
          karakter: karakter || "keponakan_pejabat",
          connected: true,
          micMuted: false,
        });

        this.socketToSession.set(socket.id, { roomCode, token: sessionToken });
        socket.join(roomCode);

        callback?.({
          ok: true,
          roomCode,
          playerId,
          token: sessionToken,
          roomSummary: this._getRoomSummary(room),
        });

        this._broadcastRoomLobby(room);
      });

      socket.on("reconnectRoom", (payload, callback) => {
        const { roomCode: rawCode, token } = payload || {};
        const roomCode = (rawCode || "").trim().toUpperCase();
        const room = this.rooms.get(roomCode);

        if (!room || !token) {
          return callback?.({
            ok: false,
            pesan: "Sesi room tidak ditemukan atau sudah berakhir.",
          });
        }

        const existingPlayer = room.players.find((p) => p.token === token);
        if (!existingPlayer) {
          return callback?.({
            ok: false,
            pesan: "Token pemain tidak terdaftar di room ini.",
          });
        }

        this._handleReconnectPlayer(socket, room, existingPlayer, callback);
      });

      socket.on("startGame", (_payload, callback) => {
        const ctx = this._getSessionContext(socket.id);
        if (!ctx)
          return callback?.({
            ok: false,
            pesan: "Anda belum berada di dalam room.",
          });

        const { room, player } = ctx;
        if (room.hostToken !== player.token) {
          return callback?.({
            ok: false,
            pesan: "Hanya Host yang dapat memulai permainan.",
          });
        }
        if (room.players.length < 2 || room.players.length > 4) {
          return callback?.({
            ok: false,
            pesan: "Jumlah pemain harus antara 2 hingga 4 warga.",
          });
        }

        room.status = "PLAYING";
        room.players.forEach((p, idx) => {
          p.id = `p${idx + 1}`;
        });

        room.engine.initGame(
          room.players.map((p) => ({
            id: p.id,
            nama: p.nama,
            warna: p.warna,
            karakter: p.karakter,
          })),
        );

        this._sinkronkanStatusKoneksiKeState(room);
        this._resetTurnDeadline(room);

        const publicState = this._getEnrichedState(room);
        this.io.to(room.code).emit("gameStarted", {
          roomSummary: this._getRoomSummary(room),
          state: publicState,
        });

        callback?.({ ok: true });
      });

      // Intent Aksi Permainan dari Klien (Termasuk 'confirmCard' untuk Tugas 3)
      socket.on("gameIntent", (payload, callback) => {
        const ctx = this._getSessionContext(socket.id);
        if (!ctx) {
          return callback?.({ ok: false, pesan: "Sesi tidak valid." });
        }

        const { room, player } = ctx;
        if (room.status !== "PLAYING") {
          return callback?.({
            ok: false,
            pesan: "Permainan belum dimulai atau sudah berakhir.",
          });
        }

        const { intent, tileIndex } = payload || {};
        let result = { ok: false, pesan: "Intent tidak dikenali." };

        if (intent === "rollDice") {
          result = room.engine.rollDice(player.id);
        } else if (intent === "confirmCard") {
          result = room.engine.confirmCard(player.id);
        } else if (intent === "payJail") {
          result = room.engine.bayarKeluarPenjara(player.id);
        } else if (intent === "buy") {
          result = room.engine.buyProperty(player.id);
        } else if (intent === "skipBuy") {
          result = room.engine.skipBuy(player.id);
        } else if (intent === "upgrade") {
          result = room.engine.upgradeProperty(player.id, Number(tileIndex));
        } else if (intent === "sell") {
          result = room.engine.sellAsset(player.id, Number(tileIndex));
        } else if (intent === "endTurn") {
          result = room.engine.endTurn(player.id);
        }

        if (!result.ok) {
          return callback?.({ ok: false, pesan: result.pesan });
        }

        if (intent === "endTurn") {
          this._resetTurnDeadline(room);
        }

        this._sinkronkanStatusKoneksiKeState(room);
        const enrichedState = this._getEnrichedState(room);

        this.io.to(room.code).emit("gameEventBatch", {
          actorId: player.id,
          intent,
          events: result.events || [],
          state: enrichedState,
        });

        callback?.({ ok: true });
        this._periksaDanLewatiJikaPemainAktifOffline(room);
      });

      socket.on("webrtc-ready", () => {
        const ctx = this._getSessionContext(socket.id);
        if (!ctx) return;
        const { room, player } = ctx;
        socket.to(room.code).emit("webrtc-peer-ready", {
          fromPlayerId: player.id,
        });
      });

      socket.on("webrtc-signal", (payload) => {
        const ctx = this._getSessionContext(socket.id);
        if (!ctx || !payload) return;
        const { room, player } = ctx;
        const { toPlayerId, type, sdp, candidate } = payload;

        const targetPeer = room.players.find(
          (p) => p.id === toPlayerId && p.connected && p.socketId,
        );
        if (!targetPeer) return;

        this.io.to(targetPeer.socketId).emit("webrtc-signal", {
          fromPlayerId: player.id,
          type,
          sdp,
          candidate,
        });
      });

      socket.on("voice-state", (payload) => {
        const ctx = this._getSessionContext(socket.id);
        if (!ctx || !payload) return;
        const { room, player } = ctx;

        if (typeof payload.micMuted === "boolean") {
          player.micMuted = payload.micMuted;
        }

        this.io.to(room.code).emit("voice-state-update", {
          playerId: player.id,
          micMuted: player.micMuted,
          speaking: Boolean(payload.speaking),
        });
      });

      socket.on("leaveRoom", (_payload, callback) => {
        this._handleLeaveOrDisconnect(socket, true);
        callback?.({ ok: true });
      });

      socket.on("disconnect", () => {
        this._handleLeaveOrDisconnect(socket, false);
      });
    });
  }

  _handleReconnectPlayer(socket, room, player, callback) {
    player.socketId = socket.id;
    player.connected = true;
    this.socketToSession.set(socket.id, {
      roomCode: room.code,
      token: player.token,
    });
    socket.join(room.code);

    if (room.status === "PLAYING" && room.engine.state) {
      room.engine._addLog(
        "info",
        `${player.nama} berhasil terhubung kembali (Reconnect).`,
      );
      this._sinkronkanStatusKoneksiKeState(room);
    }

    const enrichedState =
      room.status === "PLAYING" ? this._getEnrichedState(room) : null;

    callback?.({
      ok: true,
      reconnected: true,
      roomCode: room.code,
      playerId: player.id,
      token: player.token,
      roomSummary: this._getRoomSummary(room),
      state: enrichedState,
    });

    this._broadcastRoomLobby(room);
    if (room.status === "PLAYING") {
      this.io.to(room.code).emit("gameEventBatch", {
        actorId: player.id,
        intent: "reconnect",
        events: [],
        state: enrichedState,
      });
    }
  }

  _handleLeaveOrDisconnect(socket, isExplicitLeave) {
    const session = this.socketToSession.get(socket.id);
    if (!session) return;
    this.socketToSession.delete(socket.id);

    const room = this.rooms.get(session.roomCode);
    if (!room) return;

    const player = room.players.find((p) => p.token === session.token);
    if (!player) return;

    socket.leave(room.code);
    this.io.to(room.code).emit("webrtc-peer-left", { playerId: player.id });

    if (room.status === "LOBBY") {
      room.players = room.players.filter((p) => p.token !== player.token);
      if (room.players.length === 0) {
        this.rooms.delete(room.code);
        return;
      }
      if (room.hostToken === player.token) {
        room.hostToken = room.players[0].token;
      }
      this._broadcastRoomLobby(room);
      return;
    }

    player.connected = false;
    player.socketId = null;

    const anyConnected = room.players.some((p) => p.connected);
    if (!anyConnected && isExplicitLeave) {
      this.rooms.delete(room.code);
      return;
    }

    if (room.engine.state) {
      room.engine._addLog(
        "warn",
        `${player.nama} terputus dari jaringan. Giliran akan dilewati otomatis hingga terhubung kembali.`,
      );
      this._sinkronkanStatusKoneksiKeState(room);
      this._broadcastRoomLobby(room);
      this._periksaDanLewatiJikaPemainAktifOffline(room);
    }
  }

  _periksaDanLewatiJikaPemainAktifOffline(room) {
    if (room.status !== "PLAYING" || !room.engine.state) return;
    if (room.engine.state.fase === "GAME_OVER") return;

    let safetyCounter = 0;
    while (safetyCounter < 5) {
      safetyCounter++;
      const currentEnginePlayer = room.engine.getCurrentPlayer();
      if (!currentEnginePlayer) break;

      const roomPlayer = room.players.find(
        (p) => p.id === currentEnginePlayer.id,
      );
      if (!roomPlayer || roomPlayer.connected) break;

      const autoEvents = [];
      if (room.engine.state.fase === "WAIT_CARD_CONFIRM") {
        const cardRes = room.engine.confirmCard(currentEnginePlayer.id);
        if (cardRes.events) autoEvents.push(...cardRes.events);
      }
      if (room.engine.state.fase === "WAIT_BUY_DECISION") {
        room.engine.skipBuy(currentEnginePlayer.id);
      }
      room.engine.state.fase = "WAIT_END_TURN";
      room.engine.state.bolehLemparLagi = false;
      room.engine._addLog(
        "warn",
        `Giliran ${currentEnginePlayer.nama} dilewati otomatis karena sedang offline.`,
      );

      const endRes = room.engine.endTurn(currentEnginePlayer.id);
      if (endRes.events) autoEvents.push(...endRes.events);

      this._resetTurnDeadline(room);
      this._sinkronkanStatusKoneksiKeState(room);

      this.io.to(room.code).emit("gameEventBatch", {
        actorId: currentEnginePlayer.id,
        intent: "autoSkipOffline",
        events: autoEvents,
        state: this._getEnrichedState(room),
      });

      if (
        !room.players.some(
          (p) =>
            p.connected &&
            !room.engine.state.players.find((ep) => ep.id === p.id)?.bangkrut,
        )
      ) {
        break;
      }
    }
  }

  _startGlobalTurnTimer() {
    setInterval(() => {
      const now = Date.now();
      for (const room of this.rooms.values()) {
        if (room.status !== "PLAYING" || !room.engine.state) continue;
        if (room.engine.state.fase === "GAME_OVER") continue;
        if (!room.turnDeadline || now < room.turnDeadline) continue;

        const current = room.engine.getCurrentPlayer();
        if (!current) continue;

        const events = [];
        if (room.engine.state.fase === "WAIT_CARD_CONFIRM") {
          const cardRes = room.engine.confirmCard(current.id);
          if (cardRes.events) events.push(...cardRes.events);
        }
        if (room.engine.state.fase === "WAIT_BUY_DECISION") {
          room.engine.skipBuy(current.id);
        }

        room.engine.state.fase = "WAIT_END_TURN";
        room.engine.state.bolehLemparLagi = false;
        const timeoutMsg = `Waktu giliran 60 detik habis! Giliran ${current.nama} otomatis diakhiri oleh server.`;
        room.engine._addLog("warn", timeoutMsg);

        const endRes = room.engine.endTurn(current.id);
        if (endRes.events) events.push(...endRes.events);

        this._resetTurnDeadline(room);
        this._sinkronkanStatusKoneksiKeState(room);

        this.io.to(room.code).emit("gameEventBatch", {
          actorId: current.id,
          intent: "turnTimeout",
          events,
          state: this._getEnrichedState(room),
        });

        this._periksaDanLewatiJikaPemainAktifOffline(room);
      }
    }, 1000);
  }

  _resetTurnDeadline(room) {
    if (room.engine.state && room.engine.state.fase !== "GAME_OVER") {
      room.turnDeadline = Date.now() + TURN_DURATION_MS;
    } else {
      room.turnDeadline = null;
    }
  }

  _sinkronkanStatusKoneksiKeState(room) {
    if (!room.engine.state) return;
    for (const ep of room.engine.state.players) {
      const rp = room.players.find((p) => p.id === ep.id);
      ep.terputus = rp ? !rp.connected : false;
      ep.micMuted = rp ? Boolean(rp.micMuted) : false;
    }
  }

  _getEnrichedState(room) {
    const pub = room.engine.getPublicState();
    pub.turnDeadline = room.turnDeadline;
    pub.roomCode = room.code;
    return pub;
  }

  _getRoomSummary(room) {
    return {
      code: room.code,
      status: room.status,
      players: room.players.map((p) => ({
        id: p.id,
        nama: p.nama,
        warna: p.warna,
        karakter: p.karakter,
        connected: p.connected,
        micMuted: Boolean(p.micMuted),
        isHost: p.token === room.hostToken,
      })),
    };
  }

  _broadcastRoomLobby(room) {
    this.io.to(room.code).emit("roomLobbyUpdate", this._getRoomSummary(room));
  }

  _getSessionContext(socketId) {
    const sess = this.socketToSession.get(socketId);
    if (!sess) return null;
    const room = this.rooms.get(sess.roomCode);
    if (!room) return null;
    const player = room.players.find((p) => p.token === sess.token);
    if (!player) return null;
    return { room, player };
  }

  _generateRoomCode() {
    let code = "";
    do {
      code = "";
      for (let i = 0; i < 4; i++) {
        code += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  _generateToken() {
    return crypto.randomBytes(12).toString("hex");
  }
}
