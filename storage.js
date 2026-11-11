'use strict';

/* Spritesheet Studio v2.7.8 - storage: Save / Load with folders, recovery mode, IndexedDB (1 GB limit)
   Made by Farelfhmc - Studio Fhilion. MIT License.
   Part 5 of 5. Classic script: shares one global scope with the other js/ files and must load LAST
   (it uses state, player, paint and fc from the other files, and extends the EN table). */

/* =========================================================================
   What is stored (all inside the browser, IndexedDB database "spritesheet-studio"):
   - items   : one small record per saved file (name, type, folder, size, thumbnail)
   - blobs   : the heavy data of each file (PNG bytes, font glyphs), and the recovery snapshot
   - folders : the folders shown in the Save / Load tab
   - meta    : the storage limit and the recovery information
   Three kinds of files: animation (frames + layers + player / animation settings),
   spritesheet (the built or merged sheet + its settings) and font (Font Creator).
   ========================================================================= */
const DB_NAME = 'spritesheet-studio';
const DB_VERSION = 1;
const GB = 1024 * 1024 * 1024;
const LIMIT_DEFAULT = 1 * GB;
const LIMIT_CHOICES = [1, 2, 4, 8, 16];            // in GB; anything above 1 GB needs the user's permission
const ST_TYPES = ['animation', 'spritesheet', 'font'];
const ST_FOLDER = { animation: 'fd-animation', spritesheet: 'fd-spritesheet', font: 'fd-font' };
const ST_LABEL = { animation: 'Animasi', spritesheet: 'Spritesheet', font: 'Font' };
const AUTOSAVE_DELAY = 4000;
const FC_DEFAULT_NAME = 'MyPixelFont';

Object.assign(EN, {
  'Berkas': 'Files', 'Simpan & Buka': 'Save / Load',
  'Baru di v2.7.8': "What's new in v2.7.8",
  'Simpan dan buka pekerjaanmu: animasi, spritesheet, dan font tersimpan di browser dalam folder. Ada Mode Pemulihan yang menyimpan otomatis, jadi pekerjaan yang belum sempat disimpan bisa dikembalikan. Batas penyimpanan 1 GB; bisa dinaikkan dengan izinmu.': 'Save and open your work: animations, spritesheets and fonts are kept in the browser, in folders. Recovery Mode saves automatically, so work you did not get to save can be brought back. The storage limit is 1 GB; you can raise it with your permission.',
  'Simpan': 'Save', 'Penyimpanan': 'Storage', 'Berkas Tersimpan': 'Saved files',
  'Mode Pemulihan': 'Recovery Mode',
  'Simpan pekerjaanmu di browser ini (IndexedDB). Tidak ada yang diunggah ke mana pun.': 'Keep your work in this browser (IndexedDB). Nothing is uploaded anywhere.',
  'Nama': 'Name', 'Folder': 'Folder', 'Otomatis (folder sesuai jenis)': 'Automatic (folder for the type)',
  'Simpan Animasi': 'Save Animation', 'Simpan Spritesheet': 'Save Spritesheet', 'Simpan Font': 'Save Font',
  'Animasi': 'Animation',
  '+ Folder Baru': '+ New Folder', '\u2039 Kembali': '\u2039 Back',
  'Pulihkan Sesi': 'Restore Session', 'Buang': 'Discard', 'Ubah Batas\u2026': 'Change Limit\u2026',
  'Semua Folder': 'All folders',
  'Folder ini masih kosong.': 'This folder is empty.',
  'Belum ada folder.': 'No folders yet.',
  'Penyimpanan browser tidak tersedia (mode privat atau diblokir). Fitur simpan dan pulihkan dimatikan.': 'Browser storage is not available (private mode or blocked). Save and recovery are turned off.',
  'Coba lagi': 'Try again',
  '{n} frame': '{n} frames', '{n} berkas': '{n} files', '{n} huruf digambar': '{n} glyphs drawn',
  'Buka': 'Open', 'Timpa': 'Overwrite', 'Ubah nama': 'Rename', 'Pindah': 'Move', 'Hapus berkas': 'Delete file', 'Hapus folder': 'Delete folder',
  'Simpan salinan': 'Save a copy', 'Ganti': 'Replace', 'Tambahkan di akhir': 'Add at the end',
  'Kirim ke Gabung': 'Send to Merge', 'Izinkan': 'Allow', 'Pulihkan': 'Restore', 'Lewati': 'Skip',
  'Menyimpan\u2026': 'Saving\u2026', 'Membuka\u2026': 'Opening\u2026', 'Memulihkan\u2026': 'Restoring\u2026',
  'Belum ada frame untuk disimpan': 'There are no frames to save',
  'Font masih sama dengan font klasik': 'The font is still the classic font',
  'Tersimpan': 'Saved', 'Diganti': 'Overwritten', 'Dipulihkan': 'Restored', 'Dibuka': 'Opened',
  'Penyimpanan browser penuh. Hapus berkas lama atau kosongkan ruang disk.': 'Browser storage is full. Delete old files or free up disk space.',
  'Gagal menyimpan': 'Could not save', 'Gagal membuka berkas': 'Could not open the file',
  'Berkas tidak bisa dibaca. Datanya mungkin rusak.': 'The file cannot be read. Its data may be damaged.',
  'Berkas dibuat oleh versi yang lebih baru.': 'The file was made by a newer version.',
  'Ukuran terlalu besar untuk batas saat ini': 'Too large for the current limit',
  'Nama folder': 'Folder name', 'Nama berkas': 'File name', 'Pindahkan ke folder': 'Move to folder',
  'Nama folder sudah dipakai': 'That folder name is already used',
  'Folder dibuat': 'Folder created', 'Nama diubah': 'Renamed', 'Dipindahkan': 'Moved', 'Dihapus': 'Deleted',
  'Folder baru': 'New folder', 'Ubah nama folder': 'Rename folder', 'Ubah nama berkas': 'Rename file',
  'Hapus folder?': 'Delete folder?', 'Hapus berkas?': 'Delete file?', 'Timpa berkas?': 'Overwrite file?',
  'Sudah ada berkas dengan nama ini': 'A file with this name already exists',
  'Ganti frame yang sekarang?': 'Replace the current frames?',
  'Ganti font yang sekarang?': 'Replace the current font?',
  'Perubahan yang belum disimpan akan hilang.': 'Changes that are not saved will be lost.',
  'Berkas dibuka. Cek tab Spritesheet atau Export.': 'File opened. Check the Spritesheet or Export tab.',
  'Dikirim ke tab Gabung': 'Sent to the Merge tab',
  'Tab Gabung penuh (maks. 12 spritesheet)': 'The Merge tab is full (max. 12 spritesheets)',
  'Pekerjaan yang belum disimpan ditemukan': 'Unsaved work was found',
  'Batas penyimpanan': 'Storage limit', 'Batas baru': 'New limit',
  'Saya mengerti: berkas yang disimpan memakai ruang disk di perangkat ini.': 'I understand: saved files use disk space on this device.',
  'Izin penyimpanan permanen diberikan': 'Permanent storage permission granted',
  'Browser belum memberi izin penyimpanan permanen. Browser bisa menghapus data saat ruang hampir habis.': 'The browser did not grant permanent storage. It may delete the data when space runs low.',
  'Batas penyimpanan diubah': 'Storage limit changed',
  'Simpan otomatis aktif': 'Autosave is on', 'Simpan otomatis dijeda': 'Autosave is paused',
  'Simpan otomatis dilewati: batas penyimpanan penuh': 'Autosave skipped: storage limit reached',
  'Simpan otomatis tidak tersedia': 'Autosave is not available',
  'Sesi dipulihkan': 'Session restored', 'Sesi pemulihan dibuang': 'Recovery session discarded',
  'Yang bisa disimpan sekarang': 'What can be saved now',
  'belum ada': 'none yet', 'ada': 'ready', 'diubah': 'changed', 'masih klasik': 'still classic'
});

