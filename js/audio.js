'use strict';

/* Spritesheet Studio v2.9.0 - audio: the Sound Studio tab
   A song editor (piano roll, many tracks, drums, echo / reverb, WAV and MIDI export) and a sound-effect
   generator (sfxr style, a bank of sounds, WAV / .sfxr / ZIP export). Saves in IndexedDB together with
   Save / Load (a new "Audio" folder). The sound itself is made by sound.js.
   Made by Farelfhmc - Studio Fhilion. MIT License.
   Part 8 of 8. Classic script (no modules): shares one scope with the other scripts and loads last. */

/* =========================================================================
   TEXTS (English; the Indonesian text lives in index.html and in the calls to tr())
   ========================================================================= */
Object.assign(EN, {
  'Baru di v2.9.0': "What's new in v2.9.0",
  'Tab baru Sound Studio: buat lagu dengan piano roll, banyak track, drum, dan efek, lalu buat efek suara (SFX) dengan generator bergaya sfxr. Unduh sebagai WAV atau MIDI, simpan di browser, atau buka berkas MIDI dan .sfxr.': 'New Sound Studio tab: write songs with a piano roll, many tracks, drums and effects, then make sound effects (SFX) with an sfxr-style generator. Download as WAV or MIDI, save in the browser, or open MIDI and .sfxr files.',
  'Buat lagu dan efek suara (SFX) untuk game-mu. Lagu: piano roll dengan banyak track, drum, dan efek. SFX: generator suara bergaya sfxr. Semua dibuat di dalam aplikasi, tidak ada yang diunggah.': 'Make songs and sound effects (SFX) for your game. Song: a piano roll with many tracks, drums and effects. SFX: an sfxr-style sound generator. Everything is made inside the app, nothing is uploaded.',
  'Nama proyek': 'Project name', 'Baru': 'New', 'Simpan': 'Save', 'Simpan salinan': 'Save a copy',
  'Buka dari berkas\u2026': 'Open from file\u2026', 'Lagu contoh': 'Demo song',
  'Bagian': 'Section', 'Lagu': 'Song',
  'Putar': 'Play', 'Berhenti': 'Stop', 'Jeda': 'Pause', 'Ulang': 'Loop', 'Metronom': 'Metronome',
  'Putar': 'Play',
  'Tempo (BPM)': 'Tempo (BPM)', 'Volume utama (': 'Master volume (', 'Ulang dari bar': 'Loop from bar', 'Ulang sampai bar': 'Loop to bar',
  'Ketuk penggaris di atas piano roll untuk mulai dari titik itu. Spasi = putar / jeda.': 'Tap the ruler above the piano roll to start from that point. Space = play / pause.',
  'Track': 'Track', '+ Track nada': '+ Note track', '+ Track drum': '+ Drum track',
  'Ketuk nama untuk memilih track. M = bisukan, S = solo. Maksimal 8 track.': 'Tap a name to select the track. M = mute, S = solo. Up to 8 tracks.',
  'Alat': 'Tool', 'Gambar': 'Draw', 'Hapus': 'Erase', 'Pilih': 'Select', 'Geser': 'Pan',
  'Urungkan': 'Undo', 'Ulangi': 'Redo',
  'Lebar': 'Width', 'Tinggi': 'Height', 'Perkecil lebar': 'Narrower', 'Perbesar lebar': 'Wider', 'Perkecil tinggi': 'Shorter', 'Perbesar tinggi': 'Taller',
  'Piano roll': 'Piano roll',
  'Panjang nada baru': 'New note length', 'Akor': 'Chord', 'Satu nada': 'Single note', 'Mayor': 'Major', 'Minor': 'Minor',
  'Diminished': 'Diminished', 'Septima (7)': 'Dominant 7th', 'Minor 7': 'Minor 7th', 'Oktaf': 'Octave',
  'Kekuatan nada baru (': 'New note velocity (', 'Kunci ke skala': 'Lock to scale',
  'Nada terpilih': 'Selected note', 'Nada': 'Note', 'Mulai (step)': 'Start (step)', 'Panjang (step)': 'Length (steps)', 'Kekuatan (': 'Velocity (',
  'Gandakan': 'Duplicate', 'Hapus nada': 'Delete note',
  'Pengaturan Track': 'Track Settings', 'Nama track': 'Track name', 'Suara (gelombang)': 'Sound (waveform)',
  'Kotak 50%': 'Square 50%', 'Pulsa 25%': 'Pulse 25%', 'Pulsa 12,5%': 'Pulse 12.5%', 'Segitiga': 'Triangle', 'Gergaji': 'Sawtooth', 'Sinus': 'Sine', 'Derau (noise)': 'Noise',
  'Volume (': 'Volume (', 'Kiri \u2013 kanan (': 'Left \u2013 right (',
  'Amplop volume (ADSR)': 'Volume envelope (ADSR)', 'Kedalaman (': 'Depth (', 'Kecepatan (': 'Speed (',
  'Geser semua nada track ini': 'Shift every note of this track',
  'Gandakan track': 'Duplicate track', 'Kosongkan nada': 'Clear notes', 'Hapus track': 'Delete track',
  'Pengaturan Lagu': 'Song Settings', 'Jumlah bar': 'Number of bars', 'Ketukan per bar': 'Beats per bar', 'Resolusi grid': 'Grid resolution',
  '1/8 (kasar)': '1/8 (coarse)', '1/16 (standar)': '1/16 (standard)', '1/32 (halus)': '1/32 (fine)',
  'Nada dasar': 'Root note', 'Skala': 'Scale',
  'Kromatik (semua nada)': 'Chromatic (all notes)', 'Pentatonik mayor': 'Major pentatonic', 'Pentatonik minor': 'Minor pentatonic', 'Minor harmonis': 'Harmonic minor',
  'Nada yang masuk skala diberi warna di piano roll. Nyalakan Kunci ke skala supaya nada yang kamu gambar selalu masuk skala. Mengubah resolusi grid atau jumlah bar bisa membulatkan atau memotong nada.': 'Notes in the scale are tinted in the piano roll. Turn on Lock to scale so the notes you draw always fit the scale. Changing the grid resolution or the number of bars can round or cut notes.',
  'Efek utama': 'Master effects', 'Gema (echo)': 'Echo', 'Jeda gema (': 'Echo delay (', 'Pengulangan (': 'Repeats (', 'Campuran gema (': 'Echo mix (',
  'Reverb (gaung ruangan)': 'Reverb (room sound)', 'Campuran reverb (': 'Reverb mix (',
  'Alat Bar': 'Bar Tools',
  'Salin sekelompok bar ke tempat lain (untuk mengulang pola), atau kosongkan beberapa bar. Bar tujuan ditimpa. Kalau hasil salinan melewati akhir lagu, jumlah bar ditambah otomatis.': 'Copy a group of bars somewhere else (to repeat a pattern), or clear some bars. The destination bars are overwritten. If the copy goes past the end of the song, the number of bars grows automatically.',
  'Dari bar': 'From bar', 'Sampai bar': 'To bar', 'Salin ke bar': 'Copy to bar',
  'Semua track (kalau mati: hanya track terpilih)': 'All tracks (when off: only the selected track)',
  'Salin ke bar tujuan': 'Copy to the target bar', 'Kosongkan bar': 'Clear bars',
  'Unduh Lagu': 'Download Song', 'Bit': 'Bit', 'Kanal': 'Channels', '8-bit (retro)': '8-bit (retro)',
  'Loop mulus (ekor gema dilipat ke awal)': 'Seamless loop (echo tail folded onto the start)', 'Normalisasi volume': 'Normalize volume',
  'Unduh WAV': 'Download WAV', 'Unduh MIDI': 'Download MIDI', 'Unduh Cadangan Proyek': 'Download Project Backup',
  'WAV memakai track yang tidak dibisukan (dan solo, kalau ada). MIDI memuat semua track dan tidak membawa swing. Cadangan proyek (.json) berisi lagu dan semua SFX, dan bisa dibuka lagi lewat Buka dari berkas.': 'WAV uses the tracks that are not muted (and solo, if any). MIDI holds every track and does not carry swing. The project backup (.json) holds the song and every SFX, and opens again through Open from file.',
  'Generator SFX': 'SFX Generator',
  'Pilih jenis suara untuk titik awal, lalu ubah sesukamu di bagian Parameter. Acak dan Mutasi membuat variasi; riwayatnya bisa diurungkan.': 'Pick a kind of sound as a starting point, then change it as you like under Parameters. Random and Mutate make variations; the history can be undone.',
  'Koin': 'Coin', 'Tembakan': 'Laser shot', 'Ledakan': 'Explosion', 'Power-up': 'Power-up', 'Kena pukul': 'Hit / hurt', 'Lompat': 'Jump', 'Pilih / klik': 'Select / click', 'Acak': 'Random', 'Mutasi': 'Mutate',
  'Bentuk gelombang': 'Waveform', 'Putar otomatis saat diubah': 'Play automatically when changed',
  'Parameter': 'Parameters', 'Gelombang': 'Waveform', 'Kotak': 'Square', 'Derau': 'Noise',
  'Normalisasi (suara dibuat sekeras mungkin tanpa pecah)': 'Normalize (as loud as possible without clipping)', 'Putar terbalik (reverse)': 'Play backwards (reverse)',
  'Bank SFX': 'SFX Bank',
  'Simpan beberapa suara di sini. Bank ikut tersimpan bersama proyek dan bisa diunduh sekaligus sebagai ZIP.': 'Keep several sounds here. The bank is saved with the project and can be downloaded all at once as a ZIP.',
  'Nama SFX': 'SFX name', 'Tambah ke bank': 'Add to bank',
  'Unduh SFX': 'Download SFX', 'Unduh .sfxr': 'Download .sfxr', 'Unduh semua bank (ZIP)': 'Download the whole bank (ZIP)',
  'Berkas .sfxr bisa dibuka di alat sfxr. Unduh semua memuat satu WAV per suara di bank, ditambah sfx-bank.json yang bisa dibuka lagi lewat Buka dari berkas.': 'A .sfxr file opens in the sfxr tool. Download all holds one WAV per sound in the bank, plus sfx-bank.json, which opens again through Open from file.',
  'Proyek Audio Tersimpan': 'Saved Audio Projects',
  'Proyek yang kamu simpan muncul di sini dan juga di folder Audio di tab Simpan & Buka.': 'Projects you save appear here and also in the Audio folder of the Save / Load tab.',
  'Simpan Proyek Audio': 'Save Audio Project',
  'Proyek audio': 'Audio project', 'Belum disimpan': 'Not saved yet', 'Draf disimpan otomatis di browser ini.': 'A draft is autosaved in this browser.',
  'Tersimpan pukul {t}': 'Saved at {t}', 'Tersimpan': 'Saved', 'Diganti': 'Overwritten', 'Draf dipulihkan otomatis': 'Draft restored automatically',
  'Penyimpanan browser tidak tersedia.': 'Browser storage is not available.', 'Belum ada proyek audio tersimpan.': 'No saved audio projects yet.',
  'Buka': 'Open', 'Ubah nama': 'Rename', 'Hapus berkas': 'Delete file',
  /* group names + parameter labels of the SFX generator */
  'Amplop': 'Envelope', 'Nada': 'Note', 'Arpeggio (ubah nada)': 'Pitch change (arpeggio)', 'Lebar pulsa': 'Pulse width', 'Ulang': 'Loop',
  'Filter': 'Filters', 'Phaser': 'Phaser', 'Vibrato': 'Vibrato',
  'Attack (waktu naik)': 'Attack time', 'Sustain (waktu tahan)': 'Sustain time', 'Dorongan (punch)': 'Sustain punch', 'Decay (waktu turun)': 'Decay time',
  'Frekuensi awal': 'Start frequency', 'Batas frekuensi terendah': 'Minimum frequency', 'Luncur nada': 'Slide', 'Percepatan luncur': 'Delta slide',
  'Kedalaman vibrato': 'Vibrato depth', 'Kecepatan vibrato': 'Vibrato speed',
  'Besar perubahan nada': 'Change amount', 'Kecepatan perubahan nada': 'Change speed',
  'Lebar pulsa (kotak)': 'Square duty', 'Sapuan lebar pulsa': 'Duty sweep', 'Kecepatan ulang': 'Repeat speed',
  'Low-pass: cutoff': 'Low-pass cutoff', 'Low-pass: sapuan': 'Low-pass sweep', 'Low-pass: resonansi': 'Low-pass resonance',
  'High-pass: cutoff': 'High-pass cutoff', 'High-pass: sapuan': 'High-pass sweep', 'Phaser: offset': 'Phaser offset', 'Phaser: sapuan': 'Phaser sweep',
  /* drums */
  'Kick': 'Kick', 'Snare': 'Snare', 'Hi-hat tutup': 'Closed hi-hat', 'Hi-hat buka': 'Open hi-hat', 'Clap': 'Clap', 'Tom rendah': 'Low tom', 'Tom tinggi': 'High tom', 'Crash': 'Crash',
  'Drum': 'Drum', 'Bisukan': 'Mute', 'Solo': 'Solo', 'Nada drum': 'Drum hit',
  /* hints + messages */
  'Gambar: ketuk sel kosong untuk membuat nada, seret ke kanan untuk memanjangkannya. Ketuk nada untuk memilih, seret untuk memindah, seret ujung kanan untuk mengubah panjang. Dua jari = geser layar.': 'Draw: tap an empty cell to make a note, drag right to make it longer. Tap a note to select it, drag to move it, drag its right end to change its length. Two fingers = scroll the view.',
  'Hapus: ketuk atau seret di atas nada untuk menghapusnya. Dua jari = geser layar.': 'Erase: tap or drag over notes to delete them. Two fingers = scroll the view.',
  'Pilih: ketuk nada untuk memilihnya, seret untuk memindah, seret ujung kanan untuk mengubah panjang. Dua jari = geser layar.': 'Select: tap a note to select it, drag to move it, drag its right end to change its length. Two fingers = scroll the view.',
  'Geser: seret dengan satu jari untuk menggeser piano roll. Roda mouse juga bisa.': 'Pan: drag with one finger to scroll the piano roll. The mouse wheel works too.',
  'Belum ada nada. Gambar nada di piano roll.': 'There are no notes yet. Draw some in the piano roll.',
  'Browser ini tidak mendukung audio.': 'This browser does not support audio.',
  'Proyek audio masih kosong': 'The audio project is still empty',
  'Ganti proyek audio yang sekarang?': 'Replace the current audio project?', 'Perubahan yang belum disimpan akan hilang.': 'Unsaved changes will be lost.', 'Ganti': 'Replace', 'Batal': 'Cancel',
  'Proyek audio baru dibuat': 'New audio project created', 'Proyek audio dibuka': 'Audio project opened',
  'Timpa berkas?': 'Overwrite file?', 'Sudah ada berkas dengan nama ini': 'A file with this name already exists', 'Timpa': 'Overwrite',
  'Maksimal 8 track': 'Up to 8 tracks', 'Minimal 1 track': 'At least 1 track', 'Hapus track ini?': 'Delete this track?', 'Hapus semua nada track ini?': 'Delete every note of this track?',
  'Track dihapus': 'Track deleted', 'Nada dikosongkan': 'Notes cleared', 'Track digandakan': 'Track duplicated',
  'Ubah pengaturan lagu?': 'Change the song settings?', '{n} nada akan dibulatkan atau dipotong.': 'Notes that will be rounded or cut: {n}.', 'Lanjutkan': 'Continue',
  'Lagu contoh dimuat': 'Demo song loaded', 'Ganti lagu yang sekarang?': 'Replace the current song?',
  'Bar tujuan melewati batas panjang lagu': 'The target bars go past the longest allowed song', 'Terlalu banyak nada': 'Too many notes', 'Bar disalin': 'Bars copied', 'Bar dikosongkan': 'Bars cleared',
  'Membuat audio\u2026': 'Rendering audio\u2026', 'Lagu masih kosong': 'The song is still empty',
  'Lagu terlalu panjang untuk diunduh (maksimal 10 menit)': 'The song is too long to download (10 minutes at most)',
  'Browser ini tidak bisa membuat audio': 'This browser cannot render audio', 'Gagal membuat audio': 'Could not render the audio',
  'Berkas terlalu besar': 'The file is too big', 'Berkas tidak dikenali': 'The file is not recognised',
  'Berkas MIDI tidak bisa dibaca': 'The MIDI file cannot be read', 'MIDI memakai pewaktu SMPTE, ini belum didukung': 'This MIDI uses SMPTE timing, which is not supported yet', 'Berkas MIDI tidak berisi nada': 'The MIDI file has no notes',
  'Berkas .sfxr tidak bisa dibaca': 'The .sfxr file cannot be read', 'Berkas proyek tidak bisa dibaca': 'The project file cannot be read',
  'MIDI dibuka': 'MIDI opened', 'SFX dibuka': 'SFX opened', 'Bank SFX dibuka': 'SFX bank opened',
  '{t} track, {n} nada': 'Tracks: {t}, notes: {n}', '{n} nada dilewati': 'Notes skipped: {n}', '{n} nada dipindah oktaf': 'Notes moved by octaves: {n}', '{n} track dilewati': 'Tracks skipped: {n}', 'lagu dipotong': 'song cut short', 'tempo berubah-ubah, hanya yang pertama dipakai': 'the tempo changes; only the first one is used',
  'Belum ada suara di bank': 'There are no sounds in the bank yet', 'Bank penuh': 'The bank is full', 'SFX ditambahkan ke bank': 'SFX added to the bank',
  'Putar': 'Play', 'Muat': 'Load', 'Ganti isi': 'Overwrite', 'Dimuat ke editor': 'Loaded into the editor', 'Isi diganti': 'Contents replaced', 'Nama SFX': 'SFX name', 'Ubah nama SFX': 'Rename SFX', 'Hapus SFX': 'Delete SFX', 'SFX dihapus': 'SFX deleted',
  'Bank masih kosong.': 'The bank is empty.', 'Suara terlalu pendek': 'The sound is too short', 'Belum ada bunyi': 'No sound yet',
  'Durasi {s} detik \u00b7 {n} sampel \u00b7 puncak {p}%': 'Length {s} s \u00b7 {n} samples \u00b7 peak {p}%',
  'Bank SFX: {n}': 'SFX bank: {n}', 'Nada ke-{n}': 'Note {n}',
  'Posisi mulai di bar {b}': 'Start position at bar {b}'
});

