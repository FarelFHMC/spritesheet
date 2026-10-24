# Changelog

[English](CHANGELOG.md) | Bahasa Indonesia

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
