// Entry Point Utama Klien WNI Simulator 3D
// Menghubungkan Narator Bahasa Indonesia (speakEvent), Animasi Masuk Lapas Pintu Depan,
// Desain Rumah/Hotel SVG, dan Bencana Smooth.

import * as THREE from "three";
import { GameEngine } from "../shared/gameEngine.js";
import { BOARD_TILES } from "../shared/tiles.js";
import { TAKDIR_CARDS, MUSIBAH_CARDS } from "../shared/cards.js";
import { Board3D } from "./board.js";
import { PlayerTokens3D } from "./player.js";
import { Dice3D } from "./dice.js";
import { CardsUI } from "./cards-ui.js";
import { GameUI } from "./ui.js";
import { CameraController } from "./camera.js";
import { FXManager } from "./fx.js";
import { AudioManager } from "./audio.js";
import { NetworkClient } from "./network.js";
import { VoiceManager } from "./voice.js";

class WNISimulatorApp {
  constructor() {
    this.container = document.getElementById("canvas-container");
    this.engine = new GameEngine();
    this.clock = new THREE.Clock();

    this.mode = "NONE";
    this.latestState = null;
    this.eventQueueChain = Promise.resolve();

    this._initThreeScene();
    this._initLighting();

    this.board3D = new Board3D(this.scene);
    this.tokens3D = new PlayerTokens3D(this.scene, this.board3D);
    this.dice3D = new Dice3D(this.scene);
    this.fxManager = new FXManager(this.scene);
    this.audio = new AudioManager();
    this.cardsUI = new CardsUI();

    this.ui = new GameUI({
      onCreateRoom: (nama, warna) => this.handleCreateRoom(nama, warna),
      onJoinRoom: (code, nama, warna) => this.handleJoinRoom(code, nama, warna),
      onHostStartGame: () => this.handleHostStartGame(),
      onLeaveRoom: () => this.handleLeaveRoom(),
      onStartHotSeatGame: (configs) => this.startHotSeatGame(configs),
      onRollDice: () => this.handleRollDice(),
      onPayJail: () => this.handlePayJail(),
      onBuyProperty: () => this.handleBuyProperty(),
      onSkipBuy: () => this.handleSkipBuy(),
      onUpgradeProperty: (tileIdx) => this.handleUpgradeProperty(tileIdx),
      onSellAsset: (tileIdx) => this.handleSellAsset(tileIdx),
      onEndTurn: () => this.handleEndTurn(),
      onResetCamera: () => this.cameraCtrl.resetView(),
      onToggleQuality: () => {
        const next = this.fxManager.quality === "HIGH" ? "LOW" : "HIGH";
        return this.fxManager.setQuality(next);
      },
      onToggleMusic: () => this.audio.toggleMusicMute(),
      onToggleSfx: () => this.audio.toggleSfxMute(),
      onToggleMic: () => this.voice.toggleMicMute(),
      onVolumeChange: (val) => this.audio.setMasterVolume(val),
      onDebugTrigger: (testType) => this.handleDebugTrigger(testType),
    });

    this.ui.setQualityButtonState(this.fxManager.quality);

    this.network = new NetworkClient({
      onLobbyUpdate: (roomSummary) => {
        if (roomSummary.status === "LOBBY") {
          this.ui.renderWaitingRoom(roomSummary, this.network.myPlayerId);
        }
      },
      onGameStarted: ({ roomSummary, state }) => {
        this._initMultiplayerMatchView(roomSummary.code, state);
      },
      onReconnected: (res) => {
        this.voice.initAndJoinMesh(res.playerId);
        if (res.state && res.roomSummary.status === "PLAYING") {
          this._initMultiplayerMatchView(res.roomCode, res.state);
          if (
            res.state.fase === "WAIT_CARD_CONFIRM" &&
            res.state.kartuTertunda
          ) {
            this._tampilkanOverlayKartuTertunda(res.state.kartuTertunda);
          }
        } else if (res.roomSummary) {
          this.ui.renderWaitingRoom(res.roomSummary, res.playerId);
        }
      },
      onGameEventBatch: (payload) => {
        this.eventQueueChain = this.eventQueueChain.then(() =>
          this._prosesAntreanEvent(payload.events || [], payload.state),
        );
      },
      onVoicePeerReady: (payload) => this.voice.handlePeerReady(payload),
      onVoiceSignal: (payload) => this.voice.handleSignal(payload),
      onVoicePeerLeft: (payload) => this.voice.handlePeerLeft(payload),
      onVoiceStateUpdate: (payload) =>
        this.voice.handleVoiceStateUpdate(payload),
    });

    this.voice = new VoiceManager(this.network, (status) => {
      this.ui.setMicButtonState(status.micMuted);
    });

    this.network.connect();

    window.addEventListener("resize", () => this._onResize());
    this._animate();
  }