/* =========================================================================
   STATE
   ========================================================================= */
const snd = {
  song: sndNewSong(), cur: 0, tool: 'draw', view: 'song', zx: 22, zy: 18,
  sel: null, undo: [], redo: [], lastKey: '', lastT: 0,
  startStep: 0, loop: false, metro: false, loopFrom: 1, loopTo: 4, chord: 'none', lock: false, defLen: 4, defVel: 0.8,
  id: null, savedSig: '', savedAt: 0, saving: false, ready: false, restored: false, draftTimer: 0, statusTimer: 0,
  ptrs: new Map(), drag: null, pan2: null, blocked: false, raf: 0, colors: null, active: false, drawQueued: false, scopeBuf: null, scrolled: false
};
const sx = { p: sfxDefault(), bank: [], undo: [], redo: [], lastKey: '', lastT: 0, data: null, timer: 0 };
const ROLL = { keyW: 54, rulerH: 24 };

function curTrack() { return snd.song.tracks[snd.cur] || snd.song.tracks[0]; }
function nameVal() { return $('sndName').value.trim().slice(0, 60); }
function sndToast(k, ms) { showToast(tr(k), ms); }
function inScaleSet() {
  const s = snd.song;
  return SND_SCALES[s.scale] || SND_SCALES.chromatic;
}
function pitchInScale(p) { return inScaleSet().indexOf((((p - snd.song.root) % 12) + 12) % 12) >= 0; }
function lockPitch(p) {
  if (pitchInScale(p)) return p;
  for (let d = 1; d <= 6; d++) {
    if (p - d >= SND_LO && pitchInScale(p - d)) return p - d;
    if (p + d <= SND_HI && pitchInScale(p + d)) return p + d;
  }
  return p;
}
function drumName(i) { return tr(['Kick', 'Snare', 'Hi-hat tutup', 'Hi-hat buka', 'Clap', 'Tom rendah', 'Tom tinggi', 'Crash'][i] || 'Drum'); }

/* ---------------------------------------------------------------- history (undo / redo of the song) */
function syncUndoUI() {
  $('sndUndo').disabled = !snd.undo.length;
  $('sndRedo').disabled = !snd.redo.length;
}
/* key: edits with the same key close together (a slider drag) become one undo step */
function snapPush(key) {
  const now = Date.now();
  if (key && key === snd.lastKey && now - snd.lastT < 1200) { snd.lastT = now; return; }
  snd.undo.push(JSON.stringify(snd.song));
  if (snd.undo.length > 60) snd.undo.shift();
  snd.redo = [];
  snd.lastKey = key || ''; snd.lastT = now;
  syncUndoUI();
}
function restoreSnap(json) {
  snd.song = sndCleanSong(JSON.parse(json));
  snd.cur = Math.min(snd.cur, snd.song.tracks.length - 1);
  snd.sel = null;
  snd.loopTo = Math.min(Math.max(snd.loopTo, 1), snd.song.bars);
  snd.lastKey = '';
  songRefreshAll();
}
function doUndo() {
  if (!snd.undo.length) return;
  snd.redo.push(JSON.stringify(snd.song));
  restoreSnap(snd.undo.pop());
}
function doRedo() {
  if (!snd.redo.length) return;
  snd.undo.push(JSON.stringify(snd.song));
  restoreSnap(snd.redo.pop());
}
/* something in the song changed: tell the player, redraw, remember */
function songChanged() {
  sndTouch();
  sndLiveApply();
  rollQueue();
  syncUndoUI();
  projectTouched();
}
function edit(fn, key) { snapPush(key); fn(); songChanged(); }
/* everything on screen that shows the song is drawn again */
function songRefreshAll() {
  renderTracks(); syncTrackUI(); syncSongUI(); selBuildPitch(); selSync(); rollLayout(); songChanged();
}

/* =========================================================================
   PIANO ROLL
   A native scroller holds an empty "space" element of the full size; a canvas the size of the viewport is
   pinned on top (position: sticky) and draws only what is visible. Keys (left) and ruler (top) stay put.
   ========================================================================= */
function rollRows(tr) { return tr.kind === 'drum' ? SND_DRUMS.length : SND_HI - SND_LO + 1; }
function rowH(tr) { return tr.kind === 'drum' ? Math.max(30, snd.zy + 12) : snd.zy; }
function pitchToRow(tr, p) { return tr.kind === 'drum' ? p : SND_HI - p; }
function rowToPitch(tr, r) { return tr.kind === 'drum' ? r : SND_HI - r; }

function readColors() {
  const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
  snd.colors = {
    bg: v('--bg') || '#14171a', panel: v('--panel') || '#1a1e22', soft: v('--soft') || '#232830', line: v('--line') || '#2d333b',
    text: v('--text') || '#e4e7ea', dim: v('--dim') || '#8b939c', accent: v('--accent') || '#8fbf5a', onAccent: v('--on-accent') || '#0e1114',
    light: document.documentElement.getAttribute('data-theme') === 'light',
    font: getComputedStyle(document.body).fontFamily || 'sans-serif'
  };
}
function rollQueue() {
  if (snd.drawQueued) return;
  snd.drawQueued = true;
  requestAnimationFrame(() => { snd.drawQueued = false; rollDraw(); });
}
function rollSizeCanvas() {
  const wrap = $('sndRollWrap'), cv = $('sndRoll');
  const w = wrap.clientWidth, h = wrap.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (!w || !h) return false;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
  }
  return true;
}
/* sets the size of the scrollable area, then draws */
function rollLayout(resetScroll) {
  const tr = curTrack(), total = sndTotalSteps(snd.song), sp = $('sndRollSpace'), wrap = $('sndRollWrap');
  sp.style.width = (ROLL.keyW + total * snd.zx + 24) + 'px';
  sp.style.height = (ROLL.rulerH + rollRows(tr) * rowH(tr)) + 'px';
  if (resetScroll) wrap.scrollTop = tr.kind === 'drum' ? 0 : Math.max(0, (SND_HI - 79) * rowH(tr));
  rollSizeCanvas();
  rollQueue();
}

