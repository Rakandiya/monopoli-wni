// Modul Tumpukan Uang Tunai 3D (3D Stack of Cash) di Tiap Sisi Papan
// Menampilkan tumpukan fisik gepokan uang tunai Rupiah Rp 100.000 (Bank WNI)
// yang jumlah dan tingginya berubah secara dinamis & proporsional sesuai saldo masing-masing pemain.
//
// Dilengkapi dengan baki mewah bertepikan LED warna pemain, taburan koin emas,
// serta floating billboard badge nama & saldo kas yang selalu menghadap kamera.

import * as THREE from 'three';
import gsap from 'gsap';

export class CashStack3D {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Cache material & tekstur uang agar performa ringan 60+ FPS
    this.banknoteTextures = null;
    this.banknoteMaterials = null;
    this.coinMaterial = null;
    this.coinGeo = null;
    this.bundleGeo = null;

    // Data 4 slot baki pemain di 4 sisi dalam papan (open sea zone)
    // Sisi 0: Selatan / Depan (Player 0) -> Menghadap ke tengah (-Z)
    // Sisi 1: Barat / Kiri (Player 1)    -> Menghadap ke tengah (+X)
    // Sisi 2: Utara / Atas (Player 2)    -> Menghadap ke tengah (+Z)
    // Sisi 3: Timur / Kanan (Player 3)   -> Menghadap ke tengah (-X)
    this.sideConfigs = [
      { x: 0, z: 6.2, rotY: 0 },
      { x: -6.2, z: 0, rotY: -Math.PI / 2 },
      { x: 0, z: -6.2, rotY: Math.PI },
      { x: 6.2, z: 0, rotY: Math.PI / 2 }
    ];

    // Daftar objek tray pemain aktif
    this.playerTrays = [];
    this.playersData = [];