/* ---------------------------------------------------------------- helpers */
function fmt(key, vars) {
  return tr(key).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? vars[k] : m));
}
function stEl(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function fmtBytes(n) {
  const loc = state.lang === 'id' ? 'id-ID' : 'en-US';
  const f = (v, u) => v.toLocaleString(loc, { maximumFractionDigits: 1 }) + ' ' + u;
  if (n >= GB) return (n / GB).toLocaleString(loc, { maximumFractionDigits: 2 }) + ' GB';
  if (n >= 1048576) return f(n / 1048576, 'MB');
  if (n >= 1024) return f(n / 1024, 'KB');
  return f(n, 'B');
}
function fmtDate(t) {
  const loc = state.lang === 'id' ? 'id-ID' : 'en-US';
  try { return new Date(t).toLocaleString(loc, { dateStyle: 'medium', timeStyle: 'short' }); }
  catch (e) { return new Date(t).toLocaleString(); }
}
function fmtClock(t) {
  try { return new Date(t).toLocaleTimeString(state.lang === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' }); }
  catch (e) { return new Date(t).toLocaleTimeString(); }
}
function stUid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function isQuotaError(e) { return !!e && (e.name === 'QuotaExceededError' || /quota/i.test(String(e.message || ''))); }

function blobToBuf(blob) {
  if (blob.arrayBuffer) return blob.arrayBuffer();
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsArrayBuffer(blob);
  });
}
async function canvasToBuf(c) {
  const blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'));
  return blobToBuf(blob);
}
function bufToCanvas(buf) {
  return imageFileToCanvas(new Blob([buf], { type: 'image/png' }));
}
/* total bytes of every ArrayBuffer / typed array inside a payload */
function payloadSize(o) {
  if (!o || typeof o !== 'object') return 0;
  if (o instanceof ArrayBuffer) return o.byteLength;
  if (ArrayBuffer.isView(o)) return o.byteLength;
  let n = 0;
  if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) n += payloadSize(o[i]); return n + 16; }
  for (const k in o) n += payloadSize(o[k]) + k.length;
  return n + 16;
}

/* ---------------------------------------------------------------- IndexedDB */
let dbPromise = null;
function dbOpen() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('items', { keyPath: 'id' });
      db.createObjectStore('blobs', { keyPath: 'id' });
      db.createObjectStore('folders', { keyPath: 'id' });
      db.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error || new Error('open failed'));
    req.onblocked = () => reject(new Error('blocked'));
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}
/* runs fn(transaction) and resolves when the whole transaction has committed */
function dbTx(stores, mode, fn) {
  return dbOpen().then((db) => new Promise((resolve, reject) => {
    let t, out;
    try { t = db.transaction(stores, mode); } catch (e) { reject(e); return; }
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('aborted'));
    try { out = fn(t); } catch (e) { try { t.abort(); } catch (x) { /* already done */ } reject(e); }
  }));
}
function reqP(r) {
  return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
const dbGetAll = (store) => dbTx([store], 'readonly', (t) => reqP(t.objectStore(store).getAll()));
const dbGet = (store, key) => dbTx([store], 'readonly', (t) => reqP(t.objectStore(store).get(key)));

/* ---------------------------------------------------------------- state */
const lib = {
  ok: false, err: '', folders: [], items: [], limit: LIMIT_DEFAULT, usage: 0,
  cwd: null, working: false, recMeta: null
};
const rec = {                       // recovery / autosave
  enabled: false, paused: false, timer: 0, busy: false, dirty: false,
  lastSig: null, lastTime: 0, status: '', saved: { animation: null, font: null, merge: null }
};

/* ---------------------------------------------------------------- dialog + busy overlay */
function ssDialog(o) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const wrap = stEl('div', 'ss-modal');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    const box = stEl('div', 'ss-modal-box');
    if (o.title) box.appendChild(stEl('h3', 'ss-modal-title', tr(o.title)));
    (o.text ? [].concat(o.text) : []).forEach((t) => box.appendChild(stEl('p', 'ss-modal-text', t)));
    const inputs = [];
    (o.fields || []).forEach((f) => {
      const lab = stEl('label', f.kind === 'check' ? 'field checkbox-field' : 'field');
      let node;
      if (f.kind === 'select') {
        node = document.createElement('select');
        f.options.forEach((op) => {
          const x = document.createElement('option');
          x.value = op[0]; x.textContent = op[1];
          node.appendChild(x);
        });
        node.value = f.value;
        lab.appendChild(document.createTextNode(tr(f.label)));
        lab.appendChild(node);
      } else if (f.kind === 'check') {
        node = document.createElement('input');
        node.type = 'checkbox';
        lab.appendChild(node);
        lab.appendChild(document.createTextNode(' ' + tr(f.label)));
      } else {
        node = document.createElement('input');
        node.type = 'text'; node.value = f.value || ''; node.maxLength = f.max || 60;
        node.spellcheck = false; node.autocomplete = 'off';
        lab.appendChild(document.createTextNode(tr(f.label)));
        lab.appendChild(node);
      }
      box.appendChild(lab);
      inputs.push({ kind: f.kind, node });
    });
    const values = () => inputs.map((i) => (i.kind === 'check' ? i.node.checked : i.node.value));
    const actions = stEl('div', 'ss-modal-actions');
    const btns = [];
    const refresh = () => {
      const ok = !o.validate || o.validate(values());
      btns.forEach((b) => { if (b.needs) b.node.disabled = !ok; });
    };
    const focusables = () => Array.from(box.querySelectorAll('input, select, button')).filter((x) => !x.disabled);
    function done(r) {
      document.removeEventListener('keydown', onKey, true);
      wrap.remove();
      if (prev && prev.focus) { try { prev.focus(); } catch (e) { /* ignore */ } }
      resolve(r);
    }
    function onKey(e) {
      if (e.key === 'Escape' && !o.persistent) { e.preventDefault(); e.stopPropagation(); done(null); }
      else if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') {
        const p = btns.find((b) => b.primary && !b.node.disabled);
        if (p) { e.preventDefault(); e.stopPropagation(); p.node.click(); }
      } else if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
      }
    }
    (o.buttons || []).forEach((b) => {
      const n = stEl('button', 'btn' + (b.primary ? ' btn-primary' : ' btn-secondary') + (b.danger ? ' btn-danger' : ''), tr(b.label));
      n.type = 'button';
      n.addEventListener('click', () => done({ v: b.value, f: values() }));
      actions.appendChild(n);
      btns.push({ node: n, needs: !!b.needs, primary: !!b.primary });
    });
    box.appendChild(actions);
    wrap.appendChild(box);
    if (!o.persistent) wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) done(null); });
    inputs.forEach((i) => { i.node.addEventListener('input', refresh); i.node.addEventListener('change', refresh); });
    document.body.appendChild(wrap);
    document.addEventListener('keydown', onKey, true);
    refresh();
    const first = inputs.length ? inputs[0].node : (btns.find((b) => b.primary) || btns[0] || {}).node;
    if (first) { first.focus(); if (first.select && first.type === 'text') first.select(); }
  });
}

function busyStart(msgKey) {
  const wrap = stEl('div', 'ss-modal');
  wrap.setAttribute('role', 'alert');
  const box = stEl('div', 'ss-modal-box');
  const msg = stEl('p', 'ss-modal-text', tr(msgKey));
  const bar = stEl('div', 'progress-bar');
  const fill = stEl('div', 'progress-fill');
  bar.appendChild(fill);
  box.appendChild(msg); box.appendChild(bar);
  wrap.appendChild(box);
  document.body.appendChild(wrap);
  return {
    set(i, n) { fill.style.width = (n ? Math.round(i * 100 / n) : 0) + '%'; },
    end() { wrap.remove(); }
  };
}