function rollDraw(posArg) {
  const wrap = $('sndRollWrap'), cv = $('sndRoll');
  if (!snd.colors) readColors();
  if (!rollSizeCanvas()) return;
  const C = snd.colors, g = cv.getContext('2d'), W = wrap.clientWidth, H = wrap.clientHeight, dpr = cv.width / W;
  const sl = wrap.scrollLeft, st = wrap.scrollTop, song = snd.song, tr = curTrack();
  const zx = snd.zx, rh = rowH(tr), rows = rollRows(tr), total = sndTotalSteps(song), spb = song.spb, per = song.bpb * spb;
  const kw = ROLL.keyW, rl = ROLL.rulerH, drum = tr.kind === 'drum';
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);

  /* grid */
  g.save();
  g.beginPath(); g.rect(kw, rl, W - kw, H - rl); g.clip();
  const r0 = Math.max(0, Math.floor(st / rh)), r1 = Math.min(rows - 1, Math.floor((st + H - rl) / rh));
  const endX = kw + total * zx - sl, scaleOn = !drum && song.scale !== 'chromatic';
  for (let r = r0; r <= r1; r++) {
    const y = rl + r * rh - st, p = rowToPitch(tr, r);
    g.fillStyle = C.panel; g.fillRect(kw, y, W - kw, rh);
    if (!drum && sndIsBlack(p)) { g.fillStyle = C.light ? 'rgba(0,0,0,.07)' : 'rgba(0,0,0,.22)'; g.fillRect(kw, y, W - kw, rh); }
    if (drum && r % 2) { g.fillStyle = C.light ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.04)'; g.fillRect(kw, y, W - kw, rh); }
    if (scaleOn && pitchInScale(p)) {
      g.globalAlpha = (((p - song.root) % 12) + 12) % 12 === 0 ? 0.24 : 0.11;
      g.fillStyle = C.accent; g.fillRect(kw, y, W - kw, rh); g.globalAlpha = 1;
    }
    g.fillStyle = !drum && p % 12 === 0 ? C.dim : C.line;
    g.globalAlpha = !drum && p % 12 === 0 ? 0.55 : 0.6;
    g.fillRect(kw, y + rh - 1, W - kw, 1); g.globalAlpha = 1;
  }
  if (endX < W) { g.fillStyle = C.bg; g.globalAlpha = 0.7; g.fillRect(Math.max(kw, endX), rl, W, H); g.globalAlpha = 1; }
  const s0 = Math.max(0, Math.floor(sl / zx)), s1 = Math.min(total, Math.ceil((sl + W - kw) / zx));
  for (let s = s0; s <= s1; s++) {
    const x = Math.round(kw + s * zx - sl);
    if (s % per === 0) { g.fillStyle = C.dim; g.globalAlpha = 0.9; g.fillRect(x, rl, 1, H - rl); }
    else if (s % spb === 0) { g.fillStyle = C.dim; g.globalAlpha = 0.4; g.fillRect(x, rl, 1, H - rl); }
    else if (zx >= 12) { g.fillStyle = C.line; g.globalAlpha = 0.7; g.fillRect(x, rl, 1, H - rl); }
    g.globalAlpha = 1;
  }

  /* notes of the other tracks as a faint background (only tracks of the same kind: same rows) */
  snd.song.tracks.forEach((o, ti) => {
    if (ti === snd.cur || o.kind !== tr.kind) return;
    g.fillStyle = SND_COLORS[ti % 8]; g.globalAlpha = 0.2;
    o.notes.forEach((n) => {
      if (n.s > s1 || n.s + n.l < s0) return;
      const row = pitchToRow(o, n.p);
      if (row < r0 || row > r1) return;
      g.fillRect(kw + n.s * zx - sl, rl + row * rh - st + 1, Math.max(2, n.l * zx - 1), rh - 2);
    });
    g.globalAlpha = 1;
  });

  /* notes of this track (the one being moved or resized is drawn at its new place) */
  const col = SND_COLORS[snd.cur % 8], dr = snd.drag;
  const drawNote = (s, l, p, v, selected, ghost) => {
    const row = pitchToRow(tr, p);
    if (row < r0 || row > r1 || s > s1 || s + l < s0) return;
    const x = kw + s * zx - sl, y = rl + row * rh - st + 1, w = Math.max(3, l * zx - 1), h = rh - 2;
    g.globalAlpha = ghost ? 0.5 : 0.4 + 0.6 * v;
    g.fillStyle = col; g.fillRect(x, y, w, h);
    g.globalAlpha = 1;
    if (selected || ghost) { g.strokeStyle = C.text; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2); }
    else { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, 2, h); }
  };
  tr.notes.forEach((n) => {
    if (dr && (dr.kind === 'move' || dr.kind === 'resize') && dr.n === n) return;
    drawNote(n.s, n.l, n.p, n.v, snd.sel && snd.sel.n === n, false);
  });
  if (dr && dr.kind === 'move') drawNote(dr.s, dr.n.l, dr.p, dr.n.v, true, false);
  if (dr && dr.kind === 'resize') drawNote(dr.n.s, dr.l, dr.n.p, dr.n.v, true, false);
  if (dr && dr.kind === 'new') {
    const ivs = drum ? [0] : SND_CHORDS[snd.chord] || [0];
    ivs.forEach((iv) => { if (dr.p + iv <= SND_HI) drawNote(dr.s, dr.len, dr.p + iv, snd.defVel, false, true); });
  }

  /* play position (a line) or the start marker (dashed) */
  const pos = posArg === undefined ? sndPosition() : posArg;
  if (pos !== null) {
    const x = Math.round(kw + pos * zx - sl);
    g.fillStyle = C.accent; g.fillRect(x - 1, rl, 2, H - rl);
  } else {
    const x = Math.round(kw + snd.startStep * zx - sl);
    g.fillStyle = C.accent; g.globalAlpha = 0.7;
    for (let y = rl; y < H; y += 8) g.fillRect(x, y, 1, 4);
    g.globalAlpha = 1;
  }
  g.restore();

  /* ruler */
  g.fillStyle = C.soft; g.fillRect(kw, 0, W - kw, rl);
  g.save(); g.beginPath(); g.rect(kw, 0, W - kw, rl); g.clip();
  if (snd.loop) {
    const lf = Math.min(snd.loopFrom, song.bars), lt = Math.min(Math.max(snd.loopTo, lf), song.bars);
    g.fillStyle = C.accent; g.globalAlpha = 0.28;
    g.fillRect(kw + (lf - 1) * per * zx - sl, 0, (lt - lf + 1) * per * zx, rl); g.globalAlpha = 1;
  }
  g.font = '11px ' + C.font;
  g.textBaseline = 'middle';
  for (let s = s0; s <= s1; s++) {
    const x = Math.round(kw + s * zx - sl);
    if (s % per === 0) {
      g.fillStyle = C.dim; g.fillRect(x, 3, 1, rl - 3);
      g.fillStyle = C.text; g.fillText(String(s / per + 1), x + 4, rl / 2);
    } else if (s % spb === 0) { g.fillStyle = C.dim; g.fillRect(x, rl - 8, 1, 8); }
  }
  const sx0 = Math.round(kw + snd.startStep * zx - sl);
  g.fillStyle = C.accent;
  g.beginPath(); g.moveTo(sx0 - 5, 0); g.lineTo(sx0 + 5, 0); g.lineTo(sx0, 8); g.closePath(); g.fill();
  g.restore();

  /* keys (or drum names) */
  g.save(); g.beginPath(); g.rect(0, rl, kw, H - rl); g.clip();
  g.fillStyle = C.soft; g.fillRect(0, rl, kw, H - rl);
  g.textBaseline = 'middle';
  for (let r = r0; r <= r1; r++) {
    const y = rl + r * rh - st, p = rowToPitch(tr, r);
    if (drum) {
      g.fillStyle = C.soft; g.fillRect(0, y, kw, rh - 1);
      g.fillStyle = C.text; g.font = '11px sans-serif';
      const label = drumName(p);
      g.fillText(label.length > 9 ? label.slice(0, 8) + '\u2026' : label, 4, y + rh / 2);
    } else {
      const black = sndIsBlack(p);
      g.fillStyle = black ? '#2b3036' : '#e9ecef'; g.fillRect(0, y, kw - (black ? 12 : 0), rh - 1);
      if (!black) { g.fillStyle = '#e9ecef'; g.fillRect(0, y, kw, rh - 1); }
      if (p % 12 === 0 || (rh >= 22 && !black)) { g.fillStyle = '#1d2227'; g.font = '10px sans-serif'; g.fillText(sndNoteName(p), kw - 26, y + rh / 2); }
    }
  }
  g.restore();
  g.fillStyle = C.soft; g.fillRect(0, 0, kw, rl);
  g.fillStyle = C.line; g.fillRect(kw - 1, 0, 1, H); g.fillRect(0, rl - 1, W, 1);
}

/* ---------------------------------------------------------------- piano roll: touch / mouse */
function rollPoint(e) {
  const r = $('sndRoll').getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
/* the grid cell under a point; clamp = stay inside the grid even when the point is outside it */
function cellAt(pt, clamp) {
  const wrap = $('sndRollWrap'), tr = curTrack(), rows = rollRows(tr), total = sndTotalSteps(snd.song);
  const gx = pt.x - ROLL.keyW + wrap.scrollLeft, gy = pt.y - ROLL.rulerH + wrap.scrollTop;
  let step = Math.floor(gx / snd.zx), row = Math.floor(gy / rowH(tr));
  if (!clamp && (gx < 0 || gy < 0 || row >= rows || step >= total)) return null;
  step = Math.max(0, Math.min(total - 1, step)); row = Math.max(0, Math.min(rows - 1, row));
  return { step: step, row: row, p: rowToPitch(tr, row), gx: gx };
}
function noteAt(tr, cell) {
  for (let i = tr.notes.length - 1; i >= 0; i--) {
    const n = tr.notes[i];
    if (n.p === cell.p && cell.step >= n.s && cell.step < n.s + n.l) return n;
  }
  return null;
}
function selectNote(n) { snd.sel = n ? { ti: snd.cur, n: n } : null; selSync(); }

function addNoteAt(ti, s, l, p, v) {
  const tr = snd.song.tracks[ti], total = sndTotalSteps(snd.song), drum = tr.kind === 'drum';
  const base = !drum && snd.lock ? lockPitch(p) : p;
  let first = null;
  (drum ? [0] : SND_CHORDS[snd.chord] || [0]).forEach((iv) => {
    const q = base + iv;
    if (!drum && (q > SND_HI || q < SND_LO)) return;
    tr.notes = tr.notes.filter((n) => !(n.s === s && n.p === q));
    const note = { s: s, l: Math.max(1, Math.min(l, total - s)), p: q, v: v };
    tr.notes.push(note);
    if (!first) first = note;
  });
  return first;
}
function keyPreview(pt) {
  const tr = curTrack(), wrap = $('sndRollWrap');
  const row = Math.floor((pt.y - ROLL.rulerH + wrap.scrollTop) / rowH(tr));
  if (row < 0 || row >= rollRows(tr)) return;
  sndPreviewNote(tr, rowToPitch(tr, row), 0.9);
}
function eraseAt(cell) {
  const tr = curTrack(), n = noteAt(tr, cell);
  if (!n) return;
  if (!snd.drag.pushed) { snapPush(); snd.drag.pushed = true; }
  tr.notes.splice(tr.notes.indexOf(n), 1);
  if (snd.sel && snd.sel.n === n) { snd.sel = null; selSync(); }
  songChanged();
}
function startPan2() {
  const wrap = $('sndRollWrap'), pts = Array.from(snd.ptrs.values());
  snd.pan2 = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2, sl: wrap.scrollLeft, st: wrap.scrollTop };
  if (snd.drag && snd.drag.kind !== 'erase') snd.drag = null;
  snd.blocked = true;
  rollQueue();
}

function rollDown(e) {
  const cv = $('sndRoll');
  try { cv.setPointerCapture(e.pointerId); } catch (x) { /* not capturable */ }
  sndGetCtx();                                     // the first touch also wakes the audio up (needed on phones)
  const pt = rollPoint(e);
  snd.ptrs.set(e.pointerId, pt);
  if (snd.ptrs.size >= 2) { startPan2(); return; }
  if (snd.blocked) return;
  const wrap = $('sndRollWrap'), tr = curTrack();
  if (pt.x >= ROLL.keyW && pt.y < ROLL.rulerH) {                              // ruler: set where playing starts
    const step = Math.max(0, Math.min(sndTotalSteps(snd.song) - 1, Math.floor((pt.x - ROLL.keyW + wrap.scrollLeft) / snd.zx)));
    const per = snd.song.bpb * snd.song.spb;
    snd.startStep = step;
    showToast(fmt('Posisi mulai di bar {b}', { b: Math.floor(step / per) + 1 }), 900);
    if (sndEng.playing) songPlay(); else { posText(null); rollQueue(); }
    return;
  }
  if (pt.x < ROLL.keyW) { if (pt.y >= ROLL.rulerH) keyPreview(pt); return; }  // keys: hear the note
  if (snd.tool === 'pan') { snd.drag = { kind: 'pan', x: pt.x, y: pt.y, sl: wrap.scrollLeft, st: wrap.scrollTop }; return; }
  const cell = cellAt(pt, false);
  if (!cell) return;
  if (snd.tool === 'erase') { snd.drag = { kind: 'erase', pushed: false }; eraseAt(cell); return; }
  const hit = noteAt(tr, cell);
  if (hit) {                                                                   // draw / select on a note: select it, move or resize it
    selectNote(hit);
    const w = hit.l * snd.zx, edge = (hit.s + hit.l) * snd.zx - cell.gx;
    if (w >= 24 && edge <= 12) snd.drag = { kind: 'resize', n: hit, l: hit.l, moved: false };
    else {
      snd.drag = { kind: 'move', n: hit, grab: cell.step - hit.s, s: hit.s, p: hit.p, moved: false };
      sndPreviewNote(tr, hit.p, hit.v);
    }
    rollQueue();
    return;
  }
  if (snd.tool === 'select') { selectNote(null); rollQueue(); return; }
  snd.drag = { kind: 'new', p: cell.p, s: cell.step, len: snd.defLen };
  sndPreviewNote(tr, cell.p, snd.defVel);
  rollQueue();
}

function rollMove(e) {
  if (!snd.ptrs.has(e.pointerId)) return;
  const pt = rollPoint(e), wrap = $('sndRollWrap');
  snd.ptrs.set(e.pointerId, pt);
  if (snd.pan2 && snd.ptrs.size >= 2) {
    const pts = Array.from(snd.ptrs.values()), cx = (pts[0].x + pts[1].x) / 2, cy = (pts[0].y + pts[1].y) / 2;
    wrap.scrollLeft = snd.pan2.sl - (cx - snd.pan2.x);
    wrap.scrollTop = snd.pan2.st - (cy - snd.pan2.y);
    return;
  }
  const d = snd.drag;
  if (!d) return;
  const tr = curTrack(), total = sndTotalSteps(snd.song);
  if (d.kind === 'pan') {
    wrap.scrollLeft = d.sl - (pt.x - d.x); wrap.scrollTop = d.st - (pt.y - d.y);
  } else if (d.kind === 'erase') {
    const cell = cellAt(pt, false);
    if (cell) eraseAt(cell);
  } else if (d.kind === 'new') {
    const cell = cellAt(pt, true);
    const len = cell.step > d.s ? cell.step - d.s + 1 : snd.defLen;
    const l = Math.max(1, Math.min(len, total - d.s));
    if (l !== d.len) { d.len = l; rollQueue(); }
  } else if (d.kind === 'move') {
    const cell = cellAt(pt, true);
    const s = Math.max(0, Math.min(total - d.n.l, cell.step - d.grab)), p = cell.p;
    if (s !== d.s || p !== d.p) {
      if (p !== d.p) sndPreviewNote(tr, p, d.n.v);
      d.s = s; d.p = p; d.moved = true; rollQueue();
    }
  } else if (d.kind === 'resize') {
    const cell = cellAt(pt, true);
    const l = Math.max(1, Math.min(total - d.n.s, cell.step - d.n.s + 1));
    if (l !== d.l) { d.l = l; d.moved = true; rollQueue(); }
  }
}

