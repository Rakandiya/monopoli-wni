// Karakter Token 3D Low-Poly Detail (Perbaikan Sinkronisasi Masuk Pintu Depan Lapas Cipinang):
// - Pada `animateEnterJailCell`: Token mendarat di DEPAN pintu sel yang terbuka (z + 1.45),
//   menghadap ke dalam sel, berjalan melangkah melewati ambang pintu depan ke dalam sel,
//   lalu berbalik menghadap keluar sebelum pintu besi ditutup keras!

import * as THREE from "three";
import gsap from "gsap";

export class PlayerTokens3D {
  constructor(scene, board3D) {
    this.scene = scene;
    this.board3D = board3D;
    this.tokens = new Map();
    this.micSpriteTexture = this._buatTeksturIkonMic3D();
  }

  _buatTeksturIkonMic3D() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 58);
    grad.addColorStop(0, "rgba(34, 197, 94, 0.98)");
    grad.addColorStop(0.65, "rgba(22, 163, 74, 0.92)");
    grad.addColorStop(1, "rgba(22, 163, 74, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(64, 64, 40, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(53, 36, 22, 34, 11);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(64, 58, 18, 0, Math.PI, false);
    ctx.stroke();

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
    this._disposeExistingTokens();

    players.forEach((p, idx) => {
      const tokenGroup = this._buatKarakterLowPolyDetail(p.warna, idx);
      const startPos = this.board3D.getTokenPositionOnTile(p.posisi, idx);
      tokenGroup.position.copy(startPos);
      tokenGroup.userData = {
        ...tokenGroup.userData,
        playerId: p.id,
        slotIndex: idx,
        warna: p.warna,
        isMoving: false,
        facingYaw: Math.PI,
      };

      this.scene.add(tokenGroup);
      this.tokens.set(p.id, tokenGroup);
    });
  }

  _disposeExistingTokens() {
    for (const group of this.tokens.values()) {
      this.scene.remove(group);
      group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material && obj.material !== this.micSpriteTexture) {
          if (Array.isArray(obj.material))
            obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    this.tokens.clear();
  }

  getTokenPosition(playerId) {
    const token = this.tokens.get(playerId);
    return token ? token.position.clone() : new THREE.Vector3();
  }

  getTokenTransform(playerId) {
    const token = this.tokens.get(playerId);
    if (!token) {
      return { position: new THREE.Vector3(), yaw: 0 };
    }
    return {
      position: token.position.clone(),
      yaw: token.userData.facingYaw ?? token.rotation.y,
    };
  }

  _buatKarakterLowPolyDetail(warnaHex, slotIdx = 0) {
    const root = new THREE.Group();
    const charRig = new THREE.Group();
    root.add(charRig);

    const primaryMat = new THREE.MeshStandardMaterial({
      color: warnaHex,
      roughness: 0.32,
      metalness: 0.12,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      roughness: 0.45,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.25,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.25,
      metalness: 0.65,
    });

    const baseMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.31, 0.08, 24),
      darkMat,
    );
    baseMesh.position.y = 0.04;
    baseMesh.castShadow = true;
    root.add(baseMesh);

    const rimMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.03, 24),
      primaryMat,
    );
    rimMesh.position.y = 0.085;
    root.add(rimMesh);

    const legGeo = new THREE.BoxGeometry(0.1, 0.22, 0.11);
    legGeo.translate(0, -0.1, 0);

    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.075, 0.3, 0);
    leftLeg.castShadow = true;
    charRig.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.075, 0.3, 0);
    rightLeg.castShadow = true;
    charRig.add(rightLeg);

    const torsoGeo = new THREE.BoxGeometry(0.26, 0.32, 0.17);
    const torsoMesh = new THREE.Mesh(torsoGeo, primaryMat);
    torsoMesh.position.y = 0.46;
    torsoMesh.castShadow = true;
    charRig.add(torsoMesh);

    const sashGeo = new THREE.BoxGeometry(0.28, 0.08, 0.185);
    const sashMesh = new THREE.Mesh(sashGeo, goldMat);
    sashMesh.position.y = 0.44;
    sashMesh.rotation.z = 0.35;
    charRig.add(sashMesh);

    const armGeo = new THREE.BoxGeometry(0.085, 0.25, 0.085);
    armGeo.translate(0, -0.1, 0);

    const leftArm = new THREE.Mesh(armGeo, primaryMat);
    leftArm.position.set(-0.18, 0.58, 0);
    leftArm.castShadow = true;
    charRig.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, primaryMat);
    rightArm.position.set(0.18, 0.58, 0);
    rightArm.castShadow = true;
    charRig.add(rightArm);

    const headGroup = new THREE.Group();
    headGroup.position.y = 0.78;
    charRig.add(headGroup);

    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.165, 20, 20),
      skinMat,
    );
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    const eyeGeo = new THREE.SphereGeometry(0.024, 10, 10);
    const leftEye = new THREE.Mesh(eyeGeo, darkMat);
    leftEye.position.set(-0.055, 0.02, 0.145);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, darkMat);
    rightEye.position.set(0.055, 0.02, 0.145);
    headGroup.add(rightEye);

    const noseMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.025, 0.06, 10),
      skinMat,
    );
    noseMesh.rotation.x = Math.PI / 2;
    noseMesh.position.set(0, -0.01, 0.17);
    headGroup.add(noseMesh);

    if (slotIdx % 2 === 0) {
      const peciGeo = new THREE.CylinderGeometry(0.155, 0.165, 0.13, 20);
      const peciMesh = new THREE.Mesh(peciGeo, darkMat);
      peciMesh.position.set(0, 0.14, 0);
      peciMesh.castShadow = true;
      headGroup.add(peciMesh);

      const pinMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 0.02),
        goldMat,
      );
      pinMesh.position.set(0, 0.14, 0.16);
      headGroup.add(pinMesh);
    } else {
      const capingGeo = new THREE.ConeGeometry(0.27, 0.16, 20);
      const capingMesh = new THREE.Mesh(capingGeo, goldMat);
      capingMesh.position.set(0, 0.17, 0);
      capingMesh.castShadow = true;
      headGroup.add(capingMesh);

      const bandMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.16, 0.04, 20),
        primaryMat,
      );
      bandMesh.position.set(0, 0.12, 0);
      headGroup.add(bandMesh);
    }

    const spriteMat = new THREE.SpriteMaterial({
      map: this.micSpriteTexture,
      transparent: true,
      depthTest: false,
    });
    const micSprite = new THREE.Sprite(spriteMat);
    micSprite.position.set(0, 1.52, 0);
    micSprite.scale.set(0.65, 0.65, 0.65);
    micSprite.visible = false;
    root.add(micSprite);

    const ringGeo = new THREE.RingGeometry(0.32, 0.46, 28);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const voiceRing = new THREE.Mesh(ringGeo, ringMat);
    voiceRing.position.y = 0.03;
    voiceRing.visible = false;
    root.add(voiceRing);

    root.userData = {
      charRig,
      headGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      micSprite,
      voiceRing,
      phaseOffset: slotIdx * 1.57,
    };

    return root;
  }

  updateSpeakingIndicators(speakingMap, elapsedTime = 0) {
    for (const [playerId, tokenGroup] of this.tokens.entries()) {
      const ud = tokenGroup.userData;

      if (ud.charRig && !ud.isMoving) {
        const t = elapsedTime * 3.2 + (ud.phaseOffset || 0);
        ud.charRig.position.y = Math.abs(Math.sin(t)) * 0.035;
        ud.headGroup.rotation.z = Math.sin(t * 0.7) * 0.05;
        ud.leftArm.rotation.x = Math.sin(t) * 0.12;
        ud.rightArm.rotation.x = -Math.sin(t) * 0.12;
        ud.leftLeg.rotation.x = 0;
        ud.rightLeg.rotation.x = 0;
      }

      const isSpeaking = Boolean(speakingMap?.get(playerId));
      const micSprite = ud.micSprite;
      const voiceRing = ud.voiceRing;

      if (micSprite) {
        micSprite.visible = isSpeaking && tokenGroup.visible;
        if (micSprite.visible) {
          const pulse = 0.65 + Math.sin(elapsedTime * 12) * 0.1;
          micSprite.scale.set(pulse, pulse, pulse);
          micSprite.position.y = 1.52 + Math.sin(elapsedTime * 8) * 0.06;
        }
      }

      if (voiceRing) {
        voiceRing.visible = isSpeaking && tokenGroup.visible;
        if (voiceRing.visible) {
          const ringScale = 1.0 + ((elapsedTime * 2.5) % 0.65);
          voiceRing.scale.set(ringScale, ringScale, ringScale);
          voiceRing.material.opacity = Math.max(
            0.15,
            0.9 - ((elapsedTime * 2.5) % 0.65),
          );
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

      const ud = token.userData;
      ud.isMoving = true;
      const slotIndex = ud.slotIndex || 0;

      const tl = gsap.timeline({
        onComplete: () => {
          ud.isMoving = false;
          if (ud.leftArm) {
            ud.leftArm.rotation.x = 0;
            ud.rightArm.rotation.x = 0;
            ud.leftLeg.rotation.x = 0;
            ud.rightLeg.rotation.x = 0;
          }
          resolve();
        },
      });

      pathArray.forEach((tileIdx, stepIdx) => {
        const targetPos = this.board3D.getTokenPositionOnTile(
          tileIdx,
          slotIndex,
        );

        tl.call(() => {
          const dx = targetPos.x - token.position.x;
          const dz = targetPos.z - token.position.z;
          if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
            const yaw = Math.atan2(dx, dz);
            ud.facingYaw = yaw;
            if (ud.charRig) ud.charRig.rotation.y = yaw;
          }

          const swing = (stepIdx % 2 === 0 ? 1 : -1) * 0.65;
          if (ud.leftArm) {
            gsap.to(ud.leftArm.rotation, {
              x: swing,
              duration: 0.09,
              yoyo: true,
              repeat: 1,
            });
            gsap.to(ud.rightArm.rotation, {
              x: -swing,
              duration: 0.09,
              yoyo: true,
              repeat: 1,
            });
            gsap.to(ud.leftLeg.rotation, {
              x: -swing,
              duration: 0.09,
              yoyo: true,
              repeat: 1,
            });
            gsap.to(ud.rightLeg.rotation, {
              x: swing,
              duration: 0.09,
              yoyo: true,
              repeat: 1,
            });
          }

          if (onStepCallback) onStepCallback(stepIdx);
        });

        tl.to(token.position, {
          x: targetPos.x,
          z: targetPos.z,
          duration: 0.18,
          ease: "power1.inOut",
        });

        tl.to(
          token.position,
          {
            y: targetPos.y + 0.52,
            duration: 0.09,
            yoyo: true,
            repeat: 1,
            ease: "power1.out",
          },
          "<",
        );
      });
    });
  }

  // PERBAIKAN: Animasi Masuk Sel Lapas Cipinang Lewat Pintu Depan (+Z)
  // Pion mendarat di DEPAN pintu yang terbuka (bukan menembus atap dari atas),
  // lalu melangkah masuk melewati pintu depan ke dalam sel, dan berbalik badan menghadap jeruji!
  animateEnterJailCell(playerId) {
    return new Promise((resolve) => {
      const token = this.tokens.get(playerId);
      if (!token) {
        resolve();
        return;
      }

      const ud = token.userData;
      const slotIndex = ud.slotIndex || 0;
      const insideCellPos = this.board3D.getTokenPositionOnTile(10, slotIndex);
      const jailCenter = this.board3D.getTileCenterPosition(10);

      // Titik pendaratan tepat di luar pintu depan sel (+Z) yang sedang terbuka
      const frontDoorOutsideZ = jailCenter.z + 1.38;
      ud.isMoving = true;

      const tl = gsap.timeline({
        onComplete: () => {
          ud.isMoving = false;
          if (ud.leftArm) {
            ud.leftArm.rotation.x = 0;
            ud.rightArm.rotation.x = 0;
            ud.leftLeg.rotation.x = 0;
            ud.rightLeg.rotation.x = 0;
          }
          resolve();
        },
      });

      // 1. Angkat pion dari petak saat ini
      tl.to(token.position, {
        y: token.position.y + 2.2,
        duration: 0.3,
        ease: "power2.out",
      });

      // 2. Terbang melengkung dan mendarat di DEPAN Pintu Sel Lapas (di luar kerangkeng)
      tl.to(token.position, {
        x: insideCellPos.x,
        z: frontDoorOutsideZ,
        y: insideCellPos.y,
        duration: 0.52,
        ease: "power2.inOut",
      });

      // 3. Hadapkan badan pion ke arah dalam pintu sel (-Z -> yaw = Math.PI)
      tl.call(() => {
        if (ud.charRig) ud.charRig.rotation.y = Math.PI;
        ud.facingYaw = Math.PI;
      });

      // 4. Berjalan 3 langkah kecil melewati pintu depan yang terbuka masuk ke dalam sel
      for (let step = 1; step <= 3; step++) {
        const interpZ =
          frontDoorOutsideZ +
          ((insideCellPos.z - frontDoorOutsideZ) * step) / 3;
        const swing = (step % 2 === 0 ? 1 : -1) * 0.65;

        tl.call(() => {
          if (ud.leftArm) {
            gsap.to(ud.leftArm.rotation, {
              x: swing,
              duration: 0.08,
              yoyo: true,
              repeat: 1,
            });
            gsap.to(ud.rightArm.rotation, {
              x: -swing,
              duration: 0.08,
              yoyo: true,
              repeat: 1,
            });
            gsap.to(ud.leftLeg.rotation, {
              x: -swing,
              duration: 0.08,
              yoyo: true,
              repeat: 1,
            });
            gsap.to(ud.rightLeg.rotation, {
              x: swing,
              duration: 0.08,
              yoyo: true,
              repeat: 1,
            });
          }
        });

        tl.to(token.position, {
          z: interpZ,
          duration: 0.16,
          ease: "none",
        });

        tl.to(
          token.position,
          {
            y: insideCellPos.y + 0.22,
            duration: 0.08,
            yoyo: true,
            repeat: 1,
            ease: "power1.out",
          },
          "<",
        );
      }

      // 5. Setelah di dalam sel, berbalik badan menghadap keluar jeruji (+Z -> yaw = 0)
      tl.to(ud.charRig ? ud.charRig.rotation : token.rotation, {
        y: 0,
        duration: 0.2,
        ease: "power2.out",
      });
    });
  }

  animateDisasterKnockback(playerId, jenisBencana = "gempa") {
    return new Promise((resolve) => {
      const token = this.tokens.get(playerId);
      if (!token) {
        resolve();
        return;
      }

      const originX = token.position.x;
      const originY = token.position.y;
      const originZ = token.position.z;
      token.userData.isMoving = true;

      const tl = gsap.timeline({
        onComplete: () => {
          token.position.set(originX, originY, originZ);
          token.rotation.set(0, 0, 0);
          token.userData.isMoving = false;
          resolve();
        },
      });

      if (jenisBencana === "banjir") {
        tl.to(token.position, {
          x: originX + 0.45,
          y: originY - 0.28,
          z: originZ + 0.35,
          duration: 0.45,
          ease: "power2.out",
        });
        tl.to(
          token.rotation,
          {
            x: -0.65,
            z: 0.45,
            duration: 0.45,
          },
          "<",
        );
        tl.to(token.position, {
          y: originY - 0.15,
          duration: 0.55,
          yoyo: true,
          repeat: 1,
          ease: "sine.inOut",
        });
        tl.to(token.position, {
          x: originX,
          y: originY,
          z: originZ,
          duration: 0.45,
          ease: "back.out(1.5)",
        });
        tl.to(
          token.rotation,
          {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.45,
          },
          "<",
        );
      } else {
        tl.to(token.position, {
          x: originX + (Math.random() - 0.5) * 0.75,
          y: originY + 1.55,
          z: originZ + (Math.random() - 0.5) * 0.75,
          duration: 0.32,
          ease: "power2.out",
        });
        tl.to(
          token.rotation,
          {
            x: (Math.random() - 0.5) * 1.8,
            z: (Math.random() - 0.5) * 1.8,
            duration: 0.32,
            ease: "power2.out",
          },
          "<",
        );
        tl.to(token.position, {
          x: originX,
          y: originY,
          z: originZ,
          duration: 0.55,
          ease: "bounce.out",
        });
        tl.to(
          token.rotation,
          {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.45,
            ease: "power2.out",
          },
          "<",
        );
      }
    });
  }

  animateGoodCardJump(playerId) {
    return new Promise((resolve) => {
      const token = this.tokens.get(playerId);
      if (!token) {
        resolve();
        return;
      }

      const ud = token.userData;
      ud.isMoving = true;
      const originY = token.position.y;

      const tl = gsap.timeline({
        onComplete: () => {
          token.position.y = originY;
          token.rotation.y = 0;
          if (ud.leftArm) {
            ud.leftArm.rotation.x = 0;
            ud.rightArm.rotation.x = 0;
          }
          ud.isMoving = false;
          resolve();
        },
      });

      if (ud.leftArm) {
        gsap.to(ud.leftArm.rotation, { x: Math.PI * 0.85, duration: 0.25 });
        gsap.to(ud.rightArm.rotation, { x: Math.PI * 0.85, duration: 0.25 });
      }

      tl.to(token.position, {
        y: originY + 1.5,
        duration: 0.32,
        ease: "power2.out",
      });
      tl.to(
        token.rotation,
        {
          y: Math.PI * 2,
          duration: 0.65,
          ease: "power1.inOut",
        },
        "<",
      );
      tl.to(token.position, {
        y: originY,
        duration: 0.38,
        ease: "bounce.out",
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
      const warna = token.userData.warna || "#ef4444";

      const tl = gsap.timeline({
        onComplete: () => {
          token.visible = false;
          token.rotation.set(0, 0, 0);
          token.scale.set(1, 1, 1);
          resolve();
        },
      });

      tl.to(token.rotation, {
        z: Math.PI / 2,
        duration: 0.42,
        ease: "bounce.out",
      });

      tl.call(() => {
        if (fxManager) fxManager.playBankruptAshFX(pos, warna);
      });

      tl.to(token.scale, {
        x: 0.01,
        y: 0.01,
        z: 0.01,
        duration: 0.55,
        ease: "power2.in",
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

  dispose() {
    this._disposeExistingTokens();
    if (this.micSpriteTexture) {
      this.micSpriteTexture.dispose();
    }
  }
}
