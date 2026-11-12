'use strict';

/* Spritesheet Studio v2.7.9 - extras: Player, what's-new notice, language, Font Creator, init
   Made by Farelfhmc - Studio Fhilion. MIT License.
   Part 4 of 4. Classic script: shares one global scope with the other js/ files, so keep the load order from index.html. */

/* =========================================================================
   PLAYER: plays the frames as an animation (it shows the flattened picture of every frame)
   ========================================================================= */
const player = { i: 0, playing: false, fps: 12, loop: 'loop', dir: 1, zoom: 0, bg: 'checker', from: 1, to: 1, toAuto: true, raf: 0, last: 0, acc: 0 };

/* the frames that take part in the loop, as 0-based indexes [first, last] */
function playerRange() {
  const n = state.frames.length;
  const a = Math.min(Math.max(1, player.from | 0), n);
  const b = Math.min(Math.max(a, player.to | 0), n);
  return [a - 1, b - 1];
}

function playerScale(f) {
  if (player.zoom) return player.zoom;
  const st = $('playerStage');
  const availW = Math.max(60, st.clientWidth - 34);
  const availH = Math.max(120, Math.min(window.innerHeight * 0.55, 520));
  let sc = Math.min(availW / f.canvas.width, availH / f.canvas.height);
  if (sc >= 1) sc = Math.floor(sc);
  return Math.max(0.05, Math.min(64, sc));
}

function drawPlayer() {
  const f = state.frames[player.i];
  if (!f) return;
  const v = $('playerCanvas'), w = f.canvas.width, h = f.canvas.height;
  if (v.width !== w || v.height !== h) { v.width = w; v.height = h; }
  const ctx = v.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(f.canvas, 0, 0);
  const sc = playerScale(f);
  v.style.width = (w * sc) + 'px';
  v.style.height = (h * sc) + 'px';
  $('playerInfo').textContent = (player.i + 1) + ' / ' + state.frames.length;
  $('playerName').textContent = f.name || '';
  $('playerScrub').value = player.i + 1;
}

function updatePlayerBtn() {
  const b = $('playerPlay'), key = player.playing ? 'Jeda' : 'Putar';
  b.querySelector('.ic-play').hidden = player.playing;
  b.querySelector('.ic-pause').hidden = !player.playing;
  b['__id_aria-label'] = key;                      // keeps the EN / ID switch in step with the icon
  b.setAttribute('aria-label', tr(key));
}

function stopPlayer() {
  cancelAnimationFrame(player.raf);
  player.playing = false;
  updatePlayerBtn();
}

/* moves to the next frame of the loop; returns false when a "once" run has ended */
function advancePlayer() {
  const [a, b] = playerRange();
  if (player.i < a || player.i > b) { player.i = a; player.dir = 1; return true; }
  if (a === b) return player.loop !== 'once';
  let next = player.i + player.dir;
  if (next > b || next < a) {
    if (player.loop === 'once') return false;
    if (player.loop === 'pingpong') { player.dir = -player.dir; next = player.i + player.dir; }
    else next = a;
  }
  player.i = next;
  return true;
}

function playerTick(now) {
  if (!player.playing) return;
  player.raf = requestAnimationFrame(playerTick);
  const step = 1000 / player.fps;
  player.acc += now - player.last;
  player.last = now;
  if (player.acc > step * 5) player.acc = step;      // the tab was in the background: do not fast-forward
  let moved = false;
  while (player.acc >= step && player.playing) {
    player.acc -= step;
    if (advancePlayer()) moved = true; else stopPlayer();
  }
  if (moved) drawPlayer();
}

function startPlayer() {
  if (!state.frames.length) return;
  const [a, b] = playerRange();
  if (player.i < a || (player.loop === 'once' && player.i >= b)) { player.i = a; player.dir = 1; drawPlayer(); }
  player.playing = true;
  player.last = performance.now();
  player.acc = 0;
  updatePlayerBtn();
  player.raf = requestAnimationFrame(playerTick);
}

function togglePlayer() { if (player.playing) stopPlayer(); else startPlayer(); }

function stepPlayer(d) {
  const n = state.frames.length;
  if (!n) return;
  stopPlayer();
  player.i = (player.i + d + n) % n;
  drawPlayer();
}

function syncPlayerInputs() {
  const n = state.frames.length;
  $('playerFrom').max = n; $('playerTo').max = n;
  $('playerFrom').value = player.from;
  $('playerTo').value = player.to;
  $('playerScrub').max = n;
}

function applyPlayerBg() {
  $('playerStage').className = 'player-stage ' + (player.bg === 'checker' ? 'checker-bg' : 'bg-' + player.bg);
}

function renderPlayer() {
  const n = state.frames.length;
  $('playerEmpty').hidden = n > 0;
  $('playerBody').hidden = n === 0;
  if (!n) { stopPlayer(); return; }
  if (player.i >= n) player.i = n - 1;
  player.from = Math.min(Math.max(1, player.from | 0), n);
  if (player.toAuto || !player.to || player.to > n) player.to = n;
  if (player.to < player.from) player.to = player.from;
  syncPlayerInputs();
  applyPlayerBg();
  drawPlayer();
  updatePlayerBtn();
}

function initPlayerTab() {
  try { const s = parseInt(localStorage.getItem('ss.playerFps'), 10); if (s >= 1 && s <= 60) player.fps = s; } catch (e) {}
  $('playerFps').value = player.fps;
  $('playerFpsVal').textContent = player.fps;
  $('playerFps').addEventListener('input', (e) => {
    player.fps = Math.min(60, Math.max(1, parseInt(e.target.value, 10) || 12));
    $('playerFpsVal').textContent = player.fps;
    try { localStorage.setItem('ss.playerFps', String(player.fps)); } catch (err) {}
  });
  $('playerPlay').addEventListener('click', togglePlayer);
  $('playerPrev').addEventListener('click', () => stepPlayer(-1));
  $('playerNext').addEventListener('click', () => stepPlayer(1));
  $('playerScrub').addEventListener('input', (e) => { player.i = (parseInt(e.target.value, 10) || 1) - 1; drawPlayer(); });

  const bindSeg = (attr, fn) => {
    const btns = document.querySelectorAll('[' + attr + ']');
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.classList.toggle('on', x === b));
      fn(b.getAttribute(attr));
    }));
  };
  bindSeg('data-ploop', (v) => { player.loop = v; player.dir = 1; });
  bindSeg('data-pzoom', (v) => { player.zoom = parseInt(v, 10) || 0; drawPlayer(); });
  bindSeg('data-pbg', (v) => { player.bg = v; applyPlayerBg(); });

  const n = () => state.frames.length;
  $('playerFrom').addEventListener('change', (e) => {
    player.from = Math.min(Math.max(1, parseInt(e.target.value, 10) || 1), n());
    if (player.to < player.from) player.to = player.from;
    syncPlayerInputs();
  });
  $('playerTo').addEventListener('change', (e) => {
    player.to = Math.min(Math.max(1, parseInt(e.target.value, 10) || n()), n());
    player.toAuto = false;
    if (player.from > player.to) player.from = player.to;
    syncPlayerInputs();
  });

  document.addEventListener('keydown', (e) => {
    if (!$('panel-player').classList.contains('active') || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target && e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (t !== 'BUTTON') togglePlayer();            // a focused button already reacts to Space itself
    } else if (e.key === 'ArrowLeft') { e.preventDefault(); stepPlayer(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); stepPlayer(1); }
  });

  let rz = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if ($('panel-player').classList.contains('active') && state.frames.length) drawPlayer(); }, 120);
  });
}

/* =========================================================================
   WHAT'S NEW NOTICE (shown once per version)
   ========================================================================= */
function initNotice() {
  const box = $('newsNotice');
  let seen = null;
  try { seen = localStorage.getItem('ss.seen'); } catch (e) { /* storage blocked: just show it */ }
  box.hidden = seen === NOTICE_VERSION;
  $('newsClose').addEventListener('click', () => {
    box.hidden = true;
    try { localStorage.setItem('ss.seen', NOTICE_VERSION); } catch (e) { /* ignore */ }
  });
}

/* =========================================================================
   LANGUAGE (ID default text lives in the HTML; EN is swapped in from this table)
   ========================================================================= */
