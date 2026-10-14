// Data lengkap 40 petak papan WNI Simulator (indeks 0 sampai 39)
// Mencakup:
// - 4 Sudut (0 Start/Bansos, 10 Lapas Cipinang, 20 Tanah Disita Negara, 30 Digelandang ke Lapas)
// - 20 Tanah dalam 8 Grup Warna (termasuk Bekasi)
// - 4 Transportasi (KRL, Transjakarta, Tol Dalam Kota, Pelabuhan)
// - 2 Utilitas (PLN, PDAM)
// - 3 Kartu Takdir, 3 Kartu Musibah
// - 1 Pajak Tahunan, 1 Pungli, 2 Bencana Alam

export const COLOR_GROUPS = {
  COKELAT: { id: 'COKELAT', nama: 'Jalur Pinggiran Timur', warna: '#78350f', jumlah: 2 },
  BIRU_MUDA: { id: 'BIRU_MUDA', nama: 'Sabuk Komuter', warna: '#0284c7', jumlah: 3 },
  MERAH_MUDA: { id: 'MERAH_MUDA', nama: 'Jawa Barat Raya', warna: '#db2777', jumlah: 3 },
  ORANYE: { id: 'ORANYE', nama: 'Jawa Tengah & DIY', warna: '#ea580c', jumlah: 3 },
  MERAH: { id: 'MERAH', nama: 'Jawa Timur Industri', warna: '#dc2626', jumlah: 2 },
  KUNING: { id: 'KUNING', nama: 'Sumatera Niaga', warna: '#ca8a04', jumlah: 3 },
  HIJAU: { id: 'HIJAU', nama: 'Nusantara Timur', warna: '#16a34a', jumlah: 2 },
  BIRU_TUA: { id: 'BIRU_TUA', nama: 'Segitiga Emas Jakarta', warna: '#1e3a8a', jumlah: 2 }
};

// Fungsi pembantu membuat data petak tanah dengan sewa bertingkat:
// Level 0: Sewa dasar (~10% harga). Jika monopoli 1 grup warna, sewa dasar x2.
// Level 1-4: 1 sampai 4 rumah. Level 5: 1 Hotel.
// Biaya bangun rumah/hotel = 50% dari harga tanah.
function buatPetakTanah(index, nama, grupKey, harga) {
  const sewaDasar = Math.round(harga * 0.1);
  const biayaBangun = Math.round(harga * 0.5);
  return {
    index,
    nama,
    tipe: 'PROPERTY',
    grup: grupKey,
    warna: COLOR_GROUPS[grupKey].warna,
    namaGrup: COLOR_GROUPS[grupKey].nama,
    harga,
    biayaBangun,
    // Indeks sewa: [tanahKosong, 1Rumah, 2Rumah, 3Rumah, 4Rumah, 1Hotel]
    sewa: [
      sewaDasar,
      sewaDasar * 3,
      sewaDasar * 7,
      sewaDasar * 14,
      sewaDasar * 22,
      sewaDasar * 32
    ]
  };
}

function buatTransportasi(index, nama) {
  return {
    index,
    nama,
    tipe: 'TRANSPORT',
    warna: '#334155',
    harga: 160000,
    // Sewa berdasarkan jumlah transportasi yang dimiliki pemain (1..4)
    sewaTransport: [0, 30000, 60000, 120000, 240000]
  };
}

function buatUtilitas(index, nama) {
  return {
    index,
    nama,
    tipe: 'UTILITY',
    warna: '#0f766e',
    harga: 150000
    // Sewa = total angka dadu x Rp 10.000 (atau x2 = Rp 20.000 jika punya PLN & PDAM sekaligus)
  };
}

