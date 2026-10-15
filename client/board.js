// Papan 3D Prosedural WNI Simulator (Upgrade Estetika Arsitektur Rumah, Kavling, & Hotel):
// - Perbaikan elevasi Y: seluruh bangunan berdiri utuh di ATAS balok grup warna (anti-clipping)
// - Penggantian keping bulat penutup teks menjadi Sabuk Pemilik Bercahaya + Tiang Plang Sertifikat 3D
// - Arsitektur Rumah 4-Komponen InstancedMesh: Fondasi Batu, Dinding Fasad Vector 512px, Teras Timbul, & Atap Genteng Lebar
// - Arsitektur Hotel 4-Komponen InstancedMesh: Podium Lobi, Menara Kaca Emas, Mahkota Gedung, & Puncak Spire

import * as THREE from "three";
import gsap from "gsap";
import { BOARD_TILES } from "../shared/tiles.js";
import { getRegionalTheme } from "../shared/regionalThemes.js";

export class Board3D {
  constructor(scene) {
    this.scene = scene;
    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);

    this.archipelagoGroup = new THREE.Group();
    this.boardGroup.add(this.archipelagoGroup);
    this.coastGlowMaterials = [];

    this.tileCoordinates = [];
    this.tileMeshes = [];
    this.jailDoorPivot = null;

    this.maxHouses = 120;
    this.maxHotels = 25;

    // 4 Komponen InstancedMesh untuk Rumah agar proporsional & detail
    this.houseFoundationInst = null;
    this.houseWallInst = null;
    this.housePorchInst = null;
    this.houseRoofInst = null;

    // 4 Komponen InstancedMesh untuk Hotel Sultan
    this.hotelPodiumInst = null;
    this.hotelWallInst = null;
    this.hotelCrownInst = null;
    this.hotelRoofInst = null;

    this.tileBuildingMap = new Map();

    this.boardShakeTimer = 0;
    this.boardShakeIntensity = 0;

