# Spritesheet Studio

[English](README.md) | Bahasa Indonesia

Aplikasi web kecil untuk mengubah video, GIF, dan gambar menjadi spritesheet. Bisa edit frame, hapus background, gabung dua sheet, lalu export. Semuanya jalan 100% di browser: HTML, CSS, dan JavaScript biasa, tanpa build, tidak ada file yang diunggah ke server.

Versi 1.6 · [Changelog](CHANGELOG.id.md) · [Lisensi MIT](LICENSE)

Dibuat oleh **Farelfhmc** · Studio Fhilion

## Cara pakai

Buka aplikasinya (online lewat GitHub Pages, atau buka `index.html` di perangkatmu). Tab berurutan:

1. **Import** — masukkan video (MP4/WebM/MOV), GIF, atau gambar. Untuk video, atur FPS (atau interval), waktu mulai/akhir, maks frame, dan ukuran frame, lalu **Ekstrak Frame**. Untuk GIF, **Decode GIF**. Untuk gambar, **Tambahkan ke Frame**.
2. **Background** (opsional) — pilih **Hapus warna spesifik** atau **Chroma Key**. Klik gambar asli untuk ambil warna, atau tekan **Deteksi dari pojok**. Atur *Tolerance* (seberapa mirip warna yang ikut hilang) dan *Feather* (tepi halus). Tekan **Terapkan**; kalau hasilnya jelek, **Urungkan**.
3. **Spritesheet** — atur ukuran frame, kolom, padding, margin, lalu **Bangun Spritesheet**.
4. **Editor** — seret kartu (atau pakai ◀ ▶) untuk ubah urutan, × untuk hapus, **+ Tambah Gambar** untuk menambah, lalu **Rebuild**.
5. **Editor Sprite** *(beta)* — pilih frame lalu gambar di atasnya. Alat: **Brush**, **Eraser**, **Geser**; warna lewat picker, hex, atau warna cepat; ukuran kuas 1–32 px; zoom; **Urungkan** / **Ulangi** (Ctrl+Z / Ctrl+Y). Frame juga bisa diberi nama sendiri, dipakai sebagai nama file saat export. Kuasnya persegi tanpa anti-alias, cocok untuk pixel art.
6. **Gabung** — muat sheet A dan B, lalu gabung horizontal, vertikal, overlay, atau tambahkan frame-nya.
7. **Export** — isi **Nama file**, pilih **PNG / JPG / WebP** (JPG dan WebP punya slider kualitas; JPG mengisi area transparan dengan warna latar pilihanmu), lalu unduh spritesheet, **semua frame jadi satu ZIP** (atau satu per satu), atau JSON metadata (posisi dan nama frame). Kalau frame berubah setelah sheet dibangun, Export membangunnya ulang otomatis.

**Pixelated vs Smoothed** (kanan atas). *Pixelated* tidak pernah mencampur warna: paling cocok untuk pixel art. *Smoothed* merata-ratakan warna saat diperkecil dan menghaluskan saat diperbesar: lebih cocok untuk foto/video. Pengaturan ini berlaku saat frame diekstrak atau sheet dibangun, jadi bangun ulang setelah mengubahnya.

**Tips.** Untuk video pakai ukuran frame kecil (mis. 64–128 px). FPS lebih rendah = frame lebih sedikit dan rapi. Semua data hanya di memori; refresh halaman menghapus frame-mu.

## Jalankan lokal
Buka `index.html` di browser. Tidak perlu instal apa pun.

## Deploy ke GitHub Pages (untuk pemula)
1. Buat akun di github.com, lalu tekan **+ → New repository**. Beri nama (mis. `spritesheet-studio`), pilih **Public**, klik **Create repository**.
2. Klik **uploading an existing file** (atau **Add file → Upload files**). Unggah *isi* folder proyek (`index.html`, `style.css`, `app.js`, `README.md`, `README.id.md`, `LICENSE`, `CHANGELOG.md`, `CHANGELOG.id.md`). Ekstrak ZIP dulu, jangan unggah ZIP-nya. Klik **Commit changes**.
3. Buka **Settings → Pages**. Di *Build and deployment*, Source: **Deploy from a branch**, Branch: **main**, folder **/ (root)**, lalu **Save**.
4. Tunggu 1–2 menit. Situsmu: `https://<username>.github.io/<nama-repo>/`.

Untuk update nanti: buka file di repo, klik ikon pensil, edit, lalu commit — atau unggah ulang file dengan nama yang sama.

## Kredit
Dibuat oleh **Farelfhmc** · Studio Fhilion.

## Lisensi
[MIT](LICENSE). Bebas dipakai, diubah, dan dibagikan, termasuk untuk komersial, selama pemberitahuan lisensi tetap disertakan.