/* ---------------------------------------------------------------- signatures (to know what changed) */
function hashStr(h, s) { for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h; }
function hashCanvas(h, c) {
  h = hashStr(h, c.width + 'x' + c.height);
  if (c.width * c.height > 16e6) return h;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const u = new Uint32Array(d.buffer, d.byteOffset, d.length >> 2);
  for (let i = 0; i < u.length; i++) h = Math.imul(h ^ u[i], 16777619) >>> 0;
  return h;
}
function animSettings() {
  const v = (id) => $(id).value;
  return {
    player: { fps: player.fps, loop: player.loop, from: player.from, to: player.to, toAuto: player.toAuto, bg: player.bg },
    anim: {
      format: v('animFormat'), fps: v('animFps'), scale: v('animScale'), mode: v('animMode'),
      from: v('animFrom'), to: v('animTo'), transparent: $('animTransparent').checked,
      bg: v('animBg'), quality: v('animQuality')
    }
  };
}
function sigAnimation() {
  if (!state.frames.length) return null;
  let h = 2166136261 >>> 0;
  state.frames.forEach((f) => {
    h = hashStr(h, (f.name || '') + '|');
    if (f.layers && f.layers.length) {
      f.layers.forEach((L) => { h = hashStr(h, L.name + '|' + L.visible + '|' + L.opacity); h = hashCanvas(h, L.canvas); });
    } else h = hashCanvas(h, f.canvas);
  });
  return hashStr(h, JSON.stringify(animSettings())) + ':' + state.frames.length;
}
function fontHasContent() {
  return fc.glyphs.size > 0 || fc.extra.length > 0 || fc.name !== FC_DEFAULT_NAME ||
    fc.w !== 5 || fc.h !== 9 || fc.base !== 7 || fc.spacing !== 1 || fc.prop;
}
function sigFont() {
  if (!fontHasContent()) return null;
  let h = hashStr(2166136261 >>> 0, [fc.name, fc.w, fc.h, fc.base, fc.spacing, fc.prop, fc.extra.join(',')].join('|'));
  Array.from(fc.glyphs.keys()).sort((a, b) => a - b).forEach((code) => {
    h = hashStr(h, code + ':');
    const g = fc.glyphs.get(code);
    for (let i = 0; i < g.length; i++) h = Math.imul(h ^ g[i], 16777619) >>> 0;
  });
  return String(h);
}
function mergeSheetPresent() { return !!(state.exportSheet && state.exportSource === 'merge'); }
function sigMerge() {
  if (!mergeSheetPresent()) return null;
  return String(hashCanvas(2166136261 >>> 0, state.exportSheet));
}

/* ---------------------------------------------------------------- pack: current work -> storable data */
async function packAnimation(progress) {
  commitXf();
  const n = state.frames.length;
  const frames = [];
  for (let i = 0; i < n; i++) {
    const f = state.frames[i];
    const o = { name: f.name || '', w: f.canvas.width, h: f.canvas.height };
    if (f.layers && f.layers.length) {
      o.layers = [];
      for (const L of f.layers) o.layers.push({ name: L.name, visible: L.visible, opacity: L.opacity, png: await canvasToBuf(L.canvas) });
      o.active = f.active | 0;
      o.layerSeq = f.layerSeq || f.layers.length;
    } else {
      o.png = await canvasToBuf(f.canvas);
    }
    frames.push(o);
    if (progress) progress(i + 1, n);
  }
  return { v: 1, kind: 'animation', frames, settings: animSettings() };
}

function sheetSettingsNow() {
  return state.lastSheetSettings || {
    frameW: parseInt($('sheetFrameW').value, 10) || 1, frameH: parseInt($('sheetFrameH').value, 10) || 1,
    columns: parseInt($('sheetColumns').value, 10) || 1, padding: parseInt($('sheetPadding').value, 10) || 0,
    margin: parseInt($('sheetMargin').value, 10) || 0
  };
}
async function packSheet() {
  const cv = state.exportSheet;
  const m = state.sheetMeta;
  const o = {
    v: 1, kind: 'spritesheet', source: state.exportSource || 'frames', w: cv.width, h: cv.height,
    png: await canvasToBuf(cv), settings: sheetSettingsNow(),
    meta: m ? { cols: m.cols, rows: m.rows, frameW: m.frameW, frameH: m.frameH, count: m.count, padding: m.padding, margin: m.margin } : null
  };
  if (o.source === 'frames') o.names = state.frames.map((f) => f.name || '');
  return o;
}

function packFont() {
  const glyphs = [];
  fc.glyphs.forEach((g, code) => glyphs.push([code, g.slice()]));
  return {
    v: 1, kind: 'font', name: fc.name, w: fc.w, h: fc.h, base: fc.base, spacing: fc.spacing, prop: fc.prop,
    glyphs, extra: fc.extra.slice(), sel: fc.sel,
    previewText: $('fcPreviewText').value, previewScale: $('fcPreviewScale').value
  };
}

/* small picture shown in the file list */
function thumbOf(canvas) { return makeThumbCanvas(canvas, 64).toDataURL('image/png'); }
function fontThumb() {
  const w = fc.w, h = fc.h;
  const c = document.createElement('canvas');
  c.width = w * 2 + 1; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(c.width, c.height);
  const ink = hexToRgb(fcColor('--accent').length === 7 ? fcColor('--accent') : '#8fbf5a');
  [65, 97].forEach((code, k) => {
    const g = fcGlyph(code);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!g[y * w + x]) continue;
      const i = (y * c.width + k * (w + 1) + x) * 4;
      img.data[i] = ink.r; img.data[i + 1] = ink.g; img.data[i + 2] = ink.b; img.data[i + 3] = 255;
    }
  });
  ctx.putImageData(img, 0, 0);
  return thumbOf(c);
}

/* ---------------------------------------------------------------- unpack: stored data -> working state */
async function unpackFrames(list, progress) {
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    const f = { id: nextId(), canvas: blankCanvas(o.w, o.h) };
    if (o.name) f.name = o.name;
    if (o.layers && o.layers.length) {
      f.layers = [];
      for (const L of o.layers) {
        const lc = blankCanvas(o.w, o.h);
        lc.getContext('2d').drawImage(await bufToCanvas(L.png), 0, 0);
        const nl = newLayerObj(lc, L.name);
        nl.visible = L.visible !== false;
        nl.opacity = typeof L.opacity === 'number' ? L.opacity : 1;
        f.layers.push(nl);
      }
      f.active = Math.max(0, Math.min(o.active | 0, f.layers.length - 1));
      f.layerSeq = o.layerSeq || f.layers.length;
      compositeFrame(f);
    } else {
      f.canvas.getContext('2d').drawImage(await bufToCanvas(o.png), 0, 0);
    }
    out.push(f);
    if (progress) progress(i + 1, list.length);
  }
  return out;
}

function setSelectSafe(id, val) {
  const el = $(id);
  if (val === undefined || val === null) return;
  if (el.tagName === 'SELECT' && !Array.from(el.options).some((o) => o.value === String(val))) return;
  el.value = val;
}
function applyAnimSettings(s) {
  if (!s) return;
  if (s.player) {
    const p = s.player;
    if (p.fps >= 1 && p.fps <= 60) player.fps = p.fps;
    if (['loop', 'pingpong', 'once'].indexOf(p.loop) >= 0 || document.querySelector('[data-ploop="' + p.loop + '"]')) player.loop = p.loop;
    if (p.bg && document.querySelector('[data-pbg="' + p.bg + '"]')) player.bg = p.bg;
    player.from = p.from || 1; player.to = p.to || 1; player.toAuto = p.toAuto !== false;
    player.dir = 1;
    $('playerFps').value = player.fps;
    $('playerFpsVal').textContent = player.fps;
    document.querySelectorAll('[data-ploop]').forEach((b) => b.classList.toggle('on', b.dataset.ploop === player.loop));
    document.querySelectorAll('[data-pbg]').forEach((b) => b.classList.toggle('on', b.dataset.pbg === player.bg));
  }
  if (s.anim) {
    const a = s.anim;
    setSelectSafe('animFormat', a.format); setSelectSafe('animScale', a.scale); setSelectSafe('animMode', a.mode);
    $('animFps').value = a.fps || 12;
    $('animFrom').value = a.from || ''; $('animTo').value = a.to || '';
    $('animTransparent').checked = a.transparent !== false;
    if (a.bg) $('animBg').value = a.bg;
    if (a.quality) $('animQuality').value = a.quality;
    updateAnimUI();
  }
}

