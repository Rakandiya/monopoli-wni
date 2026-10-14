// Manajer Efek Visual (FX) & Bencana Smooth (Upgrade Geometri Organik Halus):
// - Partikel menggunakan SphereGeometry halus (bukan kotak kaku) sehingga percikan air,
//   bola api, kepulan asap, dan batu longsor terlihat organik & mulus.
// - Gelombang Tsunami menggunakan kurva Bezier 3D melengkung (ExtrudeGeometry) dengan silinder buih halus.
// - Dilengkapi batu besar bergulir (rolling boulders) untuk Tanah Longsor.

import * as THREE from "three";
import gsap from "gsap";

export class FXManager {
  constructor(scene) {
    this.scene = scene;

    const isLowEndDevice =
      window.innerWidth < 800 ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

    this.quality = isLowEndDevice ? "LOW" : "HIGH";
    this.maxParticles = 360;
    this.particles = [];
    this.dummy = new THREE.Object3D();
    this.zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

    this.fireFlickerTimer = 0;

    this._initSmoothParticlePool();
    this._initSmoothSpecialMeshes();
  }

  setQuality(level = "HIGH") {
    this.quality = level === "LOW" ? "LOW" : "HIGH";
    return this.quality;
  }

  _getScaledCount(highCount) {
    return this.quality === "LOW"
      ? Math.max(14, Math.floor(highCount * 0.42))
      : highCount;
  }

