// Modul Sintesis Audio Prosedural (Web Audio API Murni - Tanpa File Eksternal)
// Mencakup:
// - Musik Latar Looping Gamelan Pentatonik (Laras Slendro: Saron, Bonang, Kempul, Gong Ageng)
// - SFX: Dadu, Langkah Token, Uang Masuk, Sirine + Besi Lapas, 4 Jenis Bencana (Noise + Filter),
//   Notifikasi "Eh" Pungli (Dua Nada Turun), Beli Tanah, Kartu Takdir/Musibah, Menang, dan Bangkrut.
// - Kontrol Mute Music & Mute SFX terpisah + inisialisasi setelah klik pertama pemain.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.noiseBuffer = null;

    this.musicMuted = false;
    this.sfxMuted = false;
    this.musicVolume = 0.28;
    this.sfxVolume = 0.65;

    this.isPlayingMusic = false;
    this.stepIndex = 0;
    this.musicTimer = null;

    // Frekuensi nada Laras Slendro (aproksimasi pentatonik Nusantara dalam Hz)
    // 1 (Panunggul), 2 (Gulu), 3 (Dada), 5 (Lima), 6 (Nem), 1' (Panunggul Tinggi)
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
      N3_HIGH: 686.0
    };

    // Pola melodi balungan Saron (16 ketuk = 1 gatra lengkap)
    this.balunganPattern = [
      'N2', 'N3', 'N2', 'N1',
      'N2', 'N3', 'N5', 'N6',
      'N1_HIGH', 'N6', 'N5', 'N3',
      'N5', 'N3', 'N2', 'N1'
    ];

    // Pola kotekan Bonang (off-beat mengisi sela ketukan)
    this.bonangPattern = [
      'N5', 'N6', 'N5', 'N3',
      'N6', 'N1_HIGH', 'N2_HIGH', 'N1_HIGH',
      'N3_HIGH', 'N2_HIGH', 'N1_HIGH', 'N6',
      'N1_HIGH', 'N6', 'N5', 'N3'
    ];

    this._pasangAutoUnlock();
  }

  // Memastikan AudioContext baru dimulai/dilanjutkan setelah klik/ketukan pertama pemain (aturan browser)
  _pasangAutoUnlock() {
    const unlock = () => {
      this.ensureContext();
      if (!this.isPlayingMusic) {
        this.startMusic();
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
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

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Membuat buffer white noise 2 detik satu kali untuk dipakai ulang oleh efek hujan/gempa/ledakan/abu
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

  // Kontrol Mute Musik Latar
  setMusicMuted(muted) {
    this.musicMuted = Boolean(muted);
    this.ensureContext();
    const now = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(this.musicMuted ? 0 : this.musicVolume, now, 0.04);
    return this.musicMuted;
  }

  toggleMusicMute() {
    return this.setMusicMuted(!this.musicMuted);
  }

  // Kontrol Mute Efek Suara (SFX)
  setSfxMuted(muted) {
    this.sfxMuted = Boolean(muted);
    this.ensureContext();
    const now = this.ctx.currentTime;
    this.sfxGain.gain.setTargetAtTime(this.sfxMuted ? 0 : this.sfxVolume, now, 0.02);
    return this.sfxMuted;
  }

  toggleSfxMute() {
    return this.setSfxMuted(!this.sfxMuted);
  }

  // Mengatur volume master (0.0 - 1.0)
  setMasterVolume(val) {
    this.ensureContext();
    const clamped = Math.max(0, Math.min(1, Number(val)));
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.03);
  }

  // =========================================================================
  // 1. MUSIK LATAR LOOPING GAMELAN SLENDRO
  // =========================================================================
  startMusic() {
    this.ensureContext();
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    this.stepIndex = 0;

    // Tempo santai khas gamelan suasana warga (260ms per sub-ketukan)
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || this.musicMuted) return;
      this._mainkanKetukanGamelan(this.stepIndex);
      this.stepIndex = (this.stepIndex + 1) % 16;
    }, 260);
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  _mainkanKetukanGamelan(step) {
    const now = this.ctx.currentTime;

    // 1. Balungan Saron pada ketukan genap (atau mengalir setiap ketuk dengan aksen)
    const saronNoteKey = this.balunganPattern[step];
    const saronFreq = this.slendro[saronNoteKey] || 261.63;
    const isStrongBeat = step % 2 === 0;
    this._synthMetallophone(saronFreq, now, isStrongBeat ? 0.55 : 0.35, isStrongBeat ? 0.22 : 0.12, this.musicGain);

    // 2. Kotekan Bonang (oktaf atas, memberi warna keramaian khas Nusantara)
    if (step % 2 === 1 || step === 6 || step === 14) {
      const bonangKey = this.bonangPattern[step];
      const bonangFreq = (this.slendro[bonangKey] || 523.25) * 1.0;
      this._synthMetallophone(bonangFreq, now + 0.12, 0.28, 0.09, this.musicGain);
    }

    // 3. Kempul pada ketukan ke-4, 8, dan 12
    if (step === 4) {
      this._synthGong(this.slendro.KEMPUL_3, now, 1.1, 0.2, this.musicGain);
    } else if (step === 8) {
      this._synthGong(this.slendro.KEMPUL_5, now, 1.1, 0.2, this.musicGain);
    } else if (step === 12) {
      this._synthGong(this.slendro.KEMPUL_6, now, 1.1, 0.2, this.musicGain);
    }

    // 4. Gong Ageng pada awal/akhir siklus 16 ketukan (step 0)
    if (step === 0) {
      this._synthGong(this.slendro.GONG, now, 2.4, 0.34, this.musicGain);
    }
  }

  // Sintesis bilah perunggu Saron / Bonang (kombinasi gelombang fundamental + overtone inharmonik)
  _synthMetallophone(freq, startTime, duration, amp, destNode) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const partialGain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    // Overtone metalik khas bilah gamelan perunggu (~2.76x frekuensi dasar)
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.76, startTime);

    partialGain.gain.setValueAtTime(amp * 0.35, startTime);
    partialGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.35);

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

  // Sintesis Gong Ageng & Kempul dengan vibrato ombak halus (ombak gamelan)
  _synthGong(freq, startTime, duration, amp, destNode) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    // Efek "ombak" (beating) dengan sedikit detune
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq + 1.8, startTime);

    osc3.type = 'triangle';
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
  // 2. EFEK SUARA (SFX) PERMAINAN
  // =========================================================================

  // SFX Dadu Menggelinding (pantulan beruntun di atas papan)
  playDiceRoll() {
    this.ensureContext();
    if (this.sfxMuted) return;

    const now = this.ctx.currentTime;
    const hitTimes = [0, 0.08, 0.16, 0.25, 0.36, 0.48, 0.59];

    hitTimes.forEach((offset, idx) => {
      const t = now + offset;
      const decay = 0.045;
      const vol = 0.45 * Math.pow(0.84, idx);

      // Klik resonansi dadu
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650 + Math.random() * 550, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + decay);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + decay + 0.01);

      // Sedikit noise gesekan dadu
      this._playFilteredNoise(t, 0.03, 'bandpass', 1400 + idx * 120, 3.0, vol * 0.6);
    });
  }

  // SFX Langkah Token melompat per petak
  playStep(stepNumber = 0) {
    this.ensureContext();
    if (this.sfxMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Nada naik sedikit tiap langkah agar terdengar hidup
    const baseFreq = 280 + (stepNumber % 8) * 28;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, now + 0.065);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // SFX Uang Masuk (Bansos cair, dapat uang kartu, atau terima sewa)
  playMoneyIn() {
    this.ensureContext();
    if (this.sfxMuted) return;

    const now = this.ctx.currentTime;
    const notes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6 - E6 - G6 - C7
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.065;
      this._synthMetallophone(freq, t, 0.38, 0.28, this.sfxGain);
    });
  }

  // SFX Bayar Tagihan / Pajak / Sewa
  playMoneyOut() {
    this.ensureContext();
    if (this.sfxMuted) return;

    const now = this.ctx.currentTime;
    const notes = [440, 349.23];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  // SFX Notifikasi "Eh?!" untuk Pungli (dua nada turun satir dengan formant sengau)
  playPungli() {
    this.ensureContext();
    if (this.sfxMuted) return;

    const now = this.ctx.currentTime;
    const notes = [
      { startFreq: 392.0, endFreq: 349.23, offset: 0, dur: 0.18 },     // "Eh-"
      { startFreq: 311.13, endFreq: 233.08, offset: 0.21, dur: 0.34 }  // "-uh?!" (turun satir)
    ];

    notes.forEach((n) => {
      const t = now + n.offset;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(n.endFreq, t + n.dur);

      // Filter bandpass vokal "eh"
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1150, t);
      filter.Q.setValueAtTime(3.5, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.45, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + n.dur + 0.02);
    });
  }

  // SFX Masuk Lapas: Sirine meraung + Besi sel berdentang keras
  playJailSirenAndClang() {
    this.ensureContext();
    if (this.sfxMuted) return;

    const now = this.ctx.currentTime;

    // 1. Sirine dua siklus (0.0s - 1.15s)
    const sirenOsc = this.ctx.createOscillator();
    const sirenGain = this.ctx.createGain();
    sirenOsc.type = 'triangle';

    sirenOsc.frequency.setValueAtTime(620, now);
    sirenOsc.frequency.linearRampToValueAtTime(960, now + 0.28);
    sirenOsc.frequency.linearRampToValueAtTime(620, now + 0.56);
    sirenOsc.frequency.linearRampToValueAtTime(960, now + 0.84);
    sirenOsc.frequency.linearRampToValueAtTime(620, now + 1.12);

    sirenGain.gain.setValueAtTime(0.001, now);
    sirenGain.gain.linearRampToValueAtTime(0.32, now + 0.04);
    sirenGain.gain.setValueAtTime(0.32, now + 1.0);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

    sirenOsc.connect(sirenGain);
    sirenGain.connect(this.sfxGain);
    sirenOsc.start(now);
    sirenOsc.stop(now + 1.18);

    // 2. Dentang Pintu Besi Sel Menutup (pada t + 1.15s saat pintu sel menutup)
    this.playJailDoorClang(1.15);
  }

  playJailDoorClang(delaySeconds = 0) {
    this.ensureContext();
    if (this.sfxMuted) return;

    const clangTime = this.ctx.currentTime + delaySeconds;
    // Frekuensi inharmonik besi beradu
    const metalFreqs = [240, 385, 590, 870, 1340];
    metalFreqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(f, clangTime);

      const dur = 0.45 - idx * 0.05;
      gain.gain.setValueAtTime(0.18, clangTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, clangTime + dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(clangTime);
      osc.stop(clangTime + dur + 0.02);
    });

    // Hentakan noise pintu besi
    this._playFilteredNoise(clangTime, 0.22, 'bandpass', 950, 2.0, 0.55);
  }

  // SFX Bencana Alam (Noise + Filter sesuai jenis: banjir, gempa, kebakaran, longsor)
  playDisaster(jenisBencana = 'gempa') {
    this.ensureContext();
    if (this.sfxMuted) return;

    const now = this.ctx.currentTime;

    if (jenisBencana === 'banjir') {
      // Deras hujan & terjangan air meluap (bandpass noise sweeping)
      this._playFilteredNoiseSweep(now, 1.35, 'bandpass', 450, 1600, 1.8, 0.55);
      // Efek gelembung air rendah
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.5);
      osc.frequency.exponentialRampToValueAtTime(190, now + 1.1);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 1.2);
      return;
    }

    if (jenisBencana === 'kebakaran') {
      // Dentuman ledakan awal gardu + desis api membara
      this._playFilteredNoise(now, 0.45, 'lowpass', 220, 1.0, 0.75);
      this._playFilteredNoiseSweep(now + 0.1, 1.25, 'highpass', 900, 2400, 1.2, 0.42);
      // Letupan percikan api
      for (let i = 0; i < 6; i++) {
        this._playFilteredNoise(
          now + 0.15 + i * 0.16,
          0.06,
          'bandpass',
          1800 + Math.random() * 1200,
          4.0,
          0.35
        );
      }
      return;
    }

    if (jenisBencana === 'longsor') {
      // Gemuruh tanah & batu jatuh dari tebing
      this._playFilteredNoiseSweep(now, 1.3, 'lowpass', 680, 140, 1.5, 0.65);
      const hitOffsets = [0.05, 0.24, 0.48, 0.72];
      hitOffsets.forEach((off) => {
        const t = now + off;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
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

    // Default: Gempa Bumi (lowpass noise + sub-bass rumble kuat)
    this._playFilteredNoise(now, 1.4, 'lowpass', 130, 1.2, 0.75);
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(58, now);
    subOsc.frequency.linearRampToValueAtTime(42, now + 1.3);

    subGain.gain.setValueAtTime(0.45, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 1.4);
  }

  // SFX Beli Tanah / Bangun Rumah Naik dari Bawah Tanah
  playBuyOrBuild() {
    this.ensureContext();
    if (this.sfxMuted) return;

    const now = this.ctx.currentTime;
    // Ketukan konstruksi diikuti nada naik Slendro
    const notes = [this.slendro.N1, this.slendro.N3, this.slendro.N5, this.slendro.N1_HIGH];
    notes.forEach((freq, idx) => {
      this._synthMetallophone(freq, now + idx * 0.08, 0.35, 0.26, this.sfxGain);
    });
  }

  // SFX Kartu Takdir Bagus
  playGoodCard() {
    this.ensureContext();
    if (this.sfxMuted) return;

    const now = this.ctx.currentTime;
    const chord = [
      this.slendro.N1,
      this.slendro.N3,
      this.slendro.N5,
      this.slendro.N6,
      this.slendro.N1_HIGH,
      this.slendro.N3_HIGH
    ];
    chord.forEach((freq, idx) => {
      this._synthMetallophone(freq, now + idx * 0.06, 0.65, 0.25, this.sfxGain);
    });
  }

  // SFX Kartu Musibah
  playBadCard() {
    this.ensureContext();
    if (this.sfxMuted) return;

    const now = this.ctx.currentTime;
    const notes = [370.0, 349.23, 261.63];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  // SFX Kekalahan / Bangkrut (Token tumbang & hancur jadi abu)
  playBankrupt() {
    this.ensureContext();
    if (this.sfxMuted) return;

    const now = this.ctx.currentTime;
    // Nada turun suram + Gong rendah + Desir partikel abu
    const notes = [343.0, 298.0, 261.63, 196.0];
    notes.forEach((freq, idx) => {
      this._synthMetallophone(freq, now + idx * 0.16, 0.55, 0.3, this.sfxGain);
    });

    this._synthGong(this.slendro.GONG, now + 0.45, 2.2, 0.45, this.sfxGain);
    this._playFilteredNoiseSweep(now + 0.4, 0.9, 'bandpass', 1200, 300, 1.5, 0.35);
  }

  // SFX Kemenangan Akhir Permainan (Fanfare Gamelan Megah)
  playVictory() {
    this.ensureContext();
    if (this.sfxMuted) return;

    const now = this.ctx.currentTime;
    const melody = [
      { f: this.slendro.N1, t: 0 },
      { f: this.slendro.N2, t: 0.11 },
      { f: this.slendro.N3, t: 0.22 },
      { f: this.slendro.N5, t: 0.33 },
      { f: this.slendro.N6, t: 0.44 },
      { f: this.slendro.N1_HIGH, t: 0.58 },
      { f: this.slendro.N3_HIGH, t: 0.75 }
    ];

    melody.forEach((n) => {
      this._synthMetallophone(n.f, now + n.t, 0.85, 0.32, this.sfxGain);
    });
    this._synthGong(this.slendro.KEMPUL_1, now + 0.58, 1.8, 0.35, this.sfxGain);
    this._synthGong(this.slendro.GONG, now + 0.75, 2.8, 0.45, this.sfxGain);
  }

  // Helper memutar noise dengan BiquadFilter statis
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

  // Helper memutar noise dengan sapuan frekuensi (filter sweep)
  _playFilteredNoiseSweep(startTime, duration, filterType, startFreq, endFreq, Q, amp) {
    if (!this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(startFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
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