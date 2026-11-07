# Changelog

[English](CHANGELOG.md) | Bahasa Indonesia

## 2.7.0 — 2026-11-07
### Ditambahkan
- **Font Creator** (tab baru, di bawah Edit). Gambar font pixel-mu sendiri huruf demi huruf, lalu export.
  - **Menggambar:** pilih karakter dari grid (atau pindah dengan ‹ ›) lalu gambar atau hapus di grid piksel besar dengan mouse, sentuhan, atau pen; seret untuk membuat garis. Ada **Urungkan / Ulangi** (juga Ctrl+Z / Ctrl+Y), panah **Geser huruf** (geser 1 px), **Kosongkan**, dan **Kembalikan ke klasik**. Garis hijau menandai garis dasar, jadi huruf berekor (g, j, p, q, y) bisa turun ke bawahnya.
  - **Font klasik mengisi yang kosong.** Huruf yang belum kamu gambar otomatis memakai font klasik 5×7 bawaan (spasi, angka, A–Z, a–z, dan tanda baca, ASCII 32–126). Piksel yang tampak pudar di editor dan tidak adanya titik hijau di grid menandakan huruf itu masih otomatis; perubahan pertama membuatnya jadi milikmu. Ketukan yang tidak mengubah apa pun tidak mengubah huruf klasik menjadi buatanmu. **Kembalikan semua ke klasik** mengulang dari awal.
  - **Karakter lain.** *Tambah karakter lain* (é, ñ, ü ...) menambahkan karakter apa pun dari Basic Multilingual Plane; karakter tambahan yang tetap kosong tidak ikut diekspor.
  - **Pengaturan Font:** nama font, lebar dan tinggi huruf (1–32 px), garis dasar, jarak antar huruf (0–8 px), dan *Lebar menyesuaikan tiap huruf* (proporsional). Mengubah ukuran tidak menghapus gambarmu (diletakkan di tengah, sejajar garis dasar). Font klasik memakai 5 × 9 dengan garis dasar 7.
  - **Pratinjau:** ketik teks apa saja dan lihat tampilannya dengan fontmu (1×–8×).
  - **Export Font:** satu **ZIP** berisi pilihanmu dari: **font TrueType (.ttf)** yang bisa diinstal, **bitmap font** untuk game engine (atlas `nama.png` + `nama.fnt` format teks BMFont, huruf putih di latar transparan), file **JSON** berisi ukuran (dan posisi di atlas) tiap huruf, serta **satu PNG per huruf**; `README.txt` singkat selalu ikut. **Download TTF saja** hanya memberi file font. TTF dibuat di dalam aplikasi, tanpa library dan tidak ada yang diunggah: piksel digabung menjadi satu outline yang bersih (tanpa celah antar piksel bertetangga), dengan kotak sebagai simbol huruf yang tidak ada. Pakai di ukuran sama dengan tinggi huruf (mis. 9 px) atau kelipatannya agar tepinya tajam.

### Diubah
- Bar atas dan footer menampilkan v2.7.

## 2.6.0 — 2026-11-06
### Ditambahkan
- **Export animasi** (tab Export, kartu baru *Export Animasi*). Buat **GIF**, **WebP animasi**, atau video **MP4** dari frame di Editor. Pilihan: *Kecepatan* (1–60 FPS, awalnya mengikuti kecepatan Player), *Ukuran* (1×, 2×, 3×, 4×, 6×, 8×, skala bilangan bulat yang mengikuti pengaturan *Pixelated / Smoothed*), *Mode putar* (**Ulang**, **Bolak-balik**, **Sekali**), *Dari frame / Sampai frame* (kosong = pertama / terakhir), **Latar transparan** (GIF dan WebP) atau warna latar, dan *Kualitas animasi* untuk WebP. File diberi nama `nama_anim.gif` / `.webp` / `.mp4`. Frame yang ukurannya berbeda diletakkan di tengah. Tidak ada yang diunggah dan tanpa library:
  - **GIF** dibuat di dalam aplikasi: satu palet berisi paling banyak 255 warna untuk seluruh animasi (warna aslinya bila jumlahnya sedikit, seperti pixel art), transparansi ada-atau-tidak, dan untuk GIF tanpa transparansi hanya bagian frame yang berubah yang disimpan agar file tetap kecil.
  - **WebP animasi** menggabungkan satu gambar WebP per frame menjadi satu file, dengan transparansi penuh. Butuh browser yang bisa membuat WebP (Chrome, Edge, Firefox); kalau tidak, pilihannya dinonaktifkan.
  - **MP4** memakai encoder H.264 bawaan browser (WebCodecs) dan menulis filenya sendiri. MP4 tidak punya transparansi, jadi latar diisi warna pilihanmu. Kalau gambar terlalu kecil untuk encoder, gambar diperbesar dengan angka bulat (kamu diberi tahu). Butuh Chrome, Edge, atau Safari terbaru; kalau tidak, pilihannya dinonaktifkan.
  - Waktu tayang tepat: waktu tiap frame dibulatkan agar panjang total sesuai FPS (misalnya 12 FPS di GIF bergantian 80 / 90 ms).