function applyAnimation(frames, settings, mode) {
  stopPlayer();
  commitXf();
  if (mode === 'replace') {
    state.frames.splice(0, state.frames.length);
    paint.id = null; resetPaintHistory();
    bgUndo = null; fsUndoData = null; $('fsUndoBtn').disabled = true;
    player.i = 0;
  }
  frames.forEach((f) => state.frames.push(f));
  if (mode === 'replace') applyAnimSettings(settings);
  framesChanged();
  syncPlayerInputs();
  if ($('panel-player').classList.contains('active')) renderPlayer();
}

function applyFont(d) {
  fc.name = String(d.name || FC_DEFAULT_NAME).slice(0, 40);
  fc.w = fcClamp(d.w | 0, 1, 32); fc.h = fcClamp(d.h | 0, 1, 32);
  fc.base = fcClamp(d.base | 0, 1, fc.h);
  fc.spacing = fcClamp(d.spacing | 0, 0, 8);
  fc.prop = !!d.prop;
  fc.glyphs = new Map();
  (d.glyphs || []).forEach((p) => {
    const g = new Uint8Array(p[1]);
    if (g.length === fc.w * fc.h && p[0] >= 0 && p[0] <= 0xFFFF) fc.glyphs.set(p[0], g);
  });
  fc.extra = (d.extra || []).filter((c) => c > 126 && c <= 0xFFFF).sort((a, b) => a - b);
  fc.mapped.clear();
  fc.undo.length = 0; fc.redo.length = 0; fc.stroke = null;
  fc.sel = fcCodes().indexOf(d.sel) >= 0 ? d.sel : 65;
  if (typeof d.previewText === 'string') $('fcPreviewText').value = d.previewText;
  if (d.previewScale) setSelectSafe('fcPreviewScale', d.previewScale);
  fcSyncSettings();
  fcBuildGrid();
  fcRenderAll(false);
}

async function applySheet(d, toMerge) {
  const cv = await bufToCanvas(d.png);
  const m = d.meta;
  state.exportSheet = cv;
  state.exportSource = d.source === 'merge' ? 'merge' : 'frames';
  state.sheetStale = false;
  state.sheetMeta = m ? Object.assign({ canvas: cv, sheetW: cv.width, sheetH: cv.height }, m) : null;
  state.lastSheetSettings = (state.exportSource === 'frames' && d.settings) ? d.settings : null;
  const s = d.settings;
  if (s) {
    $('sheetFrameW').value = s.frameW; $('sheetFrameH').value = s.frameH;
    $('sheetColumns').value = s.columns; $('sheetPadding').value = s.padding; $('sheetMargin').value = s.margin;
  }
  paintPreview($('sheetPreviewCanvas'), cv);
  $('sheetTotalFrames').textContent = m ? m.count : '-';
  $('sheetRows').textContent = m ? m.rows : '-';
  $('sheetColsOut').textContent = m ? m.cols : '-';
  $('sheetFrameSize').textContent = m ? m.frameW + '\u00d7' + m.frameH : '-';
  $('sheetResolution').textContent = cv.width + '\u00d7' + cv.height;
  if (d.source === 'merge') paintPreview($('mergeResultCanvas'), cv);
  updateExportUI();
  if (toMerge) {
    let slot = state.mergeItems.find((it) => !it.canvas);
    if (!slot) {
      if (state.mergeItems.length >= MERGE_MAX) { showToast('Tab Gabung penuh (maks. 12 spritesheet)', 3000); return false; }
      slot = newMergeItem(state.mergeItems[state.mergeItems.length - 1]);
      state.mergeItems.push(slot);
    }
    slot.canvas = cv; slot.name = 'spritesheet.png';
    if (m) { slot.fw = m.frameW; slot.fh = m.frameH; }
    renderMergeList();
  }
  return true;
}

/* ---------------------------------------------------------------- library: folders, items, usage */
async function ensureFolders() {
  const have = new Set(lib.folders.map((f) => f.id));
  const add = ST_TYPES.filter((t) => !have.has(ST_FOLDER[t]));
  if (!add.length) return;
  const now = Date.now();
  await dbTx(['folders'], 'readwrite', (t) => {
    add.forEach((ty, i) => t.objectStore('folders').put({ id: ST_FOLDER[ty], name: '', type: ty, builtin: true, created: now + i }));
  });
  lib.folders = await dbGetAll('folders');
}

async function loadLibrary() {
  lib.folders = await dbGetAll('folders');
  await ensureFolders();
  lib.items = await dbGetAll('items');
  const lim = await dbGet('meta', 'limit');
  lib.limit = lim && lim.value >= GB ? lim.value : LIMIT_DEFAULT;
  lib.recMeta = (await dbGet('meta', 'recovery')) || null;
  lib.usage = lib.items.reduce((a, it) => a + (it.size || 0), 0) + (lib.recMeta ? lib.recMeta.size || 0 : 0);
}

function folderName(f) { return f.builtin ? tr(ST_LABEL[f.type]) : f.name; }
function folderSorted() {
  const order = (f) => (f.builtin ? ST_TYPES.indexOf(f.type) : 10);
  return lib.folders.slice().sort((a, b) => order(a) - order(b) || folderName(a).localeCompare(folderName(b)));
}
function itemsIn(folderId) { return lib.items.filter((i) => i.folder === folderId); }

async function browserSpace() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      if (e && e.quota) return { quota: e.quota, usage: e.usage || 0 };
    }
  } catch (e) { /* unknown */ }
  return null;
}
async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch (e) { /* ignore */ }
  return false;
}

/* The limit dialog. `needed` = total bytes the pending save would reach (0 when opened from the Storage card).
   Going above 1 GB needs an explicit tick and asks the browser for permanent storage. Returns true when the
   limit now covers `needed`. */
async function openLimitDialog(needed) {
  const sp = await browserSpace();
  const cap = sp ? Math.floor(sp.quota * 0.9) : Infinity;
  const options = LIMIT_CHOICES.filter((g) => g * GB <= Math.max(cap, GB)).map((g) => [String(g), g + ' GB']);
  const cur = String(Math.round(lib.limit / GB));
  const text = [];
  if (needed) text.push(fmt('Total penyimpanan akan menjadi {a}, melewati batas {b}.', { a: fmtBytes(needed), b: fmtBytes(lib.limit) }));
  else text.push(fmt('Batas sekarang: {b}. Terpakai: {a}.', { a: fmtBytes(lib.usage), b: fmtBytes(lib.limit) }));
  text.push(tr('Batas di atas 1 GB butuh izinmu. Browser juga akan diminta menjaga data ini agar tidak dihapus otomatis.'));
  if (sp) text.push(fmt('Ruang yang diizinkan browser kira-kira {q}.', { q: fmtBytes(sp.quota) }));
  const r = await ssDialog({
    title: 'Batas penyimpanan', text,
    fields: [
      { kind: 'select', label: 'Batas baru', options, value: options.some((o) => o[0] === cur) ? cur : '1' },
      { kind: 'check', label: 'Saya mengerti: berkas yang disimpan memakai ruang disk di perangkat ini.' }
    ],
    validate: (v) => Number(v[0]) <= 1 || v[1],
    buttons: [{ label: 'Batal', value: 'no' }, { label: 'Izinkan', value: 'ok', primary: true, needs: true }]
  });
  if (!r || r.v !== 'ok') return false;
  const gb = Number(r.f[0]);
  if (gb > 1) {
    const persisted = await requestPersist();
    showToast(persisted ? 'Izin penyimpanan permanen diberikan' : 'Browser belum memberi izin penyimpanan permanen. Browser bisa menghapus data saat ruang hampir habis.', 4200);
  }
  lib.limit = gb * GB;
  await dbTx(['meta'], 'readwrite', (t) => t.objectStore('meta').put({ key: 'limit', value: lib.limit }));
  renderFiles();
  if (!needed) showToast('Batas penyimpanan diubah');
  return !needed || needed <= lib.limit;
}

