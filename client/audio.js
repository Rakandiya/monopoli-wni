// Modul Audio Sintesis Web Audio API + Suara Narator Bahasa Indonesia (Web Speech API)
// Menambahkan voice lines satir kreatif untuk Pungli (+ bunyi peluit "Prittt!"), Masuk Lapas,
// Bencana Alam, Bansos, Beli Tanah, Kartu Takdir/Musibah, Sewa Lawan, dan Bangkrut.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.noiseBuffer = null;

    this.musicMuted = false;
    this.sfxMuted = false;
    this.musicVolume = 0.24;
    this.sfxVolume = 0.7;

    this.isPlayingMusic = false;
    this.stepIndex = 0;
    this.musicTimer = null;

    // Daftar kalimat satir kreatif Bahasa Indonesia untuk Web Speech API
    this.voiceLines = {
      pungli: [
        "Prittt! Permisi warga, ada uang keamanan lingkungan nih, mohon pengertiannya ya!",
        "Eh, mau lewat jalur cepat? Siapkan uang rokok buat oknum petugas dulu dong!",
        "Waduh, parkir lima menit kena ketok palu oknum! Sabar ya warga plus enam dua!",
      ],
      jail: [
        "Wiu wiu! Terciduk razia gabungan! Silakan menginap dan renungi nasib di Lapas Cipinang!",
        "Jangan coba-coba pakai orang dalam! Masuk sel Lapas Cipinang lewat pintu depan sekarang!",
        "Digelandang ke Lapas Cipinang! Nikmati nasi cadong sampai dapat dadu kembar!",
      ],
      banjir: [
        "Awas! Banjir kiriman tahunan dan gelombang air datang! Angkat jemuran dan amankan kulkas!",
        "Waduh, saluran mampet! Air bah meluap merendam kavling warga!",
      ],
      gempa: [
        "Lindungi kepala! Gempa bumi tektonik mengguncang papan Nusantara!",
        "Guncangan gempa kuat! Pegangan tiang listrik warga!",
      ],
      kebakaran: [
        "Awas gardu meledak! Kebakaran korsleting listrik melanda pemukiman!",
        "Api berkobar! Panggil pemadam kebakaran sebelum merembet ke tetangga!",
      ],
      longsor: [
        "Awas tebing runtuh! Tanah longsor menerjang petak di bawahnya!",
      ],
      bansos: [
        "Alhamdulillah! Antrean lancar, dana Bansos dua ratus ribu rupiah cair utuh tanpa potongan!",
        "Rezeki warga patuh! Lewat garis Start, Bansos cair langsung masuk kantong!",
      ],
      buy: [
        "Sah! Sertifikat tanah hak milik resmi diteken, semoga bebas sengketa!",
        "Mantap! Aset properti bertambah, siap-siap tarik uang sewa dari tetangga!",
      ],
      upgrade: [
        "Tukang bangunan beraksi! Properti naik kelas, tarif sewa makin pedas!",
        "Pembangunan selesai! Makin megah, tetangga yang mampir dijamin nangis bayar sewa!",
      ],
      rent: [
        "Permisi numpang lewat! Jangan lupa bayar tagihan sewa tanah tetangga ya!",
        "Waduh, mampir di tanah sultan! Dompet langsung terkuras bayar uang sewa!",
      ],
      bankrupt: [
        "Ya ampun! Utang menumpuk, aset habis disita, warga resmi bangkrut dan gulung tikar!",
        "Dompet kering kerontang! Selamat tinggal kerasnya kehidupan finansial plus enam dua!",
      ],
      takdir: [
        "Kartu Takdir terbuka! Semoga angin keberuntungan berpihak pada warga!",
      ],
      musibah: [
        "Astaga, Kartu Musibah! Siapkan mental dan dompet menghadapi ujian birokrasi!",
      ],
      victory: [
        "Selamat! Anda resmi dinobatkan sebagai warga negara paling tahan banting dan makmur se-Nusantara!",
      ],
    };

    // Frekuensi nada Laras Slendro
    this.slendro = {
      GONG: 65.41,
      KEMPUL_1: 130.81,
      KEMPUL_3: 171.5,
      KEMPUL_5: 200.0,
      KEMPUL_6: 230.0,
      N1: 261.63,
      N2: 298.0,
      N3: 343.0,
      N5: 400.0,
      N6: 460.0,
      N1_HIGH: 523.25,
      N2_HIGH: 596.0,
      N3_HIGH: 686.0,
    };

    this.balunganPattern = [
      "N2",
      "N3",
      "N2",
      "N1",
      "N2",
      "N3",
      "N5",
      "N6",
      "N1_HIGH",
      "N6",
      "N5",
      "N3",
      "N5",
      "N3",
      "N2",
      "N1",
    ];

    this.bonangPattern = [
      "N5",
      "N6",
      "N5",
      "N3",
      "N6",
      "N1_HIGH",
      "N2_HIGH",
      "N1_HIGH",
      "N3_HIGH",
      "N2_HIGH",
      "N1_HIGH",
      "N6",
      "N1_HIGH",
      "N6",
      "N5",
      "N3",
    ];

    this._pasangAutoUnlock();
  }

  _pasangAutoUnlock() {
    const unlock = () => {
      this.ensureContext();
      if (!this.isPlayingMusic) this.startMusic();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicMuted ? 0 : this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxMuted ? 0 : this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this._buatNoiseBuffer();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  _buatNoiseBuffer() {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2.0;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  // =========================================================================
  // NARATOR SUARA BAHASA INDONESIA KREATIF (WEB SPEECH API)
  // =========================================================================
  speak(teks, options = {}) {
    if (this.sfxMuted) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    try {
      // Hentikan ucapan sebelumnya agar selalu responsif terhadap event terbaru
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(teks);
      utter.lang = "id-ID";
      utter.rate = options.rate ?? 1.08;
      utter.pitch = options.pitch ?? 1.05;
      utter.volume = Math.min(1, (this.masterGain?.gain?.value ?? 0.85) * 1.0);

      // Cari voice Bahasa Indonesia jika tersedia di browser/OS
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().includes("id") ||
          v.name.toLowerCase().includes("indones"),
      );
      if (idVoice) {
        utter.voice = idVoice;
      }

      window.speechSynthesis.speak(utter);
    } catch (_e) {
      // Abaikan jika browser membatasi speechSynthesis
    }
  }

  speakEvent(category, customText = null) {
    if (this.sfxMuted) return;
    if (customText) {
      this.speak(customText);
      return;
    }
    const list = this.voiceLines[category];
    if (!list || list.length === 0) return;
    const chosen = list[Math.floor(Math.random() * list.length)];
    this.speak(chosen);
  }

  setMusicMuted(muted) {
    this.musicMuted = Boolean(muted);
    this.ensureContext();
    this.musicGain.gain.setTargetAtTime(
      this.musicMuted ? 0 : this.musicVolume,
      this.ctx.currentTime,
      0.04,
    );
    return this.musicMuted;
  }

  toggleMusicMute() {
    return this.setMusicMuted(!this.musicMuted);
  }

  setSfxMuted(muted) {
    this.sfxMuted = Boolean(muted);
    this.ensureContext();
    this.sfxGain.gain.setTargetAtTime(
      this.sfxMuted ? 0 : this.sfxVolume,
      this.ctx.currentTime,
      0.02,
    );
    if (
      this.sfxMuted &&
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }
    return this.sfxMuted;
  }

  toggleSfxMute() {
    return this.setSfxMuted(!this.sfxMuted);
  }

  setMasterVolume(val) {
    this.ensureContext();
    const clamped = Math.max(0, Math.min(1, Number(val)));
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.03);
  }

  // =========================================================================
  // MUSIK LATAR GAMELAN SLENDRO
  // =========================================================================
  startMusic() {
    this.ensureContext();
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    this.stepIndex = 0;

    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== "running" || this.musicMuted) return;
      this._mainkanKetukanGamelan(this.stepIndex);
      this.stepIndex = (this.stepIndex + 1) % 16;
    }, 260);
  }

  _mainkanKetukanGamelan(step) {
    const now = this.ctx.currentTime;
    const saronNoteKey = this.balunganPattern[step];
    const saronFreq = this.slendro[saronNoteKey] || 261.63;
    const isStrongBeat = step % 2 === 0;
    this._synthMetallophone(
      saronFreq,
      now,
      isStrongBeat ? 0.55 : 0.35,
      isStrongBeat ? 0.2 : 0.11,
      this.musicGain,
    );

    if (step % 2 === 1 || step === 6 || step === 14) {
      const bonangKey = this.bonangPattern[step];
      const bonangFreq = this.slendro[bonangKey] || 523.25;
      this._synthMetallophone(
        bonangFreq,
        now + 0.12,
        0.28,
        0.08,
        this.musicGain,
      );
    }

    if (step === 4)
      this._synthGong(this.slendro.KEMPUL_3, now, 1.1, 0.18, this.musicGain);
    else if (step === 8)
      this._synthGong(this.slendro.KEMPUL_5, now, 1.1, 0.18, this.musicGain);
    else if (step === 12)
      this._synthGong(this.slendro.KEMPUL_6, now, 1.1, 0.18, this.musicGain);

    if (step === 0)
      this._synthGong(this.slendro.GONG, now, 2.4, 0.3, this.musicGain);
  }

  _synthMetallophone(freq, startTime, duration, amp, destNode) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const partialGain = this.ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq * 2.76, startTime);

    partialGain.gain.setValueAtTime(amp * 0.35, startTime);
    partialGain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + duration * 0.35,
    );

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(amp, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(gain);
    osc2.connect(partialGain);
    partialGain.connect(gain);
    gain.connect(destNode);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.02);
    osc2.stop(startTime + duration + 0.02);
  }

  _synthGong(freq, startTime, duration, amp, destNode) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq + 1.8, startTime);
    osc3.type = "triangle";
    osc3.frequency.setValueAtTime(freq * 1.5, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(amp, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    osc3.connect(gain);
    gain.connect(destNode);

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);
    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
    osc3.stop(startTime + duration + 0.05);
  }

  // =========================================================================
  // EFEK SUARA (SFX) + NARASI KREATIF
  // =========================================================================
  playDiceRoll() {
    this.ensureContext();
    if (this.sfxMuted) return;
    const now = this.ctx.currentTime;
    const hitTimes = [0, 0.08, 0.16, 0.25, 0.36, 0.48, 0.59];

    hitTimes.forEach((offset, idx) => {
      const t = now + offset;
      const decay = 0.045;
      const vol = 0.45 * Math.pow(0.84, idx);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(650 + Math.random() * 550, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + decay);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + decay + 0.01);

      this._playFilteredNoise(
        t,
        0.03,
        "bandpass",
        1400 + idx * 120,
        3.0,
        vol * 0.6,
      );
    });
  }

  playStep(stepNumber = 0) {
    this.ensureContext();
    if (this.sfxMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = 280 + (stepNumber % 8) * 28;
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, now + 0.065);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playMoneyIn() {
    this.ensureContext();
    if (this.sfxMuted) return;
    const now = this.ctx.currentTime;
    [1046.5, 1318.5, 1567.98, 2093.0].forEach((freq, idx) => {
      this._synthMetallophone(
        freq,
        now + idx * 0.065,
        0.38,
        0.28,
        this.sfxGain,
      );
    });
  }

  playMoneyOut() {
    this.ensureContext();
    if (this.sfxMuted) return;
    const now = this.ctx.currentTime;
    [440, 349.23].forEach((freq, idx) => {
      const t = now + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  // SFX Pungli Kreatif: Bunyi Peluit Tukang Parkir/Oknum ("Prittt!") + Nada Turun + Suara Narator
  playPungli(customVoiceText = null) {
    this.ensureContext();
    if (this.sfxMuted) return;
    const now = this.ctx.currentTime;

    // 1. Bunyi Peluit "PRITTT!" (Modulasi FM frekuensi tinggi khas peluit)
    const whistleOsc = this.ctx.createOscillator();
    const trillOsc = this.ctx.createOscillator();
    const trillGain = this.ctx.createGain();
    const whistleGain = this.ctx.createGain();

    whistleOsc.type = "sine";
    whistleOsc.frequency.setValueAtTime(2850, now);

    trillOsc.type = "square";
    trillOsc.frequency.setValueAtTime(42, now); // Getaran biji peluit
    trillGain.gain.setValueAtTime(180, now);

    whistleGain.gain.setValueAtTime(0.001, now);
    whistleGain.gain.linearRampToValueAtTime(0.32, now + 0.02);
    whistleGain.gain.setValueAtTime(0.32, now + 0.26);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    trillOsc.connect(trillGain);
    trillGain.connect(whistleOsc.frequency);
    whistleOsc.connect(whistleGain);
    whistleGain.connect(this.sfxGain);

    trillOsc.start(now);
    whistleOsc.start(now);
    trillOsc.stop(now + 0.35);
    whistleOsc.stop(now + 0.35);

    // 2. Dua nada turun satir ("Eh-uh?!") setelah peluit
    const notes = [
      { startFreq: 392.0, endFreq: 349.23, offset: 0.36, dur: 0.18 },
      { startFreq: 311.13, endFreq: 233.08, offset: 0.56, dur: 0.32 },
    ];

    notes.forEach((n) => {
      const t = now + n.offset;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(n.startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(n.endFreq, t + n.dur);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1150, t);
      filter.Q.setValueAtTime(3.5, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.42, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + n.dur + 0.02);
    });

    // 3. Ucapkan kalimat satir Pungli
    this.speakEvent("pungli", customVoiceText);
  }

  // SFX Masuk Lapas: Sirine + Besi Sel Berdentang + Narator "Masuk Penjara!"
  playJailSirenAndClang() {
    this.ensureContext();
    if (this.sfxMuted) return;
    const now = this.ctx.currentTime;

    const sirenOsc = this.ctx.createOscillator();
    const sirenGain = this.ctx.createGain();
    sirenOsc.type = "triangle";

    sirenOsc.frequency.setValueAtTime(620, now);
    sirenOsc.frequency.linearRampToValueAtTime(960, now + 0.3);
    sirenOsc.frequency.linearRampToValueAtTime(620, now + 0.6);
    sirenOsc.frequency.linearRampToValueAtTime(960, now + 0.9);
    sirenOsc.frequency.linearRampToValueAtTime(620, now + 1.2);

    sirenGain.gain.setValueAtTime(0.001, now);
    sirenGain.gain.linearRampToValueAtTime(0.32, now + 0.04);
    sirenGain.gain.setValueAtTime(0.32, now + 1.1);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    sirenOsc.connect(sirenGain);
    sirenGain.connect(this.sfxGain);
    sirenOsc.start(now);
    sirenOsc.stop(now + 1.28);

    // Dentang pintu besi sel tepat saat pion selesai berjalan masuk lewat pintu depan (t + 1.45s)
    this.playJailDoorClang(1.45);
    this.speakEvent("jail");
  }

  playJailDoorClang(delaySeconds = 0) {
    this.ensureContext();
    if (this.sfxMuted) return;
    const clangTime = this.ctx.currentTime + delaySeconds;
    [240, 385, 590, 870, 1340].forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? "square" : "sawtooth";
      osc.frequency.setValueAtTime(f, clangTime);

      const dur = 0.45 - idx * 0.05;
      gain.gain.setValueAtTime(0.2, clangTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, clangTime + dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(clangTime);
      osc.stop(clangTime + dur + 0.02);
    });
    this._playFilteredNoise(clangTime, 0.22, "bandpass", 950, 2.0, 0.55);
  }

  playDisaster(jenisBencana = "gempa") {
    this.ensureContext();
    if (this.sfxMuted) return;
    const now = this.ctx.currentTime;

    this.speakEvent(jenisBencana);

    if (jenisBencana === "banjir") {
      this._playFilteredNoiseSweep(now, 1.45, "bandpass", 450, 1600, 1.8, 0.55);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.5);
      osc.frequency.exponentialRampToValueAtTime(190, now + 1.2);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 1.3);
      return;
    }

    if (jenisBencana === "kebakaran") {
      this._playFilteredNoise(now, 0.45, "lowpass", 220, 1.0, 0.75);
      this._playFilteredNoiseSweep(
        now + 0.1,
        1.3,
        "highpass",
        900,
        2400,
        1.2,
        0.42,
      );
      for (let i = 0; i < 6; i++) {
        this._playFilteredNoise(
          now + 0.15 + i * 0.16,
          0.06,
          "bandpass",
          1800 + Math.random() * 1200,
          4.0,
          0.35,
        );
      }
      return;
    }

    if (jenisBencana === "longsor") {
      this._playFilteredNoiseSweep(now, 1.35, "lowpass", 680, 140, 1.5, 0.65);
      [0.05, 0.24, 0.48, 0.72].forEach((off) => {
        const t = now + off;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(135, t);
        osc.frequency.exponentialRampToValueAtTime(42, t + 0.22);
        g.gain.setValueAtTime(0.42, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.25);
      });
      return;
    }

    this._playFilteredNoise(now, 1.45, "lowpass", 130, 1.2, 0.75);
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = "sawtooth";
    subOsc.frequency.setValueAtTime(58, now);
    subOsc.frequency.linearRampToValueAtTime(42, now + 1.35);
    subGain.gain.setValueAtTime(0.45, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 1.45);
  }

  playBuyOrBuild(isUpgrade = false) {
    this.ensureContext();
    if (this.sfxMuted) return;
    const now = this.ctx.currentTime;
    [
      this.slendro.N1,
      this.slendro.N3,
      this.slendro.N5,
      this.slendro.N1_HIGH,
    ].forEach((freq, idx) => {
      this._synthMetallophone(freq, now + idx * 0.08, 0.35, 0.26, this.sfxGain);
    });
    this.speakEvent(isUpgrade ? "upgrade" : "buy");
  }

  playGoodCard() {
    this.ensureContext();
    if (this.sfxMuted) return;
    const now = this.ctx.currentTime;
    [
      this.slendro.N1,
      this.slendro.N3,
      this.slendro.N5,
      this.slendro.N6,
      this.slendro.N1_HIGH,
      this.slendro.N3_HIGH,
    ].forEach((freq, idx) => {
      this._synthMetallophone(freq, now + idx * 0.06, 0.65, 0.25, this.sfxGain);
    });
    this.speakEvent("takdir");
  }

  playBadCard() {
    this.ensureContext();
    if (this.sfxMuted) return;
    const now = this.ctx.currentTime;
    [370.0, 349.23, 261.63].forEach((freq, idx) => {
      const t = now + idx * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
    this.speakEvent("musibah");
  }

  playBankrupt() {
    this.ensureContext();
    if (this.sfxMuted) return;
    const now = this.ctx.currentTime;
    [343.0, 298.0, 261.63, 196.0].forEach((freq, idx) => {
      this._synthMetallophone(freq, now + idx * 0.16, 0.55, 0.3, this.sfxGain);
    });
    this._synthGong(this.slendro.GONG, now + 0.45, 2.2, 0.45, this.sfxGain);
    this._playFilteredNoiseSweep(
      now + 0.4,
      0.9,
      "bandpass",
      1200,
      300,
      1.5,
      0.35,
    );
    this.speakEvent("bankrupt");
  }

  playVictory() {
    this.ensureContext();
    if (this.sfxMuted) return;
    const now = this.ctx.currentTime;
    [
      { f: this.slendro.N1, t: 0 },
      { f: this.slendro.N2, t: 0.11 },
      { f: this.slendro.N3, t: 0.22 },
      { f: this.slendro.N5, t: 0.33 },
      { f: this.slendro.N6, t: 0.44 },
      { f: this.slendro.N1_HIGH, t: 0.58 },
      { f: this.slendro.N3_HIGH, t: 0.75 },
    ].forEach((n) => {
      this._synthMetallophone(n.f, now + n.t, 0.85, 0.32, this.sfxGain);
    });
    this._synthGong(this.slendro.KEMPUL_1, now + 0.58, 1.8, 0.35, this.sfxGain);
    this._synthGong(this.slendro.GONG, now + 0.75, 2.8, 0.45, this.sfxGain);
    this.speakEvent("victory");
  }

  _playFilteredNoise(startTime, duration, filterType, freq, Q, amp) {
    if (!this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, startTime);
    filter.Q.setValueAtTime(Q, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(amp, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    src.start(startTime);
    src.stop(startTime + duration + 0.02);
  }

  _playFilteredNoiseSweep(
    startTime,
    duration,
    filterType,
    startFreq,
    endFreq,
    Q,
    amp,
  ) {
    if (!this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(startFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFreq),
      startTime + duration,
    );
    filter.Q.setValueAtTime(Q, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(amp, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    src.start(startTime);
    src.stop(startTime + duration + 0.02);
  }
}
