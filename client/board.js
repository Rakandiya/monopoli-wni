// Pembuatan Papan 3D Prosedural WNI Simulator (Milestone 2):
// - 40 Petak dengan ketinggian berbeda, warna khas, dan CanvasTexture tajam
// - Peta kepulauan Indonesia poligon low-poly + emblem "WNI SIMULATOR" di tengah papan
// - Sel Lapas Cipinang 3D di petak 10 DENGAN PINTU BESI BERENGSEL (bisa membuka & menutup)
// - InstancedMesh untuk Rumah & Hotel dengan ANIMASI NAIK DARI BAWAH TANAH saat beli/bangun tanah

import * as THREE from 'three';
import gsap from 'gsap';
import { BOARD_TILES } from '../shared/tiles.js';

export class Board3D {
  constructor(scene) {
    this.scene = scene;
    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);

    this.tileCoordinates = [];
    this.tileMeshes = [];

    // Pivot pintu sel Lapas Cipinang (#10) untuk animasi membuka & menutup
    this.jailDoorPivot = null;

    // InstancedMesh untuk rumah & hotel agar performa tetap 60 FPS
    this.houseInstancedMesh = null;
    this.hotelInstancedMesh = null;
    this.maxHouses = 120;
    this.maxHotels = 25;

    // Menyimpan daftar instance bangunan per petak agar bisa dianimasikan naik dari bawah tanah
    this.tileBuildingMap = new Map();