/* true when `extra` bytes fit; otherwise (with prompt) asks for more room */
async function ensureRoom(extra, replaced, prompt) {
  await loadLibrary();
  const total = lib.usage - replaced + extra;
  if (total <= lib.limit) return true;
  if (!prompt) return false;
  const ok = await openLimitDialog(total);
  if (!ok) showToast('Ukuran terlalu besar untuk batas saat ini', 3000);
  return ok;
}

function storageError(e) {
  console.error(e);
  showToast(isQuotaError(e) ? 'Penyimpanan browser penuh. Hapus berkas lama atau kosongkan ruang disk.' : 'Gagal menyimpan', 4000);
}

/* ---------------------------------------------------------------- save / overwrite */
function defaultName(type) {
  return tr(ST_LABEL[type]) + ' ' + fmtClock(Date.now());
}
function describe(type, payload) {
  if (type === 'animation') {
    const f = payload.frames[0];
    return { frames: payload.frames.length, w: f ? f.w : 0, h: f ? f.h : 0 };
  }
  if (type === 'spritesheet') return { w: payload.w, h: payload.h, count: payload.meta ? payload.meta.count : 0 };
  return { glyphs: payload.glyphs.length, w: payload.w, h: payload.h };
}
function infoText(it) {
  const i = it.info || {};
  if (it.type === 'animation') return fmt('{n} frame', { n: i.frames }) + ' \u00b7 ' + i.w + '\u00d7' + i.h;
  if (it.type === 'spritesheet') return i.w + '\u00d7' + i.h + ' px' + (i.count ? ' \u00b7 ' + fmt('{n} frame', { n: i.count }) : '');
  return fmt('{n} huruf digambar', { n: i.glyphs }) + ' \u00b7 ' + i.w + '\u00d7' + i.h;
}

/* Gets the current work of one kind ready to store. Returns null (after telling the user) when there is nothing to save. */
async function prepare(type, progress) {
  if (type === 'animation') {
    if (!state.frames.length) { showToast('Belum ada frame untuk disimpan'); return null; }
    const sig = sigAnimation();
    const payload = await packAnimation(progress);
    return { payload, thumb: thumbOf(state.frames[0].canvas), sig, part: 'animation' };
  }
  if (type === 'spritesheet') {
    if (!state.exportSheet && state.frames.length) runBuildSheet();
    else if (state.exportSheet) ensureFreshSheet();
    if (!state.exportSheet) { showToast('Belum ada spritesheet. Bangun dulu di tab Spritesheet atau Gabung.', 3200); return null; }
    const payload = await packSheet();
    return { payload, thumb: thumbOf(state.exportSheet), sig: state.exportSource === 'merge' ? sigMerge() : null, part: state.exportSource === 'merge' ? 'merge' : null };
  }
  if (!fontHasContent()) { showToast('Font masih sama dengan font klasik'); return null; }
  return { payload: packFont(), thumb: fontThumb(), sig: sigFont(), part: 'font' };
}

function setWorking(on) {
  lib.working = on;
  document.querySelectorAll('#panel-files button').forEach((b) => { b.disabled = on; });
  if (!on) renderFiles();
}

async function writeItem(meta, payload) {
  await dbTx(['items', 'blobs'], 'readwrite', (t) => {
    t.objectStore('items').put(meta);
    t.objectStore('blobs').put({ id: meta.id, data: payload });
  });
}

function markSaved(prep) {
  if (prep && prep.part) rec.saved[prep.part] = prep.sig;
  persistRecoveryMeta();
}

async function saveCurrent(type, overwriteItem) {
  if (!lib.ok || lib.working) return;
  setWorking(true);
  let busy = null;
  try {
    await loadLibrary();
    let name, folderId, target = overwriteItem || null;
    if (target) {
      name = target.name; folderId = target.folder;
    } else {
      name = $('saveName').value.trim().slice(0, 60) || defaultName(type);
      folderId = $('saveFolder').value || ST_FOLDER[type];
      const dup = lib.items.find((i) => i.folder === folderId && i.type === type && i.name.toLowerCase() === name.toLowerCase());
      if (dup) {
        const r = await ssDialog({
          title: 'Timpa berkas?', text: tr('Sudah ada berkas dengan nama ini') + ': ' + name,
          buttons: [{ label: 'Batal', value: 'no' }, { label: 'Simpan salinan', value: 'copy' }, { label: 'Timpa', value: 'over', primary: true, danger: true }]
        });
        if (!r || r.v === 'no') return;
        if (r.v === 'over') target = dup;
        else {
          let k = 2;
          while (lib.items.some((i) => i.folder === folderId && i.type === type && i.name.toLowerCase() === (name + ' (' + k + ')').toLowerCase())) k++;
          name = name + ' (' + k + ')';
        }
      }
    }
    busy = busyStart('Menyimpan\u2026');
    const prep = await prepare(type, busy.set);
    busy.end(); busy = null;
    if (!prep) return;
    const size = payloadSize(prep.payload);
    if (!(await ensureRoom(size, target ? target.size || 0 : 0, true))) return;
    const now = Date.now();
    const meta = {
      id: target ? target.id : stUid(), type, folder: folderId, name,
      created: target ? target.created : now, updated: now, size,
      info: describe(type, prep.payload), thumb: prep.thumb
    };
    await writeItem(meta, prep.payload);
    markSaved(prep);
    await loadLibrary();
    if (!overwriteItem) $('saveName').value = '';
    showToast(target ? 'Diganti' : 'Tersimpan');
  } catch (e) {
    storageError(e);
  } finally {
    if (busy) busy.end();
    setWorking(false);
  }
}