function rollUp(e) {
  const had = snd.ptrs.delete(e.pointerId);
  if (snd.ptrs.size < 2) snd.pan2 = null;
  const d = snd.drag;
  if (had && d && !snd.blocked) {
    const tr = curTrack();
    if (d.kind === 'new') {
      snapPush();
      const note = addNoteAt(snd.cur, d.s, d.len, d.p, snd.defVel);
      if (note) selectNote(note);
      songChanged();
    } else if (d.kind === 'move' && d.moved) {
      snapPush();
      d.n.s = d.s; d.n.p = d.p;
      tr.notes = tr.notes.filter((o) => o === d.n || !(o.s === d.s && o.p === d.p));
      selSync();
      songChanged();
    } else if (d.kind === 'resize' && d.moved) {
      snapPush();
      d.n.l = d.l;
      selSync();
      songChanged();
    }
  }
  snd.drag = null;
  if (!snd.ptrs.size) snd.blocked = false;
  rollQueue();
}

function setZoom(axis, dir) {
  if (axis === 'x') snd.zx = Math.max(8, Math.min(56, Math.round(snd.zx * (dir > 0 ? 1.25 : 0.8))));
  else snd.zy = Math.max(10, Math.min(30, Math.round(snd.zy * (dir > 0 ? 1.2 : 0.83))));
  rollLayout();
}
function setTool(t) {
  snd.tool = t;
  document.querySelectorAll('[data-sndtool]').forEach((b) => b.classList.toggle('on', b.dataset.sndtool === t));
  $('sndRoll').classList.toggle('pan', t === 'pan');
  $('sndRollHint').textContent = tr({
    draw: 'Gambar: ketuk sel kosong untuk membuat nada, seret ke kanan untuk memanjangkannya. Ketuk nada untuk memilih, seret untuk memindah, seret ujung kanan untuk mengubah panjang. Dua jari = geser layar.',
    erase: 'Hapus: ketuk atau seret di atas nada untuk menghapusnya. Dua jari = geser layar.',
    select: 'Pilih: ketuk nada untuk memilihnya, seret untuk memindah, seret ujung kanan untuk mengubah panjang. Dua jari = geser layar.',
    pan: 'Geser: seret dengan satu jari untuk menggeser piano roll. Roda mouse juga bisa.'
  }[t]);
}

/* =========================================================================
   TRACKS (the list, and the settings of the selected track)
   ========================================================================= */
function renderTracks() {
  const box = $('sndTracks');
  box.textContent = '';
  snd.song.tracks.forEach((t, i) => {
    const row = stEl('div', 'snd-track' + (i === snd.cur ? ' on' : ''));
    const sw = stEl('span', 'snd-sw');
    sw.style.background = SND_COLORS[i % 8];
    const nm = stEl('button', 'snd-trname snd-user', t.name);
    nm.type = 'button';
    nm.appendChild(stEl('span', 'fm-sub', tr(t.kind === 'drum' ? 'Drum' : 'Nada')));
    nm.addEventListener('click', () => selectTrack(i));
    const mk = (label, on, titleKey, fn) => {
      const b = stEl('button', 'btn btn-sm snd-ms' + (on ? ' on' : ''), label);
      b.type = 'button'; b.title = tr(titleKey); b.setAttribute('aria-label', tr(titleKey)); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.addEventListener('click', fn);
      return b;
    };
    row.appendChild(sw); row.appendChild(nm);
    row.appendChild(mk('M', t.mute, 'Bisukan', () => { edit(() => { t.mute = !t.mute; }); renderTracks(); }));
    row.appendChild(mk('S', t.solo, 'Solo', () => { edit(() => { t.solo = !t.solo; }); renderTracks(); }));
    box.appendChild(row);
  });
  $('sndAddSynth').disabled = $('sndAddDrum').disabled = snd.song.tracks.length >= SND_MAX_TRACKS;
}
function selectTrack(i) {
  if (i === snd.cur) return;
  const wasDrum = curTrack().kind === 'drum';
  snd.cur = i; snd.sel = null;
  renderTracks(); syncTrackUI(); selBuildPitch(); selSync();
  rollLayout(curTrack().kind === 'drum' !== wasDrum);
}
function addTrack(kind) {
  if (snd.song.tracks.length >= SND_MAX_TRACKS) { sndToast('Maksimal 8 track'); return; }
  snapPush();
  const t = sndNewTrack(kind, snd.song.tracks.length + 1);
  if (kind === 'synth') t.wave = ['square', 'pulse25', 'triangle', 'saw', 'pulse125', 'sine', 'organ', 'noise'][snd.song.tracks.length % 8];
  snd.song.tracks.push(t);
  const wasDrum = curTrack().kind === 'drum';
  snd.cur = snd.song.tracks.length - 1; snd.sel = null;
  renderTracks(); syncTrackUI(); selBuildPitch(); selSync();
  rollLayout(kind === 'drum' !== wasDrum);
  songChanged();
}
function setRangeLabel(id, text) { $(id).textContent = text; }
function syncTrackUI() {
  const t = curTrack(), drum = t.kind === 'drum';
  $('sndTrackTitle').textContent = t.name;
  $('sndTrName').value = t.name;
  $('sndWaveField').hidden = drum;
  $('sndSynthBox').hidden = drum;
  $('sndWave').value = t.wave;
  $('sndTrVol').value = Math.round(t.vol * 100); setRangeLabel('sndTrVolVal', Math.round(t.vol * 100));
  $('sndTrPan').value = Math.round(t.pan * 100); setRangeLabel('sndTrPanVal', Math.round(t.pan * 100));
  $('sndEnvA').value = Math.round(t.env.a * 1000); setRangeLabel('sndEnvAVal', Math.round(t.env.a * 1000));
  $('sndEnvD').value = Math.round(t.env.d * 1000); setRangeLabel('sndEnvDVal', Math.round(t.env.d * 1000));
  $('sndEnvS').value = Math.round(t.env.s * 100); setRangeLabel('sndEnvSVal', Math.round(t.env.s * 100));
  $('sndEnvR').value = Math.round(t.env.r * 1000); setRangeLabel('sndEnvRVal', Math.round(t.env.r * 1000));
  $('sndVibD').value = Math.round(t.vib.depth); setRangeLabel('sndVibDVal', Math.round(t.vib.depth));
  $('sndVibR').value = t.vib.rate; setRangeLabel('sndVibRVal', t.vib.rate);
  $('sndTrDel').disabled = snd.song.tracks.length <= 1;
  $('sndAddSynth').disabled = $('sndAddDrum').disabled = snd.song.tracks.length >= SND_MAX_TRACKS;
}
/* a slider that changes one number of the selected track */
function bindTrackRange(id, valId, key, set, show) {
  $(id).addEventListener('input', () => {
    const v = Number($(id).value), t = curTrack();
    setRangeLabel(valId, show ? show(v) : v);
    edit(() => set(t, v), key);
  });
}

/* ---------------------------------------------------------------- the selected note */
function selBuildPitch() {
  const t = curTrack(), s = $('sndSelPitch');
  s.textContent = '';
  $('sndSelPitchLbl').textContent = tr(t.kind === 'drum' ? 'Nada drum' : 'Nada');
  if (t.kind === 'drum') SND_DRUMS.forEach((d, i) => { const o = document.createElement('option'); o.value = i; o.textContent = drumName(i); s.appendChild(o); });
  else for (let p = SND_HI; p >= SND_LO; p--) { const o = document.createElement('option'); o.value = p; o.textContent = sndNoteName(p); s.appendChild(o); }
}
function selNote() {
  const sel = snd.sel;
  if (!sel || sel.ti !== snd.cur) return null;
  return curTrack().notes.indexOf(sel.n) >= 0 ? sel.n : null;
}
function selSync() {
  const n = selNote(), box = $('sndSel');
  box.hidden = !n;
  if (!n) { if (snd.sel) snd.sel = null; return; }
  const per = snd.song.bpb * snd.song.spb;
  $('sndSelTitle').textContent = tr('Nada terpilih') + ' \u00b7 ' + (curTrack().kind === 'drum' ? drumName(n.p) : sndNoteName(n.p)) + ' \u00b7 ' + (Math.floor(n.s / per) + 1) + '.' + (Math.floor((n.s % per) / snd.song.spb) + 1);
  $('sndSelPitch').value = n.p;
  $('sndSelStart').value = n.s + 1;
  $('sndSelLen').value = n.l;
  $('sndSelVel').value = Math.round(n.v * 100); setRangeLabel('sndSelVelVal', Math.round(n.v * 100));
}
function selEdit(fn, key) {
  const n = selNote();
  if (!n) return;
  edit(() => fn(n), key);
  selSync();
}
function selDuplicate() {
  const n = selNote(), tr0 = curTrack();
  if (!n) return;
  const total = sndTotalSteps(snd.song);
  let s = n.s + n.l;
  if (s >= total) s = Math.max(0, total - n.l);
  edit(() => {
    tr0.notes = tr0.notes.filter((o) => !(o.s === s && o.p === n.p));
    const c = { s: s, l: Math.min(n.l, total - s), p: n.p, v: n.v };
    tr0.notes.push(c);
    snd.sel = { ti: snd.cur, n: c };
  });
  selSync();
}
function selDelete() {
  const n = selNote();
  if (!n) return;
  edit(() => { const t = curTrack(); t.notes.splice(t.notes.indexOf(n), 1); snd.sel = null; });
  selSync();
}

/* ---------------------------------------------------------------- track actions */
async function trackDelete() {
  if (snd.song.tracks.length <= 1) { sndToast('Minimal 1 track'); return; }
  const t = curTrack();
  if (t.notes.length) {
    const r = await ssDialog({ title: 'Hapus track ini?', text: t.name, buttons: [{ label: 'Batal', value: 'no' }, { label: 'Hapus track', value: 'ok', primary: true, danger: true }] });
    if (!r || r.v !== 'ok') return;
  }
  snapPush();
  const wasDrum = t.kind === 'drum';
  snd.song.tracks.splice(snd.cur, 1);
  snd.cur = Math.min(snd.cur, snd.song.tracks.length - 1); snd.sel = null;
  renderTracks(); syncTrackUI(); selBuildPitch(); selSync();
  rollLayout(curTrack().kind === 'drum' !== wasDrum);
  songChanged();
  sndToast('Track dihapus');
}
function trackDuplicate() {
  if (snd.song.tracks.length >= SND_MAX_TRACKS) { sndToast('Maksimal 8 track'); return; }
  const t = curTrack();
  if (sndCountNotes(snd.song) + t.notes.length > SND_MAX_NOTES) { sndToast('Terlalu banyak nada'); return; }
  snapPush();
  const c = sndClone(t);
  c.id = sndUid(); c.name = (t.name + ' 2').slice(0, 24);
  snd.song.tracks.splice(snd.cur + 1, 0, c);
  snd.cur++; snd.sel = null;
  renderTracks(); syncTrackUI(); selSync(); rollLayout();
  songChanged();
  sndToast('Track digandakan');
}
async function trackClear() {
  const t = curTrack();
  if (!t.notes.length) return;
  const r = await ssDialog({ title: 'Hapus semua nada track ini?', text: t.name, buttons: [{ label: 'Batal', value: 'no' }, { label: 'Kosongkan nada', value: 'ok', primary: true, danger: true }] });
  if (!r || r.v !== 'ok') return;
  edit(() => { t.notes = []; snd.sel = null; });
  selSync();
  sndToast('Nada dikosongkan');
}
function trackTranspose(d) {
  const t = curTrack();
  if (t.kind === 'drum' || !t.notes.length) return;
  if (t.notes.some((n) => n.p + d < SND_LO || n.p + d > SND_HI)) { showToast(tr('Nada') + ' \u2014 ' + sndNoteName(d > 0 ? SND_HI : SND_LO), 1600); return; }
  edit(() => { t.notes.forEach((n) => { n.p += d; }); });
  selSync();
  sndPreviewNote(t, Math.max(SND_LO, Math.min(SND_HI, 60 + d)), 0.7);
}

/* =========================================================================
   SONG SETTINGS
   ========================================================================= */
function syncSongUI() {
  const s = snd.song, m = s.master;
  $('sndBpm').value = s.bpm;
  $('sndMaster').value = Math.round(m.vol * 100); setRangeLabel('sndMasterVal', Math.round(m.vol * 100));
  $('sndBars').value = s.bars; $('sndBars').max = sndMaxBars(s.bpb, s.spb);
  $('sndBpb').value = s.bpb; $('sndSpb').value = s.spb;
  $('sndSwing').value = Math.round(s.swing * 100); setRangeLabel('sndSwingVal', Math.round(s.swing * 100));
  $('sndRoot').value = s.root; $('sndScale').value = s.scale;
  $('sndEchoOn').checked = m.echo.on;
  $('sndEchoTime').value = Math.round(m.echo.time * 1000); setRangeLabel('sndEchoTimeVal', Math.round(m.echo.time * 1000));
  $('sndEchoFb').value = Math.round(m.echo.fb * 100); setRangeLabel('sndEchoFbVal', Math.round(m.echo.fb * 100));
  $('sndEchoMix').value = Math.round(m.echo.mix * 100); setRangeLabel('sndEchoMixVal', Math.round(m.echo.mix * 100));
  $('sndRevOn').checked = m.rev.on;
  $('sndRevMix').value = Math.round(m.rev.mix * 100); setRangeLabel('sndRevMixVal', Math.round(m.rev.mix * 100));
  snd.loopFrom = Math.max(1, Math.min(snd.loopFrom, s.bars));
  snd.loopTo = Math.max(snd.loopFrom, Math.min(snd.loopTo, s.bars));
  $('sndLoopFrom').max = $('sndLoopTo').max = s.bars; $('sndLoopFrom').value = snd.loopFrom; $('sndLoopTo').value = snd.loopTo;
  ['sndBarFrom', 'sndBarTo', 'sndBarAt'].forEach((id) => { $(id).max = SND_MAX_BARS; });
  $('sndLock').checked = snd.lock; $('sndChord').value = snd.chord; $('sndLen').value = String(snd.defLen);
  $('sndNewVel').value = Math.round(snd.defVel * 100); setRangeLabel('sndNewVelVal', Math.round(snd.defVel * 100));
  posText(sndPosition());
}