const EN = {
  'Player Animasi': 'Animation Player',
  'Belum ada frame untuk diputar. Import dulu di tab Import, atau buat frame di Paint Sprite.': 'No frames to play yet. Import some in the Import tab, or create frames in Paint Sprite.',
  'Frame sebelumnya': 'Previous frame', 'Frame berikutnya': 'Next frame', 'Posisi frame': 'Frame position',
  'Putar': 'Play', 'Jeda': 'Pause', 'Putar animasi': 'Play animation', 'Kecepatan (': 'Speed (',
  'Mode putar': 'Play mode', 'Ulang': 'Loop', 'Bolak-balik': 'Ping-pong', 'Sekali': 'Once',
  'Skala': 'Scale', 'Latar': 'Background', 'Dari frame': 'From frame', 'Sampai frame': 'To frame',
  'Spasi = putar / jeda, \u2190 \u2192 = pindah frame.': 'Space = play / pause, \u2190 \u2192 = change frame.',
  'Lingkaran warna': 'Color wheel',
  'Bagian aplikasi': 'App sections', 'Gabung': 'Merge',
  'Seret file ke sini atau ketuk untuk memilih': 'Drop a file here or tap to choose',
  'Pilih File': 'Choose File', 'Pratinjau': 'Preview', 'Durasi:': 'Duration:', 'Resolusi:': 'Resolution:',
  'Estimasi frame:': 'Estimated frames:', 'Pengaturan Ekstraksi Video': 'Video Extraction Settings',
  'Berdasarkan FPS': 'By FPS', 'Berdasarkan Interval (detik)': 'By interval (seconds)',
  'Interval (detik)': 'Interval (seconds)', 'Start time (detik)': 'Start time (s)',
  'End time (detik, kosongkan = habis)': 'End time (s, empty = to the end)', 'Maks frame': 'Max frames',
  'Ekstrak Frame': 'Extract Frames', 'Pengaturan GIF': 'GIF Settings',
  'Frame width (px, kosongkan = asli)': 'Frame width (px, empty = original)',
  'Frame height (px, kosongkan = asli)': 'Frame height (px, empty = original)',
  'Tambahkan sebagai Frame': 'Add as Frame', 'Tambahkan ke Frame': 'Add to Frames',
  'Frame Saat Ini (': 'Current Frames (', 'Hapus Background': 'Remove Background',
  'Normal (tidak diubah)': 'Normal (unchanged)', 'Hapus warna spesifik': 'Remove a specific color',
  'Klik gambar asli untuk mengambil warna.': 'Click the original image to pick a color.',
  'Asli': 'Original', 'Hasil': 'Result', 'Deteksi dari pojok': 'Detect from corners',
  'Terapkan ke semua frame': 'Apply to all frames',
  'Jika tidak dicentang, perubahan hanya diterapkan ke frame pertama.': 'If unchecked, only the first frame is changed.',
  'Terapkan': 'Apply', 'Urungkan': 'Undo', 'Warna': 'Color', 'Bangun Spritesheet': 'Build Spritesheet',
  'Total frame:': 'Total frames:', 'Ukuran frame:': 'Frame size:', 'Resolusi sheet:': 'Sheet resolution:',
  'Tahan lalu seret kartu untuk mengubah urutan (di ponsel, tahan sebentar dulu). Seret gambar dari perangkat ke sini untuk menambah frame. Ketuk \u00d7 untuk menghapus.': 'Hold and drag cards to reorder (on a phone, press and hold first). Drag images from your device in here to add frames. Tap \u00d7 to delete.',
  '+ Tambah Gambar': '+ Add Images', '+ Frame Kosong': '+ Empty Frame', 'Frame kosong ditambahkan': 'Empty frame added',
  'Tambah frame kosong': 'Add empty frame', '{n} frame ditambahkan': '{n} frames added', 'Piksel transparan': 'Transparent pixel', 'Gabungkan 2 Spritesheet': 'Merge 2 Spritesheets', 'Mode Gabung': 'Merge Mode',
  'Fit mode (jika ukuran beda)': 'Fit mode (if sizes differ)', 'Gabungkan': 'Merge',
  'Download Spritesheet': 'Download Spritesheet',
  'Download Semua Frame (ZIP)': 'Download All Frames (ZIP)',
  'Download Frame Satu per Satu': 'Download Frames One by One',
  'Download JSON Metadata': 'Download JSON Metadata',
  'Nama file': 'File name', 'Format gambar': 'Image format',
  'PNG (transparan)': 'PNG (transparent)', 'JPG (tanpa transparansi)': 'JPG (no transparency)', 'WebP (transparan)': 'WebP (transparent)',
  'Kualitas (': 'Quality (', 'Warna latar JPG': 'JPG background color',
  'Nama file hasil:': 'Output file names:',
  'ZIP menyatukan semua frame dalam satu file. Nama frame bisa diubah satu per satu di tab Paint Sprite.': 'A ZIP puts every frame in one file. You can rename frames one by one in the Paint Sprite tab.',
  'Belum ada frame. Import dulu di tab Import, atau buat frame kosong.': 'No frames yet. Import some in the Import tab, or create an empty frame.',
  'Alat': 'Tools', 'Geser': 'Pan', 'Ukuran kuas (': 'Brush size (', 'Ulangi': 'Redo',
  'Kategori': 'Category', 'Lihat': 'View', 'Ukuran (': 'Size (', 'Opasitas (': 'Opacity (',
  'Makin besar, makin banyak warna yang mirip ikut terisi.': 'Higher values also fill more similar colors.',
  'Area isi': 'Fill area', 'Terhubung': 'Connected', 'Semua warna': 'All colors',
  'Ambil warna dari': 'Sample colors from', 'Layer ini': 'This layer', 'Semua layer': 'All layers',
  'Duplikat': 'Duplicate', 'Gabung ke bawah': 'Merge down', 'Nama layer': 'Layer name',
  'Tampilkan layer': 'Show layer', 'Hapus layer': 'Delete layer', 'Naik': 'Move up', 'Turun': 'Move down',
  'Layer tersembunyi': 'Layer is hidden', 'Maksimal 16 layer': 'Maximum 16 layers', 'Minimal 1 layer': 'At least 1 layer',
  'Tidak ada layer di bawah': 'No layer below', 'Layer digabung': 'Layer merged',
  'Diterapkan ke semua frame (layer diratakan)': 'Applied to all frames (layers flattened)',
  'Diterapkan ke frame pertama (layer diratakan)': 'Applied to the first frame (layers flattened)',
  'Nama frame (opsional)': 'Frame name (optional)',
  'Baru di v2.7.0': "What's new in v2.7.0",
  'Tab baru Font Creator: gambar font pixel-mu sendiri huruf demi huruf, lihat hasilnya langsung di pratinjau, lalu ekspor satu ZIP berisi file font TTF yang bisa diinstal, bitmap font (PNG + .fnt) untuk game engine, dan data JSON. Huruf yang belum kamu gambar otomatis memakai font klasik 5\u00D77, jadi font selalu lengkap.': 'New Font Creator tab: draw your own pixel font glyph by glyph, see it live in the preview, then export one ZIP with an installable TTF font file, a bitmap font (PNG + .fnt) for game engines and JSON data. Any glyph you have not drawn automatically uses the classic 5\u00D77 font, so the font is always complete.',
  'Gambar font pixel-mu sendiri, huruf demi huruf. Huruf yang belum kamu gambar otomatis memakai font klasik 5\u00D77, jadi font selalu lengkap.': 'Draw your own pixel font, glyph by glyph. Any glyph you have not drawn automatically uses the classic 5\u00D77 font, so the font is always complete.',
  'Karakter sebelumnya': 'Previous character', 'Karakter berikutnya': 'Next character',
  'Kanvas gambar huruf': 'Glyph drawing canvas', 'Alat gambar': 'Drawing tool',
  'Gambar': 'Draw', 'Hapus': 'Erase',
  'Geser huruf': 'Nudge glyph',
  'Geser ke kiri': 'Nudge left', 'Geser ke atas': 'Nudge up', 'Geser ke bawah': 'Nudge down', 'Geser ke kanan': 'Nudge right',
  'Kosongkan': 'Clear', 'Kembalikan ke klasik': 'Restore classic',
  'Garis hijau = garis dasar (baseline). Gambar pudar = font klasik otomatis; begitu kamu menggambar, huruf itu jadi milikmu.': 'Green line = baseline. Faded drawing = automatic classic font; as soon as you draw, that glyph is yours.',
  'Pilih Karakter': 'Choose Character',
  'Titik hijau = sudah kamu gambar. Tanpa titik = font klasik otomatis.': 'Green dot = you drew it. No dot = automatic classic font.',
  'Tambah karakter lain (mis. \u00E9 \u00F1 \u00FC)': 'Add other characters (e.g. \u00E9 \u00F1 \u00FC)',
  '+ Tambah': '+ Add',
  'Karakter tambahan yang masih kosong tidak ikut diekspor.': 'Added characters that are still empty are not exported.',
  'Kembalikan semua ke klasik': 'Restore all to classic',
  'Skala pratinjau': 'Preview scale', 'Pratinjau teks': 'Text preview',
  'Pengaturan Font': 'Font Settings', 'Nama font': 'Font name',
  'Lebar huruf (px)': 'Glyph width (px)', 'Tinggi huruf (px)': 'Glyph height (px)',
  'Garis dasar (baris di atasnya)': 'Baseline (rows above it)', 'Jarak antar huruf (px)': 'Letter spacing (px)',
  'Lebar menyesuaikan tiap huruf (proporsional)': 'Width follows each glyph (proportional)',
  'Garis dasar menentukan berapa baris yang berada di atas garis (badan huruf) dan di bawahnya (ekor huruf seperti g, j, p, q, y). Mengubah ukuran tidak menghapus gambarmu. Ukuran standar font klasik: 5 \u00D7 9 dengan garis dasar 7.': 'The baseline sets how many rows sit above the line (the letter body) and below it (tails of letters like g, j, p, q, y). Changing the size does not erase your drawings. Classic font default: 5 \u00D7 9 with baseline 7.',
  'Export Font': 'Export Font',
  'Font TrueType (.ttf), bisa diinstal': 'TrueType font (.ttf), installable',
  'Bitmap font untuk game (PNG + .fnt)': 'Bitmap font for games (PNG + .fnt)',
  'Data JSON (ukuran tiap huruf)': 'JSON data (size of every glyph)',
  'Satu PNG per huruf': 'One PNG per glyph',
  'Download Font (ZIP)': 'Download Font (ZIP)', 'Download TTF saja': 'Download TTF only',
  'Pakai font TTF di ukuran yang sama dengan tinggi hurufmu (atau kelipatannya) supaya tepinya tetap tajam. Semua dibuat di dalam aplikasi, tidak ada yang diunggah.': 'Use the TTF at the same size as your glyph height (or a multiple of it) to keep the edges sharp. Everything is made inside the app, nothing is uploaded.',
  'Karakter dihapus': 'Character removed', 'Sudah memakai font klasik': 'Already using the classic font',
  'Dikembalikan ke font klasik': 'Restored to the classic font', 'Semua sudah memakai font klasik': 'Everything already uses the classic font',
  'Kembalikan semua huruf ke font klasik? Gambar yang sudah kamu buat akan hilang.': 'Restore all glyphs to the classic font? Your drawings will be lost.',
  'Semua huruf kembali ke font klasik': 'All glyphs are back to the classic font',
  'Karakter di luar BMP (mis. emoji) tidak didukung': 'Characters outside the BMP (e.g. emoji) are not supported',
  'Karakter ditambahkan': 'Character added', 'Pilih minimal satu isi ZIP': 'Pick at least one thing to put in the ZIP',
  'Font diunduh': 'Font downloaded', 'ZIP font diunduh': 'Font ZIP downloaded', 'Gagal membuat font': 'Failed to make the font',
  'Buatanmu': 'Yours', 'Belum digambar (kosong)': 'Not drawn yet (empty)', 'Klasik (otomatis)': 'Classic (automatic)', 'Hapus karakter': 'Remove character',
  'Export Animasi': 'Export Animation',
  'Buat GIF, WebP animasi, atau video MP4 dari frame di Editor.': 'Make a GIF, an animated WebP or an MP4 video from the frames in the Editor.',
  'Format animasi': 'Animation format', 'WebP (animasi)': 'WebP (animated)', 'MP4 (video)': 'MP4 (video)',
  'Kecepatan (FPS)': 'Speed (FPS)', 'Ukuran (skala)': 'Size (scale)',
  'Pertama': 'First', 'Terakhir': 'Last',
  'Latar transparan': 'Transparent background', 'Warna latar': 'Background color',
  'Kualitas animasi (': 'Animation quality (',
  'GIF memakai paling banyak 255 warna, dan transparansinya hanya ada atau tidak ada (tanpa setengah transparan). Cocok untuk pixel art.': 'GIF uses at most 255 colors, and transparency is all or nothing (no half-transparent pixels). Good for pixel art.',
  'WebP animasi mendukung transparansi penuh. Kualitas 100 memberi hasil paling tajam.': 'Animated WebP supports full transparency. Quality 100 gives the sharpest result.',
  'MP4 tidak punya transparansi, jadi latar diisi warna pilihanmu. Pengulangan diatur oleh aplikasi pemutarnya. Gambar yang terlalu kecil diperbesar otomatis dengan angka bulat bila encoder membutuhkannya.': 'MP4 has no transparency, so the background is filled with the color you pick. Looping is up to the player app. A picture that is too small is enlarged automatically by a whole number if the encoder needs it.',
  'Browser ini belum mendukung MP4. Coba Chrome, Edge, atau Safari terbaru.': 'This browser does not support MP4 yet. Try a recent Chrome, Edge or Safari.',
  'Browser ini tidak bisa membuat WebP.': 'This browser cannot create WebP.',
  'Frame yang ukurannya berbeda diletakkan di tengah. Nama file: nama_anim.gif / .webp / .mp4.': 'Frames of different sizes are centered. File name: name_anim.gif / .webp / .mp4.',
  'Download Animasi': 'Download Animation', 'Animasi diunduh': 'Animation downloaded',
  'Animasi terlalu besar. Kecilkan skala atau pilih lebih sedikit frame.': 'The animation is too big. Lower the scale or pick fewer frames.',
  'Gagal membuat MP4': 'Failed to create the MP4',
  'Gambar diperbesar {n}\u00d7 agar bisa dibuat MP4': 'Picture enlarged {n}\u00d7 so the MP4 can be made',
  'Gabungkan Spritesheet': 'Merge Spritesheets',
  'Gabungkan 2 spritesheet atau lebih. Urutan dari atas ke bawah menentukan urutan hasilnya.': 'Merge 2 or more spritesheets. The order from top to bottom sets the order of the result.',
  '+ Tambah Spritesheet': '+ Add Spritesheet',
  'Pindah ke atas': 'Move up', 'Pindah ke bawah': 'Move down', 'Hapus spritesheet': 'Remove spritesheet',
  'Pilih file': 'Choose file', 'Ganti file': 'Change file', 'Belum ada file': 'No file yet',
  'Lebar frame (px)': 'Frame width (px)', 'Tinggi frame (px)': 'Frame height (px)', '{n} frame': '{n} frames',
  'Upload minimal 2 spritesheet dulu': 'Upload at least 2 spritesheets first',
  'Maksimal 12 spritesheet': 'At most 12 spritesheets',
  'Gagal membaca gambar': 'Could not read the image',
  'Hasil terlalu besar (maks. 16384 px per sisi)': 'The result is too big (max 16384 px per side)',
  'Laso': 'Lasso', 'Mode laso': 'Lasso mode', 'Baru': 'New', 'Tambah': 'Add', 'Kurangi': 'Subtract',
  'Gambar area bebas dengan jari atau mouse. Aksi berlaku untuk layer yang dipilih.': 'Draw a free-hand area with your finger or mouse. Actions apply to the selected layer.',
  'Terpilih:': 'Selected:',
  'Gambar area bebas dengan jari atau mouse. Aksi berlaku untuk layer yang dipilih. Pakai Geser / Putar / Ubah ukuran untuk memindahkan isi area.': 'Draw a free-hand area with your finger or mouse. Actions apply to the selected layer. Use Move / Rotate / Resize to change what is inside the area.',
  'Geser / Putar / Ubah ukuran': 'Move / Rotate / Resize',
  'Seret kotak untuk menggeser, titik sudut atau sisi untuk mengubah ukuran, dan titik bulat di atas untuk memutar (Shift = per 15°). Piksel tidak dibuat buram.': 'Drag the box to move, a corner or side to resize, and the round handle on top to rotate (Shift = steps of 15°). Pixels are never blurred.',
  'Sudut (°)': 'Angle (°)', 'Kunci rasio': 'Lock ratio', 'Batal': 'Cancel',
  'Atur ulang': 'Reset', 'Perubahan diterapkan': 'Change applied',
  'Putar 90° ke kiri': 'Rotate 90° left', 'Putar 90° ke kanan': 'Rotate 90° right',
  'Pisah ke layer baru': 'Move to new layer', 'Salin ke layer baru': 'Copy to new layer', 'Hapus isi': 'Delete contents',
  'Balik pilihan': 'Invert selection', 'Batal pilih': 'Deselect',
  'Potongan': 'Cutout', 'Salinan': 'Copy',
  'Belum ada area terpilih': 'No area selected',
  'Tidak ada piksel di area ini pada layer terpilih': 'No pixels in this area on the selected layer',
  'Dipisah ke layer baru': 'Moved to a new layer', 'Disalin ke layer baru': 'Copied to a new layer', 'Isi area dihapus': 'Area contents deleted',
  'Pisah layer yang sedang dipilih menjadi beberapa layer baru, otomatis.': 'Automatically split the selected layer into several new layers.',
  'Pisah berdasarkan': 'Split by', 'Bagian terpisah': 'Separate parts',
  'Jarak gabung (': 'Join distance (',
  'Bagian yang jaraknya lebih dekat dari ini dianggap satu.': 'Parts closer together than this count as one.',
  'Toleransi warna (': 'Color tolerance (',
  'Makin besar, makin sedikit layer.': 'Higher values make fewer layers.',
  'Abaikan bintik kurang dari (': 'Ignore specks smaller than (',
  'Bintik kecil dikumpulkan ke satu layer Sisa.': 'Small specks are collected into one layer called Rest.',
  'Hanya area terpilih (laso)': 'Selected area only (lasso)',
  'Simpan layer asli (disembunyikan)': 'Keep the original layer (hidden)',
  'Pisah Sekarang': 'Split Now', 'Bagian': 'Part', 'Sisa': 'Rest',
  '{n} layer dibuat': '{n} layers created',
  'Tidak ada yang bisa dipisah': 'Nothing to split', 'Layer hampir penuh (maks 16)': 'Layers almost full (max 16)', 'Layer kosong': 'The layer is empty',
  'Tampilan': 'Display', 'Bahasa': 'Language', 'Tema': 'Theme', 'Terang': 'Light', 'Gelap': 'Dark', 'Bahan': 'Source', 'Hasil': 'Output',
  'Ukuran Frame': 'Frame Size',
  'Ubah ukuran semua frame sekaligus. Lapisan (layer) ikut diubah.': 'Resize all frames at once. Layers are resized too.',
  'Ukuran saat ini:': 'Current size:', 'beragam': 'mixed',
  'Lebar (px)': 'Width (px)', 'Tinggi (px)': 'Height (px)', 'Cara menyesuaikan': 'Fit mode',
  'Muat (sisa transparan)': 'Fit (rest transparent)', 'Isi penuh (dipotong)': 'Fill (cropped)',
  'Regangkan': 'Stretch', 'Tengah (tanpa skala)': 'Center (no scaling)',
  'Kunci rasio lebar : tinggi': 'Lock width : height ratio',
  'Frame kosong baru memakai ukuran ini': 'New empty frames use this size',
  'Ubah Ukuran Semua Frame': 'Resize All Frames',
  'Ukuran frame diubah': 'Frame size changed', 'Ukuran tidak valid (1\u20132048)': 'Invalid size (1\u20132048)',
  'Ukuran sudah sama': 'Frames already have this size',
  'Dibuat oleh': 'Made by', 'Tutup': 'Close',
  'ZIP diunduh': 'ZIP downloaded', 'Gagal membuat file': 'Failed to create the file',
  'ZIP terlalu besar. Gunakan download satu per satu.': 'ZIP is too large. Use one-by-one download.',
  'Browser tidak mendukung format ini. Disimpan sebagai PNG.': "This browser can't encode that format. Saved as PNG.",
  'Spritesheet diperbarui otomatis dari frame terbaru': 'Spritesheet refreshed automatically from the latest frames',
  'JSON hanya tersedia untuk sheet dari tab Spritesheet atau gabungan Append Frames': 'JSON is only available for sheets from the Spritesheet tab or an Append Frames merge',
  'auto': 'auto', 'asli': 'original',
  'Format file tidak didukung': 'Unsupported file format', 'Video belum siap': 'Video is not ready yet',
  'Tidak ada frame': 'No frames', 'Tidak ada frame untuk disusun': 'No frames to arrange',
  'Spritesheet dibangun': 'Spritesheet built', 'Bangun spritesheet dulu di tab Spritesheet': 'Build a spritesheet in the Spritesheet tab first',
  'Upload kedua spritesheet dulu': 'Upload both spritesheets first',
  'Digabungkan. Buka tab Export untuk mengunduh hasilnya.': 'Merged. Open the Export tab to download the result.',
  'Belum ada spritesheet. Bangun dulu di tab Spritesheet atau Gabung.': 'No spritesheet yet. Build one in the Spritesheet or Merge tab.',
  'Semua frame diunduh': 'All frames downloaded',
  'Gagal mengekstrak frame video': 'Failed to extract video frames', 'Frame ditambahkan': 'Frame added',
  'Diterapkan ke semua frame': 'Applied to all frames', 'Diterapkan ke frame pertama': 'Applied to the first frame',
  'Hapus frame': 'Delete frame', 'Pindah ke kiri': 'Move left', 'Pindah ke kanan': 'Move right',
  '{n} frame diekstrak': '{n} frames extracted', '{n} frame di-decode dari GIF': '{n} frames decoded from GIF',
  'Gagal decode GIF: ': 'Failed to decode GIF: ', 'Warna diambil': 'Color picked', 'Diurungkan': 'Undone',
  'Tidak ada yang bisa diurungkan': 'Nothing to undo', 'Pojok sudah transparan': 'Corners are already transparent',
  'Rendering diubah. Bangun ulang spritesheet untuk menerapkannya.': 'Rendering changed. Rebuild the spritesheet to apply it.'
};