/* ---------------------------------------------------------------- open */
async function openItem(it) {
  if (!lib.ok || lib.working) return;
  setWorking(true);
  let busy = null;
  try {
    const row = await dbGet('blobs', it.id);
    const d = row && row.data;
    if (!d || d.kind !== it.type) throw Object.assign(new Error('bad'), { bad: true });
    if (d.v > 1) { showToast('Berkas dibuat oleh versi yang lebih baru.', 3500); return; }

    if (it.type === 'animation') {
      let mode = 'replace';
      if (state.frames.length) {
        const unsaved = sigAnimation() !== rec.saved.animation;
        const r = await ssDialog({
          title: 'Ganti frame yang sekarang?',
          text: [fmt('{n} frame', { n: state.frames.length }) + (unsaved ? '. ' + tr('Perubahan yang belum disimpan akan hilang.') : '')],
          buttons: [{ label: 'Batal', value: 'no' }, { label: 'Tambahkan di akhir', value: 'append' }, { label: 'Ganti', value: 'replace', primary: true, danger: unsaved }]
        });
        if (!r || r.v === 'no') return;
        mode = r.v;
      }
      busy = busyStart('Membuka\u2026');
      const frames = await unpackFrames(d.frames, busy.set);
      busy.end(); busy = null;
      applyAnimation(frames, d.settings, mode);
      if (mode === 'replace') rec.saved.animation = sigAnimation();
    } else if (it.type === 'font') {
      if (fontHasContent() && sigFont() !== rec.saved.font) {
        const r = await ssDialog({
          title: 'Ganti font yang sekarang?', text: tr('Perubahan yang belum disimpan akan hilang.'),
          buttons: [{ label: 'Batal', value: 'no' }, { label: 'Ganti', value: 'replace', primary: true, danger: true }]
        });
        if (!r || r.v === 'no') return;
      }
      applyFont(d);
      rec.saved.font = sigFont();
    } else {
      let toMerge = false;
      const r = await ssDialog({
        title: it.name, text: infoText(it),
        buttons: [{ label: 'Batal', value: 'no' }, { label: 'Kirim ke Gabung', value: 'merge' }, { label: 'Buka', value: 'open', primary: true }]
      });
      if (!r || r.v === 'no') return;
      toMerge = r.v === 'merge';
      busy = busyStart('Membuka\u2026');
      const ok = await applySheet(d, toMerge);
      busy.end(); busy = null;
      if (!ok) return;
      if (d.source === 'merge') rec.saved.merge = sigMerge();
      showToast(toMerge ? 'Dikirim ke tab Gabung' : 'Berkas dibuka. Cek tab Spritesheet atau Export.', 3200);
      markActivity();
      return;
    }
    showToast('Dibuka');
    markActivity();
  } catch (e) {
    console.error(e);
    if (busy) { busy.end(); busy = null; }
    showToast(e && e.bad ? 'Berkas tidak bisa dibaca. Datanya mungkin rusak.' : 'Gagal membuka berkas', 3500);
    if (e && e.bad) { lib.working = false; await deleteItem(it); }
  } finally {
    if (busy) busy.end();
    setWorking(false);
  }
}

/* ---------------------------------------------------------------- rename / move / delete / folders */
async function renameItem(it) {
  const r = await ssDialog({
    title: 'Ubah nama berkas', fields: [{ kind: 'text', label: 'Nama berkas', value: it.name }],
    buttons: [{ label: 'Batal', value: 'no' }, { label: 'Simpan', value: 'ok', primary: true }]
  });
  const name = r && r.v === 'ok' ? r.f[0].trim().slice(0, 60) : '';
  if (!name || name === it.name) return;
  try {
    await dbTx(['items'], 'readwrite', (t) => t.objectStore('items').put(Object.assign({}, it, { name })));
    await loadLibrary(); renderFiles(); showToast('Nama diubah');
  } catch (e) { storageError(e); }
}
async function moveItem(it) {
  const r = await ssDialog({
    title: 'Pindahkan ke folder',
    fields: [{ kind: 'select', label: 'Folder', options: folderSorted().map((f) => [f.id, folderName(f)]), value: it.folder }],
    buttons: [{ label: 'Batal', value: 'no' }, { label: 'Pindah', value: 'ok', primary: true }]
  });
  if (!r || r.v !== 'ok' || r.f[0] === it.folder) return;
  try {
    await dbTx(['items'], 'readwrite', (t) => t.objectStore('items').put(Object.assign({}, it, { folder: r.f[0] })));
    await loadLibrary(); renderFiles(); showToast('Dipindahkan');
  } catch (e) { storageError(e); }
}
async function deleteItem(it, silent) {
  if (!silent) {
    const r = await ssDialog({
      title: 'Hapus berkas?', text: it.name,
      buttons: [{ label: 'Batal', value: 'no' }, { label: 'Hapus berkas', value: 'ok', primary: true, danger: true }]
    });
    if (!r || r.v !== 'ok') return;
  }
  try {
    await dbTx(['items', 'blobs'], 'readwrite', (t) => { t.objectStore('items').delete(it.id); t.objectStore('blobs').delete(it.id); });
    await loadLibrary(); renderFiles(); showToast('Dihapus');
  } catch (e) { storageError(e); }
}
async function overwriteWithCurrent(it) {
  const r = await ssDialog({
    title: 'Timpa berkas?', text: it.name,
    buttons: [{ label: 'Batal', value: 'no' }, { label: 'Timpa', value: 'ok', primary: true, danger: true }]
  });
  if (r && r.v === 'ok') await saveCurrent(it.type, it);
}

function folderNameTaken(name, exceptId) {
  const n = name.toLowerCase();
  return lib.folders.some((f) => f.id !== exceptId && folderName(f).toLowerCase() === n);
}
async function newFolder() {
  const r = await ssDialog({
    title: 'Folder baru', fields: [{ kind: 'text', label: 'Nama folder', value: '' }],
    buttons: [{ label: 'Batal', value: 'no' }, { label: 'Simpan', value: 'ok', primary: true }]
  });
  const name = r && r.v === 'ok' ? r.f[0].trim().slice(0, 40) : '';
  if (!name) return;
  if (folderNameTaken(name)) { showToast('Nama folder sudah dipakai'); return; }
  try {
    await dbTx(['folders'], 'readwrite', (t) => t.objectStore('folders').put({ id: stUid(), name, builtin: false, created: Date.now() }));
    await loadLibrary(); renderFiles(); showToast('Folder dibuat');
  } catch (e) { storageError(e); }
}
async function renameFolder(f) {
  const r = await ssDialog({
    title: 'Ubah nama folder', fields: [{ kind: 'text', label: 'Nama folder', value: f.name }],
    buttons: [{ label: 'Batal', value: 'no' }, { label: 'Simpan', value: 'ok', primary: true }]
  });
  const name = r && r.v === 'ok' ? r.f[0].trim().slice(0, 40) : '';
  if (!name || name === f.name) return;
  if (folderNameTaken(name, f.id)) { showToast('Nama folder sudah dipakai'); return; }
  try {
    await dbTx(['folders'], 'readwrite', (t) => t.objectStore('folders').put(Object.assign({}, f, { name })));
    await loadLibrary(); renderFiles(); showToast('Nama diubah');
  } catch (e) { storageError(e); }
}
async function deleteFolder(f) {
  const inside = itemsIn(f.id);
  const r = await ssDialog({
    title: 'Hapus folder?',
    text: [f.name, fmt('{n} berkas', { n: inside.length })],
    buttons: [{ label: 'Batal', value: 'no' }, { label: 'Hapus folder', value: 'ok', primary: true, danger: true }]
  });
  if (!r || r.v !== 'ok') return;
  try {
    await dbTx(['items', 'blobs', 'folders'], 'readwrite', (t) => {
      inside.forEach((it) => { t.objectStore('items').delete(it.id); t.objectStore('blobs').delete(it.id); });
      t.objectStore('folders').delete(f.id);
    });
    if (lib.cwd === f.id) lib.cwd = null;
    await loadLibrary(); renderFiles(); showToast('Dihapus');
  } catch (e) { storageError(e); }
}

/* ---------------------------------------------------------------- recovery mode (autosave) */
function sessionHasContent() {
  return state.frames.length > 0 || fontHasContent() || mergeSheetPresent();
}
function setRecStatus(key) { rec.status = key; renderAutosave(); }

function markActivity() {
  if (!lib.ok || !rec.enabled || rec.paused) return;
  rec.dirty = true;
  clearTimeout(rec.timer);
  rec.timer = setTimeout(autosave, AUTOSAVE_DELAY);
}