/* Changes bars / beats per bar / grid resolution together. Notes are rescaled; any that would be rounded or cut ask first. */
async function reshape(nb, ns, nbars) {
  const song = snd.song, old = { bpb: song.bpb, spb: song.spb, bars: song.bars };
  nb = Math.max(2, Math.min(8, Math.round(nb) || old.bpb));
  ns = [2, 4, 8].indexOf(ns) >= 0 ? ns : old.spb;
  nbars = Math.max(1, Math.min(sndMaxBars(nb, ns), Math.round(nbars) || old.bars));
  if (nb === old.bpb && ns === old.spb && nbars === old.bars) { syncSongUI(); return; }
  const f = ns / old.spb, newTotal = nb * ns * nbars;
  let touched = 0;
  song.tracks.forEach((t) => t.notes.forEach((n) => {
    const s2 = Math.round(n.s * f), l2 = Math.max(1, Math.round(n.l * f));
    if (s2 >= newTotal || s2 + l2 > newTotal || (f < 1 && (n.s * f !== s2 || n.l * f !== l2))) touched++;
  }));
  if (touched) {
    const r = await ssDialog({
      title: 'Ubah pengaturan lagu?', text: [fmt('{n} nada akan dibulatkan atau dipotong.', { n: touched })],
      buttons: [{ label: 'Batal', value: 'no' }, { label: 'Lanjutkan', value: 'ok', primary: true, danger: true }]
    });
    if (!r || r.v !== 'ok') { syncSongUI(); return; }
  }
  snapPush();
  song.tracks.forEach((t) => {
    const keep = new Map();
    t.notes.forEach((n) => {
      const s = Math.round(n.s * f);
      if (s >= newTotal) return;
      const l = Math.max(1, Math.min(Math.round(n.l * f), newTotal - s)), k = s + ':' + n.p, o = keep.get(k);
      if (!o || o.l < l) keep.set(k, { s: s, l: l, p: n.p, v: n.v });
    });
    t.notes = Array.from(keep.values());
  });
  const wasFull = snd.loopTo >= old.bars;
  song.bpb = nb; song.spb = ns; song.bars = nbars;
  if (wasFull || snd.loopTo > nbars) snd.loopTo = nbars;
  snd.startStep = Math.min(Math.round(snd.startStep * f), newTotal - 1);
  snd.sel = null;
  if (sndEng.playing) sndStop(), playUI(false);
  songRefreshAll();
}

/* ---------------------------------------------------------------- bar tools */
function barRange() {
  const song = snd.song;
  const from = Math.max(1, Math.min(song.bars, Math.round(Number($('sndBarFrom').value)) || 1));
  const to = Math.max(from, Math.min(song.bars, Math.round(Number($('sndBarTo').value)) || from));
  const at = Math.max(1, Math.min(SND_MAX_BARS, Math.round(Number($('sndBarAt').value)) || 1));
  $('sndBarFrom').value = from; $('sndBarTo').value = to; $('sndBarAt').value = at;
  return { from: from, to: to, at: at, n: to - from + 1, per: song.bpb * song.spb };
}
function barTracks() { return $('sndBarAll').checked ? snd.song.tracks : [curTrack()]; }
function barCopy() {
  const song = snd.song, r = barRange(), s0 = (r.from - 1) * r.per, s1 = r.to * r.per, dst = (r.at - 1) * r.per;
  const need = r.at - 1 + r.n;
  if (need > sndMaxBars(song.bpb, song.spb)) { sndToast('Bar tujuan melewati batas panjang lagu'); return; }
  const plan = barTracks().map((t) => {
    const src = t.notes.filter((n) => n.s >= s0 && n.s < s1).map((n) => ({ s: n.s - s0 + dst, l: Math.min(n.l, s1 - n.s), p: n.p, v: n.v }));
    const rest = t.notes.filter((n) => !(n.s >= dst && n.s < dst + r.n * r.per));
    return { t: t, notes: rest.concat(src) };
  });
  let total = sndCountNotes(song);
  plan.forEach((p) => { total += p.notes.length - p.t.notes.length; });
  if (total > SND_MAX_NOTES) { sndToast('Terlalu banyak nada'); return; }
  snapPush();
  if (need > song.bars) song.bars = need;
  plan.forEach((p) => { p.t.notes = p.notes; });
  snd.sel = null;
  songRefreshAll();
  sndToast('Bar disalin');
}
function barClear() {
  const r = barRange(), s0 = (r.from - 1) * r.per, s1 = r.to * r.per;
  snapPush();
  barTracks().forEach((t) => { t.notes = t.notes.filter((n) => !(n.s >= s0 && n.s < s1)); });
  snd.sel = null;
  songRefreshAll();
  sndToast('Bar dikosongkan');
}

/* =========================================================================
   TRANSPORT (play, stop, loop, metronome, playhead, scope)
   ========================================================================= */