- **Gabung 2 spritesheet atau lebih** (tab Gabung). **+ Tambah Spritesheet** menambah slot (sampai 12); tiap slot punya pemilih file, pratinjau, **↑ ↓** untuk mengubah urutan, dan **×** untuk menghapus (minimal 2 tersisa). Mode **Horizontal**, **Vertical**, **Overlay**, dan **Append Frames** bekerja dengan jumlah sheet berapa pun. Di **Append Frames** setiap spritesheet punya *Lebar / Tinggi frame* sendiri (slot baru dimulai dengan ukuran slot di atasnya) dan menampilkan jumlah frame-nya, jadi sheet dengan ukuran frame berbeda bisa dicampur. Slot kosong diabaikan, tetapi minimal 2 sheet harus sudah dimuat.

### Diubah
- Judul tab **Gabung** sekarang *Gabungkan Spritesheet* (sebelumnya: *Gabungkan 2 Spritesheet*). Isian *Frame width A / B* dan *Frame height A / B* diganti dengan isian per spritesheet seperti di atas.
- Progress bar di tab Export sekarang muncul di bawah tombol yang ditekan.
- Nama file yang ditampilkan di tab Export juga memuat nama animasi.
- Hasil gabungan yang lebih lebar atau lebih tinggi dari 16384 px dihentikan dengan pesan, bukan menghasilkan gambar rusak.

## 2.5.0 — 2026-11-04
Fitur lain masih akan datang di update 2.5 berikutnya.

### Ditambahkan
- **Smart Split** (Paint Sprite → Layer → *Smart Split*). Memisahkan layer terpilih menjadi beberapa layer baru hanya dengan satu ketukan. **Bagian terpisah** menjaga piksel yang bersentuhan tetap satu dan punya *Jarak gabung* (0–8 px) yang juga menyatukan bagian yang letaknya berdekatan; **Warna** mengelompokkan warna yang mirip (*Toleransi warna*), dimulai dari warna terbanyak, dan menamai tiap layer sesuai warnanya. *Abaikan bintik kurang dari* mengumpulkan potongan sangat kecil ke satu layer bernama **Sisa**. Pilihan: **Simpan layer asli** (disembunyikan), dan **Hanya area terpilih** bila ada area laso. Batas 16 layer dihormati (potongan terkecil digabung ke Sisa). Satu langkah **Urungkan** mengembalikan layer asli.
- **Tool Laso** (Paint Sprite → Alat, pintasan L). Gambar area bebas dengan mouse, sentuhan, atau pen. Mode **Baru / Tambah / Kurangi**; ketuk sekali di mode *Baru* untuk membatalkan pilihan. Area tampak sebagai garis putus-putus yang tetap terlihat di semua tool dan ikut zoom. Aksi pada piksel layer terpilih di dalam area: **Geser / Putar / Ubah ukuran** (lihat di bawah), **Pisah ke layer baru**, **Salin ke layer baru**, **Hapus isi**, **Balik pilihan**, **Batal pilih**. Esc membatalkan pilihan dan Delete menghapus piksel terpilih. Semua aksi bisa diurungkan.
- **Geser, putar, dan ubah ukuran di dalam laso** (Laso → **Geser / Putar / Ubah ukuran**). Piksel layer terpilih di dalam area mendapat kotak dengan titik pegangan: seret di dalam kotak untuk **menggeser**, seret titik sudut untuk **mengubah ukuran** (rasio tetap), seret sisi untuk meregangkan satu sisi saja, dan seret titik bulat di atas untuk **memutar** (tahan Shift untuk per 15°). Lebar, tinggi, dan sudut juga bisa diketik, dengan pilihan *Kunci rasio*, ditambah tombol **↺ 90° / ↻ 90°** dan **Atur ulang**. Tombol panah menggeser 1 px (Shift: 10 px). **Terapkan** (Enter) mengonfirmasi, **Batal** (Esc) membuang perubahan; hasilnya satu langkah **Urungkan** dan area laso ikut ke posisi baru. **Tidak ada yang dibuat buram:** setiap piksel hasil menyalin tepat satu piksel asli (tanpa pelembutan, tanpa anti-alias, tanpa warna baru), ukuran dan geseran berupa piksel utuh, dan pengaturan *Pixelated / Smoothed* tidak memengaruhinya. Putar 90° tepat tanpa selisih. Perubahan diterapkan otomatis saat kamu memilih tool, frame, aksi layer, atau bagian lain.
- **Ukuran frame** (tab Editor, bagian baru *Ukuran Frame*). Isi lebar dan tinggi (1–2048 px) lalu ubah ukuran semua frame sekaligus, termasuk layer-nya. Ada empat cara menyesuaikan: **Muat** (seluruh gambar terlihat, sisanya transparan), **Isi penuh** (memenuhi frame, tepi terpotong), **Regangkan**, dan **Tengah** (tanpa skala). Pengaturan *Pixelated / Smoothed* ikut dipakai, jadi pixel art tetap tajam. Isian awal mengikuti ukuran frame pertama; kunci rasio lebar : tinggi bisa dinyalakan; **Urungkan** mengembalikan ukuran lama. Ukuran baru juga disalin ke tab Spritesheet. Ada kotak centang agar **frame kosong baru** memakai ukuran ini.
- **Animasi slide hamburger.** Menu sekarang meluncur dari kiri dengan latar gelap, isinya muncul satu per satu, dan ikonnya berubah jadi ×. Mengikuti pengaturan sistem "kurangi gerakan".

