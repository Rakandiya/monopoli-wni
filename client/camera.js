// Manajer Kamera Terpadu dengan State Machine (Upgrade Tugas 5):
// State Kamera:
// - 'OVERVIEW'  : Sudut pandang seluruh papan (OrbitControls aktif)
// - 'FOLLOW'    : Kamera third-person agak di atas & belakang pion saat bergerak dengan lerp/damping
// - 'CINEMATIC' : Kamera sinematik saat masuk penjara / bencana / bangunan naik (OrbitControls dikunci)
// - 'MANUAL'    : Pemain menyentuh OrbitControls saat kamera sedang FOLLOW (menimpa follow sementara tanpa konflik)

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";

export const CAMERA_STATE = {
  OVERVIEW: "OVERVIEW",
  FOLLOW: "FOLLOW",
  CINEMATIC: "CINEMATIC",
  MANUAL: "MANUAL",
};

export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.defaultPosition = new THREE.Vector3(0, 19.5, 19.5);
    this.defaultTarget = new THREE.Vector3(0, 0, 0);

    this.camera.position.copy(this.defaultPosition);

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2.12;
    this.controls.minDistance = 5.5;
    this.controls.maxDistance = 38;
    this.controls.target.copy(this.defaultTarget);
    // Nonaktifkan zoom bawaan OrbitControls karena kita ganti dengan Zoom-ke-Kursor (Zoom towards mouse pointer)
    this.controls.enableZoom = false;

    // Aktifkan Geser Papan (Panning) horizontal di atas bidang papan (X-Z)
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = false; // Menggeser secara sejajar dengan permukaan papan tanah (bukan naik ke langit)
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN,
    };

    this.state = CAMERA_STATE.OVERVIEW;
    this.isCinematic = false;
    this.savedPosition = new THREE.Vector3();
    this.savedTarget = new THREE.Vector3();

    // Helper untuk raycasting titik kursor mouse di ruang dunia 3D papan
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.cursorHitPoint = new THREE.Vector3();
    this.lookDirection = new THREE.Vector3();

    // Callback pengambil posisi & rotasi pion untuk mode FOLLOW
    this.followTransformGetter = null;
    this.desiredFollowPos = new THREE.Vector3();
    this.desiredFollowTarget = new THREE.Vector3();

    // State untuk efek guncangan kamera (screen shake) yang kompatibel dengan semua state
    this.shakeOffset = new THREE.Vector3();
    this.shakeIntensity = 0;
    this.shakeTimer = 0;

    // State keyboard untuk menggeser papan (WASD / Tombol Panah / Spasi)
    this.keysPressed = {};
    this.isSpacePressed = false;

    // Cegah menu klik kanan default browser agar Klik Kanan Drag berfungsi mulus untuk menggeser papan
    this._onContextMenu = (e) => e.preventDefault();
    this.domElement.addEventListener("contextmenu", this._onContextMenu);

    // Tahan Spasi untuk menggeser papan dengan Klik Kiri Drag (gaya Google Maps / Figma / CAD)
    this._onKeyDown = (e) => {
      if (this._isTyping(e)) return;
      if (e.code === "Space" && !this.isSpacePressed) {
        this.isSpacePressed = true;
        this.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        this.domElement.style.cursor = "grab";
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyS", "KeyA", "KeyD"].includes(e.code)) {
        this.keysPressed[e.code] = true;
      }
    };

    this._onKeyUp = (e) => {
      if (e.code === "Space") {
        this.isSpacePressed = false;
        this.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        this.domElement.style.cursor = "";
      }
      if (this.keysPressed[e.code]) {
        delete this.keysPressed[e.code];
      }
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);

    // Jika pemain menyentuh/menggeser OrbitControls secara manual saat mode FOLLOW,
    // otomatis timpa mode FOLLOW menjadi MANUAL agar kamera tidak berebut dengan mouse pemain
    this._onUserControlStart = () => {
      if (this.state === CAMERA_STATE.FOLLOW) {
        gsap.killTweensOf(this.camera.position);
        gsap.killTweensOf(this.controls.target);
        this.state = CAMERA_STATE.MANUAL;
      }
    };
    this.controls.addEventListener("start", this._onUserControlStart);

    // Zoom Berdasarkan Posisi Kursor Mouse & Scroll Atas-Bawah Papan:
    // 1. Shift + Wheel / Tahan Spasi: Scroll / Geser papan maju-mundur (atas-bawah)
    // 2. Normal Wheel: Zoom in / Zoom out ke arah titik petak yang ditunjuk oleh kursor
    this._onWheelZoomToCursor = (e) => {
      if (this.state === CAMERA_STATE.CINEMATIC || !this.controls.enabled) return;

      e.preventDefault();

      if (this.state === CAMERA_STATE.FOLLOW) {
        gsap.killTweensOf(this.camera.position);
        gsap.killTweensOf(this.controls.target);
        this.state = CAMERA_STATE.MANUAL;
      }

      // Jika menahan tombol Shift atau Spasi saat scroll mouse, geser papan ke atas/bawah
      if (e.shiftKey || this.isSpacePressed) {
        const dirZ = e.deltaY < 0 ? -1 : 1;
        this.pan(0, dirZ, 3.2);
        return;
      }

      gsap.killTweensOf(this.camera.position);
      gsap.killTweensOf(this.controls.target);

      // Hitung koordinat NDC kursor mouse (-1 s/d +1)
      const rect = this.domElement.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.mouseNDC.set(ndcX, ndcY);

      this.raycaster.setFromCamera(this.mouseNDC, this.camera);

      // Cari titik pertemuan sinar mouse dengan bidang permukaan papan (Y = 0)
      let hasHit = this.raycaster.ray.intersectPlane(this.groundPlane, this.cursorHitPoint);

      // Jika kursor berada di luar batas papan atau menunjuk langit, proyeksikan ke bidang tegak lurus target kamera
      if (!hasHit || this.cursorHitPoint.distanceTo(this.controls.target) > 35) {
        this.camera.getWorldDirection(this.lookDirection);
        const fallbackPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          this.lookDirection.clone().negate(),
          this.controls.target,
        );
        hasHit = this.raycaster.ray.intersectPlane(fallbackPlane, this.cursorHitPoint);
      }

      const P = hasHit ? this.cursorHitPoint : this.controls.target;

      // Normalisasi nilai deltaY wheel (scroll up < 0 = Zoom In, scroll down > 0 = Zoom Out)
      const deltaNorm = Math.max(-1, Math.min(1, e.deltaY / 60));
      let scaleFactor = Math.pow(1.15, deltaNorm);

      const curDist = this.camera.position.distanceTo(this.controls.target);
      const newDist = curDist * scaleFactor;

      if (newDist < this.controls.minDistance) {
        scaleFactor = this.controls.minDistance / curDist;
      } else if (newDist > this.controls.maxDistance) {
        scaleFactor = this.controls.maxDistance / curDist;
      }

      if (Math.abs(scaleFactor - 1) < 0.001) return;

      // Geser kamera dan target orbit secara proporsional berpusat pada titik P di bawah kursor
      // Baik Zoom In (scaleFactor < 1) maupun Zoom Out (scaleFactor > 1) selalu berpusat pada posisi mouse
      const newCamPos = new THREE.Vector3().lerpVectors(P, this.camera.position, scaleFactor);
      const newTarget = new THREE.Vector3().lerpVectors(P, this.controls.target, scaleFactor);

      // Batasi target agar tetap berada di area sekitar papan (batas aman -24 s/d +24)
      const clampedX = THREE.MathUtils.clamp(newTarget.x, -24, 24);
      const clampedZ = THREE.MathUtils.clamp(newTarget.z, -24, 24);
      const shiftX = clampedX - newTarget.x;
      const shiftZ = clampedZ - newTarget.z;
      newTarget.x = clampedX;
      newTarget.z = clampedZ;
      newCamPos.x += shiftX;
      newCamPos.z += shiftZ;

      this.camera.position.copy(newCamPos);
      this.controls.target.copy(newTarget);
      this.controls.update();
    };

    this.domElement.addEventListener("wheel", this._onWheelZoomToCursor, { passive: false });
  }

  // Kembalikan sudut kamera ke posisi seluruh papan (OVERVIEW) dengan transisi halus
  resetView(duration = 0.85) {
    if (this.state === CAMERA_STATE.CINEMATIC) return Promise.resolve();

    this.state = CAMERA_STATE.OVERVIEW;
    this.followTransformGetter = null;
    this.controls.enabled = true;

    return new Promise((resolve) => {
      gsap.killTweensOf(this.camera.position);
      gsap.killTweensOf(this.controls.target);

      const tl = gsap.timeline({ onComplete: () => resolve() });
      tl.to(
        this.camera.position,
        {
          x: this.defaultPosition.x,
          y: this.defaultPosition.y,
          z: this.defaultPosition.z,
          duration,
          ease: "power2.inOut",
        },
        0,
      );
      tl.to(
        this.controls.target,
        {
          x: this.defaultTarget.x,
          y: this.defaultTarget.y,
          z: this.defaultTarget.z,
          duration,
          ease: "power2.inOut",
        },
        0,
      );
    });
  }

  // Fokus kamera tegak lurus ke sebuah petak agar kartu dapat dibaca dengan jelas & tajam
  focusOnTile(tileIndex, coord, mesh, duration = 0.75) {
    if (this.state === CAMERA_STATE.CINEMATIC) return Promise.resolve();

    this.state = CAMERA_STATE.MANUAL;
    this.followTransformGetter = null;
    this.controls.enabled = true;

    const target = new THREE.Vector3(coord.x, coord.y + 0.15, coord.z);

    // Vektor offset posisi kamera dari titik tengah petak
    // Untuk petak biasa, local +Z adalah bagian depan/bawah kartu (harga), local -Z adalah pita warna atas.
    // Menempatkan kamera di local +Z (y = 3.4, z = 1.9) memberikan sudut pandang membaca ~65 derajat yang sangat jelas.
    let localOffset = new THREE.Vector3(0, 3.4, 1.9);

    if (coord.isCorner) {
      // Sudut 4 sisi menghadap diagonal ke luar
      const cxSign = Math.sign(coord.x) || 1;
      const czSign = Math.sign(coord.z) || 1;
      localOffset = new THREE.Vector3(cxSign * 2.8, 3.6, czSign * 2.8);
    } else if (mesh && mesh.rotation) {
      localOffset.applyEuler(mesh.rotation);
    } else if (coord.rotY !== undefined) {
      localOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), coord.rotY);
    }

    const camPos = new THREE.Vector3(coord.x, coord.y, coord.z).add(localOffset);

    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.controls.target);

    return new Promise((resolve) => {
      const tl = gsap.timeline({
        onComplete: () => {
          this.controls.target.copy(target);
          this.controls.update();
          resolve();
        },
      });

      tl.to(
        this.camera.position,
        {
          x: camPos.x,
          y: camPos.y,
          z: camPos.z,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            this.camera.lookAt(this.controls.target);
          },
        },
        0,
      );

      tl.to(
        this.controls.target,
        {
          x: target.x,
          y: target.y,
          z: target.z,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            this.camera.lookAt(this.controls.target);
          },
        },
        0,
      );
    });
  }

  // Sudut pandang salah satu dari 4 sisi papan agar seluruh baris petak sisi tersebut tegak lurus
  viewSide(sideIndex, duration = 0.8) {
    if (this.state === CAMERA_STATE.CINEMATIC) return Promise.resolve();

    this.state = CAMERA_STATE.MANUAL;
    this.followTransformGetter = null;
    this.controls.enabled = true;

    let camPos, target;
    if (sideIndex === 0) {
      // Sisi Selatan / Depan (Petak 0-9)
      camPos = new THREE.Vector3(0, 11.5, 14.8);
      target = new THREE.Vector3(0, 0.2, 7.8);
    } else if (sideIndex === 1) {
      // Sisi Barat / Kiri (Petak 10-19)
      camPos = new THREE.Vector3(-14.8, 11.5, 0);
      target = new THREE.Vector3(-7.8, 0.2, 0);
    } else if (sideIndex === 2) {
      // Sisi Utara / Atas (Petak 20-29)
      camPos = new THREE.Vector3(0, 11.5, -14.8);
      target = new THREE.Vector3(0, 0.2, -7.8);
    } else if (sideIndex === 3) {
      // Sisi Timur / Kanan (Petak 30-39)
      camPos = new THREE.Vector3(14.8, 11.5, 0);
      target = new THREE.Vector3(7.8, 0.2, 0);
    } else {
      return this.resetView(duration);
    }

    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.controls.target);

    return new Promise((resolve) => {
      const tl = gsap.timeline({
        onComplete: () => {
          this.controls.target.copy(target);
          this.controls.update();
          resolve();
        },
      });

      tl.to(
        this.camera.position,
        {
          x: camPos.x,
          y: camPos.y,
          z: camPos.z,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            this.camera.lookAt(this.controls.target);
          },
        },
        0,
      );

      tl.to(
        this.controls.target,
        {
          x: target.x,
          y: target.y,
          z: target.z,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            this.camera.lookAt(this.controls.target);
          },
        },
        0,
      );
    });
  }

  // Tugas 5: Mulai kamera Third-Person Follow di belakang & agak di atas pion
  startFollowToken(getTransformFn) {
    if (this.state === CAMERA_STATE.CINEMATIC) return;
    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.controls.target);

    this.followTransformGetter = getTransformFn;
    this.state = CAMERA_STATE.FOLLOW;
    this.controls.enabled = true; // Tetap aktif agar pemain bisa mengintervensi kapan saja
  }

  // Tugas 5: Setelah pion berhenti, transisi halus kembali ke view seluruh papan
  stopFollowToken(duration = 0.85) {
    this.followTransformGetter = null;
    if (this.state === CAMERA_STATE.CINEMATIC) return Promise.resolve();
    return this.resetView(duration);
  }

  beginCinematic() {
    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.controls.target);

    if (this.state !== CAMERA_STATE.CINEMATIC) {
      // Simpan posisi overview atau posisi terakhir yang stabil
      this.savedPosition.copy(this.defaultPosition);
      this.savedTarget.copy(this.defaultTarget);
    }
    this.state = CAMERA_STATE.CINEMATIC;
    this.isCinematic = true;
    this.controls.enabled = false;
  }

  focusOnPoint(targetPoint, options = {}) {
    const duration = options.duration ?? 0.65;
    const heightOffset = options.height ?? 4.6;
    const distOffset = options.distance ?? 5.8;

    this.beginCinematic();

    const radialDir = new THREE.Vector3(targetPoint.x, 0, targetPoint.z);
    if (radialDir.lengthSq() < 0.01) radialDir.set(0, 0, 1);
    else radialDir.normalize();

    const sideVec = new THREE.Vector3(
      -radialDir.z,
      0,
      radialDir.x,
    ).multiplyScalar(1.6);
    const camDest = new THREE.Vector3(
      targetPoint.x + radialDir.x * distOffset + sideVec.x,
      targetPoint.y + heightOffset,
      targetPoint.z + radialDir.z * distOffset + sideVec.z,
    );

    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: () => resolve() });

      tl.to(
        this.camera.position,
        {
          x: camDest.x,
          y: camDest.y,
          z: camDest.z,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            this.camera.lookAt(this.controls.target);
          },
        },
        0,
      );

      tl.to(
        this.controls.target,
        {
          x: targetPoint.x,
          y: targetPoint.y + 0.5,
          z: targetPoint.z,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            this.camera.lookAt(this.controls.target);
          },
        },
        0,
      );
    });
  }

  zoomToBoardOverview(duration = 0.85) {
    this.beginCinematic();
    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: () => resolve() });
      tl.to(
        this.camera.position,
        {
          x: 0,
          y: 21.0,
          z: 18.5,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            this.camera.lookAt(this.controls.target);
          },
        },
        0,
      );
      tl.to(
        this.controls.target,
        {
          x: 0,
          y: 0,
          z: 0,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            this.camera.lookAt(this.controls.target);
          },
        },
        0,
      );
    });
  }

  endCinematic(duration = 0.75) {
    if (this.state !== CAMERA_STATE.CINEMATIC) return Promise.resolve();

    return new Promise((resolve) => {
      const tl = gsap.timeline({
        onComplete: () => {
          this.state = CAMERA_STATE.OVERVIEW;
          this.isCinematic = false;
          this.controls.enabled = true;
          this.controls.update();
          resolve();
        },
      });

      tl.to(
        this.camera.position,
        {
          x: this.savedPosition.x,
          y: this.savedPosition.y,
          z: this.savedPosition.z,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            this.camera.lookAt(this.controls.target);
          },
        },
        0,
      );

      tl.to(
        this.controls.target,
        {
          x: this.savedTarget.x,
          y: this.savedTarget.y,
          z: this.savedTarget.z,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            this.camera.lookAt(this.controls.target);
          },
        },
        0,
      );
    });
  }

  shake(intensity = 0.38, duration = 0.7) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  update(dt = 0.016) {
    // 1. Bersihkan offset shake dari frame sebelumnya agar tidak merusak koordinat OrbitControls/Follow
    if (this.shakeOffset.lengthSq() > 0) {
      this.camera.position.sub(this.shakeOffset);
      this.shakeOffset.set(0, 0, 0);
    }

    // 2. Jika sedang dalam state FOLLOW, gerakkan kamera secara third-person di belakang & atas pion
    if (
      this.state === CAMERA_STATE.FOLLOW &&
      typeof this.followTransformGetter === "function"
    ) {
      const { position, yaw } = this.followTransformGetter();

      // Vektor arah hadap pion
      const forwardX = Math.sin(yaw);
      const forwardZ = Math.cos(yaw);

      // Posisi kamera agak di atas (y + 4.2) dan di belakang pion (-forward * 5.2)
      // Ditambah sedikit tarikan ke arah luar papan agar papan tetap terlihat jelas
      this.desiredFollowPos.set(
        position.x - forwardX * 5.2 + position.x * 0.22,
        position.y + 4.2,
        position.z - forwardZ * 5.2 + position.z * 0.22,
      );

      // Titik fokus kamera sedikit di depan dada pion
      this.desiredFollowTarget.set(
        position.x + forwardX * 0.8,
        position.y + 0.65,
        position.z + forwardZ * 0.8,
      );

      // Smoothing eksponensial berbasis delta-time (halus di 45 FPS maupun 144 FPS)
      const smoothFactor = 1 - Math.exp(-6.5 * dt);
      this.camera.position.lerp(this.desiredFollowPos, smoothFactor);
      this.controls.target.lerp(this.desiredFollowTarget, smoothFactor);
      this.controls.update();
    } else if (this.controls.enabled && this.state !== CAMERA_STATE.CINEMATIC) {
      this._updateKeyboardPan(dt);
      this.controls.update();
    } else if (this.state === CAMERA_STATE.CINEMATIC) {
      this.camera.lookAt(this.controls.target);
    }

    // 3. Terapkan guncangan kamera (screen shake) di atas state aktif apa pun tanpa konflik
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const damp = Math.max(0, this.shakeTimer);
      const curMag = this.shakeIntensity * Math.min(1, damp * 2.5);
      this.shakeOffset.set(
        (Math.random() - 0.5) * 2 * curMag,
        (Math.random() - 0.5) * 2 * curMag,
        (Math.random() - 0.5) * 2 * curMag,
      );
      this.camera.position.add(this.shakeOffset);
    }
  }

  // Geser papan secara mulus (Pan Up/Down/Left/Right) dengan jarak tertentu
  pan(dirX, dirZ, distance = 3.5) {
    if (this.state === CAMERA_STATE.CINEMATIC) return;
    if (this.state === CAMERA_STATE.FOLLOW) this.state = CAMERA_STATE.MANUAL;

    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.controls.target);

    // Hitung vektor arah maju kamera di atas bidang datar papan (horizontal X-Z)
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveVec = new THREE.Vector3();
    if (dirZ !== 0) moveVec.addScaledVector(forward, -dirZ * distance);
    if (dirX !== 0) moveVec.addScaledVector(right, dirX * distance);

    const newTarget = this.controls.target.clone().add(moveVec);
    newTarget.x = THREE.MathUtils.clamp(newTarget.x, -16.5, 16.5);
    newTarget.z = THREE.MathUtils.clamp(newTarget.z, -16.5, 16.5);

    const deltaTarget = newTarget.clone().sub(this.controls.target);
    const newCamPos = this.camera.position.clone().add(deltaTarget);

    gsap.to(this.controls.target, {
      x: newTarget.x,
      y: newTarget.y,
      z: newTarget.z,
      duration: 0.28,
      ease: "power2.out",
    });

    gsap.to(this.camera.position, {
      x: newCamPos.x,
      y: newCamPos.y,
      z: newCamPos.z,
      duration: 0.28,
      ease: "power2.out",
      onUpdate: () => this.controls.update(),
    });
  }

  // Pergerakan halus saat tombol WASD atau tombol panah ditekan
  _updateKeyboardPan(dt) {
    if (this.state === CAMERA_STATE.CINEMATIC) return;
    if (!this.keysPressed || Object.keys(this.keysPressed).length === 0) return;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const speed = 18 * dt; // 18 unit dunia per detik
    const move = new THREE.Vector3();

    if (this.keysPressed["ArrowUp"] || this.keysPressed["KeyW"]) move.add(forward);
    if (this.keysPressed["ArrowDown"] || this.keysPressed["KeyS"]) move.sub(forward);
    if (this.keysPressed["ArrowRight"] || this.keysPressed["KeyD"]) move.add(right);
    if (this.keysPressed["ArrowLeft"] || this.keysPressed["KeyA"]) move.sub(right);

    if (move.lengthSq() > 0) {
      if (this.state === CAMERA_STATE.FOLLOW) this.state = CAMERA_STATE.MANUAL;
      move.normalize().multiplyScalar(speed);

      const targetX = THREE.MathUtils.clamp(this.controls.target.x + move.x, -16.5, 16.5);
      const targetZ = THREE.MathUtils.clamp(this.controls.target.z + move.z, -16.5, 16.5);
      const actualMove = new THREE.Vector3(
        targetX - this.controls.target.x,
        0,
        targetZ - this.controls.target.z,
      );

      this.controls.target.add(actualMove);
      this.camera.position.add(actualMove);
      this.controls.update();
    }
  }

  _isTyping(e) {
    const tag = (e.target || document.activeElement)?.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  }

  dispose() {
    this.domElement.removeEventListener("contextmenu", this._onContextMenu);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    this.domElement.removeEventListener("wheel", this._onWheelZoomToCursor);
    this.controls.removeEventListener("start", this._onUserControlStart);
    this.controls.dispose();
  }
}