function posText(pos) {
  const s = snd.song, per = s.bpb * s.spb, p = pos === null || pos === undefined ? snd.startStep : pos;
  const step = Math.max(0, Math.floor(p)), sec = p * sndStepSec(s);
  const m = Math.floor(sec / 60), ss = Math.floor(sec % 60);
  $('sndPos').textContent = (Math.floor(step / per) + 1) + ' : ' + (Math.floor((step % per) / s.spb) + 1) + ' \u00b7 ' + m + ':' + (ss < 10 ? '0' : '') + ss;
}
function playUI(on) {
  const b = $('sndPlay');
  b.querySelector('.ic-play').toggleAttribute('hidden', on);          // SVG elements have no .hidden property: use the attribute
  b.querySelector('.ic-pause').toggleAttribute('hidden', !on);
  b.setAttribute('aria-label', tr(on ? 'Jeda' : 'Putar'));
  if (!on) { posText(null); scopeDraw(); rollQueue(); }
}
function transportSettings() {
  const e = sndEng, s = snd.song, per = s.bpb * s.spb;
  const lf = Math.max(1, Math.min(s.bars, snd.loopFrom)), lt = Math.max(lf, Math.min(s.bars, snd.loopTo));
  e.loop = snd.loop; e.loopA = (lf - 1) * per; e.loopB = lt * per; e.metro = snd.metro;
}
function songPlay() {
  const s = snd.song;
  if (!sndCountNotes(s) && !snd.metro) { sndToast('Belum ada nada. Gambar nada di piano roll.'); return; }
  sndStopSamples();
  const ok = sndPlay({
    getSong: () => snd.song, from: snd.startStep, loop: snd.loop, loopA: 0, loopB: 0, metro: snd.metro,
    onEnd: () => { playUI(false); }
  });
  if (!ok) { sndToast('Browser ini tidak mendukung audio.'); return; }
  transportSettings();
  playUI(true);
  frameStart();
}
function songPause() {
  const p = sndPosition();
  if (p !== null) snd.startStep = Math.max(0, Math.min(sndTotalSteps(snd.song) - 1, Math.floor(p)));
  sndStop();
  playUI(false);
}
function songStop() {
  sndStop();
  snd.startStep = 0;
  $('sndRollWrap').scrollLeft = 0;
  playUI(false);
}
function frameStart() { if (!snd.raf && snd.active) snd.raf = requestAnimationFrame(frame); }
function frame() {
  snd.raf = 0;
  if (!snd.active) return;
  const pos = sndPosition();
  if (pos !== null) {
    const wrap = $('sndRollWrap'), x = ROLL.keyW + pos * snd.zx - wrap.scrollLeft;
    if (x > wrap.clientWidth - 30 || x < ROLL.keyW) wrap.scrollLeft = Math.max(0, pos * snd.zx - 20);
  }
  rollDraw(pos);
  posText(pos);
  scopeDraw();
  if (sndEng.playing) snd.raf = requestAnimationFrame(frame);
  else playUI(false);
}
function scopeDraw() {
  const cv = $('sndScope');
  if (!cv.clientWidth) return;
  if (!snd.colors) readColors();
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = snd.colors.panel; g.fillRect(0, 0, w, h);
  g.strokeStyle = snd.colors.accent; g.lineWidth = 1.5; g.beginPath();
  if (!snd.scopeBuf) snd.scopeBuf = new Uint8Array(1024);
  if (sndScopeData(snd.scopeBuf)) {
    const b = snd.scopeBuf;
    for (let i = 0; i < b.length; i += 2) { const x = i / (b.length - 1) * w, y = h / 2 + ((b[i] - 128) / 128) * (h / 2 - 2); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  } else { g.moveTo(0, h / 2); g.lineTo(w, h / 2); }
  g.stroke();
}

/* =========================================================================
   DOWNLOADS (song)
   ========================================================================= */
function fileBase(fallback) { return sanitizeName(nameVal(), fallback); }
async function exportWav() {
  const song = snd.song;
  if (!sndCountNotes(song)) { sndToast('Lagu masih kosong'); return; }
  sndStop(); playUI(false);
  const busy = busyStart('Membuat audio\u2026');
  try {
    const sr = Number($('sndExRate').value) || 44100, bits = Number($('sndExBits').value) === 8 ? 8 : 16;
    const r = await sndRenderSong(song, { sr: sr });
    let ch = r.chans;
    if ($('sndExLoop').checked) ch = sndFoldLoop(ch, r.loopLen);
    if ($('sndExCh').value === 'mono') ch = sndMono(ch);
    if ($('sndExNorm').checked) {
      const pk = sndPeak(ch);
      if (pk > 1e-6) { const k = 0.97 / pk; ch.forEach((c) => { for (let i = 0; i < c.length; i++) c[i] *= k; }); }
    }
    downloadBlob(new Blob([sndWav(ch, sr, bits)], { type: 'audio/wav' }), fileBase('song') + '.wav');
  } catch (e) {
    console.error(e);
    sndToast(e && e.message === 'song-too-long' ? 'Lagu terlalu panjang untuk diunduh (maksimal 10 menit)' : e && e.message === 'no-offline-audio' ? 'Browser ini tidak bisa membuat audio' : 'Gagal membuat audio', 3500);
  } finally { busy.end(); }
}
function exportMidi() {
  if (!sndCountNotes(snd.song)) { sndToast('Lagu masih kosong'); return; }
  downloadBlob(new Blob([sndMidi(snd.song, nameVal())], { type: 'audio/midi' }), fileBase('song') + '.mid');
}
function exportJson() {
  const text = JSON.stringify({ app: 'spritesheet-studio', kind: 'audio', v: 1, name: nameVal(), song: snd.song, sfx: { cur: sx.p, bank: sx.bank } });
  downloadBlob(new Blob([text], { type: 'application/json' }), fileBase('audio-project') + '.sndproj.json');
}

/* =========================================================================
   SFX EDITOR
   ========================================================================= */
const SFX_LABELS = {
  attack: 'Attack (waktu naik)', sustain: 'Sustain (waktu tahan)', punch: 'Dorongan (punch)', decay: 'Decay (waktu turun)',
  freq: 'Frekuensi awal', limit: 'Batas frekuensi terendah', slide: 'Luncur nada', dslide: 'Percepatan luncur',
  vibDepth: 'Kedalaman vibrato', vibSpeed: 'Kecepatan vibrato', arpMod: 'Besar perubahan nada', arpSpeed: 'Kecepatan perubahan nada',
  duty: 'Lebar pulsa (kotak)', dutyRamp: 'Sapuan lebar pulsa', repeat: 'Kecepatan ulang',
  lpf: 'Low-pass: cutoff', lpfRamp: 'Low-pass: sapuan', lpfRes: 'Low-pass: resonansi', hpf: 'High-pass: cutoff', hpfRamp: 'High-pass: sapuan',
  phaOff: 'Phaser: offset', phaRamp: 'Phaser: sapuan'
};
const SFX_GROUP_LABELS = {
  env: 'Amplop (bentuk volume)', pitch: 'Frekuensi (tinggi nada)', vib: 'Vibrato', arp: 'Arpeggio (ubah nada)',
  duty: 'Lebar pulsa', repeat: 'Ulang suara', filter: 'Filter', phaser: 'Phaser'
};
Object.assign(EN, {
  'Amplop (bentuk volume)': 'Envelope', 'Frekuensi (tinggi nada)': 'Frequency (pitch)', 'Ulang suara': 'Repeat'
});

function sfxPush(key) {
  const now = Date.now();
  if (key && key === sx.lastKey && now - sx.lastT < 1200) { sx.lastT = now; return; }
  sx.undo.push(JSON.stringify(sx.p));
  if (sx.undo.length > 40) sx.undo.shift();
  sx.redo = [];
  sx.lastKey = key || ''; sx.lastT = now;
  sfxUndoUI();
}
function sfxUndoUI() { $('sfxUndo').disabled = !sx.undo.length; $('sfxRedo').disabled = !sx.redo.length; }
function sfxStep(from, to) {
  if (!from.length) return;
  to.push(JSON.stringify(sx.p));
  sx.p = sfxClean(JSON.parse(from.pop()));
  sx.lastKey = '';
  sfxSyncUI(); sfxRefresh(true); sfxUndoUI(); projectTouched();
}
function sfxBuildParams() {
  const box = $('sfxParams'), opened = {};
  box.querySelectorAll('details').forEach((d) => { opened[d.dataset.group] = d.open; });
  box.textContent = '';
  SFX_GROUPS.forEach((gid, gi) => {
    const det = document.createElement('details');
    det.className = 'sfx-group'; det.dataset.group = gid;
    det.open = opened[gid] !== undefined ? opened[gid] : gi < 2;
    det.appendChild(stEl('summary', '', tr(SFX_GROUP_LABELS[gid])));
    SFX_DEFS.filter((d) => d[1] === gid).forEach((d) => {
      const lab = stEl('label', 'field sfx-row'), cap = document.createElement('span');
      const val = stEl('span', 'sfx-val', '0');
      val.dataset.val = d[0];
      cap.appendChild(document.createTextNode(tr(SFX_LABELS[d[0]]) + ' ('));
      cap.appendChild(val);
      cap.appendChild(document.createTextNode(')'));
      const inp = document.createElement('input');
      inp.type = 'range'; inp.min = d[2]; inp.max = d[3]; inp.step = 0.01; inp.dataset.param = d[0];
      inp.addEventListener('input', () => {
        const v = Math.round(Number(inp.value) * 1000) / 1000;
        sfxPush('p:' + d[0]);
        sx.p[d[0]] = v;
        val.textContent = v.toFixed(2);
        sfxQueue(true);
      });
      lab.appendChild(cap); lab.appendChild(inp);
      det.appendChild(lab);
    });
    box.appendChild(det);
  });
}
function sfxSyncUI() {
  const p = sx.p;
  document.querySelectorAll('#sfxParams input[data-param]').forEach((i) => {
    const v = p[i.dataset.param];
    i.value = v;
    const lab = i.parentNode.querySelector('.sfx-val');
    if (lab) lab.textContent = Number(v).toFixed(2);
  });
  document.querySelectorAll('[data-sfxwave]').forEach((b) => b.classList.toggle('on', Number(b.dataset.sfxwave) === p.wave));
  $('sfxVol').value = Math.round(p.vol * 100); setRangeLabel('sfxVolVal', Math.round(p.vol * 100));
  $('sfxNorm').checked = p.norm; $('sfxRev').checked = p.rev;
  sfxUndoUI();
}
function sfxQueue(play) {
  clearTimeout(sx.timer);
  sx.timer = setTimeout(() => sfxRefresh(play && $('sfxAuto').checked), 80);
  projectTouched();
}
function sfxRefresh(play) {
  sx.data = sfxRender(sx.p);
  sfxWaveDraw();
  const d = sx.data, peak = sfxPeak(d);
  $('sfxInfo').textContent = d.length < 400
    ? tr('Suara terlalu pendek')
    : fmt('Durasi {s} detik \u00b7 {n} sampel \u00b7 puncak {p}%', { s: (d.length / SFX_RATE).toFixed(2), n: d.length, p: Math.round(peak * 100) });
  if (play && d.length >= 400) sndPlaySamples(d, SFX_RATE);
}
function sfxWaveDraw() {
  const cv = $('sfxWave'), d = sx.data;
  if (!cv.clientWidth || !d) return;
  if (!snd.colors) readColors();
  const C = snd.colors, dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = C.panel; g.fillRect(0, 0, w, h);
  g.fillStyle = C.line; g.fillRect(0, h / 2, w, 1);
  g.fillStyle = C.accent;
  const per = d.length / w;
  for (let x = 0; x < w; x++) {
    const a = Math.floor(x * per), b = Math.max(a + 1, Math.min(d.length, Math.floor((x + 1) * per)));
    let lo = 0, hi = 0;
    for (let i = a; i < b; i++) { const v = d[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    const y0 = h / 2 - hi * (h / 2 - 3), y1 = h / 2 - lo * (h / 2 - 3);
    g.fillRect(x, y0, 1, Math.max(1, y1 - y0));
  }
}
function sfxGenerate(kind) {
  sfxPush();
  const keep = { vol: sx.p.vol, norm: sx.p.norm, rev: sx.p.rev };
  sx.p = sfxRandomAudible(kind);
  sx.p.vol = keep.vol; sx.p.norm = keep.norm; sx.p.rev = keep.rev;
  sfxSyncUI(); sfxRefresh(true); projectTouched();
}
function sfxMutateNow() {
  sfxPush();
  sx.p = sfxMutate(sx.p);
  sfxSyncUI(); sfxRefresh(true); projectTouched();
}
function sfxPlayNow() {
  if (!sx.data) sfxRefresh(false);
  if (!sndPlaySamples(sx.data, SFX_RATE)) sndToast(sx.data && sx.data.length >= 400 ? 'Browser ini tidak mendukung audio.' : 'Suara terlalu pendek');
}

/* ---------------------------------------------------------------- the bank */
function sfxWavBytes(p, sr, bits) {
  let d = sfxRender(p);
  if (sr !== SFX_RATE) d = sndResample(d, SFX_RATE, sr);
  return sndWav([d], sr, bits === 8 ? 8 : 16);
}
function sfxExportOpts() { return { sr: Number($('sfxExRate').value) || SFX_RATE, bits: Number($('sfxExBits').value) === 8 ? 8 : 16 }; }
function renderBank() {
  const box = $('sfxBank');
  box.textContent = '';
  if (!sx.bank.length) { box.appendChild(stEl('p', 'hint', tr('Bank masih kosong.'))); }
  const small = (label, fn, cls) => {
    const b = stEl('button', 'btn btn-secondary btn-sm' + (cls ? ' ' + cls : ''), tr(label));
    b.type = 'button'; b.addEventListener('click', fn);
    return b;
  };
  sx.bank.forEach((it) => {
    const row = stEl('div', 'fm-row fm-file');
    const info = stEl('span', 'fm-info');
    info.appendChild(stEl('b', 'fm-name snd-user', it.name));
    const acts = stEl('span', 'fm-acts');
    acts.appendChild(small('Putar', () => { const d = sfxRender(it.p); if (d.length >= 400) sndPlaySamples(d, SFX_RATE); else sndToast('Suara terlalu pendek'); }, 'btn-primary'));
    acts.appendChild(small('Muat', () => {
      sfxPush(); sx.p = sfxClean(sndClone(it.p)); $('sfxName').value = it.name;
      sfxSyncUI(); sfxRefresh(false); projectTouched(); sndToast('Dimuat ke editor');
    }));
    acts.appendChild(small('Ganti isi', () => { it.p = sndClone(sx.p); projectTouched(); sndToast('Isi diganti'); }));
    acts.appendChild(small('Ubah nama', async () => {
      const r = await ssDialog({
        title: 'Ubah nama SFX', fields: [{ kind: 'text', label: 'Nama SFX', value: it.name, max: 40 }],
        buttons: [{ label: 'Batal', value: 'no' }, { label: 'Simpan', value: 'ok', primary: true }]
      });
      const name = r && r.v === 'ok' ? sndText(r.f[0], 40) : '';
      if (name) { it.name = name; renderBank(); projectTouched(); }
    }));
    acts.appendChild(small('Unduh WAV', () => { const o = sfxExportOpts(); downloadBlob(new Blob([sfxWavBytes(it.p, o.sr, o.bits)], { type: 'audio/wav' }), sanitizeName(it.name, 'sfx') + '.wav'); }));
    acts.appendChild(small('Hapus SFX', async () => {
      const r = await ssDialog({ title: 'Hapus SFX', text: it.name, buttons: [{ label: 'Batal', value: 'no' }, { label: 'Hapus SFX', value: 'ok', primary: true, danger: true }] });
      if (!r || r.v !== 'ok') return;
      sx.bank.splice(sx.bank.indexOf(it), 1); renderBank(); projectTouched(); sndToast('SFX dihapus');
    }, 'btn-danger'));
    row.appendChild(info); row.appendChild(acts);
    box.appendChild(row);
  });
  $('sfxDlZip').disabled = !sx.bank.length;
}
function sfxBankAdd() {
  if (sx.bank.length >= SND_MAX_SFX) { sndToast('Bank penuh'); return; }
  const name = sndText($('sfxName').value, 40) || 'SFX ' + (sx.bank.length + 1);
  sx.bank.push({ id: sndUid(), name: name, p: sndClone(sx.p) });
  $('sfxName').value = '';
  renderBank(); projectTouched();
  sndToast('SFX ditambahkan ke bank');
}
function sfxDlWav() {
  const o = sfxExportOpts();
  downloadBlob(new Blob([sfxWavBytes(sx.p, o.sr, o.bits)], { type: 'audio/wav' }), sanitizeName($('sfxName').value, 'sfx') + '.wav');
}
function sfxDlSfxr() {
  downloadBlob(new Blob([sfxToFile(sx.p)], { type: 'application/octet-stream' }), sanitizeName($('sfxName').value, 'sfx') + '.sfxr');
}
function sfxDlZip() {
  if (!sx.bank.length) { sndToast('Belum ada suara di bank'); return; }
  const o = sfxExportOpts(), used = new Set(), enc = new TextEncoder();
  const files = sx.bank.map((it) => ({ name: uniqueFileName(used, sanitizeName(it.name, 'sfx'), 'wav'), data: sfxWavBytes(it.p, o.sr, o.bits) }));
  files.push({ name: 'sfx-bank.json', data: enc.encode(JSON.stringify({ app: 'spritesheet-studio', kind: 'sfx-bank', v: 1, bank: sx.bank })) });
  downloadBlob(makeZip(files), fileBase('sfx') + '_sfx.zip');
}

/* =========================================================================
   VIEWS, SHOW / HIDE
   ========================================================================= */
function setView(v) {
  snd.view = v;
  $('sndSongView').hidden = v !== 'song';
  $('sndSfxView').hidden = v !== 'sfx';
  document.querySelectorAll('[data-sndview]').forEach((b) => b.classList.toggle('on', b.dataset.sndview === v));
  if (v === 'sfx') { sndStop(); playUI(false); sfxRefresh(false); }
  else { sndStopSamples(); rollLayout(); }
}
function audioOnShow() {
  snd.active = true;
  readColors();
  if (snd.view === 'song') { rollLayout(!snd.scrolled); snd.scrolled = true; } else sfxRefresh(false);
  syncSongUI();
  audioStatus();
  audioRenderList();
  scopeDraw();
  if (snd.restored) { snd.restored = false; showToast(tr('Draf dipulihkan otomatis'), 2800); }
  if (sndEng.playing) frameStart();
}
function audioOnHide() {
  snd.active = false;
  sndStop(); sndStopSamples(); playUI(false);
  if (snd.raf) { cancelAnimationFrame(snd.raf); snd.raf = 0; }
  if (snd.ready) audioDraftSave();
}

/* =========================================================================
   PROJECT: save, draft, open
   ========================================================================= */
function audioEmpty() { return !sndCountNotes(snd.song) && !sx.bank.length; }
function audioSig() { return String(hashStr(hashStr(2166136261, nameVal()), JSON.stringify([snd.song, sx.bank, sx.p]))); }
function audioIsDirty() { return audioSig() !== snd.savedSig; }
function audioPayload() {
  return sndClone({ v: 1, kind: 'audio', name: nameVal(), song: snd.song, sfx: { cur: sx.p, bank: sx.bank } });
}
function audioPayloadSize(p) { return JSON.stringify(p).length + 256; }
function audioInfo(p) {
  const song = p.song || {};
  return { tracks: (song.tracks || []).length, notes: (song.tracks || []).reduce((a, t) => a + ((t.notes && t.notes.length) || 0), 0), sfx: ((p.sfx && p.sfx.bank) || []).length };
}
function audioThumb() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'), song = snd.song, total = sndTotalSteps(song);
  g.fillStyle = '#16191d'; g.fillRect(0, 0, 64, 64);
  let any = false;
  song.tracks.forEach((t, ti) => {
    g.fillStyle = SND_COLORS[ti % 8];
    t.notes.forEach((n) => {
      any = true;
      const x = 4 + (n.s / total) * 56, w = Math.max(1.5, (n.l / total) * 56);
      const y = t.kind === 'drum' ? 50 + (n.p / SND_DRUMS.length) * 11 : 5 + ((SND_HI - n.p) / (SND_HI - SND_LO)) * 42;
      g.fillRect(x, y, w, 2);
    });
  });
  if (!any) {
    const d = sx.data || sfxRender(sx.p);
    g.fillStyle = '#8fbf5a';
    for (let x = 0; x < 56; x++) {
      const a = Math.floor(x * d.length / 56), b = Math.max(a + 1, Math.floor((x + 1) * d.length / 56));
      let hi = 0;
      for (let i = a; i < b; i++) { const v = Math.abs(d[i]); if (v > hi) hi = v; }
      g.fillRect(4 + x, 32 - hi * 26, 1, Math.max(1, hi * 52));
    }
  }
  return c.toDataURL('image/png');
}
function audioStatus() {
  const el = $('sndSave'), dirty = audioIsDirty();
  el.classList.toggle('dirty', dirty);
  el.textContent = dirty
    ? '\u25cf ' + tr('Belum disimpan') + ' \u00b7 ' + tr('Draf disimpan otomatis di browser ini.')
    : '\u2713 ' + (snd.savedAt ? fmt('Tersimpan pukul {t}', { t: fmtClock(snd.savedAt) }) : tr('Tersimpan'));
}
function projectTouched() {
  if (!snd.ready) return;
  clearTimeout(snd.statusTimer); snd.statusTimer = setTimeout(audioStatus, 250);
  clearTimeout(snd.draftTimer); snd.draftTimer = setTimeout(audioDraftSave, 1500);
}
/* puts a (cleaned) project on screen. sig: null = what is on screen counts as saved. */
function loadProject(p, id, sig, savedAt) {
  sndStop(); sndStopSamples(); playUI(false);
  snd.song = p.song; snd.cur = 0; snd.sel = null; snd.undo = []; snd.redo = []; snd.lastKey = '';
  snd.startStep = 0; snd.loopFrom = 1; snd.loopTo = p.song.bars;
  sx.p = p.sfx.cur; sx.bank = p.sfx.bank; sx.undo = []; sx.redo = []; sx.lastKey = '';
  $('sndName').value = p.name; $('sfxName').value = '';
  snd.id = id;
  snd.savedAt = savedAt || 0;
  renderTracks(); syncTrackUI(); syncSongUI(); selBuildPitch(); selSync(); syncUndoUI();
  sfxSyncUI(); renderBank();
  if (snd.active) { rollLayout(true); sfxRefresh(false); } else { sx.data = null; snd.scrolled = false; }
  snd.savedSig = sig === null || sig === undefined ? audioSig() : sig;
  sndTouch();
  audioStatus();
}
async function audioConfirmReplace() {
  if (audioEmpty() || !audioIsDirty()) return true;
  const r = await ssDialog({
    title: 'Ganti proyek audio yang sekarang?', text: tr('Perubahan yang belum disimpan akan hilang.'),
    buttons: [{ label: 'Batal', value: 'no' }, { label: 'Ganti', value: 'ok', primary: true, danger: true }]
  });
  return !!(r && r.v === 'ok');
}
/* called by Save / Load when it opens or saves an audio file */
function audioLoadItem(d, it) {
  const p = sndCleanProject(d);
  if (!p.name) p.name = it.name;
  loadProject(p, it.id, null, it.updated);
  p.name = it.name; $('sndName').value = it.name; snd.savedSig = audioSig();
  audioDraftSave();
}
function audioMarkSaved(meta) {
  snd.id = meta.id;
  if (!nameVal()) $('sndName').value = meta.name;
  snd.savedSig = audioSig();
  snd.savedAt = meta.updated;
  audioStatus();
  audioDraftSave();
}
function audioUnique(name, folder) {
  let n = name, k = 2;
  const taken = (x) => lib.items.some((i) => i.folder === folder && i.type === 'audio' && i.name.toLowerCase() === x.toLowerCase());
  while (taken(n)) n = name + ' (' + (k++) + ')';
  return n;
}
async function audioSave(asCopy) {
  if (snd.saving) return;
  if (!lib.ok) { showToast(tr('Penyimpanan browser tidak tersedia.'), 3000); return; }
  if (audioEmpty()) { sndToast('Proyek audio masih kosong'); return; }
  snd.saving = true;
  try {
    await loadLibrary();
    let target = !asCopy && snd.id ? lib.items.find((i) => i.id === snd.id) || null : null;
    let name = nameVal() || (target ? target.name : tr('Proyek audio') + ' ' + fmtClock(Date.now()));
    const folder = target ? target.folder : ST_FOLDER.audio;
    if (!target) {
      const dup = lib.items.find((i) => i.folder === folder && i.type === 'audio' && i.name.toLowerCase() === name.toLowerCase());
      if (dup && !asCopy && !snd.id) {
        const r = await ssDialog({
          title: 'Timpa berkas?', text: tr('Sudah ada berkas dengan nama ini') + ': ' + name,
          buttons: [{ label: 'Batal', value: 'no' }, { label: 'Simpan salinan', value: 'copy' }, { label: 'Timpa', value: 'over', primary: true, danger: true }]
        });
        if (!r || r.v === 'no') return;
        if (r.v === 'over') target = dup; else name = audioUnique(name, folder);
      } else if (dup) name = audioUnique(name, folder);
    }
    const payload = audioPayload();
    payload.name = name;
    const size = audioPayloadSize(payload);
    if (!(await ensureRoom(size, target ? target.size || 0 : 0, true))) return;
    const now = Date.now();
    const meta = {
      id: target ? target.id : stUid(), type: 'audio', folder: target ? target.folder : folder, name: name,
      created: target ? target.created : now, updated: now, size: size, info: audioInfo(payload), thumb: audioThumb()
    };
    await writeItem(meta, payload);
    $('sndName').value = name;
    audioMarkSaved(meta);
    await loadLibrary();
    renderFiles();
    await audioRenderList();
    showToast(tr(target ? 'Diganti' : 'Tersimpan'));
  } catch (e) {
    storageError(e);
  } finally {
    snd.saving = false;
  }
}
async function audioNew() {
  if (!(await audioConfirmReplace())) return;
  loadProject(sndCleanProject({}), null, null, 0);
  audioDraftSave();
  sndToast('Proyek audio baru dibuat');
}
async function audioOpenSaved(it) {
  try {
    const row = await dbGet('blobs', it.id);
    const d = row && row.data;
    if (!d || d.kind !== 'audio') throw new Error('bad');
    if (d.v > 1) { showToast(tr('Berkas dibuat oleh versi yang lebih baru.'), 3500); return; }
    if (!(await audioConfirmReplace())) return;
    audioLoadItem(d, it);
    sndToast('Proyek audio dibuka');
    window.scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    showToast(tr('Berkas tidak bisa dibaca. Datanya mungkin rusak.'), 3500);
  }
}
async function audioRenderList() {
  const box = $('sndList');
  if (!box) return;
  box.textContent = '';
  if (!lib.ok) { box.appendChild(stEl('p', 'hint', tr('Penyimpanan browser tidak tersedia.'))); return; }
  try { await loadLibrary(); } catch (e) { console.error(e); }
  const items = lib.items.filter((i) => i.type === 'audio').sort((a, b) => b.updated - a.updated);
  if (!items.length) { box.appendChild(stEl('p', 'hint', tr('Belum ada proyek audio tersimpan.'))); return; }
  const small = (label, fn, cls) => {
    const b = stEl('button', 'btn btn-secondary btn-sm' + (cls ? ' ' + cls : ''), tr(label));
    b.type = 'button'; b.addEventListener('click', fn);
    return b;
  };
  items.forEach((it) => {
    const row = stEl('div', 'fm-row fm-file');
    const th = document.createElement('img');
    th.className = 'fm-thumb'; th.alt = ''; th.src = it.thumb || '';
    const info = stEl('span', 'fm-info');
    info.appendChild(stEl('b', 'fm-name snd-user', it.name));
    info.appendChild(stEl('span', 'fm-sub', infoText(it) + ' \u00b7 ' + fmtBytes(it.size || 0)));
    info.appendChild(stEl('span', 'fm-sub', fmtDate(it.updated) + (it.id === snd.id ? ' \u00b7 \u25b6' : '')));
    const acts = stEl('span', 'fm-acts');
    acts.appendChild(small('Buka', () => audioOpenSaved(it), 'btn-primary'));
    acts.appendChild(small('Ubah nama', async () => {
      await renameItem(it);
      if (it.id === snd.id) { const n = lib.items.find((i) => i.id === it.id); if (n) { $('sndName').value = n.name; audioDraftSave(); } }
      audioRenderList();
    }));
    acts.appendChild(small('Hapus berkas', async () => {
      await deleteItem(it);
      if (!lib.items.some((i) => i.id === it.id) && snd.id === it.id) { snd.id = null; snd.savedSig = ''; snd.savedAt = 0; audioStatus(); audioDraftSave(); }
      audioRenderList();
    }));
    row.appendChild(th); row.appendChild(info); row.appendChild(acts);
    box.appendChild(row);
  });
}

/* ---------------------------------------------------------------- draft (autosave of the whole screen) */
function audioDraftSave() {
  if (!snd.ready) return Promise.resolve();
  clearTimeout(snd.draftTimer); snd.draftTimer = 0;
  const v = { id: snd.id, project: audioPayload(), sig: snd.savedSig, savedAt: snd.savedAt, t: Date.now() };
  return dbTx(['meta'], 'readwrite', (t) => { t.objectStore('meta').put({ key: 'audio-draft', value: v }); }).catch(() => { /* storage not available: no draft */ });
}
async function audioRestoreDraft() {
  try {
    const row = await dbGet('meta', 'audio-draft');
    const v = row && row.value;
    if (!v || !v.project) return;
    const p = sndCleanProject(v.project);
    if (!sndCountNotes(p.song) && !p.sfx.bank.length && !p.name) return;
    loadProject(p, v.id || null, v.sig || '', v.savedAt || 0);
    snd.restored = true;
  } catch (e) { /* no storage, or a damaged draft: start fresh */ }
}

/* ---------------------------------------------------------------- open a file (MIDI, .sfxr, project / bank .json) */
async function openMidiBytes(bytes, fname) {
  let res;
  try { res = sndFromMidi(bytes); }
  catch (e) {
    const m = String(e && e.message);
    sndToast(m === 'midi-division' ? 'MIDI memakai pewaktu SMPTE, ini belum didukung' : m === 'midi-empty' ? 'Berkas MIDI tidak berisi nada' : 'Berkas MIDI tidak bisa dibaca', 3500);
    return;
  }
  sndStop(); playUI(false);
  snapPush();
  snd.song = res.song; snd.cur = 0; snd.sel = null; snd.startStep = 0; snd.loopFrom = 1; snd.loopTo = res.song.bars;
  if (!nameVal()) $('sndName').value = sndText(String(fname).replace(/\.[^.]+$/, ''), 60);
  songRefreshAll();
  rollLayout(true);
  const i = res.info, notes = [fmt('{t} track, {n} nada', { t: i.tracks, n: i.notes })];
  if (i.dropped) notes.push(fmt('{n} nada dilewati', { n: i.dropped }));
  if (i.shifted) notes.push(fmt('{n} nada dipindah oktaf', { n: i.shifted }));
  if (i.droppedTracks) notes.push(fmt('{n} track dilewati', { n: i.droppedTracks }));
  if (i.cutBars) notes.push(tr('lagu dipotong'));
  if (i.tempoChanges) notes.push(tr('tempo berubah-ubah, hanya yang pertama dipakai'));
  showToast(tr('MIDI dibuka') + ': ' + notes.join(' \u00b7 '), 5200);
}
function openSfxrBytes(bytes) {
  let p;
  try { p = sfxFromFile(bytes); } catch (e) { sndToast('Berkas .sfxr tidak bisa dibaca', 3500); return; }
  sfxPush();
  sx.p = p;
  setView('sfx');
  sfxSyncUI(); sfxRefresh(true); projectTouched();
  sndToast('SFX dibuka');
}
async function openJsonBytes(bytes) {
  let raw;
  try { raw = JSON.parse(new TextDecoder('utf-8').decode(bytes)); } catch (e) { sndToast('Berkas proyek tidak bisa dibaca', 3500); return; }
  if (raw && typeof raw === 'object' && (raw.song || (raw.sfx && typeof raw.sfx === 'object'))) {
    let p;
    try { p = sndCleanProject(raw); } catch (e) { sndToast('Berkas proyek tidak bisa dibaca', 3500); return; }
    if (!(await audioConfirmReplace())) return;
    loadProject(p, null, '', 0);
    audioStatus(); audioDraftSave();
    sndToast('Proyek audio dibuka');
  } else if (raw && typeof raw === 'object' && Array.isArray(raw.bank)) {
    const add = sfxCleanBank(raw.bank), room = SND_MAX_SFX - sx.bank.length;
    add.slice(0, Math.max(0, room)).forEach((it) => { it.id = sndUid(); sx.bank.push(it); });
    renderBank(); projectTouched();
    setView('sfx');
    sndToast('Bank SFX dibuka');
  } else sndToast('Berkas tidak dikenali', 3000);
}
async function openAudioFile(file) {
  if (file.size > 40 * 1024 * 1024) { sndToast('Berkas terlalu besar', 3000); return; }
  const ext = ((file.name.match(/\.([^.]+)$/) || [])[1] || '').toLowerCase();
  let bytes;
  try { bytes = new Uint8Array(await blobToBuf(file)); } catch (e) { sndToast('Berkas tidak bisa dibaca', 3000); return; }
  if (ext === 'mid' || ext === 'midi') await openMidiBytes(bytes, file.name);
  else if (ext === 'sfxr') openSfxrBytes(bytes);
  else if (ext === 'json') await openJsonBytes(bytes);
  else sndToast('Berkas tidak dikenali', 3000);
}
async function loadDemo() {
  if (sndCountNotes(snd.song)) {
    const r = await ssDialog({
      title: 'Ganti lagu yang sekarang?', text: tr('Bisa diurungkan dengan tombol Urungkan.'),
      buttons: [{ label: 'Batal', value: 'no' }, { label: 'Ganti', value: 'ok', primary: true }]
    });
    if (!r || r.v !== 'ok') return;
  }
  sndStop(); playUI(false);
  snapPush();
  snd.song = sndDemoSong(); snd.cur = 0; snd.sel = null; snd.startStep = 0; snd.loopFrom = 1; snd.loopTo = snd.song.bars;
  songRefreshAll();
  rollLayout(true);
  sndToast('Lagu contoh dimuat');
}
Object.assign(EN, { 'Bisa diurungkan dengan tombol Urungkan.': 'You can undo this with the Undo button.', 'Berkas tidak bisa dibaca': 'The file cannot be read' });

/* =========================================================================
   WIRING
   ========================================================================= */
/* a dialog is open (the Settings dialog always exists in the page, it is just hidden) */
function modalOpen() { return Array.prototype.some.call(document.querySelectorAll('.ss-modal'), (m) => !m.hidden); }
function isTyping(t) {
  if (!t || !t.tagName) return false;
  if (t.isContentEditable || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return true;
  return t.tagName === 'INPUT' && ['text', 'number', 'search', 'email', 'url', 'password'].indexOf(t.type) >= 0;
}
function initAudioTab() {
  /* header */
  $('sndName').addEventListener('input', projectTouched);
  $('sndNewBtn').addEventListener('click', audioNew);
  $('sndSaveBtn').addEventListener('click', () => audioSave(false));
  $('sndCopyBtn').addEventListener('click', () => audioSave(true));
  $('sndOpenBtn').addEventListener('click', () => $('sndOpenFile').click());
  $('sndOpenFile').addEventListener('change', () => { const f = $('sndOpenFile').files[0]; $('sndOpenFile').value = ''; if (f) openAudioFile(f); });
  $('sndDemoBtn').addEventListener('click', () => { setView('song'); loadDemo(); });
  document.querySelectorAll('[data-sndview]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.sndview)));

  /* transport */
  $('sndPlay').addEventListener('click', () => { if (sndEng.playing) songPause(); else songPlay(); });
  $('sndStop').addEventListener('click', songStop);
  const toggle = (id, key, apply) => $(id).addEventListener('click', () => {
    snd[key] = !snd[key];
    $(id).classList.toggle('on', snd[key]); $(id).setAttribute('aria-pressed', snd[key] ? 'true' : 'false');
    apply();
  });
  toggle('sndLoop', 'loop', () => { transportSettings(); rollQueue(); });
  toggle('sndMetro', 'metro', transportSettings);
  $('sndBpm').addEventListener('input', () => {
    const v = Math.round(Number($('sndBpm').value));
    if (v >= 30 && v <= 300) edit(() => { snd.song.bpm = v; }, 'bpm');
  });
  $('sndBpm').addEventListener('change', syncSongUI);
  $('sndMaster').addEventListener('input', () => {
    const v = Number($('sndMaster').value);
    setRangeLabel('sndMasterVal', v);
    edit(() => { snd.song.master.vol = v / 100; }, 'master');
  });
  ['sndLoopFrom', 'sndLoopTo'].forEach((id) => $(id).addEventListener('change', () => {
    snd.loopFrom = Math.round(Number($('sndLoopFrom').value)) || 1;
    snd.loopTo = Math.round(Number($('sndLoopTo').value)) || snd.song.bars;
    syncSongUI(); transportSettings(); rollQueue();
  }));

  /* tracks */
  $('sndAddSynth').addEventListener('click', () => addTrack('synth'));
  $('sndAddDrum').addEventListener('click', () => addTrack('drum'));

  /* piano roll */
  document.querySelectorAll('[data-sndtool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.sndtool)));
  document.querySelectorAll('[data-sndzoom]').forEach((b) => b.addEventListener('click', () => setZoom(b.dataset.sndzoom[0], b.dataset.sndzoom[1] === '+' ? 1 : -1)));
  $('sndUndo').addEventListener('click', doUndo);
  $('sndRedo').addEventListener('click', doRedo);
  const cv = $('sndRoll'), wrap = $('sndRollWrap');
  cv.addEventListener('pointerdown', rollDown);
  cv.addEventListener('pointermove', rollMove);
  cv.addEventListener('pointerup', rollUp);
  cv.addEventListener('pointercancel', rollUp);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  wrap.addEventListener('scroll', rollQueue, { passive: true });
  wrap.addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); setZoom('x', e.deltaY < 0 ? 1 : -1); } }, { passive: false });
  if (window.ResizeObserver) new ResizeObserver(() => { if (snd.active) { rollSizeCanvas(); rollQueue(); sfxWaveDraw(); scopeDraw(); } }).observe(wrap);
  window.addEventListener('resize', () => { if (snd.active) { rollLayout(); sfxWaveDraw(); } });
  new MutationObserver(() => { readColors(); if (snd.active) { rollQueue(); sfxWaveDraw(); scopeDraw(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
  $('sndLen').addEventListener('change', () => { snd.defLen = Number($('sndLen').value) || 4; });
  $('sndChord').addEventListener('change', () => { snd.chord = $('sndChord').value; });
  $('sndLock').addEventListener('change', () => { snd.lock = $('sndLock').checked; });
  $('sndNewVel').addEventListener('input', () => { snd.defVel = Number($('sndNewVel').value) / 100; setRangeLabel('sndNewVelVal', Math.round(snd.defVel * 100)); });

  /* the selected note */
  $('sndSelPitch').addEventListener('change', () => selEdit((n) => { n.p = Number($('sndSelPitch').value); sndPreviewNote(curTrack(), n.p, n.v); }));
  $('sndSelStart').addEventListener('change', () => selEdit((n) => {
    const total = sndTotalSteps(snd.song);
    n.s = Math.max(0, Math.min(total - 1, Math.round(Number($('sndSelStart').value) || 1) - 1));
    n.l = Math.min(n.l, total - n.s);
  }));
  $('sndSelLen').addEventListener('change', () => selEdit((n) => {
    n.l = Math.max(1, Math.min(sndTotalSteps(snd.song) - n.s, Math.round(Number($('sndSelLen').value)) || 1));
  }));
  $('sndSelVel').addEventListener('input', () => {
    const v = Number($('sndSelVel').value);
    setRangeLabel('sndSelVelVal', v);
    selEdit((n) => { n.v = v / 100; }, 'selvel');
  });
  $('sndSelDup').addEventListener('click', selDuplicate);
  $('sndSelDel').addEventListener('click', selDelete);

  /* the selected track */
  $('sndTrName').addEventListener('input', () => {
    const t = curTrack(), v = sndText($('sndTrName').value, 24);
    edit(() => { t.name = v || t.name; }, 'trname');
    $('sndTrackTitle').textContent = t.name; renderTracks();
  });
  $('sndWave').addEventListener('change', () => { const t = curTrack(); edit(() => { t.wave = $('sndWave').value; }); sndPreviewNote(t, 60, 0.8); });
  bindTrackRange('sndTrVol', 'sndTrVolVal', 'trvol', (t, v) => { t.vol = v / 100; });
  bindTrackRange('sndTrPan', 'sndTrPanVal', 'trpan', (t, v) => { t.pan = v / 100; });
  bindTrackRange('sndEnvA', 'sndEnvAVal', 'enva', (t, v) => { t.env.a = v / 1000; });
  bindTrackRange('sndEnvD', 'sndEnvDVal', 'envd', (t, v) => { t.env.d = v / 1000; });
  bindTrackRange('sndEnvS', 'sndEnvSVal', 'envs', (t, v) => { t.env.s = v / 100; });
  bindTrackRange('sndEnvR', 'sndEnvRVal', 'envr', (t, v) => { t.env.r = v / 1000; });
  bindTrackRange('sndVibD', 'sndVibDVal', 'vibd', (t, v) => { t.vib.depth = v; });
  bindTrackRange('sndVibR', 'sndVibRVal', 'vibr', (t, v) => { t.vib.rate = v; });
  document.querySelectorAll('[data-sndtrans]').forEach((b) => b.addEventListener('click', () => trackTranspose(Number(b.dataset.sndtrans))));
  $('sndTrDup').addEventListener('click', trackDuplicate);
  $('sndTrClear').addEventListener('click', trackClear);
  $('sndTrDel').addEventListener('click', trackDelete);

  /* song settings */
  $('sndBars').addEventListener('change', () => reshape(snd.song.bpb, snd.song.spb, Number($('sndBars').value)));
  $('sndBpb').addEventListener('change', () => reshape(Number($('sndBpb').value), snd.song.spb, snd.song.bars));
  $('sndSpb').addEventListener('change', () => reshape(snd.song.bpb, Number($('sndSpb').value), snd.song.bars));
  $('sndSwing').addEventListener('input', () => { const v = Number($('sndSwing').value); setRangeLabel('sndSwingVal', v); edit(() => { snd.song.swing = v / 100; }, 'swing'); });
  $('sndRoot').addEventListener('change', () => edit(() => { snd.song.root = Number($('sndRoot').value); }));
  $('sndScale').addEventListener('change', () => edit(() => { snd.song.scale = $('sndScale').value; }));
  $('sndEchoOn').addEventListener('change', () => edit(() => { snd.song.master.echo.on = $('sndEchoOn').checked; }));
  $('sndRevOn').addEventListener('change', () => edit(() => { snd.song.master.rev.on = $('sndRevOn').checked; }));
  const mrange = (id, valId, key, set) => $(id).addEventListener('input', () => { const v = Number($(id).value); setRangeLabel(valId, v); edit(() => set(snd.song.master, v), key); });
  mrange('sndEchoTime', 'sndEchoTimeVal', 'ecT', (m, v) => { m.echo.time = v / 1000; });
  mrange('sndEchoFb', 'sndEchoFbVal', 'ecF', (m, v) => { m.echo.fb = v / 100; });
  mrange('sndEchoMix', 'sndEchoMixVal', 'ecM', (m, v) => { m.echo.mix = v / 100; });
  mrange('sndRevMix', 'sndRevMixVal', 'rvM', (m, v) => { m.rev.mix = v / 100; });

  /* bar tools + downloads */
  $('sndBarCopy').addEventListener('click', barCopy);
  $('sndBarClear').addEventListener('click', barClear);
  $('sndDlWav').addEventListener('click', exportWav);
  $('sndDlMid').addEventListener('click', exportMidi);
  $('sndDlJson').addEventListener('click', exportJson);

  /* sound effects */
  document.querySelectorAll('[data-sfxgen]').forEach((b) => b.addEventListener('click', () => { sndGetCtx(); sfxGenerate(b.dataset.sfxgen); }));
  $('sfxMutate').addEventListener('click', () => { sndGetCtx(); sfxMutateNow(); });
  $('sfxPlay').addEventListener('click', () => { sndGetCtx(); sfxPlayNow(); });
  $('sfxUndo').addEventListener('click', () => sfxStep(sx.undo, sx.redo));
  $('sfxRedo').addEventListener('click', () => sfxStep(sx.redo, sx.undo));
  document.querySelectorAll('[data-sfxwave]').forEach((b) => b.addEventListener('click', () => {
    sndGetCtx(); sfxPush(); sx.p.wave = Number(b.dataset.sfxwave); sfxSyncUI(); sfxRefresh(true); projectTouched();
  }));
  $('sfxVol').addEventListener('input', () => { const v = Number($('sfxVol').value); setRangeLabel('sfxVolVal', v); sfxPush('vol'); sx.p.vol = v / 100; sfxQueue(true); });
  $('sfxNorm').addEventListener('change', () => { sfxPush(); sx.p.norm = $('sfxNorm').checked; sfxQueue(true); });
  $('sfxRev').addEventListener('change', () => { sfxPush(); sx.p.rev = $('sfxRev').checked; sfxQueue(true); });
  $('sfxBankAdd').addEventListener('click', sfxBankAdd);
  $('sfxName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sfxBankAdd(); } });
  $('sfxDlWav').addEventListener('click', sfxDlWav);
  $('sfxDlSfxr').addEventListener('click', sfxDlSfxr);
  $('sfxDlZip').addEventListener('click', sfxDlZip);

  /* keyboard (only while the Sound Studio is open) */
  document.addEventListener('keydown', (e) => {
    if (!snd.active || snd.view !== 'song' || e.altKey || modalOpen()) return;
    const t = e.target, typing = isTyping(t);
    if ((e.ctrlKey || e.metaKey) && !typing && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return; }
    if ((e.ctrlKey || e.metaKey) && !typing && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); doRedo(); return; }
    if (typing || e.ctrlKey || e.metaKey) return;
    if (e.key === ' ' && !(t && t.tagName === 'BUTTON')) { e.preventDefault(); if (sndEng.playing) songPause(); else songPlay(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && selNote()) { e.preventDefault(); selDelete(); }
  });

  /* stop the sound when the page is hidden (a background tab cannot keep the timing) */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { if (sndEng.playing) { songPause(); } sndStopSamples(); if (snd.ready) audioDraftSave(); }
  });
  window.addEventListener('pagehide', () => { if (snd.ready) audioDraftSave(); });

  /* language switch: texts made in code are made again */
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setTimeout(audioRelang, 0)));

  /* first state */
  sfxBuildParams(); sfxSyncUI(); renderBank();
  setTool('draw');
  renderTracks(); syncTrackUI(); syncSongUI(); selBuildPitch(); selSync(); syncUndoUI();
  snd.savedSig = audioSig();
  snd.ready = true;
  applyLang();
  audioStatus();
  audioRestoreDraft();
}
function audioRelang() {
  renderTracks(); selBuildPitch(); selSync(); sfxBuildParams(); sfxSyncUI(); renderBank(); setTool(snd.tool);
  playUI(sndEng.playing); audioStatus(); audioRenderList(); posText(sndPosition()); rollQueue();
  if (snd.active && snd.view === 'sfx') sfxRefresh(false);
}

initAudioTab();