### Diubah
- Di ponsel, enam tombol tool dibuat sedikit lebih sempit agar toolbar tetap muat dalam satu baris.

### Diperbaiki
- **Menu hamburger: tombol bahasa (kadang juga Tema / Tampilan) terpotong di layar ponsel.** Tinggi menu dihitung dari tinggi penuh browser, padahal yang tampil di ponsel lebih pendek saat address bar terlihat. Sekarang menu berupa laci yang pas mengisi ruang di bawah bar atas dan bisa digulir sendiri, jadi semua isinya terjangkau.
- **Paint Sprite di komputer / tablet.** Pada layar selebar 768 px atau lebih, alat menempel di panel kiri (tombol alat dua kolom, lingkaran warna dan layer terbuka di dalam panel, tidak melayang di atas sprite), bar frame memanjang di bawah dengan thumbnail lebih besar, dan sprite disesuaikan ke ruang yang tersisa. Ukurannya menyesuaikan lagi saat jendela diubah atau layar diputar. Ponsel tetap memakai bar melayang.

## 2.0.0 — 2026-10-31
### Diubah
- **Menu hamburger.** Bar atas sekarang hanya ikon hamburger dan nama bagian yang sedang dibuka. Menunya memuat bagian dalam tiga kategori: **Bahan** (Import, Background), **Edit** (Editor, Paint Sprite), dan **Hasil** (Spritesheet, Gabung, Export), dengan tombol Terang / Gelap, Pixelated / Smoothed, dan ID / EN di bagian bawah. Menu menutup sendiri saat kamu memilih bagian atau mengetuk di luar. Tidak ada yang digeser ke samping.
- **Warna baru dan tema Terang / Gelap.** Abu-abu dingin dengan satu aksen hijau, tanpa krem atau coklat. Pilih **Terang** atau **Gelap** di menu; pertama kali mengikuti sistem, lalu pilihanmu diingat.
- **Bentuk lebih polos.** Tidak ada kartu berkotak: bagian dipisah garis tipis. Kolom isian, tombol, dan slider standar dengan sudut sedikit membulat.
- Pindah bagian otomatis menggulung ke atas.
- Tab **Editor Sprite** sekarang bernama **Paint Sprite** (lihat di bawah). Selain yang tercatat di sini, semua alat, pengaturan, dan export bekerja seperti di 1.6.

