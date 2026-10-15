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
    this.policeCar = this._buatMobilPatroli3D();
    this.scene.add(this.policeCar);
    this.policeOfficer1 = this._buatKarakterPolisi3D(true);
    this.policeOfficer2 = this._buatKarakterPolisi3D(false);
    this.scene.add(this.policeOfficer1);
    this.scene.add(this.policeOfficer2);
    this.lastJailDriveDurationMs = 2000;
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

  // Membuat Mobil Patroli / Tahanan 3D Prosedural lengkap dengan Strobo Merah-Biru & Roda
  _buatMobilPatroli3D() {
    const carGroup = new THREE.Group();
    carGroup.visible = false;

    const bodyGroup = new THREE.Group();
    carGroup.add(bodyGroup);

    // Tekstur Samping Mobil ("PATROLI +62")
    const sideCanvas = document.createElement("canvas");
    sideCanvas.width = 256;
    sideCanvas.height = 128;
    const ctx = sideCanvas.getContext("2d");
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = "#f97316";
    ctx.fillRect(0, 74, 256, 22);
    ctx.fillStyle = "#ffffff";
    ctx.font = '900 26px "Segoe UI", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("PATROLI +62", 128, 56);
    const sideTex = new THREE.CanvasTexture(sideCanvas);

    const darkBlueMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.4,
    });
    const sideBodyMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughness: 0.35,
      metalness: 0.3,
    });
    const whiteRoofMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25,
      roughness: 0.15,
      metalness: 0.7,
    });
    const bumperMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.25,
    });
    const headLightMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 0.9,
    });

    // Bodi Utama Van Tahanan (Panjang di sumbu Z: 1.45, Lebar X: 0.78, Tinggi Y: 0.44)
    const chassisGeo = new THREE.BoxGeometry(0.78, 0.42, 1.45);
    const chassisMesh = new THREE.Mesh(chassisGeo, [
      sideBodyMat,
      sideBodyMat,
      whiteRoofMat,
      darkBlueMat,
      darkBlueMat,
      darkBlueMat,
    ]);
    chassisMesh.position.y = 0.33;
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    bodyGroup.add(chassisMesh);

    // Kabin Atas & Kaca Depan
    const cabinGeo = new THREE.BoxGeometry(0.72, 0.34, 1.05);
    const cabinMesh = new THREE.Mesh(cabinGeo, whiteRoofMat);
    cabinMesh.position.set(0, 0.68, -0.12);
    cabinMesh.castShadow = true;
    bodyGroup.add(cabinMesh);

    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.24, 0.06),
      glassMat,
    );
    windshield.position.set(0, 0.67, 0.41);
    bodyGroup.add(windshield);

    // Bumper Depan & Lampu Utama
    const bumper = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.12, 0.12),
      bumperMat,
    );
    bumper.position.set(0, 0.18, 0.74);
    bodyGroup.add(bumper);

    for (const lx of [-0.26, 0.26]) {
      const hl = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.09, 0.05),
        headLightMat,
      );
      hl.position.set(lx, 0.34, 0.73);
      bodyGroup.add(hl);
    }

    // Lampu Sirine Strobo Merah & Biru di Atap
    const redStrobeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.0,
    });
    const blueStrobeMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.2,
    });

    const redBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.08, 0.14),
      redStrobeMat,
    );
    redBar.position.set(-0.14, 0.89, 0.15);
    bodyGroup.add(redBar);

    const blueBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.08, 0.14),
      blueStrobeMat,
    );
    blueBar.position.set(0.14, 0.89, 0.15);
    bodyGroup.add(blueBar);

    // Pintu Geser Samping Tahanan (Sliding Door di sisi kanan bodi)
    const sideDoor = new THREE.Group();
    sideDoor.position.set(0.395, 0.46, -0.12);
    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.44, 0.62),
      sideBodyMat,
    );
    doorPanel.castShadow = true;
    sideDoor.add(doorPanel);

    const doorGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.18, 0.36),
      glassMat,
    );
    doorGlass.position.set(0, 0.1, 0);
    sideDoor.add(doorGlass);

    const doorHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.03, 0.08),
      bumperMat,
    );
    doorHandle.position.set(0.01, -0.04, 0.22);
    sideDoor.add(doorHandle);

    bodyGroup.add(sideDoor);

    // 4 Roda Mobil
    const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
    });

    const wheels = [];
    const wheelPositions = [
      [-0.4, 0.16, 0.44],
      [0.4, 0.16, 0.44],
      [-0.4, 0.16, -0.44],
      [0.4, 0.16, -0.44],
    ];
    for (const [wx, wy, wz] of wheelPositions) {
      const wMesh = new THREE.Mesh(wheelGeo, wheelMat);
      wMesh.position.set(wx, wy, wz);
      wMesh.castShadow = true;
      carGroup.add(wMesh);
      wheels.push(wMesh);
    }

    carGroup.userData = {
      bodyGroup,
      wheels,
      redStrobeMat,
      blueStrobeMat,
      sideDoor,
      sideDoorBaseZ: -0.12,
    };

    return carGroup;
  }

  // Membuat Karakter Polisi 3D Pengawal Lengkap dengan Rompi Sabhara, Topi Pet/Baret & Lencana
  _buatKarakterPolisi3D(isLeft = true) {
    const root = new THREE.Group();
    const charRig = new THREE.Group();
    root.add(charRig);

    const uniformMat = new THREE.MeshStandardMaterial({
      color: 0x5d4037, // Coklat Sabhara Polisi RI
      roughness: 0.45,
      metalness: 0.1,
    });
    const vestMat = new THREE.MeshStandardMaterial({
      color: 0x3e2723, // Coklat tua celana dinas
      roughness: 0.5,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      roughness: 0.45,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
    });
    const badgeMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.8,
      roughness: 0.2,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: isLeft ? 0x1e3a8a : 0x3e2723, // Polisi 1 baret biru brimob, Polisi 2 topi pet coklat sabhara
      roughness: 0.4,
    });

    // Kaki
    const legGeo = new THREE.BoxGeometry(0.09, 0.22, 0.1);
    legGeo.translate(0, -0.1, 0);

    const leftLeg = new THREE.Mesh(legGeo, vestMat);
    leftLeg.position.set(-0.07, 0.3, 0);
    leftLeg.castShadow = true;
    charRig.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, vestMat);
    rightLeg.position.set(0.07, 0.3, 0);
    rightLeg.castShadow = true;
    charRig.add(rightLeg);

    // Bodi Baju Dinas Polisi
    const torsoGeo = new THREE.BoxGeometry(0.25, 0.31, 0.16);
    const torsoMesh = new THREE.Mesh(torsoGeo, uniformMat);
    torsoMesh.position.y = 0.45;
    torsoMesh.castShadow = true;
    charRig.add(torsoMesh);

    // Sabuk Polisi Hitam
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.05, 0.17),
      darkMat,
    );
    belt.position.y = 0.33;
    charRig.add(belt);

    // Lencana Kewibawaan Emas di Dada Kanan
    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.02),
      badgeMat,
    );
    badge.position.set(0.06, 0.51, 0.085);
    charRig.add(badge);

    // Lengan Kiri & Kanan (Pivot di pundak y = 0)
    const armGeo = new THREE.BoxGeometry(0.08, 0.24, 0.08);
    armGeo.translate(0, -0.1, 0);

    const leftArm = new THREE.Mesh(armGeo, uniformMat);
    leftArm.position.set(-0.16, 0.56, 0);
    leftArm.castShadow = true;
    charRig.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, uniformMat);
    rightArm.position.set(0.16, 0.56, 0);
    rightArm.castShadow = true;
    charRig.add(rightArm);

    // Kepala & Baret/Topi Dinas
    const headGroup = new THREE.Group();
    headGroup.position.y = 0.74;
    charRig.add(headGroup);

    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      skinMat,
    );
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    const eyeGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeo, darkMat);
    leftEye.position.set(-0.05, 0.02, 0.135);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, darkMat);
    rightEye.position.set(0.05, 0.02, 0.135);
    headGroup.add(rightEye);

    // Topi Pet / Baret Polisi dengan Emblem
    const capBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.17, 0.08, 18),
      capMat,
    );
    capBase.position.set(0, 0.12, 0);
    capBase.castShadow = true;
    headGroup.add(capBase);

    const capVisor = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.02, 0.1),
      darkMat,
    );
    capVisor.position.set(0, 0.09, 0.14);
    headGroup.add(capVisor);

    const capBadge = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.04, 0.02),
      badgeMat,
    );
    capBadge.position.set(0, 0.13, 0.165);
    headGroup.add(capBadge);

    root.visible = false;
    root.userData = {
      charRig,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      headGroup,
      isLeft,
    };

    return root;
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

  // Animasi Masuk Sel Lapas Cipinang:
  // 1. Mobil Patroli datang mengerem di petak asal pion
  // 2. Dua polisi turun dari mobil, mengapit dan menggandeng kedua lengan pion masuk ke mobil patroli
  // 3. Mobil patroli melaju muterin board keliling kartu-kartu petak papan searah jarum jam (clockwise)
  //    dengan lampu strobo berkedip, roda berputar, dan bodi bergetar
  // 4. Di Lapas Cipinang, kedua polisi turun membawa pion ke depan sel yang terbuka, lalu MELEMPARKAN pion ke dalam sel!
  // 5. Pion mendarat di lantai sel dan berbalik menghadap jeruji sebelum pintu dibanting menutup keras!
  animateEnterJailCell(playerId) {
    return new Promise((resolve) => {
      const token = this.tokens.get(playerId);
      if (!token) {
        resolve();
        return;
      }

      const ud = token.userData;
      const slotIndex = ud.slotIndex || 0;
      const originPos = token.position.clone();
      const insideCellPos = this.board3D.getTokenPositionOnTile(10, slotIndex);
      const jailCenter = this.board3D.getTileCenterPosition(10);

      // Titik penurunan tahanan tepat di depan pintu sel (+Z) yang sedang terbuka
      const dropOffPos = new THREE.Vector3(
        insideCellPos.x,
        insideCellPos.y,
        jailCenter.z + 1.52,
      );

      // Cari indeks petak asal terdekat dari originPos
      let startTileIndex = 0;
      let minD = Infinity;
      for (let i = 0; i < 40; i++) {
        const cp = this.board3D.getTileCenterPosition(i);
        const d = originPos.distanceTo(cp);
        if (d < minD) {
          minD = d;
          startTileIndex = i;
        }
      }

      // Jika pion sudah berada di petak penjara (#10) saat diuji atau jarak terlalu dekat (< 2.5),
      // set petak awal di #30 (petak resmi "Masuk Penjara / OTT") agar mobil tetap muterin keliling papan!
      if (originPos.distanceTo(dropOffPos) < 2.5 || startTileIndex === 10) {
        startTileIndex = 30;
      }

      // Aturan Jalur: Mobil SELALU melaju maju searah jarum jam (CLOCKWISE).
      // Jika petak asal sudah lewat dari penjara (#11 s/d #39, misal #30),
      // mobil muterin keliling seluruh sisa petak papan (misal #31..#39, #0 Monas, #1..#10)!
      const stepCount = (10 - startTileIndex + 40) % 40 || 40;

      const pathTileIndices = [];
      for (let s = 1; s <= stepCount; s++) {
        pathTileIndices.push((startTileIndex + s) % 40);
      }

      // Tentukan arah laju mobil dari petak awal ke petak berikutnya
      const startCoord = this.board3D.getTileCenterPosition(startTileIndex);
      let approachDir = new THREE.Vector3();
      if (pathTileIndices.length > 0) {
        const firstNextCoord = this.board3D.getTileCenterPosition(
          pathTileIndices[0],
        );
        approachDir.subVectors(firstNextCoord, startCoord).setY(0);
      }
      if (approachDir.lengthSq() < 0.01) approachDir.set(-1, 0, 0);
      approachDir.normalize();

      // Vektor tegak lurus samping kanan mobil (+X lokal dalam ruang dunia)
      const rightVec = new THREE.Vector3(approachDir.z, 0, -approachDir.x).normalize();

      // Mobil berhenti tepat di samping posisi pion dengan pintu samping kanan (+X lokal) menghadap pion
      const pickupCarPos = new THREE.Vector3(
        originPos.x - rightVec.x * 1.15,
        originPos.y,
        originPos.z - rightVec.z * 1.15,
      );

      // Posisi spawn awal mobil patroli (4.2 unit di belakang titik jemput)
      const spawnCarPos = new THREE.Vector3(
        pickupCarPos.x - approachDir.x * 4.2,
        pickupCarPos.y,
        pickupCarPos.z - approachDir.z * 4.2,
      );
      let currentCarYaw = Math.atan2(approachDir.x, approachDir.z);

      // Posisi kedua polisi saat mengapit pion di titik penjemputan:
      // Polisi 1 di sebelah kiri pion (-approachDir), Polisi 2 di sebelah kanan pion (+approachDir)
      const p1PickupPos = new THREE.Vector3(
        originPos.x - approachDir.x * 0.42,
        originPos.y,
        originPos.z - approachDir.z * 0.42,
      );
      const p2PickupPos = new THREE.Vector3(
        originPos.x + approachDir.x * 0.42,
        originPos.y,
        originPos.z + approachDir.x * 0.42,
      );

      // Hitung durasi mengemudi keliling kartu papan
      const totalDriveDuration = Math.min(
        2.6,
        Math.max(1.7, pathTileIndices.length * 0.08),
      );
      this.lastJailDriveDurationMs = Math.round(totalDriveDuration * 1000);

      const car = this.policeCar;
      const carUD = car.userData;
      const p1 = this.policeOfficer1;
      const p1UD = p1.userData;
      const p2 = this.policeOfficer2;
      const p2UD = p2.userData;

      gsap.killTweensOf(car.position);
      gsap.killTweensOf(car.rotation);
      gsap.killTweensOf(car.scale);
      gsap.killTweensOf(p1.position);
      gsap.killTweensOf(p1.rotation);
      gsap.killTweensOf(p1.scale);
      gsap.killTweensOf(p2.position);
      gsap.killTweensOf(p2.rotation);
      gsap.killTweensOf(p2.scale);

      if (carUD.bodyGroup) {
        gsap.killTweensOf(carUD.bodyGroup.position);
        gsap.killTweensOf(carUD.bodyGroup.rotation);
        carUD.bodyGroup.position.set(0, 0, 0);
        carUD.bodyGroup.rotation.set(0, 0, 0);
      }
      if (carUD.sideDoor) {
        gsap.killTweensOf(carUD.sideDoor.position);
        carUD.sideDoor.position.z = carUD.sideDoorBaseZ ?? -0.12;
      }
      if (p1UD.charRig) {
        gsap.killTweensOf(p1UD.charRig.rotation);
        p1UD.charRig.rotation.set(0, 0, 0);
      }
      if (p2UD.charRig) {
        gsap.killTweensOf(p2UD.charRig.rotation);
        p2UD.charRig.rotation.set(0, 0, 0);
      }
      if (p1UD.leftArm) p1UD.leftArm.rotation.set(0, 0, 0);
      if (p1UD.rightArm) p1UD.rightArm.rotation.set(0, 0, 0);
      if (p1UD.leftLeg) p1UD.leftLeg.rotation.set(0, 0, 0);
      if (p1UD.rightLeg) p1UD.rightLeg.rotation.set(0, 0, 0);
      if (p2UD.leftArm) p2UD.leftArm.rotation.set(0, 0, 0);
      if (p2UD.rightArm) p2UD.rightArm.rotation.set(0, 0, 0);
      if (p2UD.leftLeg) p2UD.leftLeg.rotation.set(0, 0, 0);
      if (p2UD.rightLeg) p2UD.rightLeg.rotation.set(0, 0, 0);

      car.position.copy(spawnCarPos);
      car.rotation.set(0, currentCarYaw, 0);
      car.scale.set(1, 1, 1);
      car.visible = true;

      p1.visible = false;
      p2.visible = false;
      ud.isMoving = true;

      // Interval strobo lampu sirine merah-biru & putaran 4 roda selama mobil aktif
      let strobeTick = 0;
      const carAnimInterval = setInterval(() => {
        strobeTick++;
        const isRed = strobeTick % 2 === 0;
        carUD.redStrobeMat.emissiveIntensity = isRed ? 1.5 : 0.15;
        carUD.blueStrobeMat.emissiveIntensity = isRed ? 0.15 : 1.5;
        for (const w of carUD.wheels) {
          w.rotation.x += 0.55;
        }
      }, 85);

      const tl = gsap.timeline({
        onComplete: () => {
          clearInterval(carAnimInterval);
          car.visible = false;
          p1.visible = false;
          p2.visible = false;
          carUD.bodyGroup.position.set(0, 0, 0);
          carUD.bodyGroup.rotation.set(0, 0, 0);
          if (carUD.sideDoor) {
            carUD.sideDoor.position.z = carUD.sideDoorBaseZ ?? -0.12;
          }
          token.scale.set(1, 1, 1);
          token.position.copy(insideCellPos);
          ud.isMoving = false;
          if (ud.charRig) ud.charRig.rotation.set(0, 0, 0);
          if (ud.leftArm) {
            ud.leftArm.rotation.x = 0;
            ud.rightArm.rotation.x = 0;
            ud.leftLeg.rotation.x = 0;
            ud.rightLeg.rotation.x = 0;
          }
          resolve();
        },
      });

      // 1. Mobil Patroli melaju menghampiri lokasi pion & mengerem
      tl.to(car.position, {
        x: pickupCarPos.x,
        y: pickupCarPos.y,
        z: pickupCarPos.z,
        duration: 0.42,
        ease: "power2.out",
      });
      tl.to(
        carUD.bodyGroup.rotation,
        {
          x: 0.14,
          duration: 0.12,
          yoyo: true,
          repeat: 1,
        },
        "-=0.12",
      );

      // Pintu geser samping mobil terbuka
      if (carUD.sideDoor) {
        tl.to(
          carUD.sideDoor.position,
          {
            z: (carUD.sideDoorBaseZ ?? -0.12) - 0.42,
            duration: 0.18,
            ease: "power2.out",
          },
          "+=0.02",
        );
      }

      // 2. Kedua Polisi Turun dari Mobil & Menggandeng Kedua Lengan Pion
      tl.call(() => {
        p1.position.copy(pickupCarPos);
        p2.position.copy(pickupCarPos);
        p1.rotation.y = currentCarYaw + Math.PI / 2;
        p2.rotation.y = currentCarYaw + Math.PI / 2;
        p1.scale.set(1, 1, 1);
        p2.scale.set(1, 1, 1);
        p1.visible = true;
        p2.visible = true;
      });

      // Kedua polisi melangkah keluar mengapit pion (kiri & kanan)
      tl.to(p1.position, {
        x: p1PickupPos.x,
        y: p1PickupPos.y,
        z: p1PickupPos.z,
        duration: 0.24,
        ease: "power1.out",
      });
      tl.to(
        p2.position,
        {
          x: p2PickupPos.x,
          y: p2PickupPos.y,
          z: p2PickupPos.z,
          duration: 0.24,
          ease: "power1.out",
        },
        "<",
      );

      // Kedua polisi mengunci / menggandeng lengan pion:
      // Polisi 1 (di kiri) tangan kanan merangkul lengan kiri pion
      tl.to(
        p1UD.rightArm.rotation,
        {
          x: -0.55,
          z: 0.38,
          duration: 0.16,
        },
        "+=0.02",
      );
      // Polisi 2 (di kanan) tangan kiri merangkul lengan kanan pion
      tl.to(
        p2UD.leftArm.rotation,
        {
          x: -0.55,
          z: -0.38,
          duration: 0.16,
        },
        "<",
      );
      // Pion menunduk pasrah
      tl.to(
        ud.charRig ? ud.charRig.rotation : token.rotation,
        {
          x: 0.18,
          duration: 0.16,
        },
        "<",
      );

      // Ketiganya berputar badan serempak menghadap pintu mobil patroli
      const angleToDoor = Math.atan2(
        pickupCarPos.x - originPos.x,
        pickupCarPos.z - originPos.z,
      );
      tl.to(
        [
          p1.rotation,
          p2.rotation,
          ud.charRig ? ud.charRig.rotation : token.rotation,
        ],
        {
          y: angleToDoor,
          duration: 0.16,
          ease: "power1.out",
        },
        "+=0.04",
      );

      // Ketiganya melangkah bersama menuju pintu mobil patroli
      const midP1 = p1PickupPos.clone().lerp(pickupCarPos, 0.62);
      const midP2 = p2PickupPos.clone().lerp(pickupCarPos, 0.62);
      const midToken = originPos.clone().lerp(pickupCarPos, 0.62);

      tl.call(() => {
        const swing = 0.65;
        [p1UD, p2UD, ud].forEach((entity) => {
          if (entity.leftArm) {
            gsap.to(entity.leftArm.rotation, {
              x: swing,
              duration: 0.08,
              yoyo: true,
              repeat: 1,
            });
            gsap.to(entity.rightArm.rotation, {
              x: -swing,
              duration: 0.08,
              yoyo: true,
              repeat: 1,
            });
            gsap.to(entity.leftLeg.rotation, {
              x: -swing,
              duration: 0.08,
              yoyo: true,
              repeat: 1,
            });
            gsap.to(entity.rightLeg.rotation, {
              x: swing,
              duration: 0.08,
              yoyo: true,
              repeat: 1,
            });
          }
        });
      });

      tl.to(p1.position, {
        x: midP1.x,
        z: midP1.z,
        duration: 0.2,
        ease: "none",
      });
      tl.to(
        p2.position,
        {
          x: midP2.x,
          z: midP2.z,
          duration: 0.2,
          ease: "none",
        },
        "<",
      );
      tl.to(
        token.position,
        {
          x: midToken.x,
          z: midToken.z,
          duration: 0.2,
          ease: "none",
        },
        "<",
      );

      // Polisi 1 melangkah masuk ke kabin mobil
      tl.to(p1.position, {
        x: pickupCarPos.x,
        z: pickupCarPos.z,
        duration: 0.16,
      });
      tl.to(
        p1.scale,
        {
          x: 0.01,
          y: 0.01,
          z: 0.01,
          duration: 0.14,
        },
        "-=0.1",
      );

      // Pion melompat/didorong naik ke bordes mobil sambil membungkuk ke dalam kabin
      tl.to(token.position, {
        x: pickupCarPos.x,
        y: pickupCarPos.y + 0.58,
        z: pickupCarPos.z,
        duration: 0.2,
        ease: "power2.out",
      });
      tl.to(
        ud.charRig ? ud.charRig.rotation : token.rotation,
        {
          x: 0.38,
          duration: 0.18,
        },
        "<",
      );
      tl.to(
        token.scale,
        {
          x: 0.01,
          y: 0.01,
          z: 0.01,
          duration: 0.16,
          ease: "power2.in",
        },
        "-=0.08",
      );

      // Polisi 2 melangkah menyusul masuk ke kabin mobil
      tl.to(p2.position, {
        x: pickupCarPos.x,
        z: pickupCarPos.z,
        duration: 0.16,
      });
      tl.to(
        p2.scale,
        {
          x: 0.01,
          y: 0.01,
          z: 0.01,
          duration: 0.14,
        },
        "-=0.1",
      );

      // Pintu samping mobil bergeser menutup rapat
      if (carUD.sideDoor) {
        tl.to(
          carUD.sideDoor.position,
          {
            z: carUD.sideDoorBaseZ ?? -0.12,
            duration: 0.15,
            ease: "power2.in",
          },
          "+=0.02",
        );
      }

      // Suspensi mobil berguncang realistis saat penumpang & polisi masuk
      tl.to(
        carUD.bodyGroup.position,
        {
          y: -0.1,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: "power1.inOut",
        },
        "-=0.08",
      );
      tl.to(
        carUD.bodyGroup.rotation,
        {
          z: 0.07,
          duration: 0.08,
          yoyo: true,
          repeat: 1,
          ease: "power1.inOut",
        },
        "<",
      );

      // 3. Mobil Patroli Melaju Menyusuri Petak-Petak Kartu Keliling Papan (Muter Board):
      const normalizeAngle = (from, to) => {
        let diff = (to - from) % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        return from + diff;
      };

      const stepDuration = totalDriveDuration / Math.max(1, pathTileIndices.length);

      pathTileIndices.forEach((tIdx, idx) => {
        const isLast = idx === pathTileIndices.length - 1;
        const targetCoord = this.board3D.getTileCenterPosition(tIdx);

        // Jika petak terakhir (#10 Lapas), tuju ke titik parkir tepat di depan pintu sel
        const destX = isLast ? dropOffPos.x - 0.85 : targetCoord.x;
        const destY = targetCoord.y + 0.16;
        const destZ = isLast ? dropOffPos.z + 0.35 : targetCoord.z;

        tl.call(() => {
          const dx = destX - car.position.x;
          const dz = destZ - car.position.z;
          if (Math.abs(dx) > 0.05 || Math.abs(dz) > 0.05) {
            const nextAngle = Math.atan2(dx, dz);
            const targetYaw = normalizeAngle(currentCarYaw, nextAngle);
            currentCarYaw = targetYaw;
            gsap.to(car.rotation, {
              y: targetYaw,
              duration: stepDuration * 0.85,
              ease: "power1.out",
            });
          }
        });

        tl.to(car.position, {
          x: destX,
          y: destY,
          z: destZ,
          duration: stepDuration,
          ease: idx === 0 ? "power1.in" : isLast ? "power1.out" : "none",
          onUpdate: () => {
            token.position.set(
              car.position.x,
              car.position.y + 0.3,
              car.position.z,
            );
            p1.position.copy(car.position);
            p2.position.copy(car.position);
            carUD.bodyGroup.position.y =
              Math.abs(Math.sin(performance.now() * 0.038)) * 0.04;
            carUD.bodyGroup.rotation.z =
              Math.sin(performance.now() * 0.024) * 0.03;
          },
        });
      });

      // Parkir menyamping menghadap pintu sel saat tiba di depan Lapas
      tl.to(
        car.rotation,
        {
          y: Math.PI / 2,
          duration: 0.24,
          ease: "power2.out",
        },
        "-=0.12",
      );

      // Pintu geser samping mobil terbuka untuk menurunkan tahanan
      if (carUD.sideDoor) {
        tl.to(
          carUD.sideDoor.position,
          {
            z: (carUD.sideDoorBaseZ ?? -0.12) - 0.42,
            duration: 0.16,
            ease: "power2.out",
          },
          "+=0.04",
        );
      }

      // 4. Kedua Polisi Turun Bersama Pion di Depan Gerbang Sel Lapas
      const dropP1 = new THREE.Vector3(dropOffPos.x - 0.48, dropOffPos.y, dropOffPos.z);
      const dropP2 = new THREE.Vector3(dropOffPos.x + 0.48, dropOffPos.y, dropOffPos.z);
      const dropPion = new THREE.Vector3(dropOffPos.x, dropOffPos.y, dropOffPos.z);

      tl.call(() => {
        p1.position.copy(dropP1);
        p2.position.copy(dropP2);
        token.position.copy(dropPion);
        p1.rotation.set(0, Math.PI, 0);
        p2.rotation.set(0, Math.PI, 0);
        if (ud.charRig) ud.charRig.rotation.set(0, Math.PI, 0);
        else token.rotation.set(0, Math.PI, 0);
        p1.scale.set(1, 1, 1);
        p2.scale.set(1, 1, 1);
        token.scale.set(1, 1, 1);
        p1.visible = true;
        p2.visible = true;
      });

      // Tampilkan ketiga karakter di depan pintu sel lapas
      tl.to(
        [token.scale, p1.scale, p2.scale],
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.22,
          ease: "back.out(1.4)",
        },
        "+=0.02",
      );

      // 5. ADEGAN PELEMPARAN: Kedua Polisi Mengangkat & Melempar Pion ke Dalam Sel!
      // Ancang-ancang: Kedua polisi condong ke belakang & mengangkat pion ke atas
      tl.to(
        [p1UD.charRig.rotation, p2UD.charRig.rotation],
        {
          x: -0.45,
          duration: 0.18,
          ease: "power1.out",
        },
        "+=0.06",
      );
      tl.to(
        token.position,
        {
          y: dropOffPos.y + 0.65,
          duration: 0.18,
          ease: "power1.out",
        },
        "<",
      );
      tl.to(
        p1UD.rightArm.rotation,
        {
          x: -0.9,
          z: 0.4,
          duration: 0.18,
        },
        "<",
      );
      tl.to(
        p2UD.leftArm.rotation,
        {
          x: -0.9,
          z: -0.4,
          duration: 0.18,
        },
        "<",
      );

      // KEDUA POLISI MENGAYUNKAN TANGAN MELEMPAR PION KE DALAM SEL!
      tl.to(
        [p1UD.charRig.rotation, p2UD.charRig.rotation],
        {
          x: 0.55,
          duration: 0.14,
          ease: "power2.in",
        },
      );
      tl.to(
        p1UD.rightArm.rotation,
        {
          x: 1.45,
          z: 0.2,
          duration: 0.14,
        },
        "<",
      );
      tl.to(
        p2UD.leftArm.rotation,
        {
          x: 1.45,
          z: -0.2,
          duration: 0.14,
        },
        "<",
      );

      // PION MELUNCUR TERLEMPAR PARABOLA KE DALAM SEL PENJARA!
      // Horizontal Z meluncur masuk melewati jeruji yang terbuka
      tl.to(
        token.position,
        {
          x: insideCellPos.x,
          z: insideCellPos.z,
          duration: 0.44,
          ease: "power1.out",
        },
        "<",
      );
      // Vertikal Y melambung tinggi di puncak lemparan lalu jatuh ke lantai sel
      tl.to(
        token.position,
        {
          y: insideCellPos.y + 1.25,
          duration: 0.22,
          ease: "power2.out",
        },
        "<",
      );
      tl.to(
        token.position,
        {
          y: insideCellPos.y,
          duration: 0.22,
          ease: "power2.in",
        },
        ">",
      );
      // Pion berguling / tumbling di udara saat terlempar
      tl.to(
        ud.charRig ? ud.charRig.rotation : token.rotation,
        {
          x: Math.PI * 2,
          duration: 0.44,
          ease: "none",
        },
        "<-0.44",
      );

      // Pion mendarat di lantai sel, lalu bangkit dan berbalik menghadap ke luar jeruji (yaw = 0)
      tl.to(
        ud.charRig ? ud.charRig.rotation : token.rotation,
        {
          x: 0,
          y: 0,
          duration: 0.22,
          ease: "power2.out",
        },
        "+=0.08",
      );

      // Kedua polisi kembali berdiri tegak dan berkacak pinggang puas di luar gerbang
      tl.to(
        [p1UD.charRig.rotation, p2UD.charRig.rotation],
        {
          x: 0,
          duration: 0.18,
        },
        "+=0.04",
      );
      tl.to(
        p1UD.leftArm.rotation,
        {
          z: -0.65,
          x: 0,
          duration: 0.18,
        },
        "<",
      );
      tl.to(
        p1UD.rightArm.rotation,
        {
          z: 0.65,
          x: 0,
          duration: 0.18,
        },
        "<",
      );
      tl.to(
        p2UD.leftArm.rotation,
        {
          z: -0.65,
          x: 0,
          duration: 0.18,
        },
        "<",
      );
      tl.to(
        p2UD.rightArm.rotation,
        {
          z: 0.65,
          x: 0,
          duration: 0.18,
        },
        "<",
      );

      // Pintu samping mobil menutup kembali
      if (carUD.sideDoor) {
        tl.to(
          carUD.sideDoor.position,
          {
            z: carUD.sideDoorBaseZ ?? -0.12,
            duration: 0.14,
            ease: "power2.in",
          },
          "+=0.08",
        );
      }

      // Kedua polisi kembali naik ke mobil patroli (scale down ke 0.01)
      tl.to(
        [p1.scale, p2.scale],
        {
          x: 0.01,
          y: 0.01,
          z: 0.01,
          duration: 0.2,
        },
        "+=0.04",
      );

      // Mobil patroli tancap gas meninggalkan Lapas
      tl.to(
        car.position,
        {
          x: dropOffPos.x + 4.8,
          duration: 0.55,
          ease: "power2.in",
        },
        "+=0.05",
      );
      tl.to(
        car.scale,
        {
          x: 0.01,
          y: 0.01,
          z: 0.01,
          duration: 0.25,
        },
        "-=0.25",
      );
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
    const disposeGroup = (grp) => {
      if (!grp) return;
      this.scene.remove(grp);
      grp.traverse((obj) => {
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
    };

    disposeGroup(this.policeCar);
    disposeGroup(this.policeOfficer1);
    disposeGroup(this.policeOfficer2);

    if (this.micSpriteTexture) {
      this.micSpriteTexture.dispose();
    }
  }
}
