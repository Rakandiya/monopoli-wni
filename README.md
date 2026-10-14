# WNI Simulator - Board Game 3D Satir Kehidupan Warga +62

> Board game 3D satir kehidupan Warga Negara Indonesia dengan Three.js, Web Audio API, Socket.io Otoritatif, dan WebRTC Voice Chat.

---

## 🎮 Fitur Utama

- **Papan 3D Prosedural (Three.js):**
  - 40 petak bujur sangkar dengan kontur elevasi dinamis, canvas texture tajam, relief peta kepulauan Indonesia low-poly di tengah papan, dan sel Lapas Cipinang 3D dengan pintu besi berengsel.
  - Bangunan Rumah & Hotel menggunakan `InstancedMesh` dengan animasi muncul dari bawah tanah (*rising from ground*).
- **Engine Permainan Murni (Isomorphic):**
  - Sistem sewa bertingkat, monopoli grup warna, utilitas (PLN & PDAM), transportasi (KRL, Transjakarta, Tol, Pelabuhan).
  - Mekanika satir lokal: Start Terima Bansos, Pungli Oknum (kebal setelah 3x kena), Tanah Disita Negara, Pajak Tahunan, dan 4 jenis Bencana Alam.
  - 15 Kartu Takdir & 15 Kartu Musibah penuh humor birokrasi & kehidupan sehari-hari.
  - Likuidasi utang otomatis bertahap untuk mencegah kebuntuan (*anti-stall*).
- **Dadu 3D Deterministik:**
  - Dua buah dadu 3D dengan interpolasi rotasi akurat sesuai hasil angka yang telah ditentukan engine.
- **Sintesis Audio Prosedural (Web Audio API):**
  - Musik latar gamelan pentatonik **Laras Slendro** (Saron, Bonang, Kempul, Gong Ageng) tanpa file audio eksternal.
  - Efek suara lengkap (lemparan dadu, langkah kaki, sirine lapas, suara pungli, bencana alam, dll.).
- **Multiplayer Real-time Otoritatif (Socket.io):**
  - Pembuatan room dengan kode 4 huruf.
  - Server-authoritative validation mencegah kecurangan.
  - Reconnection berbasis token & timeout giliran 60 detik (auto-skip pemain offline).
- **Voice Chat WebRTC Mesh (Up to 4 Players):**
  - Komunikasi suara real-time antar-pemain dengan STUN.
  - Voice Activity Detection (VAD) via `AnalyserNode`.
  - Indikator bicara 3D (sprite mikrofon menyala & ring gelombang suara di kaki avatar 3D).

---

## 📁 Struktur Direktori

```
wni-simulator/
├── package.json               # Konfigurasi dependensi (Three.js, GSAP, Express, Socket.io)
├── vite.config.js             # Konfigurasi bundler Vite + host 0.0.0.0
├── index.html                 # Dokumen HTML utama, layer UI Bahasa Indonesia, & modal Lobby
├── server/
│   ├── index.js               # Entry point server (Express + Socket.io + Vite middleware)
│   └── room.js                # Manajemen room 4 huruf, server otoritatif, & signaling WebRTC
├── shared/
│   ├── tiles.js               # Data 40 petak papan WNI Simulator, grup warna, & formatter Rupiah
│   ├── cards.js               # 15 Kartu Takdir & 15 Kartu Musibah satir sistem
│   └── gameEngine.js          # Engine permainan murni (tanpa Three.js / DOM), dipakai klien & server
└── client/
    ├── main.js                # Entry point klien 3D (Three.js scene, event queue, network, voice, & UI)
    ├── board.js               # Pembuatan papan 3D prosedural, sel Lapas + pintu berengsel, & InstancedMesh
    ├── player.js              # Token 3D low-poly, animasi berjalan, & Indikator Bicara 3D
    ├── dice.js                # Dua dadu 3D prosedural dengan interpolasi rotasi deterministik
    ├── camera.js              # Pengelola OrbitControls (damping), kamera sinematik, & screen shake
    ├── fx.js                  # Pool partikel (320 partikel), efek bencana alam, confetti, & cincin kejut
    ├── audio.js               # Sintesis Web Audio API penuh (Gamelan Slendro & SFX lengkap)
    ├── voice.js               # Mesh WebRTC voice chat (STUN) & deteksi suara real-time via AnalyserNode
    ├── cards-ui.js            # Pop-up kartu Takdir & Musibah ukuran besar
    ├── ui.js                  # Pengelola UI game, lencana online/offline, indikator bicara 2D
    └── network.js             # Klien jaringan Socket.io & signaling WebRTC
```

---

## 🚀 Cara Menjalankan

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Menjalankan Server & Klien
```bash
node server/index.js
```
atau:
```bash
npm run dev
```

### 3. Membuka di Browser
- **PC Host:** Buka [http://localhost:5178](http://localhost:5178)
- **HP / Perangkat Lain (Satu Wi-Fi):** Buka `http://<IP-Lokal-Komputer>:5178` (alamat IP ditampilkan langsung di terminal saat server dijalankan).
- **Publik via Cloudflare Tunnel:**
  ```bash
  cloudflared tunnel --url http://localhost:5178
  ```