  // Menggunakan SphereGeometry halus (12x10 segmen) agar partikel air, api, asap, dan tanah tampak organik
  _initSmoothParticlePool() {
    const geo = new THREE.SphereGeometry(0.13, 12, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.32,
      metalness: 0.1,
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
        baseScale: new THREE.Vector3(1, 1, 1),
        gravity: -9.8,
        drag: 0.985,
        floorY: 0.35,
        bounce: 0.3,
        life: 0,
        maxLife: 1,
      });
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.instancedMesh);
  }

  _initSmoothSpecialMeshes() {
    // 1. Pilar Cahaya Emas Halus (32 segmen radial)
    const pillarGeo = new THREE.CylinderGeometry(0.95, 0.95, 7.8, 32, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.goldenPillar = new THREE.Mesh(pillarGeo, pillarMat);
    this.goldenPillar.visible = false;
    this.scene.add(this.goldenPillar);

    // 2. Genangan Air Banjir Halus (36 segmen radial)
    const waterGeo = new THREE.CylinderGeometry(1.9, 2.1, 0.55, 36);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.78,
      roughness: 0.12,
      metalness: 0.25,
    });
    this.floodMesh = new THREE.Mesh(waterGeo, waterMat);
    this.floodMesh.visible = false;
    this.scene.add(this.floodMesh);

    // 3. Gelombang Tsunami Melengkung Organik (Bezier Curve Extrude + Puncak Buih Halus)
    this.tsunamiWaveGroup = new THREE.Group();
    const waveShape = new THREE.Shape();
    waveShape.moveTo(-0.8, 0);
    waveShape.quadraticCurveTo(-0.3, 0.45, 0.1, 1.35);
    waveShape.quadraticCurveTo(0.55, 1.65, 0.75, 1.15);
    waveShape.quadraticCurveTo(0.35, 0.85, 0.45, 0);
    waveShape.closePath();

    const waveExtrude = new THREE.ExtrudeGeometry(waveShape, {
      depth: 2.8,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.1,
      bevelSegments: 5,
      curveSegments: 24,
    });
    waveExtrude.center();

    const waveBodyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.84,
      roughness: 0.15,
      metalness: 0.2,
    });
    const waveBody = new THREE.Mesh(waveExtrude, waveBodyMat);
    waveBody.position.y = 0.65;
    this.tsunamiWaveGroup.add(waveBody);

    // Gulungan buih putih di bibir ombak tsunami
    const foamGeo = new THREE.CylinderGeometry(0.24, 0.24, 2.9, 20);
    foamGeo.rotateX(Math.PI / 2);
    const foamMat = new THREE.MeshStandardMaterial({
      color: 0xf0f9ff,
      roughness: 0.35,
    });
    const foamCrest = new THREE.Mesh(foamGeo, foamMat);
    foamCrest.position.set(0.52, 1.18, 0);
    this.tsunamiWaveGroup.add(foamCrest);

    this.tsunamiWaveGroup.visible = false;
    this.scene.add(this.tsunamiWaveGroup);

    // 4. Cincin Gelombang Kejut Halus (40 segmen)
    const ringGeo = new THREE.RingGeometry(0.28, 0.62, 40);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shockwaveRing = new THREE.Mesh(ringGeo, ringMat);
    this.shockwaveRing.visible = false;
    this.scene.add(this.shockwaveRing);

    this.fxLight = new THREE.PointLight(0xfacc15, 0, 14);
    this.scene.add(this.fxLight);
  }

  _acquireParticle() {
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.particles[i].active) {
        return { slot: this.particles[i], index: i };
      }
    }
    return null;
  }

  playDisasterFX(jenisBencana, centerPos) {
    const colorPalette = {
      banjir: [0x38bdf8, 0x0284c7, 0xe0f2fe, 0x7dd3fc],
      gempa: [0xa8a29e, 0x78716c, 0xd6d3d1, 0x57534e],
      kebakaran: [0xffedd5, 0xfacc15, 0xf97316, 0xef4444],
      longsor: [0x92400e, 0x78350f, 0xa8a29e, 0x57534e],
    };
    const palette = colorPalette[jenisBencana] || colorPalette.gempa;
    const tempColor = new THREE.Color();

    this.fxLight.position.set(centerPos.x, centerPos.y + 2.4, centerPos.z);
    this.fxLight.color.setHex(palette[0]);

    if (jenisBencana === "kebakaran") {
      this.fireFlickerTimer = 1.9;
      this._triggerShockwave(centerPos, 0xf97316, 3.2, 0.65);
    } else {
      this.fxLight.intensity = 4.5;
      gsap.to(this.fxLight, { intensity: 0, duration: 1.5, ease: "sine.out" });
    }

    if (jenisBencana === "banjir") {
      // Gelombang Tsunami Melengkung menyapu mulus dengan easing sine.inOut
      this.tsunamiWaveGroup.visible = true;
      this.tsunamiWaveGroup.position.set(
        centerPos.x - 2.6,
        centerPos.y,
        centerPos.z - 2.6,
      );
      this.tsunamiWaveGroup.rotation.y = -Math.PI / 4;
      this.tsunamiWaveGroup.scale.set(0.2, 0.2, 0.4);

      const waveTl = gsap.timeline({
        onComplete: () => {
          this.tsunamiWaveGroup.visible = false;
        },
      });
      waveTl.to(this.tsunamiWaveGroup.scale, {
        x: 1.15,
        y: 1.15,
        z: 1.15,
        duration: 0.45,
        ease: "sine.out",
      });
      waveTl.to(
        this.tsunamiWaveGroup.position,
        {
          x: centerPos.x + 2.4,
          z: centerPos.z + 2.4,
          duration: 1.45,
          ease: "sine.inOut",
        },
        0,
      );
      waveTl.to(this.tsunamiWaveGroup.scale, {
        x: 0.6,
        y: 0.05,
        z: 0.9,
        duration: 0.4,
        ease: "sine.in",
      });

      this.floodMesh.visible = true;
      this.floodMesh.position.set(centerPos.x, centerPos.y - 0.25, centerPos.z);
      this.floodMesh.scale.set(0.3, 0.2, 0.3);
      this.floodMesh.material.opacity = 0.82;

      const floodTl = gsap.timeline({
        onComplete: () => {
          this.floodMesh.visible = false;
        },
      });
      floodTl.to(this.floodMesh.position, {
        y: centerPos.y + 0.3,
        duration: 0.45,
        ease: "sine.out",
      });
      floodTl.to(
        this.floodMesh.scale,
        { x: 1.35, y: 1.1, z: 1.35, duration: 0.55, ease: "sine.out" },
        "<",
      );
      floodTl.to(this.floodMesh.material, {
        opacity: 0,
        duration: 0.6,
        delay: 0.7,
      });
    } else if (jenisBencana === "gempa") {
      this._triggerShockwave(centerPos, 0xd6d3d1, 3.4, 0.9);
    }

    const count = this._getScaledCount(90);
    for (let i = 0; i < count; i++) {
      const item = this._acquireParticle();
      if (!item) break;
      const { slot, index } = item;

      slot.active = true;
      slot.floorY = centerPos.y;
      slot.life = 0;
      slot.maxLife = 1.05 + Math.random() * 0.85;

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.15;

      if (jenisBencana === "banjir") {
        slot.pos.set(
          centerPos.x + Math.cos(angle) * radius,
          centerPos.y + 0.2,
          centerPos.z + Math.sin(angle) * radius,
        );
        slot.vel.set(
          Math.cos(angle) * (1.8 + Math.random() * 2.4),
          3.0 + Math.random() * 3.2,
          Math.sin(angle) * (1.8 + Math.random() * 2.4),
        );
        slot.gravity = -10.5;
        slot.bounce = 0.3;
        slot.baseScale.set(0.95, 0.95, 0.95);
      } else if (jenisBencana === "kebakaran") {
        slot.pos.set(
          centerPos.x + (Math.random() - 0.5) * 1.3,
          centerPos.y + 0.12,
          centerPos.z + (Math.random() - 0.5) * 1.3,
        );
        slot.vel.set(
          (Math.random() - 0.5) * 1.4,
          2.4 + Math.random() * 3.8,
          (Math.random() - 0.5) * 1.4,
        );
        slot.gravity = 1.4;
        slot.bounce = 0;
        slot.baseScale.set(1.35, 1.35, 1.35);
      } else if (jenisBencana === "longsor") {
        slot.pos.set(
          centerPos.x - 1.6 + (Math.random() - 0.5) * 1.2,
          centerPos.y + 3.0 + Math.random() * 1.5,
          centerPos.z + (Math.random() - 0.5) * 1.2,
        );
        slot.vel.set(
          2.3 + Math.random() * 1.6,
          -1.2,
          (Math.random() - 0.5) * 1.3,
        );
        slot.gravity = -12.5;
        slot.bounce = 0.42;
        const bSize = 0.9 + Math.random() * 0.7;
        slot.baseScale.set(bSize, bSize * 0.85, bSize);
      } else {
        if (i % 2 === 0) {
          slot.pos.set(
            centerPos.x + (Math.random() - 0.5) * 3.0,
            centerPos.y + 3.4 + Math.random() * 2.0,
            centerPos.z + (Math.random() - 0.5) * 3.0,
          );
          slot.vel.set(
            (Math.random() - 0.5) * 1.0,
            -2.2,
            (Math.random() - 0.5) * 1.0,
          );
        } else {
          slot.pos.set(
            centerPos.x + (Math.random() - 0.5) * 1.5,
            centerPos.y + 0.08,
            centerPos.z + (Math.random() - 0.5) * 1.5,
          );
          slot.vel.set(
            (Math.random() - 0.5) * 3.0,
            3.4 + Math.random() * 3.8,
            (Math.random() - 0.5) * 3.0,
          );
        }
        slot.gravity = -13.5;
        slot.bounce = 0.45;
        slot.baseScale.set(1.1, 0.95, 1.1);
      }

      slot.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      slot.rotVel.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
      );

      tempColor.setHex(palette[i % palette.length]);
      this.instancedMesh.setColorAt(index, tempColor);
    }

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  playGoodCardFX(centerPos) {
    const confettiColors = [
      0xfacc15, 0x22c55e, 0x38bdf8, 0xf43f5e, 0xa855f7, 0xffffff,
    ];
    const tempColor = new THREE.Color();

    this.goldenPillar.visible = true;
    this.goldenPillar.position.set(centerPos.x, centerPos.y + 3.5, centerPos.z);
    this.goldenPillar.scale.set(0.2, 1, 0.2);
    this.goldenPillar.material.opacity = 0.68;

    gsap.to(this.goldenPillar.scale, {
      x: 1.4,
      z: 1.4,
      duration: 0.55,
      ease: "back.out(1.6)",
    });
    gsap.to(this.goldenPillar.material, {
      opacity: 0,
      duration: 0.65,
      delay: 0.6,
      onComplete: () => {
        this.goldenPillar.visible = false;
      },
    });

    this._triggerShockwave(centerPos, 0xfacc15, 2.6, 0.8);

    const count = this._getScaledCount(80);
    for (let i = 0; i < count; i++) {
      const item = this._acquireParticle();
      if (!item) break;
      const { slot, index } = item;

      slot.active = true;
      slot.floorY = centerPos.y;
      slot.life = 0;
      slot.maxLife = 1.25 + Math.random() * 0.6;

      slot.pos.set(
        centerPos.x + (Math.random() - 0.5) * 0.6,
        centerPos.y + 0.75,
        centerPos.z + (Math.random() - 0.5) * 0.6,
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.6;
      slot.vel.set(
        Math.cos(angle) * speed,
        4.2 + Math.random() * 3.6,
        Math.sin(angle) * speed,
      );

      slot.gravity = -5.8;
      slot.bounce = 0.2;
      slot.baseScale.set(1.15, 0.25, 0.75);
      slot.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      slot.rotVel.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
      );

      tempColor.setHex(confettiColors[i % confettiColors.length]);
      this.instancedMesh.setColorAt(index, tempColor);
    }

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  playBankruptAshFX(centerPos, playerHexColor = "#ef4444") {
    const ashPalette = [0x1e293b, 0x334155, 0x475569, 0x64748b];
    const tempColor = new THREE.Color();
    const count = this._getScaledCount(70);

    for (let i = 0; i < count; i++) {
      const item = this._acquireParticle();
      if (!item) break;
      const { slot, index } = item;

      slot.active = true;
      slot.floorY = centerPos.y;
      slot.life = 0;
      slot.maxLife = 1.0 + Math.random() * 0.65;

      slot.pos.set(
        centerPos.x + (Math.random() - 0.5) * 0.65,
        centerPos.y + 0.15 + Math.random() * 0.55,
        centerPos.z + (Math.random() - 0.5) * 0.65,
      );

      slot.vel.set(
        (Math.random() - 0.5) * 2.0,
        0.9 + Math.random() * 2.2,
        (Math.random() - 0.5) * 2.0,
      );
      slot.gravity = -2.0;
      slot.bounce = 0.05;
      slot.baseScale.set(0.8, 0.8, 0.8);
      slot.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      slot.rotVel.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
      );

      if (i % 6 === 0) tempColor.set(playerHexColor);
      else tempColor.setHex(ashPalette[i % ashPalette.length]);

      this.instancedMesh.setColorAt(index, tempColor);
    }

    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  playBuyLandFX(centerPos) {
    this._triggerShockwave(centerPos, 0x22c55e, 2.2, 0.6);
    const palette = [0x22c55e, 0xfacc15, 0x86efac, 0xa8a29e];
    const tempColor = new THREE.Color();
    const count = this._getScaledCount(34);

    for (let i = 0; i < count; i++) {
      const item = this._acquireParticle();
      if (!item) break;
      const { slot, index } = item;

      slot.active = true;
      slot.floorY = centerPos.y;
      slot.life = 0;
      slot.maxLife = 0.6 + Math.random() * 0.35;

      const angle = (i / count) * Math.PI * 2;
      slot.pos.set(
        centerPos.x + Math.cos(angle) * 0.55,
        centerPos.y + 0.08,
        centerPos.z + Math.sin(angle) * 0.55,
      );
      slot.vel.set(
        Math.cos(angle) * 1.5,
        2.2 + Math.random() * 1.6,
        Math.sin(angle) * 1.5,
      );
      slot.gravity = -9.0;
      slot.bounce = 0.25;
      slot.baseScale.set(0.7, 0.7, 0.7);
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
    this.shockwaveRing.position.set(
      centerPos.x,
      centerPos.y + 0.06,
      centerPos.z,
    );
    this.shockwaveRing.scale.set(0.2, 0.2, 0.2);
    this.shockwaveRing.material.color.setHex(hexColor);
    this.shockwaveRing.material.opacity = 0.85;

    gsap.to(this.shockwaveRing.scale, {
      x: maxScale,
      y: maxScale,
      z: maxScale,
      duration,
      ease: "sine.out",
    });
    gsap.to(this.shockwaveRing.material, {
      opacity: 0,
      duration,
      ease: "sine.out",
      onComplete: () => {
        this.shockwaveRing.visible = false;
      },
    });
  }

  update(dt = 0.016) {
    if (this.fireFlickerTimer > 0) {
      this.fireFlickerTimer -= dt;
      this.fxLight.intensity = 2.5 + Math.random() * 4.5;
      this.fxLight.color.setHex(Math.random() > 0.4 ? 0xf97316 : 0xef4444);
      if (this.fireFlickerTimer <= 0) {
        this.fxLight.intensity = 0;
      }
    }

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

      p.vel.y += p.gravity * dt;
      p.vel.multiplyScalar(p.drag);

      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      p.pos.z += p.vel.z * dt;

      if (p.pos.y < p.floorY && p.vel.y < 0) {
        p.pos.y = p.floorY;
        p.vel.y = -p.vel.y * p.bounce;
        p.vel.x *= 0.78;
        p.vel.z *= 0.78;
      }

      p.rot.x += p.rotVel.x * dt;
      p.rot.y += p.rotVel.y * dt;
      p.rot.z += p.rotVel.z * dt;

      // Kurva skala halus (smoothstep)
      const lifeRatio = 1 - p.life / p.maxLife;
      const smoothScale = Math.sin(
        Math.min(1, lifeRatio * 1.4) * (Math.PI / 2),
      );

      this.dummy.position.copy(p.pos);
      this.dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
      this.dummy.scale.set(
        p.baseScale.x * smoothScale,
        p.baseScale.y * smoothScale,
        p.baseScale.z * smoothScale,
      );
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }

    if (anyUpdated) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose() {
    if (this.instancedMesh) {
      this.instancedMesh.geometry.dispose();
      this.instancedMesh.material.dispose();
    }
    [this.goldenPillar, this.floodMesh, this.shockwaveRing].forEach((m) => {
      if (m) {
        m.geometry.dispose();
        m.material.dispose();
      }
    });
    if (this.tsunamiWaveGroup) {
      this.tsunamiWaveGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }
  }
}
