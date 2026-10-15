// Pengelola UI Lengkap WNI Simulator (Upgrade Tugas 3, 4, & Aturan Utama #5):
// - Tabel Harga Beli, Harga Bangun Level Berikutnya, & Tabel Sewa Tiap Level (Tanah Kosong -> 1..4 Rumah -> Hotel)
// - Toast Notifikasi Biaya Sewa saat mendarat di tanah lawan sesuai level bangunan
// - Tombol Kualitas Partikel (TINGGI / RENDAH)

import { BOARD_TILES, formatRupiah } from "../shared/tiles.js";
import { CHARACTER_PRIVILEGES } from "../shared/gameEngine.js";
import { getRegionalTheme } from "../shared/regionalThemes.js";

const DEFAULT_PLAYERS = [
  { nama: "Budi Santoso", warna: "#ef4444", karakter: "keponakan_pejabat" },
  { nama: "Siti Aminah", warna: "#3b82f6", karakter: "juragan_kos" },
  { nama: "Agus Setiawan", warna: "#22c55e", karakter: "suhu_pinjol" },
  { nama: "Rina Wati", warna: "#eab308", karakter: "orang_have" },
];

const LEVEL_NAMES = [
  "Tanah Kosong",
  "1 Rumah",
  "2 Rumah",
  "3 Rumah",
  "4 Rumah",
  "1 Hotel Megah",
];

export class GameUI {
  constructor(callbacks) {
    this.callbacks = callbacks;

    this.roundIndicator = document.getElementById("round-indicator");
    this.turnTimerPill = document.getElementById("turn-timer-pill");
    this.modeSubtitle = document.getElementById("mode-subtitle");
    this.turnBadge = document.getElementById("turn-badge");
    this.playersList = document.getElementById("players-list");
    this.ownedCount = document.getElementById("owned-count");
    this.ownedList = document.getElementById("owned-list");
    this.tileIndexLabel = document.getElementById("tile-index-label");
    this.tileInspector = document.getElementById("tile-inspector");
    this.cardTileInfo = document.getElementById("card-tile-info");
    this.btnCloseTileInfo = document.getElementById("btn-close-tile-info");
    this.cardLog = document.getElementById("card-log");
    this.logCardHeader = document.getElementById("log-card-header");
    this.logListWrap = document.getElementById("log-list-wrap");
    this.logList = document.getElementById("log-list");
    this.logUnreadBadge = document.getElementById("log-unread-badge");
    this.btnToggleLog = document.getElementById("btn-toggle-log");
    this.btnToggleLogIcon = document.getElementById("btn-toggle-log-icon");
    this.btnToggleTileInfo = document.getElementById("btn-toggle-tile-info");
    this.btnToggleTileText = document.getElementById("btn-toggle-tile-text");
    this.btnToggleTileIcon = document.getElementById("btn-toggle-tile-icon");
    this._tileInfoManualClosed = false;
    this._lastInspectedTile = null;
    this._lastTurnPlayerId = null;
    this._tileInfoOpen = false;
    this._logOpen = true;
    this.latestState = null;
    this.statusBanner = document.getElementById("status-banner");
    this.cinematicBanner = document.getElementById("cinematic-banner");

    // Toast Sewa Lawan (Tugas 4)
    this.rentToast = document.getElementById("rent-toast");
    this.rentToastTitle = document.getElementById("rent-toast-title");
    this.rentToastBody = document.getElementById("rent-toast-body");
    this._rentToastTimer = null;

    // Tombol Aksi
    this.btnRoll = document.getElementById("btn-roll");
    this.btnJailPay = document.getElementById("btn-jail-pay");
    this.btnBuy = document.getElementById("btn-buy");
    this.btnSkip = document.getElementById("btn-skip");
    this.btnEnd = document.getElementById("btn-end");
    this.btnResetCam = document.getElementById("btn-reset-cam");
    this.btnLeaveRoom = document.getElementById("btn-leave-room");
    this.btnToggleDebug = document.getElementById("btn-toggle-debug");
    this.btnQuality = document.getElementById("btn-quality");
    this.debugBar = document.getElementById("debug-bar");

    // Kontrol Audio & Mikrofon
    this.btnMuteMusic = document.getElementById("btn-mute-music");
    this.btnMuteSfx = document.getElementById("btn-mute-sfx");
    this.btnMuteMic = document.getElementById("btn-mute-mic");
    this.sliderVolume = document.getElementById("slider-volume");

    // Elemen Modal Lobby
    this.setupModal = document.getElementById("setup-modal");
    this.tabMultiplayer = document.getElementById("tab-multiplayer");
    this.tabHotseat = document.getElementById("tab-hotseat");
    this.lobbyError = document.getElementById("lobby-error");
    this.mpEntryView = document.getElementById("mp-entry-view");
    this.mpWaitingView = document.getElementById("mp-waiting-view");
    this.hotseatView = document.getElementById("hotseat-view");

    this.mpNameInput = document.getElementById("mp-name-input");
    this.mpColorInput = document.getElementById("mp-color-input");
    this.mpCharInput = document.getElementById("mp-char-input");
    this.mpCharDesc = document.getElementById("mp-char-desc");
    this.mpRoomCodeInput = document.getElementById("mp-room-code-input");
    this.btnCreateRoom = document.getElementById("btn-create-room");
    this.btnJoinRoom = document.getElementById("btn-join-room");

    this.waitingRoomCode = document.getElementById("waiting-room-code");
    this.waitingPlayerCount = document.getElementById("waiting-player-count");
    this.waitingPlayersList = document.getElementById("waiting-players-list");
    this.btnLeaveWaiting = document.getElementById("btn-leave-waiting");
    this.btnHostStart = document.getElementById("btn-host-start");

    this.playerCountSelect = document.getElementById("player-count-select");
    this.playerInputsContainer = document.getElementById(
      "player-inputs-container",
    );
    this.btnStartMatch = document.getElementById("btn-start-match");

    // Modal Game Over
    this.gameoverModal = document.getElementById("gameover-modal");
    this.gameoverSummary = document.getElementById("gameover-summary");
    this.gameoverRankings = document.getElementById("gameover-rankings");
    this.btnRestartGameover = document.getElementById("btn-restart-gameover");

    this.isAnimating = false;
    this.isMultiplayer = false;
    this.myPlayerId = null;
    this.currentTurnDeadline = null;

    const randIdx = Math.floor(Math.random() * DEFAULT_PLAYERS.length);
    this.mpNameInput.value = DEFAULT_PLAYERS[randIdx].nama;
    this.mpColorInput.value = DEFAULT_PLAYERS[randIdx].warna;

    this._pasangEventListeners();
    this._initCharacterSelectMultiplayer();
    this._renderInputPemainSetup(4);
    this._startCountdownInterval();
  }

