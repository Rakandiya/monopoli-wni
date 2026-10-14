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

    this.state = CAMERA_STATE.OVERVIEW;
    this.isCinematic = false;
    this.savedPosition = new THREE.Vector3();
    this.savedTarget = new THREE.Vector3();

    // Callback pengambil posisi & rotasi pion untuk mode FOLLOW
    this.followTransformGetter = null;
    this.desiredFollowPos = new THREE.Vector3();
    this.desiredFollowTarget = new THREE.Vector3();

    // State untuk efek guncangan kamera (screen shake) yang kompatibel dengan semua state
    this.shakeOffset = new THREE.Vector3();
    this.shakeIntensity = 0;
    this.shakeTimer = 0;

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

  dispose() {
    this.controls.removeEventListener("start", this._onUserControlStart);
    this.controls.dispose();
  }
}
