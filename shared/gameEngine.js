// Engine Permainan WNI Simulator MURNI (Upgrade Tugas 3 & Tugas 4):
// - Fase baru: 'WAIT_CARD_CONFIRM' sehingga efek Kartu Takdir/Musibah baru dijalankan SETELAH
//   pemain menekan tombol "OK" (confirmCard).
// - Event 'PAY_RENT' kini menyertakan level bangunan dan detail pemilik untuk banner sewa UI.

import { BOARD_TILES, COLOR_GROUPS, formatRupiah } from "./tiles.js";
import { TAKDIR_CARDS, MUSIBAH_CARDS } from "./cards.js";

export const DISASTER_TYPES = [
  { id: "banjir", nama: "Tsunami / Banjir Bandang" },
  { id: "gempa", nama: "Gempa Bumi Tektonik" },
  { id: "kebakaran", nama: "Kebakaran & Ledakan Gardu" },
  { id: "longsor", nama: "Tanah Longsor Tebing" },
];

export class GameEngine {
  constructor(customRng = Math.random) {
    this.rng = customRng;
    this.state = null;
  }

  initGame(playerConfigs) {
    const players = playerConfigs.map((cfg, idx) => ({
      id: cfg.id || `p${idx + 1}`,
      index: idx,
      nama: cfg.nama || `Warga ${idx + 1}`,
      warna: cfg.warna || "#ef4444",
      uang: 2000000,
      posisi: 0,
      diPenjara: false,
      giliranPenjara: 0,
      jumlahPungli: 0,
      bangkrut: false,
      urutanBangkrut: null,
    }));

    this.state = {
      players,
      properties: {},
      giliranIndex: 0,
      putaran: 1,
      maxPutaran: 80,
      daduTerakhir: [1, 1],
      jumlahKembarBerturut: 0,
      bolehLemparLagi: false,
      // WAIT_ROLL | WAIT_CARD_CONFIRM | WAIT_BUY_DECISION | WAIT_END_TURN | GAME_OVER
      fase: "WAIT_ROLL",
      petakBeliTertunda: null,
      kartuTertunda: null, // { playerId, jenisDeck, kartu }
      pemenang: null,
      peringkatAkhir: [],
      log: [
        {
          id: Date.now(),
          tipe: "info",
          teks: "Permainan dimulai! Setiap warga menerima modal awal Rp 2.000.000.",
        },
      ],
      takdirDeck: this._shuffle([...TAKDIR_CARDS]),
      musibahDeck: this._shuffle([...MUSIBAH_CARDS]),
    };

    return this.getPublicState();
  }

  getPublicState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  getCurrentPlayer() {
    return this.state.players[this.state.giliranIndex];
  }

  hitungKekayaanBersih(playerId) {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return 0;
    let total = player.uang;

    for (const [tileIdxStr, prop] of Object.entries(this.state.properties)) {
      if (prop.ownerId === playerId) {
        const tile = BOARD_TILES[Number(tileIdxStr)];
        total += tile.harga || 0;
        if (prop.level > 0 && tile.biayaBangun) {
          total += prop.level * tile.biayaBangun;
        }
      }
    }
    return total;
  }

  punyaMonopoliGrup(playerId, grupKey) {
    if (!grupKey) return false;
    const totalDalamGrup = COLOR_GROUPS[grupKey]?.jumlah || 0;
    if (totalDalamGrup === 0) return false;

    let milikPemain = 0;
    for (const tile of BOARD_TILES) {
      if (tile.tipe === "PROPERTY" && tile.grup === grupKey) {
        if (this.state.properties[tile.index]?.ownerId === playerId) {
          milikPemain++;
        }
      }
    }
    return milikPemain === totalDalamGrup;
  }

  hitungSewa(tileIndex, totalDadu) {
    const tile = BOARD_TILES[tileIndex];
    const prop = this.state.properties[tileIndex];
    if (!tile || !prop || !prop.ownerId) return 0;

    const ownerId = prop.ownerId;

    if (tile.tipe === "PROPERTY") {
      const level = prop.level || 0;
      let sewa = tile.sewa[level];
      if (level === 0 && this.punyaMonopoliGrup(ownerId, tile.grup)) {
        sewa *= 2;
      }
      return sewa;
    }

    if (tile.tipe === "TRANSPORT") {
      let jumlahTransport = 0;
      for (const t of BOARD_TILES) {
        if (
          t.tipe === "TRANSPORT" &&
          this.state.properties[t.index]?.ownerId === ownerId
        ) {
          jumlahTransport++;
        }
      }
      return tile.sewaTransport[jumlahTransport] || 30000;
    }

    if (tile.tipe === "UTILITY") {
      let jumlahUtilitas = 0;
      for (const t of BOARD_TILES) {
        if (
          t.tipe === "UTILITY" &&
          this.state.properties[t.index]?.ownerId === ownerId
        ) {
          jumlahUtilitas++;
        }
      }
      const pengali = jumlahUtilitas >= 2 ? 20000 : 10000;
      return totalDadu * pengali;
    }

    return 0;
  }

