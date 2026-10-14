// Pengelola Kamera Perspektif, OrbitControls (Damping), Kamera Sinematik, & Screen Shake
// Saat kamera sinematik aktif: OrbitControls dinonaktifkan sementara, posisi kamera sebelumnya
// disimpan, lalu dikembalikan dengan tween halus setelah animasi event selesai.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';

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
    this.controls.minDistance = 6;
    this.controls.maxDistance = 36;
    this.controls.target.copy(this.defaultTarget);

    // State penyimpanan posisi sebelum kamera sinematik aktif
    this.isCinematic = false;
    this.savedPosition = new THREE.Vector3();
    this.savedTarget = new THREE.Vector3();

    // State untuk efek guncangan layar (screen shake)
    this.shakeOffset = new THREE.Vector3();
    this.shakeIntensity = 0;
    this.shakeTimer = 0;
  }

  // Kembalikan sudut kamera ke posisi standar dengan tween halus
  resetView() {
    if (this.isCinematic) return;
    gsap.to(this.camera.position, {
      x: this.defaultPosition.x,
      y: this.defaultPosition.y,
      z: this.defaultPosition.z,
      duration: 0.85,
      ease: 'power2.inOut'
    });
    gsap.to(this.controls.target, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.85,
      ease: 'power2.inOut'
    });
  }

  // Mulai mode sinematik: simpan sudut pandang pemain dan kunci OrbitControls
  beginCinematic() {
    if (!this.isCinematic) {
      this.savedPosition.copy(this.camera.position);
      this.savedTarget.copy(this.controls.target);
      this.isCinematic = true;
      this.controls.enabled = false;
    }
  }

  // Fokuskan kamera secara sinematik ke titik 3D tertentu (misal Lapas, petak bencana, atau token)
  focusOnPoint(targetPoint, options = {}) {
    const duration = options.duration ?? 0.65;
    const heightOffset = options.height ?? 4.8;
    const distOffset = options.distance ?? 6.2;

    this.beginCinematic();

    // Hitung arah kamera dari titik target menuju luar/tengah agar papan terlihat dramatis
    const radialDir = new THREE.Vector3(targetPoint.x, 0, targetPoint.z);
    if (radialDir.lengthSq() < 0.01) {
      radialDir.set(0, 0, 1);
    } else {
      radialDir.normalize();
    }

    // Tempatkan kamera sedikit menyamping dan menghadap ke targetPoint
    const sideVec = new THREE.Vector3(-radialDir.z, 0, radialDir.x).multiplyScalar(1.8);
    const camDest = new THREE.Vector3(
      targetPoint.x + radialDir.x * distOffset + sideVec.x,
      targetPoint.y + heightOffset,
      targetPoint.z + radialDir.z * distOffset + sideVec.z
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
          ease: 'power2.inOut',
          onUpdate: () => {
            this.camera.lookAt(this.controls.target);
          }
        },
        0
      );

      tl.to(
        this.controls.target,
        {
          x: targetPoint.x,
          y: targetPoint.y + 0.5,
          z: targetPoint.z,
          duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            this.camera.lookAt(this.controls.target);
          }
        },
        0
      );
    });
  }

  // Kembalikan kamera dengan halus ke posisi sebelum sinematik dan aktifkan kembali OrbitControls
  endCinematic(duration = 0.75) {
    if (!this.isCinematic) return Promise.resolve();

    return new Promise((resolve) => {
      const tl = gsap.timeline({
        onComplete: () => {
          this.isCinematic = false;
          this.controls.enabled = true;
          this.controls.update();
          resolve();
        }
      });

      tl.to(
        this.camera.position,
        {
          x: this.savedPosition.x,
          y: this.savedPosition.y,
          z: this.savedPosition.z,
          duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            this.camera.lookAt(this.controls.target);
          }
        },
        0
      );

      tl.to(
        this.controls.target,
        {
          x: this.savedTarget.x,
          y: this.savedTarget.y,
          z: this.savedTarget.z,
          duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            this.camera.lookAt(this.controls.target);
          }
        },
        0
      );
    });
  }

  // memicu efek guncangan layar (screen shake) untuk bencana alam, pintu sel menutup, & bangkrut
  shake(intensity = 0.35, duration = 0.6) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  update(dt = 0.016) {
    // Bersihkan offset shake dari frame sebelumnya
    if (this.shakeOffset.lengthSq() > 0) {
      this.camera.position.sub(this.shakeOffset);
      this.shakeOffset.set(0, 0, 0);
    }

    if (this.controls.enabled && !this.isCinematic) {
      this.controls.update();
    } else if (this.isCinematic) {
      this.camera.lookAt(this.controls.target);
    }

    // Terapkan guncangan kamera jika timer aktif
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const damp = Math.max(0, this.shakeTimer);
      const curMag = this.shakeIntensity * Math.min(1, damp * 2.5);
      this.shakeOffset.set(
        (Math.random() - 0.5) * 2 * curMag,
        (Math.random() - 0.5) * 2 * curMag,
        (Math.random() - 0.5) * 2 * curMag
      );
      this.camera.position.add(this.shakeOffset);
    }
  }
}