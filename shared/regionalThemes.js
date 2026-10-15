// shared/regionalThemes.js
// Data & Ilustrasi Ciri Khas 40 Daerah/Petak Monopoli WNI Simulator
// Memuat ikon, julukan daerah, ciri khas budaya/landmark, lore satir,
// palet warna gradien, dan prosedur gambar Canvas 2D untuk tekstur 3D dan UI Card.

export const REGIONAL_THEMES = {
  // === 0: START / BANSOS ===
  0: {
    index: 0,
    nama: "Start / Terima Bansos",
    ikon: "🌾",
    julukan: "Bansos Sembako +62",
    ciriKhas: "Karung Beras Bansos, Padi & Kapas Kemakmuran",
    lore: "Melewati garis start untuk mencairkan bantuan langsung tunai demi menyambung hidup warga.",
    bgGradient: "linear-gradient(135deg, #14532d 0%, #15803d 50%, #166534 100%)",
    canvasGradient: ["#0f391f", "#15803d"],
    accentColor: "#86efac",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy, w, h) => {
      // Karung Beras Bansos & Butir Padi
      ctx.save();
      ctx.fillStyle = "rgba(254, 240, 138, 0.25)";
      ctx.beginPath();
      ctx.arc(cx, cy, 42, 0, Math.PI * 2);
      ctx.fill();

      // Karung Beras
      ctx.fillStyle = "#ca8a04";
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy + 28);
      ctx.lineTo(cx + 24, cy + 28);
      ctx.quadraticCurveTo(cx + 28, cy - 8, cx + 18, cy - 18);
      ctx.lineTo(cx - 18, cy - 18);
      ctx.quadraticCurveTo(cx - 28, cy - 8, cx - 24, cy + 28);
      ctx.fill();

      // Ikatan Karung
      ctx.fillStyle = "#a16207";
      ctx.fillRect(cx - 12, cy - 22, 24, 6);
      ctx.fillStyle = "#fef08a";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BANSOS", cx, cy + 8);
      ctx.fillText("BERAS 10KG", cx, cy + 20);

      // Tangkai Padi Kiri & Kanan
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx - 28, cy + 5, 25, 0.4, 2.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 28, cy + 5, 25, 1.0, 2.8, true);
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 1: BEKASI (Jalur Pinggiran Timur - Cokelat) ===
  1: {
    index: 1,
    nama: "Bekasi",
    ikon: "🪐",
    julukan: "Planet Berbeda",
    ciriKhas: "Piramida Terbalik Summarecon, Cincin Planet Saturnus & Roket Antariksa",
    lore: "Kabarnya butuh paspor antariksa dan roket bertenaga surya untuk sampai ke planet ini.",
    bgGradient: "linear-gradient(135deg, #451a03 0%, #78350f 50%, #9a3412 100%)",
    canvasGradient: ["#2d1204", "#78350f"],
    accentColor: "#fdba74",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy, w, h) => {
      ctx.save();
      // Bintang-bintang antariksa
      ctx.fillStyle = "rgba(253, 224, 71, 0.7)";
      const stars = [
        [-55, -30], [-35, -45], [45, -35], [60, -20],
        [-65, 15], [50, 25], [-20, 38], [35, 42]
      ];
      for (const [sx, sy] of stars) {
        ctx.beginPath();
        ctx.arc(cx + sx, cy + sy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Planet Bekasi (Bulatan)
      const gradPlanet = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, 32);
      gradPlanet.addColorStop(0, "#fbbf24");
      gradPlanet.addColorStop(0.7, "#d97706");
      gradPlanet.addColorStop(1, "#78350f");
      ctx.fillStyle = gradPlanet;
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 26, 0, Math.PI * 2);
      ctx.fill();

      // Cincin Saturnus (Ring)
      ctx.strokeStyle = "rgba(253, 230, 138, 0.9)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 2, 52, 14, -0.28, 0, Math.PI * 2);
      ctx.stroke();

      // Piramida Terbalik Summarecon (Siluet di Bawah)
      ctx.fillStyle = "rgba(254, 215, 170, 0.85)";
      ctx.beginPath();
      ctx.moveTo(cx - 26, cy + 24);
      ctx.lineTo(cx + 26, cy + 24);
      ctx.lineTo(cx, cy + 46);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ea580c";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Roket Mini Meluncur
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(cx + 42, cy - 36);
      ctx.lineTo(cx + 48, cy - 24);
      ctx.lineTo(cx + 38, cy - 28);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(cx + 37, cy - 26, 4, 3);
      ctx.restore();
    }
  },

  // === 2: KARTU TAKDIR (#2) ===
  2: {
    index: 2,
    nama: "Kartu Takdir",
    ikon: "🎴",
    julukan: "Kotak Kejutan Takdir",
    ciriKhas: "Dadu Emas, Bintang Nasib & Angin Segar Sistem",
    lore: "Nasib warga +62 bisa jungkir balik dalam sekejap mata lewat kartu takdir.",
    bgGradient: "linear-gradient(135deg, #713f12 0%, #ca8a04 50%, #eab308 100%)",
    canvasGradient: ["#3f2406", "#ca8a04"],
    accentColor: "#fef08a",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Kartu Misterius Emas
      ctx.fillStyle = "rgba(254, 240, 138, 0.2)";
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cx - 24, cy - 32, 48, 64, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#854d0e";
      ctx.font = "900 30px serif";
      ctx.textAlign = "center";
      ctx.fillText("?", cx, cy + 10);
      ctx.restore();
    }
  },

  // === 3: DEPOK (Jalur Pinggiran Timur - Cokelat) ===
  3: {
    index: 3,
    nama: "Depok",
    ikon: "⚡",
    julukan: "Kota Petir & Belimbing",
    ciriKhas: "Rekor MURI Petir Terbanyak, Belimbing Dewa & Kubah Emas",
    lore: "Pusat fenomena tak terduga nusantara dengan kilatan petir spektakuler dan belimbing dewa manis.",
    bgGradient: "linear-gradient(135deg, #451a03 0%, #581c87 50%, #7e22ce 100%)",
    canvasGradient: ["#2d1204", "#581c87"],
    accentColor: "#fde047",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Awan Badai Ungu
      ctx.fillStyle = "rgba(147, 51, 234, 0.4)";
      ctx.beginPath();
      ctx.arc(cx - 20, cy - 25, 22, 0, Math.PI * 2);
      ctx.arc(cx + 15, cy - 28, 26, 0, Math.PI * 2);
      ctx.arc(cx + 38, cy - 20, 18, 0, Math.PI * 2);
      ctx.fill();

      // Kilatan Petir Kuning Bercahaya
      ctx.shadowColor = "#facc15";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#fef08a";
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + 8, cy - 40);
      ctx.lineTo(cx - 10, cy - 10);
      ctx.lineTo(cx + 4, cy - 10);
      ctx.lineTo(cx - 16, cy + 24);
      ctx.lineTo(cx + 2, cy - 2);
      ctx.lineTo(cx - 6, cy - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Buah Belimbing Bintang di Samping
      ctx.fillStyle = "#84cc16";
      ctx.strokeStyle = "#65a30d";
      ctx.lineWidth = 2;
      // Gambar Bintang 5 Sudut (Potongan Belimbing)
      ctx.beginPath();
      const rOuter = 20;
      const rInner = 10;
      const bx = cx + 32;
      const by = cy + 18;
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const rad = i % 2 === 0 ? rOuter : rInner;
        const px = bx + Math.cos(angle) * rad;
        const py = by + Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Kubah Emas di Kiri Bawah
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(cx - 30, cy + 28, 16, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - 32, cy + 28, 24, 6);
      ctx.restore();
    }
  },

  // === 4: PAJAK TAHUNAN ===
  4: {
    index: 4,
    nama: "Pajak Tahunan",
    ikon: "🧾",
    julukan: "Setoran Kas Negara",
    ciriKhas: "Formulir SPT Pajak, Materai & Bukti Potong Resmi",
    lore: "Kewajiban warga negara yang baik: bayar pajak tanah dan bangunan tepat waktu.",
    bgGradient: "linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)",
    canvasGradient: ["#0f172a", "#334155"],
    accentColor: "#94a3b8",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Lembar Kuitansi / SPT
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.fillRect(cx - 30, cy - 35, 60, 70);
      ctx.strokeRect(cx - 30, cy - 35, 60, 70);

      // Garis Tulisan
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(cx - 22, cy - 24, 44, 4);
      ctx.fillRect(cx - 22, cy - 14, 34, 3);
      ctx.fillRect(cx - 22, cy - 5, 38, 3);
      ctx.fillRect(cx - 22, cy + 4, 28, 3);

      // Stempel Merah LUNAS
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(cx - 18, cy + 14, 40, 16);
      ctx.fillStyle = "#ef4444";
      ctx.font = "900 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PAJAK", cx + 2, cy + 26);
      ctx.restore();
    }
  },

  // === 5: KRL COMMUTER (Transportasi) ===
  5: {
    index: 5,
    nama: "KRL Commuter",
    ikon: "🚊",
    julukan: "Sabuk Rel Komuter",
    ciriKhas: "KRL Listrik Modern, Rel Ganda & Pantograf Atas",
    lore: "Urat nadi jutaan pejuang rezeki Jabodetabek yang setia berdesak-desakan tiap pagi dan sore.",
    bgGradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #dc2626 100%)",
    canvasGradient: ["#090d16", "#1e293b"],
    accentColor: "#f87171",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Rel Ganda
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 45, cy + 38);
      ctx.lineTo(cx + 45, cy + 38);
      ctx.moveTo(cx - 40, cy + 44);
      ctx.lineTo(cx + 40, cy + 44);
      ctx.stroke();

      // Badan Depan Kereta KRL
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.roundRect(cx - 32, cy - 24, 64, 56, [14, 14, 4, 4]);
      ctx.fill();

      // Kaca Masinis
      ctx.fillStyle = "#0284c7";
      ctx.beginPath();
      ctx.roundRect(cx - 24, cy - 16, 48, 22, 6);
      ctx.fill();

      // Garis Merah Khas Commuterline
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(cx - 32, cy + 12, 64, 8);

      // Lampu Depan Kembar
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(cx - 18, cy + 26, 4, 0, Math.PI * 2);
      ctx.arc(cx + 18, cy + 26, 4, 0, Math.PI * 2);
      ctx.fill();

      // Pantograf Listrik Atas
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 24);
      ctx.lineTo(cx - 12, cy - 36);
      ctx.lineTo(cx + 12, cy - 36);
      ctx.lineTo(cx, cy - 24);
      ctx.moveTo(cx - 18, cy - 36);
      ctx.lineTo(cx + 18, cy - 36);
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 6: BOGOR (Sabuk Komuter - Biru Muda) ===
  6: {
    index: 6,
    nama: "Bogor",
    ikon: "🌧️",
    julukan: "Kota Hujan & Kujang",
    ciriKhas: "Tugu Kujang Pusaka Sunda, Rusa Totol Istana & Rintik Gerimis",
    lore: "Selalu sejuk dengan guyuran hujan berkah dan ribuan rusa totol yang bermain di halaman istana presiden.",
    bgGradient: "linear-gradient(135deg, #064e3b 0%, #0284c7 50%, #0369a1 100%)",
    canvasGradient: ["#032c21", "#0284c7"],
    accentColor: "#38bdf8",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Rintik Hujan di Langit
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 2;
      const drops = [[-50, -40], [-25, -45], [10, -42], [45, -38], [-35, -20], [30, -22], [55, -10]];
      for (const [dx, dy] of drops) {
        ctx.beginPath();
        ctx.moveTo(cx + dx, cy + dy);
        ctx.lineTo(cx + dx - 6, cy + dy + 12);
        ctx.stroke();
      }

      // Tugu Kujang Megah di Tengah
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      // Bilah Kujang Melengkung
      ctx.moveTo(cx - 6, cy + 36);
      ctx.lineTo(cx - 2, cy - 32);
      ctx.quadraticCurveTo(cx + 18, cy - 36, cx + 14, cy - 12);
      ctx.quadraticCurveTo(cx + 2, cy - 8, cx + 8, cy + 12);
      ctx.quadraticCurveTo(cx + 14, cy + 24, cx + 2, cy + 36);
      ctx.closePath();
      ctx.fill();

      // Lubang / Mata Kujang (3 titik khas)
      ctx.fillStyle = "#0284c7";
      ctx.beginPath();
      ctx.arc(cx + 4, cy - 20, 2.2, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy - 12, 2.2, 0, Math.PI * 2);
      ctx.arc(cx + 6, cy - 4, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Siluet Rusa Istana Bogor di Kiri
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.ellipse(cx - 32, cy + 24, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Kepala & Tanduk Rusa
      ctx.beginPath();
      ctx.arc(cx - 42, cy + 15, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 42, cy + 10);
      ctx.lineTo(cx - 48, cy - 2);
      ctx.lineTo(cx - 52, cy + 2);
      ctx.moveTo(cx - 48, cy + 4);
      ctx.lineTo(cx - 44, cy - 4);
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 7: KARTU MUSIBAH (#7) ===
  7: {
    index: 7,
    nama: "Kartu Musibah",
    ikon: "💥",
    julukan: "Ujian Kesabaran Warga",
    ciriKhas: "Segitiga Bahaya, Petir Awan & Razia Dadakan",
    lore: "Ujian mental sehari-hari warga: dari tilang, denda, hingga biaya tak terduga.",
    bgGradient: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #dc2626 100%)",
    canvasGradient: ["#450a0a", "#b91c1c"],
    accentColor: "#fca5a5",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Segitiga Bahaya Merah
      ctx.fillStyle = "#dc2626";
      ctx.strokeStyle = "#fef2f2";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 35);
      ctx.lineTo(cx + 38, cy + 30);
      ctx.lineTo(cx - 38, cy + 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tanda Seru Putih Tebal
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx - 3.5, cy - 16, 7, 24);
      ctx.beginPath();
      ctx.arc(cx, cy + 19, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  // === 8: TANGERANG (Sabuk Komuter - Biru Muda) ===
  8: {
    index: 8,
    nama: "Tangerang",
    ikon: "✈️",
    julukan: "Gerbang Udara Soetta",
    ciriKhas: "Bandara Internasional Soekarno-Hatta, Menara ATC & Pesawat Jet",
    lore: "Pintu gerbang udara nusantara yang menghubungkan Indonesia dengan seluruh penjuru dunia.",
    bgGradient: "linear-gradient(135deg, #075985 0%, #0284c7 50%, #38bdf8 100%)",
    canvasGradient: ["#0c3247", "#0284c7"],
    accentColor: "#bae6fd",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Garis Lintasan Runway Terbang
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(cx - 55, cy + 40);
      ctx.lineTo(cx + 55, cy - 30);
      ctx.stroke();
      ctx.setLineDash([]);

      // Menara ATC Bandara di Kanan
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(cx + 28, cy - 15, 12, 45);
      // Kabin Menara Bundar
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.ellipse(cx + 34, cy - 20, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Siluet Pesawat Jet Komersial Terbang
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy - 24); // Hidung
      ctx.lineTo(cx + 6, cy - 12);
      ctx.lineTo(cx + 30, cy + 2);  // Sayap kanan
      ctx.lineTo(cx + 24, cy + 8);
      ctx.lineTo(cx - 2, cy - 2);
      ctx.lineTo(cx - 18, cy + 12); // Ekor
      ctx.lineTo(cx - 24, cy + 6);
      ctx.lineTo(cx - 16, cy - 8);
      ctx.lineTo(cx - 26, cy - 20); // Sayap kiri
      ctx.lineTo(cx - 20, cy - 24);
      ctx.lineTo(cx + 2, cy - 18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  },

  // === 9: CIKARANG (Sabuk Komuter - Biru Muda) ===
  9: {
    index: 9,
    nama: "Cikarang",
    ikon: "⚙️",
    julukan: "Kawasan Industri & Robotik",
    ciriKhas: "Pusat Industri Terbesar Asia Tenggara, Pabrik Otomotif & Lengan Robot",
    lore: "Ribuan pabrik manufaktur otomotif dan elektronik beroperasi siang malam tanpa henti.",
    bgGradient: "linear-gradient(135deg, #0e7490 0%, #155e75 50%, #0891b2 100%)",
    canvasGradient: ["#083344", "#0891b2"],
    accentColor: "#67e8f9",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Siluet Pabrik dengan Cerobong di Latar
      ctx.fillStyle = "rgba(103, 232, 249, 0.2)";
      ctx.beginPath();
      ctx.moveTo(cx - 50, cy + 35);
      ctx.lineTo(cx - 50, cy + 5);
      ctx.lineTo(cx - 35, cy - 10);
      ctx.lineTo(cx - 35, cy + 5);
      ctx.lineTo(cx - 20, cy - 10);
      ctx.lineTo(cx - 20, cy + 35);
      ctx.closePath();
      ctx.fill();

      // Roda Gigi Industri Utama (Gear 1)
      ctx.fillStyle = "#22d3ee";
      ctx.strokeStyle = "#0891b2";
      ctx.lineWidth = 2;
      const teeth = 8;
      const rOut = 28;
      const rIn = 20;
      ctx.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const ang = (i * Math.PI) / teeth;
        const rad = i % 2 === 0 ? rOut : rIn;
        const px = cx + Math.cos(ang) * rad;
        const py = cy + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Lubang Tengah Gear
      ctx.fillStyle = "#083344";
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();

      // Roda Gigi Kecil Saling Kait di Kanan Bawah
      ctx.fillStyle = "#67e8f9";
      ctx.beginPath();
      ctx.arc(cx + 34, cy + 18, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#083344";
      ctx.beginPath();
      ctx.arc(cx + 34, cy + 18, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  // === 10: LAPAS CIPINANG (Sudut Penjara) ===
  10: {
    index: 10,
    nama: "Lapas Cipinang",
    ikon: "🏢",
    julukan: "Lapas Klas I Cipinang",
    ciriKhas: "Jeruji Besi Baja, Tembok Pembinaan & Sorot Lampu",
    lore: "Tempat istirahat sejenak bagi pelanggar aturan atau warga yang sedang kurang beruntung.",
    bgGradient: "linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%)",
    canvasGradient: ["#030712", "#374151"],
    accentColor: "#fbbf24",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Sorotan Cahaya Kuning Lapas
      ctx.fillStyle = "rgba(250, 204, 21, 0.15)";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 45);
      ctx.lineTo(cx - 55, cy + 40);
      ctx.lineTo(cx + 55, cy + 40);
      ctx.closePath();
      ctx.fill();

      // Jeruji Besi Hitam
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 4;
      for (let x = -40; x <= 40; x += 16) {
        ctx.beginPath();
        ctx.moveTo(cx + x, cy - 35);
        ctx.lineTo(cx + x, cy + 35);
        ctx.stroke();
      }
      // Palang Horizontal
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx - 48, cy - 12);
      ctx.lineTo(cx + 48, cy - 12);
      ctx.moveTo(cx - 48, cy + 16);
      ctx.lineTo(cx + 48, cy + 16);
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 11: BANDUNG (Jawa Barat Raya - Merah Muda) ===
  11: {
    index: 11,
    nama: "Bandung",
    ikon: "🌸",
    julukan: "Paris van Java",
    ciriKhas: "Gedung Sate 6 Ornamen, Jembatan Pasupati & Bunga Kembang",
    lore: "Kota romantis berhawa sejuk tempat lahirnya kreativitas, kuliner legendaris, dan mojang priangan.",
    bgGradient: "linear-gradient(135deg, #831843 0%, #db2777 50%, #be185d 100%)",
    canvasGradient: ["#500724", "#db2777"],
    accentColor: "#fbcfe8",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Bunga-bunga Berguguran
      ctx.fillStyle = "rgba(251, 207, 232, 0.4)";
      ctx.beginPath();
      ctx.arc(cx - 42, cy - 25, 6, 0, Math.PI * 2);
      ctx.arc(cx + 45, cy - 30, 8, 0, Math.PI * 2);
      ctx.arc(cx + 35, cy + 28, 5, 0, Math.PI * 2);
      ctx.fill();

      // Gedung Sate Siluet Megah
      ctx.fillStyle = "#ffffff";
      // Badan Gedung Utama
      ctx.fillRect(cx - 46, cy + 10, 92, 26);
      // Lantai 2
      ctx.fillRect(cx - 30, cy - 2, 60, 12);
      // Menara Tengah
      ctx.fillRect(cx - 14, cy - 18, 28, 16);
      // Atap Segitiga Menara
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - 18);
      ctx.lineTo(cx, cy - 30);
      ctx.lineTo(cx + 18, cy - 18);
      ctx.closePath();
      ctx.fill();

      // Tusuk Sate Khas (6 Jambu Air / Ornamen)
      ctx.strokeStyle = "#fbcfe8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 30);
      ctx.lineTo(cx, cy - 48);
      ctx.stroke();

      ctx.fillStyle = "#f472b6";
      for (let s = 0; s < 6; s++) {
        ctx.beginPath();
        ctx.arc(cx, cy - 34 - s * 2.4, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Jendela-jendela Gedung Sate
      ctx.fillStyle = "#db2777";
      for (let w = -38; w <= 38; w += 12) {
        ctx.fillRect(cx + w, cy + 16, 6, 8);
      }
      ctx.restore();
    }
  },

  // === 12: PLN LISTRIK (Utilitas) ===
  12: {
    index: 12,
    nama: "PLN (Listrik)",
    ikon: "💡",
    julukan: "Energi Listrik Pintar",
    ciriKhas: "Menara SUTET Tegangan Tinggi & Percikan Kilat Plasma",
    lore: "Penerang seantero negeri. Jangan sampai telat bayar tagihan kalau tak mau listrik diputus.",
    bgGradient: "linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #0d9488 100%)",
    canvasGradient: ["#042f2e", "#0f766e"],
    accentColor: "#5eead4",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Menara SUTET Transmisi
      ctx.strokeStyle = "#5eead4";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // Kaki Piramida Menara
      ctx.moveTo(cx - 28, cy + 38);
      ctx.lineTo(cx - 8, cy - 25);
      ctx.lineTo(cx + 8, cy - 25);
      ctx.lineTo(cx + 28, cy + 38);
      // Palang Lengan Atas
      ctx.moveTo(cx - 36, cy - 15);
      ctx.lineTo(cx + 36, cy - 15);
      ctx.moveTo(cx - 24, cy + 2);
      ctx.lineTo(cx + 24, cy + 2);
      // Silang Penyangga
      ctx.moveTo(cx - 18, cy + 18);
      ctx.lineTo(cx + 18, cy + 18);
      ctx.stroke();

      // Kilatan Listrik Kuning di Puncak
      ctx.fillStyle = "#fde047";
      ctx.shadowColor = "#fef08a";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy - 35, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  // === 13: CIREBON (Jawa Barat Raya - Merah Muda) ===
  13: {
    index: 13,
    nama: "Cirebon",
    ikon: "☁️",
    julukan: "Batik Megamendung & Udang",
    ciriKhas: "Awan Megamendung Legendaris, Keraton Kasepuhan & Udang Gurih",
    lore: "Kekayaan tradisi pesisir dengan keindahan motif batik awan para wali dan keraton bersejarah.",
    bgGradient: "linear-gradient(135deg, #1e3a8a 0%, #db2777 60%, #9d174d 100%)",
    canvasGradient: ["#172554", "#db2777"],
    accentColor: "#93c5fd",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Pola Awan Megamendung Bergradasi (Tingkat 3 Lapisan)
      const awanTingkat = [
        { r1: 34, r2: 24, col: "rgba(30, 58, 138, 0.7)" },
        { r1: 26, r2: 18, col: "rgba(59, 130, 246, 0.85)" },
        { r1: 16, r2: 10, col: "#ffffff" }
      ];

      for (const t of awanTingkat) {
        ctx.fillStyle = t.col;
        ctx.beginPath();
        // Awan Melengkung Khas Megamendung
        ctx.arc(cx - 24, cy - 10, t.r2, Math.PI * 0.7, Math.PI * 1.9);
        ctx.arc(cx, cy - 18, t.r1, Math.PI * 0.9, Math.PI * 2.1);
        ctx.arc(cx + 26, cy - 10, t.r2, Math.PI * 1.1, Math.PI * 2.3);
        ctx.closePath();
        ctx.fill();
      }

      // Siluet Udang Windu Emas di Bawah
      ctx.fillStyle = "#f59e0b";
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 22, 22, 10, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Ekor Udang
      ctx.beginPath();
      ctx.moveTo(cx - 22, cy + 22);
      ctx.lineTo(cx - 36, cy + 14);
      ctx.lineTo(cx - 32, cy + 28);
      ctx.closePath();
      ctx.fill();
      // Sungut Udang
      ctx.strokeStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(cx + 20, cy + 18, 16, 1.2, 2.6);
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 14: SUKABUMI (Jawa Barat Raya - Merah Muda) ===
  14: {
    index: 14,
    nama: "Sukabumi",
    ikon: "🍃",
    julukan: "Situ Gunung & Kebun Teh",
    ciriKhas: "Jembatan Gantung Situ Gunung, Lereng Gede Pangrango & Mochi Legit",
    lore: "Sensasi melintasi jembatan gantung kanopi terpanjang di antara rimbunnya hutan tropis dan teh.",
    bgGradient: "linear-gradient(135deg, #065f46 0%, #db2777 60%, #831843 100%)",
    canvasGradient: ["#022c22", "#db2777"],
    accentColor: "#6ee7b7",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Bukit Perkebunan Teh
      ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
      ctx.beginPath();
      ctx.arc(cx - 38, cy + 30, 42, Math.PI, 0);
      ctx.arc(cx + 38, cy + 32, 45, Math.PI, 0);
      ctx.fill();

      // Jembatan Gantung Situ Gunung
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 3;
      // Kabel Utama Melengkung
      ctx.beginPath();
      ctx.moveTo(cx - 52, cy - 12);
      ctx.quadraticCurveTo(cx, cy + 18, cx + 52, cy - 12);
      ctx.stroke();

      // Tiang Penyangga Kiri & Kanan
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(cx - 54, cy - 25, 6, 45);
      ctx.fillRect(cx + 48, cy - 25, 6, 45);

      // Lantai Jembatan Kayu
      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 50, cy);
      ctx.quadraticCurveTo(cx, cy + 12, cx + 50, cy);
      ctx.stroke();

      // Tali Penggantung Vertikal
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 1;
      for (let x = -40; x <= 40; x += 10) {
        ctx.beginPath();
        ctx.moveTo(cx + x, cy + 4);
        ctx.lineTo(cx + x, cy + 14);
        ctx.stroke();
      }
      ctx.restore();
    }
  },

  // === 15: TRANSJAKARTA (Transportasi) ===
  15: {
    index: 15,
    nama: "Transjakarta",
    ikon: "🚌",
    julukan: "Bus Rapid Transit Ibu Kota",
    ciriKhas: "Busway Jalur Khusus, Halte Ikonik & Armada Biru-Kuning",
    lore: "Pelopor sistem BRT terpanjang di dunia yang setia meliuk menembus kemacetan ibu kota.",
    bgGradient: "linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #3b82f6 100%)",
    canvasGradient: ["#0a1224", "#1e40af"],
    accentColor: "#93c5fd",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Jalur Busway Khusus (Separator)
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(cx - 52, cy + 28, 104, 6);
      ctx.fillStyle = "#f59e0b";
      for (let s = -48; s <= 44; s += 16) {
        ctx.fillRect(cx + s, cy + 24, 8, 4);
      }

      // Badan Bus Transjakarta Biru Modern
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.roundRect(cx - 44, cy - 18, 88, 42, 8);
      ctx.fill();

      // Kaca Jendela Penumpang Khas
      ctx.fillStyle = "#bae6fd";
      for (let k = -36; k <= 24; k += 16) {
        ctx.fillRect(cx + k, cy - 12, 12, 14);
      }

      // Kaca Depan Sopir
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.roundRect(cx + 28, cy - 12, 12, 18, 3);
      ctx.fill();

      // Roda Bus
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(cx - 26, cy + 24, 9, 0, Math.PI * 2);
      ctx.arc(cx + 24, cy + 24, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.arc(cx - 26, cy + 24, 4, 0, Math.PI * 2);
      ctx.arc(cx + 24, cy + 24, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  // === 16: SEMARANG (Jawa Tengah & DIY - Oranye) ===
  16: {
    index: 16,
    nama: "Semarang",
    ikon: "🏛️",
    julukan: "Lawang Sewu & Sam Poo Kong",
    ciriKhas: "Lengkungan Seribu Pintu Kolonial, Pagoda Merah & Lunpia Nikmat",
    lore: "Perpaduan harmonis sejarah arsitektur kolonial Eropa dan kemegahan budaya Tionghoa nusantara.",
    bgGradient: "linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #c2410c 100%)",
    canvasGradient: ["#431407", "#ea580c"],
    accentColor: "#fdba74",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Siluet Atap Pagoda Sam Poo Kong di Latar Belakang
      ctx.fillStyle = "rgba(220, 38, 38, 0.35)";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 38);
      ctx.lineTo(cx - 34, cy - 20);
      ctx.quadraticCurveTo(cx, cy - 26, cx + 34, cy - 20);
      ctx.closePath();
      ctx.fill();

      // Fasad Utama Lawang Sewu (Deretan Pintu Lengkung Kolonial)
      ctx.fillStyle = "#ffedd5";
      ctx.fillRect(cx - 48, cy - 14, 96, 50);

      // Pedimen / Menara Tengah
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - 14);
      ctx.lineTo(cx, cy - 30);
      ctx.lineTo(cx + 18, cy - 14);
      ctx.closePath();
      ctx.fill();

      // 4 Pintu Lengkung Ikonik (Lawang Sewu)
      ctx.fillStyle = "#9a3412";
      for (let p = -36; p <= 36; p += 24) {
        ctx.beginPath();
        ctx.arc(cx + p, cy + 12, 8, Math.PI, 0);
        ctx.lineTo(cx + p + 8, cy + 36);
        ctx.lineTo(cx + p - 8, cy + 36);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  },

  // === 17: BENCANA ALAM (#17) ===
  17: {
    index: 17,
    nama: "Bencana Alam",
    ikon: "🌋",
    julukan: "Ujian Ring of Fire",
    ciriKhas: "Gunung Berapi Erupsi, Lahar Panas & Gempa Tektonik",
    lore: "Indonesia di jalur cincin api dunia, butuh gotong royong dan kesiapan menghadapi bencana.",
    bgGradient: "linear-gradient(135deg, #78350f 0%, #b45309 50%, #d97706 100%)",
    canvasGradient: ["#451a03", "#b45309"],
    accentColor: "#fde047",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Awan Panas Erupsi Vulkanik
      ctx.fillStyle = "rgba(120, 53, 15, 0.6)";
      ctx.beginPath();
      ctx.arc(cx - 16, cy - 24, 20, 0, Math.PI * 2);
      ctx.arc(cx + 14, cy - 28, 24, 0, Math.PI * 2);
      ctx.fill();

      // Gunung Berapi
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + 48, cy + 38);
      ctx.lineTo(cx - 48, cy + 38);
      ctx.closePath();
      ctx.fill();

      // Aliran Lahar Merah Pijar
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx - 8, cy + 12);
      ctx.lineTo(cx + 4, cy + 24);
      ctx.lineTo(cx - 14, cy + 38);
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 18: SOLO (Jawa Tengah & DIY - Oranye) ===
  18: {
    index: 18,
    nama: "Solo",
    ikon: "👑",
    julukan: "The Spirit of Java",
    ciriKhas: "Batik Parang Rusak Barong, Keraton Surakarta & Pasar Gede",
    lore: "Pusat kebudayaan Jawa yang adiluhung, penuh tata krama santun dan karya batik legendaris.",
    bgGradient: "linear-gradient(135deg, #451a03 0%, #78350f 50%, #ea580c 100%)",
    canvasGradient: ["#260e02", "#78350f"],
    accentColor: "#fde68a",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Motif Diagonal Batik Parang Barong di Latar Belakang
      ctx.strokeStyle = "rgba(253, 230, 138, 0.35)";
      ctx.lineWidth = 4;
      for (let d = -60; d <= 60; d += 20) {
        ctx.beginPath();
        ctx.moveTo(cx + d - 30, cy - 38);
        ctx.lineTo(cx + d + 30, cy + 38);
        ctx.stroke();
      }

      // Atap Joglo Keraton Surakarta Megah
      ctx.fillStyle = "#fef3c7";
      // Atap Tajuk Utama
      ctx.beginPath();
      ctx.moveTo(cx, cy - 32);
      ctx.lineTo(cx - 32, cy - 2);
      ctx.lineTo(cx + 32, cy - 2);
      ctx.closePath();
      ctx.fill();

      // Atap Penumpu Bawah
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy - 2);
      ctx.lineTo(cx - 46, cy + 16);
      ctx.lineTo(cx + 46, cy + 16);
      ctx.lineTo(cx + 24, cy - 2);
      ctx.closePath();
      ctx.fill();

      // Pilar Soko Guru Keraton
      ctx.fillStyle = "#78350f";
      for (let col = -28; col <= 28; col += 18) {
        ctx.fillRect(cx + col, cy + 16, 5, 20);
      }
      ctx.restore();
    }
  },

  // === 19: YOGYAKARTA (Jawa Tengah & DIY - Oranye) ===
  19: {
    index: 19,
    nama: "Yogyakarta",
    ikon: "🕊️",
    julukan: "Daerah Istimewa & Tugu",
    ciriKhas: "Tugu Pal Putih (Tugu Jogja), Candi Prambanan & Malioboro",
    lore: "Kota pelajar dan budaya yang selalu istimewa, hangat menyambut siapa pun yang singgah.",
    bgGradient: "linear-gradient(135deg, #78350f 0%, #b45309 50%, #f59e0b 100%)",
    canvasGradient: ["#3b1802", "#b45309"],
    accentColor: "#fef08a",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Siluet Stupa Candi Prambanan di Kiri & Kanan
      ctx.fillStyle = "rgba(254, 240, 138, 0.25)";
      ctx.beginPath();
      ctx.moveTo(cx - 36, cy + 36);
      ctx.lineTo(cx - 36, cy);
      ctx.lineTo(cx - 30, cy - 18);
      ctx.lineTo(cx - 24, cy);
      ctx.lineTo(cx - 24, cy + 36);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx + 24, cy + 36);
      ctx.lineTo(cx + 24, cy);
      ctx.lineTo(cx + 30, cy - 18);
      ctx.lineTo(cx + 36, cy);
      ctx.lineTo(cx + 36, cy + 36);
      ctx.closePath();
      ctx.fill();

      // Tugu Pal Putih (Tugu Jogja) di Tengah
      ctx.fillStyle = "#ffffff";
      // Alas Berundak
      ctx.fillRect(cx - 18, cy + 28, 36, 8);
      ctx.fillRect(cx - 14, cy + 22, 28, 6);
      // Batang Kolom Tugu Putih
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 22);
      ctx.lineTo(cx - 5, cy - 20);
      ctx.lineTo(cx + 5, cy - 20);
      ctx.lineTo(cx + 8, cy + 22);
      ctx.closePath();
      ctx.fill();

      // Bola & Jarum Emas Puncak Tugu
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(cx, cy - 24, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 28);
      ctx.lineTo(cx, cy - 42);
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 20: TANAH DISITA NEGARA (Sudut Bebas/Sita) ===
  20: {
    index: 20,
    nama: "Tanah Disita Negara",
    ikon: "⚠️",
    julukan: "Penyitaan Aset Strategis",
    ciriKhas: "Garis Pembatas Kuning, Stempel Sita Merah & Eksekusi Lahan",
    lore: "Pemerintah mengambil alih lahan untuk proyek strategis nasional. Pemilik gigit jari!",
    bgGradient: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)",
    canvasGradient: ["#1e0404", "#7f1d1d"],
    accentColor: "#fde047",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Pita Garis Kuning Peringatan
      ctx.fillStyle = "#facc15";
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.25);
      ctx.fillRect(-55, -12, 110, 24);
      ctx.fillStyle = "#000000";
      ctx.font = "900 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("DISITA NEGARA", 0, 4);
      ctx.restore();

      // Stempel Sita Merah Darah
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 21: SURABAYA (Jawa Timur Industri - Merah) ===
  21: {
    index: 21,
    nama: "Surabaya",
    ikon: "🦈",
    julukan: "Kota Pahlawan & Sura Baya",
    ciriKhas: "Patung Ikonik Hiu (Sura) vs Buaya (Baya) & Tugu Pahlawan",
    lore: "Simbol ketangguhan dan keberanian arek-arek Suroboyo yang tak pernah gentar memperjuangkan haknya.",
    bgGradient: "linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #b91c1c 100%)",
    canvasGradient: ["#450a0a", "#dc2626"],
    accentColor: "#fca5a5",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Tugu Pahlawan di Tengah Latar
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy + 35);
      ctx.lineTo(cx - 3, cy - 35);
      ctx.lineTo(cx + 3, cy - 35);
      ctx.lineTo(cx + 6, cy + 35);
      ctx.closePath();
      ctx.fill();

      // Hiu Sura Melingkar di Kiri
      ctx.fillStyle = "#e2e8f0";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx - 15, cy - 8, 22, Math.PI * 0.6, Math.PI * 1.8);
      // Sirip Hiu
      ctx.lineTo(cx - 36, cy - 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Buaya Baya di Kanan Melingkari Bawah
      ctx.fillStyle = "#15803d";
      ctx.strokeStyle = "#166534";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + 12, cy + 6, 22, 0, Math.PI * 1.2);
      ctx.lineTo(cx + 38, cy + 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Moncong Buaya Bergerigi
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx + 16, cy - 4, 3, 3);
      ctx.fillRect(cx + 22, cy - 4, 3, 3);
      ctx.restore();
    }
  },

  // === 22: KARTU TAKDIR (#22) ===
  22: {
    index: 22,
    nama: "Kartu Takdir",
    ikon: "🎴",
    julukan: "Kotak Kejutan Takdir",
    ciriKhas: "Dadu Emas, Bintang Nasib & Angin Segar Sistem",
    lore: "Keberuntungan bisa datang kapan saja, nikmati kejutan takdir hidup warga.",
    bgGradient: "linear-gradient(135deg, #713f12 0%, #ca8a04 50%, #eab308 100%)",
    canvasGradient: ["#3f2406", "#ca8a04"],
    accentColor: "#fef08a",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cx - 24, cy - 32, 48, 64, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#854d0e";
      ctx.font = "900 30px serif";
      ctx.textAlign = "center";
      ctx.fillText("?", cx, cy + 10);
      ctx.restore();
    }
  },

  // === 23: MALANG (Jawa Timur Industri - Merah) ===
  23: {
    index: 23,
    nama: "Malang",
    ikon: "🍏",
    julukan: "Bromo Sunrise & Apel",
    ciriKhas: "Kawah Gunung Bromo Berasap & Manis Segarnya Apel Hijau",
    lore: "Keindahan magis sunrise Gunung Bromo berpadu dengan sejuknya kota apel dan bakso malang.",
    bgGradient: "linear-gradient(135deg, #831843 0%, #dc2626 50%, #15803d 100%)",
    canvasGradient: ["#3f0909", "#15803d"],
    accentColor: "#86efac",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Matahari Terbit Bromo (Sunrise)
      ctx.fillStyle = "rgba(251, 191, 36, 0.4)";
      ctx.beginPath();
      ctx.arc(cx - 15, cy - 10, 24, 0, Math.PI * 2);
      ctx.fill();

      // Kawah Gunung Bromo & Asap Putih
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(cx - 18, cy - 25, 14, 0, Math.PI * 2);
      ctx.arc(cx - 10, cy - 32, 10, 0, Math.PI * 2);
      ctx.fill();

      // Lereng Kaldera Bromo
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.moveTo(cx - 50, cy + 30);
      ctx.lineTo(cx - 24, cy);
      ctx.lineTo(cx - 10, cy + 4);
      ctx.lineTo(cx + 8, cy - 8);
      ctx.lineTo(cx + 35, cy + 30);
      ctx.closePath();
      ctx.fill();

      // Apel Hijau Manalagi di Kanan Depan
      ctx.fillStyle = "#22c55e";
      ctx.strokeStyle = "#16a34a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + 25, cy + 18, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tangkai & Daun Apel
      ctx.fillStyle = "#78350f";
      ctx.fillRect(cx + 24, cy - 2, 3, 7);
      ctx.fillStyle = "#86efac";
      ctx.beginPath();
      ctx.ellipse(cx + 31, cy + 2, 6, 3, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  // === 24: KARTU MUSIBAH (#24) ===
  24: {
    index: 24,
    nama: "Kartu Musibah",
    ikon: "💥",
    julukan: "Ujian Kesabaran Warga",
    ciriKhas: "Segitiga Bahaya, Razia & Denda Tak Terduga",
    lore: "Siapkan tabungan darurat, musibah selalu menguji ketangguhan finansialmu.",
    bgGradient: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #dc2626 100%)",
    canvasGradient: ["#450a0a", "#b91c1c"],
    accentColor: "#fca5a5",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      ctx.fillStyle = "#dc2626";
      ctx.strokeStyle = "#fef2f2";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 35);
      ctx.lineTo(cx + 38, cy + 30);
      ctx.lineTo(cx - 38, cy + 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx - 3.5, cy - 16, 7, 24);
      ctx.beginPath();
      ctx.arc(cx, cy + 19, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  // === 25: TOL DALAM KOTA (Transportasi) ===
  25: {
    index: 25,
    nama: "Tol Dalam Kota",
    ikon: "🛣️",
    julukan: "Jalan Bebas Hambatan",
    ciriKhas: "Jalan Layang Bertingkat & Gerbang Otomatis E-Toll",
    lore: "Jalan layang yang menjanjikan kecepatan namun sering menyajikan panorama kemacetan estetis.",
    bgGradient: "linear-gradient(135deg, #0f172a 0%, #334155 50%, #059669 100%)",
    canvasGradient: ["#090e17", "#334155"],
    accentColor: "#6ee7b7",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Jalan Tol Melayang Melengkung
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.moveTo(cx - 50, cy + 38);
      ctx.lineTo(cx - 15, cy - 30);
      ctx.lineTo(cx + 15, cy - 30);
      ctx.lineTo(cx + 50, cy + 38);
      ctx.closePath();
      ctx.fill();

      // Garis Putus-putus Marka Jalan Kuning
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(cx, cy - 25);
      ctx.lineTo(cx, cy + 35);
      ctx.stroke();
      ctx.setLineDash([]);

      // Gerbang Plang Hijau Tol
      ctx.fillStyle = "#059669";
      ctx.fillRect(cx - 38, cy - 38, 76, 14);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GTO E-TOLL", cx, cy - 28);
      ctx.restore();
    }
  },

  // === 26: MEDAN (Sumatera Niaga - Kuning) ===
  26: {
    index: 26,
    nama: "Medan",
    ikon: "🏰",
    julukan: "Istana Maimun & Durian Deli",
    ciriKhas: "Kubah Melayu Kesultanan Deli & Durian Medan Legit Berduri",
    lore: "Pusat perniagaan megah tanah Deli, bermahkotakan istana kuning bersejarah dan harumnya durian.",
    bgGradient: "linear-gradient(135deg, #713f12 0%, #ca8a04 50%, #eab308 100%)",
    canvasGradient: ["#3f2105", "#ca8a04"],
    accentColor: "#fef08a",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Istana Maimun (Kubah Melayu Runcing Lengkung)
      ctx.fillStyle = "#fef08a";
      // Bangunan Sayap Kiri-Kanan
      ctx.fillRect(cx - 44, cy + 6, 88, 28);

      // Kubah Tengah Khas Melayu
      ctx.fillStyle = "#ca8a04";
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 20, Math.PI, 0);
      ctx.fill();

      // Pucuk Kubah Lancip Emas
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 8);
      ctx.lineTo(cx, cy - 28);
      ctx.lineTo(cx + 4, cy - 8);
      ctx.closePath();
      ctx.fill();

      // Pintu Lengkung Horseshoe Khas Melayu
      ctx.fillStyle = "#713f12";
      ctx.beginPath();
      ctx.arc(cx, cy + 22, 9, Math.PI, 0);
      ctx.lineTo(cx + 9, cy + 34);
      ctx.lineTo(cx - 9, cy + 34);
      ctx.closePath();
      ctx.fill();

      // Durian Medan Berduri di Kanan Depan
      ctx.fillStyle = "#84cc16";
      ctx.beginPath();
      ctx.arc(cx + 30, cy + 22, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4d7c0f";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 27: PALEMBANG (Sumatera Niaga - Kuning) ===
  27: {
    index: 27,
    nama: "Palembang",
    ikon: "🌉",
    julukan: "Jembatan Ampera & Musi",
    ciriKhas: "Dua Menara Merah Ampera, Aliran Sungai Musi & Songket",
    lore: "Ikon kebanggaan Wong Kito yang melintas gagah di atas Sungai Musi, teman santap pempek lezat.",
    bgGradient: "linear-gradient(135deg, #78350f 0%, #dc2626 50%, #ca8a04 100%)",
    canvasGradient: ["#3b1303", "#dc2626"],
    accentColor: "#fde047",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Gelombang Sungai Musi
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 50, cy + 34);
      ctx.quadraticCurveTo(cx - 25, cy + 28, cx, cy + 34);
      ctx.quadraticCurveTo(cx + 25, cy + 40, cx + 50, cy + 34);
      ctx.stroke();

      // 2 Menara Tegak Jembatan Ampera Merah
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(cx - 26, cy - 34, 10, 60);
      ctx.fillRect(cx + 16, cy - 34, 10, 60);

      // Balok Penghubung Menara Atas
      ctx.fillRect(cx - 26, cy - 24, 52, 6);

      // Geladak Jalan Jembatan
      ctx.fillStyle = "#991b1b";
      ctx.fillRect(cx - 48, cy + 12, 96, 6);

      // Kabel Gantung Suspensi
      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 48, cy + 12);
      ctx.lineTo(cx - 21, cy - 34);
      ctx.lineTo(cx, cy + 8);
      ctx.lineTo(cx + 21, cy - 34);
      ctx.lineTo(cx + 48, cy + 12);
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 28: PDAM AIR BERSIH (Utilitas) ===
  28: {
    index: 28,
    nama: "PDAM (Air Bersih)",
    ikon: "💧",
    julukan: "Tirta Bersih Nusantara",
    ciriKhas: "Pipa Air Tirta, Tetesan Kristal Air & Keran Distribusi",
    lore: "Penyedia air bersih penghidupan warga. Jangan lupa hemat air saat musim kemarau.",
    bgGradient: "linear-gradient(135deg, #0e7490 0%, #0284c7 50%, #0369a1 100%)",
    canvasGradient: ["#082f49", "#0284c7"],
    accentColor: "#7dd3fc",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Tetesan Air Raksasa Berkilau
      ctx.fillStyle = "#38bdf8";
      ctx.strokeStyle = "#bae6fd";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 35);
      ctx.bezierCurveTo(cx + 26, cy - 5, cx + 26, cy + 22, cx, cy + 28);
      ctx.bezierCurveTo(cx - 26, cy + 22, cx - 26, cy - 5, cx, cy - 35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Kilauan Cahaya di Tetesan
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(cx - 8, cy - 4, 5, 12, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Gelombang Riak Air di Bawah
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy + 34, 28, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 29: BATAM (Sumatera Niaga - Kuning) ===
  29: {
    index: 29,
    nama: "Batam",
    ikon: "🚢",
    julukan: "Jembatan Barelang & Selat Malaka",
    ciriKhas: "Pilar V Jembatan Barelang & Kapal Feri Cepat Selat Malaka",
    lore: "Pintu perniagaan internasional selat tersibuk dunia dan pusat industri perdagangan bebas.",
    bgGradient: "linear-gradient(135deg, #1e3a8a 0%, #0284c7 50%, #ca8a04 100%)",
    canvasGradient: ["#0f172a", "#0284c7"],
    accentColor: "#fde047",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Pilar Kabel Jembatan Barelang (Bentuk V Terbalik)
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy + 32);
      ctx.lineTo(cx, cy - 34);
      ctx.lineTo(cx + 20, cy + 32);
      ctx.stroke();

      // Kabel-kabel Cable-Stayed
      ctx.strokeStyle = "rgba(253, 224, 71, 0.7)";
      ctx.lineWidth = 1.5;
      for (let y = -20; y <= 15; y += 8) {
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(cx - 42, cy + 18);
        ctx.moveTo(cx, y);
        ctx.lineTo(cx + 42, cy + 18);
        ctx.stroke();
      }

      // Kapal Feri Internasional di Bawah
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy + 30);
      ctx.lineTo(cx + 24, cy + 30);
      ctx.lineTo(cx + 34, cy + 24);
      ctx.lineTo(cx - 26, cy + 24);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  },

  // === 30: DIGELANDANG KE LAPAS (Sudut Go To Jail) ===
  30: {
    index: 30,
    nama: "Digelandang ke Lapas",
    ikon: "🚨",
    julukan: "Operasi Tangkap Tangan",
    ciriKhas: "Sirene Polisi Berkedip & Borgol Baja Tahanan",
    lore: "Kena razia atau diciduk patroli! Langsung meluncur ke sel Lapas Cipinang tanpa bansos.",
    bgGradient: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #991b1b 100%)",
    canvasGradient: ["#020617", "#1e1b4b"],
    accentColor: "#ef4444",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Lampu Sirene Polisi Merah-Biru Berkilau
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(cx - 16, cy - 20, 16, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(cx + 16, cy - 20, 16, Math.PI, 0);
      ctx.fill();

      // Dudukan Sirene
      ctx.fillStyle = "#334155";
      ctx.fillRect(cx - 34, cy - 20, 68, 8);

      // Sepasang Borgol Baja Terkunci
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx - 18, cy + 14, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 18, cy + 14, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Rantai Penghubung Borgol
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy + 14);
      ctx.lineTo(cx + 4, cy + 14);
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 31: MAKASSAR (Nusantara Timur - Hijau) ===
  31: {
    index: 31,
    nama: "Makassar",
    ikon: "⛵",
    julukan: "Kapal Phinisi & Anging Mammiri",
    ciriKhas: "Perahu Layar Tujuh Phinisi Bugis-Makassar & Pantai Losari",
    lore: "Warisan maritim dunia para pelaut Bugis-Makassar yang menjelajahi samudra dengan Phinisi legendaris.",
    bgGradient: "linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)",
    canvasGradient: ["#022c22", "#059669"],
    accentColor: "#6ee7b7",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Gelombang Laut Samudra
      ctx.strokeStyle = "rgba(110, 231, 183, 0.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 52, cy + 34);
      ctx.quadraticCurveTo(cx - 24, cy + 28, cx, cy + 34);
      ctx.quadraticCurveTo(cx + 26, cy + 40, cx + 52, cy + 34);
      ctx.stroke();

      // Lambung Kapal Phinisi Kayu
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.moveTo(cx - 44, cy + 14);
      ctx.quadraticCurveTo(cx, cy + 32, cx + 46, cy + 12);
      ctx.lineTo(cx + 38, cy + 22);
      ctx.lineTo(cx - 36, cy + 24);
      ctx.closePath();
      ctx.fill();

      // Tiang Layar Ganda
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 14);
      ctx.lineTo(cx - 10, cy - 36);
      ctx.moveTo(cx + 16, cy + 14);
      ctx.lineTo(cx + 16, cy - 32);
      ctx.stroke();

      // 7 Layar Terkembang Putih Khas Phinisi
      ctx.fillStyle = "#f8fafc";
      // Layar Tiang Depan
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 34);
      ctx.quadraticCurveTo(cx - 28, cy - 20, cx - 10, cy - 6);
      ctx.closePath();
      ctx.fill();

      // Layar Tiang Belakang
      ctx.beginPath();
      ctx.moveTo(cx + 16, cy - 30);
      ctx.quadraticCurveTo(cx + 32, cy - 18, cx + 16, cy - 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  },

  // === 32: KARTU MUSIBAH (#32) ===
  32: {
    index: 32,
    nama: "Kartu Musibah",
    ikon: "💥",
    julukan: "Ujian Kesabaran Warga",
    ciriKhas: "Segitiga Bahaya, Ujian Sistem & Tagihan Dadakan",
    lore: "Tantangan kehidupan warga yang siap menguras isi dompet bila lengah.",
    bgGradient: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #dc2626 100%)",
    canvasGradient: ["#450a0a", "#b91c1c"],
    accentColor: "#fca5a5",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      ctx.fillStyle = "#dc2626";
      ctx.strokeStyle = "#fef2f2";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 35);
      ctx.lineTo(cx + 38, cy + 30);
      ctx.lineTo(cx - 38, cy + 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx - 3.5, cy - 16, 7, 24);
      ctx.beginPath();
      ctx.arc(cx, cy + 19, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  // === 33: KARTU TAKDIR (#33) ===
  33: {
    index: 33,
    nama: "Kartu Takdir",
    ikon: "🎴",
    julukan: "Kotak Kejutan Takdir",
    ciriKhas: "Dadu Emas, Rezeki Nomplok & Kejutan Sistem",
    lore: "Putaran roda nasib membawa angin keberuntungan segar di saat terdesak.",
    bgGradient: "linear-gradient(135deg, #713f12 0%, #ca8a04 50%, #eab308 100%)",
    canvasGradient: ["#3f2406", "#ca8a04"],
    accentColor: "#fef08a",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cx - 24, cy - 32, 48, 64, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#854d0e";
      ctx.font = "900 30px serif";
      ctx.textAlign = "center";
      ctx.fillText("?", cx, cy + 10);
      ctx.restore();
    }
  },

  // === 34: DENPASAR (Nusantara Timur - Hijau) ===
  34: {
    index: 34,
    nama: "Denpasar",
    ikon: "🌺",
    julukan: "Pulau Dewata & Candi Bentar",
    ciriKhas: "Gapura Terbelah Candi Bentar, Motif Kain Poleng & Bunga Kamboja",
    lore: "Keagungan spiritual dan keindahan surgawi dewata yang memesona jutaan pelancong dari seluruh dunia.",
    bgGradient: "linear-gradient(135deg, #065f46 0%, #ea580c 50%, #f59e0b 100%)",
    canvasGradient: ["#022c22", "#ea580c"],
    accentColor: "#fed7aa",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Papan Catur Poleng Hitam-Putih di Bawah
      const sz = 8;
      for (let r = 0; r < 2; r++) {
        for (let c = -4; c < 4; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? "#000000" : "#ffffff";
          ctx.fillRect(cx + c * sz, cy + 26 + r * sz, sz, sz);
        }
      }

      // Gapura Candi Bentar (Gerbang Terbelah Bali Kiri & Kanan)
      ctx.fillStyle = "#b45309";
      ctx.strokeStyle = "#fef3c7";
      ctx.lineWidth = 1.5;

      // Sisi Kiri Candi Bentar
      ctx.beginPath();
      ctx.moveTo(cx - 3, cy - 36);
      ctx.lineTo(cx - 10, cy - 28);
      ctx.lineTo(cx - 8, cy - 28);
      ctx.lineTo(cx - 16, cy - 14);
      ctx.lineTo(cx - 12, cy - 14);
      ctx.lineTo(cx - 22, cy + 6);
      ctx.lineTo(cx - 18, cy + 6);
      ctx.lineTo(cx - 26, cy + 26);
      ctx.lineTo(cx - 3, cy + 26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sisi Kanan Candi Bentar
      ctx.beginPath();
      ctx.moveTo(cx + 3, cy - 36);
      ctx.lineTo(cx + 10, cy - 28);
      ctx.lineTo(cx + 8, cy - 28);
      ctx.lineTo(cx + 16, cy - 14);
      ctx.lineTo(cx + 12, cy - 14);
      ctx.lineTo(cx + 22, cy + 6);
      ctx.lineTo(cx + 18, cy + 6);
      ctx.lineTo(cx + 26, cy + 26);
      ctx.lineTo(cx + 3, cy + 26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bunga Kamboja (Frangipani) di Tengah
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  // === 35: PELABUHAN PRIOK (Transportasi) ===
  35: {
    index: 35,
    nama: "Pelabuhan Priok",
    ikon: "⚓",
    julukan: "Dermaga Samudra Internasional",
    ciriKhas: "Derek Crane Kontainer Raksasa, Kapal Kargo & Jangkar Baja",
    lore: "Pusat logistik maritim terbesar negeri, gerbang ribuan kontainer ekspor impor setiap hari.",
    bgGradient: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0284c7 100%)",
    canvasGradient: ["#020617", "#1e3a8a"],
    accentColor: "#38bdf8",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Derek Crane Pelabuhan (Gantry Container Crane)
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 3;
      // Kaki Crane
      ctx.beginPath();
      ctx.moveTo(cx - 28, cy + 34);
      ctx.lineTo(cx - 16, cy - 18);
      ctx.lineTo(cx + 16, cy - 18);
      ctx.lineTo(cx + 28, cy + 34);
      // Lengan Boom Horizontal Crane
      ctx.moveTo(cx - 42, cy - 18);
      ctx.lineTo(cx + 42, cy - 18);
      ctx.stroke();

      // Peti Kemas / Kontainer Tergantung
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(cx - 10, cy - 4, 20, 10);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 10, cy - 4, 20, 10);

      // Jangkar Kapal Baja di Samping
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx + 32, cy + 18, 9, 0, Math.PI);
      ctx.moveTo(cx + 32, cy + 6);
      ctx.lineTo(cx + 32, cy + 27);
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 36: PUNGLI OKNUM ===
  36: {
    index: 36,
    nama: "Pungli Oknum",
    ikon: "💸",
    julukan: "Pungli Oknum Jalanan",
    ciriKhas: "Amplop Cokelat Damai, Peluit Parkir Liar & Jalur Pintas",
    lore: "Oknum nakal meminta setoran dadakan. Setelah 3 kali kena palak, warga kebal dan tak mempan lagi!",
    bgGradient: "linear-gradient(135deg, #451a03 0%, #7c2d12 50%, #9a3412 100%)",
    canvasGradient: ["#260d03", "#7c2d12"],
    accentColor: "#fdba74",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Amplop Cokelat Berisi Uang
      ctx.fillStyle = "#ca8a04";
      ctx.strokeStyle = "#a16207";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cx - 30, cy - 18, 60, 42, 4);
      ctx.fill();
      ctx.stroke();

      // Tutup Lipatan Amplop
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy - 18);
      ctx.lineTo(cx, cy + 2);
      ctx.lineTo(cx + 30, cy - 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Uang Kertas Hijau Nongol dari Amplop
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(cx - 18, cy - 28, 36, 12);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("RP", cx, cy - 19);
      ctx.restore();
    }
  },

  // === 37: KEMANG (Segitiga Emas Jakarta - Biru Tua) ===
  37: {
    index: 37,
    nama: "Kemang",
    ikon: "☕",
    julukan: "Jaksel Hits & Cafe Aesthetic",
    ciriKhas: "Coffee Shop Latte Art, Skuter Vespa Klasik & Bahasa Jaksel",
    lore: "Pusat gaya hidup Jaksel yang trendy, tempat nongkrong estetik, flexing outfit, dan obrolan 'literally'.",
    bgGradient: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #7c3aed 100%)",
    canvasGradient: ["#090723", "#4c1d95"],
    accentColor: "#c084fc",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Lampu Bistro Kafe Menggantung
      ctx.strokeStyle = "rgba(192, 132, 252, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 45, cy - 35);
      ctx.quadraticCurveTo(cx, cy - 26, cx + 45, cy - 35);
      ctx.stroke();
      ctx.fillStyle = "#fef08a";
      for (const lx of [-30, -10, 10, 30]) {
        ctx.beginPath();
        ctx.arc(cx + lx, cy - 29, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cangkir Kopi Keramik Aesthetic
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.roundRect(cx - 24, cy - 10, 48, 34, [4, 4, 16, 16]);
      ctx.fill();

      // Gagang Cangkir
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx + 26, cy + 6, 8, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // Permukaan Kopi Latte Art (Hati / Love)
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.ellipse(cx, cy - 8, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fef3c7";
      ctx.beginPath();
      ctx.arc(cx - 3, cy - 9, 3, 0, Math.PI * 2);
      ctx.arc(cx + 3, cy - 9, 3, 0, Math.PI * 2);
      ctx.fill();

      // Asap Aroma Kopi Mengepul Neon
      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 16);
      ctx.quadraticCurveTo(cx - 14, cy - 26, cx - 8, cy - 34);
      ctx.moveTo(cx + 6, cy - 16);
      ctx.quadraticCurveTo(cx + 12, cy - 26, cx + 6, cy - 34);
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 38: BENCANA ALAM (#38) ===
  38: {
    index: 38,
    nama: "Bencana Alam",
    ikon: "🌋",
    julukan: "Ujian Ring of Fire",
    ciriKhas: "Gunung Berapi Erupsi, Lahar Panas & Kerusakan Fasilitas",
    lore: "Bencana alam tak terduga menuntut gotong royong warga untuk bangkit bersama.",
    bgGradient: "linear-gradient(135deg, #78350f 0%, #b45309 50%, #d97706 100%)",
    canvasGradient: ["#451a03", "#b45309"],
    accentColor: "#fde047",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      ctx.fillStyle = "rgba(120, 53, 15, 0.6)";
      ctx.beginPath();
      ctx.arc(cx - 16, cy - 24, 20, 0, Math.PI * 2);
      ctx.arc(cx + 14, cy - 28, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + 48, cy + 38);
      ctx.lineTo(cx - 48, cy + 38);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx - 8, cy + 12);
      ctx.lineTo(cx + 4, cy + 24);
      ctx.lineTo(cx - 14, cy + 38);
      ctx.stroke();
      ctx.restore();
    }
  },

  // === 39: SCBD JAKARTA (Segitiga Emas Jakarta - Biru Tua) ===
  39: {
    index: 39,
    nama: "SCBD Jakarta",
    ikon: "🏙️",
    julukan: "Metropolitan Elite & SCBD Sky",
    ciriKhas: "Pencakar Langit Megah, Lanyard Coach & Bursa Efek Indonesia",
    lore: "Puncak ekosistem finansial modern nusantara, rimba gedung kaca pencakar langit tempat para elit korporat.",
    bgGradient: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)",
    canvasGradient: ["#020617", "#1e3a8a"],
    accentColor: "#60a5fa",
    textColor: "#ffffff",
    drawIllustration: (ctx, cx, cy) => {
      ctx.save();
      // Cahaya Sinar Metropolitan ke Angkasa
      ctx.fillStyle = "rgba(96, 165, 250, 0.15)";
      ctx.beginPath();
      ctx.moveTo(cx - 45, cy + 38);
      ctx.lineTo(cx - 10, cy - 42);
      ctx.lineTo(cx + 15, cy - 42);
      ctx.lineTo(cx + 45, cy + 38);
      ctx.closePath();
      ctx.fill();

      // Gedung Kiri (Medium)
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(cx - 42, cy - 10, 24, 48);

      // Gedung Menjulang Utama di Tengah (Mega Tower)
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy + 38);
      ctx.lineTo(cx - 14, cy - 32);
      ctx.lineTo(cx, cy - 44); // Mahkota Lancip Arsitektur
      ctx.lineTo(cx + 14, cy - 32);
      ctx.lineTo(cx + 14, cy + 38);
      ctx.closePath();
      ctx.fill();

      // Gedung Kanan (Modern Diagonal)
      ctx.fillStyle = "#1d4ed8";
      ctx.beginPath();
      ctx.moveTo(cx + 18, cy + 38);
      ctx.lineTo(cx + 18, cy - 18);
      ctx.lineTo(cx + 40, cy - 6);
      ctx.lineTo(cx + 40, cy + 38);
      ctx.closePath();
      ctx.fill();

      // Jendela-jendela Gemerlap Gedung SCBD
      ctx.fillStyle = "#fef08a";
      for (let gy = -26; gy <= 28; gy += 8) {
        ctx.fillRect(cx - 8, cy + gy, 4, 4);
        ctx.fillRect(cx + 4, cy + gy, 4, 4);
      }
      ctx.restore();
    }
  }
};

// Fungsi pembantu mengambil tema daerah (fallback aman jika indeks di luar jangkauan)
export function getRegionalTheme(tileIndex) {
  return (
    REGIONAL_THEMES[tileIndex] || {
      index: tileIndex,
      nama: `Petak #${tileIndex}`,
      ikon: "📍",
      julukan: "Wilayah Nusantara",
      ciriKhas: "Kawasan Strategis WNI",
      lore: "Petak nusantara dengan potensi investasi menggiurkan.",
      bgGradient: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
      canvasGradient: ["#0f172a", "#334155"],
      accentColor: "#94a3b8",
      textColor: "#ffffff",
      drawIllustration: (ctx, cx, cy) => {
        ctx.save();
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  );
}
