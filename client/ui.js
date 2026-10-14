// Pengelola UI Lengkap WNI Simulator (Upgrade Tugas 3, 4, & Aturan Utama #5):
// - Tabel Harga Beli, Harga Bangun Level Berikutnya, & Tabel Sewa Tiap Level (Tanah Kosong -> 1..4 Rumah -> Hotel)
// - Toast Notifikasi Biaya Sewa saat mendarat di tanah lawan sesuai level bangunan
// - Tombol Kualitas Partikel (TINGGI / RENDAH)

import { BOARD_TILES, formatRupiah } from "../shared/tiles.js";

const DEFAULT_PLAYERS = [
  { nama: "Budi Santoso", warna: "#ef4444" },
  { nama: "Siti Aminah", warna: "#3b82f6" },
  { nama: "Agus Setiawan", warna: "#22c55e" },
  { nama: "Rina Wati", warna: "#eab308" },
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
    this.logList = document.getElementById("log-list");
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
    this._renderInputPemainSetup(4);
    this._startCountdownInterval();
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
      this.callbacks.onCreateRoom?.(nama, warna);
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
      this.callbacks.onJoinRoom?.(code, nama, warna);
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
        configs.push({
          id: `p${i + 1}`,
          nama: nameInput?.value.trim() || DEFAULT_PLAYERS[i].nama,
          warna: colorInput?.value || DEFAULT_PLAYERS[i].warna,
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
      if (!this.isAnimating) this.callbacks.onRollDice?.();
    });

    this.btnJailPay.addEventListener("click", () => {
      if (!this.isAnimating) this.callbacks.onPayJail?.();
    });

    this.btnBuy.addEventListener("click", () => {
      if (!this.isAnimating) this.callbacks.onBuyProperty?.();
    });

    this.btnSkip.addEventListener("click", () => {
      if (!this.isAnimating) this.callbacks.onSkipBuy?.();
    });

    this.btnEnd.addEventListener("click", () => {
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

      const row = document.createElement("div");
      row.className = "lobby-player-row";
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; font-weight:700;">
          <span class="color-dot" style="background:${p.warna};"></span>
          <span>${p.nama} ${p.id === myPlayerId ? "(Anda)" : ""}</span>
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
      this.modeSubtitle.textContent = `Room Online: ${roomCode} • Anda: ${myPlayerId.toUpperCase()}`;
      this.turnTimerPill.classList.remove("hidden");
    } else {
      this.modeSubtitle.textContent = "Mode Hot-Seat Lokal (1 Layar)";
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
    for (let i = 0; i < jumlah; i++) {
      const row = document.createElement("div");
      row.className = "setup-row";
      row.innerHTML = `
        <input id="setup-color-${i}" type="color" value="${DEFAULT_PLAYERS[i].warna}" style="width:42px; height:38px; border:none; background:transparent; cursor:pointer;" />
        <input id="setup-name-${i}" type="text" class="setup-input" value="${DEFAULT_PLAYERS[i].nama}" maxlength="20" placeholder="Nama Warga ${i + 1}" />
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

    this.currentTurnDeadline = state.turnDeadline || null;
    const currentPlayer = state.players[state.giliranIndex];
    this.roundIndicator.textContent = `Putaran ${state.putaran} / ${state.maxPutaran}`;
    this.turnBadge.textContent = currentPlayer
      ? `Giliran: ${currentPlayer.nama}`
      : "-";

    this._renderDaftarPemain(state, currentPlayer);
    this._renderDaftarAset(state, currentPlayer);
    this._renderDetailPetak(state, currentPlayer ? currentPlayer.posisi : 0);
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

      let infoLevel = "Konsesi Layanan";
      let nextLevelLabel = "+Bangun";
      if (item.tile.tipe === "PROPERTY") {
        const curName = LEVEL_NAMES[item.level] || "Tanah Kosong";
        const curRent = item.tile.sewa[item.level];
        infoLevel = `${curName} • Sewa: ${formatRupiah(curRent)}`;
        if (item.level < 5) {
          const nextTarget =
            item.level === 4 ? "Hotel" : `Rumah #${item.level + 1}`;
          nextLevelLabel = `+${nextTarget} (${Math.round(item.tile.biayaBangun / 1000)}Rb)`;
        } else {
          nextLevelLabel = "MAX (Hotel)";
        }
      }

      const bisaBangun =
        isMyTurn &&
        !this.isAnimating &&
        item.tile.tipe === "PROPERTY" &&
        item.level < 5 &&
        targetOwner.uang >= item.tile.biayaBangun;

      const bisaJual = isMyTurn && !this.isAnimating;

      row.innerHTML = `
        <div class="owned-info">
          <div class="owned-name">${item.tile.nama}</div>
          <div class="owned-sub">${infoLevel}</div>
        </div>
        <div class="owned-actions">
          ${
            item.tile.tipe === "PROPERTY"
              ? `<button class="btn-mini upgrade" data-idx="${item.tileIndex}" ${bisaBangun ? "" : "disabled"} title="Bangun Level Berikutnya (${formatRupiah(item.tile.biayaBangun)})">${nextLevelLabel}</button>`
              : ""
          }
          <button class="btn-mini sell" data-idx="${item.tileIndex}" ${bisaJual ? "" : "disabled"} title="Jual 50% Harga">Jual</button>
        </div>
      `;

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
    const prop = state.properties[tileIndex];
    const owner = prop
      ? state.players.find((p) => p.id === prop.ownerId)
      : null;
    const curLevel = prop ? prop.level || 0 : -1;

    this.tileIndexLabel.textContent = `#${tile.index}`;

    let detailHTML = `
      <div class="tile-header-bar" style="background:${tile.warna || "#334155"};">
        <span>${tile.nama}</span>
        <span>${tile.namaGrup || tile.tipe}</span>
      </div>
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
  }

  _renderLog(logArray) {
    this.logList.innerHTML = "";
    for (const item of logArray.slice(0, 25)) {
      const div = document.createElement("div");
      div.className = `log-entry ${item.tipe || "info"}`;
      div.textContent = item.teks;
      this.logList.appendChild(div);
    }
  }

  _renderTombolAksi(state, currentPlayer) {
    const isMyTurn =
      !this.isMultiplayer ||
      (currentPlayer && currentPlayer.id === this.myPlayerId);

    if (
      !currentPlayer ||
      this.isAnimating ||
      state.fase === "GAME_OVER" ||
      !isMyTurn
    ) {
      this.btnRoll.disabled = true;
      this.btnJailPay.disabled = true;
      this.btnBuy.disabled = true;
      this.btnSkip.disabled = true;
      this.btnEnd.disabled = true;

      if (currentPlayer && !isMyTurn && state.fase !== "GAME_OVER") {
        this.statusBanner.textContent =
          state.fase === "WAIT_CARD_CONFIRM"
            ? `Menunggu ${currentPlayer.nama} membaca kartu dan menekan "OK"...`
            : `Menunggu giliran ${currentPlayer.nama} beraksi...`;
      }
      return;
    }

    const tile = BOARD_TILES[currentPlayer.posisi];

    if (state.fase === "WAIT_ROLL") {
      this.btnRoll.disabled = false;
      this.btnJailPay.disabled = !(
        currentPlayer.diPenjara && currentPlayer.uang >= 100000
      );
      this.btnBuy.disabled = true;
      this.btnSkip.disabled = true;
      this.btnEnd.disabled = true;

      this.statusBanner.textContent = currentPlayer.diPenjara
        ? `Giliran Anda (${currentPlayer.nama} di Lapas): Lempar dadu kembar atau Tebus Rp 100.000.`
        : `Giliran Anda (${currentPlayer.nama}): Silakan tekan "Lempar Dadu".`;
    } else if (state.fase === "WAIT_CARD_CONFIRM") {
      this.btnRoll.disabled = true;
      this.btnJailPay.disabled = true;
      this.btnBuy.disabled = true;
      this.btnSkip.disabled = true;
      this.btnEnd.disabled = true;

      this.statusBanner.textContent = `${currentPlayer.nama}: Silakan baca kartu di layar lalu tekan "OK, Jalankan Efek".`;
    } else if (state.fase === "WAIT_BUY_DECISION") {
      this.btnRoll.disabled = true;
      this.btnJailPay.disabled = true;
      this.btnBuy.disabled = currentPlayer.uang < (tile.harga || 0);
      this.btnSkip.disabled = false;
      this.btnEnd.disabled = true;

      this.btnBuy.textContent = `Beli Tanah (${formatRupiah(tile.harga || 0)})`;
      this.statusBanner.textContent = `${currentPlayer.nama} di ${tile.nama}: Beli seharga ${formatRupiah(tile.harga || 0)} atau Tidak Jadi?`;
    } else if (state.fase === "WAIT_END_TURN") {
      this.btnRoll.disabled = true;
      this.btnJailPay.disabled = true;
      this.btnBuy.disabled = true;
      this.btnSkip.disabled = true;
      this.btnEnd.disabled = false;

      this.btnBuy.textContent = "Beli Tanah";
      this.statusBanner.textContent = `${currentPlayer.nama}: Anda bisa membangun Rumah/Hotel di panel kiri, lalu tekan "Akhiri Giliran".`;
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
