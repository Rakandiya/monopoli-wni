// Karakter Token 3D Low-Poly + Indikator Bicara 3D di Atas Token (Milestone 5)
// Menambahkan Sprite Ikon Mikrofon Bercahaya (CanvasTexture) di atas kepala setiap token
// yang menyala dan berdenyut saat AnalyserNode mendeteksi pemain tersebut sedang berbicara.

import * as THREE from 'three';
import gsap from 'gsap';

export class PlayerTokens3D {
  constructor(scene, board3D) {
    this.scene = scene;
    this.board3D = board3D;
    this.tokens = new Map();
    this.micSpriteTexture = this._buatTeksturIkonMic3D();
  }

  // Membuat tekstur ikon mikrofon hijau bercahaya untuk Sprite 3D di atas token
  _buatTeksturIkonMic3D() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Lingkaran luar hijau bercahaya
    const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 58);
    grad.addColorStop(0, 'rgba(34, 197, 94, 0.98)');
    grad.addColorStop(0.65, 'rgba(22, 163, 74, 0.92)');
    grad.addColorStop(1, 'rgba(22, 163, 74, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();

    // Cincin putih tegas
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(64, 64, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Kapsul mikrofon putih di tengah
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(53, 36, 22, 34, 11);
    ctx.fill();

    // Lengkungan penyangga mic
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(64, 58, 18, 0, Math.PI, false);
    ctx.stroke();

    // Tiang bawah mic
    ctx.beginPath();
    ctx.moveTo(64, 76);
    ctx.lineTo(64, 90);
    ctx.moveTo(52, 90);
    ctx.lineTo(76, 90);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  initTokens(players) {
    for (const group of this.tokens.values()) {
      this.scene.remove(group);
    }
    this.tokens.clear();

    players.forEach((p, idx) => {
      const tokenGroup = this._buatMeshToken(p.warna);
      const startPos = this.board3D.getTokenPositionOnTile(p.posisi, idx);
      tokenGroup.position.copy(startPos);
      tokenGroup.userData = { playerId: p.id, slotIndex: idx, warna: p.warna };

      this.scene.add(tokenGroup);
      this.tokens.set(p.id, tokenGroup);
    });
  }

  getTokenPosition(playerId) {
    const token = this.tokens.get(playerId);
    return token ? token.position.clone() : new THREE.Vector3();
  }

  _buatMeshToken(warnaHex) {
    const group = new THREE.Group();

    const baseGeo = new THREE.CylinderGeometry(0.26, 0.3, 0.1, 16);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.4
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.05;
    baseMesh.castShadow = true;
    group.add(baseMesh);

    const bodyGeo = new THREE.CapsuleGeometry(0.18, 0.34, 8, 14);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: warnaHex,
      roughness: 0.3,
      metalness: 0.15
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.38;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    const headGeo = new THREE.SphereGeometry(0.17, 14, 14);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      roughness: 0.45
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 0.78;
    headMesh.castShadow = true;
    group.add(headMesh);

    const hatGeo = new THREE.ConeGeometry(0.24, 0.16, 12);
    const hatMat = new THREE.MeshStandardMaterial({
      color: warnaHex,
      roughness: 0.4
    });
    const hatMesh = new THREE.Mesh(hatGeo, hatMat);
    hatMesh.position.y = 0.96;
    hatMesh.castShadow = true;
    group.add(hatMesh);

    // Indikator Bicara 3D (Sprite Mic di atas kepala token)
    const spriteMat = new THREE.SpriteMaterial({
      map: this.micSpriteTexture,
      transparent: true,
      depthTest: false
    });
    const micSprite = new THREE.Sprite(spriteMat);
    micSprite.position.set(0, 1.48, 0);
    micSprite.scale.set(0.65, 0.65, 0.65);
    micSprite.visible = false;
    group.add(micSprite);

    // Cincin gelombang suara hijau di kaki token saat berbicara
    const ringGeo = new THREE.RingGeometry(0.32, 0.46, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const voiceRing = new THREE.Mesh(ringGeo, ringMat);
    voiceRing.position.y = 0.03;
    voiceRing.visible = false;
    group.add(voiceRing);

    group.userData.micSprite = micSprite;
    group.userData.voiceRing = voiceRing;

    return group;
  }

  // Memperbarui animasi indikator bicara di atas token 3D setiap frame
  updateSpeakingIndicators(speakingMap, elapsedTime = 0) {
    for (const [playerId, tokenGroup] of this.tokens.entries()) {
      const isSpeaking = Boolean(speakingMap?.get(playerId));
      const micSprite = tokenGroup.userData.micSprite;
      const voiceRing = tokenGroup.userData.voiceRing;

      if (micSprite) {
        micSprite.visible = isSpeaking && tokenGroup.visible;
        if (micSprite.visible) {
          const pulse = 0.65 + Math.sin(elapsedTime * 12) * 0.1;
          micSprite.scale.set(pulse, pulse, pulse);
          micSprite.position.y = 1.48 + Math.sin(elapsedTime * 8) * 0.06;
        }
      }

      if (voiceRing) {
        voiceRing.visible = isSpeaking && tokenGroup.visible;
        if (voiceRing.visible) {
          const ringScale = 1.0 + ((elapsedTime * 2.5) % 0.65);
          voiceRing.scale.set(ringScale, ringScale, ringScale);
          voiceRing.material.opacity = Math.max(0.15, 0.9 - ((elapsedTime * 2.5) % 0.65));
        }
      }
    }
  }

  animateMoveAlongPath(playerId, pathArray, onStepCallback = null) {
    return new Promise((resolve) => {
      const token = this.tokens.get(playerId);
      if (!token || !pathArray || pathArray.length === 0) {
        resolve();
        return;
      }

      const slotIndex = token.userData.slotIndex || 0;
      const tl = gsap.timeline({ onComplete: () => resolve() });

      pathArray.forEach((tileIdx, stepIdx) => {
        const targetPos = this.board3D.getTokenPositionOnTile(tileIdx, slotIndex);
        tl.call(() => {
          if (onStepCallback) onStepCallback(stepIdx);
        });
        tl.to(token.position, {
          x: targetPos.x,
          z: targetPos.z,
          duration: 0.16,
          ease: 'power1.inOut'
        });
        tl.to(
          token.position,
          {
            y: targetPos.y + 0.52,
            duration: 0.08,
            yoyo: true,
            repeat: 1,
            ease: 'power1.out'
          },
          '<'
        );
      });
    });
  }

  animateEnterJailCell(playerId) {
    return new Promise((resolve) => {
      const token = this.tokens.get(playerId);
      if (!token) {
        resolve();
        return;
      }

      const slotIndex = token.userData.slotIndex || 0;
      const targetPos = this.board3D.getTokenPositionOnTile(10, slotIndex);

      const tl = gsap.timeline({ onComplete: () => resolve() });

      tl.to(token.position, {
        y: token.position.y + 2.8,
        duration: 0.35,
        ease: 'power2.out'
      });

      tl.to(token.position, {
        x: targetPos.x,
        z: targetPos.z,
        y: targetPos.y + 2.4,
        duration: 0.55,
        ease: 'power2.inOut'
      });

      tl.to(token.position, {
        y: targetPos.y,
        duration: 0.35,
        ease: 'bounce.out'
      });
    });
  }

  animateDisasterKnockback(playerId) {
    return new Promise((resolve) => {
      const token = this.tokens.get(playerId);
      if (!token) {
        resolve();
        return;
      }

      const originX = token.position.x;
      const originY = token.position.y;
      const originZ = token.position.z;

      const tl = gsap.timeline({
        onComplete: () => {
          token.position.set(originX, originY, originZ);
          token.rotation.set(0, 0, 0);
          resolve();
        }
      });

      tl.to(token.position, {
        x: originX + (Math.random() - 0.5) * 0.65,
        y: originY + 1.35,
        z: originZ + (Math.random() - 0.5) * 0.65,
        duration: 0.25,
        ease: 'power2.out'
      });
      tl.to(
        token.rotation,
        {
          x: (Math.random() - 0.5) * 1.4,
          z: (Math.random() - 0.5) * 1.4,
          duration: 0.25,
          ease: 'power2.out'
        },
        '<'
      );

      tl.to(token.position, {
        x: originX,
        y: originY,
        z: originZ,
        duration: 0.45,
        ease: 'bounce.out'
      });
      tl.to(
        token.rotation,
        {
          x: 0,
          y: 0,
          z: 0,
          duration: 0.4,
          ease: 'power2.out'
        },
        '<'
      );
    });
  }

  animateGoodCardJump(playerId) {
    return new Promise((resolve) => {
      const token = this.tokens.get(playerId);
      if (!token) {
        resolve();
        return;
      }

      const originY = token.position.y;
      const tl = gsap.timeline({
        onComplete: () => {
          token.position.y = originY;
          token.rotation.y = 0;
          resolve();
        }
      });

      tl.to(token.position, {
        y: originY + 1.45,
        duration: 0.28,
        ease: 'power2.out'
      });
      tl.to(
        token.rotation,
        {
          y: Math.PI * 2,
          duration: 0.55,
          ease: 'power1.inOut'
        },
        '<'
      );
      tl.to(token.position, {
        y: originY,
        duration: 0.32,
        ease: 'bounce.out'
      });
    });
  }

  animateBankruptCollapse(playerId, fxManager) {
    return new Promise((resolve) => {
      const token = this.tokens.get(playerId);
      if (!token) {
        resolve();
        return;
      }

      const pos = token.position.clone();
      const warna = token.userData.warna || '#ef4444';

      const tl = gsap.timeline({
        onComplete: () => {
          token.visible = false;
          token.rotation.set(0, 0, 0);
          token.scale.set(1, 1, 1);
          resolve();
        }
      });

      tl.to(token.rotation, {
        z: Math.PI / 2,
        duration: 0.42,
        ease: 'bounce.out'
      });

      tl.call(() => {
        if (fxManager) {
          fxManager.playBankruptAshFX(pos, warna);
        }
      });

      tl.to(token.scale, {
        x: 0.01,
        y: 0.01,
        z: 0.01,
        duration: 0.55,
        ease: 'power2.in'
      });
    });
  }

  syncPlayersState(players) {
    for (const p of players) {
      const token = this.tokens.get(p.id);
      if (!token) continue;
      token.visible = !p.bangkrut;
    }
  }
}