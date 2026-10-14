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
    const extraSpinsX = (2 + Math.floor(Math.random() * 2)) * Math.PI * 2;
    const extraSpinsZ = (2 + Math.floor(Math.random() * 2)) * Math.PI * 2;

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
      const tl = gsap.timeline({
        onComplete: () => resolve()
      });

      this.diceMeshes.forEach((mesh, idx) => {
        const targetRot = this._getTargetRotationForValue(results[idx]);
        const targetX = idx === 0 ? -1.15 : 1.15;
        const targetZ = 3.1 + (idx === 0 ? -0.2 : 0.2);

        // Reset posisi awal lemparan dari atas
        mesh.position.set(targetX - 1.5, 3.8, targetZ + 1.8);
        mesh.rotation.set(0, 0, 0);

        tl.to(
          mesh.position,
          {
            x: targetX,
            z: targetZ,
            duration: 0.65,
            ease: 'power2.out'
          },
          0
        );

        tl.to(
          mesh.position,
          {
            y: 0.76,
            duration: 0.65,
            ease: 'bounce.out'
          },
          0
        );

        tl.to(
          mesh.rotation,
          {
            x: targetRot.x,
            y: targetRot.y,
            z: targetRot.z,
            duration: 0.65,
            ease: 'power2.out'
          },
          0
        );
      });
    });
  }
}