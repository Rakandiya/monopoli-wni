// Dadu 3D Prosedural (2 buah dadu)
// Hasil mata dadu ditentukan lebih dulu oleh gameEngine, lalu animasi menggelinding
// diarahkan secara deterministik agar sisi atas (+Y) berhenti tepat di angka tersebut.

import * as THREE from 'three';
import gsap from 'gsap';

export class Dice3D {
  constructor(scene) {
    this.scene = scene;
    this.diceMeshes = [];
    this._bangunDuaDadu();
  }

  _bangunDuaDadu() {
    // Urutan material BoxGeometry di Three.js:
    // 0: +X (3), 1: -X (4), 2: +Y (1), 3: -Y (6), 4: +Z (2), 5: -Z (5)
    const faceValues = [3, 4, 1, 6, 2, 5];
    const materials = faceValues.map((val) => {
      const tex = new THREE.CanvasTexture(this._buatTeksturMataDadu(val));
      tex.anisotropy = 4;
      return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.25,
        metalness: 0.05
      });
    });

    const geo = new THREE.BoxGeometry(0.85, 0.85, 0.85);

    for (let i = 0; i < 2; i++) {
      const mesh = new THREE.Mesh(geo, materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(i === 0 ? -1.1 : 1.1, 0.75, 3.2);
      this.scene.add(mesh);
      this.diceMeshes.push(mesh);
    }
  }

  _buatTeksturMataDadu(nilai) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 122, 122);

    // Titik mata dadu (merah untuk angka 1, hitam untuk lainnya)
    ctx.fillStyle = nilai === 1 ? '#dc2626' : '#0f172a';
    const r = nilai === 1 ? 16 : 11;

    const pips = {
      1: [[64, 64]],
      2: [
        [34, 34],
        [94, 94]
      ],
      3: [
        [32, 32],
        [64, 64],
        [96, 96]
      ],
      4: [
        [34, 34],
        [94, 34],
        [34, 94],
        [94, 94]
      ],
      5: [
        [34, 34],
        [94, 34],
        [64, 64],
        [34, 94],
        [94, 94]
      ],
      6: [
        [34, 28],
        [94, 28],
        [34, 64],
        [94, 64],
        [34, 100],
        [94, 100]
      ]
    };

    for (const [px, py] of pips[nilai]) {
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
  }

  // Menghitung rotasi Euler (x, y, z) agar angka `val` berada tepat menghadap ke atas (+Y)
  _getTargetRotationForValue(val) {
    // 4 hingga 5 putaran penuh (360 derajat) agar putaran dadu terlihat berputar mantap selama durasi animasi yang lebih panjang
    const extraSpinsX = (4 + Math.floor(Math.random() * 2)) * Math.PI * 2;
    const extraSpinsZ = (4 + Math.floor(Math.random() * 2)) * Math.PI * 2;

    switch (val) {
      case 1:
        return { x: extraSpinsX + 0, y: 0, z: extraSpinsZ + 0 };
      case 6:
        return { x: extraSpinsX + Math.PI, y: 0, z: extraSpinsZ + 0 };
      case 2:
        return { x: extraSpinsX - Math.PI / 2, y: 0, z: extraSpinsZ + 0 };
      case 5:
        return { x: extraSpinsX + Math.PI / 2, y: 0, z: extraSpinsZ + 0 };
      case 3:
        return { x: extraSpinsX + 0, y: 0, z: extraSpinsZ + Math.PI / 2 };
      case 4:
        return { x: extraSpinsX + 0, y: 0, z: extraSpinsZ - Math.PI / 2 };
      default:
        return { x: extraSpinsX, y: 0, z: extraSpinsZ };
    }
  }

  // Animasi lempar dadu 3D menuju hasil [val1, val2]
  animateRoll(val1, val2) {
    return new Promise((resolve) => {
      const results = [val1, val2];
      const duration = 1.85; // Durasi lemparan diperpanjang agar putaran dan pantulan lebih santai & dramatis

      const tl = gsap.timeline({
        onComplete: () => {
          // Beri jeda/delay (850ms) agar pemain dapat melihat hasil angka dadu dengan tenang sebelum pion bergerak
          setTimeout(() => resolve(), 850);
        }
      });

      // Randomisasi titik pendaratan lemparan dadu (jauh vs dekat & kiri vs kanan):
      // - Z Dekat  : ~3.2 s/d 4.0 (dekat ke sisi pemain/depan kamera)
      // - Z Sedang : ~1.2 s/d 2.8 (di area tengah depan)
      // - Z Jauh   : ~ -0.7 s/d 0.8 (terlempar jauh ke tengah/seberang pulau)
      const centerZ = -0.7 + Math.random() * 4.5; // Rentang Z antara -0.7 s/d +3.8
      const centerX = (Math.random() - 0.5) * 4.2; // Rentang X antara -2.1 s/d +2.1

      // Sudut hamburan & jarak pemisah antar kedua dadu agar mendarat berdampingan secara alami tanpa saling bertumpukan
      const spreadAngle = Math.random() * Math.PI * 2;
      const spreadDist = 1.35 + Math.random() * 0.75; // Jarak pisah 1.35 - 2.1 unit
      const halfDist = spreadDist / 2;
      const offX = Math.cos(spreadAngle) * halfDist;
      const offZ = Math.sin(spreadAngle) * halfDist;

      const targets = [
        { x: centerX - offX, z: centerZ - offZ },
        { x: centerX + offX, z: centerZ + offZ }
      ];

      this.diceMeshes.forEach((mesh, idx) => {
        const target = targets[idx];
        const targetRot = this._getTargetRotationForValue(results[idx]);

        // Posisi awal lemparan: Melambung tinggi dari arah depan bawah pemain menuju titik target
        const throwStartZ = Math.min(8.5, target.z + 3.2 + Math.random() * 2.2);
        const throwStartX = target.x + (idx === 0 ? -1.3 : 1.3) + (Math.random() - 0.5) * 0.8;
        const throwStartY = 4.8 + Math.random() * 1.4;

        mesh.position.set(throwStartX, throwStartY, throwStartZ);
        mesh.rotation.set(
          (Math.random() - 0.5) * Math.PI,
          Math.random() * Math.PI,
          (Math.random() - 0.5) * Math.PI
        );

        // Pergerakan horizontal (X & Z) meluncur menuju titik berhenti yang dirandom
        tl.to(
          mesh.position,
          {
            x: target.x,
            z: target.z,
            duration: duration,
            ease: 'power2.out'
          },
          0
        );

        // Pergerakan vertikal (Y): Melambung dan memantul jatuh di permukaan papan (tinggi 0.76)
        tl.to(
          mesh.position,
          {
            y: 0.76,
            duration: duration,
            ease: 'bounce.out'
          },
          0
        );

        // Putaran dadu: Berguling beberapa putaran lalu berhenti persis di angka target
        tl.to(
          mesh.rotation,
          {
            x: targetRot.x,
            y: targetRot.y,
            z: targetRot.z,
            duration: duration,
            ease: 'power3.out'
          },
          0
        );
      });
    });
  }
}