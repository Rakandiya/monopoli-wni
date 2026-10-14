// Komponen Pop-up Kartu Takdir & Kartu Musibah

export class CardsUI {
  constructor() {
    this.modal = document.getElementById('card-modal');
    this.box = document.getElementById('card-modal-box');
    this.badge = document.getElementById('card-modal-badge');
    this.title = document.getElementById('card-modal-title');
    this.text = document.getElementById('card-modal-text');
    this.btnClose = document.getElementById('btn-close-card');
  }

  // Menampilkan pop-up kartu dan mengembalikan Promise yang selesai saat pemain menekan tombol
  showCard(jenisDeck, kartu, namaPemain) {
    return new Promise((resolve) => {
      const isTakdir = jenisDeck === 'TAKDIR';
      this.box.className = `modal-box card-popup ${isTakdir ? 'takdir' : 'musibah'}`;
      this.badge.textContent = isTakdir ? 'KARTU TAKDIR' : 'KARTU MUSIBAH';
      this.title.textContent = isTakdir ? `Berkah untuk ${namaPemain}` : `Ujian untuk ${namaPemain}`;
      this.text.textContent = kartu.teks;

      this.modal.classList.remove('hidden');

      const handler = () => {
        this.btnClose.removeEventListener('click', handler);
        this.modal.classList.add('hidden');
        resolve();
      };

      this.btnClose.addEventListener('click', handler);
    });
  }
}