Object.assign(EN, {
  'Baru di v2.7.9': "What's new in v2.7.9",
  'Onion skin di Paint Sprite menampilkan frame sebelum dan sesudahnya sebagai bayangan samar, jadi gerakan lebih mudah digambar. Warna tema bisa diatur sendiri. Tombol Pengaturan di bar atas menyatukan tema, mode Terang / Gelap, dan bahasa.': 'Onion skin in Paint Sprite shows the frames before and after the current one as a faint shadow, so motion is easier to draw. Theme colors can be set your own way. The Settings button in the top bar brings theme, Light / Dark mode and language together.',
  'Onion skin': 'Onion skin', 'Aktifkan onion skin': 'Turn on onion skin',
  'Menampilkan frame di sekitar frame yang sedang digambar sebagai bayangan samar. Hanya tampilan: tidak ikut ke spritesheet atau export.': 'Shows the frames around the one you are drawing as a faint shadow. Display only: it is not part of the spritesheet or any export.',
  'Frame sebelumnya (': 'Frames before (', 'Frame sesudahnya (': 'Frames after (', 'Opasitas bayangan (': 'Shadow opacity (',
  'Makin jauh makin pudar': 'Fainter the farther away', 'Sambung dari akhir ke awal (loop)': 'Wrap round from the end to the start (loop)',
  'Beri warna pembeda': 'Tint with colors', 'Sebelum': 'Before', 'Sesudah': 'After',
  'Onion skin aktif': 'Onion skin on', 'Onion skin mati': 'Onion skin off',
  'Pengaturan': 'Settings', 'Pengaturan\u2026': 'Settings\u2026', 'Mode': 'Mode',
  'Pilih tema siap pakai, lalu ubah warnanya kalau mau. Warna disimpan terpisah untuk mode Terang dan Gelap.': 'Pick a ready-made theme, then change its colors if you like. Colors are kept separately for Light and Dark mode.',
  'Bawaan': 'Default', 'Laut': 'Ocean', 'Senja': 'Sunset', 'Anggur': 'Grape', 'Mawar': 'Rose', 'Mono': 'Mono',
  'Latar': 'Background', 'Panel': 'Panel', 'Teks': 'Text', 'Aksen': 'Accent',
  'Warna teks dan latar terlalu mirip, tulisan jadi sulit dibaca.': 'The text and background colors are too alike, so the text is hard to read.'
});

function tr(key, n) {
  let v = state.lang === 'en' && EN[key] !== undefined ? EN[key] : key;
  return n === undefined ? v : v.replace('{n}', n);
}

function applyLang() {
  document.documentElement.lang = state.lang;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentNode.closest('script')) continue;
    if (node.__id === undefined) {
      const k = node.nodeValue.trim();
      if (!k || EN[k] === undefined) continue;
      node.__id = node.nodeValue;
    }
    const k = node.__id.trim();
    node.nodeValue = state.lang === 'en' ? node.__id.replace(k, EN[k]) : node.__id;
  }
  document.querySelectorAll('[placeholder],[aria-label],[title]').forEach((el) => {
    ['placeholder', 'aria-label', 'title'].forEach((a) => {
      if (!el.hasAttribute(a)) return;
      const key = '__id_' + a;
      if (el[key] === undefined) { if (EN[el.getAttribute(a)] === undefined) return; el[key] = el.getAttribute(a); }
      el.setAttribute(a, tr(el[key]));
    });
  });
  document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('on', b.dataset.lang === state.lang));
  updateMenuCurrent();
}

function setLang(l) {
  state.lang = l;
  try { localStorage.setItem('ss.lang', l); } catch (e) {}
  applyLang();
  refreshAllFrameViews();
  updateExportUI();
  renderMergeList();
  syncSettingsUI();
  if (fcReady) fcRenderAll(false);
}

function setSmooth(v, notify) {
  state.smooth = v;
  document.body.classList.toggle('smooth', v);
  document.querySelectorAll('[data-smooth]').forEach((b) => b.classList.toggle('on', (b.dataset.smooth === '1') === v));
  try { localStorage.setItem('ss.smooth', v ? '1' : '0'); } catch (e) {}
  refreshAllFrameViews();
  queueBgPreview();
  if (notify) showToast('Rendering diubah. Bangun ulang spritesheet untuk menerapkannya.');
}

function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('[data-theme-set]').forEach((b) => b.classList.toggle('on', b.dataset.themeSet === t));
  try { localStorage.setItem('ss.theme', t); } catch (e) {}
  applyCustomTheme();
}