export const BOARD_TILES = [
  // === SISI BAWAH (0 - 9) ===
  {
    index: 0,
    nama: 'Start / Terima Bansos',
    tipe: 'START',
    warna: '#15803d',
    deskripsi: 'Lewat atau mendarat di sini cair Bansos Rp 200.000.'
  },
  buatPetakTanah(1, 'Bekasi', 'COKELAT', 60000),
  {
    index: 2,
    nama: 'Kartu Takdir',
    tipe: 'TAKDIR',
    warna: '#ca8a04',
    deskripsi: 'Ambil 1 Kartu Takdir penuh kejutan sistem.'
  },
  buatPetakTanah(3, 'Depok', 'COKELAT', 70000),
  {
    index: 4,
    nama: 'Pajak Tahunan',
    tipe: 'TAX',
    warna: '#475569',
    deskripsi: 'Bayar Rp 50.000 per tanah + Rp 25.000 per level bangunan.'
  },
  buatTransportasi(5, 'KRL Commuter'),
  buatPetakTanah(6, 'Bogor', 'BIRU_MUDA', 100000),
  {
    index: 7,
    nama: 'Kartu Musibah',
    tipe: 'MUSIBAH',
    warna: '#991b1b',
    deskripsi: 'Ambil 1 Kartu Musibah ujian kesabaran warga.'
  },
  buatPetakTanah(8, 'Tangerang', 'BIRU_MUDA', 100000),
  buatPetakTanah(9, 'Cikarang', 'BIRU_MUDA', 120000),

  // === SISI KIRI (10 - 19) ===
  {
    index: 10,
    nama: 'Lapas Cipinang',
    tipe: 'JAIL',
    warna: '#374151',
    deskripsi: 'Hanya mampir besuk atau sedang menjalani pembinaan.'
  },
  buatPetakTanah(11, 'Bandung', 'MERAH_MUDA', 140000),
  buatUtilitas(12, 'PLN (Listrik)'),
  buatPetakTanah(13, 'Cirebon', 'MERAH_MUDA', 140000),
  buatPetakTanah(14, 'Sukabumi', 'MERAH_MUDA', 160000),
  buatTransportasi(15, 'Transjakarta'),
  buatPetakTanah(16, 'Semarang', 'ORANYE', 180000),
  {
    index: 17,
    nama: 'Bencana Alam',
    tipe: 'DISASTER',
    warna: '#b45309',
    deskripsi: 'Bayar Rp 100.000 dan 1 bangunan turun 1 level.'
  },
  buatPetakTanah(18, 'Solo', 'ORANYE', 180000),
  buatPetakTanah(19, 'Yogyakarta', 'ORANYE', 200000),

  // === SISI ATAS (20 - 29) ===
  {
    index: 20,
    nama: 'Tanah Disita Negara',
    tipe: 'CONFISCATION',
    warna: '#7f1d1d',
    deskripsi: 'Negara menyita 1 tanah termurah milikmu untuk proyek strategis!'
  },
  buatPetakTanah(21, 'Surabaya', 'MERAH', 220000),
  {
    index: 22,
    nama: 'Kartu Takdir',
    tipe: 'TAKDIR',
    warna: '#ca8a04',
    deskripsi: 'Ambil 1 Kartu Takdir penuh kejutan sistem.'
  },
  buatPetakTanah(23, 'Malang', 'MERAH', 240000),
  {
    index: 24,
    nama: 'Kartu Musibah',
    tipe: 'MUSIBAH',
    warna: '#991b1b',
    deskripsi: 'Ambil 1 Kartu Musibah ujian kesabaran warga.'
  },
  buatTransportasi(25, 'Tol Dalam Kota'),
  buatPetakTanah(26, 'Medan', 'KUNING', 260000),
  buatPetakTanah(27, 'Palembang', 'KUNING', 260000),
  buatUtilitas(28, 'PDAM (Air Bersih)'),
  buatPetakTanah(29, 'Batam', 'KUNING', 280000),

  // === SISI KANAN (30 - 39) ===
  {
    index: 30,
    nama: 'Digelandang ke Lapas',
    tipe: 'GO_TO_JAIL',
    warna: '#1f2937',
    deskripsi: 'Langsung masuk Lapas Cipinang tanpa menerima Bansos Start!'
  },
  buatPetakTanah(31, 'Makassar', 'HIJAU', 300000),
  {
    index: 32,
    nama: 'Kartu Musibah',
    tipe: 'MUSIBAH',
    warna: '#991b1b',
    deskripsi: 'Ambil 1 Kartu Musibah ujian kesabaran warga.'
  },
  {
    index: 33,
    nama: 'Kartu Takdir',
    tipe: 'TAKDIR',
    warna: '#ca8a04',
    deskripsi: 'Ambil 1 Kartu Takdir penuh kejutan sistem.'
  },
  buatPetakTanah(34, 'Denpasar', 'HIJAU', 320000),
  buatTransportasi(35, 'Pelabuhan Priok'),
  {
    index: 36,
    nama: 'Pungli Oknum',
    tipe: 'PUNGLI',
    warna: '#7c2d12',
    deskripsi: 'Kena pungli Rp 50.000–Rp 400.000. Setelah 3x kena, warga jadi kebal!'
  },
  buatPetakTanah(37, 'Kemang', 'BIRU_TUA', 350000),
  {
    index: 38,
    nama: 'Bencana Alam',
    tipe: 'DISASTER',
    warna: '#b45309',
    deskripsi: 'Bayar Rp 100.000 dan 1 bangunan turun 1 level.'
  },
  buatPetakTanah(39, 'SCBD Jakarta', 'BIRU_TUA', 400000)
];

// Fungsi pembantu memformat angka ke format Rupiah "Rp 1.250.000"
export function formatRupiah(nominal) {
  const isNegative = nominal < 0;
  const absVal = Math.abs(Math.round(nominal));
  const formatted = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}