// Manajer Efek Visual (FX) Berbasis Object Pool & InstancedMesh
// TANPA alokasi geometri/mesh baru saat efek dipicu (menjaga performa 60 FPS).
// Meliputi:
// 1. Bencana Alam: Banjir (gelombang air + cipratan), Gempa (retakan/debu batu),
//    Kebakaran (api & asap), Longsor (guguran tanah tebing).
// 2. Kartu Takdir Bagus: Pilar cahaya emas + hujan confetti warna-warni.
// 3. Bangkrut: Token hancur menjadi partikel abu gelap yang berterbangan.
// 4. Beli Tanah / Bangun: Gelombang cincin hijau-emas dan kilau tanah.

import * as THREE from 'three';
import gsap from 'gsap';

export class FXManager {
  constructor(scene) {
    this.scene = scene;
    this.maxParticles = 320;
    this.particles = [];
    this.dummy = new THREE.Object3D();
    this.zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

    this._initParticlePool();
    this._initSpecialMeshes();
  }

  // Inisialisasi 320 partikel menggunakan satu InstancedMesh yang dipakai ulang terus-menerus
  _initParticlePool() {
    const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.15
    });

    this.instancedMesh = new THREE.InstancedMesh(geo, mat, this.maxParticles);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.castShadow = false;
    this.instancedMesh.receiveShadow = false;

    const defaultColor = new THREE.Color(0xffffff);
    for (let i = 0; i < this.maxParticles; i++) {
      this.instancedMesh.setMatrixAt(i, this.zeroMatrix);
      this.instancedMesh.setColorAt(i, defaultColor);

      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        scale: new THREE.Vector3(1, 1, 1),
        baseScale: new THREE.Vector3(1, 1, 1),
        gravity: -9.8,
        drag: 0.98,
        floorY: 0.35,
        bounce: 0.3,
        life: 0,
        maxLife: 1
      });
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.instancedMesh);
  }

  // Mesh khusus yang dialokasikan satu kali saat startup (Pilar Cahaya Emas, Air Banjir, Cincin Kejut)
  _initSpecialMeshes() {
    // 1. Pilar cahaya emas untuk Kartu Takdir bagus
    const pillarGeo = new THREE.CylinderGeometry(0.85, 0.85, 7.5, 20, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.goldenPillar = new THREE.Mesh(pillarGeo, pillarMat);
    this.goldenPillar.visible = false;
    this.scene.add(this.goldenPillar);

    // 2. Genangan/gelombang air naik untuk bencana Banjir
    const waterGeo = new THREE.CylinderGeometry(1.75, 1.95, 0.55, 24);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.75,
      roughness: 0.15,
      metalness: 0.2
    });
    this.floodMesh = new THREE.Mesh(waterGeo, waterMat);
    this.floodMesh.visible = false;
    this.scene.add(this.floodMesh);

    // 3. Cincin gelombang kejut (Shockwave Ring) untuk Gempa & Beli Tanah
    const ringGeo = new THREE.RingGeometry(0.25, 0.55, 28);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.shockwaveRing = new THREE.Mesh(ringGeo, ringMat);
    this.shockwaveRing.visible = false;
    this.scene.add(this.shockwaveRing);

    // 4. PointLight dinamis untuk kilatan cahaya saat bencana / berkat
    this.fxLight = new THREE.PointLight(0xfacc15, 0, 10);
    this.scene.add(this.fxLight);
  }

  // Ambil 1 slot partikel tidak aktif dari pool
  _acquireParticle() {
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.particles[i].active) {
        return { slot: this.particles[i], index: i };
      }
    }
    return null;
  }

  // Memicu efek partikel & mesh sesuai jenis Bencana Alam (banjir, gempa, kebakaran, longsor)
  playDisasterFX(jenisBencana, centerPos) {
    const colorPalette = {
      banjir: [0x38bdf8, 0x0284c7, 0xbae6fd, 0x0369a1],
      gempa: [0x78716c, 0x57534e, 0xa8a29e, 0x44403c],
      kebakaran: [0xef4444, 0xf97316, 0xfacc15, 0x334155],
      longsor: [0x78350f, 0x92400e, 0x451a03, 0x57534e]
    };
    const palette = colorPalette[jenisBencana] || colorPalette.gempa;
    const tempColor = new THREE.Color();

    // Kilatan lampu efek
    this.fxLight.position.set(centerPos.x, centerPos.y + 2.2, centerPos.z);
    this.fxLight.color.setHex(palette[0]);
    this.fxLight.intensity = 4;
    gsap.to(this.fxLight, { intensity: 0, duration: 1.2, ease: 'power2.out' });

    if (jenisBencana === 'banjir') {
      // Animasi gelombang air banjir meluap di petak
      this.floodMesh.visible = true;
      this.floodMesh.position.set(centerPos.x, centerPos.y - 0.25, centerPos.z);
      this.floodMesh.scale.set(0.3, 0.2, 0.3);
      this.floodMesh.material.opacity = 0.82;

      const tl = gsap.timeline({
        onComplete: () => {
          this.floodMesh.visible = false;
        }
      });
      tl.to(this.floodMesh.position, { y: centerPos.y + 0.28, duration: 0.35, ease: 'power2.out' });
      tl.to(this.floodMesh.scale, { x: 1.25, y: 1.1, z: 1.25, duration: 0.45, ease: 'sine.out' }, '<');
      tl.to(this.floodMesh.material, { opacity: 0, duration: 0.45, delay: 0.35 });
    } else if (jenisBencana === 'gempa') {
      // Gelombang kejut tanah retak
      this._triggerShockwave(centerPos, 0xd6d3d1, 2.8, 0.7);
    }

    // Semburkan 65 partikel dari pool sesuai perilaku fisik bencana
    for (let i = 0; i < 65; i++) {
      const item = this._acquireParticle();
      if (!item) break;
      const { slot, index } = item;

      slot.active = true;
      slot.floorY = centerPos.y;
      slot.life = 0;
      slot.maxLife = 0.75 + Math.random() * 0.65;

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.85;

      if (jenisBencana === 'banjir') {
        slot.pos.set(
          centerPos.x + Math.cos(angle) * radius,
          centerPos.y + 0.15,
          centerPos.z + Math.sin(angle) * radius
        );
        slot.vel.set(
          Math.cos(angle) * (1.8 + Math.random() * 2.5),
          2.8 + Math.random() * 3.2,
          Math.sin(angle) * (1.8 + Math.random() * 2.5)
        );
        slot.gravity = -11.5;
        slot.bounce = 0.2;
        slot.baseScale.set(0.85, 0.85, 0.85);
      } else if (jenisBencana === 'kebakaran') {
        slot.pos.set(
          centerPos.x + (Math.random() - 0.5) * 1.3,
          centerPos.y + 0.1,
          centerPos.z + (Math.random() - 0.5) * 1.3
        );
        slot.vel.set(
          (Math.random() - 0.5) * 1.5,
          2.6 + Math.random() * 4.2,
          (Math.random() - 0.5) * 1.5
        );
        // Api dan asap membubung ke atas (gravitasi positif ringan)
        slot.gravity = 1.5;
        slot.bounce = 0;
        slot.baseScale.set(1.15, 1.15, 1.15);
      } else if (jenisBencana === 'longsor') {
        // Guguran tanah jatuh miring dari atas tebing ke petak
        slot.pos.set(
          centerPos.x - 1.4 + (Math.random() - 0.5) * 1.1,
          centerPos.y + 2.8 + Math.random() * 1.5,
          centerPos.z + (Math.random() - 0.5) * 1.1
        );
        slot.vel.set(2.2 + Math.random() * 1.8, -1.5, (Math.random() - 0.5) * 1.4);
        slot.gravity = -14.0;
        slot.bounce = 0.35;
        slot.baseScale.set(1.3, 0.9, 1.1);
      } else {
        // Gempa: batu & debu terlontar vertikal dari lantai petak
        slot.pos.set(
          centerPos.x + (Math.random() - 0.5) * 1.5,
          centerPos.y + 0.08,
          centerPos.z + (Math.random() - 0.5) * 1.5
        );
        slot.vel.set(
          (Math.random() - 0.5) * 3.2,
          3.5 + Math.random() * 4.0,
          (Math.random() - 0.5) * 3.2
        );
        slot.gravity = -15.0;
        slot.bounce = 0.45;
        slot.baseScale.set(1.1, 0.8, 1.2);
      }

      slot.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      slot.rotVel.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );

      tempColor.setHex(palette[i % palette.length]);
      this.instancedMesh.setColorAt(index, tempColor);
    }

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  // Efek Kartu Takdir Bagus: Pilar Cahaya Emas & Hujan Confetti
  playGoodCardFX(centerPos) {
    const confettiColors = [0xfacc15, 0x22c55e, 0x38bdf8, 0xf43f5e, 0xa855f7, 0xffffff];
    const tempColor = new THREE.Color();

    // Tampilkan pilar cahaya emas
    this.goldenPillar.visible = true;
    this.goldenPillar.position.set(centerPos.x, centerPos.y + 3.5, centerPos.z);
    this.goldenPillar.scale.set(0.2, 1, 0.2);
    this.goldenPillar.material.opacity = 0.65;

    gsap.to(this.goldenPillar.scale, {
      x: 1.35,
      z: 1.35,
      duration: 0.55,
      ease: 'back.out(1.6)'
    });
    gsap.to(this.goldenPillar.material, {
      opacity: 0,
      duration: 0.6,
      delay: 0.55,
      onComplete: () => {
        this.goldenPillar.visible = false;
      }
    });

    this._triggerShockwave(centerPos, 0xfacc15, 2.5, 0.75);

    // Semburkan 75 keping confetti tipis warna-warni
    for (let i = 0; i < 75; i++) {
      const item = this._acquireParticle();
      if (!item) break;
      const { slot, index } = item;

      slot.active = true;
      slot.floorY = centerPos.y;
      slot.life = 0;
      slot.maxLife = 1.1 + Math.random() * 0.6;

      slot.pos.set(
        centerPos.x + (Math.random() - 0.5) * 0.6,
        centerPos.y + 0.7,
        centerPos.z + (Math.random() - 0.5) * 0.6
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.8;
      slot.vel.set(
        Math.cos(angle) * speed,
        4.2 + Math.random() * 3.8,
        Math.sin(angle) * speed
      );

      slot.gravity = -6.2; // Melayang turun perlahan seperti kertas confetti
      slot.bounce = 0.15;
      slot.baseScale.set(1.1, 0.18, 0.65); // Pipih seperti confetti
      slot.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      slot.rotVel.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14
      );

      tempColor.setHex(confettiColors[i % confettiColors.length]);
      this.instancedMesh.setColorAt(index, tempColor);
    }

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  // Efek Bangkrut: Token hancur menjadi abu gelap yang berterbangan
  playBankruptAshFX(centerPos, playerHexColor = '#ef4444') {
    const ashPalette = [0x1e293b, 0x334155, 0x475569, 0x64748b];
    const tempColor = new THREE.Color();

    for (let i = 0; i < 70; i++) {
      const item = this._acquireParticle();
      if (!item) break;
      const { slot, index } = item;

      slot.active = true;
      slot.floorY = centerPos.y;
      slot.life = 0;
      slot.maxLife = 0.9 + Math.random() * 0.65;

      slot.pos.set(
        centerPos.x + (Math.random() - 0.5) * 0.65,
        centerPos.y + 0.15 + Math.random() * 0.55,
        centerPos.z + (Math.random() - 0.5) * 0.65
      );

      slot.vel.set(
        (Math.random() - 0.5) * 2.2,
        0.9 + Math.random() * 2.4,
        (Math.random() - 0.5) * 2.2
      );
      slot.gravity = -2.2; // Abu melayang pelan sebelum jatuh
      slot.bounce = 0.05;
      slot.baseScale.set(0.75, 0.75, 0.75);
      slot.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      slot.rotVel.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );

      if (i % 6 === 0) {
        tempColor.set(playerHexColor);
      } else {
        tempColor.setHex(ashPalette[i % ashPalette.length]);
      }
      this.instancedMesh.setColorAt(index, tempColor);
    }

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  // Efek Beli Tanah / Bangun Rumah: Cincin kejut & partikel tanah/emas di sekitar bangunan yang naik
  playBuyLandFX(centerPos) {
    this._triggerShockwave(centerPos, 0x22c55e, 2.2, 0.6);
    const palette = [0x22c55e, 0xfacc15, 0x86efac, 0xa8a29e];
    const tempColor = new THREE.Color();

    for (let i = 0; i < 32; i++) {
      const item = this._acquireParticle();
      if (!item) break;
      const { slot, index } = item;

      slot.active = true;
      slot.floorY = centerPos.y;
      slot.life = 0;
      slot.maxLife = 0.55 + Math.random() * 0.35;

      const angle = (i / 32) * Math.PI * 2;
      slot.pos.set(
        centerPos.x + Math.cos(angle) * 0.55,
        centerPos.y + 0.08,
        centerPos.z + Math.sin(angle) * 0.55
      );
      slot.vel.set(
        Math.cos(angle) * 1.6,
        2.2 + Math.random() * 1.8,
        Math.sin(angle) * 1.6
      );
      slot.gravity = -9.5;
      slot.bounce = 0.25;
      slot.baseScale.set(0.65, 0.65, 0.65);
      slot.rot.set(0, 0, 0);
      slot.rotVel.set(4, 4, 4);

      tempColor.setHex(palette[i % palette.length]);
      this.instancedMesh.setColorAt(index, tempColor);
    }

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  _triggerShockwave(centerPos, hexColor, maxScale, duration) {
    this.shockwaveRing.visible = true;
    this.shockwaveRing.position.set(centerPos.x, centerPos.y + 0.06, centerPos.z);
    this.shockwaveRing.scale.set(0.2, 0.2, 0.2);
    this.shockwaveRing.material.color.setHex(hexColor);
    this.shockwaveRing.material.opacity = 0.85;

    gsap.to(this.shockwaveRing.scale, {
      x: maxScale,
      y: maxScale,
      z: maxScale,
      duration,
      ease: 'power2.out'
    });
    gsap.to(this.shockwaveRing.material, {
      opacity: 0,
      duration,
      ease: 'power2.out',
      onComplete: () => {
        this.shockwaveRing.visible = false;
      }
    });
  }

  // Dipanggil setiap frame di requestAnimationFrame
  update(dt = 0.016) {
    let anyUpdated = false;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      anyUpdated = true;
      p.life += dt;

      if (p.life >= p.maxLife) {
        p.active = false;
        this.instancedMesh.setMatrixAt(i, this.zeroMatrix);
        continue;
      }

      // Integrasi kecepatan & gravitasi
      p.vel.y += p.gravity * dt;
      p.vel.multiplyScalar(p.drag);

      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      p.pos.z += p.vel.z * dt;

      // Pantulan lantai petak
      if (p.pos.y < p.floorY && p.vel.y < 0) {
        p.pos.y = p.floorY;
        p.vel.y = -p.vel.y * p.bounce;
        p.vel.x *= 0.75;
        p.vel.z *= 0.75;
      }

      p.rot.x += p.rotVel.x * dt;
      p.rot.y += p.rotVel.y * dt;
      p.rot.z += p.rotVel.z * dt;

      // Skala mengecil halus menjelang akhir umur partikel
      const lifeRatio = 1 - p.life / p.maxLife;
      const s = Math.min(1, lifeRatio * 1.6);

      this.dummy.position.copy(p.pos);
      this.dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
      this.dummy.scale.set(
        p.baseScale.x * s,
        p.baseScale.y * s,
        p.baseScale.z * s
      );
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }

    if (anyUpdated) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }
}