    this._initSharedAssets();
  }

  // =========================================================================
  // INISIALISASI MATERIAL & TEKSTUR PROCEDURAL GEPOKAN RUPIAH
  // =========================================================================
  _initSharedAssets() {
    // 1. Dimensi satu gepok uang (100 lembar pecahan Rp 100.000)
    // Panjang: 0.72, Lebar: 0.38, Tebal: 0.08
    this.bundleGeo = new THREE.BoxGeometry(0.72, 0.08, 0.38);

    // 2. Tekstur Wajah Atas Uang Rp 100.000 (Crimson Red + Segel Emas Bank WNI)
    const topCanvas = document.createElement('canvas');
    topCanvas.width = 512;
    topCanvas.height = 256;
    const ctx = topCanvas.getContext('2d');

    // Gradien merah khas pecahan 100 ribu
    const redGrad = ctx.createLinearGradient(0, 0, 512, 256);
    redGrad.addColorStop(0, '#be123c');
    redGrad.addColorStop(0.5, '#e11d48');
    redGrad.addColorStop(1, '#881337');
    ctx.fillStyle = redGrad;
    ctx.fillRect(0, 0, 512, 256);

    // Pola ornamen guilloche / kurva keamanan bank
    ctx.strokeStyle = 'rgba(254, 205, 211, 0.28)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(256, 128, 220 - i * 30, 100 - i * 14, (i * Math.PI) / 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Angka 100000 di sudut-sudut
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px "Segoe UI", sans-serif';
    ctx.fillText('100000', 18, 44);
    ctx.fillText('100000', 360, 238);

    // Pita Kertas Pengikat Bank (Paper Strap) di bagian tengah
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(206, 0, 100, 256);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.strokeRect(206, 0, 100, 256);

    ctx.save();
    ctx.translate(256, 128);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#78350f';
    ctx.font = '800 20px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BANK WNI', 0, -14);
    ctx.font = '700 13px "Segoe UI", sans-serif';
    ctx.fillText('100 LEMBAR • RP 100.000', 0, 6);
    ctx.fillStyle = '#b45309';
    ctx.font = '600 11px monospace';
    ctx.fillText('SERI WNI-2026-SULTAN', 0, 22);
    ctx.restore();

    const topTex = new THREE.CanvasTexture(topCanvas);
    topTex.anisotropy = 4;

    // 3. Tekstur Sisi Tumpukan Kertas Uang (Layered paper edge)
    const sideCanvas = document.createElement('canvas');
    sideCanvas.width = 256;
    sideCanvas.height = 64;
    const sCtx = sideCanvas.getContext('2d');

    sCtx.fillStyle = '#fef9c3'; // Kertas ivory
    sCtx.fillRect(0, 0, 256, 64);

    // Garis-garis halus lembaran uang
    sCtx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
    sCtx.lineWidth = 1;
    for (let y = 6; y < 64; y += 6) {
      sCtx.beginPath();
      sCtx.moveTo(0, y);
      sCtx.lineTo(256, y);
      sCtx.stroke();
    }

    // Sambungan pita selotip bank di sekeliling sisi
    sCtx.fillStyle = '#fef3c7';
    sCtx.fillRect(103, 0, 50, 64);
    sCtx.strokeStyle = '#d97706';
    sCtx.lineWidth = 2;
    sCtx.strokeRect(103, 0, 50, 64);

    const sideTex = new THREE.CanvasTexture(sideCanvas);
    sideTex.anisotropy = 4;

    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      roughness: 0.38,
      metalness: 0.08
    });

    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughness: 0.55,
      metalness: 0.05
    });

    // Urutan material BoxGeometry: 0:+X, 1:-X, 2:+Y (Top), 3:-Y (Bottom), 4:+Z, 5:-Z
    this.banknoteMaterials = [sideMat, sideMat, topMat, topMat, sideMat, sideMat];

    // Material Koin Emas
    this.coinMaterial = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.92,
      roughness: 0.18
    });
    this.coinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 14);
  }

  // =========================================================================
  // INISIALISASI BAKI & STACK DI TIAP SISI PEMAIN
  // =========================================================================
  initStacks(players = []) {
    // Bersihkan tray lama jika ada
    this.dispose();

    this.playersData = players;

    players.forEach((p, idx) => {
      if (idx >= this.sideConfigs.length) return;
      const config = this.sideConfigs[idx];

      const trayGroup = new THREE.Group();
      trayGroup.position.set(config.x, 0.26, config.z);
      trayGroup.rotation.y = config.rotY;

      // 1. Meja / Baki Kayu Mahoni Sultan
      const trayBaseGeo = new THREE.BoxGeometry(1.72, 0.08, 1.08);
      const trayBaseMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.55,
        metalness: 0.25
      });
      const trayBase = new THREE.Mesh(trayBaseGeo, trayBaseMat);
      trayBase.position.y = 0.04;
      trayBase.receiveShadow = true;
      trayBase.castShadow = true;
      trayGroup.add(trayBase);

      // Lis Emas Mewah di Bibir Baki
      const rimGeo = new THREE.BoxGeometry(1.78, 0.02, 1.14);
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.2,
        metalness: 0.85
      });
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.position.y = 0.08;
      trayGroup.add(rimMesh);

      // Garis Neon Warna Pemain di Bawah Baki
      const ledGeo = new THREE.BoxGeometry(1.82, 0.02, 1.18);
      const ledMat = new THREE.MeshStandardMaterial({
        color: p.warna || 0xef4444,
        emissive: p.warna || 0xef4444,
        emissiveIntensity: 0.65,
        roughness: 0.3
      });
      const ledMesh = new THREE.Mesh(ledGeo, ledMat);
      ledMesh.position.y = 0.01;
      trayGroup.add(ledMesh);

      // 2. Taburan Koin Emas di Sudut-Sudut Baki
      const coinPositions = [
        { x: -0.7, z: -0.4, r: 0.1 },
        { x: -0.66, z: -0.34, r: 0.4 },
        { x: 0.68, z: -0.38, r: -0.3 },
        { x: 0.72, z: -0.44, r: 0.8 },
        { x: -0.68, z: 0.4, r: 0.2 },
        { x: 0.69, z: 0.38, r: -0.5 }
      ];
      coinPositions.forEach((cp) => {
        const coin = new THREE.Mesh(this.coinGeo, this.coinMaterial);
        coin.position.set(cp.x, 0.09, cp.z);
        coin.rotation.y = cp.r;
        coin.castShadow = true;
        trayGroup.add(coin);
      });

      // 3. Grup Wadah Gepokan Uang (akan dibuat & diupdate dinamis sesuai saldo uang)
      const bundleGroup = new THREE.Group();
      bundleGroup.position.y = 0.08;
      trayGroup.add(bundleGroup);

      // 4. Floating Billboard Badge (Menampilkan Nama & Saldo Kas Pemain)
      const badgeSprite = this._buatBadgeSprite(p);
      badgeSprite.position.set(0, 0.95, 0);
      trayGroup.add(badgeSprite);

      this.group.add(trayGroup);

      this.playerTrays.push({
        playerId: p.id,
        playerIndex: idx,
        trayGroup,
        bundleGroup,
        badgeSprite,
        ledMat,
        currentUang: p.uang || 0,
        bundleMeshes: []
      });

      // Tampilkan tumpukan awal
      this._updateTrayMoney(this.playerTrays[idx], p.uang || 0, p);
    });
  }

  // =========================================================================
  // PEMBUATAN FLOATING BILLBOARD BADGE (NAMA & SALDO)
  // =========================================================================
  _buatBadgeSprite(player) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 140;
    this._gambarBadgeCanvas(canvas, player);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.85, 0.52, 1);
    sprite.userData = { canvas, tex };
    return sprite;
  }

  _gambarBadgeCanvas(canvas, player, customUang = null) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const uangVal = customUang !== null ? customUang : player.uang || 0;
    const isBankrupt = player.bangkrut || uangVal <= 0;

    // 1. Background Pill Kapsul Modern Transparan
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = player.warna || '#ef4444';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 124, 24);
    ctx.fill();
    ctx.stroke();

    // 2. Aksen Strip Warna Pemain di Kiri
    ctx.fillStyle = player.warna || '#ef4444';
    ctx.beginPath();
    ctx.roundRect(14, 14, 18, 112, [18, 0, 0, 18]);
    ctx.fill();

    // 3. Ikon Karakter
    ctx.font = '36px "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.ikonKarakter || '👤', 66, 70);

    // 4. Nama Pemain
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px "Segoe UI", sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    const namaText = player.nama || `Warga #${player.index + 1}`;
    ctx.fillText(namaText.length > 18 ? namaText.substring(0, 16) + '..' : namaText, 104, 46);

    // 5. Saldo Uang Kas
    if (isBankrupt) {
      ctx.fillStyle = '#ef4444';
      ctx.font = '900 28px "Segoe UI", sans-serif';
      ctx.fillText('BANGKRUT (0 ASET)', 104, 94);
    } else {
      ctx.fillStyle = '#4ade80';
      ctx.font = '900 32px "Segoe UI", sans-serif';
      const formatted = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(uangVal);
      ctx.fillText(formatted, 104, 95);
    }
    ctx.shadowBlur = 0;
  }

  // =========================================================================
  // UPDATE TUMPUKAN UANG TUNAI SECARA DINAMIS
  // =========================================================================
  syncCash(players = []) {
    players.forEach((p) => {
      const tray = this.playerTrays.find((t) => t.playerId === p.id);
      if (tray) {
        this._updateTrayMoney(tray, p.uang, p);
      }
    });
  }

  _updateTrayMoney(tray, uang, player) {
    tray.currentUang = uang;

    // 1. Perbarui tampilan Badge Canvas & Animasi Pantulan
    if (tray.badgeSprite?.userData?.canvas) {
      this._gambarBadgeCanvas(tray.badgeSprite.userData.canvas, player, uang);
      tray.badgeSprite.userData.tex.needsUpdate = true;

      // Pantulan scale badge jika nilai uang berubah
      gsap.fromTo(
        tray.badgeSprite.scale,
        { x: 2.1, y: 0.6 },
        { x: 1.85, y: 0.52, duration: 0.45, ease: 'back.out(2)' }
      );
    }

    // 2. Hitung jumlah gepokan uang (1 s/d 32 bundle) secara proporsional
    // Saldo <= 0          : 0 gepok
    // Saldo 200rb         : 2 gepok
    // Saldo 1 Juta        : 5 gepok
    // Saldo 2 Juta (Start): 8 gepok (2 lapis penuh 4 pilar)
    // Saldo 5 Juta        : 16 gepok (4 lapis penuh)
    // Saldo 10 Juta+      : 28-32 gepok (gunung piramida sultan)
    let targetCount = 0;
    if (uang > 0 && !player.bangkrut) {
      targetCount = Math.min(32, Math.max(1, Math.round(Math.pow(uang / 100000, 0.62) * 1.3)));
    }

    // Hapus gepokan lama
    while (tray.bundleGroup.children.length > 0) {
      const obj = tray.bundleGroup.children.pop();
      tray.bundleGroup.remove(obj);
    }
    tray.bundleMeshes = [];

    // Jika bangkrut / uang 0, tidak ada gepokan
    if (targetCount <= 0) {
      // Posisi badge turun ke dekat lantai baki
      gsap.to(tray.badgeSprite.position, { y: 0.52, duration: 0.4, ease: 'power2.out' });
      return;
    }

    // 3. Tata gepokan dalam format 4 kolom (2x2 grid) yang realistis & rapi
    const cols = [
      { x: -0.38, z: -0.22 },
      { x: 0.38, z: -0.22 },
      { x: -0.38, z: 0.22 },
      { x: 0.38, z: 0.22 }
    ];

    const hBundle = 0.08;
    let maxHeight = 0;

    for (let i = 0; i < targetCount; i++) {
      const mesh = new THREE.Mesh(this.bundleGeo, this.banknoteMaterials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      let bx, by, bz, bRotY;

      if (i < 24) {
        // Lapisan 1 s/d 6: 4 Kolom Grid 2x2
        const colIdx = i % 4;
        const layer = Math.floor(i / 4);
        const col = cols[colIdx];

        // Variasi jitter sudut & posisi organik agar tampak seperti gepokan asli buatan tangan
        const seed = (tray.playerIndex * 13 + i * 7) % 100;
        const jitterRot = ((seed - 50) / 50) * 0.06;
        const jitterX = ((seed % 10) - 5) * 0.003;
        const jitterZ = (((seed * 3) % 10) - 5) * 0.003;

        bx = col.x + jitterX;
        bz = col.z + jitterZ;
        by = layer * hBundle + hBundle / 2;
        bRotY = jitterRot;
      } else {
        // Lapisan 7+: Susun menyilang (Piramida Sultan) di atas kolom
        const extraIdx = i - 24;
        const layer = 6 + Math.floor(extraIdx / 2);
        const sideOffset = (extraIdx % 2 === 0 ? -1 : 1) * 0.18;

        bx = sideOffset;
        bz = 0;
        by = layer * hBundle + hBundle / 2;
        bRotY = Math.PI / 2 + ((i % 5) - 2) * 0.04;
      }

      mesh.position.set(bx, by, bz);
      mesh.rotation.y = bRotY;
      maxHeight = Math.max(maxHeight, by + hBundle / 2);

      // Efek animasi pop/jatuh bertingkat
      mesh.scale.set(0.01, 0.01, 0.01);
      gsap.to(mesh.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.35,
        delay: i * 0.015,
        ease: 'back.out(1.8)'
      });

      tray.bundleGroup.add(mesh);
      tray.bundleMeshes.push(mesh);
    }

    // 4. Sesuaikan ketinggian badge sprite agar selalu melayang anggun di atas tumpukan uang
    const targetBadgeY = 0.58 + maxHeight + 0.38;
    gsap.to(tray.badgeSprite.position, {
      y: targetBadgeY,
      duration: 0.5,
      ease: 'back.out(1.5)'
    });
  }

  // =========================================================================
  // ANIMASI UPDATE TIAP FRAME (FLOATING BADGE BOBBING)
  // =========================================================================
  update(dt, elapsed = 0) {
    // Gerakan melayang (hover) halus pada badge masing-masing pemain
    this.playerTrays.forEach((tray, idx) => {
      if (tray.badgeSprite) {
        const floatY = Math.sin(elapsed * 2.2 + idx * 1.5) * 0.025;
        tray.badgeSprite.position.y += floatY * dt * 4;
      }
    });
  }

  // =========================================================================
  // INTERAKSI KLIK BAKI UANG (PULSE & HIGHLIGHT)
  // =========================================================================
  getInteractiveObjects() {
    const list = [];
    this.playerTrays.forEach((t) => {
      if (t.trayGroup) {
        t.trayGroup.traverse((child) => {
          if (child.isMesh || child.isSprite) {
            child.userData.isCashTray = true;
            child.userData.playerId = t.playerId;
            list.push(child);
          }
        });
      }
    });
    return list;
  }

  pulseTray(playerId) {
    const tray = this.playerTrays.find((t) => t.playerId === playerId);
    if (!tray) return;

    gsap.fromTo(
      tray.trayGroup.scale,
      { x: 1.15, y: 1.25, z: 1.15 },
      { x: 1, y: 1, z: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.4)' }
    );

    if (tray.badgeSprite) {
      gsap.fromTo(
        tray.badgeSprite.scale,
        { x: 2.25, y: 0.65 },
        { x: 1.85, y: 0.52, duration: 0.45, ease: 'back.out(2)' }
      );
    }
  }

  dispose() {
    this.playerTrays.forEach((t) => {
      if (t.trayGroup) {
        this.group.remove(t.trayGroup);
      }
    });
    this.playerTrays = [];
  }
}
