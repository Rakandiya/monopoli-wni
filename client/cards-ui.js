// Komponen Overlay Kartu Takdir & Musibah (Upgrade Tugas 3):
// - Animasi muncul: 3D Flip + Scale-Up + Slide menggunakan GSAP
// - Menampilkan: ID Kartu, Judul Kartu, Teks Satir Indonesia, dan Badge Efek
// - Mendukung Mode Interaktif (Pemain aktif klik tombol "OK, Jalankan Efek") dan
//   Mode Read-Only di Multiplayer (Pemain lain melihat kartu yang sama dan menunggu)

import gsap from "gsap";
import { formatRupiah } from "../shared/tiles.js";

export class CardsUI {
  constructor() {
    this.modal = document.getElementById("card-modal");
    this.box = document.getElementById("card-modal-box");
    this.badge = document.getElementById("card-modal-badge");
    this.title = document.getElementById("card-modal-title");
    this.text = document.getElementById("card-modal-text");
    this.effectPill = document.getElementById("card-modal-effect");
    this.waitingNote = document.getElementById("card-waiting-note");
    this.btnClose = document.getElementById("btn-close-card");

    this._activeHandler = null;
  }

  _formatRingkasanEfek(kartu) {
    if (!kartu) return "";
    if (kartu.tipe === "uang") {
      return kartu.nilai >= 0
        ? `Efek: Terima Uang +${formatRupiah(kartu.nilai)}`
        : `Efek: Bayar Tagihan ${formatRupiah(kartu.nilai)}`;
    }
    if (kartu.tipe === "pindah") {
      return `Efek: Pindah ke Petak #${kartu.nilai}`;
    }
    if (kartu.tipe === "penjara") {
      return "Efek: Langsung Masuk Lapas Cipinang (#10)";
    }
    if (kartu.tipe === "bayarPerBangunan") {
      return `Efek: Bayar ${formatRupiah(kartu.nilai)} per Level Bangunan`;
    }
    if (kartu.tipe === "terimaDariSemua") {
      return `Efek: Terima ${formatRupiah(kartu.nilai)} dari Setiap Pemain`;
    }
    return "";
  }

  // Menampilkan kartu dengan animasi 3D Flip + Scale-Up + Slide
  // Jika canConfirm === true: tombol "OK" aktif dan memanggil onConfirmCallback saat ditekan.
  // Jika canConfirm === false (pemain lain di multiplayer): kartu bersifat Read-Only.
  presentCard({ jenisDeck, kartu, namaPemain, canConfirm, onConfirmCallback }) {
    const isTakdir = jenisDeck === "TAKDIR";
    this.box.className = `modal-box card-popup ${isTakdir ? "takdir" : "musibah"}`;
    this.badge.textContent = `${isTakdir ? "KARTU TAKDIR" : "KARTU MUSIBAH"} • #${kartu.id}`;
    this.title.textContent =
      kartu.judul ||
      (isTakdir ? `Berkah ${namaPemain}` : `Ujian ${namaPemain}`);
    this.text.textContent = kartu.teks;

    if (this.effectPill) {
      this.effectPill.textContent = this._formatRingkasanEfek(kartu);
    }

    if (this._activeHandler) {
      this.btnClose.removeEventListener("click", this._activeHandler);
      this._activeHandler = null;
    }

    if (canConfirm) {
      this.btnClose.style.display = "inline-block";
      this.btnClose.disabled = false;
      this.btnClose.textContent = "OK, Jalankan Efek";
      if (this.waitingNote) {
        this.waitingNote.style.display = "none";
      }

      this._activeHandler = () => {
        this.btnClose.disabled = true;
        this.btnClose.textContent = "Memproses...";
        if (onConfirmCallback) onConfirmCallback();
      };
      this.btnClose.addEventListener("click", this._activeHandler);
    } else {
      this.btnClose.style.display = "none";
      if (this.waitingNote) {
        this.waitingNote.style.display = "block";
        this.waitingNote.textContent = `Menunggu ${namaPemain} menekan tombol "OK"...`;
      }
    }

    this.modal.classList.remove("hidden");

    // Animasi GSAP: Flip 3D (rotationY) + Scale-Up + Slide dari bawah
    gsap.killTweensOf(this.box);
    gsap.fromTo(
      this.box,
      {
        rotationY: -180,
        scale: 0.45,
        y: 90,
        opacity: 0,
      },
      {
        rotationY: 0,
        scale: 1,
        y: 0,
        opacity: 1,
        duration: 0.65,
        ease: "back.out(1.5)",
      },
    );
  }

  // Menutup overlay kartu dengan animasi halus (dipanggil saat CARD_CONFIRMED diterima)
  hideCard() {
    if (this.modal.classList.contains("hidden")) return Promise.resolve();

    return new Promise((resolve) => {
      gsap.to(this.box, {
        scale: 0.75,
        y: -40,
        opacity: 0,
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => {
          this.modal.classList.add("hidden");
          resolve();
        },
      });
    });
  }
}