    this._hitungKoordinatPetak();
    this._bangunMejaDanTengahPapan();
    this._bangunPetaIndonesia3D();
    this._bangun40Petak();
    this._bangunSelLapas3D();
    this._bangunDekorasiInstanced();
    this._bangunInstancedBangunan();
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
        rotY = 0;
      } else if (side === 1) {
        x = -cornerOffset;
        z = (5 - posInSide) * innerStep;
        rotY = Math.PI / 2;
      } else if (side === 2) {
        x = (posInSide - 5) * innerStep;
        z = -cornerOffset;
        rotY = Math.PI;
      } else if (side === 3) {
        x = cornerOffset;
        z = (posInSide - 5) * innerStep;
        rotY = -Math.PI / 2;
      }

      const tileData = BOARD_TILES[i];
      let height = 0.36;
      if (isCorner) height = 0.52;
      else if (tileData.tipe === 'PROPERTY') height = 0.34 + (i / 40) * 0.14;
      else if (tileData.tipe === 'DISASTER' || tileData.tipe === 'PUNGLI') height = 0.45;

      this.tileCoordinates.push({ x, y: height, z, rotY, isCorner, height });
    }
  }

  getTileCenterPosition(tileIndex) {
    const c = this.tileCoordinates[tileIndex] || this.tileCoordinates[0];
    return new THREE.Vector3(c.x, c.y, c.z);
  }

  getTokenPositionOnTile(tileIndex, slotIndex = 0) {
    const coord = this.tileCoordinates[tileIndex];
    // Jika di petak 10 (Lapas), tempatkan agak ke tengah sel
    if (tileIndex === 10) {
      const cellOffsets = [
        { dx: -0.22, dz: -0.22 },
        { dx: 0.22, dz: -0.22 },
        { dx: -0.22, dz: 0.22 },
        { dx: 0.22, dz: 0.22 }
      ];
      const off = cellOffsets[slotIndex % 4];
      return new THREE.Vector3(coord.x + off.dx, coord.y, coord.z + off.dz);
    }

    const offsets = [
      { dx: -0.35, dz: -0.35 },
      { dx: 0.35, dz: -0.35 },
      { dx: -0.35, dz: 0.35 },
      { dx: 0.35, dz: 0.35 }
    ];
    const off = offsets[slotIndex % 4];
    return new THREE.Vector3(coord.x + off.dx, coord.y, coord.z + off.dz);
  }

  _bangunMejaDanTengahPapan() {
    const baseGeo = new THREE.BoxGeometry(22.2, 0.5, 22.2);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.15
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.25;
    baseMesh.receiveShadow = true;
    this.boardGroup.add(baseMesh);

    const centerCanvas = this._buatTeksturTengahPapan();
    const centerTex = new THREE.CanvasTexture(centerCanvas);
    centerTex.anisotropy = 4;

    const centerGeo = new THREE.BoxGeometry(15.6, 0.22, 15.6);
    const centerMat = new THREE.MeshStandardMaterial({
      map: centerTex,
      roughness: 0.55,
      metalness: 0.1
    });
    const centerMesh = new THREE.Mesh(centerGeo, centerMat);
    centerMesh.position.y = 0.11;
    centerMesh.receiveShadow = true;
    this.boardGroup.add(centerMesh);
  }

  _buatTeksturTengahPapan() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(512, 512, 80, 512, 512, 700);
    grad.addColorStop(0, '#0c4a6e');
    grad.addColorStop(0.6, '#082f49');
    grad.addColorStop(1, '#041e30');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 2;
    for (let p = 128; p < 1024; p += 128) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 1024);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(1024, p);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(0, 480);
    ctx.lineTo(1024, 480);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.save();
    ctx.translate(512, 230);
    ctx.fillStyle = '#b91c1c';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(-310, -65, 620, 125, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 58px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WNI SIMULATOR', 0, -2);

    ctx.fillStyle = '#fde047';
    ctx.font = '700 26px "Segoe UI", sans-serif';
    ctx.fillText('KERJA KERAS, KENA PAJAK, TETAP SENYUM', 0, 40);
    ctx.restore();

    this._gambarSlotKartu(ctx, 270, 770, 'KARTU TAKDIR', '#ca8a04');
    this._gambarSlotKartu(ctx, 754, 770, 'KARTU MUSIBAH', '#dc2626');

    return canvas;
  }

  _gambarSlotKartu(ctx, cx, cy, label, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(-140, -85, 280, 170, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = '800 28px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 8);
    ctx.restore();
  }

  _bangunPetaIndonesia3D() {
    const islandMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.65,
      metalness: 0.05
    });
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.7
    });

    const islands = [
      [
        [-5.6, -1.6],
        [-4.9, -2.0],
        [-2.7, 0.3],
        [-3.2, 0.9],
        [-5.4, -1.0]
      ],
      [
        [-2.5, 1.3],
        [0.6, 1.5],
        [0.7, 2.0],
        [-2.4, 1.8]
      ],
      [
        [-1.8, -1.5],
        [0.4, -1.7],
        [0.7, -0.1],
        [-0.5, 0.4],
        [-1.9, -0.3]
      ],
      [
        [1.3, -1.2],
        [2.4, -1.0],
        [1.9, 0.5],
        [1.1, 0.3]
      ],
      [
        [1.0, 1.6],
        [2.8, 1.7],
        [2.8, 2.0],
        [1.0, 1.9]
      ],
      [
        [3.4, -0.7],
        [5.6, -0.3],
        [5.8, 0.8],
        [4.1, 0.7],
        [3.3, 0.1]
      ]
    ];

    for (const pts of islands) {
      const shape = new THREE.Shape();
      shape.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        shape.lineTo(pts[i][0], pts[i][1]);
      }
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.18,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 1
      });
      geo.rotateX(Math.PI / 2);

      const mesh = new THREE.Mesh(geo, islandMat);
      mesh.position.y = 0.4;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.boardGroup.add(mesh);
    }

    const coneGeo = new THREE.ConeGeometry(0.28, 0.45, 6);
    const volcanoPositions = [
      [-4.1, -0.5],
      [-0.8, 1.65],
      [0.1, 1.72],
      [-0.6, -0.7],
      [4.6, 0.2]
    ];
    for (const [vx, vz] of volcanoPositions) {
      const cone = new THREE.Mesh(coneGeo, mountainMat);
      cone.position.set(vx, 0.55, vz);
      cone.castShadow = true;
      this.boardGroup.add(cone);
    }
  }

  _bangun40Petak() {
    for (let i = 0; i < 40; i++) {
      const tile = BOARD_TILES[i];
      const coord = this.tileCoordinates[i];

      const w = coord.isCorner ? 2.5 : 1.72;
      const d = 2.5;
      const h = coord.height;

      const texCanvas = this._buatTeksturPetak(tile, coord.isCorner);
      const tex = new THREE.CanvasTexture(texCanvas);
      tex.anisotropy = 4;

      const sideMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.65
      });
      const topMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.45,
        metalness: 0.08
      });

      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]);
      mesh.position.set(coord.x, h / 2, coord.z);
      mesh.rotation.y = coord.rotY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { tileIndex: i };

      if (tile.tipe === 'PROPERTY') {
        const barGeo = new THREE.BoxGeometry(w * 0.94, 0.1, 0.48);
        const barMat = new THREE.MeshStandardMaterial({
          color: tile.warna,
          roughness: 0.35,
          metalness: 0.15
        });
        const barMesh = new THREE.Mesh(barGeo, barMat);
        barMesh.position.set(0, h / 2 + 0.05, -d / 2 + 0.28);
        barMesh.castShadow = true;
        mesh.add(barMesh);
      }

      const ownerRingGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12);
      const ownerRingMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3
      });
      const ownerBadge = new THREE.Mesh(ownerRingGeo, ownerRingMat);
      ownerBadge.position.set(0, h / 2 + 0.03, d / 2 - 0.24);
      ownerBadge.visible = false;
      mesh.add(ownerBadge);

      this.boardGroup.add(mesh);
      this.tileMeshes.push({ mesh, ownerBadge });
    }
  }

  _buatTeksturPetak(tile, isCorner) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = isCorner ? '#1e293b' : '#f8fafc';
    ctx.fillRect(0, 0, 256, 360);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 352);

    ctx.fillStyle = tile.warna || '#475569';
    ctx.fillRect(8, 8, 240, isCorner ? 95 : 78);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '800 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`#${tile.index}`, 128, isCorner ? 42 : 36);

    ctx.fillStyle = isCorner ? '#fef08a' : '#0f172a';
    ctx.font = '800 26px "Segoe UI", sans-serif';
    const words = tile.nama.split(' ');
    const lines = [];
    let current = '';
    for (const w of words) {
      const test = current ? `${current} ${w}` : w;
      if (ctx.measureText(test).width > 215) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);

    let startY = isCorner ? 160 : 145;
    for (const line of lines) {
      ctx.fillText(line, 128, startY);
      startY += 32;
    }

    ctx.font = '700 24px "Segoe UI", sans-serif';
    ctx.fillStyle = isCorner ? '#cbd5e1' : '#b91c1c';
    if (tile.harga) {
      const ribu = Math.round(tile.harga / 1000);
      ctx.fillText(`Rp ${ribu} Rb`, 128, 315);
    } else {
      ctx.fillStyle = isCorner ? '#38bdf8' : '#475569';
      ctx.font = '700 20px "Segoe UI", sans-serif';
      ctx.fillText(tile.tipe, 128, 315);
    }

    return canvas;
  }

  // Sel Lapas Cipinang 3D di petak #10 dengan Pintu Besi Berengsel yang bisa membuka & menutup
  _bangunSelLapas3D() {
    const coord = this.tileCoordinates[10];
    const jailGroup = new THREE.Group();
    jailGroup.position.set(coord.x, coord.y, coord.z);

    const barMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.78,
      roughness: 0.25
    });

    const doorBarMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.85,
      roughness: 0.2
    });

    // Atap kerangkeng
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.09, 1.56), barMat);
    roof.position.y = 1.28;
    jailGroup.add(roof);

    const barGeo = new THREE.CylinderGeometry(0.036, 0.036, 1.28, 6);
    const barOffsets = [-0.66, -0.22, 0.22, 0.66];

    // Sisi belakang (-Z), kiri (-X), dan kanan (+X) tetap statis
    for (const ox of barOffsets) {
      // Belakang (-Z)
      const backBar = new THREE.Mesh(barGeo, barMat);
      backBar.position.set(ox, 0.64, -0.66);
      jailGroup.add(backBar);

      // Kiri (-X) & Kanan (+X)
      for (const sideX of [-0.66, 0.66]) {
        const sideBar = new THREE.Mesh(barGeo, barMat);
        sideBar.position.set(sideX, 0.64, ox);
        jailGroup.add(sideBar);
      }
    }

    // Sisi depan (+Z) dijadikan Pintu Sel Berengsel di sudut kiri depan (-0.66, 0, +0.66)
    this.jailDoorPivot = new THREE.Group();
    this.jailDoorPivot.position.set(-0.66, 0, 0.66);

    // Palang horizontal pintu sel
    const railGeo = new THREE.BoxGeometry(1.32, 0.06, 0.06);
    const topRail = new THREE.Mesh(railGeo, doorBarMat);
    topRail.position.set(0.66, 1.15, 0);
    this.jailDoorPivot.add(topRail);

    const bottomRail = new THREE.Mesh(railGeo, doorBarMat);
    bottomRail.position.set(0.66, 0.15, 0);
    this.jailDoorPivot.add(bottomRail);

    // Jeruji vertikal pada pintu sel
    const doorBarPositions = [0.22, 0.66, 1.1, 1.32];
    for (const dx of doorBarPositions) {
      const dBar = new THREE.Mesh(barGeo, doorBarMat);
      dBar.position.set(dx, 0.64, 0);
      this.jailDoorPivot.add(dBar);
    }

    jailGroup.add(this.jailDoorPivot);
    this.boardGroup.add(jailGroup);
  }

  // Buka pintu sel Lapas sebelum token dimasukkan
  openJailDoorImmediate() {
    if (!this.jailDoorPivot) return;
    gsap.killTweensOf(this.jailDoorPivot.rotation);
    this.jailDoorPivot.rotation.y = -Math.PI * 0.68;
  }

  // Animasi pintu sel Lapas menutup keras
  animateJailDoorClose() {
    return new Promise((resolve) => {
      if (!this.jailDoorPivot) {
        resolve();
        return;
      }
      gsap.to(this.jailDoorPivot.rotation, {
        y: 0,
        duration: 0.32,
        ease: 'bounce.out',
        onComplete: () => resolve()
      });
    });
  }

  _bangunDekorasiInstanced() {
    const treePositions = [
      [-6.3, -6.3],
      [6.3, -6.3],
      [-6.3, 6.3],
      [6.3, 6.3],
      [-6.3, 0],
      [6.3, 0],
      [0, -6.3],
      [0, 6.3]
    ];

    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.45, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const crownGeo = new THREE.ConeGeometry(0.38, 0.85, 7);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });

    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
    const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, treePositions.length);
    trunkInst.castShadow = true;
    crownInst.castShadow = true;

    const dummy = new THREE.Object3D();
    treePositions.forEach(([tx, tz], idx) => {
      dummy.position.set(tx, 0.42, tz);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(tx, 0.95, tz);
      dummy.updateMatrix();
      crownInst.setMatrixAt(idx, dummy.matrix);
    });

    this.boardGroup.add(trunkInst);
    this.boardGroup.add(crownInst);
  }

  _bangunInstancedBangunan() {
    // Geometri rumah 3D (kotak dengan atap limas melalui Cylinder 4 sisi atau Box)
    const houseGeo = new THREE.BoxGeometry(0.3, 0.32, 0.3);
    const houseMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.35,
      metalness: 0.15
    });
    this.houseInstancedMesh = new THREE.InstancedMesh(houseGeo, houseMat, this.maxHouses);
    this.houseInstancedMesh.castShadow = true;
    this.houseInstancedMesh.receiveShadow = true;

    const hotelGeo = new THREE.CylinderGeometry(0.25, 0.32, 0.66, 6);
    const hotelMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.25,
      metalness: 0.45
    });
    this.hotelInstancedMesh = new THREE.InstancedMesh(hotelGeo, hotelMat, this.maxHotels);
    this.hotelInstancedMesh.castShadow = true;
    this.hotelInstancedMesh.receiveShadow = true;

    const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.maxHouses; i++) {
      this.houseInstancedMesh.setMatrixAt(i, zeroMatrix);
    }
    for (let i = 0; i < this.maxHotels; i++) {
      this.hotelInstancedMesh.setMatrixAt(i, zeroMatrix);
    }

    this.boardGroup.add(this.houseInstancedMesh);
    this.boardGroup.add(this.hotelInstancedMesh);
  }

  // Sinkronisasi seluruh kepemilikan tanah, rumah, dan hotel
  // Saat tanah dibeli (level 0), 1 rumah patok kepemilikan ditampilkan di petak.
  // Saat di-upgrade (level 1..4), ditampilkan 1..4 rumah penuh, dan level 5 = 1 Hotel.
  syncProperties(propertiesState, players) {
    const playerColorMap = {};
    for (const p of players) {
      playerColorMap[p.id] = p.warna;
    }

    for (let i = 0; i < 40; i++) {
      const prop = propertiesState[i];
      const badge = this.tileMeshes[i].ownerBadge;
      if (prop && prop.ownerId && playerColorMap[prop.ownerId]) {
        badge.visible = true;
        badge.material.color.set(playerColorMap[prop.ownerId]);
      } else {
        badge.visible = false;
      }
    }

    const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.maxHouses; i++) {
      this.houseInstancedMesh.setMatrixAt(i, zeroMatrix);
    }
    for (let i = 0; i < this.maxHotels; i++) {
      this.hotelInstancedMesh.setMatrixAt(i, zeroMatrix);
    }

    this.tileBuildingMap.clear();
    const dummy = new THREE.Object3D();
    let houseIdx = 0;
    let hotelIdx = 0;

    for (const [tileIdxStr, prop] of Object.entries(propertiesState)) {
      const tileIndex = Number(tileIdxStr);
      if (!prop || !prop.ownerId) continue;

      const level = prop.level || 0;
      const coord = this.tileCoordinates[tileIndex];
      const records = [];

      if (level >= 5 && hotelIdx < this.maxHotels) {
        const localPos = new THREE.Vector3(0, coord.height + 0.33, -0.95);
        localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), coord.rotY);
        const worldPos = new THREE.Vector3(coord.x + localPos.x, localPos.y, coord.z + localPos.z);

        dummy.position.copy(worldPos);
        dummy.rotation.set(0, coord.rotY, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.hotelInstancedMesh.setMatrixAt(hotelIdx, dummy.matrix);

        records.push({
          isHotel: true,
          instanceIndex: hotelIdx,
          worldPos,
          rotY: coord.rotY,
          targetScale: new THREE.Vector3(1, 1, 1)
        });
        hotelIdx++;
      } else {
        // Jika baru beli tanah (level 0), tampilkan 1 rumah patok (skala 0.78) agar animasi "rumah naik dari bawah tanah" langsung terlihat!
        // Jika level 1..4, tampilkan sejumlah level dengan skala penuh 1.0.
        const count = level === 0 ? 1 : level;
        const scaleVal = level === 0 ? 0.78 : 1.0;

        for (let h = 0; h < count && houseIdx < this.maxHouses; h++) {
          const offsetX = count === 1 ? 0 : -0.54 + h * 0.36;
          const localPos = new THREE.Vector3(offsetX, coord.height + 0.16 * scaleVal, -0.95);
          localPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), coord.rotY);
          const worldPos = new THREE.Vector3(coord.x + localPos.x, localPos.y, coord.z + localPos.z);

          dummy.position.copy(worldPos);
          dummy.rotation.set(0, coord.rotY, 0);
          dummy.scale.set(scaleVal, scaleVal, scaleVal);
          dummy.updateMatrix();
          this.houseInstancedMesh.setMatrixAt(houseIdx, dummy.matrix);

          records.push({
            isHotel: false,
            instanceIndex: houseIdx,
            worldPos,
            rotY: coord.rotY,
            targetScale: new THREE.Vector3(scaleVal, scaleVal, scaleVal)
          });
          houseIdx++;
        }
      }

      this.tileBuildingMap.set(tileIndex, records);
    }

    this.houseInstancedMesh.instanceMatrix.needsUpdate = true;
    this.hotelInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  // Animasi rumah/hotel naik dari bawah permukaan tanah saat Beli Tanah atau Upgrade Bangunan
  animateBuildingRiseFromUnderground(tileIndex, propertiesState, players) {
    this.syncProperties(propertiesState, players);
    const records = this.tileBuildingMap.get(tileIndex);
    if (!records || records.length === 0) return Promise.resolve();

    // Animasi khusus pada bangunan terbaru (elemen terakhir di petak tersebut)
    const targetRec = records[records.length - 1];
    const dummy = new THREE.Object3D();
    const startY = targetRec.worldPos.y - 0.65; // Mulai dari bawah permukaan tanah
    const endY = targetRec.worldPos.y;
    const animState = { progress: 0 };

    return new Promise((resolve) => {
      gsap.to(animState, {
        progress: 1,
        duration: 0.68,
        ease: 'back.out(1.8)',
        onUpdate: () => {
          const p = animState.progress;
          const curY = startY + (endY - startY) * p;
          dummy.position.set(targetRec.worldPos.x, curY, targetRec.worldPos.z);
          dummy.rotation.set(0, targetRec.rotY, 0);
          dummy.scale.set(
            targetRec.targetScale.x * Math.min(1, p * 1.25),
            targetRec.targetScale.y * p,
            targetRec.targetScale.z * Math.min(1, p * 1.25)
          );
          dummy.updateMatrix();

          if (targetRec.isHotel) {
            this.hotelInstancedMesh.setMatrixAt(targetRec.instanceIndex, dummy.matrix);
            this.hotelInstancedMesh.instanceMatrix.needsUpdate = true;
          } else {
            this.houseInstancedMesh.setMatrixAt(targetRec.instanceIndex, dummy.matrix);
            this.houseInstancedMesh.instanceMatrix.needsUpdate = true;
          }
        },
        onComplete: () => resolve()
      });
    });
  }
}