  _initThreeScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b111e);
    this.scene.fog = new THREE.FogExp2(0x0b111e, 0.014);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      150,
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.cameraCtrl = new CameraController(
      this.camera,
      this.renderer.domElement,
    );
  }

  _initLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.68);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.38);
    dirLight.position.set(14, 24, 16);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 60;
    const d = 14;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    const pLight1 = new THREE.PointLight(0x38bdf8, 0.85, 32);
    pLight1.position.set(-10, 8, -10);
    this.scene.add(pLight1);

    const pLight2 = new THREE.PointLight(0xfacc15, 0.7, 32);
    pLight2.position.set(10, 8, 10);
    this.scene.add(pLight2);
  }

  async handleCreateRoom(nama, warna) {
    this.audio.ensureContext();
    this.audio.startMusic();
    const res = await this.network.createRoom(nama, warna);
    if (!res?.ok) {
      this.ui.showLobbyError(res?.pesan || "Gagal membuat room.");
      return;
    }
    this.ui.renderWaitingRoom(res.roomSummary, res.playerId);
    await this.voice.initAndJoinMesh(res.playerId);
  }

  async handleJoinRoom(code, nama, warna) {
    this.audio.ensureContext();
    this.audio.startMusic();
    const res = await this.network.joinRoom(code, nama, warna);
    if (!res?.ok) {
      this.ui.showLobbyError(res?.pesan || "Gagal bergabung ke room.");
      return;
    }
    await this.voice.initAndJoinMesh(res.playerId);
    if (res.reconnected && res.state) {
      this._initMultiplayerMatchView(res.roomCode, res.state);
    } else {
      this.ui.renderWaitingRoom(res.roomSummary, res.playerId);
    }
  }

  async handleHostStartGame() {
    const res = await this.network.startGame();
    if (!res?.ok) {
      this.ui.showLobbyError(res?.pesan || "Tidak dapat memulai permainan.");
    }
  }

  async handleLeaveRoom() {
    this.voice.leaveMesh();
    await this.cardsUI.hideCard();
    if (this.mode === "MULTIPLAYER" || this.network.roomCode) {
      await this.network.leaveRoom();
    }
    this.mode = "NONE";
    this.ui.setSessionMode({
      isMultiplayer: false,
      myPlayerId: null,
      roomCode: null,
    });
    this.ui.showLobbyModal();
  }

  _initMultiplayerMatchView(roomCode, state) {
    this.mode = "MULTIPLAYER";
    this.latestState = state;
    this.audio.ensureContext();
    this.audio.startMusic();
    this.audio.playMoneyIn();

    this.ui.hideLobbyModal();
    this.ui.setSessionMode({
      isMultiplayer: true,
      myPlayerId: this.network.myPlayerId,
      roomCode,
    });

    this.tokens3D.initTokens(state.players);
    this.tokens3D.syncPlayersState(state.players);
    this.board3D.syncProperties(state.properties, state.players);
    this.ui.render(state);
  }

  startHotSeatGame(playerConfigs) {
    this.mode = "HOTSEAT";
    this.audio.ensureContext();
    this.audio.startMusic();
    this.audio.playMoneyIn();

    this.ui.setSessionMode({
      isMultiplayer: false,
      myPlayerId: null,
      roomCode: null,
    });
    const state = this.engine.initGame(playerConfigs);
    this.latestState = state;
    this.tokens3D.initTokens(state.players);
    this.board3D.syncProperties(state.properties, state.players);
    this.ui.render(state);

    this.voice.initAndJoinMesh("p1");
  }

  async handleRollDice() {
    if (this.mode === "MULTIPLAYER") {
      await this.network.sendIntent("rollDice");
      return;
    }

    const current = this.engine.getCurrentPlayer();
    if (!current) return;
    const result = this.engine.rollDice(current.id);
    if (result.ok) {
      await this._prosesAntreanEvent(result.events, result.state);
    }
  }

  async handleConfirmCard() {
    if (this.mode === "MULTIPLAYER") {
      await this.network.sendIntent("confirmCard");
      return;
    }

    const current = this.engine.getCurrentPlayer();
    if (!current) return;
    const result = this.engine.confirmCard(current.id);
    if (result.ok) {
      await this._prosesAntreanEvent(result.events, result.state);
    }
  }

  async handlePayJail() {
    if (this.mode === "MULTIPLAYER") {
      this.audio.playMoneyOut();
      await this.network.sendIntent("payJail");
      return;
    }

    const current = this.engine.getCurrentPlayer();
    if (!current) return;
    const result = this.engine.bayarKeluarPenjara(current.id);
    if (result.ok) {
      this.audio.playMoneyOut();
      await this._prosesAntreanEvent(result.events, result.state);
    }
  }

  async handleBuyProperty() {
    if (this.mode === "MULTIPLAYER") {
      await this.network.sendIntent("buy");
      return;
    }

    const current = this.engine.getCurrentPlayer();
    if (!current) return;
    const result = this.engine.buyProperty(current.id);
    if (result.ok) {
      await this._prosesAntreanEvent(result.events, result.state);
    }
  }

  async handleSkipBuy() {
    if (this.mode === "MULTIPLAYER") {
      await this.network.sendIntent("skipBuy");
      return;
    }

    const current = this.engine.getCurrentPlayer();
    if (!current) return;
    const result = this.engine.skipBuy(current.id);
    if (result.ok) {
      this.ui.render(result.state);
    }
  }

  async handleUpgradeProperty(tileIndex) {
    if (this.mode === "MULTIPLAYER") {
      await this.network.sendIntent("upgrade", { tileIndex });
      return;
    }

    const current = this.engine.getCurrentPlayer();
    if (!current) return;
    const result = this.engine.upgradeProperty(current.id, tileIndex);
    if (result.ok) {
      await this._prosesAntreanEvent(result.events, result.state);
    }
  }

  async handleSellAsset(tileIndex) {
    if (this.mode === "MULTIPLAYER") {
      this.audio.playMoneyIn();
      await this.network.sendIntent("sell", { tileIndex });
      return;
    }

    const current = this.engine.getCurrentPlayer();
    if (!current) return;
    const result = this.engine.sellAsset(current.id, tileIndex);
    if (result.ok) {
      this.audio.playMoneyIn();
      this.board3D.syncProperties(
        result.state.properties,
        result.state.players,
      );
      this.ui.render(result.state);
    }
  }

  async handleEndTurn() {
    if (this.mode === "MULTIPLAYER") {
      await this.network.sendIntent("endTurn");
      return;
    }

    const current = this.engine.getCurrentPlayer();
    if (!current) return;
    const result = this.engine.endTurn(current.id);
    if (result.ok) {
      this.ui.render(result.state);
    }
  }

  async _prosesAntreanEvent(events, finalState) {
    if (!finalState) return;
    this.latestState = finalState;
    this.ui.setAnimating(true);

    for (const ev of events) {
      if (ev.tipe === "DICE_ROLLED") {
        this.audio.playDiceRoll();
        await this.dice3D.animateRoll(ev.dadu[0], ev.dadu[1]);
      } else if (ev.tipe === "PLAYER_MOVED") {
        this.cameraCtrl.startFollowToken(() =>
          this.tokens3D.getTokenTransform(ev.playerId),
        );
        await this.tokens3D.animateMoveAlongPath(
          ev.playerId,
          ev.jalur,
          (stepIdx) => {
            this.audio.playStep(stepIdx);
          },
        );
        await this.cameraCtrl.stopFollowToken(0.75);
      } else if (ev.tipe === "PASS_START") {
        this.audio.playMoneyIn();
        this.audio.speakEvent("bansos");
      } else if (ev.tipe === "CARD_MONEY_GAIN") {
        this.audio.playMoneyIn();
      } else if (ev.tipe === "PAY_RENT") {
        this.audio.playMoneyOut();
        this.audio.speakEvent("rent");
        this.ui.showRentNotification(ev);
        await this._delay(650);
      } else if (ev.tipe === "TAX_PAID") {
        this.audio.playMoneyOut();
      } else if (ev.tipe === "PUNGLI_HIT") {
        this.audio.playPungli();
        await this._delay(650);
      } else if (ev.tipe === "LAND_CONFISCATED") {
        this.audio.playBadCard();
      } else if (ev.tipe === "CARD_DRAWN") {
        if (ev.jenisDeck === "TAKDIR") this.audio.playGoodCard();
        else this.audio.playBadCard();
        this._tampilkanOverlayKartuTertunda(ev);
      } else if (ev.tipe === "CARD_CONFIRMED") {
        await this.cardsUI.hideCard();
        await this._jalankanAnimasiSetelahKartuOK(ev);
      } else if (ev.tipe === "GO_TO_JAIL") {
        await this._jalankanAnimasiMasukLapas(ev.playerId);
      } else if (ev.tipe === "DISASTER_HIT") {
        await this._jalankanAnimasiBencana(ev);
      } else if (ev.tipe === "PROPERTY_BOUGHT") {
        await this._jalankanAnimasiBangunanNaik(
          ev.tileIndex,
          finalState,
          false,
        );
      } else if (ev.tipe === "PROPERTY_UPGRADED") {
        await this._jalankanAnimasiBangunanNaik(ev.tileIndex, finalState, true);
      } else if (ev.tipe === "PLAYER_BANKRUPT") {
        await this._jalankanAnimasiBangkrut(ev.playerId);
      } else if (ev.tipe === "GAME_OVER") {
        this.audio.playVictory();
      }
    }

    if (this.cameraCtrl.isCinematic) {
      this.ui.showCinematicBanner(null);
      await this.cameraCtrl.endCinematic(0.75);
    }

    this.board3D.syncProperties(finalState.properties, finalState.players);
    this.tokens3D.syncPlayersState(finalState.players);
    this.ui.setAnimating(false);
    this.ui.render(finalState);
  }

  _tampilkanOverlayKartuTertunda(cardEvent) {
    const canConfirm =
      this.mode !== "MULTIPLAYER" ||
      cardEvent.playerId === this.network.myPlayerId;

    this.cardsUI.presentCard({
      jenisDeck: cardEvent.jenisDeck,
      kartu: cardEvent.kartu,
      namaPemain: cardEvent.namaPemain || "Warga",
      canConfirm,
      onConfirmCallback: () => this.handleConfirmCard(),
    });
  }

  async _jalankanAnimasiSetelahKartuOK(ev) {
    const animType = ev.kartu?.animasi;

    if (ev.jenisDeck === "TAKDIR" || animType === "confetti") {
      const tokenPos = this.tokens3D.getTokenPosition(ev.playerId);
      this.ui.showCinematicBanner(
        `BERKAH TAKDIR: ${ev.kartu.judul.toUpperCase()}!`,
      );
      await this.cameraCtrl.focusOnPoint(tokenPos, {
        height: 4.2,
        distance: 5.5,
        duration: 0.55,
      });

      this.audio.playMoneyIn();
      this.fxManager.playGoodCardFX(tokenPos);
      await this.tokens3D.animateGoodCardJump(ev.playerId);
      await this._delay(450);

      this.ui.showCinematicBanner(null);
      await this.cameraCtrl.endCinematic(0.65);
      return;
    }

    if (["banjir", "gempa", "kebakaran"].includes(animType)) {
      await this._jalankanAnimasiBencana({
        playerId: ev.playerId,
        jenisBencana: animType,
        namaBencana: ev.kartu.judul,
      });
    } else if (animType === "tagihan") {
      this.audio.playMoneyOut();
    }
  }

  // Animasi Masuk Lapas Selaras Pintu Depan:
  // 1. Pintu depan sel dibuka lebar
  // 2. Kamera menyorot dari arah depan sel
  // 3. Pion mendarat di depan pintu sel, berjalan masuk melewati pintu depan, lalu berbalik badan
  // 4. Pintu sel dibanting menutup di depan pion
  async _jalankanAnimasiMasukLapas(playerId) {
    const jailCenter = this.board3D.getTileCenterPosition(10);
    this.ui.showCinematicBanner("DIGELANDANG KE LAPAS CIPINANG!");

    this.board3D.openJailDoorImmediate();
    this.audio.playJailSirenAndClang();

    await this.cameraCtrl.focusOnPoint(jailCenter, {
      height: 3.6,
      distance: 5.6,
      duration: 0.6,
    });
    await this.tokens3D.animateEnterJailCell(playerId);

    this.cameraCtrl.shake(0.24, 0.35);
    await this.board3D.animateJailDoorClose();
    await this._delay(450);

    this.ui.showCinematicBanner(null);
    await this.cameraCtrl.endCinematic(0.75);
  }

  async _jalankanAnimasiBencana(ev) {
    const tokenPos = this.tokens3D.getTokenPosition(ev.playerId);
    this.ui.showCinematicBanner(
      `BENCANA: ${(ev.namaBencana || ev.jenisBencana).toUpperCase()}!`,
    );

    await this.cameraCtrl.focusOnPoint(tokenPos, {
      height: 4.5,
      distance: 6.0,
      duration: 0.6,
    });

    if (ev.jenisBencana === "gempa") {
      this.cameraCtrl.shake(0.55, 1.4);
      this.board3D.shakeBoard(0.26, 1.4);
    } else {
      this.cameraCtrl.shake(0.32, 1.0);
    }

    this.audio.playDisaster(ev.jenisBencana);
    this.fxManager.playDisasterFX(ev.jenisBencana, tokenPos);

    await this.tokens3D.animateDisasterKnockback(ev.playerId, ev.jenisBencana);
    await this._delay(450);

    this.ui.showCinematicBanner(null);
    await this.cameraCtrl.endCinematic(0.75);
  }

  async _jalankanAnimasiBangunanNaik(tileIndex, finalState, isUpgrade = false) {
    const tile = BOARD_TILES[tileIndex];
    this.audio.playBuyOrBuild(isUpgrade);

    if (!tile || tile.tipe !== "PROPERTY") {
      this.board3D.syncProperties(finalState.properties, finalState.players);
      return;
    }

    const tileCenter = this.board3D.getTileCenterPosition(tileIndex);
    const level = finalState.properties[tileIndex]?.level || 0;
    const label =
      level === 0
        ? "AKUISISI TANAH"
        : level === 5
          ? "PEMBANGUNAN HOTEL"
          : `PEMBANGUNAN RUMAH #${level}`;
    this.ui.showCinematicBanner(`${label} DI ${tile.nama.toUpperCase()}`);

    await this.cameraCtrl.focusOnPoint(tileCenter, {
      height: 3.8,
      distance: 5.0,
      duration: 0.55,
    });
    this.fxManager.playBuyLandFX(tileCenter);
    await this.board3D.animateBuildingRiseFromUnderground(
      tileIndex,
      finalState.properties,
      finalState.players,
    );
    await this._delay(300);

    this.ui.showCinematicBanner(null);
    await this.cameraCtrl.endCinematic(0.65);
  }

  async _jalankanAnimasiBangkrut(playerId) {
    const tokenPos = this.tokens3D.getTokenPosition(playerId);
    this.ui.showCinematicBanner("WARGA BANGKRUT & GULUNG TIKAR!");

    await this.cameraCtrl.focusOnPoint(tokenPos, {
      height: 3.8,
      distance: 4.8,
      duration: 0.6,
    });
    this.audio.playBankrupt();
    this.cameraCtrl.shake(0.28, 0.55);
    await this.tokens3D.animateBankruptCollapse(playerId, this.fxManager);
    await this._delay(450);

    this.ui.showCinematicBanner(null);
    await this.cameraCtrl.endCinematic(0.75);
  }

  async handleDebugTrigger(testType) {
    if (testType === "voice-sim") {
      const stateRef =
        this.mode === "MULTIPLAYER" ? this.latestState : this.engine.state;
      const activeId =
        this.mode === "MULTIPLAYER" && this.network.myPlayerId
          ? this.network.myPlayerId
          : stateRef?.players?.[stateRef.giliranIndex]?.id || "p1";
      this.voice.simulateSpeaking(activeId, 3500);
      return;
    }

    if (testType === "sfx-pungli") {
      this.audio.playPungli();
      return;
    }

    const stateRef =
      this.mode === "MULTIPLAYER" ? this.latestState : this.engine.state;
    if (!stateRef) return;
    const current = stateRef.players[stateRef.giliranIndex];
    if (!current) return;

    if (testType === "takdir" || testType === "musibah") {
      const isTakdir = testType === "takdir";
      const sample = isTakdir ? TAKDIR_CARDS[0] : MUSIBAH_CARDS[6];
      if (isTakdir) this.audio.playGoodCard();
      else this.audio.playBadCard();

      this.cardsUI.presentCard({
        jenisDeck: isTakdir ? "TAKDIR" : "MUSIBAH",
        kartu: sample,
        namaPemain: current.nama,
        canConfirm: true,
        onConfirmCallback: async () => {
          await this.cardsUI.hideCard();
          await this._jalankanAnimasiSetelahKartuOK({
            playerId: current.id,
            jenisDeck: isTakdir ? "TAKDIR" : "MUSIBAH",
            kartu: sample,
          });
        },
      });
      return;
    }

    this.ui.setAnimating(true);

    if (testType === "jail") {
      await this._jalankanAnimasiMasukLapas(current.id);
    } else if (["banjir", "gempa", "kebakaran", "longsor"].includes(testType)) {
      const labelMap = {
        banjir: "Tsunami & Banjir Bandang",
        gempa: "Gempa Bumi Tektonik",
        kebakaran: "Kebakaran & Ledakan Gardu",
        longsor: "Tanah Longsor Tebing",
      };
      await this._jalankanAnimasiBencana({
        playerId: current.id,
        jenisBencana: testType,
        namaBencana: labelMap[testType],
      });
    } else if (testType === "buy") {
      const targetTile =
        BOARD_TILES[current.posisi]?.tipe === "PROPERTY" ? current.posisi : 1;
      let isUpg = false;
      if (this.mode === "HOTSEAT") {
        const existing = this.engine.state.properties[targetTile];
        if (!existing) {
          this.engine.state.properties[targetTile] = {
            ownerId: current.id,
            level: 1,
          };
        } else {
          existing.level = existing.level >= 5 ? 0 : existing.level + 1;
          isUpg = existing.level > 0;
        }
        this.latestState = this.engine.getPublicState();
      }
      await this._jalankanAnimasiBangunanNaik(
        targetTile,
        this.latestState,
        isUpg,
      );
    } else if (testType === "bankrupt") {
      await this._jalankanAnimasiBangkrut(current.id);
      setTimeout(() => {
        const token = this.tokens3D.tokens.get(current.id);
        if (token && !current.bangkrut) token.visible = true;
      }, 800);
    }

    this.ui.setAnimating(false);
    this.ui.render(this.latestState);
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this.board3D.update(elapsed, dt);
    this.cameraCtrl.update(dt);
    this.fxManager.update(dt);

    const { speakingMap, mutedMap } = this.voice.update();
    this.tokens3D.updateSpeakingIndicators(speakingMap, elapsed);
    this.ui.updateSpeakingUI(speakingMap, mutedMap);

    this.renderer.render(this.scene, this.camera);
  }
}

new WNISimulatorApp();