  bayarKeluarPenjara(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId)
      return { ok: false, pesan: "Bukan giliranmu." };
    if (this.state.fase !== "WAIT_ROLL")
      return { ok: false, pesan: "Tidak bisa membayar tebusan pada fase ini." };
    if (!player.diPenjara)
      return { ok: false, pesan: "Kamu tidak sedang berada di Lapas." };
    if (player.uang < 100000)
      return {
        ok: false,
        pesan: "Uang tunai tidak cukup untuk menebus Rp 100.000.",
      };

    player.uang -= 100000;
    player.diPenjara = false;
    player.giliranPenjara = 0;
    const msg = `${player.nama} membayar biaya pembinaan Rp 100.000 dan bebas dari Lapas Cipinang.`;
    this._addLog("info", msg);

    return {
      ok: true,
      events: [{ tipe: "JAIL_RELEASE", playerId: player.id, teks: msg }],
      state: this.getPublicState(),
    };
  }

  rollDice(playerId, forcedDice = null) {
    if (this.state.fase === "GAME_OVER")
      return { ok: false, pesan: "Permainan sudah selesai." };
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId)
      return { ok: false, pesan: "Bukan giliranmu." };
    if (this.state.fase !== "WAIT_ROLL")
      return { ok: false, pesan: "Sekarang bukan waktunya melempar dadu." };

    const d1 = forcedDice ? forcedDice[0] : this._randInt(1, 6);
    const d2 = forcedDice ? forcedDice[1] : this._randInt(1, 6);
    const total = d1 + d2;
    const isDouble = d1 === d2;

    this.state.daduTerakhir = [d1, d2];
    const events = [
      {
        tipe: "DICE_ROLLED",
        playerId: player.id,
        dadu: [d1, d2],
        total,
        isDouble,
      },
    ];

    this._addLog(
      "info",
      `${player.nama} melempar dadu: [${d1}] + [${d2}] = ${total}${isDouble ? " (KEMBAR!)" : ""}.`,
    );

    if (player.diPenjara) {
      if (isDouble) {
        player.diPenjara = false;
        player.giliranPenjara = 0;
        this.state.jumlahKembarBerturut = 0;
        this.state.bolehLemparLagi = false;
        const bebasMsg = `${player.nama} mendapat dadu kembar dan bebas dari Lapas Cipinang!`;
        this._addLog("success", bebasMsg);
        events.push({
          tipe: "JAIL_RELEASE",
          playerId: player.id,
          teks: bebasMsg,
        });
        this._gerakkanPemain(player, total, events);
      } else {
        player.giliranPenjara += 1;
        if (player.giliranPenjara >= 3) {
          player.diPenjara = false;
          player.giliranPenjara = 0;
          const bebas3Msg = `${player.nama} telah menjalani 3 giliran di Lapas. Bayar administrasi Rp 100.000 dan langsung jalan!`;
          this._addLog("warn", bebas3Msg);
          events.push({
            tipe: "JAIL_RELEASE",
            playerId: player.id,
            teks: bebas3Msg,
          });
          this._tagihPembayaran(
            player,
            100000,
            null,
            "Biaya Administrasi Lapas",
            events,
          );
          if (!player.bangkrut) {
            this._gerakkanPemain(player, total, events);
          }
        } else {
          const tetapMsg = `${player.nama} belum dapat dadu kembar di Lapas (Giliran ${player.giliranPenjara}/3).`;
          this._addLog("warn", tetapMsg);
          this.state.fase = "WAIT_END_TURN";
          this.state.bolehLemparLagi = false;
        }
      }

      this._cekKondisiMenang(events);
      return { ok: true, events, state: this.getPublicState() };
    }

    if (isDouble) {
      this.state.jumlahKembarBerturut += 1;
      if (this.state.jumlahKembarBerturut >= 3) {
        const msg3x = `${player.nama} mendapat dadu kembar 3x berturut-turut! Dicurigai memakai orang dalam, langsung masuk Lapas Cipinang!`;
        this._addLog("danger", msg3x);
        this._masukkanKePenjara(player, events, msg3x);
        this._cekKondisiMenang(events);
        return { ok: true, events, state: this.getPublicState() };
      }
      this.state.bolehLemparLagi = true;
    } else {
      this.state.jumlahKembarBerturut = 0;
      this.state.bolehLemparLagi = false;
    }

    this._gerakkanPemain(player, total, events);
    this._cekKondisiMenang(events);

    return { ok: true, events, state: this.getPublicState() };
  }

  _gerakkanPemain(player, langkah, events) {
    const asal = player.posisi;
    const posisiBaru = (asal + langkah) % 40;
    const lewatStart = asal + langkah >= 40;

    const jalur = [];
    for (let i = 1; i <= langkah; i++) {
      jalur.push((asal + i) % 40);
    }

    player.posisi = posisiBaru;
    events.push({
      tipe: "PLAYER_MOVED",
      playerId: player.id,
      dari: asal,
      ke: posisiBaru,
      jalur,
    });

    if (lewatStart) {
      player.uang += 200000;
      const bansosMsg = `${player.nama} melewati/mendarat di Start dan mencairkan Bansos Rp 200.000!`;
      this._addLog("success", bansosMsg);
      events.push({
        tipe: "PASS_START",
        playerId: player.id,
        nominal: 200000,
        teks: bansosMsg,
      });
    }

    this._evaluasiPetak(player, posisiBaru, events);
  }

  _evaluasiPetak(player, tileIndex, events) {
    const tile = BOARD_TILES[tileIndex];
    this.state.petakBeliTertunda = null;

    if (tile.tipe === "START") {
      this._lanjutkanFaseSetelahEvaluasi(player);
      return;
    }

    if (tile.tipe === "JAIL") {
      this._addLog(
        "info",
        `${player.nama} mampir melihat suasana di Lapas Cipinang.`,
      );
      this._lanjutkanFaseSetelahEvaluasi(player);
      return;
    }

    if (tile.tipe === "GO_TO_JAIL") {
      const msg = `${player.nama} terjaring razia di petak "${tile.nama}"! Langsung digelandang ke Lapas Cipinang!`;
      this._addLog("danger", msg);
      this._masukkanKePenjara(player, events, msg);
      return;
    }

    if (tile.tipe === "CONFISCATION") {
      const milik = Object.entries(this.state.properties)
        .filter(([, prop]) => prop.ownerId === player.id)
        .map(([idxStr, prop]) => ({
          tileIndex: Number(idxStr),
          tile: BOARD_TILES[Number(idxStr)],
          level: prop.level,
        }))
        .sort((a, b) => a.tile.harga - b.tile.harga);

      if (milik.length > 0) {
        const disita = milik[0];
        delete this.state.properties[disita.tileIndex];
        const msg = `Tanah Disita Negara! Sertifikat "${disita.tile.nama}" milik ${player.nama} diambil alih negara tanpa ganti rugi.`;
        this._addLog("danger", msg);
        events.push({
          tipe: "LAND_CONFISCATED",
          playerId: player.id,
          tileIndex: disita.tileIndex,
          teks: msg,
        });
      } else {
        this._addLog(
          "info",
          `${player.nama} mendarat di Tanah Disita Negara, namun belum punya tanah. Aman!`,
        );
      }
      this._lanjutkanFaseSetelahEvaluasi(player);
      return;
    }

    if (
      tile.tipe === "PROPERTY" ||
      tile.tipe === "TRANSPORT" ||
      tile.tipe === "UTILITY"
    ) {
      const prop = this.state.properties[tileIndex];

      if (!prop || !prop.ownerId) {
        if (player.uang >= tile.harga) {
          this.state.fase = "WAIT_BUY_DECISION";
          this.state.petakBeliTertunda = tileIndex;
          events.push({
            tipe: "CAN_BUY",
            playerId: player.id,
            tileIndex,
            harga: tile.harga,
          });
        } else {
          this._addLog(
            "warn",
            `${player.nama} mendarat di ${tile.nama} (${formatRupiah(tile.harga)}), tetapi saldo tidak cukup untuk membeli.`,
          );
          this._lanjutkanFaseSetelahEvaluasi(player);
        }
        return;
      }

      if (prop.ownerId === player.id) {
        this._addLog(
          "info",
          `${player.nama} mendarat di aset sendiri: ${tile.nama}.`,
        );
        this._lanjutkanFaseSetelahEvaluasi(player);
        return;
      }

      // Tugas 4: Mendarat di tanah lawan -> tampilkan biaya sewa sesuai level bangunan
      const pemilik = this.state.players.find((p) => p.id === prop.ownerId);
      if (pemilik && !pemilik.bangkrut) {
        const totalDadu =
          this.state.daduTerakhir[0] + this.state.daduTerakhir[1];
        const nominalSewa = this.hitungSewa(tileIndex, totalDadu);
        const level = prop.level || 0;
        const labelBangunan =
          tile.tipe !== "PROPERTY"
            ? tile.tipe
            : level === 0
              ? this.punyaMonopoliGrup(pemilik.id, tile.grup)
                ? "Tanah Kosong (Monopoli x2)"
                : "Tanah Kosong"
              : level === 5
                ? "1 Hotel Megah"
                : `${level} Rumah`;

        const msg = `${player.nama} mendarat di ${tile.nama} (${labelBangunan}) dan membayar sewa ${formatRupiah(nominalSewa)} kepada ${pemilik.nama}.`;
        this._addLog("warn", msg);
        events.push({
          tipe: "PAY_RENT",
          dariId: player.id,
          namaPembayar: player.nama,
          keId: pemilik.id,
          namaPemilik: pemilik.nama,
          tileIndex,
          namaPetak: tile.nama,
          levelBangunan: level,
          labelBangunan,
          nominal: nominalSewa,
          teks: msg,
        });
        this._tagihPembayaran(
          player,
          nominalSewa,
          pemilik,
          `Sewa ${tile.nama}`,
          events,
        );
      }
      this._lanjutkanFaseSetelahEvaluasi(player);
      return;
    }

    if (tile.tipe === "TAX") {
      let jmlTanah = 0;
      let jmlBangunan = 0;
      for (const prop of Object.values(this.state.properties)) {
        if (prop.ownerId === player.id) {
          jmlTanah += 1;
          jmlBangunan += prop.level || 0;
        }
      }
      const totalPajak = jmlTanah * 50000 + jmlBangunan * 25000;
      if (totalPajak > 0) {
        const msg = `${player.nama} membayar Pajak Tahunan (${jmlTanah} tanah, ${jmlBangunan} bangunan) sebesar ${formatRupiah(totalPajak)}.`;
        this._addLog("warn", msg);
        events.push({
          tipe: "TAX_PAID",
          playerId: player.id,
          nominal: totalPajak,
          teks: msg,
        });
        this._tagihPembayaran(
          player,
          totalPajak,
          null,
          "Pajak Tahunan",
          events,
        );
      } else {
        this._addLog(
          "info",
          `${player.nama} bebas Pajak Tahunan karena belum memiliki aset tanah.`,
        );
      }
      this._lanjutkanFaseSetelahEvaluasi(player);
      return;
    }

    if (tile.tipe === "PUNGLI") {
      if (player.jumlahPungli >= 3) {
        const msg = `${player.nama} mendarat di petak Pungli, tetapi sudah KEBAL karena sudah 3x kena pungli sebelumnya!`;
        this._addLog("success", msg);
        events.push({ tipe: "PUNGLI_IMMUNE", playerId: player.id, teks: msg });
      } else {
        const nominal = this._randInt(1, 8) * 50000;
        player.jumlahPungli += 1;
        const statusKebal =
          player.jumlahPungli >= 3
            ? " (Sekarang resmi KEBAL Pungli!)"
            : ` (${player.jumlahPungli}/3)`;
        const msg = `${player.nama} kena Pungli Rp ${nominal.toLocaleString("id-ID")}${statusKebal}.`;
        this._addLog("danger", msg);
        events.push({
          tipe: "PUNGLI_HIT",
          playerId: player.id,
          nominal,
          jumlahPungli: player.jumlahPungli,
          teks: msg,
        });
        this._tagihPembayaran(player, nominal, null, "Pungli Oknum", events);
      }
      this._lanjutkanFaseSetelahEvaluasi(player);
      return;
    }

    if (tile.tipe === "DISASTER") {
      const bencana =
        DISASTER_TYPES[this._randInt(0, DISASTER_TYPES.length - 1)];
      const milikBerbangunan = Object.entries(this.state.properties)
        .filter(([, prop]) => prop.ownerId === player.id && prop.level > 0)
        .map(([idxStr, prop]) => ({ tileIndex: Number(idxStr), prop }));

      let infoBangunan = "Tidak ada bangunan yang terdampak.";
      let affectedTile = null;
      if (milikBerbangunan.length > 0) {
        const target =
          milikBerbangunan[this._randInt(0, milikBerbangunan.length - 1)];
        target.prop.level -= 1;
        affectedTile = target.tileIndex;
        infoBangunan = `Bangunan di ${BOARD_TILES[target.tileIndex].nama} turun ke level ${target.prop.level}.`;
      }

      const msg = `Bencana Alam (${bencana.nama})! ${player.nama} membayar biaya darurat Rp 100.000. ${infoBangunan}`;
      this._addLog("danger", msg);
      events.push({
        tipe: "DISASTER_HIT",
        playerId: player.id,
        jenisBencana: bencana.id,
        namaBencana: bencana.nama,
        nominal: 100000,
        tileIndex: affectedTile,
        teks: msg,
      });
      this._tagihPembayaran(player, 100000, null, bencana.nama, events);
      this._lanjutkanFaseSetelahEvaluasi(player);
      return;
    }

    // Tugas 3: Saat mendarat di petak TAKDIR / MUSIBAH, tahan eksekusi efek sampai pemain menekan tombol "OK"
    if (tile.tipe === "TAKDIR" || tile.tipe === "MUSIBAH") {
      const jenisDeck = tile.tipe;
      const deck =
        jenisDeck === "TAKDIR" ? this.state.takdirDeck : this.state.musibahDeck;
      const kartu = deck.shift();
      deck.push(kartu);

      this.state.fase = "WAIT_CARD_CONFIRM";
      this.state.kartuTertunda = {
        playerId: player.id,
        namaPemain: player.nama,
        jenisDeck,
        kartu,
      };

      this._addLog(
        "info",
        `${player.nama} mengambil Kartu ${jenisDeck === "TAKDIR" ? "Takdir" : "Musibah"}: "${kartu.judul}". Menunggu konfirmasi OK...`,
      );

      events.push({
        tipe: "CARD_DRAWN",
        playerId: player.id,
        namaPemain: player.nama,
        jenisDeck,
        kartu,
      });
      return;
    }

    this._lanjutkanFaseSetelahEvaluasi(player);
  }

  // Tugas 3: Efek kartu baru dijalankan SETELAH pemain menekan tombol "OK"
  confirmCard(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) {
      return {
        ok: false,
        pesan: "Hanya pemain yang sedang giliran yang dapat menekan OK.",
      };
    }
    if (this.state.fase !== "WAIT_CARD_CONFIRM" || !this.state.kartuTertunda) {
      return {
        ok: false,
        pesan: "Tidak ada kartu yang sedang menunggu konfirmasi.",
      };
    }

    const { jenisDeck, kartu } = this.state.kartuTertunda;
    this.state.kartuTertunda = null;

    const events = [
      {
        tipe: "CARD_CONFIRMED",
        playerId: player.id,
        namaPemain: player.nama,
        jenisDeck,
        kartu,
      },
    ];

    this._addLog(
      jenisDeck === "TAKDIR" ? "success" : "warn",
      `[Efek Kartu ${jenisDeck === "TAKDIR" ? "Takdir" : "Musibah"}] ${player.nama}: "${kartu.teks}"`,
    );

    this._terapkanEfekKartu(player, kartu, events);
    this._cekKondisiMenang(events);

    return {
      ok: true,
      events,
      state: this.getPublicState(),
    };
  }

  _terapkanEfekKartu(player, kartu, events) {
    if (kartu.tipe === "uang") {
      if (kartu.nilai >= 0) {
        player.uang += kartu.nilai;
        events.push({
          tipe: "CARD_MONEY_GAIN",
          playerId: player.id,
          nominal: kartu.nilai,
        });
      } else {
        this._tagihPembayaran(
          player,
          Math.abs(kartu.nilai),
          null,
          kartu.judul || "Kartu Musibah",
          events,
        );
      }
      this._lanjutkanFaseSetelahEvaluasi(player);
      return;
    }

    if (kartu.tipe === "pindah") {
      const asal = player.posisi;
      const tujuan = kartu.nilai;
      const lewatStart = tujuan < asal || tujuan === 0;
      const langkah = (tujuan - asal + 40) % 40;
      const jalur = [];
      for (let i = 1; i <= langkah; i++) {
        jalur.push((asal + i) % 40);
      }

      player.posisi = tujuan;
      events.push({
        tipe: "PLAYER_MOVED",
        playerId: player.id,
        dari: asal,
        ke: tujuan,
        jalur,
      });

      if (lewatStart) {
        player.uang += 200000;
        const msg = `${player.nama} melewati/mendarat di Start dan menerima Bansos Rp 200.000!`;
        this._addLog("success", msg);
        events.push({
          tipe: "PASS_START",
          playerId: player.id,
          nominal: 200000,
          teks: msg,
        });
      }

      this._evaluasiPetak(player, tujuan, events);
      return;
    }

    if (kartu.tipe === "penjara") {
      this._masukkanKePenjara(
        player,
        events,
        `${player.nama} masuk Lapas Cipinang akibat kartu "${kartu.judul}"!`,
      );
      return;
    }

    if (kartu.tipe === "bayarPerBangunan") {
      let totalBangunan = 0;
      for (const prop of Object.values(this.state.properties)) {
        if (prop.ownerId === player.id) {
          totalBangunan += prop.level || 0;
        }
      }
      const tagihan = totalBangunan * kartu.nilai;
      if (tagihan > 0) {
        this._addLog(
          "warn",
          `${player.nama} membayar ${formatRupiah(tagihan)} untuk ${totalBangunan} level bangunan.`,
        );
        this._tagihPembayaran(
          player,
          tagihan,
          null,
          kartu.judul || "Biaya Bangunan",
          events,
        );
      } else {
        this._addLog(
          "info",
          `${player.nama} tidak punya bangunan sehingga bebas biaya.`,
        );
      }
      this._lanjutkanFaseSetelahEvaluasi(player);
      return;
    }

    if (kartu.tipe === "terimaDariSemua") {
      for (const pLain of this.state.players) {
        if (pLain.id !== player.id && !pLain.bangkrut) {
          this._tagihPembayaran(
            pLain,
            kartu.nilai,
            player,
            `Sumbangan ke ${player.nama}`,
            events,
          );
        }
      }
      this._lanjutkanFaseSetelahEvaluasi(player);
    }
  }

  _masukkanKePenjara(player, events, alasan) {
    player.posisi = 10;
    player.diPenjara = true;
    player.giliranPenjara = 0;
    this.state.jumlahKembarBerturut = 0;
    this.state.bolehLemparLagi = false;
    this.state.petakBeliTertunda = null;
    this.state.kartuTertunda = null;
    this.state.fase = "WAIT_END_TURN";

    events.push({
      tipe: "GO_TO_JAIL",
      playerId: player.id,
      teks: alasan,
    });
  }

  buyProperty(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId)
      return { ok: false, pesan: "Bukan giliranmu." };
    if (
      this.state.fase !== "WAIT_BUY_DECISION" ||
      this.state.petakBeliTertunda === null
    ) {
      return {
        ok: false,
        pesan: "Tidak ada petak tanah yang sedang ditawarkan.",
      };
    }

    const tileIndex = this.state.petakBeliTertunda;
    const tile = BOARD_TILES[tileIndex];
    if (player.uang < tile.harga)
      return { ok: false, pesan: "Uang tidak cukup untuk membeli petak ini." };

    player.uang -= tile.harga;
    this.state.properties[tileIndex] = {
      ownerId: player.id,
      level: 0,
    };
    this.state.petakBeliTertunda = null;

    const msg = `${player.nama} resmi membeli "${tile.nama}" seharga ${formatRupiah(tile.harga)}.`;
    this._addLog("success", msg);

    this._lanjutkanFaseSetelahEvaluasi(player);

    return {
      ok: true,
      events: [
        {
          tipe: "PROPERTY_BOUGHT",
          playerId: player.id,
          tileIndex,
          harga: tile.harga,
          teks: msg,
        },
      ],
      state: this.getPublicState(),
    };
  }

  skipBuy(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId)
      return { ok: false, pesan: "Bukan giliranmu." };
    if (this.state.fase !== "WAIT_BUY_DECISION")
      return { ok: false, pesan: "Tidak sedang dalam keputusan beli tanah." };

    const tile = BOARD_TILES[this.state.petakBeliTertunda];
    this.state.petakBeliTertunda = null;
    this._addLog(
      "info",
      `${player.nama} memilih tidak membeli ${tile?.nama || "petak ini"}.`,
    );
    this._lanjutkanFaseSetelahEvaluasi(player);

    return {
      ok: true,
      events: [],
      state: this.getPublicState(),
    };
  }

  upgradeProperty(playerId, tileIndex) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId)
      return { ok: false, pesan: "Hanya bisa membangun saat giliranmu." };

    const tile = BOARD_TILES[tileIndex];
    const prop = this.state.properties[tileIndex];
    if (
      !tile ||
      tile.tipe !== "PROPERTY" ||
      !prop ||
      prop.ownerId !== playerId
    ) {
      return { ok: false, pesan: "Petak ini bukan tanah properti milikmu." };
    }
    if (prop.level >= 5)
      return { ok: false, pesan: "Sudah mencapai level maksimal (Hotel)." };
    if (player.uang < tile.biayaBangun)
      return {
        ok: false,
        pesan: `Uang tidak cukup (butuh ${formatRupiah(tile.biayaBangun)}).`,
      };

    player.uang -= tile.biayaBangun;
    prop.level += 1;

    const labelLevel =
      prop.level === 5 ? "HOTEL MEGAH" : `Rumah #${prop.level}`;
    const msg = `${player.nama} membangun ${labelLevel} di ${tile.nama} seharga ${formatRupiah(tile.biayaBangun)}.`;
    this._addLog("success", msg);

    return {
      ok: true,
      events: [
        {
          tipe: "PROPERTY_UPGRADED",
          playerId: player.id,
          tileIndex,
          level: prop.level,
          teks: msg,
        },
      ],
      state: this.getPublicState(),
    };
  }

  sellAsset(playerId, tileIndex) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId)
      return { ok: false, pesan: "Hanya bisa menjual aset saat giliranmu." };

    const tile = BOARD_TILES[tileIndex];
    const prop = this.state.properties[tileIndex];
    if (!tile || !prop || prop.ownerId !== playerId)
      return { ok: false, pesan: "Aset ini bukan milikmu." };

    if (prop.level > 0 && tile.biayaBangun) {
      const nilaiJual = Math.round(tile.biayaBangun * 0.5);
      prop.level -= 1;
      player.uang += nilaiJual;
      const msg = `${player.nama} menjual 1 bangunan di ${tile.nama} seharga ${formatRupiah(nilaiJual)} (50%).`;
      this._addLog("warn", msg);
      return {
        ok: true,
        events: [
          {
            tipe: "BUILDING_SOLD",
            playerId,
            tileIndex,
            level: prop.level,
            teks: msg,
          },
        ],
        state: this.getPublicState(),
      };
    }

    const nilaiJualTanah = Math.round(tile.harga * 0.5);
    delete this.state.properties[tileIndex];
    player.uang += nilaiJualTanah;
    const msg = `${player.nama} menjual tanah ${tile.nama} ke Bank seharga ${formatRupiah(nilaiJualTanah)} (50%).`;
    this._addLog("warn", msg);

    return {
      ok: true,
      events: [{ tipe: "PROPERTY_SOLD", playerId, tileIndex, teks: msg }],
      state: this.getPublicState(),
    };
  }

  endTurn(playerId) {
    if (this.state.fase === "GAME_OVER")
      return { ok: false, pesan: "Permainan sudah berakhir." };
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId)
      return { ok: false, pesan: "Bukan giliranmu." };
    if (this.state.fase !== "WAIT_END_TURN")
      return { ok: false, pesan: "Selesaikan aksi giliranmu terlebih dahulu." };

    const events = [];
    const totalPlayers = this.state.players.length;
    let nextIdx = this.state.giliranIndex;
    let wrappedAround = false;

    for (let i = 1; i <= totalPlayers; i++) {
      const candidate = (this.state.giliranIndex + i) % totalPlayers;
      if (candidate <= this.state.giliranIndex) wrappedAround = true;
      if (!this.state.players[candidate].bangkrut) {
        nextIdx = candidate;
        break;
      }
    }

    if (wrappedAround) {
      this.state.putaran += 1;
      if (this.state.putaran > this.state.maxPutaran) {
        this._selesaikanBatasPutaran(events);
        return { ok: true, events, state: this.getPublicState() };
      }
    }

    this.state.giliranIndex = nextIdx;
    this.state.jumlahKembarBerturut = 0;
    this.state.bolehLemparLagi = false;
    this.state.petakBeliTertunda = null;
    this.state.kartuTertunda = null;
    this.state.fase = "WAIT_ROLL";

    const nextPlayer = this.getCurrentPlayer();
    events.push({
      tipe: "TURN_CHANGED",
      playerId: nextPlayer.id,
      putaran: this.state.putaran,
    });

    return { ok: true, events, state: this.getPublicState() };
  }

  _tagihPembayaran(pembayar, nominal, penerima, keterangan, events) {
    pembayar.uang -= nominal;

    while (pembayar.uang < 0) {
      const milikBerbangunan = Object.entries(this.state.properties)
        .filter(([, prop]) => prop.ownerId === pembayar.id && prop.level > 0)
        .map(([idxStr, prop]) => ({
          tileIndex: Number(idxStr),
          tile: BOARD_TILES[Number(idxStr)],
          prop,
        }))
        .sort((a, b) => a.tile.biayaBangun - b.tile.biayaBangun);

      if (milikBerbangunan.length > 0) {
        const target = milikBerbangunan[0];
        const nilaiJual = Math.round(target.tile.biayaBangun * 0.5);
        target.prop.level -= 1;
        pembayar.uang += nilaiJual;
        const msg = `Likuidasi Utang: ${pembayar.nama} terpaksa menjual 1 bangunan di ${target.tile.nama} (+${formatRupiah(nilaiJual)}).`;
        this._addLog("warn", msg);
        events.push({
          tipe: "BUILDING_SOLD",
          playerId: pembayar.id,
          tileIndex: target.tileIndex,
          level: target.prop.level,
          teks: msg,
        });
        continue;
      }

      const milikTanah = Object.entries(this.state.properties)
        .filter(([, prop]) => prop.ownerId === pembayar.id)
        .map(([idxStr, prop]) => ({
          tileIndex: Number(idxStr),
          tile: BOARD_TILES[Number(idxStr)],
          prop,
        }))
        .sort((a, b) => a.tile.harga - b.tile.harga);

      if (milikTanah.length > 0) {
        const target = milikTanah[0];
        const nilaiJual = Math.round(target.tile.harga * 0.5);
        delete this.state.properties[target.tileIndex];
        pembayar.uang += nilaiJual;
        const msg = `Likuidasi Utang: ${pembayar.nama} terpaksa menjual sertifikat ${target.tile.nama} (+${formatRupiah(nilaiJual)}).`;
        this._addLog("warn", msg);
        events.push({
          tipe: "PROPERTY_SOLD",
          playerId: pembayar.id,
          tileIndex: target.tileIndex,
          teks: msg,
        });
        continue;
      }

      break;
    }

    if (pembayar.uang < 0) {
      const sisaMampuBayar = Math.max(0, nominal + pembayar.uang);
      if (penerima) penerima.uang += sisaMampuBayar;
      this._nyatakanBangkrut(pembayar, keterangan, events);
    } else if (penerima) {
      penerima.uang += nominal;
    }
  }

  _nyatakanBangkrut(player, penyebab, events) {
    player.bangkrut = true;
    player.uang = 0;
    player.diPenjara = false;
    this.state.bolehLemparLagi = false;

    const jumlahSudahBangkrut = this.state.players.filter(
      (p) => p.bangkrut,
    ).length;
    player.urutanBangkrut = jumlahSudahBangkrut;

    for (const [idxStr, prop] of Object.entries(this.state.properties)) {
      if (prop.ownerId === player.id) {
        delete this.state.properties[Number(idxStr)];
      }
    }

    const msg = `BANGKRUT! ${player.nama} tidak sanggup membayar ${penyebab} dan resmi gulung tikar!`;
    this._addLog("danger", msg);
    events.push({
      tipe: "PLAYER_BANKRUPT",
      playerId: player.id,
      teks: msg,
    });
  }

  _lanjutkanFaseSetelahEvaluasi(player) {
    if (player.bangkrut) {
      this.state.bolehLemparLagi = false;
      this.state.fase = "WAIT_END_TURN";
      return;
    }

    if (this.state.bolehLemparLagi && !player.diPenjara) {
      this.state.fase = "WAIT_ROLL";
      this._addLog(
        "info",
        `${player.nama} mendapat giliran lempar dadu lagi karena dadu kembar!`,
      );
    } else {
      this.state.fase = "WAIT_END_TURN";
    }
  }

  _cekKondisiMenang(events) {
    const bertahan = this.state.players.filter((p) => !p.bangkrut);
    if (bertahan.length <= 1) {
      const pemenang = bertahan[0] || this.state.players[0];
      this.state.fase = "GAME_OVER";
      this.state.pemenang = pemenang.id;

      const peringkat = [...this.state.players]
        .map((p) => ({
          id: p.id,
          nama: p.nama,
          warna: p.warna,
          bangkrut: p.bangkrut,
          urutanBangkrut: p.urutanBangkrut || 999,
          kekayaanBersih: this.hitungKekayaanBersih(p.id),
        }))
        .sort((a, b) => {
          if (a.bangkrut !== b.bangkrut) return a.bangkrut ? 1 : -1;
          if (a.bangkrut && b.bangkrut)
            return b.urutanBangkrut - a.urutanBangkrut;
          return b.kekayaanBersih - a.kekayaanBersih;
        });

      this.state.peringkatAkhir = peringkat;
      const msg = `PERMAINAN SELESAI! ${pemenang.nama} menjadi WNI terakhir yang bertahan secara finansial!`;
      this._addLog("success", msg);
      events.push({
        tipe: "GAME_OVER",
        pemenangId: pemenang.id,
        peringkat,
        teks: msg,
      });
    }
  }

  _selesaikanBatasPutaran(events) {
    this.state.fase = "GAME_OVER";
    const peringkat = [...this.state.players]
      .map((p) => ({
        id: p.id,
        nama: p.nama,
        warna: p.warna,
        bangkrut: p.bangkrut,
        urutanBangkrut: p.urutanBangkrut || 999,
        kekayaanBersih: this.hitungKekayaanBersih(p.id),
      }))
      .sort((a, b) => {
        if (a.bangkrut !== b.bangkrut) return a.bangkrut ? 1 : -1;
        if (!a.bangkrut && !b.bangkrut)
          return b.kekayaanBersih - a.kekayaanBersih;
        return b.urutanBangkrut - a.urutanBangkrut;
      });

    this.state.peringkatAkhir = peringkat;
    this.state.pemenang = peringkat[0].id;

    const msg = `Batas 80 Putaran Tercapai! ${peringkat[0].nama} menang dengan kekayaan bersih tertinggi (${formatRupiah(peringkat[0].kekayaanBersih)})!`;
    this._addLog("success", msg);
    events.push({
      tipe: "GAME_OVER",
      pemenangId: peringkat[0].id,
      peringkat,
      teks: msg,
    });
  }

  _addLog(tipe, teks) {
    this.state.log.unshift({
      id: `${Date.now()}-${Math.random()}`,
      tipe,
      teks,
    });
    if (this.state.log.length > 60) {
      this.state.log.pop();
    }
  }

  _randInt(min, max) {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