async function autosave() {
  if (!lib.ok || !rec.enabled || rec.paused || !rec.dirty) return;
  if (rec.busy || lib.working) { rec.timer = setTimeout(autosave, 3000); return; }
  rec.busy = true;
  rec.dirty = false;
  try {
    if (!sessionHasContent()) {
      if (lib.recMeta) {
        await dbTx(['blobs', 'meta'], 'readwrite', (t) => { t.objectStore('blobs').delete('recovery'); t.objectStore('meta').delete('recovery'); });
        lib.usage -= lib.recMeta.size || 0; lib.recMeta = null; rec.lastSig = null;
      }
      return;
    }
    const sigA = sigAnimation(), sigF = sigFont(), sigM = sigMerge();
    const sig = [sigA, sigF, sigM].join('|');
    if (sig === rec.lastSig) return;
    const data = { v: 1, anim: null, font: null, sheet: null, sheetSettings: sheetSettingsNow() };
    if (state.frames.length) data.anim = await packAnimation();
    if (fontHasContent()) data.font = packFont();
    if (mergeSheetPresent()) data.sheet = await packSheet();
    const size = payloadSize(data);
    const old = lib.recMeta ? lib.recMeta.size || 0 : 0;
    if (!(await ensureRoom(size, old, false))) { setRecStatus('Simpan otomatis dilewati: batas penyimpanan penuh'); return; }
    const now = Date.now();
    const meta = {
      key: 'recovery', time: now, size, sig,
      sigs: { animation: sigA, font: sigF, merge: sigM },
      saved: { animation: rec.saved.animation, font: rec.saved.font, merge: rec.saved.merge },
      info: { frames: state.frames.length, font: !!data.font, sheet: !!data.sheet }
    };
    await dbTx(['blobs', 'meta'], 'readwrite', (t) => {
      t.objectStore('blobs').put({ id: 'recovery', data });
      t.objectStore('meta').put(meta);
    });
    lib.recMeta = meta; lib.usage = lib.usage - old + size;
    rec.lastSig = sig; rec.lastTime = now;
    setRecStatus('Simpan otomatis aktif');
  } catch (e) {
    console.error(e);
    if (isQuotaError(e)) setRecStatus('Simpan otomatis dilewati: batas penyimpanan penuh');
  } finally {
    rec.busy = false;
  }
}

/* after a normal save: remember which parts are saved (cheap: only the small meta record is rewritten) */
async function persistRecoveryMeta() {
  try {
    const m = await dbGet('meta', 'recovery');
    if (!m) return;
    m.saved = { animation: rec.saved.animation, font: rec.saved.font, merge: rec.saved.merge };
    await dbTx(['meta'], 'readwrite', (t) => t.objectStore('meta').put(m));
    lib.recMeta = m;
  } catch (e) { /* not critical */ }
}

function unsavedParts(m) {
  const out = [];
  const s = m.sigs || {}, v = m.saved || {};
  if (s.animation && s.animation !== v.animation) out.push('animation');
  if (s.font && s.font !== v.font) out.push('font');
  if (s.merge && s.merge !== v.merge) out.push('merge');
  return out;
}
function recoveryText(m) {
  const bits = [];
  if (m.info && m.info.frames) bits.push(tr('Animasi') + ': ' + fmt('{n} frame', { n: m.info.frames }));
  if (m.info && m.info.font) bits.push(tr('Font'));
  if (m.info && m.info.sheet) bits.push(tr('Spritesheet'));
  return bits.join(' \u00b7 ') + ' \u00b7 ' + fmtDate(m.time);
}

async function restoreRecovery() {
  if (lib.working) return;
  setWorking(true);
  const busy = busyStart('Memulihkan\u2026');
  try {
    const row = await dbGet('blobs', 'recovery');
    const m = lib.recMeta || (await dbGet('meta', 'recovery'));
    const d = row && row.data;
    if (!d || !m) throw new Error('missing');
    if (d.anim) {
      const frames = await unpackFrames(d.anim.frames, busy.set);
      applyAnimation(frames, d.anim.settings, 'replace');
    }
    if (d.font) applyFont(d.font);
    if (d.sheet) await applySheet(d.sheet, false);
    else if (d.anim && d.sheetSettings && state.frames.length) { try { buildAndShowSheet(d.sheetSettings); } catch (e) { /* ignore */ } }
    // parts that were already saved when the snapshot was taken still match their saved copy
    const sv = m.saved || {}, sg = m.sigs || {};
    rec.saved.animation = sg.animation && sg.animation === sv.animation ? sigAnimation() : sv.animation;
    rec.saved.font = sg.font && sg.font === sv.font ? sigFont() : sv.font;
    rec.saved.merge = sg.merge && sg.merge === sv.merge ? sigMerge() : sv.merge;
    rec.paused = false; rec.lastSig = null;
    showToast('Sesi dipulihkan');
    markActivity();
  } catch (e) {
    console.error(e);
    showToast('Gagal membuka berkas', 3500);
  } finally {
    busy.end();
    setWorking(false);
  }
}
async function discardRecovery() {
  try {
    await dbTx(['blobs', 'meta'], 'readwrite', (t) => { t.objectStore('blobs').delete('recovery'); t.objectStore('meta').delete('recovery'); });
    rec.paused = false; rec.lastSig = null;
    await loadLibrary(); renderFiles();
    showToast('Sesi pemulihan dibuang');
  } catch (e) { storageError(e); }
}

/* shown once at start-up when the last session left work that was never saved */
async function recoveryPrompt() {
  const m = lib.recMeta;
  if (!m || !unsavedParts(m).length) { rec.enabled = true; return; }
  const r = await ssDialog({
    title: 'Pekerjaan yang belum disimpan ditemukan', text: recoveryText(m), persistent: true,
    buttons: [{ label: 'Buang', value: 'drop', danger: true }, { label: 'Lewati', value: 'skip' }, { label: 'Pulihkan', value: 'restore', primary: true }]
  });
  rec.enabled = true;
  if (r.v === 'restore') await restoreRecovery();
  else if (r.v === 'drop') await discardRecovery();
  else {
    rec.paused = true;                 // keep the snapshot safe until the user decides in the Save / Load tab
    showToast('Simpan otomatis dijeda', 3500);
  }
}

/* ---------------------------------------------------------------- the Save / Load tab */
function renderAutosave() {
  const el = $('autosaveStatus');
  if (!el) return;
  let t;
  if (!lib.ok) t = tr('Simpan otomatis tidak tersedia');
  else if (rec.paused) t = tr('Simpan otomatis dijeda');
  else t = tr(rec.status || 'Simpan otomatis aktif') + (rec.lastTime ? ' \u00b7 ' + fmtClock(rec.lastTime) : '');
  el.textContent = t;
}

function renderSaveHint() {
  const sheet = state.exportSheet ? 'ada' : (state.frames.length ? 'ada' : 'belum ada');
  const font = fontHasContent() ? 'diubah' : 'masih klasik';
  $('saveHint').textContent = tr('Yang bisa disimpan sekarang') + ': ' + tr('Animasi') + ' \u2014 ' +
    (state.frames.length ? fmt('{n} frame', { n: state.frames.length }) : tr('belum ada')) + '; ' + tr('Spritesheet') + ' \u2014 ' + tr(sheet) + '; ' + tr('Font') + ' \u2014 ' + tr(font) + '.';
  $('saveAnimBtn').disabled = lib.working || !lib.ok || !state.frames.length;
  $('saveSheetBtn').disabled = lib.working || !lib.ok || !(state.exportSheet || state.frames.length);
  $('saveFontBtn').disabled = lib.working || !lib.ok;
}

function folderIcon() {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', 'M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2.2h8.8A1.5 1.5 0 0 1 21 8.7v8.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z');
  s.appendChild(p);
  return s;
}
function smallBtn(label, fn, extra) {
  const b = stEl('button', 'btn btn-secondary btn-sm' + (extra ? ' ' + extra : ''), tr(label));
  b.type = 'button';
  b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  return b;
}