function initPrefs() {
  document.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.themeSet)));
  const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  document.querySelectorAll('[data-theme-set]').forEach((b) => b.classList.toggle('on', b.dataset.themeSet === cur));
  let lang = (navigator.language || 'id').toLowerCase().startsWith('id') ? 'id' : 'en';
  let smooth = false;
  try {
    lang = localStorage.getItem('ss.lang') || lang;
    smooth = localStorage.getItem('ss.smooth') === '1';
  } catch (e) {}
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  document.querySelectorAll('[data-smooth]').forEach((b) => b.addEventListener('click', () => setSmooth(b.dataset.smooth === '1', true)));
  state.lang = lang;
  setSmooth(smooth, false);
  applyLang();
}

/* =========================================================================
   CUSTOM THEME + SETTINGS DIALOG (v2.7.9)
   The built-in Light / Dark themes live in style.css. A custom theme only overrides CSS variables on <html>:
   four colors the person picks (background, panel, text, accent); the rest (lines, hover, dim text, ...) are mixed from them.
   Colors are kept separately for Light and Dark mode, so the Light / Dark switch always works.
   Saved in localStorage 'ss.custom' with the ready-made variables, so index.html can apply them before the first paint.
   ========================================================================= */
const THEME_KEYS = ['bg', 'panel', 'text', 'accent'];
const THEME_VAR_NAMES = ['--bg', '--side', '--panel', '--soft', '--line', '--text', '--dim', '--accent', '--on-accent', '--danger', '--ck1', '--ck2'];
const THEME_DEFAULTS = {
  dark: { bg: '#14171a', panel: '#1a1e22', text: '#e4e7ea', accent: '#8fbf5a' },
  light: { bg: '#eef1f4', panel: '#f7f9fb', text: '#15181c', accent: '#3d7a1c' }
};
const THEME_PRESETS = [
  { id: 'ocean', name: 'Laut', dark: { bg: '#0f1b26', panel: '#142433', text: '#dbe8f2', accent: '#4fb3e8' }, light: { bg: '#eaf3f9', panel: '#f5fafd', text: '#10202c', accent: '#0f6fa8' } },
  { id: 'sunset', name: 'Senja', dark: { bg: '#1d1415', panel: '#271a1b', text: '#f1e4e0', accent: '#ff8a5b' }, light: { bg: '#faf0ea', panel: '#fff8f4', text: '#2b1a14', accent: '#c2481a' } },
  { id: 'grape', name: 'Anggur', dark: { bg: '#17131f', panel: '#1f1a2b', text: '#e8e3f2', accent: '#b48cf2' }, light: { bg: '#f1edf8', panel: '#f9f7fd', text: '#1d1530', accent: '#6a3fb5' } },
  { id: 'rose', name: 'Mawar', dark: { bg: '#1c1418', panel: '#261a21', text: '#f2e3ea', accent: '#f27aa8' }, light: { bg: '#fbeef3', panel: '#fff7fa', text: '#2b1520', accent: '#b8316a' } },
  { id: 'mono', name: 'Mono', dark: { bg: '#121212', panel: '#1a1a1a', text: '#ededed', accent: '#d0d0d0' }, light: { bg: '#efefef', panel: '#fafafa', text: '#161616', accent: '#333333' } }
];
const customTheme = { on: false, preset: 'default', dark: Object.assign({}, THEME_DEFAULTS.dark), light: Object.assign({}, THEME_DEFAULTS.light) };

/* FC-THEME-BEGIN (pure functions: no DOM, tested in Node) */
function thHexOk(v) { return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v); }
function thRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function thHex(rgb) { return '#' + rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join(''); }
/* t = 0 gives a, t = 1 gives b */
function thMix(a, b, t) { const x = thRgb(a), y = thRgb(b); return thHex(x.map((c, i) => c + (y[i] - c) * t)); }
function thLum(h) {
  const l = thRgb(h).map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
}
function thContrast(a, b) { const x = thLum(a), y = thLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function themeVars(c, mode) {
  const dark = mode === 'dark';
  return {
    '--bg': c.bg, '--panel': c.panel, '--text': c.text, '--accent': c.accent,
    '--side': thMix(c.bg, '#000000', dark ? 0.2 : 0.04),
    '--soft': thMix(c.bg, c.text, dark ? 0.09 : 0.08),
    '--line': thMix(c.bg, c.text, dark ? 0.17 : 0.2),
    '--dim': thMix(c.text, c.bg, 0.42),
    '--on-accent': thLum(c.accent) > 0.4 ? '#0e1114' : '#ffffff',
    '--danger': dark ? '#ff8a80' : '#b3261e',
    '--ck1': thMix(c.bg, c.text, dark ? 0.11 : 0.1),
    '--ck2': thMix(c.bg, c.text, dark ? 0.04 : 0.04)
  };
}
/* FC-THEME-END */

function currentMode() { return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }

function applyCustomTheme() {
  const root = document.documentElement, mode = currentMode();
  THEME_VAR_NAMES.forEach((n) => root.style.removeProperty(n));
  if (customTheme.on) {
    const v = themeVars(customTheme[mode], mode);
    Object.keys(v).forEach((k) => root.style.setProperty(k, v[k]));
  }
  syncSettingsUI();
  if (fcReady) fcRenderAll(false);
}

function saveCustomTheme() {
  const o = { on: customTheme.on, preset: customTheme.preset };
  ['dark', 'light'].forEach((m) => { o[m] = Object.assign({}, customTheme[m], { vars: themeVars(customTheme[m], m) }); });
  try { localStorage.setItem('ss.custom', JSON.stringify(o)); } catch (e) { /* ignore */ }
}

function loadCustomTheme() {
  try {
    const o = JSON.parse(localStorage.getItem('ss.custom') || 'null');
    if (!o || typeof o !== 'object') return;
    customTheme.on = !!o.on;
    customTheme.preset = typeof o.preset === 'string' ? o.preset : 'custom';
    ['dark', 'light'].forEach((m) => {
      THEME_KEYS.forEach((k) => { if (o[m] && thHexOk(o[m][k])) customTheme[m][k] = o[m][k]; });
    });
  } catch (e) { /* broken or blocked storage: stay on the built-in theme */ }
}

function pickPreset(id) {
  if (id === 'default') {
    customTheme.on = false; customTheme.preset = 'default';
    customTheme.dark = Object.assign({}, THEME_DEFAULTS.dark);
    customTheme.light = Object.assign({}, THEME_DEFAULTS.light);
  } else {
    const p = THEME_PRESETS.find((x) => x.id === id);
    if (!p) return;
    customTheme.on = true; customTheme.preset = id;
    customTheme.dark = Object.assign({}, p.dark);
    customTheme.light = Object.assign({}, p.light);
  }
  saveCustomTheme();
  applyCustomTheme();
}

function renderThemeChips() {
  const box = $('themePresets');
  if (!box) return;
  const mode = currentMode();
  box.innerHTML = '';
  [{ id: 'default', name: 'Bawaan', c: THEME_DEFAULTS[mode] }].concat(THEME_PRESETS.map((p) => ({ id: p.id, name: p.name, c: p[mode] }))).forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'theme-chip' + (customTheme.preset === p.id && (p.id === 'default') === !customTheme.on ? ' on' : '');
    b.setAttribute('aria-pressed', b.classList.contains('on') ? 'true' : 'false');
    const dots = document.createElement('span');
    dots.className = 'theme-dots';
    [p.c.bg, p.c.accent].forEach((col) => { const i = document.createElement('i'); i.style.background = col; dots.appendChild(i); });
    b.appendChild(dots);
    b.appendChild(document.createTextNode(tr(p.name)));
    b.addEventListener('click', () => pickPreset(p.id));
    box.appendChild(b);
  });
}

function syncSettingsUI() {
  if (!$('themePresets')) return;
  const mode = currentMode(), c = customTheme[mode];
  renderThemeChips();
  document.querySelectorAll('[data-th]').forEach((inp) => { inp.value = c[inp.dataset.th]; });
  $('themeWarn').hidden = !customTheme.on || thContrast(c.bg, c.text) >= 3;
}

const settingsUI = { prev: null };

function openSettings() {
  setMenu(false);
  settingsUI.prev = document.activeElement;
  syncSettingsUI();
  $('settingsModal').hidden = false;
  $('settingsClose').focus();
}

function closeSettings() {
  if ($('settingsModal').hidden) return;
  $('settingsModal').hidden = true;
  const p = settingsUI.prev;
  if (p && p.focus) { try { p.focus(); } catch (e) { /* ignore */ } }
}

function initSettings() {
  loadCustomTheme();
  $('settingsBtn').addEventListener('click', openSettings);
  $('menuSettingsBtn').addEventListener('click', openSettings);
  $('settingsClose').addEventListener('click', closeSettings);
  $('settingsModal').addEventListener('mousedown', (e) => { if (e.target === $('settingsModal')) closeSettings(); });
  document.addEventListener('keydown', (e) => {
    if ($('settingsModal').hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSettings(); return; }
    if (e.key !== 'Tab') return;
    const f = Array.from($('settingsModal').querySelectorAll('input, select, button')).filter((x) => !x.disabled);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
  }, true);
  document.querySelectorAll('[data-th]').forEach((inp) => inp.addEventListener('input', () => {
    const mode = currentMode();
    customTheme[mode][inp.dataset.th] = inp.value;
    customTheme.on = true; customTheme.preset = 'custom';
    saveCustomTheme();
    applyCustomTheme();
  }));
  applyCustomTheme();
}

/* =========================================================================
   FONT CREATOR (v2.7)
   Draw a pixel font glyph by glyph. Glyphs that were never drawn use a built-in classic 5x7 font.
   Export: TrueType (.ttf) written by hand, BMFont atlas (PNG + .fnt), JSON metrics, per-glyph PNGs, all in a ZIP.
   ========================================================================= */

/* FC-CORE-BEGIN (pure functions: no DOM, tested in Node) */
const FC_UNIT = 100;                               // font units per pixel
const CLASSIC_W = 5, CLASSIC_H = 9, CLASSIC_BASE = 7; // 7 rows above the baseline, 2 rows below it (descenders)

