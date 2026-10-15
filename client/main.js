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
import { CashStack3D } from "./cashStack.js";
import { CardsUI } from "./cards-ui.js";
import { GameUI } from "./ui.js";
import { CameraController } from "./camera.js";
import { FXManager } from "./fx.js";
import { AudioManager } from "./audio.js";
import { NetworkClient } from "./network.js";
import { VoiceManager } from "./voice.js";
import { consoleViewer } from "./console-viewer.js";

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
    this.cashStack3D = new CashStack3D(this.scene);
    this.fxManager = new FXManager(this.scene);
    this.audio = new AudioManager();
    this.cardsUI = new CardsUI();

    this.ui = new GameUI({
      onCreateRoom: (nama, warna, karakter) =>
        this.handleCreateRoom(nama, warna, karakter),
      onJoinRoom: (code, nama, warna, karakter) =>
        this.handleJoinRoom(code, nama, warna, karakter),
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
      onResetCamera: () => {
        this.cameraCtrl.resetView();
        this.ui.hideTileFocusPill();
        this.ui.resetCamSelect();
      },
      onFocusTile: (tileIdx) => this.focusCameraOnTile(tileIdx),
      onChangeCamView: (viewMode) => this.handleCamViewChange(viewMode),
      getTileCanvas: (tileIdx) => this.board3D.getTileCanvas(tileIdx),
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
    this._initBoardTileClickInteraction();
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
    this.cameraCtrl.controls?.addEventListener("start", () => {
      this.ui.hideTileFocusPill();
    });
  }

  // Interaksi Klik Petak 3D untuk Inspeksi Kartu & Ciri Khas Daerah
  _initBoardTileClickInteraction() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downPos = { x: 0, y: 0 };

    this.renderer.domElement.addEventListener("pointerdown", (e) => {
      downPos = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener("pointerup", (e) => {
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (dist > 7) return; // Gerakan drag / orbit kamera diabaikan

      const rect = this.renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);

      // Cek apakah klik mengenai baki tumpukan gepokan uang (CashStack3D)
      const cashObjects = this.cashStack3D ? this.cashStack3D.getInteractiveObjects() : [];
      const cashHits = raycaster.intersectObjects(cashObjects, false);
      if (cashHits.length > 0) {
        const pId = cashHits[0].object.userData?.playerId;
        const state =
          this.latestState || (this.engine ? this.engine.getState() : null);
        const player = state?.players?.find((p) => p.id === pId);
        if (player) {
          this.cashStack3D.pulseTray(pId);
          this.audio.playMoneyIn?.();
          const formatted = new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          }).format(player.uang || 0);
          console.log(`[Kas Tunai 3D] ${player.nama}: ${formatted}`);
        }
        return;
      }

      const meshes = this.board3D.tileMeshes.map((t) => t.mesh);
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const tileIdx = hits[0].object.userData?.tileIndex;
        if (tileIdx !== undefined) {
          const state =
            this.latestState ||
            (this.engine ? this.engine.getState() : null);
          if (state) {
            this.ui.showTileInfo(tileIdx, state);
            this.audio.playStep?.(1);
            this.focusCameraOnTile(tileIdx);
          }
        }
      }
    });
  }

  // Arahkan kamera tegak lurus ke petak tertentu agar kartu dapat dibaca dengan sangat jelas
  focusCameraOnTile(tileIdx) {
    const coord = this.board3D.tileCoordinates[tileIdx];
    const mesh = this.board3D.tileMeshes[tileIdx]?.mesh;
    if (coord) {
      this.cameraCtrl.focusOnTile(tileIdx, coord, mesh);
      this.ui.showTileFocusPill(tileIdx);
    }
  }

  // Pilih sudut pandang sisi papan tertentu (Depan/Kiri/Atas/Kanan/Penuh)
  handleCamViewChange(viewMode) {
    if (viewMode === "side-0") this.cameraCtrl.viewSide(0);
    else if (viewMode === "side-1") this.cameraCtrl.viewSide(1);
    else if (viewMode === "side-2") this.cameraCtrl.viewSide(2);
    else if (viewMode === "side-3") this.cameraCtrl.viewSide(3);
    else {
      this.cameraCtrl.resetView();
      this.ui.hideTileFocusPill();
    }
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

  async handleCreateRoom(nama, warna, karakter) {
    this.audio.ensureContext();
    this.audio.startMusic();
    const res = await this.network.createRoom(nama, warna, karakter);
    if (!res?.ok) {
      this.ui.showLobbyError(res?.pesan || "Gagal membuat room.");
      return;
    }
    this.ui.renderWaitingRoom(res.roomSummary, res.playerId);
    await this.voice.initAndJoinMesh(res.playerId);
  }

  async handleJoinRoom(code, nama, warna, karakter) {
    this.audio.ensureContext();
    this.audio.startMusic();
    const res = await this.network.joinRoom(code, nama, warna, karakter);
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

    this.latestState = state;
    this.tokens3D.initTokens(state.players);
    this.tokens3D.syncPlayersState(state.players);
    this.board3D.syncProperties(state.properties, state.players);
    this.cashStack3D.initStacks(state.players);
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
    this.cashStack3D.initStacks(state.players);
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
      this.cashStack3D.syncCash(result.state.players);
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
      this.cashStack3D.syncCash(result.state.players);
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
      this.cashStack3D.syncCash(result.state.players);
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

        // Landing! Pemain menginjak petak tujuan -> Tampilkan informasi petak & tabel sewa
        if (ev.jalur && ev.jalur.length > 0) {
          const landedTile = ev.jalur[ev.jalur.length - 1];
          this.ui.showTileInfo(landedTile, finalState);
        }
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

    this.latestState = finalState;
    this.board3D.syncProperties(finalState.properties, finalState.players);
    this.tokens3D.syncPlayersState(finalState.players);
    this.cashStack3D.syncCash(finalState.players);
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

  // Animasi Masuk Lapas Dijemput Mobil Patroli:
  // 1. Kamera menyorot dekat lokasi pion saat 2 polisi turun & menggandeng pion masuk mobil
  // 2. Kamera ZOOM OUT ke seluruh papan saat mobil melaju muterin kartu-kartu petak papan
  // 3. Kamera ZOOM IN ke Lapas Cipinang saat mobil tiba, 2 polisi turun & MELEMPAR pion ke dalam sel penjara
  // 4. Pintu sel besi dibanting menutup keras dengan dentang nyaring dan guncangan layar!
  async _jalankanAnimasiMasukLapas(playerId) {
    const startTokenPos = this.tokens3D.getTokenPosition(playerId);
    const jailCenter = this.board3D.getTileCenterPosition(10);
    this.ui.showCinematicBanner("DIJEMPUT 2 POLISI KE LAPAS CIPINANG!");

    this.board3D.openJailDoorImmediate();
    this.audio.playJailSirenAndClang();

    // 1. Sorot dekat lokasi penjemputan pion agar adegan 2 polisi menggandeng pion terlihat jelas
    await this.cameraCtrl.focusOnPoint(startTokenPos, {
      height: 3.8,
      distance: 5.2,
      duration: 0.45,
    });

    // 2. Jalankan animasi mobil patroli, 2 polisi menggandeng pion, muterin board, & dilempar ke sel lapas
    const enterPromise = this.tokens3D.animateEnterJailCell(playerId);
    const driveMs = this.tokens3D.lastJailDriveDurationMs || 2000;

    // Saat pion & polisi selesai naik ke mobil (~1.45 detik), kamera ZOOM OUT melihat mobil muterin papan
    this._delay(1450).then(() => {
      this.cameraCtrl.zoomToBoardOverview(0.85);
    });

    // Menjelang mobil tiba di Lapas Cipinang (#10), kamera ZOOM IN dramatis menyorot gerbang sel lapas
    this._delay(1450 + Math.max(300, driveMs - 750)).then(() => {
      this.cameraCtrl.focusOnPoint(jailCenter, {
        height: 3.4,
        distance: 5.2,
        duration: 0.75,
      });
    });

    // Bunyikan efek suara whoosh lemparan saat pion dilempar kedua polisi ke dalam sel
    this._delay(1450 + driveMs + 400).then(() => {
      this.audio.playJailToss();
    });

    await enterPromise;

    // 3. Bunyikan dentang pintu besi tepat saat pintu sel ditutup
    this.audio.playJailDoorClang(0);
    this.cameraCtrl.shake(0.28, 0.4);
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
    this.audio.ensureContext();
    console.log(`[Panel Uji] Menjalankan uji coba: ${testType}`);

    try {
      if (testType === "voice-sim") {
        const stateRef =
          this.mode === "MULTIPLAYER" ? this.latestState : this.engine.state;
        const activeId =
          this.mode === "MULTIPLAYER" && this.network.myPlayerId
            ? this.network.myPlayerId
            : stateRef?.players?.[stateRef.giliranIndex]?.id || "p1";
        this.voice.simulateSpeaking(activeId, 3500);
        console.log(`[Panel Uji] Simulasi bicara aktif untuk pemain ID: ${activeId}`);
        return;
      }

      if (testType === "sfx-pungli") {
        this.audio.playPungli();
        console.log(`[Panel Uji] SFX Pungli & peluit oknum diputar.`);
        return;
      }

      let stateRef =
        this.mode === "MULTIPLAYER" ? this.latestState : this.engine.state;

      // Jika permainan belum dimulai oleh user (misal masih di lobby awal),
      // auto-inisialisasi sesi uji coba agar SEMUA fitur di panel uji langsung jalan seketika!
      if (!stateRef || !stateRef.players || stateRef.players.length === 0) {
        console.log("[Panel Uji] Sesi game belum aktif. Menginisialisasi warga simulasi otomatis...");
        this.mode = "HOTSEAT";
        this.engine.initGame([
          { id: "p1", nama: "Budi (Uji Coba)", warna: "#ef4444", karakter: "rakyat_jelata" },
          { id: "p2", nama: "Siti (Rival)", warna: "#3b82f6", karakter: "keponakan_pejabat" },
        ]);
        this.tokens3D.initTokens(this.engine.state.players);
        this.cashStack3D.initStacks(this.engine.state.players);
        this.latestState = this.engine.getPublicState();
        this.ui.hideSetupModal();
        stateRef = this.latestState;
      }

      const current =
        stateRef.players[stateRef.giliranIndex] || stateRef.players[0];
      if (!current) {
        console.warn("[Panel Uji] Tidak ada pemain yang dapat diuji.");
        return;
      }

      // Pastikan token 3D pemain ada di scene Three.js
      if (!this.tokens3D.tokens || this.tokens3D.tokens.size === 0 || !this.tokens3D.tokens.has(current.id)) {
        this.tokens3D.initTokens(stateRef.players);
        this.cashStack3D.initStacks(stateRef.players);
      }

      if (testType === "takdir" || testType === "musibah") {
        const isTakdir = testType === "takdir";
        const sample = isTakdir ? TAKDIR_CARDS[0] : MUSIBAH_CARDS[6];
        if (isTakdir) this.audio.playGoodCard();
        else this.audio.playBadCard();

        console.log(`[Panel Uji] Menampilkan kartu ${isTakdir ? "Takdir" : "Musibah"}: "${sample.judul}"`);
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
        console.log(`[Panel Uji] Menjalankan animasi Masuk Lapas Cipinang untuk ${current.nama}...`);
        await this._jalankanAnimasiMasukLapas(current.id);
        console.log(`[Panel Uji] Selesai animasi Masuk Lapas.`);
      } else if (["banjir", "gempa", "kebakaran", "longsor"].includes(testType)) {
        const labelMap = {
          banjir: "Tsunami & Banjir Bandang",
          gempa: "Gempa Bumi Tektonik",
          kebakaran: "Kebakaran & Ledakan Gardu",
          longsor: "Tanah Longsor Tebing",
        };
        console.log(`[Panel Uji] Menjalankan bencana alam: ${labelMap[testType]}...`);
        await this._jalankanAnimasiBencana({
          playerId: current.id,
          jenisBencana: testType,
          namaBencana: labelMap[testType],
        });
        console.log(`[Panel Uji] Selesai simulasi bencana ${testType}.`);
      } else if (testType === "buy") {
        const targetTile =
          BOARD_TILES[current.posisi]?.tipe === "PROPERTY" ? current.posisi : 1;
        let isUpg = false;
        if (this.mode === "HOTSEAT" || !this.mode) {
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
        console.log(`[Panel Uji] Menjalankan animasi pembangunan aset di petak #${targetTile}...`);
        await this._jalankanAnimasiBangunanNaik(
          targetTile,
          this.latestState,
          isUpg,
        );
        console.log(`[Panel Uji] Selesai animasi pembangunan properti.`);
      } else if (testType === "bankrupt") {
        console.log(`[Panel Uji] Menjalankan simulasi bangkrut & gulung tikar untuk ${current.nama}...`);
        await this._jalankanAnimasiBangkrut(current.id);
        setTimeout(() => {
          const token = this.tokens3D.tokens.get(current.id);
          if (token && !current.bangkrut) token.visible = true;
        }, 800);
        console.log(`[Panel Uji] Selesai simulasi bangkrut.`);
      }

      // Catat ke kronologi kejadian game juga
      if (this.latestState && this.latestState.logs) {
        this.latestState.logs.unshift({
          teks: `[Uji Coba] Selesai simulasi fitur: ${testType.toUpperCase()}`,
          tipe: "info",
        });
      }
    } catch (err) {
      console.error(`[Panel Uji Error] Gagal menjalankan uji coba '${testType}':`, err);
    } finally {
      this.ui.setAnimating(false);
      if (this.latestState) {
        if (this.latestState.players) {
          this.cashStack3D.syncCash(this.latestState.players);
        }
        this.ui.render(this.latestState);
      }
    }
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
    this.cashStack3D.update(dt, elapsed);
    this.cameraCtrl.update(dt);
    this.fxManager.update(dt);

    const { speakingMap, mutedMap } = this.voice.update();
    this.tokens3D.updateSpeakingIndicators(speakingMap, elapsed);
    this.ui.updateSpeakingUI(speakingMap, mutedMap);

    this.renderer.render(this.scene, this.camera);
  }
}

new WNISimulatorApp();
