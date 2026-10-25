# Changelog

[English](CHANGELOG.md) | Bahasa Indonesia

## 1.6.0 — 2026-10-25
### Ditambahkan
- **Export semua frame jadi satu ZIP** (tombol baru di tab Export). ZIP dibuat di dalam aplikasi: tanpa library, tidak ada yang diunggah.
- **Ubah nama file download.** Kolom *Nama file* yang baru menamai sheet (`nama.png`), frame (`nama_00.png`), ZIP (`nama_frames.zip`), dan JSON (`nama.json`). Tiap frame juga bisa diberi nama sendiri di Editor Sprite. Karakter berbahaya dihapus dan nama kembar diberi `_2`, `_3`.
- **Format export lebih banyak:** PNG, JPG, dan WebP, dengan slider kualitas. JPG mengisi area transparan dengan warna pilihanmu (bawaan putih). Kalau browser tidak bisa membuat format itu, file disimpan sebagai PNG dan kamu diberi tahu.
- **Editor Sprite (beta)**, tab baru: **Brush**, **Eraser**, warna (picker, hex, atau warna cepat), ukuran kuas, geser, zoom, urungkan / ulangi (juga Ctrl+Z / Ctrl+Y). Bisa dengan mouse, sentuh, dan pen. Kuasnya persegi tanpa anti-alias, cocok untuk pixel art.
- JSON metadata sekarang memuat nama file gambar dan nama tiap frame.
- Pemberitahuan "Baru di versi ini" (tampil sekali per versi) dan footer kredit: dibuat oleh **Farelfhmc**, **Studio Fhilion**.

### Diubah
- Tab Export didesain ulang. Download frame satu per satu sekarang tombol sendiri. Nama frame bawaan mengikuti kolom *Nama file* (`spritesheet_00.png`, sebelumnya `frame_00.png`).
- Hak cipta di `LICENSE` dan kredit di README sekarang menyebut Farelfhmc (Studio Fhilion).

### Diperbaiki
- Elemen yang ditandai tersembunyi ternyata tetap tampil: progress bar kosong muncul di mana-mana, dan kolom FPS dan Interval tampil bersamaan.
- Export memakai sheet yang dibangun sebelumnya. Setelah frame dihapus, diurutkan ulang, ditambah, atau background dihapus, PNG dan JSON yang diunduh sudah usang. Sekarang export membangun ulang sheet dari frame terbaru dulu.
- JSON metadata setelah gabungan Horizontal / Vertical / Overlay menjelaskan sheet sebelumnya, bukan gambar hasil gabung. Sekarang hanya tersedia untuk sheet yang punya grid frame (tab Spritesheet, atau Append Frames).
- Label slider (Tolerance, Feather) pecah jadi beberapa baris di layar sempit.

## 1.5.0 — 2026-10-24
### Ditambahkan
- Toggle **Pixelated / Smoothed** (di header). Pixelated = nearest-neighbor, pixel art tetap tajam. Smoothed = perkecil dengan rata-rata warna dan perbesar dengan halus.
- Pilihan bahasa **Indonesia / English** di dalam aplikasi; pilihan diingat.
- Background: klik gambar asli untuk ambil warna, input hex, warna preset, "Deteksi dari pojok", pratinjau langsung, dan **Urungkan**.
- Chroma Key sekarang menghilangkan sisa warna (spill) di tepi. Sebelumnya hasilnya sama dengan "Hapus warna spesifik".
- `LICENSE` (MIT), README dua bahasa, dan changelog ini.

### Diubah
- Tampilan lebih sederhana dan datar: satu warna aksen, tanpa gradien, tema terang/gelap mengikuti sistem.

### Diperbaiki
- Ekstraksi video: frame terakhir kadang tidak ikut dan frame kedua ganda. Penyebab: canvas digambar tepat setelah `seeked`, sebelum frame baru tampil, dan waktu frame dihitung dengan menjumlahkan desimal. Sekarang tiap frame menunggu sampai benar-benar tampil, dan waktu dihitung `start + i × step`.
- "Estimasi frame" memakai perhitungan yang sama dengan ekstraksi asli.
- Memilih file bisa membuka dialog file dua kali di beberapa browser.

## 1.0.0
- Rilis pertama: import video / GIF / gambar, hapus background, pembuat spritesheet, editor frame, gabung, export (PNG, frame satuan, JSON).