### Ditambahkan
- **Paint Sprite layar penuh.** Gambar sprite sekarang memenuhi seluruh layar. Toolbar melayang ada tepat di bawah hamburger dan bar frame melayang ada di bagian bawah (pilih frame, tambah frame kosong, ganti nama). Zoom tetap bisa: tombol − / +, **Fit**, dan Ctrl + scroll mouse atau cubit di trackpad pada desktop, selalu di sekitar bagian yang sedang kamu lihat. Bar frame dan toolbar tidak menutupi sprite.
- **Alat Eyedrop** di Paint Sprite. Ketuk atau seret di atas sprite untuk mengambil warnanya; setelah itu aplikasi kembali ke Brush. Piksel transparan diabaikan. Pintasan: B Brush, E Eraser, G Fill, I Eyedrop, H Geser.
- **Toolbar ringkas dengan kategori.** Toolbar Paint Sprite sekarang selalu dua baris pendek, jadi tidak lagi memanjang ke bawah atau ke samping. Baris atas berisi kategori **Alat**, **Layer**, dan **Lihat**, kotak warna, dan urungkan / ulangi (sekarang berupa ikon). Baris di bawahnya berubah sesuai kategori: alat (Brush, Eraser, Fill, Eyedrop, Geser), layer yang aktif, atau kontrol zoom.
- **Pengaturan Brush dan Eraser.** Ketuk **Brush** atau **Eraser** untuk membuka pengaturannya. Setiap alat punya *Ukuran* sendiri (1–64 px; sebelumnya satu ukuran 1–32 px untuk keduanya, tersembunyi di popup warna). Ketuk alatnya lagi untuk menutup.
- **Alat Fill (ember)** dengan pengaturan: *Tolerance* (0–255), *Area isi* (**Terhubung** atau **Semua warna**), dan *Ambil warna dari* (**Layer ini** atau **Semua layer**). Satu ketukan mengisi, dan bisa diurungkan. Pintasan: G.
- **Layer.** Setiap frame bisa punya sampai 16 layer: tambah, duplikat, hapus, ubah urutan (↑ ↓), tampil / sembunyi, ganti nama (ketuk nama layer yang terpilih), *Opasitas*, dan **Gabung ke bawah**. Menggambar, menghapus, dan mengisi terjadi di layer yang terpilih. Urungkan / ulangi sekarang mencakup semua perubahan layer. Sheet, ZIP, dan JSON memakai gambar gabungan dari layer yang terlihat, jadi bagian lain tidak berubah. Memakai **Background → Terapkan / Urungkan** pada sebuah frame meratakan layernya menjadi satu. Layer tersimpan selama halaman tetap terbuka, seperti frame.
- **Frame kosong.** **+ Frame Kosong** di Editor menambah frame transparan kosong di bagian akhir; **+** di Paint Sprite menambahnya tepat setelah frame terpilih lalu memilihnya. Ukurannya sama dengan frame yang sedang dikerjakan (atau ukuran frame di tab Spritesheet kalau belum ada frame).
- **Seret dan lepas di Editor.** Mengubah urutan frame dengan menyeret sekarang bisa dengan mouse, sentuh, dan pen (sentuh: tahan kartu sebentar lalu seret; halaman ikut menggulung saat kamu menyeret ke tepi). Kamu juga bisa menyeret file gambar dari perangkat ke Editor untuk menambahnya sebagai frame. Tombol ◀ ▶ tetap ada.
- **Player** (tab baru, di bawah Edit). Memutar frame sebagai animasi: Putar / Jeda, frame sebelumnya / berikutnya, dan slider untuk menggeser posisi. *Kecepatan* 1–60 FPS (diingat), *Mode putar* (**Ulang**, **Bolak-balik**, **Sekali**), *Skala* (**Fit** atau 1×, 2×, 4×, 8×), *Latar* (**Checker**, **Gelap**, **Terang**), dan **Dari frame / Sampai frame** untuk mengulang sebagian animasi saja. Pintasan: Spasi dan ← →. Tombol ▶ di bar frame Paint Sprite membukanya langsung. Player menampilkan gambar gabungan tiap frame, jadi layer dan nama tetap dihormati.
- **Lingkaran warna** di Paint Sprite. Kotak warna sekarang membuka lingkaran warna, bukan kotak warna bawaan browser: seret cincin untuk memilih warna, dan kotak di dalamnya untuk kejenuhan dan kecerahan. Bisa dipakai dengan mouse, sentuh, dan pen. Kolom hex dan warna cepat tetap ada, Eyedrop menggeser lingkaran ke warna yang diambil, dan abu-abu / hitam mempertahankan warna terakhir.

### Diperbaiki
- **Paint Sprite: frame melebar atau gepeng setelah memilih beberapa alat.** Alat Eyedrop memakai nama gaya (`pick`) yang sama dengan tab Background untuk membatasi kanvasnya sampai 240 px, sehingga sprite tertekan tingginya dan melebar ke samping. Sekarang setiap alat punya nama gaya sendiri dan kanvas Paint tidak bisa dibatasi lagi.
- **Paint Sprite: frame bisa menimpa toolbar.** Saat tinggi toolbar berubah (pindah kategori, satu baris terlipat di layar sempit), sprite tetap berukuran lama. Sekarang ukurannya menyesuaikan sendiri setiap kali tinggi toolbar atau bar frame berubah.

## 1.6.0 — 2026-10-25
### Ditambahkan
- **Export semua frame jadi satu ZIP** (tombol baru di tab Export). ZIP dibuat di dalam aplikasi: tanpa library, tidak ada yang diunggah.
- **Ubah nama file download.** Kolom *Nama file* yang baru menamai sheet (`nama.png`), frame (`nama_00.png`), ZIP (`nama_frames.zip`), dan JSON (`nama.json`). Tiap frame juga bisa diberi nama sendiri di Editor Sprite (sekarang Paint Sprite). Karakter berbahaya dihapus dan nama kembar diberi `_2`, `_3`.
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