function renderFiles() {
  if (!$('panel-files')) return;
  const unavailable = !lib.ok;
  $('filesError').hidden = !unavailable;
  $('filesMain').hidden = unavailable;
  if (unavailable) { renderAutosave(); renderSaveHint(); return; }

  // recovery card (only while autosave is paused waiting for a decision)
  const showRec = rec.paused && lib.recMeta;
  $('filesRecoverCard').hidden = !showRec;
  if (showRec) $('filesRecoverText').textContent = recoveryText(lib.recMeta);

  // folder select in the Save card
  const sel = $('saveFolder'), keep = sel.value;
  sel.textContent = '';
  const auto = document.createElement('option'); auto.value = ''; auto.textContent = tr('Otomatis (folder sesuai jenis)'); sel.appendChild(auto);
  folderSorted().forEach((f) => { const o = document.createElement('option'); o.value = f.id; o.textContent = folderName(f); sel.appendChild(o); });
  sel.value = Array.from(sel.options).some((o) => o.value === keep) ? keep : '';

  // file manager
  if (lib.cwd && !lib.folders.some((f) => f.id === lib.cwd)) lib.cwd = null;
  const cwd = lib.folders.find((f) => f.id === lib.cwd) || null;
  $('fmUp').hidden = !cwd;
  $('fmNewFolder').hidden = !!cwd;
  const path = $('fmPath');
  path.textContent = '';
  path.appendChild(stEl('span', 'fm-crumb', tr('Semua Folder')));
  if (cwd) path.appendChild(stEl('b', 'fm-crumb', ' \u203a ' + folderName(cwd)));
  const list = $('fmList');
  list.textContent = '';
  if (!cwd) {
    folderSorted().forEach((f) => {
      const items = itemsIn(f.id);
      const row = stEl('div', 'fm-row fm-folder');
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      const open = () => { lib.cwd = f.id; renderFiles(); };
      row.addEventListener('click', open);
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      const ic = stEl('span', 'fm-ic'); ic.appendChild(folderIcon());
      const info = stEl('span', 'fm-info');
      info.appendChild(stEl('b', 'fm-name', folderName(f)));
      info.appendChild(stEl('span', 'fm-sub', fmt('{n} berkas', { n: items.length }) + ' \u00b7 ' + fmtBytes(items.reduce((a, i) => a + (i.size || 0), 0))));
      row.appendChild(ic); row.appendChild(info);
      if (!f.builtin) {
        const acts = stEl('span', 'fm-acts');
        acts.appendChild(smallBtn('Ubah nama', () => renameFolder(f)));
        acts.appendChild(smallBtn('Hapus folder', () => deleteFolder(f)));
        row.appendChild(acts);
      }
      list.appendChild(row);
    });
  } else {
    const items = itemsIn(cwd.id).sort((a, b) => b.updated - a.updated);
    if (!items.length) list.appendChild(stEl('p', 'hint', tr('Folder ini masih kosong.')));
    items.forEach((it) => {
      const row = stEl('div', 'fm-row fm-file');
      const th = document.createElement('img');
      th.className = 'fm-thumb checker-bg'; th.alt = ''; th.src = it.thumb || '';
      const info = stEl('span', 'fm-info');
      info.appendChild(stEl('b', 'fm-name', it.name));
      info.appendChild(stEl('span', 'fm-sub', tr(ST_LABEL[it.type]) + ' \u00b7 ' + infoText(it)));
      info.appendChild(stEl('span', 'fm-sub', fmtBytes(it.size || 0) + ' \u00b7 ' + fmtDate(it.updated)));
      const acts = stEl('span', 'fm-acts');
      const open = smallBtn('Buka', () => openItem(it), 'btn-primary');
      acts.appendChild(open);
      acts.appendChild(smallBtn('Timpa', () => overwriteWithCurrent(it)));
      acts.appendChild(smallBtn('Ubah nama', () => renameItem(it)));
      acts.appendChild(smallBtn('Pindah', () => moveItem(it)));
      acts.appendChild(smallBtn('Hapus berkas', () => deleteItem(it)));
      row.appendChild(th); row.appendChild(info); row.appendChild(acts);
      list.appendChild(row);
    });
  }

  // storage card
  const pct = lib.limit ? Math.min(100, Math.round(lib.usage * 100 / lib.limit)) : 0;
  $('storageFill').style.width = pct + '%';
  $('storageFill').classList.toggle('warn', pct >= 90);
  $('storageLabel').textContent = pct + '%';
  $('storageText').textContent = fmt('Terpakai {a} dari batas {b}.', { a: fmtBytes(lib.usage), b: fmtBytes(lib.limit) });
  renderAutosave();
  renderSaveHint();
}

async function refreshLibrary() {
  if (!lib.ok) { renderFiles(); return; }
  try { await loadLibrary(); } catch (e) { console.error(e); }
  renderFiles();
  browserSpace().then((sp) => {
    if (!sp) { $('storageSpace').textContent = ''; return; }
    $('storageSpace').textContent = fmt('Ruang yang diizinkan browser kira-kira {q}, terpakai {u}.', { q: fmtBytes(sp.quota), u: fmtBytes(sp.usage) });
  });
}

/* ---------------------------------------------------------------- start-up */
Object.assign(EN, {
  'Total penyimpanan akan menjadi {a}, melewati batas {b}.': 'Total storage would become {a}, over the {b} limit.',
  'Batas sekarang: {b}. Terpakai: {a}.': 'Current limit: {b}. Used: {a}.',
  'Batas di atas 1 GB butuh izinmu. Browser juga akan diminta menjaga data ini agar tidak dihapus otomatis.': 'A limit above 1 GB needs your permission. The browser will also be asked to keep this data from being deleted automatically.',
  'Ruang yang diizinkan browser kira-kira {q}.': 'The browser allows roughly {q}.',
  'Terpakai {a} dari batas {b}.': 'Used {a} of the {b} limit.',
  'Ruang yang diizinkan browser kira-kira {q}, terpakai {u}.': 'The browser allows roughly {q}, {u} in use.',
  'Pulihkan sesi terakhir yang disimpan otomatis. Simpan otomatis dijeda sampai kamu memilih.': 'Restore the last autosaved session. Autosave is paused until you choose.',
  'Berkas disimpan di browser ini, bukan di server. Menghapus data situs di browser akan menghapusnya juga.': 'Files are kept in this browser, not on a server. Clearing the site data in the browser removes them too.'
});

async function initStorage() {
  // buttons
  $('saveAnimBtn').addEventListener('click', () => saveCurrent('animation'));
  $('saveSheetBtn').addEventListener('click', () => saveCurrent('spritesheet'));
  $('saveFontBtn').addEventListener('click', () => saveCurrent('font'));
  $('fmUp').addEventListener('click', () => { lib.cwd = null; renderFiles(); });
  $('fmNewFolder').addEventListener('click', newFolder);
  $('storageRaiseBtn').addEventListener('click', () => openLimitDialog(0));
  $('filesRecoverBtn').addEventListener('click', restoreRecovery);
  $('filesRecoverDropBtn').addEventListener('click', discardRecovery);
  $('filesRetryBtn').addEventListener('click', () => location.reload());
  document.querySelector('.tab-btn[data-tab="files"]').addEventListener('click', refreshLibrary);
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setTimeout(renderFiles, 0)));

  // anything that may change the work schedules an autosave
  ['pointerup', 'keyup', 'change', 'input', 'drop'].forEach((ev) => document.addEventListener(ev, markActivity, true));
  const origChanged = framesChanged;
  framesChanged = function () { origChanged.apply(this, arguments); markActivity(); };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && rec.dirty) { clearTimeout(rec.timer); autosave(); }
  });
  window.addEventListener('pagehide', () => { if (rec.dirty) autosave(); });

  applyLang();
  try {
    await dbOpen();
    await loadLibrary();
    lib.ok = true;
    renderFiles();
    await recoveryPrompt();
    renderFiles();
  } catch (e) {
    console.error(e);
    lib.ok = false;
    renderFiles();
  }
}

initStorage();
