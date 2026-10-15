// Klien Jaringan Socket.io WNI Simulator (Milestone 4 & 5)
// Menangani sinkronisasi room otoritatif, sesi reconnect, dan meneruskan paket signaling WebRTC

import { io } from 'socket.io-client';

const STORAGE_TOKEN_KEY = 'wni_sim_session_token';
const STORAGE_ROOM_KEY = 'wni_sim_room_code';

export class NetworkClient {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.socket = null;
    this.connected = false;

    this.roomCode = sessionStorage.getItem(STORAGE_ROOM_KEY) || null;
    this.sessionToken = sessionStorage.getItem(STORAGE_TOKEN_KEY) || null;
    this.myPlayerId = null;
    this.isHost = false;
  }

  connect() {
    if (this.socket) return;

    this.socket = io({
      reconnection: true,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.callbacks.onConnectionChange?.(true);

      if (this.roomCode && this.sessionToken) {
        this.attemptReconnect(this.roomCode, this.sessionToken);
      }
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.callbacks.onConnectionChange?.(false);
    });

    this.socket.on('roomLobbyUpdate', (roomSummary) => {
      if (roomSummary && this.myPlayerId) {
        const me = roomSummary.players.find((p) => p.id === this.myPlayerId);
        this.isHost = Boolean(me?.isHost);
      }
      this.callbacks.onLobbyUpdate?.(roomSummary);
    });

    this.socket.on('gameStarted', (payload) => {
      this.callbacks.onGameStarted?.(payload);
    });

    this.socket.on('gameEventBatch', (payload) => {
      this.callbacks.onGameEventBatch?.(payload);
    });

    // Event Signaling WebRTC Voice Chat (Milestone 5)
    this.socket.on('webrtc-peer-ready', (payload) => {
      this.callbacks.onVoicePeerReady?.(payload);
    });

    this.socket.on('webrtc-signal', (payload) => {
      this.callbacks.onVoiceSignal?.(payload);
    });

    this.socket.on('webrtc-peer-left', (payload) => {
      this.callbacks.onVoicePeerLeft?.(payload);
    });

    this.socket.on('voice-state-update', (payload) => {
      this.callbacks.onVoiceStateUpdate?.(payload);
    });
  }

  createRoom(nama, warna, karakter) {
    this.connect();
    return new Promise((resolve) => {
      this.socket.emit(
        'createRoom',
        { nama, warna, karakter, token: this.sessionToken },
        (res) => {
          if (res?.ok) {
            this._saveSession(res.roomCode, res.token, res.playerId, res.roomSummary);
          }
          resolve(res);
        }
      );
    });
  }

  joinRoom(roomCode, nama, warna, karakter) {
    this.connect();
    return new Promise((resolve) => {
      this.socket.emit(
        'joinRoom',
        { roomCode, nama, warna, karakter, token: this.sessionToken },
        (res) => {
          if (res?.ok) {
            this._saveSession(res.roomCode, res.token, res.playerId, res.roomSummary);
          }
          resolve(res);
        }
      );
    });
  }

  attemptReconnect(roomCode, token) {
    this.connect();
    return new Promise((resolve) => {
      this.socket.emit('reconnectRoom', { roomCode, token }, (res) => {
        if (res?.ok) {
          this._saveSession(res.roomCode, res.token, res.playerId, res.roomSummary);
          this.callbacks.onReconnected?.(res);
        } else {
          this.clearSession();
        }
        resolve(res);
      });
    });
  }

  startGame() {
    return new Promise((resolve) => {
      this.socket.emit('startGame', {}, (res) => resolve(res));
    });
  }

  sendIntent(intent, extra = {}) {
    return new Promise((resolve) => {
      if (!this.socket || !this.connected) {
        resolve({ ok: false, pesan: 'Tidak terhubung ke server.' });
        return;
      }
      this.socket.emit('gameIntent', { intent, ...extra }, (res) => {
        resolve(res || { ok: false, pesan: 'Tidak ada respons dari server.' });
      });
    });
  }

  // Metode Signaling WebRTC (Milestone 5)
  announceVoiceReady() {
    if (this.socket && this.connected) {
      this.socket.emit('webrtc-ready');
    }
  }

  sendVoiceSignal(toPlayerId, data) {
    if (this.socket && this.connected) {
      this.socket.emit('webrtc-signal', {
        toPlayerId,
        ...data
      });
    }
  }

  sendVoiceState(stateObj) {
    if (this.socket && this.connected) {
      this.socket.emit('voice-state', stateObj);
    }
  }

  leaveRoom() {
    return new Promise((resolve) => {
      if (!this.socket || !this.connected) {
        this.clearSession();
        resolve({ ok: true });
        return;
      }
      this.socket.emit('leaveRoom', {}, () => {
        this.clearSession();
        resolve({ ok: true });
      });
    });
  }

  _saveSession(roomCode, token, playerId, roomSummary) {
    this.roomCode = roomCode;
    this.sessionToken = token;
    this.myPlayerId = playerId;
    sessionStorage.setItem(STORAGE_ROOM_KEY, roomCode);
    sessionStorage.setItem(STORAGE_TOKEN_KEY, token);

    if (roomSummary) {
      const me = roomSummary.players.find((p) => p.id === playerId);
      this.isHost = Boolean(me?.isHost);
    }
  }

  clearSession() {
    this.roomCode = null;
    this.myPlayerId = null;
    this.isHost = false;
    sessionStorage.removeItem(STORAGE_ROOM_KEY);
  }
}