/* ASCII 32..126, one entry per character: 'firstRow|row/row/...' (# = pixel). Rows not listed are empty. */
const CLASSIC_RAW = [
  '0|',                                                         // space
  '0|..#../..#../..#../..#../..#../...../..#..',                // !
  '0|.#.#./.#.#./.#.#.',                                        // "
  '0|.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.',                // #
  '0|..#../.####/#.#../.###./..#.#/####./..#..',                // $
  '0|##.../##..#/...#./..#../.#.../#..##/...##',                // %
  '0|.##../#..#./#.#../.#.../#.#.#/#..#./.##.#',                // &
  '0|..#../..#../.#...',                                        // '
  '0|...#./..#../.#.../.#.../.#.../..#../...#.',                // (
  '0|.#.../..#../...#./...#./...#./..#../.#...',                // )
  '0|...../..#../#.#.#/.###./#.#.#/..#../.....',                // *
  '0|...../..#../..#../#####/..#../..#../.....',                // +
  '5|.##../.##../.#...',                                        // ,
  '3|#####',                                                    // -
  '5|.##../.##..',                                              // .
  '0|....#/....#/...#./..#../.#.../#..../#....',                // /
  '0|.###./#...#/#..##/#.#.#/##..#/#...#/.###.',                // 0
  '0|..#../.##../..#../..#../..#../..#../.###.',                // 1
  '0|.###./#...#/....#/...#./..#../.#.../#####',                // 2
  '0|#####/...#./..#../...#./....#/#...#/.###.',                // 3
  '0|...#./..##./.#.#./#..#./#####/...#./...#.',                // 4
  '0|#####/#..../####./....#/....#/#...#/.###.',                // 5
  '0|..##./.#.../#..../####./#...#/#...#/.###.',                // 6
  '0|#####/....#/...#./..#../.#.../.#.../.#...',                // 7
  '0|.###./#...#/#...#/.###./#...#/#...#/.###.',                // 8
  '0|.###./#...#/#...#/.####/....#/...#./.##..',                // 9
  '1|.##../.##../...../.##../.##..',                            // :
  '1|.##../.##../...../.##../.##../..#../.#...',                // ;
  '0|...#./..#../.#.../#..../.#.../..#../...#.',                // <
  '2|#####/...../#####',                                        // =
  '0|.#.../..#../...#./....#/...#./..#../.#...',                // >
  '0|.###./#...#/....#/...#./..#../...../..#..',                // ?
  '0|.###./#...#/#.###/#.#.#/#.###/#..../.###.',                // @
  '0|.###./#...#/#...#/#####/#...#/#...#/#...#',                // A
  '0|####./#...#/#...#/####./#...#/#...#/####.',                // B
  '0|.###./#...#/#..../#..../#..../#...#/.###.',                // C
  '0|###../#..#./#...#/#...#/#...#/#..#./###..',                // D
  '0|#####/#..../#..../####./#..../#..../#####',                // E
  '0|#####/#..../#..../####./#..../#..../#....',                // F
  '0|.###./#...#/#..../#.###/#...#/#...#/.####',                // G
  '0|#...#/#...#/#...#/#####/#...#/#...#/#...#',                // H
  '0|.###./..#../..#../..#../..#../..#../.###.',                // I
  '0|..###/...#./...#./...#./...#./#..#./.##..',                // J
  '0|#...#/#..#./#.#../##.../#.#../#..#./#...#',                // K
  '0|#..../#..../#..../#..../#..../#..../#####',                // L
  '0|#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',                // M
  '0|#...#/#...#/##..#/#.#.#/#..##/#...#/#...#',                // N
  '0|.###./#...#/#...#/#...#/#...#/#...#/.###.',                // O
  '0|####./#...#/#...#/####./#..../#..../#....',                // P
  '0|.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',                // Q
  '0|####./#...#/#...#/####./#.#../#..#./#...#',                // R
  '0|.####/#..../#..../.###./....#/....#/####.',                // S
  '0|#####/..#../..#../..#../..#../..#../..#..',                // T
  '0|#...#/#...#/#...#/#...#/#...#/#...#/.###.',                // U
  '0|#...#/#...#/#...#/#...#/#...#/.#.#./..#..',                // V
  '0|#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',                // W
  '0|#...#/#...#/.#.#./..#../.#.#./#...#/#...#',                // X
  '0|#...#/#...#/.#.#./..#../..#../..#../..#..',                // Y
  '0|#####/....#/...#./..#../.#.../#..../#####',                // Z
  '0|.###./.#.../.#.../.#.../.#.../.#.../.###.',                // [
  '0|#..../#..../.#.../..#../...#./....#/....#',                // backslash
  '0|.###./...#./...#./...#./...#./...#./.###.',                // ]
  '0|..#../.#.#./#...#',                                        // ^
  '7|#####',                                                    // _
  '0|.#.../..#../...#.',                                        // `
  '2|.###./....#/.####/#...#/.####',                            // a
  '0|#..../#..../####./#...#/#...#/#...#/####.',                // b
  '2|.###./#...#/#..../#...#/.###.',                            // c
  '0|....#/....#/.####/#...#/#...#/#...#/.####',                // d
  '2|.###./#...#/#####/#..../.###.',                            // e
  '0|..##./.#..#/.#.../###../.#.../.#.../.#...',                // f
  '2|.####/#...#/#...#/#...#/.####/....#/.###.',                // g
  '0|#..../#..../#.##./##..#/#...#/#...#/#...#',                // h
  '0|..#../...../.##../..#../..#../..#../.###.',                // i
  '0|...#./...../..##./...#./...#./...#./...#./#..#./.##..',    // j
  '0|#..../#..../#..#./#.#../##.../#.#../#..#.',                // k
  '0|.##../..#../..#../..#../..#../..#../.###.',                // l
  '2|##.#./#.#.#/#.#.#/#.#.#/#.#.#',                            // m
  '2|#.##./##..#/#...#/#...#/#...#',                            // n
  '2|.###./#...#/#...#/#...#/.###.',                            // o
  '2|####./#...#/#...#/#...#/####./#..../#....',                // p
  '2|.####/#...#/#...#/#...#/.####/....#/....#',                // q
  '2|#.##./##..#/#..../#..../#....',                            // r
  '2|.####/#..../.###./....#/####.',                            // s
  '0|.#.../.#.../###../.#.../.#.../.#..#/..##.',                // t
  '2|#...#/#...#/#...#/#..##/.##.#',                            // u
  '2|#...#/#...#/#...#/.#.#./..#..',                            // v
  '2|#...#/#...#/#.#.#/#.#.#/.#.#.',                            // w
  '2|#...#/.#.#./..#../.#.#./#...#',                            // x
  '2|#...#/#...#/#...#/#...#/.####/....#/.###.',                // y
  '2|#####/...#./..#../.#.../#####',                            // z
  '0|...##/..#../..#../.#.../..#../..#../...##',                // {
  '0|..#../..#../..#../..#../..#../..#../..#..',                // |
  '0|##.../..#../..#../...#./..#../..#../##...',                // }
  '3|.##.#/#.##.'                                               // ~
];

const fcClassicCache = {};
function fcClassicGlyph(code) {
  if (code < 32 || code > 126) return null;
  let g = fcClassicCache[code];
  if (g) return g;
  const raw = CLASSIC_RAW[code - 32];
  const bar = raw.indexOf('|');
  const top = parseInt(raw.slice(0, bar), 10);
  const rows = raw.slice(bar + 1).split('/');
  g = new Uint8Array(CLASSIC_W * CLASSIC_H);
  rows.forEach((row, i) => {
    const y = top + i;
    if (!row || y >= CLASSIC_H) return;
    for (let x = 0; x < CLASSIC_W; x++) if (row[x] === '#') g[y * CLASSIC_W + x] = 1;
  });
  fcClassicCache[code] = g;
  return g;
}

/* The classic glyph placed in a w x h grid: centered sideways, baseline aligned. */
function fcMapClassic(code, w, h, base) {
  const out = new Uint8Array(w * h);
  const g = fcClassicGlyph(code);
  if (!g) return out;
  const dx = Math.floor((w - CLASSIC_W) / 2), dy = base - CLASSIC_BASE;
  for (let y = 0; y < CLASSIC_H; y++) {
    for (let x = 0; x < CLASSIC_W; x++) {
      if (!g[y * CLASSIC_W + x]) continue;
      const X = x + dx, Y = y + dy;
      if (X >= 0 && X < w && Y >= 0 && Y < h) out[Y * w + X] = 1;
    }
  }
  return out;
}

function fcInfo(bits, w, h) {
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!bits[y * w + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { empty: maxX < 0, minX, maxX, minY, maxY };
}

/* Advance in pixels. p = { w, h, base, spacing, prop } */
function fcAdvance(p, info) {
  if (!p.prop) return p.w + p.spacing;
  if (info.empty) return Math.max(1, Math.ceil(p.w / 2)) + p.spacing;
  return (info.maxX - info.minX + 1) + p.spacing;
}
function fcXoff(p, info) { return p.prop && !info.empty ? info.minX : 0; }

/* Outline of the filled pixels as closed polygons (x right, y up, baseline at y = 0, pixel units).
   Shared edges between neighbours are removed, so the result is one clean outline with no seams.
   Outer contours run clockwise and holes counter-clockwise, as TrueType expects. */
function fcTrace(bits, w, h, base, xoff) {
  const edges = new Map();
  const add = (x0, y0, x1, y1) => {
    const rev = x1 + ',' + y1 + ',' + x0 + ',' + y0;
    if (edges.has(rev)) edges.delete(rev);
    else edges.set(x0 + ',' + y0 + ',' + x1 + ',' + y1, [x0, y0, x1, y1]);
  };
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (!bits[r * w + c]) continue;
      const x = c - xoff, top = base - r, bot = top - 1;
      add(x, bot, x, top);          // left side, going up
      add(x, top, x + 1, top);      // top, going right
      add(x + 1, top, x + 1, bot);  // right side, going down
      add(x + 1, bot, x, bot);      // bottom, going left
    }
  }
  const out = new Map(), all = [];
  edges.forEach((e) => {
    const o = { x0: e[0], y0: e[1], x1: e[2], y1: e[3], used: false };
    all.push(o);
    const k = e[0] + ',' + e[1];
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(o);
  });
  const contours = [];
  for (const e0 of all) {
    if (e0.used) continue;
    const pts = [];
    let e = e0;
    for (;;) {
      e.used = true;
      pts.push([e.x0, e.y0]);
      const cands = (out.get(e.x1 + ',' + e.y1) || []).filter((n) => !n.used || n === e0);
      if (!cands.length) break;
      let nxt = cands[0];
      if (cands.length > 1) {
        // two pixels touching at a corner: turn right, which keeps each pixel's outline separate
        const dx = e.x1 - e.x0, dy = e.y1 - e.y0, rx = dy, ry = -dx;
        nxt = cands.find((n) => n.x1 - n.x0 === rx && n.y1 - n.y0 === ry)
          || cands.find((n) => n.x1 - n.x0 === dx && n.y1 - n.y0 === dy) || cands[0];
      }
      if (nxt === e0) break;
      e = nxt;
    }
    const n = pts.length, res = [];
    for (let i = 0; i < n; i++) {
      const a = pts[(i + n - 1) % n], b = pts[i], c = pts[(i + 1) % n];
      if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) res.push(b);
    }
    if (res.length >= 4) contours.push(res);
  }
  return contours;
}

/* Glyphs to export: all of ASCII 32..126 (never-drawn ones come from the classic font), plus added characters that are not empty. */
function fcExportList(p, getBits, extra) {
  const list = [];
  for (let code = 32; code <= 126; code++) list.push({ code, bits: getBits(code) });
  extra.forEach((code) => {
    const bits = getBits(code);
    if (!fcInfo(bits, p.w, p.h).empty) list.push({ code, bits });
  });
  list.sort((a, b) => a.code - b.code);
  return list;
}

/* ---- TrueType writer ---- */
function FcBuf() { this.a = []; }
FcBuf.prototype.u8 = function (v) { this.a.push(v & 255); return this; };
FcBuf.prototype.u16 = function (v) { this.a.push((v >> 8) & 255, v & 255); return this; };
FcBuf.prototype.i16 = function (v) { return this.u16(v & 0xFFFF); };
FcBuf.prototype.u32 = function (v) { this.a.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); return this; };
FcBuf.prototype.tag = function (s) { for (let i = 0; i < 4; i++) this.a.push(s.charCodeAt(i) & 255); return this; };
FcBuf.prototype.pad4 = function () { while (this.a.length % 4) this.a.push(0); return this; };
FcBuf.prototype.bytes = function () { return Uint8Array.from(this.a); };

function fcChecksum(b) {
  let sum = 0;
  for (let i = 0; i < b.length; i += 4) {
    sum = (sum + (((b[i] || 0) << 24) >>> 0) + ((b[i + 1] || 0) << 16) + ((b[i + 2] || 0) << 8) + (b[i + 3] || 0)) >>> 0;
  }
  return sum;
}

function fcUtf16be(s) {
  const b = new FcBuf();
  for (let i = 0; i < s.length; i++) b.u16(s.charCodeAt(i));
  return b.a;
}

function fcPsName(name) {
  const n = String(name).replace(/[^A-Za-z0-9-]/g, '');
  return (n || 'PixelFont').slice(0, 60);
}