  _initCharacterSelectMultiplayer() {
    if (!this.mpCharInput) return;
    this.mpCharInput.innerHTML = "";
    for (const priv of Object.values(CHARACTER_PRIVILEGES)) {
      const opt = document.createElement("option");
      opt.value = priv.id;
      opt.textContent = `${priv.ikon} ${priv.nama} (Modal: ${formatRupiah(priv.modalAwal)})`;
      this.mpCharInput.appendChild(opt);
    }
    const updateDesc = () => {
      const selected = CHARACTER_PRIVILEGES[this.mpCharInput.value];
      if (selected && this.mpCharDesc) {
        this.mpCharDesc.textContent = `Skill Pasif: ${selected.deskripsi}`;
      }
    };
    this.mpCharInput.addEventListener("change", updateDesc);
    updateDesc();
  }

  _pasangEventListeners() {
    this.tabMultiplayer.addEventListener("click", () => {
      this.tabMultiplayer.classList.add("active");
      this.tabHotseat.classList.remove("active");
      this.mpEntryView.style.display = "block";
      this.mpWaitingView.style.display = "none";
      this.hotseatView.style.display = "none";
      this.showLobbyError(null);
    });

    this.tabHotseat.addEventListener("click", () => {
      this.tabHotseat.classList.add("active");
      this.tabMultiplayer.classList.remove("active");
      this.mpEntryView.style.display = "none";
      this.mpWaitingView.style.display = "none";
      this.hotseatView.style.display = "block";
      this.showLobbyError(null);
    });

    this.btnCreateRoom.addEventListener("click", () => {
      this.showLobbyError(null);
      const nama = this.mpNameInput.value.trim() || "Warga +62";
      const warna = this.mpColorInput.value || "#ef4444";
      const karakter = this.mpCharInput?.value || "keponakan_pejabat";
      this.callbacks.onCreateRoom?.(nama, warna, karakter);
    });

    this.btnJoinRoom.addEventListener("click", () => {
      this.showLobbyError(null);
      const code = this.mpRoomCodeInput.value.trim().toUpperCase();
      if (code.length !== 4) {
        this.showLobbyError("Masukkan kode room 4 huruf dengan benar.");
        return;
      }
      const nama = this.mpNameInput.value.trim() || "Warga +62";
      const warna = this.mpColorInput.value || "#3b82f6";
      const karakter = this.mpCharInput?.value || "juragan_kos";
      this.callbacks.onJoinRoom?.(code, nama, warna, karakter);
    });

    this.btnLeaveWaiting.addEventListener("click", () => {
      this.callbacks.onLeaveRoom?.();
    });

    this.btnHostStart.addEventListener("click", () => {
      this.callbacks.onHostStartGame?.();
    });

    this.playerCountSelect.addEventListener("change", (e) => {
      this._renderInputPemainSetup(Number(e.target.value));
    });

    this.btnStartMatch.addEventListener("click", () => {
      const count = Number(this.playerCountSelect.value);
      const configs = [];
      for (let i = 0; i < count; i++) {
        const nameInput = document.getElementById(`setup-name-${i}`);
        const colorInput = document.getElementById(`setup-color-${i}`);
        const charInput = document.getElementById(`setup-char-${i}`);
        configs.push({
          id: `p${i + 1}`,
          nama: nameInput?.value.trim() || DEFAULT_PLAYERS[i].nama,
          warna: colorInput?.value || DEFAULT_PLAYERS[i].warna,
          karakter: charInput?.value || DEFAULT_PLAYERS[i].karakter,
        });
      }
      this.setupModal.classList.add("hidden");
      this.gameoverModal.classList.add("hidden");
      this.callbacks.onStartHotSeatGame?.(configs);
    });

    this.btnLeaveRoom.addEventListener("click", () => {
      this.callbacks.onLeaveRoom?.();
    });

    this.btnRestartGameover.addEventListener("click", () => {
      this.gameoverModal.classList.add("hidden");
      this.callbacks.onLeaveRoom?.();
    });

    this.btnResetCam.addEventListener("click", () => {
      this.callbacks.onResetCamera?.();
      this.hideTileFocusPill();
      this.resetCamSelect();
    });

    this.camViewSelect = document.getElementById("cam-view-select");
    this.camViewSelect?.addEventListener("change", (e) => {
      this.callbacks.onChangeCamView?.(e.target.value);
    });

    this.tileFocusPill = document.getElementById("tile-focus-pill");
    this.tileFocusText = document.getElementById("tile-focus-text");
    this.btnTileFocusReset = document.getElementById("btn-tile-focus-reset");
    this.btnTileFocusReset?.addEventListener("click", () => {
      this.callbacks.onResetCamera?.();
      this.hideTileFocusPill();
      this.resetCamSelect();
    });

    this.btnCloseTileInfo?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.hideTileInfo();
    });

    this.btnToggleTileInfo?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleTileInfo();
    });

    this.btnToggleLog?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleLog();
    });

    this.logCardHeader?.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      this.toggleLog();
    });

    this.deedModal = document.getElementById("deed-modal");
    this.deedCardBody = document.getElementById("deed-card-body");
    this.btnCloseDeed = document.getElementById("btn-close-deed");
    this.btnCloseDeed?.addEventListener("click", () => this.hideDeedModal());
    this.deedModal?.addEventListener("click", (e) => {
      if (e.target === this.deedModal) this.hideDeedModal();
    });

    this.btnQuality.addEventListener("click", () => {
      const nextQ = this.callbacks.onToggleQuality?.();
      if (nextQ) {
        this.setQualityButtonState(nextQ);
      }
    });

    this.btnMuteMusic.addEventListener("click", () => {
      if (!this.callbacks.onToggleMusic) return;
      const isMuted = this.callbacks.onToggleMusic();
      this.btnMuteMusic.textContent = isMuted ? "Musik: OFF" : "Musik: ON";
      this.btnMuteMusic.classList.toggle("muted", isMuted);
    });

    this.btnMuteSfx.addEventListener("click", () => {
      if (!this.callbacks.onToggleSfx) return;
      const isMuted = this.callbacks.onToggleSfx();
      this.btnMuteSfx.textContent = isMuted ? "SFX: OFF" : "SFX: ON";
      this.btnMuteSfx.classList.toggle("muted", isMuted);
    });

    this.btnMuteMic.addEventListener("click", async () => {
      if (!this.callbacks.onToggleMic) return;
      const isMuted = await this.callbacks.onToggleMic();
      this.setMicButtonState(isMuted);
    });

    this.sliderVolume.addEventListener("input", (e) => {
      this.callbacks.onVolumeChange?.(Number(e.target.value));
    });

    this.btnToggleDebug.addEventListener("click", () => {
      this.debugBar.classList.toggle("hidden");
    });

    this.debugBar.querySelectorAll(".btn-debug-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this.isAnimating) return;
        const testType = btn.getAttribute("data-test");
        this.callbacks.onDebugTrigger?.(testType);
      });
    });

    this.btnRoll.addEventListener("click", () => {
      this.hideTileFocusPill();
      if (!this.isAnimating) this.callbacks.onRollDice?.();
    });

    this.btnJailPay.addEventListener("click", () => {
      this.hideTileFocusPill();
      if (!this.isAnimating) this.callbacks.onPayJail?.();
    });

    this.btnBuy.addEventListener("click", () => {
      this.hideTileFocusPill();
      if (!this.isAnimating) this.callbacks.onBuyProperty?.();
    });

    this.btnSkip.addEventListener("click", () => {
      this.hideTileFocusPill();
      if (!this.isAnimating) this.callbacks.onSkipBuy?.();
    });

    this.btnEnd.addEventListener("click", () => {
      this.hideTileFocusPill();
      if (!this.isAnimating) this.callbacks.onEndTurn?.();
    });
  }

  setQualityButtonState(quality) {
    if (!this.btnQuality) return;
    this.btnQuality.textContent =
      quality === "LOW" ? "Kualitas: RENDAH" : "Kualitas: TINGGI";
  }

  setMicButtonState(isMuted) {
    this.btnMuteMic.textContent = isMuted ? "Mic: OFF" : "Mic: ON";
    this.btnMuteMic.classList.toggle("muted", isMuted);
    this.btnMuteMic.classList.toggle("mic-active", !isMuted);
  }

  // Tugas 4: Tampilkan notifikasi jelas saat mendarat di tanah lawan dan membayar sewa sesuai level bangunan
  showRentNotification(ev) {
    if (!this.rentToast) return;
    if (this._rentToastTimer) clearTimeout(this._rentToastTimer);

    this.rentToastTitle.textContent = `SEWA ${ev.namaPetak?.toUpperCase()} (${ev.labelBangunan})`;
    this.rentToastBody.innerHTML = `<b>${ev.namaPembayar}</b> membayar <b>${formatRupiah(ev.nominal)}</b> kepada <b>${ev.namaPemilik}</b>`;
    this.rentToast.classList.remove("hidden");

    this._rentToastTimer = setTimeout(() => {
      this.rentToast.classList.add("hidden");
    }, 3600);
  }

  showLobbyError(msg) {
    if (!msg) {
      this.lobbyError.classList.add("hidden");
      this.lobbyError.textContent = "";
    } else {
      this.lobbyError.textContent = msg;
      this.lobbyError.classList.remove("hidden");
    }
  }

  showLobbyModal() {
    this.setupModal.classList.remove("hidden");
    this.tabMultiplayer.classList.add("active");
    this.tabHotseat.classList.remove("active");
    this.mpEntryView.style.display = "block";
    this.mpWaitingView.style.display = "none";
    this.hotseatView.style.display = "none";
    this.turnTimerPill.classList.add("hidden");
    this.showLobbyError(null);
  }

  hideLobbyModal() {
    this.setupModal.classList.add("hidden");
  }

  resetCamSelect() {
    if (this.camViewSelect) this.camViewSelect.value = "overview";
  }

  showTileFocusPill(tileIndex) {
    const tile = BOARD_TILES[tileIndex];
    const theme = getRegionalTheme(tileIndex);
    if (this.tileFocusText && tile) {
      this.tileFocusText.textContent = `🔍 Menyorot: ${theme.ikon} ${tile.nama} (#${tile.index})`;
    }
    this.tileFocusPill?.classList.remove("hidden");

    // Auto-dismiss setelah 3.5 detik agar tidak terus-menerus muncul & menghalangi pandangan
    if (this._tileFocusTimeout) clearTimeout(this._tileFocusTimeout);
    this._tileFocusTimeout = setTimeout(() => {
      this.hideTileFocusPill();
    }, 3500);
  }

  hideTileFocusPill() {
    if (this._tileFocusTimeout) {
      clearTimeout(this._tileFocusTimeout);
      this._tileFocusTimeout = null;
    }
    this.tileFocusPill?.classList.add("hidden");
  }

  setTileInfoOpen(open, tileIndex = null, state = null) {
    if (tileIndex !== null) this._lastInspectedTile = tileIndex;
    if (state) this.latestState = state;
    this._tileInfoOpen = open;

    const targetIdx =
      this._lastInspectedTile !== null ? this._lastInspectedTile : 0;
    const tile = BOARD_TILES[targetIdx];
    const theme = getRegionalTheme(targetIdx);

    // Update label tombol toggle di header card-log (menyatu/nyambung)
    if (this.btnToggleTileText && tile && theme) {
      this.btnToggleTileText.textContent = `${theme.ikon} #${tile.index} ${tile.nama}`;
    }

    if (open) {
      this._tileInfoManualClosed = false;
      const currentState = this.latestState || state;
      this._renderDetailPetak(currentState, targetIdx);
      if (this.cardTileInfo) {
        this.cardTileInfo.style.display = "block";
      }
      this.btnToggleTileInfo?.classList.add("active");
      if (this.btnToggleTileIcon) this.btnToggleTileIcon.textContent = "▴";
    } else {
      this._tileInfoManualClosed = true;
      if (this.cardTileInfo) {
        this.cardTileInfo.style.display = "none";
      }
      this.btnToggleTileInfo?.classList.remove("active");
      if (this.btnToggleTileIcon) this.btnToggleTileIcon.textContent = "▾";
    }
  }

  showTileInfo(tileIndex, state) {
    this.setTileInfoOpen(true, tileIndex, state);
  }

  hideTileInfo() {
    this.setTileInfoOpen(false);
  }

  toggleTileInfo() {
    this.setTileInfoOpen(!this._tileInfoOpen);
  }

  setLogOpen(open) {
    this._logOpen = open;
    if (open) {
      if (this.logListWrap) this.logListWrap.style.display = "block";
      if (this.btnToggleLogIcon) this.btnToggleLogIcon.textContent = "✕";
      this.btnToggleLog?.classList.remove("collapsed");
      if (this.logUnreadBadge) this.logUnreadBadge.style.display = "none";
    } else {
      if (this.logListWrap) this.logListWrap.style.display = "none";
      if (this.btnToggleLogIcon) this.btnToggleLogIcon.textContent = "▾";
      this.btnToggleLog?.classList.add("collapsed");
    }
  }

  toggleLog() {
    this.setLogOpen(!this._logOpen);
  }

  showDeedModal(tileIndex, state) {
    if (!this.deedModal || !this.deedCardBody) return;
    const tile = BOARD_TILES[tileIndex];
    if (!tile) return;
    const theme = getRegionalTheme(tileIndex);
    const prop = state?.properties ? state.properties[tileIndex] : null;
    const owner =
      prop && state?.players
        ? state.players.find((p) => p.id === prop.ownerId)
        : null;
    const curLevel = prop ? prop.level || 0 : -1;

    let origCanvas = this.callbacks.getTileCanvas?.(tileIndex);
    let canvasDataUrl = origCanvas ? origCanvas.toDataURL() : "";

    let modalHTML = `
      <div style="text-align:center; margin-bottom:12px;">
        <span style="font-size:0.75rem; font-weight:800; color:#fde047; text-transform:uppercase; letter-spacing:1px;">
          SERTIFIKAT HAK MILIK DAERAH +62
        </span>
      </div>

      <!-- Kartu Fisik HD Tegak Lurus -->
      <div style="display:flex; justify-content:center; margin-bottom:14px;">
        ${
          canvasDataUrl
            ? `<img src="${canvasDataUrl}" style="width:230px; height:323px; border-radius:12px; box-shadow:0 12px 32px rgba(0,0,0,0.85); border:3px solid rgba(255,255,255,0.25);" alt="${tile.nama}" />`
            : ""
        }
      </div>

      <!-- Banner Budaya & Lore -->
      <div style="background:${theme.bgGradient}; border:1px solid ${theme.accentColor}66; border-radius:10px; padding:10px 12px; margin-bottom:12px; box-shadow:0 4px 14px rgba(0,0,0,0.4); width:100%;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
          <span style="font-size:0.82rem; font-weight:900; color:${theme.accentColor};">${theme.ikon} ${theme.julukan}</span>
          <span style="font-size:0.72rem; background:rgba(0,0,0,0.4); padding:2px 7px; border-radius:4px;">${tile.namaGrup || tile.tipe}</span>
        </div>
        <div style="font-size:0.82rem; font-weight:700; color:#f8fafc; margin-bottom:4px;">${theme.ciriKhas}</div>
        <div style="font-size:0.75rem; color:rgba(255,255,255,0.88); font-style:italic;">"${theme.lore}"</div>
      </div>
    `;

    if (tile.tipe === "PROPERTY") {
      const nextBuildText =
        curLevel >= 5
          ? "Level Maksimal (Hotel)"
          : `${formatRupiah(tile.biayaBangun)} (${curLevel < 0 ? "Setelah Beli" : LEVEL_NAMES[curLevel + 1]})`;

      modalHTML += `
        <div style="width:100%; font-size:0.8rem; line-height:1.4;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span>Harga Beli Kavling:</span><b>${formatRupiah(tile.harga)}</b>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span>Biaya Bangun Berikutnya:</span><b style="color:#fde047;">${nextBuildText}</b>
          </div>
          <table class="rent-table" style="font-size:0.78rem;">
            <tr class="${curLevel === 0 ? "active-level" : ""}">
              <td>Tanah Kosong (Monopoli x2)</td>
              <td style="text-align:right;">${formatRupiah(tile.sewa[0])} (${formatRupiah(tile.sewa[0] * 2)})</td>
            </tr>
            <tr class="${curLevel === 1 ? "active-level" : ""}"><td>1 Rumah</td><td style="text-align:right;">${formatRupiah(tile.sewa[1])}</td></tr>
            <tr class="${curLevel === 2 ? "active-level" : ""}"><td>2 Rumah</td><td style="text-align:right;">${formatRupiah(tile.sewa[2])}</td></tr>
            <tr class="${curLevel === 3 ? "active-level" : ""}"><td>3 Rumah</td><td style="text-align:right;">${formatRupiah(tile.sewa[3])}</td></tr>
            <tr class="${curLevel === 4 ? "active-level" : ""}"><td>4 Rumah</td><td style="text-align:right;">${formatRupiah(tile.sewa[4])}</td></tr>
            <tr class="${curLevel === 5 ? "active-level" : ""}"><td>1 Hotel Sultan</td><td style="text-align:right;">${formatRupiah(tile.sewa[5])}</td></tr>
          </table>
          <div style="display:flex; justify-content:space-between; margin-top:8px; padding-top:6px; border-top:1px solid rgba(148,163,184,0.25);">
            <span>Pemilik Saat Ini:</span>
            <b>${owner ? `${owner.nama} (${LEVEL_NAMES[curLevel]})` : "Belum Ada (Milik Negara)"}</b>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:4px;">
            <span>Nilai Jual Darurat (50%):</span>
            <b style="color:#94a3b8;">${formatRupiah(tile.harga * 0.5)}</b>
          </div>
        </div>
      `;
    } else if (tile.tipe === "TRANSPORT") {
      modalHTML += `
        <div style="width:100%; font-size:0.8rem; line-height:1.4;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span>Harga Konsesi:</span><b>${formatRupiah(tile.harga)}</b>
          </div>
          <table class="rent-table" style="font-size:0.78rem;">
            <tr><td>1 Transportasi</td><td style="text-align:right;">${formatRupiah(tile.sewaTransport[1])}</td></tr>
            <tr><td>2 Transportasi</td><td style="text-align:right;">${formatRupiah(tile.sewaTransport[2])}</td></tr>
            <tr><td>3 Transportasi</td><td style="text-align:right;">${formatRupiah(tile.sewaTransport[3])}</td></tr>
            <tr><td>4 Transportasi</td><td style="text-align:right;">${formatRupiah(tile.sewaTransport[4])}</td></tr>
          </table>
          <div style="display:flex; justify-content:space-between; margin-top:8px;">
            <span>Pemilik:</span><b>${owner ? owner.nama : "Belum Ada"}</b>
          </div>
        </div>
      `;
    } else if (tile.tipe === "UTILITY") {
      modalHTML += `
        <div style="width:100%; font-size:0.8rem; line-height:1.4;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span>Harga Konsesi:</span><b>${formatRupiah(tile.harga)}</b>
          </div>
          <div style="font-size:0.78rem; color:#cbd5e1; margin:6px 0;">
            • Punya 1 Utilitas: Angka Dadu x Rp 10.000<br/>
            • Punya PLN & PDAM: Angka Dadu x Rp 20.000
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:8px;">
            <span>Pemilik:</span><b>${owner ? owner.nama : "Belum Ada"}</b>
          </div>
        </div>
      `;
    } else {
      modalHTML += `<div style="color:#cbd5e1; font-size:0.84rem; line-height:1.4; text-align:center; padding:10px 0;">${tile.deskripsi || ""}</div>`;
    }

    modalHTML += `
      <button id="btn-deed-close-action" class="btn-action btn-roll" style="width:100%; margin-top:14px; padding:8px 0; font-size:0.84rem;">
        Tutup Tampilan Kartu
      </button>
    `;

    this.deedCardBody.innerHTML = modalHTML;

    const btnCloseAct = this.deedCardBody.querySelector(
      "#btn-deed-close-action",
    );
    if (btnCloseAct)
      btnCloseAct.addEventListener("click", () => this.hideDeedModal());

    this.deedModal.classList.remove("hidden");
  }

  hideDeedModal() {
    this.deedModal?.classList.add("hidden");
  }

  renderWaitingRoom(roomSummary, myPlayerId) {
    this.setupModal.classList.remove("hidden");
    this.mpEntryView.style.display = "none";
    this.hotseatView.style.display = "none";
    this.mpWaitingView.style.display = "block";

    this.waitingRoomCode.textContent = roomSummary.code;
    this.waitingPlayerCount.textContent = String(roomSummary.players.length);
    this.waitingPlayersList.innerHTML = "";

    let amIHost = false;
    for (const p of roomSummary.players) {
      if (p.id === myPlayerId && p.isHost) amIHost = true;

      const priv = CHARACTER_PRIVILEGES[p.karakter];
      const charBadge = priv
        ? `<span class="badge-tag" style="color:#fde047; border-color:rgba(250,204,21,0.4);" title="${priv.deskripsi}">${priv.ikon} ${priv.nama}</span>`
        : "";

      const row = document.createElement("div");
      row.className = "lobby-player-row";
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; font-weight:700;">
          <span class="color-dot" style="background:${p.warna};"></span>
          <span>${p.nama} ${p.id === myPlayerId ? "(Anda)" : ""}</span>
          ${charBadge}
          <span class="mic-badge" id="lobby-mic-${p.id}">MIC</span>
        </div>
        <div style="display:flex; gap:6px; font-size:0.75rem;">
          ${p.isHost ? '<span class="badge-tag" style="color:#fde047; border-color:#facc15;">HOST</span>' : ""}
          <span class="badge-tag" style="color:${p.connected ? "#4ade80" : "#f97316"};">
            ${p.connected ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      `;
      this.waitingPlayersList.appendChild(row);
    }

    const enoughPlayers =
      roomSummary.players.length >= 2 && roomSummary.players.length <= 4;
    this.btnHostStart.disabled = !(amIHost && enoughPlayers);
    this.btnHostStart.textContent = amIHost
      ? enoughPlayers
        ? "Mulai Permainan Sekarang!"
        : "Menunggu Minimal 2 Warga..."
      : "Menunggu Host Memulai...";
  }

  setSessionMode({ isMultiplayer, myPlayerId, roomCode }) {
    this.isMultiplayer = isMultiplayer;
    this.myPlayerId = myPlayerId;
    if (isMultiplayer && roomCode) {
      this.modeSubtitle.textContent = `Online: ${roomCode}`;
      this.turnTimerPill.classList.remove("hidden");
    } else {
      this.modeSubtitle.textContent = "Hot-Seat";
      this.turnTimerPill.classList.add("hidden");
    }
  }

  _startCountdownInterval() {
    setInterval(() => {
      if (!this.isMultiplayer || !this.currentTurnDeadline) {
        this.turnTimerPill.classList.add("hidden");
        return;
      }
      const remSec = Math.max(
        0,
        Math.ceil((this.currentTurnDeadline - Date.now()) / 1000),
      );
      this.turnTimerPill.classList.remove("hidden");
      this.turnTimerPill.textContent = `Waktu: ${remSec}d`;
      this.turnTimerPill.classList.toggle("urgent", remSec <= 12);
    }, 250);
  }

  _renderInputPemainSetup(jumlah) {
    this.playerInputsContainer.innerHTML = "";
    const privList = Object.values(CHARACTER_PRIVILEGES);

    for (let i = 0; i < jumlah; i++) {
      const defaultChar = DEFAULT_PLAYERS[i]?.karakter || privList[i % privList.length].id;
      const optionsHtml = privList
        .map(
          (pr) =>
            `<option value="${pr.id}" ${pr.id === defaultChar ? "selected" : ""}>${pr.ikon} ${pr.nama}</option>`,
        )
        .join("");

      const row = document.createElement("div");
      row.className = "setup-row";
      row.style.flexWrap = "wrap";
      row.innerHTML = `
        <input id="setup-color-${i}" type="color" value="${DEFAULT_PLAYERS[i]?.warna || "#ef4444"}" style="width:38px; height:38px; border:none; background:transparent; cursor:pointer;" />
        <input id="setup-name-${i}" type="text" class="setup-input" value="${DEFAULT_PLAYERS[i]?.nama || `Warga ${i + 1}`}" maxlength="20" placeholder="Nama Warga ${i + 1}" style="flex:1; min-width:130px;" />
        <select id="setup-char-${i}" class="setup-input" style="flex:1.2; min-width:165px; font-size:0.8rem;">
          ${optionsHtml}
        </select>
      `;
      this.playerInputsContainer.appendChild(row);
    }
  }

  showCinematicBanner(teks) {
    if (!this.cinematicBanner) return;
    if (teks) {
      this.cinematicBanner.textContent = teks;
      this.cinematicBanner.classList.remove("hidden");
    } else {
      this.cinematicBanner.classList.add("hidden");
    }
  }

  setAnimating(flag) {
    this.isAnimating = flag;
    if (flag) {
      this.btnRoll.disabled = true;
      this.btnJailPay.disabled = true;
      this.btnBuy.disabled = true;
      this.btnSkip.disabled = true;
      this.btnEnd.disabled = true;
    }
  }

  render(state) {
    if (!state) return;
    this.latestState = state;

    this.currentTurnDeadline = state.turnDeadline || null;
    const currentPlayer = state.players[state.giliranIndex];
    this.roundIndicator.textContent = `Putaran ${state.putaran} / ${state.maxPutaran}`;
    this.turnBadge.textContent = currentPlayer
      ? `Giliran: ${currentPlayer.nama}`
      : "-";

    // Jika giliran pemain berganti, reset status tutup manual agar pemain baru bisa melihat info petak saat mendarat
    if (currentPlayer && currentPlayer.id !== this._lastTurnPlayerId) {
      this._lastTurnPlayerId = currentPlayer.id;
      this._tileInfoManualClosed = false;
    }

    this._renderDaftarPemain(state, currentPlayer);
    this._renderDaftarAset(state, currentPlayer);

    // Update informasi petak HANYA jika panel sedang aktif dibuka (tidak memaksa buka jika di-hide)
    if (this.cardTileInfo && this.cardTileInfo.style.display !== "none") {
      const targetTile =
        this._lastInspectedTile !== null
          ? this._lastInspectedTile
          : currentPlayer
            ? currentPlayer.posisi
            : 0;
      this._renderDetailPetak(state, targetTile);
    }

    this._renderLog(state.log);
    this._renderTombolAksi(state, currentPlayer);

    if (state.fase === "GAME_OVER") {
      this._tampilkanModalGameOver(state);
    }
  }

  _renderDaftarPemain(state, currentPlayer) {
    this.playersList.innerHTML = "";

    for (const p of state.players) {
      const isTurn = currentPlayer && p.id === currentPlayer.id;
      const isMe = this.isMultiplayer && p.id === this.myPlayerId;
      const ownedCount = Object.values(state.properties).filter(
        (pr) => pr.ownerId === p.id,
      ).length;

      const div = document.createElement("div");
      div.id = `player-card-${p.id}`;
      div.className = `player-item ${isTurn ? "active-turn" : ""} ${p.bangkrut ? "bankrupt" : ""}`;

      const statusPungli =
        p.jumlahPungli >= 3 ? "Kebal Pungli" : `Pungli: ${p.jumlahPungli}/3`;

      const priv = CHARACTER_PRIVILEGES[p.karakter];
      const badgeKarakter = priv
        ? `<span class="badge-tag" style="color:#fde047; border-color:rgba(250,204,21,0.4);" title="${priv.deskripsi}">${priv.ikon} ${priv.nama}</span>`
        : "";
      const badgePinjol =
        p.karakter === "suhu_pinjol"
          ? `<span class="badge-tag">${p.danaTalanganTerpakai ? "Pinjol: Terpakai" : "Pinjol: Siap"}</span>`
          : "";

      div.innerHTML = `
        <div class="player-header">
          <div class="player-id">
            <span class="color-dot" style="background:${p.warna};"></span>
            <span>${p.nama}</span>
            ${isMe ? '<span class="badge-tag badge-me">ANDA</span>' : ""}
            <span id="mic-badge-${p.id}" class="mic-badge ${p.micMuted ? "muted" : ""}">
              ${p.micMuted ? "MUTE" : "MIC"}
            </span>
          </div>
          <div class="player-money">${p.bangkrut ? "BANGKRUT" : formatRupiah(p.uang)}</div>
        </div>
        <div class="player-meta">
          ${badgeKarakter}
          ${badgePinjol}
          <span class="badge-tag">Petak #${p.posisi}: ${BOARD_TILES[p.posisi].nama}</span>
          <span class="badge-tag">${ownedCount} Aset</span>
          <span class="badge-tag">${statusPungli}</span>
          ${p.diPenjara ? `<span class="badge-tag badge-jail">Di Lapas (${p.giliranPenjara}/3)</span>` : ""}
          ${p.terputus ? '<span class="badge-tag badge-offline">OFFLINE</span>' : ""}
        </div>
      `;
      this.playersList.appendChild(div);
    }
  }

  updateSpeakingUI(speakingMap, mutedMap) {
    for (const pid of ["p1", "p2", "p3", "p4"]) {
      const isSpeaking = Boolean(speakingMap?.get(pid));
      const isMuted = Boolean(mutedMap?.get(pid));

      const cardEl = document.getElementById(`player-card-${pid}`);
      const badgeEl = document.getElementById(`mic-badge-${pid}`);
      const lobbyBadgeEl = document.getElementById(`lobby-mic-${pid}`);

      if (cardEl) cardEl.classList.toggle("speaking-now", isSpeaking);

      if (badgeEl) {
        badgeEl.classList.toggle("speaking", isSpeaking);
        badgeEl.classList.toggle("muted", !isSpeaking && isMuted);
        badgeEl.textContent = isSpeaking ? "BICARA" : isMuted ? "MUTE" : "MIC";
      }

      if (lobbyBadgeEl) {
        lobbyBadgeEl.classList.toggle("speaking", isSpeaking);
        lobbyBadgeEl.classList.toggle("muted", !isSpeaking && isMuted);
        lobbyBadgeEl.textContent = isSpeaking
          ? "BICARA"
          : isMuted
            ? "MUTE"
            : "MIC";
      }
    }
  }

  // Tugas 4: Menampilkan progresi Tanah Kosong -> 1..4 Rumah -> Hotel & harga bangun level berikutnya
  _renderDaftarAset(state, currentPlayer) {
    this.ownedList.innerHTML = "";
    const targetOwner =
      this.isMultiplayer && this.myPlayerId
        ? state.players.find((p) => p.id === this.myPlayerId) || currentPlayer
        : currentPlayer;

    if (!targetOwner) return;

    const isMyTurn =
      !this.isMultiplayer ||
      (currentPlayer && currentPlayer.id === this.myPlayerId);

    const milik = Object.entries(state.properties)
      .filter(([, prop]) => prop.ownerId === targetOwner.id)
      .map(([idxStr, prop]) => ({
        tileIndex: Number(idxStr),
        tile: BOARD_TILES[Number(idxStr)],
        level: prop.level || 0,
      }));

    this.ownedCount.textContent = `${milik.length} Aset (${targetOwner.nama})`;

    if (milik.length === 0) {
      this.ownedList.innerHTML = `<div style="color:#64748b; font-size:0.78rem; padding:6px 0;">Belum memiliki sertifikat tanah.</div>`;
      return;
    }

    for (const item of milik) {
      const row = document.createElement("div");
      row.className = "owned-item";
      row.style.borderLeftColor = item.tile.warna || "#64748b";

      const biayaBangunEfektif =
        targetOwner.karakter === "juragan_kos"
          ? Math.round(item.tile.biayaBangun * 0.85)
          : item.tile.biayaBangun;

      let infoLevel = "Konsesi Layanan";
      let nextLevelLabel = "+Bangun";
      if (item.tile.tipe === "PROPERTY") {
        const curName = LEVEL_NAMES[item.level] || "Tanah Kosong";
        const curRent = item.tile.sewa[item.level];
        infoLevel = `${curName} • Sewa: ${formatRupiah(curRent)}`;
        if (item.level < 5) {
          const nextTarget =
            item.level === 4 ? "Hotel" : `Rumah #${item.level + 1}`;
          nextLevelLabel = `+${nextTarget} (${Math.round(biayaBangunEfektif / 1000)}Rb)`;
        } else {
          nextLevelLabel = "MAX (Hotel)";
        }
      }

      const bisaBangun =
        isMyTurn &&
        !this.isAnimating &&
        item.tile.tipe === "PROPERTY" &&
        item.level < 5 &&
        targetOwner.uang >= biayaBangunEfektif;

      const bisaJual = isMyTurn && !this.isAnimating;
      const theme = getRegionalTheme(item.tileIndex);

      row.innerHTML = `
        <div class="owned-info" style="cursor:pointer;" title="Klik untuk cek Sertifikat Hak Milik daerah ini">
          <div class="owned-name">${theme.ikon} ${item.tile.nama}</div>
          <div class="owned-sub">${infoLevel} • <span style="color:${theme.accentColor}; font-weight:700;">${theme.julukan}</span></div>
        </div>
        <div class="owned-actions">
          ${
            item.tile.tipe === "PROPERTY"
              ? `<button class="btn-mini upgrade" data-idx="${item.tileIndex}" ${bisaBangun ? "" : "disabled"} title="Bangun Level Berikutnya (${formatRupiah(biayaBangunEfektif)})">${nextLevelLabel}</button>`
              : ""
          }
          <button class="btn-mini sell" data-idx="${item.tileIndex}" ${bisaJual ? "" : "disabled"} title="Jual 50% Harga">Jual</button>
        </div>
      `;

      const infoEl = row.querySelector(".owned-info");
      if (infoEl) {
        infoEl.addEventListener("click", () => {
          this.showTileInfo(item.tileIndex, state);
          this.callbacks.onFocusTile?.(item.tileIndex);
        });
      }

      const btnUpgrade = row.querySelector(".upgrade");
      if (btnUpgrade) {
        btnUpgrade.addEventListener("click", () => {
          this.callbacks.onUpgradeProperty?.(item.tileIndex);
        });
      }

      const btnSell = row.querySelector(".sell");
      if (btnSell) {
        btnSell.addEventListener("click", () => {
          this.callbacks.onSellAsset?.(item.tileIndex);
        });
      }

      this.ownedList.appendChild(row);
    }
  }

  // Tugas 4: Tabel Data Lengkap per Petak (Harga Beli, Biaya Bangun Level Berikutnya, & Sewa Tiap Level)
  _renderDetailPetak(state, tileIndex) {
    const tile = BOARD_TILES[tileIndex];
    const theme = getRegionalTheme(tileIndex);
    const prop = state.properties[tileIndex];
    const owner = prop
      ? state.players.find((p) => p.id === prop.ownerId)
      : null;
    const curLevel = prop ? prop.level || 0 : -1;

    this.tileIndexLabel.textContent = `${theme.ikon} #${tile.index}`;

    let detailHTML = `
      <div class="tile-header-bar" style="background:${theme.bgGradient || tile.warna || "#334155"}; box-shadow: 0 4px 12px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.18);">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:1.15rem;">${theme.ikon}</span>
          <span style="font-weight:900; letter-spacing:0.3px;">${tile.nama}</span>
        </div>
        <span style="font-size:0.75rem; background:rgba(0,0,0,0.38); padding:2px 8px; border-radius:6px; font-weight:700;">${tile.namaGrup || tile.tipe}</span>
      </div>

      <!-- Tombol Zoom Kartu HD Tegak Lurus -->
      <button class="btn-zoom-card" id="btn-zoom-card" title="Klik untuk membuka kartu tegak lurus dalam ukuran besar">
        🔎 Perbesar Kartu HD (Tegak & Jelas)
      </button>

      <!-- Banner Ciri Khas & Identitas Budaya Daerah -->
      <div class="regional-card-banner" id="banner-inspect" style="cursor:pointer; background: ${theme.bgGradient}; border: 1px solid ${theme.accentColor}55; border-radius: 8px; padding: 7px 10px; margin-bottom: 7px; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.25);" title="Klik untuk perbesar">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
          <span style="font-size:0.72rem; font-weight:900; color:${theme.accentColor}; text-transform:uppercase; letter-spacing:0.5px;">
            ${theme.ikon} ${theme.julukan}
          </span>
          <span style="font-size:0.68rem; color:#cbd5e1;">Ciri Khas 🔍</span>
        </div>
        <div style="font-size:0.77rem; font-weight:700; color:#f8fafc; margin-bottom:3px; line-height:1.25;">
          ${theme.ciriKhas}
        </div>
        <div style="font-size:0.71rem; color:rgba(255,255,255,0.88); font-style:italic; line-height:1.2;">
          "${theme.lore}"
        </div>
      </div>

      <!-- Wadah Mini Preview Kartu 2D Asli -->
      <div id="mini-card-preview-wrap" style="text-align:center; margin: 4px 0 8px 0; cursor:pointer;" title="Klik untuk perbesar kartu"></div>
    `;

    if (tile.tipe === "PROPERTY") {
      const nextBuildText =
        curLevel >= 5
          ? "Level Maksimal (Hotel)"
          : `${formatRupiah(tile.biayaBangun)} (${curLevel < 0 ? "Setelah Beli" : LEVEL_NAMES[curLevel + 1]})`;

      detailHTML += `
        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
          <span>Harga Beli Tanah:</span><b>${formatRupiah(tile.harga)}</b>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Biaya Bangun Berikutnya:</span><b style="color:#fde047;">${nextBuildText}</b>
        </div>
        <table class="rent-table">
          <tr class="${curLevel === 0 ? "active-level" : ""}">
            <td>Tanah Kosong (Monopoli x2)</td>
            <td style="text-align:right;">${formatRupiah(tile.sewa[0])} (${formatRupiah(tile.sewa[0] * 2)})</td>
          </tr>
          <tr class="${curLevel === 1 ? "active-level" : ""}">
            <td>1 Rumah</td>
            <td style="text-align:right;">${formatRupiah(tile.sewa[1])}</td>
          </tr>
          <tr class="${curLevel === 2 ? "active-level" : ""}">
            <td>2 Rumah</td>
            <td style="text-align:right;">${formatRupiah(tile.sewa[2])}</td>
          </tr>
          <tr class="${curLevel === 3 ? "active-level" : ""}">
            <td>3 Rumah</td>
            <td style="text-align:right;">${formatRupiah(tile.sewa[3])}</td>
          </tr>
          <tr class="${curLevel === 4 ? "active-level" : ""}">
            <td>4 Rumah</td>
            <td style="text-align:right;">${formatRupiah(tile.sewa[4])}</td>
          </tr>
          <tr class="${curLevel === 5 ? "active-level" : ""}">
            <td>1 Hotel Megah</td>
            <td style="text-align:right;">${formatRupiah(tile.sewa[5])}</td>
          </tr>
        </table>
        <div style="display:flex; justify-content:space-between; margin-top:6px; padding-top:4px; border-top:1px solid rgba(148,163,184,0.2);">
          <span>Pemilik Saat Ini:</span>
          <b>${owner ? `${owner.nama} (${LEVEL_NAMES[curLevel]})` : "Belum Ada (Negara)"}</b>
        </div>
      `;
    } else if (tile.tipe === "TRANSPORT") {
      detailHTML += `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Harga Konsesi:</span><b>${formatRupiah(tile.harga)}</b>
        </div>
        <table class="rent-table">
          <tr><td>1 Transportasi</td><td style="text-align:right;">${formatRupiah(tile.sewaTransport[1])}</td></tr>
          <tr><td>2 Transportasi</td><td style="text-align:right;">${formatRupiah(tile.sewaTransport[2])}</td></tr>
          <tr><td>3 Transportasi</td><td style="text-align:right;">${formatRupiah(tile.sewaTransport[3])}</td></tr>
          <tr><td>4 Transportasi</td><td style="text-align:right;">${formatRupiah(tile.sewaTransport[4])}</td></tr>
        </table>
        <div style="display:flex; justify-content:space-between; margin-top:6px;">
          <span>Pemilik:</span><b>${owner ? owner.nama : "Belum Ada"}</b>
        </div>
      `;
    } else if (tile.tipe === "UTILITY") {
      detailHTML += `
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Harga Konsesi:</span><b>${formatRupiah(tile.harga)}</b>
        </div>
        <div style="font-size:0.76rem; color:#cbd5e1; margin:4px 0;">
          • Punya 1 Utilitas: Angka Dadu x Rp 10.000<br/>
          • Punya PLN & PDAM: Angka Dadu x Rp 20.000
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:6px;">
          <span>Pemilik:</span><b>${owner ? owner.nama : "Belum Ada"}</b>
        </div>
      `;
    } else {
      detailHTML += `<div style="color:#cbd5e1;">${tile.deskripsi || ""}</div>`;
    }

    this.tileInspector.innerHTML = detailHTML;

    // Sisipkan gambar asli tekstur kartu jika tersedia
    const origCanvas = this.callbacks.getTileCanvas?.(tileIndex);
    if (origCanvas) {
      const wrap = this.tileInspector.querySelector("#mini-card-preview-wrap");
      if (wrap) {
        const miniImg = document.createElement("img");
        miniImg.src = origCanvas.toDataURL();
        miniImg.style.width = "135px";
        miniImg.style.height = "190px";
        miniImg.style.borderRadius = "8px";
        miniImg.style.boxShadow = "0 6px 18px rgba(0,0,0,0.7)";
        miniImg.style.border = "2px solid rgba(255,255,255,0.22)";
        miniImg.style.transition = "transform 0.2s, box-shadow 0.2s";
        miniImg.onmouseenter = () => {
          miniImg.style.transform = "scale(1.05)";
          miniImg.style.boxShadow = "0 8px 24px rgba(250,204,21,0.4)";
        };
        miniImg.onmouseleave = () => {
          miniImg.style.transform = "scale(1)";
          miniImg.style.boxShadow = "0 6px 18px rgba(0,0,0,0.7)";
        };
        miniImg.addEventListener("click", () => this.showDeedModal(tileIndex, state));
        wrap.appendChild(miniImg);
      }
    }

    const btnZoom = this.tileInspector.querySelector("#btn-zoom-card");
    if (btnZoom) btnZoom.addEventListener("click", () => this.showDeedModal(tileIndex, state));

    const bannerInspect = this.tileInspector.querySelector("#banner-inspect");
    if (bannerInspect) bannerInspect.addEventListener("click", () => this.showDeedModal(tileIndex, state));
  }

  _renderLog(logArray) {
    this.logList.innerHTML = "";
    for (const item of logArray.slice(0, 25)) {
      const div = document.createElement("div");
      div.className = `log-entry ${item.tipe || "info"}`;
      div.textContent = item.teks;
      this.logList.appendChild(div);
    }

    if (this.logUnreadBadge) {
      this.logUnreadBadge.style.display = !this._logOpen ? "inline-block" : "none";
    }
  }

  _renderTombolAksi(state, currentPlayer) {
    const isMyTurn =
      !this.isMultiplayer ||
      (currentPlayer && currentPlayer.id === this.myPlayerId);

    const hideAllButtons = () => {
      this.btnRoll.style.display = "none";
      this.btnJailPay.style.display = "none";
      this.btnBuy.style.display = "none";
      this.btnSkip.style.display = "none";
      this.btnEnd.style.display = "none";
    };

    if (
      !currentPlayer ||
      this.isAnimating ||
      state.fase === "GAME_OVER" ||
      !isMyTurn
    ) {
      hideAllButtons();

      if (currentPlayer && !isMyTurn && state.fase !== "GAME_OVER") {
        this.statusBanner.textContent =
          state.fase === "WAIT_CARD_CONFIRM"
            ? `Menunggu ${currentPlayer.nama} membaca kartu...`
            : `Menunggu giliran ${currentPlayer.nama} beraksi...`;
      } else if (state.fase === "GAME_OVER") {
        this.statusBanner.textContent = "Permainan Telah Selesai!";
      } else if (this.isAnimating) {
        this.statusBanner.textContent = "Warga sedang bergerak...";
      }
      return;
    }

    const tile = BOARD_TILES[currentPlayer.posisi];

    if (state.fase === "WAIT_ROLL") {
      hideAllButtons();
      const biayaTebus =
        currentPlayer.karakter === "keponakan_pejabat" ? 50000 : 100000;

      // Tampilkan tombol utama LEMPAR DADU (Get Rich Style)
      this.btnRoll.style.display = "inline-flex";
      this.btnRoll.disabled = false;
      this.btnRoll.innerHTML = `<span>🎲</span> <span>LEMPAR DADU</span>`;

      if (currentPlayer.diPenjara) {
        this.btnJailPay.style.display = "inline-flex";
        this.btnJailPay.innerHTML = `<span>🔓</span> <span>TEBUS (${formatRupiah(biayaTebus)})</span>`;
        this.btnJailPay.disabled = currentPlayer.uang < biayaTebus;
        this.statusBanner.textContent = `Giliran Anda (${currentPlayer.nama} di Lapas): Lempar dadu kembar atau Tebus ${formatRupiah(biayaTebus)}.`;
      } else {
        this.statusBanner.textContent = `Giliran Anda (${currentPlayer.nama}): Silakan Lempar Dadu!`;
      }
    } else if (state.fase === "WAIT_CARD_CONFIRM") {
      hideAllButtons();
      this.statusBanner.textContent = `${currentPlayer.nama}: Silakan baca kartu takdir/musibah di layar lalu tekan "OK".`;
    } else if (state.fase === "WAIT_BUY_DECISION") {
      hideAllButtons();

      // Buka otomatis informasi petak jika belum ditutup manual
      if (!this._tileInfoManualClosed) {
        this.showTileInfo(currentPlayer.posisi, state);
      }

      this.btnBuy.style.display = "inline-flex";
      this.btnSkip.style.display = "inline-flex";

      const canAfford = currentPlayer.uang >= (tile.harga || 0);
      this.btnBuy.disabled = !canAfford;
      this.btnBuy.innerHTML = `<span>🏠</span> <span>BELI TANAH (${formatRupiah(tile.harga || 0)})</span>`;

      this.btnSkip.disabled = false;
      this.btnSkip.innerHTML = `<span>✕</span> <span>LEWATI</span>`;

      this.statusBanner.textContent = `${currentPlayer.nama} mendarat di ${tile.nama}: Beli seharga ${formatRupiah(tile.harga || 0)}?`;
    } else if (state.fase === "WAIT_END_TURN") {
      hideAllButtons();

      this.btnEnd.style.display = "inline-flex";
      this.btnEnd.disabled = false;
      this.btnEnd.innerHTML = `<span>⏩</span> <span>AKHIRI GILIRAN</span>`;

      this.statusBanner.textContent = `${currentPlayer.nama}: Anda bisa membangun Rumah/Hotel di panel kiri, lalu Akhiri Giliran.`;
    }
  }

  _tampilkanModalGameOver(state) {
    const pemenang = state.players.find((p) => p.id === state.pemenang);
    this.gameoverSummary.textContent = pemenang
      ? `Selamat kepada ${pemenang.nama} yang berhasil bertahan hidup sebagai WNI teladan!`
      : "Permainan telah selesai.";

    this.gameoverRankings.innerHTML = "";
    state.peringkatAkhir.forEach((p, idx) => {
      const row = document.createElement("div");
      row.style.cssText =
        "background:#1e293b; padding:10px 14px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;";
      row.innerHTML = `
        <div>
          <b>#${idx + 1} ${p.nama}</b>
          <span style="font-size:0.8rem; color:#94a3b8; margin-left:8px;">
            ${p.bangkrut ? "(Bangkrut)" : "(Bertahan)"}
          </span>
        </div>
        <div style="color:#4ade80; font-weight:800;">${formatRupiah(p.kekayaanBersih)}</div>
      `;
      this.gameoverRankings.appendChild(row);
    });

    this.gameoverModal.classList.remove("hidden");
  }
}
