# Spritesheet Studio

[English](README.md) | Bahasa Indonesia

Aplikasi web kecil untuk mengubah video, GIF, dan gambar menjadi spritesheet. Bisa edit frame, hapus background, gabung dua sheet, lalu export. Semuanya jalan 100% di browser: HTML, CSS, dan JavaScript biasa, tanpa build, tidak ada file yang diunggah ke server.

Versi 2.0 · [Changelog](CHANGELOG.id.md) · [Lisensi MIT](LICENSE)

Dibuat oleh **Farelfhmc** · Studio Fhilion

## Cara pakai

Buka aplikasinya (online lewat GitHub Pages, atau buka `index.html` di perangkatmu). Tab berurutan:

1. **Import** — masukkan video (MP4/WebM/MOV), GIF, atau gambar. Untuk video, atur FPS (atau interval), waktu mulai/akhir, maks frame, dan ukuran frame, lalu **Ekstrak Frame**. Untuk GIF, **Decode GIF**. Untuk gambar, **Tambahkan ke Frame**.
2. **Background** (opsional) — pilih **Hapus warna spesifik** atau **Chroma Key**. Klik gambar asli untuk ambil warna, atau tekan **Deteksi dari pojok**. Atur *Tolerance* (seberapa mirip warna yang ikut hilang) dan *Feather* (tepi halus). Tekan **Terapkan**; kalau hasilnya jelek, **Urungkan**.
3. **Spritesheet** — atur ukuran frame, kolom, padding, margin, lalu **Bangun Spritesheet**.
4. **Editor** — mengatur frame. Seret kartu untuk mengubah urutan (di ponsel, tahan kartu sebentar lalu seret), atau pakai ◀ ▶. Seret file gambar dari perangkatmu ke halaman untuk menambahnya sebagai frame. **+ Tambah Gambar** memilih gambar, **+ Frame Kosong** menambah frame transparan kosong, × menghapus. Lalu **Rebuild**.
5. **Paint Sprite** — gambar sprite memenuhi layar. Toolbar melayang yang ringkas ada tepat di bawah hamburger dan tidak memanjang: baris atas berisi tiga kategori (**Alat**, **Layer**, **Lihat**), kotak warna, dan urungkan / ulangi; baris di bawahnya berubah sesuai kategori.
   - **Alat:** **Brush**, **Eraser**, **Fill**, **Eyedrop**, **Geser**. Ketuk **Brush**, **Eraser**, atau **Fill** untuk membuka pengaturannya (ketuk lagi untuk menutup). Brush dan Eraser masing-masing punya *Ukuran* sendiri (1–64 px). **Fill** punya *Tolerance* (0–255: seberapa beda warna yang masih ikut terisi; 0 = persis sama), *Area isi* (**Terhubung** = hanya area yang menyambung, **Semua warna** = semua piksel yang cocok di frame), dan *Ambil warna dari* (**Layer ini** atau **Semua layer**). Kotak warna membuka **lingkaran warna** (seret cincin untuk memilih warna, kotak di dalamnya untuk kejenuhan dan kecerahan), kolom hex, dan warna cepat.
   - **Layer:** setiap frame bisa punya beberapa layer. **+ Layer** menambah satu di atas layer yang aktif; daftarnya menampilkan layer teratas lebih dulu. Centang kotak untuk menampilkan / menyembunyikan layer, ketuk layer untuk menggambar di atasnya, ketuk namanya lagi untuk mengganti nama, ↑ ↓ mengubah urutan, × menghapus (minimal 1 tersisa). **Duplikat**, **Gabung ke bawah**, dan slider *Opasitas* ada di panel yang sama. Maksimal 16 layer per frame. Mengetuk sprite menutup panel supaya kamu langsung bisa menggambar. Layer hanya alat bantu menggambar: sheet, ZIP, dan JSON selalu memakai gambar gabungan dari layer yang terlihat.
   - **Lihat:** zoom dengan − / + (atau Ctrl + scroll mouse), **Fit** mengembalikannya.
   Bar frame melayang di bagian bawah menampilkan semua frame: ketuk satu untuk menggambar di atasnya, **+** menambah frame kosong setelah frame terpilih, dan kolom di bawahnya mengatur nama frame (dipakai sebagai nama file saat export). Urungkan / ulangi (Ctrl+Z / Ctrl+Y) mencakup coretan, fill, dan semua perubahan layer. Pintasan: B Brush, E Eraser, G Fill, I Eyedrop, H Geser. Kuasnya persegi tanpa anti-alias, cocok untuk pixel art. Catatan: memakai **Background → Terapkan** pada sebuah frame akan meratakan layernya menjadi satu.
6. **Player** — memutar frame sebagai animasi. **Putar / Jeda**, frame sebelumnya / berikutnya, dan slider untuk menggeser posisi. *Kecepatan* 1–60 FPS, *Mode putar* (**Ulang**, **Bolak-balik**, **Sekali**), *Skala* (**Fit**, 1×–8×), *Latar* (**Checker**, **Gelap**, **Terang**), dan **Dari frame / Sampai frame** untuk mengulang sebagian animasi saja. Pintasan: Spasi putar / jeda, ← → pindah frame. Tombol ▶ di bar frame Paint Sprite membukanya langsung.
7. **Gabung** — muat sheet A dan B, lalu gabung horizontal, vertikal, overlay, atau tambahkan frame-nya.
8. **Export** — isi **Nama file**, pilih **PNG / JPG / WebP** (JPG dan WebP punya slider kualitas; JPG mengisi area transparan dengan warna latar pilihanmu), lalu unduh spritesheet, **semua frame jadi satu ZIP** (atau satu per satu), atau JSON metadata (posisi dan nama frame). Kalau frame berubah setelah sheet dibangun, Export membangunnya ulang otomatis.

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