/* p = { name, w, h, base, spacing, prop }, list from fcExportList. Returns Uint8Array (.ttf). */
function fcBuildTtf(p, list, version) {
  const U = FC_UNIT, w = p.w, h = p.h, base = p.base;
  const glyphs = [];

  const makeGlyph = (bits, forcedAdvance) => {
    const info = fcInfo(bits, w, h);
    const xoff = fcXoff(p, info);
    const contours = fcTrace(bits, w, h, base, xoff);
    const adv = (forcedAdvance != null ? forcedAdvance : fcAdvance(p, info)) * U;
    let xMin = 0, yMin = 0, xMax = 0, yMax = 0, npts = 0;
    if (contours.length) {
      xMin = yMin = 1e9; xMax = yMax = -1e9;
      contours.forEach((c) => c.forEach((pt) => {
        const x = pt[0] * U, y = pt[1] * U;
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
        npts++;
      }));
    }
    return { contours, adv, xMin, yMin, xMax, yMax, npts, info, hasShape: contours.length > 0 };
  };

  // glyph 0: .notdef, a hollow box (solid when the cell is tiny)
  const nd = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      nd[y * w + x] = (w < 3 || h < 3 || x === 0 || y === 0 || x === w - 1 || y === h - 1) ? 1 : 0;
    }
  }
  const nd0 = makeGlyph(nd, w + p.spacing);
  nd0.code = -1;
  glyphs.push(nd0);
  list.forEach((it) => { const g = makeGlyph(it.bits); g.code = it.code; glyphs.push(g); });

  // glyf + loca (long offsets)
  const glyf = new FcBuf(), loca = new FcBuf();
  let maxPts = 0, maxCont = 0;
  glyphs.forEach((g) => {
    loca.u32(glyf.a.length);
    if (!g.hasShape) return;
    const flat = [];
    const ends = [];
    g.contours.forEach((c) => { c.forEach((pt) => flat.push([pt[0] * U, pt[1] * U])); ends.push(flat.length - 1); });
    maxPts = Math.max(maxPts, flat.length);
    maxCont = Math.max(maxCont, g.contours.length);
    glyf.i16(g.contours.length).i16(g.xMin).i16(g.yMin).i16(g.xMax).i16(g.yMax);
    ends.forEach((e) => glyf.u16(e));
    glyf.u16(0);                                   // no instructions
    flat.forEach(() => glyf.u8(1));                // all points on the curve, 16-bit deltas
    let px = 0;
    flat.forEach((pt) => { glyf.i16(pt[0] - px); px = pt[0]; });
    let py = 0;
    flat.forEach((pt) => { glyf.i16(pt[1] - py); py = pt[1]; });
    glyf.pad4();
  });
  loca.u32(glyf.a.length);

  // overall measures
  let gxMin = 0, gyMin = 0, gxMax = 0, gyMax = 0, advMax = 0, minLsb = 1e9, minRsb = 1e9, xExt = 0, advSum = 0;
  glyphs.forEach((g, i) => {
    if (g.hasShape) {
      gxMin = Math.min(gxMin, g.xMin); gyMin = Math.min(gyMin, g.yMin);
      gxMax = Math.max(gxMax, g.xMax); gyMax = Math.max(gyMax, g.yMax);
    }
    advMax = Math.max(advMax, g.adv);
    advSum += g.adv;
    const lsb = g.hasShape ? g.xMin : 0, ext = g.hasShape ? g.xMax - g.xMin : 0;
    minLsb = Math.min(minLsb, lsb);
    minRsb = Math.min(minRsb, g.adv - lsb - ext);
    xExt = Math.max(xExt, lsb + ext);
  });
  const ascent = base * U, descent = (h - base) * U, upm = h * U;
  const nGlyphs = glyphs.length;

  const top = (code) => { const g = glyphs.find((x) => x.code === code); return g && g.hasShape ? (base - g.info.minY) * U : 0; };

  // head
  const secs = 2082844800 + Math.floor(Date.now() / 1000);
  const hi = Math.floor(secs / 4294967296), lo = secs >>> 0;
  const head = new FcBuf();
  head.u32(0x00010000).u32(0x00010000).u32(0).u32(0x5F0F3CF5).u16(3).u16(upm)
    .u32(hi).u32(lo).u32(hi).u32(lo).i16(gxMin).i16(gyMin).i16(gxMax).i16(gyMax)
    .u16(0).u16(Math.min(h, 65535)).i16(2).i16(1).i16(0);

  // hhea
  const hhea = new FcBuf();
  hhea.u32(0x00010000).i16(ascent).i16(-descent).i16(0).u16(advMax).i16(minLsb).i16(minRsb).i16(xExt)
    .i16(1).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).u16(nGlyphs);

  // maxp
  const maxp = new FcBuf();
  maxp.u32(0x00010000).u16(nGlyphs).u16(maxPts).u16(maxCont).u16(0).u16(0).u16(2).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0);

  // hmtx
  const hmtx = new FcBuf();
  glyphs.forEach((g) => { hmtx.u16(g.adv).i16(g.hasShape ? g.xMin : 0); });

  // cmap (format 4, BMP only)
  const pairs = [];
  glyphs.forEach((g, gid) => { if (g.code >= 0 && g.code < 0xFFFF) pairs.push([g.code, gid]); });
  pairs.sort((a, b) => a[0] - b[0]);
  const segs = [];
  pairs.forEach((pr) => {
    const s = segs[segs.length - 1];
    if (s && pr[0] === s.end + 1 && pr[1] === s.gid + (pr[0] - s.start)) s.end = pr[0];
    else segs.push({ start: pr[0], end: pr[0], gid: pr[1] });
  });
  segs.push({ start: 0xFFFF, end: 0xFFFF, gid: 0, last: true });
  const segCount = segs.length;
  let sr = 1, es = 0;
  while (sr * 2 <= segCount) { sr *= 2; es++; }
  const cmap = new FcBuf();
  cmap.u16(0).u16(2).u16(0).u16(3).u32(20).u16(3).u16(1).u32(20);
  cmap.u16(4).u16(16 + 8 * segCount).u16(0).u16(segCount * 2).u16(sr * 2).u16(es).u16(segCount * 2 - sr * 2);
  segs.forEach((s) => cmap.u16(s.end));
  cmap.u16(0);
  segs.forEach((s) => cmap.u16(s.start));
  segs.forEach((s) => cmap.u16(s.last ? 1 : (s.gid - s.start) & 0xFFFF));
  segs.forEach(() => cmap.u16(0));

  // OS/2 (version 4)
  const codes = glyphs.filter((g) => g.code >= 0).map((g) => g.code);
  const os2 = new FcBuf();
  os2.u16(4).i16(Math.round(advSum / nGlyphs)).u16(400).u16(5).u16(0)
    .i16(upm / 2 | 0).i16(upm / 2 | 0).i16(0).i16(upm / 8 | 0)
    .i16(upm / 2 | 0).i16(upm / 2 | 0).i16(0).i16(upm / 4 | 0)
    .i16(U).i16(Math.round(ascent / 3))
    .i16(0);
  for (let i = 0; i < 10; i++) os2.u8(0);                      // panose
  os2.u32(1).u32(0).u32(0).u32(0);                              // unicode ranges: Basic Latin
  os2.tag('SSTD').u16(0x00C0)                                   // vendor, fsSelection = regular + use typo metrics
    .u16(Math.min.apply(null, codes)).u16(Math.max.apply(null, codes))
    .i16(ascent).i16(-descent).i16(0).u16(Math.max(ascent, gyMax)).u16(Math.max(descent, -gyMin))
    .u32(1).u32(0).i16(top(120)).i16(top(72)).u16(0).u16(32).u16(1);

  // name
  const family = String(p.name || 'PixelFont').slice(0, 60);
  const names = [
    [1, family], [2, 'Regular'], [3, family + ';Spritesheet Studio ' + (version || '')],
    [4, family], [5, 'Version 1.000'], [6, fcPsName(family)]
  ];
  const strs = names.map((n) => fcUtf16be(n[1]));
  const nameT = new FcBuf();
  nameT.u16(0).u16(names.length).u16(6 + 12 * names.length);
  let so = 0;
  names.forEach((n, i) => { nameT.u16(3).u16(1).u16(0x409).u16(n[0]).u16(strs[i].length).u16(so); so += strs[i].length; });
  strs.forEach((s) => s.forEach((b) => nameT.u8(b)));

  // post (format 3: no glyph names)
  const post = new FcBuf();
  post.u32(0x00030000).u32(0).i16(-U).i16(Math.max(1, U / 2 | 0)).u32(p.prop ? 0 : 1).u32(0).u32(0).u32(0).u32(0);

  const tables = {
    'OS/2': os2.bytes(), cmap: cmap.bytes(), glyf: glyf.bytes(), head: head.bytes(), hhea: hhea.bytes(),
    hmtx: hmtx.bytes(), loca: loca.bytes(), maxp: maxp.bytes(), name: nameT.bytes(), post: post.bytes()
  };
  const tags = Object.keys(tables).sort();
  const n = tags.length;
  let e2 = 1, sel = 0;
  while (e2 * 2 <= n) { e2 *= 2; sel++; }
  const dir = new FcBuf();
  dir.u32(0x00010000).u16(n).u16(e2 * 16).u16(sel).u16(n * 16 - e2 * 16);
  let off = 12 + 16 * n, headOff = 0;
  const body = [];
  tags.forEach((t) => {
    const data = tables[t];
    if (t === 'head') headOff = off;
    dir.tag(t).u32(fcChecksum(data)).u32(off).u32(data.length);
    const padded = Math.ceil(data.length / 4) * 4;
    const chunk = new Uint8Array(padded);
    chunk.set(data);
    body.push(chunk);
    off += padded;
  });
  const dirBytes = dir.bytes();
  const file = new Uint8Array(off);
  file.set(dirBytes, 0);
  let pos = dirBytes.length;
  body.forEach((c) => { file.set(c, pos); pos += c.length; });
  const adj = (0xB1B0AFBA - fcChecksum(file)) >>> 0;
  file[headOff + 8] = (adj >>> 24) & 255; file[headOff + 9] = (adj >>> 16) & 255;
  file[headOff + 10] = (adj >>> 8) & 255; file[headOff + 11] = adj & 255;
  return file;
}

/* ---- bitmap font (atlas + BMFont text + JSON) ---- */
function fcLayout(p, count) {
  const cols = Math.min(16, Math.max(1, count));
  const rows = Math.ceil(count / cols);
  return { cols, rows, W: 1 + cols * (p.w + 1), H: 1 + rows * (p.h + 1) };
}

/* Position and metrics of every glyph in the atlas. */
function fcGlyphRects(p, list, lay) {
  return list.map((it, i) => {
    const info = fcInfo(it.bits, p.w, p.h);
    const cx = 1 + (i % lay.cols) * (p.w + 1), cy = 1 + Math.floor(i / lay.cols) * (p.h + 1);
    const r = { code: it.code, cellX: cx, cellY: cy, advance: fcAdvance(p, info), blank: info.empty };
    if (info.empty) { r.x = cx; r.y = cy; r.width = 0; r.height = 0; }
    else if (p.prop) { r.x = cx + info.minX; r.y = cy; r.width = info.maxX - info.minX + 1; r.height = p.h; }
    else { r.x = cx; r.y = cy; r.width = p.w; r.height = p.h; }
    return r;
  });
}

