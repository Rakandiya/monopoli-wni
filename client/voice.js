// Modul Voice Chat WebRTC Mesh (Maksimal 4 Pemain) + Deteksi Suara AnalyserNode (Milestone 5)
//
// CATATAN TEKNIS PENTING:
// 1. `navigator.mediaDevices.getUserMedia` WAJIB dijalankan pada origin aman (`http://localhost`
//    atau `https://`). Browser modern akan menolak akses mikrofon pada HTTP non-localhost.
// 2. Konfigurasi di bawah menggunakan server STUN publik (`stun:stun.l.google.com:19302`) untuk
//    menemukan alamat IP publik antar-peer. Untuk jaringan yang sangat ketat (Symmetric NAT /
//    Firewall Korporat / Operator Seluler ketat), server TURN (`turn:...`) wajib ditambahkan
//    ke dalam array `iceServers`.

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export class VoiceManager {
  constructor(networkClient, onStatusChange = null) {
    this.network = networkClient;
    this.onStatusChange = onStatusChange;

    this.myPlayerId = null;
    this.localStream = null;
    this.micMuted = false;
    this.micPermissionGranted = false;

    // Web Audio API untuk AnalyserNode (mendeteksi siapa yang sedang berbicara)
    this.audioCtx = null;
    this.localAnalyser = null;
    this.localDataArray = null;

    // Koneksi Mesh: peerPlayerId -> { pc, audioEl, analyser, dataArray }
    this.peers = new Map();

    // Status bicara dan mute per playerId: 'p1' | 'p2' | 'p3' | 'p4'
    this.speakingMap = new Map(); // playerId -> boolean
    this.remoteSpeakingMap = new Map(); // playerId -> boolean (fallback via socket)
    this.mutedMap = new Map(); // playerId -> boolean
    this.simulatedUntilMap = new Map(); // playerId -> timestamp ms (untuk pengujian tombol simulasi)

    this._lastLocalSpeakingSent = false;
  }

  _ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Inisialisasi mikrofon lokal dan bergabung ke WebRTC Mesh di dalam room
  async initAndJoinMesh(myPlayerId) {
    this.myPlayerId = myPlayerId;
    this.mutedMap.set(myPlayerId, this.micMuted);

    // Coba minta izin mikrofon jika belum ada stream lokal
    if (!this.localStream) {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(
            'API getUserMedia tidak tersedia. Pastikan Anda membuka dari localhost atau HTTPS.'
          );
        }

        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });

        this.micPermissionGranted = true;
        this._pasangAnalyserLokal(this.localStream);
        this._terapkanMuteKeTrackLokal();
        this.onStatusChange?.({
          ok: true,
          micMuted: this.micMuted,
          pesan: 'Mikrofon aktif (WebRTC Mesh siap).'
        });
      } catch (err) {
        this.micPermissionGranted = false;
        this.micMuted = true;
        this.mutedMap.set(myPlayerId, true);
        this.onStatusChange?.({
          ok: false,
          micMuted: true,
          pesan: `Mikrofon tidak aktif (${err.message || 'Izin ditolak'}). Anda tetap bisa mendengar pemain lain.`
        });
      }
    }

    // Umumkan ke room bahwa klien ini siap menerima/membuat koneksi WebRTC
    this.network.announceVoiceReady();
    this.network.sendVoiceState({
      micMuted: this.micMuted,
      speaking: false
    });
  }

  _pasangAnalyserLokal(stream) {
    const ctx = this._ensureAudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;
    source.connect(analyser);

    this.localAnalyser = analyser;
    this.localDataArray = new Uint8Array(analyser.frequencyBinCount);
  }

  _pasangAnalyserRemote(peerId, stream) {
    try {
      const ctx = this._ensureAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      const peerObj = this.peers.get(peerId);
      if (peerObj) {
        peerObj.analyser = analyser;
        peerObj.dataArray = new Uint8Array(analyser.frequencyBinCount);
      }
    } catch (_e) {
      // Jika browser membatasi MediaStreamSource sebelum gestur, fallback socket tetap bekerja
    }
  }

  // Dipanggil saat pemain lain mengirim 'webrtc-peer-ready' -> kita buat Offer ke peer tersebut
  async handlePeerReady({ fromPlayerId }) {
    if (!fromPlayerId || fromPlayerId === this.myPlayerId) return;

    const pc = this._getOrCreatePeerConnection(fromPlayerId);
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true
      });
      await pc.setLocalDescription(offer);
      this.network.sendVoiceSignal(fromPlayerId, {
        type: 'offer',
        sdp: pc.localDescription
      });
    } catch (err) {
      console.warn('[WebRTC] Gagal membuat Offer:', err);
    }
  }

  // Menangani sinyal masuk ('offer', 'answer', 'candidate') dari peer lain
  async handleSignal({ fromPlayerId, type, sdp, candidate }) {
    if (!fromPlayerId || fromPlayerId === this.myPlayerId) return;

    const pc = this._getOrCreatePeerConnection(fromPlayerId);

    try {
      if (type === 'offer' && sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.network.sendVoiceSignal(fromPlayerId, {
          type: 'answer',
          sdp: pc.localDescription
        });
      } else if (type === 'answer' && sdp) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
      } else if (type === 'candidate' && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.warn('[WebRTC] Gagal memproses sinyal:', err);
    }
  }

  handlePeerLeft({ playerId }) {
    this._closePeer(playerId);
    this.speakingMap.delete(playerId);
    this.remoteSpeakingMap.delete(playerId);
  }

  handleVoiceStateUpdate({ playerId, micMuted, speaking }) {
    if (!playerId) return;
    if (typeof micMuted === 'boolean') {
      this.mutedMap.set(playerId, micMuted);
    }
    if (playerId !== this.myPlayerId) {
      this.remoteSpeakingMap.set(playerId, Boolean(speaking && !micMuted));
    }
  }

  _getOrCreatePeerConnection(peerPlayerId) {
    if (this.peers.has(peerPlayerId)) {
      return this.peers.get(peerPlayerId).pc;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Tambahkan track mikrofon lokal jika tersedia
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    // Kirim kandidat ICE ke peer tujuan lewat Socket.io
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.network.sendVoiceSignal(peerPlayerId, {
          type: 'candidate',
          candidate: event.candidate
        });
      }
    };

    // Saat aliran audio dari peer lain diterima
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (!remoteStream) return;

      let peerObj = this.peers.get(peerPlayerId);
      if (!peerObj) return;

      if (!peerObj.audioEl) {
        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        audioEl.style.display = 'none';
        document.body.appendChild(audioEl);
        peerObj.audioEl = audioEl;
      }

      peerObj.audioEl.srcObject = remoteStream;
      peerObj.audioEl.play().catch(() => {});

      this._pasangAnalyserRemote(peerPlayerId, remoteStream);
    };

    this.peers.set(peerPlayerId, {
      pc,
      audioEl: null,
      analyser: null,
      dataArray: null
    });

    return pc;
  }

  _closePeer(peerPlayerId) {
    const peerObj = this.peers.get(peerPlayerId);
    if (!peerObj) return;

    try {
      peerObj.pc.close();
    } catch (_e) {}

    if (peerObj.audioEl) {
      peerObj.audioEl.srcObject = null;
      peerObj.audioEl.remove();
    }

    this.peers.delete(peerPlayerId);
  }

  // Tombol Mute / Unmute Mikrofon Lokal
  async toggleMicMute() {
    // Jika sebelumnya belum punya stream lokal (misal izin baru diberikan), coba inisialisasi
    if (!this.localStream && this.myPlayerId) {
      this.micMuted = false;
      await this.initAndJoinMesh(this.myPlayerId);
      return this.micMuted;
    }

    this.micMuted = !this.micMuted;
    this._terapkanMuteKeTrackLokal();

    if (this.myPlayerId) {
      this.mutedMap.set(this.myPlayerId, this.micMuted);
      this.speakingMap.set(this.myPlayerId, false);
    }

    this.network.sendVoiceState({
      micMuted: this.micMuted,
      speaking: false
    });

    return this.micMuted;
  }

  _terapkanMuteKeTrackLokal() {
    if (!this.localStream) return;
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = !this.micMuted;
    }
  }

  // Fungsi simulasi bicara (untuk menguji indikator bicara 3D di atas token & daftar pemain tanpa perlu mikrofon fisik)
  simulateSpeaking(playerId, durationMs = 3200) {
    if (!playerId) return;
    this.mutedMap.set(playerId, false);
    this.simulatedUntilMap.set(playerId, Date.now() + durationMs);
    this.network.sendVoiceState({
      micMuted: false,
      speaking: true
    });
    setTimeout(() => {
      this.network.sendVoiceState({
        micMuted: this.micMuted,
        speaking: false
      });
    }, durationMs);
  }

  // Hitung rata-rata energi pita frekuensi suara manusia dari AnalyserNode
  _hitungLevelSuara(analyser, dataArray) {
    if (!analyser || !dataArray) return 0;
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    // Ambil bin frekuensi vokal utama (indeks 2 s/d 42)
    const count = Math.min(42, dataArray.length);
    for (let i = 2; i < count; i++) {
      sum += dataArray[i];
    }
    return sum / Math.max(1, count - 2);
  }

  // Dipanggil setiap frame di requestAnimationFrame untuk memperbarui speakingMap
  update() {
    const now = Date.now();
    const THRESHOLD = 22; // Ambang batas sensitivitas suara bicara

    // 1. Cek aktivitas mikrofon lokal via AnalyserNode
    if (this.myPlayerId) {
      let localSpeaking = false;
      const simUntil = this.simulatedUntilMap.get(this.myPlayerId) || 0;

      if (now < simUntil) {
        localSpeaking = true;
      } else if (!this.micMuted && this.localAnalyser && this.localDataArray) {
        const level = this._hitungLevelSuara(this.localAnalyser, this.localDataArray);
        localSpeaking = level > THRESHOLD;
      }

      this.speakingMap.set(this.myPlayerId, localSpeaking);

      // Kirim update ke peer lain jika status bicara lokal berubah
      if (localSpeaking !== this._lastLocalSpeakingSent) {
        this._lastLocalSpeakingSent = localSpeaking;
        this.network.sendVoiceState({
          micMuted: this.micMuted,
          speaking: localSpeaking
        });
      }
    }

    // 2. Cek aktivitas suara dari seluruh peer WebRTC remote via AnalyserNode + fallback sinyal
    for (const [peerId, peerObj] of this.peers.entries()) {
      const isPeerMuted = this.mutedMap.get(peerId) || false;
      const simUntil = this.simulatedUntilMap.get(peerId) || 0;

      if (now < simUntil) {
        this.speakingMap.set(peerId, true);
        continue;
      }

      if (isPeerMuted) {
        this.speakingMap.set(peerId, false);
        continue;
      }

      let remoteSpeaking = false;
      if (peerObj.analyser && peerObj.dataArray) {
        const level = this._hitungLevelSuara(peerObj.analyser, peerObj.dataArray);
        remoteSpeaking = level > THRESHOLD;
      }

      if (!remoteSpeaking && this.remoteSpeakingMap.get(peerId)) {
        remoteSpeaking = true;
      }

      this.speakingMap.set(peerId, remoteSpeaking);
    }

    // 3. Cek juga pemain simulasi di mode Hot-Seat lokal
    for (const [simPlayerId, untilTime] of this.simulatedUntilMap.entries()) {
      if (now < untilTime) {
        this.speakingMap.set(simPlayerId, true);
      } else if (simPlayerId !== this.myPlayerId && !this.peers.has(simPlayerId)) {
        this.speakingMap.set(simPlayerId, false);
      }
    }

    return {
      speakingMap: this.speakingMap,
      mutedMap: this.mutedMap
    };
  }

  // Bersihkan seluruh koneksi WebRTC saat keluar dari room
  leaveMesh() {
    for (const peerId of Array.from(this.peers.keys())) {
      this._closePeer(peerId);
    }
    this.speakingMap.clear();
    this.remoteSpeakingMap.clear();
    this.simulatedUntilMap.clear();
  }
}