    this._hitungKoordinatPetak();
    this._bangunMejaDanTengahPapan();
    this._bangunPetaIndonesiaOrganik();
    this._bangun40PetakHidup();
    this._bangunSelLapas3D();
    this._bangunDekorasiPohonSmooth();
    this._bangunInstancedArsitekturMegah();
  }

  _hitungKoordinatPetak() {
    const cornerOffset = 9.15;
    const innerStep = 1.75;

    for (let i = 0; i < 40; i++) {
      let x = 0;
      let z = 0;
      let rotY = 0;
      const isCorner = i % 10 === 0;
      const side = Math.floor(i / 10);
      const posInSide = i % 10;

      if (i === 0) {
        x = cornerOffset;
        z = cornerOffset;
      } else if (i === 10) {
        x = -cornerOffset;
        z = cornerOffset;
      } else if (i === 20) {
        x = -cornerOffset;
        z = -cornerOffset;
      } else if (i === 30) {
        x = cornerOffset;
        z = -cornerOffset;
      } else if (side === 0) {
        x = (5 - posInSide) * innerStep;
        z = cornerOffset;
        rotY = 0; // Menghadap ke dalam tengah papan (-Z)
      } else if (side === 1) {
        x = -cornerOffset;
        z = (5 - posInSide) * innerStep;
        rotY = -Math.PI / 2; // Menghadap ke dalam tengah papan (+X)
      } else if (side === 2) {
        x = (posInSide - 5) * innerStep;
        z = -cornerOffset;
        rotY = Math.PI; // Menghadap ke dalam tengah papan (+Z)
      } else if (side === 3) {
        x = cornerOffset;
        z = (posInSide - 5) * innerStep;
        rotY = Math.PI / 2; // Menghadap ke dalam tengah papan (-X)
      }

      const tileData = BOARD_TILES[i];
      let height = 0.36;
      if (isCorner) height = 0.54;
      else if (tileData.tipe === "PROPERTY") height = 0.35 + (i / 40) * 0.14;
      else if (tileData.tipe === "DISASTER" || tileData.tipe === "PUNGLI")
        height = 0.46;

      // Tinggi tambahan pita warna di atas petak PROPERTY adalah 0.10
      const colorBarHeight = tileData.tipe === "PROPERTY" ? 0.1 : 0;

      this.tileCoordinates.push({
        x,
        y: height,
        z,
        rotY,
        isCorner,
        height,
        colorBarHeight,
        buildingBaseY: height + colorBarHeight,
      });
    }
  }

  getTileCenterPosition(tileIndex) {
    const c = this.tileCoordinates[tileIndex] || this.tileCoordinates[0];
    return new THREE.Vector3(c.x, c.y, c.z);
  }

  getTileCanvas(tileIndex) {
    return this.tileMeshes[tileIndex]?.canvas || null;
  }

  getTokenPositionOnTile(tileIndex, slotIndex = 0) {
    const coord = this.tileCoordinates[tileIndex];
    if (tileIndex === 10) {
      const cellOffsets = [
        { dx: -0.22, dz: -0.22 },
        { dx: 0.22, dz: -0.22 },
        { dx: -0.22, dz: 0.22 },
        { dx: 0.22, dz: 0.22 },
      ];
      const off = cellOffsets[slotIndex % 4];
      return new THREE.Vector3(coord.x + off.dx, coord.y, coord.z + off.dz);
    }

    if (coord.isCorner) {
      const cornerOffsets = [
        { dx: -0.28, dz: -0.28 },
        { dx: 0.28, dz: -0.28 },
        { dx: -0.28, dz: 0.28 },
        { dx: 0.28, dz: 0.28 },
      ];
      const off = cornerOffsets[slotIndex % 4];
      return new THREE.Vector3(coord.x + off.dx, coord.y, coord.z + off.dz);
    }

    // Untuk petak biasa: posisikan pion di area trotoar luar (local +Z) agar rapi dan tidak menginjak rumah/pita warna (local -Z)
    const offsets = [
      { dx: -0.34, dz: 0.38 },
      { dx: 0.34, dz: 0.38 },
      { dx: -0.34, dz: 0.06 },
      { dx: 0.34, dz: 0.06 },
    ];
    const off = offsets[slotIndex % 4];
    const localVec = new THREE.Vector3(off.dx, 0, off.dz);
    localVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), coord.rotY);
    return new THREE.Vector3(coord.x + localVec.x, coord.y, coord.z + localVec.z);
  }

  _bangunMejaDanTengahPapan() {
    const baseGeo = new THREE.BoxGeometry(22.4, 0.55, 22.4);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.65,
      metalness: 0.18,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.28;
    baseMesh.receiveShadow = true;
    this.boardGroup.add(baseMesh);

    const centerCanvas = this._buatTeksturLautTengah();
    const centerTex = new THREE.CanvasTexture(centerCanvas);
    centerTex.anisotropy = 4;

    const centerGeo = new THREE.BoxGeometry(15.6, 0.24, 15.6);
    const centerMat = new THREE.MeshStandardMaterial({
      map: centerTex,
      roughness: 0.4,
      metalness: 0.15,
    });
    const centerMesh = new THREE.Mesh(centerGeo, centerMat);
    centerMesh.position.y = 0.12;
    centerMesh.receiveShadow = true;
    this.boardGroup.add(centerMesh);
  }

  _buatTeksturLautTengah() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createRadialGradient(512, 512, 60, 512, 512, 720);
    grad.addColorStop(0, "#0284c7");
    grad.addColorStop(0.45, "#0369a1");
    grad.addColorStop(0.8, "#0c4a6e");
    grad.addColorStop(1, "#082f49");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle = "rgba(186, 230, 253, 0.12)";
    ctx.lineWidth = 3;
    for (let y = 60; y < 980; y += 48) {
      ctx.beginPath();
      for (let x = 40; x < 984; x += 64) {
        ctx.quadraticCurveTo(x + 16, y - 10, x + 32, y);
        ctx.quadraticCurveTo(x + 48, y + 10, x + 64, y);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(253, 224, 71, 0.35)";
    ctx.setLineDash([18, 12]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 490);
    ctx.lineTo(1024, 490);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.save();
    ctx.translate(512, 200);
    ctx.fillStyle = "#991b1b";
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(-320, -62, 640, 120, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = '900 56px "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("WNI SIMULATOR", 0, -4);

    ctx.fillStyle = "#fde047";
    ctx.font = '700 24px "Segoe UI", sans-serif';
    ctx.fillText("KERJA KERAS • BAYAR PAJAK • TETAP SANTUY", 0, 36);
    ctx.restore();

    this._gambarSlotKartu(ctx, 270, 790, "KARTU TAKDIR", "#eab308");
    this._gambarSlotKartu(ctx, 754, 790, "KARTU MUSIBAH", "#ef4444");

    return canvas;
  }

  _gambarSlotKartu(ctx, cx, cy, label, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(-145, -82, 290, 164, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = '800 27px "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(label, 0, 9);
    ctx.restore();
  }

  _bangunPetaIndonesiaOrganik() {
    const landMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.5,
      metalness: 0.08,
    });
    const highlandMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.55,
    });
    const volcanoMat = new THREE.MeshStandardMaterial({
      color: 0x065f46,
      roughness: 0.6,
    });
    const lavaMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
    });

    const buatPulauOrganik = (kontrolPoints, ketebalan = 0.22) => {
      const vec2Points = kontrolPoints.map(
        ([px, pz]) => new THREE.Vector2(px, pz),
      );
      const spline = new THREE.SplineCurve(vec2Points);
      const smoothPts = spline.getPoints(48);

      const shape = new THREE.Shape(smoothPts);
      shape.closePath();

      const glowGeo = new THREE.ShapeGeometry(shape);
      glowGeo.rotateX(Math.PI / 2);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.coastGlowMaterials.push(glowMat);
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.scale.set(1.07, 1, 1.07);
      glowMesh.position.y = 0.27;
      this.archipelagoGroup.add(glowMesh);

      const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
        depth: ketebalan,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.06,
        bevelSegments: 4,
        curveSegments: 32,
      });
      extrudeGeo.rotateX(Math.PI / 2);

      const islandMesh = new THREE.Mesh(extrudeGeo, landMat);
      islandMesh.position.y = 0.28 + ketebalan;
      islandMesh.castShadow = true;
      islandMesh.receiveShadow = true;
      this.archipelagoGroup.add(islandMesh);
    };

    buatPulauOrganik(
      [
        [-5.9, -1.8],
        [-5.2, -2.1],
        [-4.1, -1.2],
        [-3.0, -0.1],
        [-2.5, 0.7],
        [-3.1, 1.1],
        [-4.3, 0.2],
        [-5.5, -0.9],
        [-5.9, -1.8],
      ],
      0.24,
    );

    buatPulauOrganik(
      [
        [-2.3, 1.35],
        [-1.2, 1.42],
        [0.1, 1.52],
        [0.95, 1.62],
        [0.85, 2.02],
        [-0.4, 1.92],
        [-1.7, 1.82],
        [-2.4, 1.65],
        [-2.3, 1.35],
      ],
      0.22,
    );

    buatPulauOrganik(
      [
        [-2.0, -0.7],
        [-1.5, -1.6],
        [-0.2, -1.85],
        [0.65, -1.4],
        [0.75, -0.3],
        [0.2, 0.45],
        [-0.9, 0.4],
        [-1.85, 0.05],
        [-2.0, -0.7],
      ],
      0.25,
    );

    buatPulauOrganik(
      [
        [1.2, -1.1],
        [2.2, -1.35],
        [2.35, -0.85],
        [1.65, -0.45],
        [2.25, 0.1],
        [1.95, 0.65],
        [1.45, 0.55],
        [1.15, -0.2],
        [1.2, -1.1],
      ],
      0.22,
    );

    buatPulauOrganik(
      [
        [1.2, 1.65],
        [1.85, 1.68],
        [2.1, 1.95],
        [1.25, 1.92],
        [1.2, 1.65],
      ],
      0.18,
    );
    buatPulauOrganik(
      [
        [2.25, 1.72],
        [3.1, 1.76],
        [3.15, 2.02],
        [2.3, 1.98],
        [2.25, 1.72],
      ],
      0.18,
    );

    buatPulauOrganik(
      [
        [2.75, -0.8],
        [3.2, -0.65],
        [3.15, 0.05],
        [2.7, -0.1],
        [2.75, -0.8],
      ],
      0.18,
    );

    buatPulauOrganik(
      [
        [3.45, -0.55],
        [4.2, -0.85],
        [5.4, -0.45],
        [5.95, 0.35],
        [5.75, 1.15],
        [4.6, 0.95],
        [3.95, 0.35],
        [3.4, -0.1],
        [3.45, -0.55],
      ],
      0.26,
    );

    const volcanoList = [
      { x: -4.6, z: -0.9, scale: 1.0 },
      { x: -3.2, z: 0.4, scale: 0.85 },
      { x: -1.6, z: 1.65, scale: 0.9 },
      { x: -0.5, z: 1.72, scale: 1.1 },
      { x: 0.45, z: 1.78, scale: 1.05 },
      { x: -0.6, z: -0.7, scale: 0.95 },
      { x: 1.6, z: -0.2, scale: 0.9 },
      { x: 4.9, z: 0.35, scale: 1.25 },
    ];

    const coneGeo = new THREE.ConeGeometry(0.28, 0.52, 20);
    const craterGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.06, 16);

    for (const v of volcanoList) {
      const mGroup = new THREE.Group();
      mGroup.position.set(v.x, 0.5, v.z);
      mGroup.scale.setScalar(v.scale);

      const cone = new THREE.Mesh(coneGeo, volcanoMat);
      cone.position.y = 0.22;
      cone.castShadow = true;
      mGroup.add(cone);

      const crater = new THREE.Mesh(craterGeo, lavaMat);
      crater.position.y = 0.47;
      mGroup.add(crater);

      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 0.24, 20),
        highlandMat,
      );
      hill.position.set(0.12, 0.1, 0.08);
      mGroup.add(hill);

      this.archipelagoGroup.add(mGroup);
    }
  }

  _bangun40PetakHidup() {
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.8,
      roughness: 0.2,
    });

    for (let i = 0; i < 40; i++) {
      const tile = BOARD_TILES[i];
      const coord = this.tileCoordinates[i];

      const w = coord.isCorner ? 2.5 : 1.72;
      const d = 2.5;
      const h = coord.height;

      const texCanvas = this._buatTeksturPetakHidup(tile, coord.isCorner);
      const tex = new THREE.CanvasTexture(texCanvas);
      tex.anisotropy = 4;

      const sideMat = new THREE.MeshStandardMaterial({
        color: coord.isCorner ? 0x1e293b : 0x334155,
        roughness: 0.65,
      });
      const topMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: tile.tipe === "TRANSPORT" ? 0.75 : 0.48,
        metalness: 0.08,
      });

      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, [
        sideMat,
        sideMat,
        topMat,
        sideMat,
        sideMat,
        sideMat,
      ]);
      mesh.position.set(coord.x, h / 2, coord.z);
      mesh.rotation.y = coord.rotY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { tileIndex: i };

      // Pita grup warna timbul 3D dengan bevel bingkai rapi untuk petak PROPERTY
      if (tile.tipe === "PROPERTY") {
        const barH = coord.colorBarHeight; // 0.10
        const barGeo = new THREE.BoxGeometry(w * 0.95, barH, 0.56);
        const barMat = new THREE.MeshStandardMaterial({
          color: tile.warna,
          roughness: 0.35,
          metalness: 0.12,
        });
        const barMesh = new THREE.Mesh(barGeo, barMat);
        // Tempatkan tepat di atas permukaan petak (h/2 + barH/2)
        barMesh.position.set(0, h / 2 + barH / 2, -d / 2 + 0.31);
        barMesh.castShadow = true;
        barMesh.receiveShadow = true;
        mesh.add(barMesh);
      }

      // PENGGANTI KEPING BULAT:
      // Sabuk Cahaya Pemilik di bibir depan petak + Tiang Plang Sertifikat 3D di pojok kanan depan
      // (Tidak lagi menutupi tulisan harga Rp di tengah petak!)
      const ownerBadgeGroup = new THREE.Group();
      const ownerColorMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.2,
      });

      // 1. Sabuk Lis Depan Berwarna Pemilik
      const frontTrim = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.94, 0.08, 0.1),
        ownerColorMat,
      );
      frontTrim.position.set(0, h / 2 + 0.04, d / 2 - 0.08);
      ownerBadgeGroup.add(frontTrim);

      // 2. Tiang Plang Sertifikat 3D di Sudut Kanan Kavling
      const signPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.028, 0.42, 10),
        poleMat,
      );
      signPole.position.set(w / 2 - 0.2, h / 2 + 0.21, d / 2 - 0.22);
      signPole.castShadow = true;
      ownerBadgeGroup.add(signPole);

      const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.16, 0.04),
        ownerColorMat,
      );
      signBoard.position.set(w / 2 - 0.28, h / 2 + 0.34, d / 2 - 0.22);
      signBoard.castShadow = true;
      ownerBadgeGroup.add(signBoard);

      ownerBadgeGroup.visible = false;
      ownerBadgeGroup.userData.ownerMat = ownerColorMat;
      mesh.add(ownerBadgeGroup);

      this.boardGroup.add(mesh);
      this.tileMeshes.push({
        mesh,
        ownerBadge: ownerBadgeGroup,
        ownerMat: ownerColorMat,
        topTex: tex,
        canvas: texCanvas,
        sideMat,
        topMat,
        geo,
      });
    }
  }

  _buatTeksturPetakHidup(tile, isCorner) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");

    const theme = getRegionalTheme(tile.index);

    // 1. Latar Belakang Gradien Khas Daerah
    const grad = ctx.createLinearGradient(0, 0, 0, 360);
    if (theme.canvasGradient && theme.canvasGradient.length >= 2) {
      grad.addColorStop(0, theme.canvasGradient[0]);
      grad.addColorStop(1, theme.canvasGradient[1]);
    } else {
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(1, "#334155");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 360);

    // 2. Bingkai Luar & Aksen Kartu
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 352);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(8, 8, 240, 344);

    // 3. Panel Transparan Tengah Tempat Ilustrasi Ciri Khas
    const panelY = isCorner ? 104 : 88;
    const panelH = isCorner ? 190 : 206;
    ctx.fillStyle = "rgba(15, 23, 42, 0.44)";
    ctx.beginPath();
    ctx.roundRect(14, panelY, 228, panelH, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Gambar Ilustrasi Ciri Khas Daerah (Gedung Sate, Kujang, Sura & Baya, Pinisi, Candi Bentar, dll)
    if (typeof theme.drawIllustration === "function") {
      const illusCy = isCorner ? 222 : 216;
      theme.drawIllustration(ctx, 128, illusCy, 200, 110);
    }

    // 5. Header Bar Warna Grup Petak
    const headerH = isCorner ? 94 : 76;
    ctx.fillStyle = tile.warna || "#475569";
    ctx.fillRect(8, 8, 240, headerH);

    // Indeks & Ikon Daerah di Header Bar
    ctx.fillStyle = "#ffffff";
    ctx.font = '800 20px "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = 4;
    ctx.fillText(`${theme.ikon} #${tile.index}`, 128, isCorner ? 38 : 34);

    // Subjudul Grup / Kategori
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.font = '700 11.5px "Segoe UI", sans-serif';
    ctx.fillText(tile.namaGrup || tile.tipe, 128, isCorner ? 64 : 56);
    ctx.shadowBlur = 0;

    // 6. Nama Kota / Petak
    ctx.fillStyle = "#ffffff";
    ctx.font = '900 22px "Segoe UI", sans-serif';
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 6;
    const words = tile.nama.split(" ");
    const lines = [];
    let current = "";
    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      if (ctx.measureText(test).width > 200) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);

    let startY = isCorner ? 128 : 114;
    for (const line of lines) {
      ctx.fillText(line, 128, startY);
      startY += 26;
    }
    ctx.shadowBlur = 0;

    // Julukan Khas Daerah (e.g. "Paris van Java", "Planet Berbeda", "Kota Hujan")
    ctx.font = 'italic 700 12.5px "Segoe UI", sans-serif';
    ctx.fillStyle = theme.accentColor || "#fde047";
    ctx.fillText(theme.julukan, 128, startY + 2);

    // 7. Pill Harga / Tipe di Bagian Bawah
    const pillY = 304;
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.beginPath();
    ctx.roundRect(22, pillY, 212, 42, 21);
    ctx.fill();
    ctx.strokeStyle = theme.accentColor || "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    if (tile.harga) {
      ctx.fillStyle = "#4ade80";
      ctx.font = '900 22px "Segoe UI", sans-serif';
      const ribu = Math.round(tile.harga / 1000);
      ctx.fillText(`Rp ${ribu} Rb`, 128, pillY + 29);
    } else {
      ctx.fillStyle = theme.accentColor || "#38bdf8";
      ctx.font = '800 17px "Segoe UI", sans-serif';
      ctx.fillText(tile.tipe, 128, pillY + 27);
    }

    return canvas;
  }

  _bangunSelLapas3D() {
    const coord = this.tileCoordinates[10];
    const jailGroup = new THREE.Group();
    jailGroup.position.set(coord.x, coord.y, coord.z);

    const barMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.78,
      roughness: 0.25,
    });

    const doorBarMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.85,
      roughness: 0.2,
    });

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.1, 1.58), barMat);
    roof.position.y = 1.32;
    jailGroup.add(roof);

    const barGeo = new THREE.CylinderGeometry(0.036, 0.036, 1.32, 12);
    const barOffsets = [-0.66, -0.22, 0.22, 0.66];

    for (const ox of barOffsets) {
      const backBar = new THREE.Mesh(barGeo, barMat);
      backBar.position.set(ox, 0.66, -0.66);
      jailGroup.add(backBar);

      for (const sideX of [-0.66, 0.66]) {
        const sideBar = new THREE.Mesh(barGeo, barMat);
        sideBar.position.set(sideX, 0.66, ox);
        jailGroup.add(sideBar);
      }
    }

    this.jailDoorPivot = new THREE.Group();
    this.jailDoorPivot.position.set(-0.66, 0, 0.66);

    const railGeo = new THREE.BoxGeometry(1.32, 0.06, 0.06);
    const topRail = new THREE.Mesh(railGeo, doorBarMat);
    topRail.position.set(0.66, 1.18, 0);
    this.jailDoorPivot.add(topRail);

    const bottomRail = new THREE.Mesh(railGeo, doorBarMat);
    bottomRail.position.set(0.66, 0.15, 0);
    this.jailDoorPivot.add(bottomRail);

    for (const dx of [0.22, 0.66, 1.1, 1.32]) {
      const dBar = new THREE.Mesh(barGeo, doorBarMat);
      dBar.position.set(dx, 0.66, 0);
      this.jailDoorPivot.add(dBar);
    }

    jailGroup.add(this.jailDoorPivot);
    this.boardGroup.add(jailGroup);
  }

  openJailDoorImmediate() {
    if (!this.jailDoorPivot) return;
    gsap.killTweensOf(this.jailDoorPivot.rotation);
    this.jailDoorPivot.rotation.y = -Math.PI * 0.72;
  }

  animateJailDoorClose() {
    return new Promise((resolve) => {
      if (!this.jailDoorPivot) {
        resolve();
        return;
      }
      gsap.to(this.jailDoorPivot.rotation, {
        y: 0,
        duration: 0.36,
        ease: "bounce.out",
        onComplete: () => resolve(),
      });
    });
  }

  _bangunDekorasiPohonSmooth() {
    const treePositions = [
      [-6.3, -6.3],
      [6.3, -6.3],
      [-6.3, 6.3],
      [6.3, 6.3],
      [-6.3, 0],
      [6.3, 0],
      [0, -6.3],
      [0, 6.3],
      [-3.5, -5.8],
      [3.5, -5.8],
      [-3.5, 5.8],
      [3.5, 5.8],
    ];

    const count = treePositions.length;
    const trunkGeo = new THREE.CylinderGeometry(0.07, 0.14, 0.48, 16);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c2d0c,
      roughness: 0.75,
    });

    const foliage1Geo = new THREE.ConeGeometry(0.44, 0.52, 20);
    const foliage1Mat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.5,
    });

    const foliage2Geo = new THREE.ConeGeometry(0.35, 0.46, 20);
    const foliage2Mat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.48,
    });

    const foliage3Geo = new THREE.ConeGeometry(0.24, 0.38, 20);
    const foliage3Mat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.45,
    });

    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const f1Inst = new THREE.InstancedMesh(foliage1Geo, foliage1Mat, count);
    const f2Inst = new THREE.InstancedMesh(foliage2Geo, foliage2Mat, count);
    const f3Inst = new THREE.InstancedMesh(foliage3Geo, foliage3Mat, count);

    [trunkInst, f1Inst, f2Inst, f3Inst].forEach((inst) => {
      inst.castShadow = true;
      inst.receiveShadow = true;
      this.boardGroup.add(inst);
    });

    const dummy = new THREE.Object3D();
    treePositions.forEach(([tx, tz], idx) => {
      const s = 0.92 + (idx % 3) * 0.1;

      dummy.scale.setScalar(s);
      dummy.position.set(tx, 0.42, tz);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(tx, 0.72 * s, tz);
      dummy.updateMatrix();
      f1Inst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(tx, 0.98 * s, tz);
      dummy.updateMatrix();
      f2Inst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(tx, 1.22 * s, tz);
      dummy.updateMatrix();
      f3Inst.setMatrixAt(idx, dummy.matrix);
    });
  }

  // Tekstur Fasad Rumah Villa Tropis (512x512 digambar sinkron agar tajam & instan di Frame 1)
  _buatTeksturDindingRumah() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Dinding krem hangat modern
    ctx.fillStyle = "#fffbeb";
    ctx.fillRect(0, 0, 512, 512);

    // Pilar batu pojok kiri & kanan
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(0, 0, 38, 512);
    ctx.fillRect(474, 0, 38, 512);

    // Sabuk batu alam bawah & lis plafon atas
    ctx.fillStyle = "#475569";
    ctx.fillRect(0, 430, 512, 82);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(0, 0, 512, 34);

    // Pintu Utama Kayu Jati di Tengah + Kanopi
    ctx.fillStyle = "#451a03";
    ctx.fillRect(190, 210, 132, 290);
    ctx.fillStyle = "#78350f";
    ctx.fillRect(202, 222, 108, 270);
    // Panel ukiran pintu & gagang emas
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 6;
    ctx.strokeRect(216, 240, 80, 100);
    ctx.strokeRect(216, 360, 80, 110);
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(292, 355, 9, 0, Math.PI * 2);
    ctx.fill();

    // Jendela Kaca Menyala Kiri & Kanan
    const drawWindow = (wx, wy) => {
      // Bingkai kayu luar
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(wx, wy, 116, 150);
      // Kaca kuning hangat bercahaya
      const grad = ctx.createLinearGradient(wx, wy, wx, wy + 150);
      grad.addColorStop(0, "#fef08a");
      grad.addColorStop(1, "#f59e0b");
      ctx.fillStyle = grad;
      ctx.fillRect(wx + 12, wy + 12, 92, 126);
      // Palang jendela
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(wx + 54, wy + 12, 8, 126);
      ctx.fillRect(wx + 12, wy + 71, 92, 8);
      // Ambang jendela bawah
      ctx.fillStyle = "#64748b";
      ctx.fillRect(wx - 8, wy + 146, 132, 16);
    };

    drawWindow(52, 150);
    drawWindow(344, 150);

    // Ventilasi bovenlight di atas pintu
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(196, 148, 120, 44);
    ctx.fillStyle = "#bae6fd";
    ctx.fillRect(204, 156, 104, 28);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  // Tekstur Genteng Atap Rumah (512x512) agar atap memiliki garis-garis genteng yang jelas
  _buatTeksturGentengAtap() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 512);

    // Garis horizontal & lengkungan genteng
    ctx.strokeStyle = "rgba(15, 23, 42, 0.28)";
    ctx.lineWidth = 6;
    for (let y = 32; y < 512; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();

      for (let x = 0; x < 512; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 40);
        ctx.stroke();
      }
    }

    // Lisplank putih tegas di tepi bawah atap
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 476, 512, 36);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  // Tekstur Fasad Kaca Hotel Sultan (512x512)
  _buatTeksturFasadHotel() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 512, 512);

    // Bingkai pilar emas megah
    ctx.fillStyle = "#eab308";
    for (let x = 0; x <= 480; x += 120) {
      ctx.fillRect(x, 0, 28, 512);
    }
    for (let y = 0; y <= 480; y += 84) {
      ctx.fillRect(0, y, 512, 18);
    }

    // Jendela suite hotel bercahaya biru langit & emas
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 4; col++) {
        const wx = 34 + col * 120;
        const wy = 24 + row * 84;
        const isGoldSuite = (row + col) % 3 === 0;
        ctx.fillStyle = isGoldSuite ? "#fef08a" : "#38bdf8";
        ctx.fillRect(wx, wy, 80, 54);
      }
    }

    // Pintu Lobi Grand Ballroom di lantai dasar
    ctx.fillStyle = "#facc15";
    ctx.fillRect(130, 412, 252, 100);
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(150, 428, 212, 84);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }

  _bangunInstancedArsitekturMegah() {
    const houseWallTex = this._buatTeksturDindingRumah();
    const roofTileTex = this._buatTeksturGentengAtap();
    const hotelWallTex = this._buatTeksturFasadHotel();

    // =========================================================================
    // 1. KOMPONEN RUMAH VILLA TROPIS (4 InstancedMesh)
    // =========================================================================
    // a) Fondasi Batu (Plinth) di bawah rumah agar berdiri gagah di atas pita warna
    const hFoundGeo = new THREE.BoxGeometry(0.38, 0.06, 0.38);
    const hFoundMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
      metalness: 0.2,
    });
    this.houseFoundationInst = new THREE.InstancedMesh(
      hFoundGeo,
      hFoundMat,
      this.maxHouses,
    );
    this.houseFoundationInst.castShadow = true;
    this.houseFoundationInst.receiveShadow = true;

    // b) Dinding Utama Rumah bertekstur jendela & pintu
    const hWallGeo = new THREE.BoxGeometry(0.32, 0.26, 0.3);
    const hWallMat = new THREE.MeshStandardMaterial({
      map: houseWallTex,
      roughness: 0.35,
      metalness: 0.08,
    });
    this.houseWallInst = new THREE.InstancedMesh(
      hWallGeo,
      hWallMat,
      this.maxHouses,
    );
    this.houseWallInst.castShadow = true;
    this.houseWallInst.receiveShadow = true;

    // c) Teras / Jendela Bay Timbul Bercahaya Hangat
    const hPorchGeo = new THREE.BoxGeometry(0.35, 0.12, 0.16);
    const hPorchMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    this.housePorchInst = new THREE.InstancedMesh(
      hPorchGeo,
      hPorchMat,
      this.maxHouses,
    );
    this.housePorchInst.castShadow = true;

    // d) Atap Genteng Lebar (Overhang Tritisan)
    const hRoofGeo = new THREE.ConeGeometry(0.32, 0.24, 4);
    hRoofGeo.rotateY(Math.PI / 4);
    const hRoofMat = new THREE.MeshStandardMaterial({
      map: roofTileTex,
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
    });
    this.houseRoofInst = new THREE.InstancedMesh(
      hRoofGeo,
      hRoofMat,
      this.maxHouses,
    );
    this.houseRoofInst.castShadow = true;

    // =========================================================================
    // 2. KOMPONEN HOTEL SULTAN MEGAH (4 InstancedMesh)
    // =========================================================================
    // a) Podium Lobi Marmer
    const hotPodGeo = new THREE.BoxGeometry(0.62, 0.14, 0.5);
    const hotPodMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.5,
    });
    this.hotelPodiumInst = new THREE.InstancedMesh(
      hotPodGeo,
      hotPodMat,
      this.maxHotels,
    );
    this.hotelPodiumInst.castShadow = true;
    this.hotelPodiumInst.receiveShadow = true;

    // b) Menara Utama Kaca Emas
    const hotWallGeo = new THREE.BoxGeometry(0.5, 0.68, 0.42);
    const hotWallMat = new THREE.MeshStandardMaterial({
      map: hotelWallTex,
      roughness: 0.2,
      metalness: 0.45,
    });
    this.hotelWallInst = new THREE.InstancedMesh(
      hotWallGeo,
      hotWallMat,
      this.maxHotels,
    );
    this.hotelWallInst.castShadow = true;
    this.hotelWallInst.receiveShadow = true;

    // c) Mahkota Neon Emas di Puncak Gedung
    const hotCrownGeo = new THREE.BoxGeometry(0.56, 0.08, 0.48);
    const hotCrownMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });
    this.hotelCrownInst = new THREE.InstancedMesh(
      hotCrownGeo,
      hotCrownMat,
      this.maxHotels,
    );

    // d) Atap Mansard Merah & Puncak Menara
    const hotRoofGeo = new THREE.ConeGeometry(0.42, 0.32, 4);
    hotRoofGeo.rotateY(Math.PI / 4);
    const hotRoofMat = new THREE.MeshStandardMaterial({
      map: roofTileTex,
      color: 0xdc2626,
      roughness: 0.3,
      metalness: 0.3,
    });
    this.hotelRoofInst = new THREE.InstancedMesh(
      hotRoofGeo,
      hotRoofMat,
      this.maxHotels,
    );
    this.hotelRoofInst.castShadow = true;

    this._resetAllBuildingInstances();

    this.boardGroup.add(
      this.houseFoundationInst,
      this.houseWallInst,
      this.housePorchInst,
      this.houseRoofInst,
      this.hotelPodiumInst,
      this.hotelWallInst,
      this.hotelCrownInst,
      this.hotelRoofInst,
    );
  }

  _resetAllBuildingInstances() {
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.maxHouses; i++) {
      this.houseFoundationInst.setMatrixAt(i, zero);
      this.houseWallInst.setMatrixAt(i, zero);
      this.housePorchInst.setMatrixAt(i, zero);
      this.houseRoofInst.setMatrixAt(i, zero);
    }
    for (let i = 0; i < this.maxHotels; i++) {
      this.hotelPodiumInst.setMatrixAt(i, zero);
      this.hotelWallInst.setMatrixAt(i, zero);
      this.hotelCrownInst.setMatrixAt(i, zero);
      this.hotelRoofInst.setMatrixAt(i, zero);
    }
  }

  // Menyusun matriks 4 komponen Rumah di ATAS permukaan pita warna (worldPos.y = buildingBaseY)
  _setHouseCompositeMatrix(
    index,
    worldPos,
    rotY,
    scaleVec,
    roofColorHex = 0xea580c,
  ) {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color(roofColorHex);
    const baseY = worldPos.y;

    // 1. Fondasi Batu (tinggi 0.06)
    dummy.position.set(worldPos.x, baseY + 0.03 * scaleVec.y, worldPos.z);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.copy(scaleVec);
    dummy.updateMatrix();
    this.houseFoundationInst.setMatrixAt(index, dummy.matrix);

    // 2. Dinding Rumah (tinggi 0.26, di atas fondasi)
    dummy.position.set(
      worldPos.x,
      baseY + (0.06 + 0.13) * scaleVec.y,
      worldPos.z,
    );
    dummy.updateMatrix();
    this.houseWallInst.setMatrixAt(index, dummy.matrix);

    // 3. Teras / Jendela Timbul Menyala
    dummy.position.set(
      worldPos.x,
      baseY + (0.06 + 0.11) * scaleVec.y,
      worldPos.z,
    );
    dummy.updateMatrix();
    this.housePorchInst.setMatrixAt(index, dummy.matrix);

    // 4. Atap Genteng Lebar (di atas dinding)
    dummy.position.set(
      worldPos.x,
      baseY + (0.06 + 0.26 + 0.11) * scaleVec.y,
      worldPos.z,
    );
    dummy.scale.set(scaleVec.x * 1.08, scaleVec.y, scaleVec.z * 1.08);
    dummy.updateMatrix();
    this.houseRoofInst.setMatrixAt(index, dummy.matrix);
    this.houseRoofInst.setColorAt(index, color);
  }

  // Menyusun matriks 4 komponen Hotel Sultan di ATAS permukaan pita warna
  _setHotelCompositeMatrix(index, worldPos, rotY, scaleVec) {
    const dummy = new THREE.Object3D();
    const baseY = worldPos.y;

    // 1. Podium Lobi (tinggi 0.14)
    dummy.position.set(worldPos.x, baseY + 0.07 * scaleVec.y, worldPos.z);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.copy(scaleVec);
    dummy.updateMatrix();
    this.hotelPodiumInst.setMatrixAt(index, dummy.matrix);

    // 2. Menara Kaca Emas (tinggi 0.68)
    dummy.position.set(
      worldPos.x,
      baseY + (0.14 + 0.34) * scaleVec.y,
      worldPos.z,
    );
    dummy.updateMatrix();
    this.hotelWallInst.setMatrixAt(index, dummy.matrix);

    // 3. Mahkota Neon Gedung
    dummy.position.set(
      worldPos.x,
      baseY + (0.14 + 0.68 + 0.04) * scaleVec.y,
      worldPos.z,
    );
    dummy.updateMatrix();
    this.hotelCrownInst.setMatrixAt(index, dummy.matrix);

    // 4. Atap Puncak Hotel
    dummy.position.set(
      worldPos.x,
      baseY + (0.14 + 0.68 + 0.08 + 0.15) * scaleVec.y,
      worldPos.z,
    );
    dummy.updateMatrix();
    this.hotelRoofInst.setMatrixAt(index, dummy.matrix);
  }

  syncProperties(propertiesState, players) {
    const playerColorMap = {};
    for (const p of players) {
      playerColorMap[p.id] = p.warna;
    }

    // Update Sabuk Pemilik & Plang Sertifikat 3D di setiap petak yang dimiliki
    for (let i = 0; i < 40; i++) {
      const prop = propertiesState[i];
      const tileObj = this.tileMeshes[i];
      if (prop && prop.ownerId && playerColorMap[prop.ownerId]) {
        const ownerHex = playerColorMap[prop.ownerId];
        tileObj.ownerBadge.visible = true;
        tileObj.ownerMat.color.set(ownerHex);
        tileObj.ownerMat.emissive.set(ownerHex);
      } else {
        tileObj.ownerBadge.visible = false;
      }
    }

    this._resetAllBuildingInstances();
    this.tileBuildingMap.clear();

    let houseIdx = 0;
    let hotelIdx = 0;

    // Warna genteng berbeda yang kontras & estetik untuk tiap level rumah (Lv 1..4)
    const levelRoofColors = [0x16a34a, 0x16a34a, 0x0284c7, 0xd97706, 0xe11d48];

    for (const [tileIdxStr, prop] of Object.entries(propertiesState)) {
      const tileIndex = Number(tileIdxStr);
      if (!prop || !prop.ownerId) continue;

      const tile = BOARD_TILES[tileIndex];
      if (!tile || tile.tipe !== "PROPERTY") continue;

      const level = prop.level || 0;
      const coord = this.tileCoordinates[tileIndex];
      // PENTING: Gunakan buildingBaseY (tinggi petak + tinggi balok warna) agar bangunan TIDAK tenggelam!
      const baseY = coord.buildingBaseY;
      const records = [];

      if (level >= 5 && hotelIdx < this.maxHotels) {
        const localPos = new THREE.Vector3(0, 0, -0.94);
        localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), coord.rotY);
        const worldPos = new THREE.Vector3(
          coord.x + localPos.x,
          baseY,
          coord.z + localPos.z,
        );
        const targetScale = new THREE.Vector3(1.08, 1.08, 1.08);

        this._setHotelCompositeMatrix(
          hotelIdx,
          worldPos,
          coord.rotY,
          targetScale,
        );
        records.push({
          isHotel: true,
          instanceIndex: hotelIdx,
          worldPos,
          rotY: coord.rotY,
          targetScale,
        });
        hotelIdx++;
      } else if (level >= 1 && level <= 4) {
        for (let h = 0; h < level && houseIdx < this.maxHouses; h++) {
          const offsetX =
            level === 1 ? 0 : -0.54 + h * (1.08 / Math.max(1, level - 1));
          const localPos = new THREE.Vector3(offsetX, 0, -0.94);
          localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), coord.rotY);
          const worldPos = new THREE.Vector3(
            coord.x + localPos.x,
            baseY,
            coord.z + localPos.z,
          );

          const heightScale = 0.95 + h * 0.14;
          const targetScale = new THREE.Vector3(0.95, heightScale, 0.95);
          const roofColor = levelRoofColors[level] || 0x16a34a;

          this._setHouseCompositeMatrix(
            houseIdx,
            worldPos,
            coord.rotY,
            targetScale,
            roofColor,
          );
          records.push({
            isHotel: false,
            instanceIndex: houseIdx,
            worldPos,
            rotY: coord.rotY,
            targetScale,
            roofColor,
          });
          houseIdx++;
        }
      } else if (level === 0 && houseIdx < this.maxHouses) {
        // Saat baru Beli Tanah (Level 0): Tampilkan 1 Paviliun Kavling Utuh di atas pita warna
        // dengan atap berwarna sesuai pemilik (tidak lagi tenggelam!)
        const localPos = new THREE.Vector3(-0.48, 0, -0.94);
        localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), coord.rotY);
        const worldPos = new THREE.Vector3(
          coord.x + localPos.x,
          baseY,
          coord.z + localPos.z,
        );
        const targetScale = new THREE.Vector3(0.82, 0.82, 0.82);
        const ownerHex = playerColorMap[prop.ownerId] || 0x22c55e;

        this._setHouseCompositeMatrix(
          houseIdx,
          worldPos,
          coord.rotY,
          targetScale,
          ownerHex,
        );
        records.push({
          isHotel: false,
          instanceIndex: houseIdx,
          worldPos,
          rotY: coord.rotY,
          targetScale,
          roofColor: ownerHex,
        });
        houseIdx++;
      }

      this.tileBuildingMap.set(tileIndex, records);
    }

    this._markBuildingMatricesNeedsUpdate();
  }

  _markBuildingMatricesNeedsUpdate() {
    this.houseFoundationInst.instanceMatrix.needsUpdate = true;
    this.houseWallInst.instanceMatrix.needsUpdate = true;
    this.housePorchInst.instanceMatrix.needsUpdate = true;
    this.houseRoofInst.instanceMatrix.needsUpdate = true;
    if (this.houseRoofInst.instanceColor)
      this.houseRoofInst.instanceColor.needsUpdate = true;

    this.hotelPodiumInst.instanceMatrix.needsUpdate = true;
    this.hotelWallInst.instanceMatrix.needsUpdate = true;
    this.hotelCrownInst.instanceMatrix.needsUpdate = true;
    this.hotelRoofInst.instanceMatrix.needsUpdate = true;
  }

  animateBuildingRiseFromUnderground(tileIndex, propertiesState, players) {
    this.syncProperties(propertiesState, players);
    const records = this.tileBuildingMap.get(tileIndex);
    if (!records || records.length === 0) return Promise.resolve();

    const targetRec = records[records.length - 1];
    const animState = { progress: 0.01 };

    return new Promise((resolve) => {
      gsap.to(animState, {
        progress: 1,
        duration: 0.72,
        ease: "elastic.out(1, 0.55)",
        onUpdate: () => {
          const p = Math.max(0.01, animState.progress);
          const curScale = new THREE.Vector3(
            targetRec.targetScale.x * p,
            targetRec.targetScale.y * p,
            targetRec.targetScale.z * p,
          );
          const curPos = new THREE.Vector3(
            targetRec.worldPos.x,
            targetRec.worldPos.y - (1 - p) * 0.25,
            targetRec.worldPos.z,
          );

          if (targetRec.isHotel) {
            this._setHotelCompositeMatrix(
              targetRec.instanceIndex,
              curPos,
              targetRec.rotY,
              curScale,
            );
          } else {
            this._setHouseCompositeMatrix(
              targetRec.instanceIndex,
              curPos,
              targetRec.rotY,
              curScale,
              targetRec.roofColor,
            );
          }
          this._markBuildingMatricesNeedsUpdate();
        },
        onComplete: () => resolve(),
      });
    });
  }

  shakeBoard(intensity = 0.22, duration = 1.4) {
    this.boardShakeIntensity = intensity;
    this.boardShakeTimer = duration;
  }

  update(elapsedTime = 0, dt = 0.016) {
    this.archipelagoGroup.position.y = Math.sin(elapsedTime * 1.8) * 0.055;
    const glowOpacity = 0.32 + Math.sin(elapsedTime * 2.6) * 0.12;
    for (const mat of this.coastGlowMaterials) {
      mat.opacity = glowOpacity;
    }

    if (this.boardShakeTimer > 0) {
      this.boardShakeTimer -= dt;
      const damp = Math.max(0, this.boardShakeTimer);
      const mag = this.boardShakeIntensity * Math.min(1, damp * 1.5);
      this.boardGroup.position.set(
        (Math.random() - 0.5) * mag,
        (Math.random() - 0.5) * mag * 0.5,
        (Math.random() - 0.5) * mag,
      );
      this.boardGroup.rotation.z = (Math.random() - 0.5) * mag * 0.08;
    } else if (this.boardGroup.position.lengthSq() > 0.0001) {
      this.boardGroup.position.set(0, 0, 0);
      this.boardGroup.rotation.set(0, 0, 0);
    }
  }

  dispose() {
    this.boardGroup.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        } else {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      }
    });
  }
}