function fcFntText(p, rects, lay, pngName) {
  const face = String(p.name || 'PixelFont').replace(/"/g, "'");
  const L = [];
  L.push('info face="' + face + '" size=' + p.h + ' bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=0 aa=1 padding=0,0,0,0 spacing=1,1 outline=0');
  L.push('common lineHeight=' + p.h + ' base=' + p.base + ' scaleW=' + lay.W + ' scaleH=' + lay.H + ' pages=1 packed=0 alphaChnl=0 redChnl=4 greenChnl=4 blueChnl=4');
  L.push('page id=0 file="' + pngName + '"');
  L.push('chars count=' + rects.length);
  rects.forEach((r) => {
    L.push('char id=' + r.code + ' x=' + r.x + ' y=' + r.y + ' width=' + r.width + ' height=' + r.height +
      ' xoffset=0 yoffset=0 xadvance=' + r.advance + ' page=0 chnl=15');
  });
  return L.join('\n') + '\n';
}

function fcJsonText(p, rects, lay, pngName, withAtlas) {
  const o = {
    name: p.name, generator: 'Spritesheet Studio', size: p.h, lineHeight: p.h, baseline: p.base,
    glyphWidth: p.w, spacing: p.spacing, proportional: !!p.prop
  };
  if (withAtlas) o.atlas = { file: pngName, width: lay.W, height: lay.H };
  o.glyphs = rects.map((r) => {
    const g = { char: String.fromCharCode(r.code), code: r.code, advance: r.advance };
    if (withAtlas) { g.x = r.x; g.y = r.y; g.width = r.width; g.height = r.height; }
    return g;
  });
  return JSON.stringify(o, null, 2) + '\n';
}
/* FC-CORE-END */

/* ---- state ---- */
const fc = {
  name: 'MyPixelFont', w: 5, h: 9, base: 7, spacing: 1, prop: false,
  glyphs: new Map(),   // code -> Uint8Array(w*h): glyphs the user has drawn (or changed)
  mapped: new Map(),   // code -> classic glyph placed in the grid (cache, cleared on size change)
  extra: [],           // added characters outside ASCII 32..126
  sel: 65, tool: 'draw', undo: [], redo: [], stroke: null, cells: new Map(), busy: false
};
let fcReady = false;

function fcParams() { return { name: fc.name, w: fc.w, h: fc.h, base: fc.base, spacing: fc.spacing, prop: fc.prop }; }
function fcCodes() { const a = []; for (let c = 32; c <= 126; c++) a.push(c); return a.concat(fc.extra); }
function fcGlyph(code) {
  let g = fc.glyphs.get(code);
  if (g) return g;
  g = fc.mapped.get(code);
  if (!g) { g = fcMapClassic(code, fc.w, fc.h, fc.base); fc.mapped.set(code, g); }
  return g;
}
function fcIsCustom(code) { return fc.glyphs.has(code); }
function fcCharLabel(code) { return code === 32 ? '\u2423' : String.fromCharCode(code); }
function fcHex(code) { return 'U+' + code.toString(16).toUpperCase().padStart(4, '0'); }
function fcColor(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'; }
function fcClamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function fcPush(code) {
  fc.undo.push({ code, prev: fc.glyphs.has(code) ? fc.glyphs.get(code).slice() : null });
  if (fc.undo.length > 300) fc.undo.shift();
  fc.redo.length = 0;
}
function fcEdit(code) {
  let g = fc.glyphs.get(code);
  if (!g) { g = fcGlyph(code).slice(); fc.glyphs.set(code, g); }
  return g;
}
function fcSnapshot(code) { return { code, prev: fc.glyphs.has(code) ? fc.glyphs.get(code).slice() : null }; }
function fcRestore(e) {
  if (e.prev) fc.glyphs.set(e.code, e.prev); else fc.glyphs.delete(e.code);
  fc.sel = e.code;
  fcRenderAll(true);
}
function fcUndo() {
  const e = fc.undo.pop();
  if (!e) { showToast('Tidak ada yang bisa diurungkan'); return; }
  fc.redo.push(fcSnapshot(e.code));
  fcRestore(e);
}
function fcRedo() {
  const e = fc.redo.pop();
  if (!e) return;
  fc.undo.push(fcSnapshot(e.code));
  fcRestore(e);
}

/* Changing the grid size keeps what was drawn: glyphs stay centered sideways and aligned to the baseline. */
function fcApplySize(nw, nh, nb) {
  if (nw === fc.w && nh === fc.h && nb === fc.base) return;
  const ow = fc.w, oh = fc.h, ob = fc.base;
  const dx = Math.floor((nw - ow) / 2), dy = nb - ob;
  fc.glyphs.forEach((g, code) => {
    const out = new Uint8Array(nw * nh);
    for (let y = 0; y < oh; y++) {
      for (let x = 0; x < ow; x++) {
        if (!g[y * ow + x]) continue;
        const X = x + dx, Y = y + dy;
        if (X >= 0 && X < nw && Y >= 0 && Y < nh) out[Y * nw + X] = 1;
      }
    }
    fc.glyphs.set(code, out);
  });
  fc.w = nw; fc.h = nh; fc.base = nb;
  fc.mapped.clear();
  fc.undo.length = 0; fc.redo.length = 0;
}

function fcNudge(dx, dy) {
  const code = fc.sel, w = fc.w, h = fc.h, src = fcGlyph(code);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!src[y * w + x]) continue;
      const X = x + dx, Y = y + dy;
      if (X >= 0 && X < w && Y >= 0 && Y < h) out[Y * w + X] = 1;
    }
  }
  fcPush(code);
  fc.glyphs.set(code, out);
  fcRenderAll(true);
}

function fcClear() {
  fcPush(fc.sel);
  fc.glyphs.set(fc.sel, new Uint8Array(fc.w * fc.h));
  fcRenderAll(true);
}

function fcResetGlyph() {
  const code = fc.sel;
  if (code > 126) {                       // an added character: remove it
    fc.extra = fc.extra.filter((c) => c !== code);
    fc.glyphs.delete(code); fc.mapped.delete(code);
    fc.undo.length = 0; fc.redo.length = 0;
    fc.sel = 65;
    fcBuildGrid();
    fcRenderAll(true);
    showToast('Karakter dihapus');
    return;
  }
  if (!fc.glyphs.has(code)) { showToast('Sudah memakai font klasik'); return; }
  fcPush(code);
  fc.glyphs.delete(code);
  fcRenderAll(true);
  showToast('Dikembalikan ke font klasik');
}

function fcResetAll() {
  if (!fc.glyphs.size && !fc.extra.length) { showToast('Semua sudah memakai font klasik'); return; }
  if (!window.confirm(tr('Kembalikan semua huruf ke font klasik? Gambar yang sudah kamu buat akan hilang.'))) return;
  fc.glyphs.clear(); fc.mapped.clear(); fc.extra = [];
  fc.undo.length = 0; fc.redo.length = 0;
  if (fc.sel > 126) fc.sel = 65;
  fcBuildGrid();
  fcRenderAll(true);
  showToast('Semua huruf kembali ke font klasik');
}

function fcAddChars() {
  const inp = $('fcAddInput');
  const chars = Array.from(inp.value);
  let added = 0, skipped = false, last = null;
  chars.forEach((ch) => {
    const code = ch.codePointAt(0);
    if (code < 32 || code === 127 || (code >= 0x80 && code < 0xA0)) return;
    if (code > 0xFFFE) { skipped = true; return; }
    if (code <= 126) { last = code; return; }
    if (fc.extra.indexOf(code) >= 0) { last = code; return; }
    fc.extra.push(code);
    added++; last = code;
  });
  inp.value = '';
  if (skipped) showToast('Karakter di luar BMP (mis. emoji) tidak didukung');
  if (last == null) return;
  fc.extra.sort((a, b) => a - b);
  fc.sel = last;
  fcBuildGrid();
  fcRenderAll(true);
  if (added) showToast('Karakter ditambahkan');
}

/* ---- drawing ---- */
function fcCellAt(e) {
  const cv = $('fcCanvas'), r = cv.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) / r.width * fc.w), y = Math.floor((e.clientY - r.top) / r.height * fc.h);
  return { x: fcClamp(x, 0, fc.w - 1), y: fcClamp(y, 0, fc.h - 1), inside: x >= 0 && y >= 0 && x < fc.w && y < fc.h };
}
function fcPlot(g, x0, y0, x1, y1, v) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    g[y0 * fc.w + x0] = v;
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function fcStrokeStart(e) {
  const c = fcCellAt(e);
  if (!c.inside) return;
  e.preventDefault();
  try { $('fcCanvas').setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  const code = fc.sel;
  fc.stroke = { code, val: fc.tool === 'draw' ? 1 : 0, last: c, orig: fcGlyph(code).slice(), hadCustom: fc.glyphs.has(code) };
  fcPush(code);
  const g = fcEdit(code);
  fcPlot(g, c.x, c.y, c.x, c.y, fc.stroke.val);
  fcRenderEditor();
}
function fcStrokeMove(e) {
  const s = fc.stroke;
  if (!s) return;
  e.preventDefault();
  const c = fcCellAt(e);
  if (c.x === s.last.x && c.y === s.last.y) return;
  fcPlot(fcEdit(s.code), s.last.x, s.last.y, c.x, c.y, s.val);
  s.last = c;
  fcRenderEditor();
}
function fcStrokeEnd() {
  const s = fc.stroke;
  if (!s) return;
  fc.stroke = null;
  const g = fc.glyphs.get(s.code);
  let same = !!g && g.length === s.orig.length;
  if (same) for (let i = 0; i < g.length; i++) if (g[i] !== s.orig[i]) { same = false; break; }
  if (same) {                                   // nothing changed: forget this stroke
    fc.undo.pop();
    if (!s.hadCustom) fc.glyphs.delete(s.code);
  }
  fcRenderAll(true);
}

/* ---- rendering ---- */
function fcRenderEditor() {
  const cv = $('fcCanvas'), stage = $('fcStage');
  if (!cv) return;
  const w = fc.w, h = fc.h, g = fcGlyph(fc.sel), custom = fcIsCustom(fc.sel);
  const avail = Math.max(120, stage.clientWidth - 22);
  const maxH = Math.max(160, Math.floor(window.innerHeight * 0.5));
  const cell = Math.max(4, Math.min(40, Math.floor(avail / w), Math.floor(maxH / h)));
  cv.width = w * cell; cv.height = h * cell;
  cv.style.width = cv.width + 'px'; cv.style.height = cv.height + 'px';
  const ctx = cv.getContext('2d');
  ctx.fillStyle = fcColor('--bg');
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = fcColor('--text');
  ctx.globalAlpha = custom ? 1 : 0.6;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y * w + x]) ctx.fillRect(x * cell, y * cell, cell, cell);
  ctx.globalAlpha = 1;
  if (cell >= 8) {
    ctx.strokeStyle = fcColor('--line');
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < w; x++) { ctx.moveTo(x * cell + 0.5, 0); ctx.lineTo(x * cell + 0.5, h * cell); }
    for (let y = 1; y < h; y++) { ctx.moveTo(0, y * cell + 0.5); ctx.lineTo(w * cell, y * cell + 0.5); }
    ctx.stroke();
  }
  // baseline
  ctx.strokeStyle = fcColor('--accent');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, fc.base * cell); ctx.lineTo(w * cell, fc.base * cell);
  ctx.stroke();
}

function fcDrawThumb(cv, code, ink) {
  const w = fc.w, h = fc.h, g = fcGlyph(code);
  if (cv.width !== w) cv.width = w;
  if (cv.height !== h) cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = ink;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y * w + x]) ctx.fillRect(x, y, 1, 1);
}

function fcBuildGrid() {
  const grid = $('fcGrid');
  grid.textContent = '';
  fc.cells.clear();
  fcCodes().forEach((code) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fc-cell';
    b.dataset.code = String(code);
    b.setAttribute('aria-label', fcCharLabel(code));
    const cv = document.createElement('canvas');
    const lab = document.createElement('span');
    lab.className = 'fc-lab';
    lab.textContent = fcCharLabel(code);
    b.appendChild(cv); b.appendChild(lab);
    grid.appendChild(b);
    fc.cells.set(code, { btn: b, cv });
  });
}

function fcRefreshCell(code, ink) {
  const c = fc.cells.get(code);
  if (!c) return;
  fcDrawThumb(c.cv, code, ink || fcColor('--text'));
  c.btn.classList.toggle('custom', fcIsCustom(code));
  c.btn.classList.toggle('on', code === fc.sel);
}

function fcRefreshAllCells() {
  const ink = fcColor('--text');
  fc.cells.forEach((c, code) => fcRefreshCell(code, ink));
}

function fcRenderInfo() {
  const code = fc.sel, custom = fcIsCustom(code);
  $('fcCur').textContent = fcCharLabel(code);
  let st;
  if (code > 126) st = custom ? 'Buatanmu' : 'Belum digambar (kosong)';
  else st = custom ? 'Buatanmu' : 'Klasik (otomatis)';
  $('fcCurInfo').textContent = fcHex(code) + ' \u00B7 ' + tr(st);
  $('fcReset').textContent = tr(code > 126 ? 'Hapus karakter' : 'Kembalikan ke klasik');
  $('fcUndo').disabled = !fc.undo.length;
  $('fcRedo').disabled = !fc.redo.length;
  $('fcMiss').hidden = !(fc.extra.length && fc.extra.some((c) => !fcIsCustom(c)));
}

function fcRenderPreview() {
  const cv = $('fcPreview');
  if (!cv) return;
  const p = fcParams();
  const lines = $('fcPreviewText').value.split('\n').slice(0, 12);
  let scale = parseInt($('fcPreviewScale').value, 10) || 3;
  const widths = lines.map((ln) => {
    let x = 0;
    Array.from(ln).forEach((ch) => { const g = fcGlyph(ch.codePointAt(0)); x += fcAdvance(p, fcInfo(g, p.w, p.h)); });
    return x;
  });
  const maxW = Math.max(1, ...widths);
  scale = Math.max(1, Math.min(scale, Math.floor(8000 / maxW), Math.floor(8000 / (lines.length * p.h))));
  const pad = 2;
  cv.width = (maxW + pad * 2) * scale;
  cv.height = (lines.length * p.h + pad * 2) * scale;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = fcColor('--soft');
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = fcColor('--text');
  lines.forEach((ln, li) => {
    let x = pad;
    Array.from(ln).forEach((ch) => {
      const g = fcGlyph(ch.codePointAt(0)), info = fcInfo(g, p.w, p.h), xo = fcXoff(p, info);
      if (!info.empty) {
        for (let y = 0; y < p.h; y++) {
          for (let gx = 0; gx < p.w; gx++) {
            if (g[y * p.w + gx]) ctx.fillRect((x + gx - xo) * scale, (pad + li * p.h + y) * scale, scale, scale);
          }
        }
      }
      x += fcAdvance(p, info);
    });
  });
}

function fcSyncSettings() {
  $('fcName').value = fc.name;
  $('fcW').value = fc.w; $('fcH').value = fc.h; $('fcBase').value = fc.base; $('fcBase').max = fc.h;
  $('fcSpacing').value = fc.spacing;
  $('fcProp').checked = fc.prop;
}

/* light = only what a drawing change touches; otherwise everything */
function fcRenderAll(light) {
  if (!fcReady) return;
  if (!$('panel-font').classList.contains('active')) return;
  fcRenderInfo();
  fcRenderEditor();
  if (light) {
    fc.cells.forEach((c, code) => { c.btn.classList.toggle('on', code === fc.sel); });
    fcRefreshCell(fc.sel);
  } else {
    fcRefreshAllCells();
  }
  fcRenderPreview();
}

function fcSelect(code) {
  fc.sel = code;
  fcRenderAll(true);
}

function fcStepSel(d) {
  const codes = fcCodes();
  const i = codes.indexOf(fc.sel);
  fc.sel = codes[(i + d + codes.length) % codes.length];
  fcRenderAll(true);
  const c = fc.cells.get(fc.sel);
  if (c && c.btn.scrollIntoView) c.btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/* ---- export ---- */
async function fcCanvasBytes(cv) {
  const r = await encodeCanvas(cv, { fmt: 'png' });
  if (!r) throw new Error('png');
  return new Uint8Array(await r.blob.arrayBuffer());
}

function fcReadmeText(base, opt, p) {
  const id = state.lang !== 'en';
  const L = [];
  L.push(p.name);
  L.push(id ? 'Dibuat dengan Spritesheet Studio v' + APP_VERSION + ' (Font Creator).' : 'Made with Spritesheet Studio v' + APP_VERSION + ' (Font Creator).');
  L.push('');
  if (opt.ttf) L.push(id
    ? '- ' + base + '.ttf : font TrueType. Buka lalu pilih Install. Pakai ukuran ' + p.h + ' px (atau kelipatannya: ' + p.h * 2 + ', ' + p.h * 3 + ', ...) supaya tepinya tajam.'
    : '- ' + base + '.ttf : TrueType font. Open it and choose Install. Use size ' + p.h + ' px (or a multiple: ' + p.h * 2 + ', ' + p.h * 3 + ', ...) for sharp edges.');
  if (opt.atlas) L.push(id
    ? '- ' + base + '.png + ' + base + '.fnt : bitmap font (format teks BMFont) untuk game engine. Huruf berwarna putih di latar transparan, beri warna lewat engine.'
    : '- ' + base + '.png + ' + base + '.fnt : bitmap font (BMFont text format) for game engines. Glyphs are white on transparent; tint them in your engine.');
  if (opt.json) L.push(id
    ? '- ' + base + '.json : ukuran dan posisi tiap huruf.'
    : '- ' + base + '.json : size and position of every glyph.');
  if (opt.glyphs) L.push(id
    ? '- glyphs/ : satu PNG per huruf (nama file = kode Unicode).'
    : '- glyphs/ : one PNG per character (file name = Unicode code).');
  return L.join('\n') + '\n';
}

async function fcExport(kind) {
  if (fc.busy) return;
  const p = fcParams();
  const base = sanitizeName(fc.name, 'font');
  const opt = { ttf: $('fcOptTtf').checked, atlas: $('fcOptAtlas').checked, json: $('fcOptJson').checked, glyphs: $('fcOptGlyphs').checked };
  if (kind === 'zip' && !opt.ttf && !opt.atlas && !opt.json && !opt.glyphs) { showToast('Pilih minimal satu isi ZIP'); return; }
  fc.busy = true;
  $('fcZipBtn').disabled = true; $('fcTtfBtn').disabled = true;
  try {
    const list = fcExportList(p, fcGlyph, fc.extra);
    if (kind === 'ttf') {
      const ttf = fcBuildTtf(p, list, APP_VERSION);
      downloadBlob(new Blob([ttf], { type: 'font/ttf' }), base + '.ttf');
      showToast('Font diunduh');
      return;
    }
    const files = [];
    if (opt.ttf) files.push({ name: base + '.ttf', data: fcBuildTtf(p, list, APP_VERSION) });
    const lay = fcLayout(p, list.length), rects = fcGlyphRects(p, list, lay), enc = new TextEncoder();
    if (opt.atlas) {
      const cv = document.createElement('canvas');
      cv.width = lay.W; cv.height = lay.H;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff';
      list.forEach((it, i) => {
        const r = rects[i];
        for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (it.bits[y * p.w + x]) ctx.fillRect(r.cellX + x, r.cellY + y, 1, 1);
      });
      files.push({ name: base + '.png', data: await fcCanvasBytes(cv) });
      files.push({ name: base + '.fnt', data: enc.encode(fcFntText(p, rects, lay, base + '.png')) });
    }
    if (opt.json) files.push({ name: base + '.json', data: enc.encode(fcJsonText(p, rects, lay, base + '.png', opt.atlas)) });
    if (opt.glyphs) {
      for (const it of list) {
        if (fcInfo(it.bits, p.w, p.h).empty) continue;
        const cv = document.createElement('canvas');
        cv.width = p.w; cv.height = p.h;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff';
        for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (it.bits[y * p.w + x]) ctx.fillRect(x, y, 1, 1);
        files.push({ name: 'glyphs/u' + it.code.toString(16).toUpperCase().padStart(4, '0') + '.png', data: await fcCanvasBytes(cv) });
      }
    }
    files.push({ name: 'README.txt', data: enc.encode(fcReadmeText(base, opt, p)) });
    downloadBlob(makeZip(files), base + '.zip');
    showToast('ZIP font diunduh');
  } catch (err) {
    showToast('Gagal membuat font');
  } finally {
    fc.busy = false;
    $('fcZipBtn').disabled = false; $('fcTtfBtn').disabled = false;
  }
}

/* ---- wiring ---- */
function initFontTab() {
  const cv = $('fcCanvas');
  cv.addEventListener('pointerdown', fcStrokeStart);
  cv.addEventListener('pointermove', fcStrokeMove);
  cv.addEventListener('pointerup', fcStrokeEnd);
  cv.addEventListener('pointercancel', fcStrokeEnd);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  document.querySelectorAll('[data-fctool]').forEach((b) => b.addEventListener('click', () => {
    fc.tool = b.dataset.fctool;
    document.querySelectorAll('[data-fctool]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  document.querySelectorAll('[data-fcnudge]').forEach((b) => b.addEventListener('click', () => {
    const d = b.dataset.fcnudge.split(',');
    fcNudge(parseInt(d[0], 10), parseInt(d[1], 10));
  }));
  $('fcUndo').addEventListener('click', fcUndo);
  $('fcRedo').addEventListener('click', fcRedo);
  $('fcClear').addEventListener('click', fcClear);
  $('fcReset').addEventListener('click', fcResetGlyph);
  $('fcResetAll').addEventListener('click', fcResetAll);
  $('fcPrev').addEventListener('click', () => fcStepSel(-1));
  $('fcNext').addEventListener('click', () => fcStepSel(1));
  $('fcGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.fc-cell');
    if (b) fcSelect(parseInt(b.dataset.code, 10));
  });
  $('fcAddBtn').addEventListener('click', fcAddChars);
  $('fcAddInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fcAddChars(); } });

  $('fcName').addEventListener('input', () => { fc.name = $('fcName').value.slice(0, 40) || 'PixelFont'; });
  const sizeChange = () => {
    const nw = fcClamp(parseInt($('fcW').value, 10) || fc.w, 1, 32);
    const nh = fcClamp(parseInt($('fcH').value, 10) || fc.h, 1, 32);
    const nb = fcClamp(parseInt($('fcBase').value, 10) || fc.base, 1, nh);
    fcApplySize(nw, nh, nb);
    fcSyncSettings();
    fcRenderAll(false);
  };
  ['fcW', 'fcH', 'fcBase'].forEach((id) => $(id).addEventListener('change', sizeChange));
  $('fcSpacing').addEventListener('change', () => {
    fc.spacing = fcClamp(parseInt($('fcSpacing').value, 10) || 0, 0, 8);
    $('fcSpacing').value = fc.spacing;
    fcRenderPreview();
  });
  $('fcProp').addEventListener('change', () => { fc.prop = $('fcProp').checked; fcRenderPreview(); });
  $('fcPreviewText').addEventListener('input', fcRenderPreview);
  $('fcPreviewScale').addEventListener('change', fcRenderPreview);
  $('fcZipBtn').addEventListener('click', () => fcExport('zip'));
  $('fcTtfBtn').addEventListener('click', () => fcExport('ttf'));

  document.addEventListener('keydown', (e) => {
    if (!$('panel-font').classList.contains('active')) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) fcRedo(); else fcUndo(); }
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); fcRedo(); }
  });
  window.addEventListener('resize', () => { if ($('panel-font').classList.contains('active')) fcRenderEditor(); });

  fcSyncSettings();
  fcBuildGrid();
  fcReady = true;
}

/* =========================================================================
   INIT
   ========================================================================= */
initTabs();
initMenu();
initDropzone();
initImportTab();
initBackgroundTab();
initSheetTab();
initEditorTab();
initFrameSizeTab();
initMergeTab();
initExportTab();
initPaintTab();
initPlayerTab();
initFontTab();
initPrefs();
initSettings();
initNotice();
