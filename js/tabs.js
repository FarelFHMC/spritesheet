'use strict';

/* Spritesheet Studio v2.7.5 - tabs: frame lists, import, encoders, export, merge, frame size, event wiring
   Made by Farelfhmc - Studio Fhilion. MIT License.
   Part 2 of 4. Classic script: shares one global scope with the other js/ files, so keep the load order from index.html. */

/* =========================================================================
   FRAME LIST RENDERING (import strip + editor grid)
   ========================================================================= */
function refreshAllFrameViews() {
  $('importFrameCount').textContent = state.frames.length;
  renderFrameStrip($('importFrameStrip'));
  renderFrameGrid($('editorFrameGrid'));
  updateFrameSizeInfo();
  if ($('panel-paint').classList.contains('active')) renderPaintPicker();
}

/* Call after any change to the frame list or to frame pixels. A sheet built earlier no longer
   matches the frames, so Export rebuilds it before downloading. */
function framesChanged() {
  state.sheetStale = true;
  state.thumbsDirty = false;
  refreshAllFrameViews();
}

function renderFrameStrip(container) {
  container.innerHTML = '';
  state.frames.forEach((f) => {
    const div = document.createElement('div');
    div.className = 'frame-thumb';
    div.appendChild(makeThumbCanvas(f.canvas, 76));
    container.appendChild(div);
  });
}

function moveFrame(from, to) {
  if (isNaN(from) || isNaN(to) || from === to || to < 0 || to >= state.frames.length) return;
  const [item] = state.frames.splice(from, 1);
  state.frames.splice(to, 0, item);
  framesChanged();
}

/* Size for a new empty frame: same as the frame being worked on, else the Spritesheet tab's size. */
function newFrameSize() {
  const fx = frameSizeFields();
  if ($('fsNewUse').checked && fx) return fx;
  const ref = paintFrame() || state.frames[state.frames.length - 1];
  if (ref) return { w: ref.canvas.width, h: ref.canvas.height };
  return { w: parseInt($('sheetFrameW').value, 10) || 128, h: parseInt($('sheetFrameH').value, 10) || 128 };
}

/* Adds a fully transparent frame at position `at` (default: the end) and returns it. */
function addEmptyFrame(at) {
  const sz = newFrameSize();
  const c = document.createElement('canvas');
  c.width = sz.w;
  c.height = sz.h;
  const fr = { id: nextId(), canvas: c };
  const pos = at == null ? state.frames.length : Math.max(0, Math.min(at, state.frames.length));
  state.frames.splice(pos, 0, fr);
  framesChanged();
  showToast('Frame kosong ditambahkan');
  return fr;
}

async function addImageFiles(files) {
  const imgs = files.filter((f) => f.type && f.type.startsWith('image/'));
  if (!imgs.length) { showToast('Format file tidak didukung'); return; }
  let added = 0;
  for (const f of imgs) {
    try { state.frames.push({ id: nextId(), canvas: await imageFileToCanvas(f) }); added++; } catch (e) { /* skip unreadable file */ }
  }
  framesChanged();
  showToast(added ? tr('{n} frame ditambahkan', added) : 'Format file tidak didukung');
}

/* Pointer-based drag to reorder, so it works with mouse, touch and pen (native HTML5 drag does not
   work on touch screens). Mouse: drag after a few pixels. Touch: press and hold briefly first, so
   normal scrolling still works. */
let frameDragActive = false;
window.addEventListener('touchmove', (e) => { if (frameDragActive && e.cancelable) e.preventDefault(); }, { passive: false });

function startFrameDrag(e, card, f, index, container) {
  if (e.target.closest('button')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const pid = e.pointerId, sx = e.clientX, sy = e.clientY, touch = e.pointerType !== 'mouse';
  let on = false, ghost = null, over = index, timer = 0, scroller = 0, lx = sx, ly = sy, ox = 0, oy = 0;
  const cards = () => Array.from(container.children);
  const clearOver = () => cards().forEach((c) => c.classList.remove('drag-over'));
  const place = () => { ghost.style.left = (lx - ox) + 'px'; ghost.style.top = (ly - oy) + 'px'; };
  const updateOver = () => {
    const el = document.elementFromPoint(lx, ly);
    const c = el && el.closest ? el.closest('.frame-card') : null;
    clearOver();
    if (c && c.parentNode === container) { over = cards().indexOf(c); c.classList.add('drag-over'); }
  };
  const edgeScroll = () => {
    const top = $('topbar').offsetHeight + 60;
    if (ly < top) window.scrollBy(0, -12);
    else if (ly > window.innerHeight - 70) window.scrollBy(0, 12);
    updateOver();
  };
  const begin = () => {
    on = true;
    frameDragActive = true;
    card.classList.add('dragging');
    const r = card.getBoundingClientRect();
    ox = sx - r.left; oy = sy - r.top;
    ghost = document.createElement('div');
    ghost.className = 'frame-ghost';
    ghost.style.width = r.width + 'px';
    ghost.style.height = r.height + 'px';
    ghost.appendChild(makeThumbCanvas(f.canvas, 84));
    document.body.appendChild(ghost);
    place();
    scroller = setInterval(edgeScroll, 40);
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (err) { /* optional */ }
  };
  const cleanup = () => {
    clearTimeout(timer);
    clearInterval(scroller);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', cleanup);
    if (ghost) ghost.remove();
    card.classList.remove('dragging');
    clearOver();
    frameDragActive = false;
  };
  function onMove(ev) {
    if (ev.pointerId !== pid) return;
    lx = ev.clientX; ly = ev.clientY;
    if (!on) {
      if (Math.hypot(lx - sx, ly - sy) > (touch ? 10 : 4)) { if (touch) cleanup(); else begin(); }
      return;
    }
    place();
    updateOver();
  }
  function onUp(ev) {
    if (ev.pointerId !== pid) return;
    const was = on, to = over;
    cleanup();
    if (was && to !== index) moveFrame(index, to);
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', cleanup);
  if (touch) timer = setTimeout(begin, 220);
}

function renderFrameGrid(container) {
  container.innerHTML = '';
  state.frames.forEach((f, index) => {
    const card = document.createElement('div');
    card.className = 'frame-card';

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'frame-thumb';
    thumbWrap.appendChild(makeThumbCanvas(f.canvas, 84));
    card.appendChild(thumbWrap);

    const idxLabel = document.createElement('span');
    idxLabel.className = 'frame-index';
    idxLabel.textContent = String(index);
    card.appendChild(idxLabel);

    const delBtn = document.createElement('button');
    delBtn.className = 'frame-del';
    delBtn.type = 'button';
    delBtn.title = tr('Hapus frame');
    delBtn.textContent = '\u00d7';
    delBtn.addEventListener('click', () => {
      state.frames = state.frames.filter((x) => x.id !== f.id);
      framesChanged();
    });
    card.appendChild(delBtn);

    // Arrow buttons: an extra way to reorder besides dragging
    const moveWrap = document.createElement('div');
    moveWrap.style.cssText = 'position:absolute;bottom:2px;right:2px;display:flex;gap:2px;';
    const leftBtn = document.createElement('button');
    leftBtn.type = 'button';
    leftBtn.className = 'frame-del';
    leftBtn.style.position = 'static';
    leftBtn.title = tr('Pindah ke kiri');
    leftBtn.textContent = '\u25c0';
    leftBtn.addEventListener('click', () => moveFrame(index, index - 1));
    const rightBtn = document.createElement('button');
    rightBtn.type = 'button';
    rightBtn.className = 'frame-del';
    rightBtn.style.position = 'static';
    rightBtn.title = tr('Pindah ke kanan');
    rightBtn.textContent = '\u25b6';
    rightBtn.addEventListener('click', () => moveFrame(index, index + 1));
    moveWrap.appendChild(leftBtn);
    moveWrap.appendChild(rightBtn);
    card.appendChild(moveWrap);

    card.addEventListener('pointerdown', (e) => startFrameDrag(e, card, f, index, container));
    card.addEventListener('contextmenu', (e) => e.preventDefault());

    container.appendChild(card);
  });
}

/* =========================================================================
   IMPORT TAB WIRING
   ========================================================================= */
function resetImportUI() {
  $('mediaPreviewCard').hidden = true;
  $('videoMeta').hidden = true;
  $('videoSettingsCard').hidden = true;
  $('gifSettingsCard').hidden = true;
  $('imageSettingsCard').hidden = true;
  $('videoPreview').hidden = true;
  $('imagePreview').hidden = true;
}

async function handleIncomingFile(file) {
  if (!file) return;
  resetImportUI();
  if (file.type.startsWith('video/')) {
    await setupVideoPreview(file);
  } else if (file.type === 'image/gif') {
    setupGifPreview(file);
  } else if (file.type.startsWith('image/')) {
    setupImagePreview(file);
  } else {
    showToast('Format file tidak didukung');
  }
}

async function setupVideoPreview(file) {
  const url = URL.createObjectURL(file);
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = url;
  currentFile = file;
  currentMediaType = 'video';

  const video = $('videoPreview');
  video.src = url;
  video.hidden = false;

  await new Promise((resolve) => {
    video.addEventListener('loadedmetadata', resolve, { once: true });
    video.addEventListener('error', () => { showToast('Format file tidak didukung'); resolve(); }, { once: true });
  });

  $('mediaPreviewCard').hidden = false;
  $('videoMeta').hidden = false;
  $('metaDuration').textContent = formatDuration(video.duration);
  $('metaResolution').textContent = video.videoWidth + '\u00d7' + video.videoHeight;
  $('videoSettingsCard').hidden = false;
  updateEstimatedFrames();
}

function setupGifPreview(file) {
  const url = URL.createObjectURL(file);
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = url;
  currentFile = file;
  currentMediaType = 'gif';

  const img = $('imagePreview');
  img.src = url;
  img.hidden = false;
  $('mediaPreviewCard').hidden = false;
  $('gifSettingsCard').hidden = false;
}

function setupImagePreview(file) {
  const url = URL.createObjectURL(file);
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = url;
  currentFile = file;
  currentMediaType = 'image';

  const img = $('imagePreview');
  img.src = url;
  img.hidden = false;
  $('mediaPreviewCard').hidden = false;
  $('imageSettingsCard').hidden = false;
}

function updateEstimatedFrames() {
  const video = $('videoPreview');
  if (!video.duration) return;
  const mode = $('extractMode').value;
  const fps = parseFloat($('extractFps').value) || 1;
  const interval = parseFloat($('extractInterval').value) || 0.1;
  const start = parseFloat($('extractStart').value) || 0;
  const endRaw = $('extractEnd').value;
  const end = endRaw ? parseFloat(endRaw) : video.duration;
  const maxFrames = parseInt($('extractMaxFrames').value, 10) || 1;
  const est = buildTimestamps(video.duration, { mode, fps, interval, start, end: endRaw ? end : null, maxFrames }).length;
  $('metaEstFrames').textContent = String(est);
}

/* =========================================================================
   ANIMATION ENCODERS (no DOM, no libraries)
   GIF: own palette + LZW encoder. WebP: muxes per-frame WebP files into one animated WebP.
   MP4: muxes H.264 samples (from WebCodecs) into an MP4 file.
   ========================================================================= */

/* Small growable byte buffer */
function ByteWriter(initial) {
  this.buf = new Uint8Array(initial || 1024);
  this.len = 0;
}
ByteWriter.prototype.ensure = function (n) {
  if (this.len + n <= this.buf.length) return;
  let cap = this.buf.length * 2;
  while (cap < this.len + n) cap *= 2;
  const nb = new Uint8Array(cap);
  nb.set(this.buf.subarray(0, this.len));
  this.buf = nb;
};
ByteWriter.prototype.u8 = function (v) { this.ensure(1); this.buf[this.len++] = v & 255; };
ByteWriter.prototype.u16le = function (v) { this.u8(v); this.u8(v >> 8); };
ByteWriter.prototype.bytes = function (arr) { this.ensure(arr.length); this.buf.set(arr, this.len); this.len += arr.length; };
ByteWriter.prototype.ascii = function (s) { for (let i = 0; i < s.length; i++) this.u8(s.charCodeAt(i)); };
ByteWriter.prototype.result = function () { return this.buf.slice(0, this.len); };

/* ---- GIF ---------------------------------------------------------------- */

/* Builds one palette (max 255 colors; index 0 is kept free as the transparent index) for all
   frames. Few colors (pixel art): the exact colors. Many colors: median cut on a 15-bit histogram.
   Returns { colors: [[r,g,b]...], indexOf(r,g,b) -> 0-based color index }. Only pixels with
   alpha >= 128 count. */
function gifBuildPalette(datas) {
  const MAXC = 255;
  const exact = new Map();
  let overflow = false;
  for (let f = 0; f < datas.length && !overflow; f++) {
    const d = datas[f];
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      if (!exact.has(key)) {
        if (exact.size >= MAXC) { overflow = true; break; }
        exact.set(key, exact.size);
      }
    }
  }
  if (!overflow) {
    const colors = new Array(exact.size);
    exact.forEach((idx, key) => { colors[idx] = [(key >> 16) & 255, (key >> 8) & 255, key & 255]; });
    return { colors, indexOf: (r, g, b) => exact.get((r << 16) | (g << 8) | b) };
  }

  // Histogram with 5 bits per channel
  const cnt = new Float64Array(32768), sr = new Float64Array(32768), sg = new Float64Array(32768), sb = new Float64Array(32768);
  for (let f = 0; f < datas.length; f++) {
    const d = datas[f];
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      const bin = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
      cnt[bin]++; sr[bin] += d[i]; sg[bin] += d[i + 1]; sb[bin] += d[i + 2];
    }
  }
  const all = [];
  for (let b = 0; b < 32768; b++) if (cnt[b] > 0) all.push(b);
  const chan = (bin, c) => c === 0 ? (bin >> 10) & 31 : c === 1 ? (bin >> 5) & 31 : bin & 31;

  const makeBox = (bins) => {
    let pop = 0; const lo = [31, 31, 31], hi = [0, 0, 0];
    for (const b of bins) {
      pop += cnt[b];
      for (let c = 0; c < 3; c++) { const v = chan(b, c); if (v < lo[c]) lo[c] = v; if (v > hi[c]) hi[c] = v; }
    }
    let ch = 0, range = hi[0] - lo[0];
    for (let c = 1; c < 3; c++) if (hi[c] - lo[c] > range) { range = hi[c] - lo[c]; ch = c; }
    return { bins, pop, ch, range };
  };

  const boxes = [makeBox(all)];
  while (boxes.length < MAXC) {
    let best = -1, bestScore = -1;
    for (let i = 0; i < boxes.length; i++) {
      const bx = boxes[i];
      if (bx.bins.length < 2) continue;
      const score = bx.pop * (bx.range + 1);
      if (score > bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) break;
    const bx = boxes[best];
    const ch = bx.ch;
    bx.bins.sort((a, b) => chan(a, ch) - chan(b, ch));
    let acc = 0, cut = 1;
    const half = bx.pop / 2;
    for (let i = 0; i < bx.bins.length - 1; i++) {
      acc += cnt[bx.bins[i]];
      cut = i + 1;
      if (acc >= half) break;
    }
    boxes[best] = makeBox(bx.bins.slice(0, cut));
    boxes.push(makeBox(bx.bins.slice(cut)));
  }

  const colors = [];
  const lut = new Int16Array(32768).fill(-1);
  boxes.forEach((bx, bi) => {
    let n = 0, r = 0, g = 0, b = 0;
    for (const bin of bx.bins) { n += cnt[bin]; r += sr[bin]; g += sg[bin]; b += sb[bin]; lut[bin] = bi; }
    colors.push([Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
  });
  return { colors, indexOf: (r, g, b) => lut[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)] };
}

/* GIF variant of LZW. indices: Uint8Array of palette indices, minCode: initial code size (2..8).
   Returns the packed bytes (not yet split in 255-byte blocks). */
function gifLzw(indices, minCode) {
  const clear = 1 << minCode, eoi = clear + 1;
  const out = new ByteWriter(Math.max(256, indices.length >> 1));
  let cur = 0, shift = 0, size = minCode + 1, next = eoi + 1;
  const emit = (code) => {
    cur |= code << shift;
    shift += size;
    while (shift >= 8) { out.u8(cur & 255); cur >>>= 8; shift -= 8; }
  };
  let table = new Map();
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const hit = table.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next === 4096) {
      emit(clear);
      table = new Map();
      next = eoi + 1;
      size = minCode + 1;
    } else {
      if (next >= (1 << size)) size++;
      table.set(key, next++);
    }
    prefix = k;
  }
  emit(prefix);
  // The decoder adds one more entry after the last data code, so it may widen before reading EOI
  if (next < 4096 && next >= (1 << size) && size < 12) size++;
  emit(eoi);
  if (shift > 0) out.u8(cur & 255);
  return out.result();
}

/* frames: [{ data: Uint8ClampedArray RGBA, delay: centiseconds }], w, h.
   opts: { transparent: bool, loop: bool, progress: optional async (done, total) => void }.
   transparent = true: pixels with alpha < 128 are see-through, every frame replaces the last.
   transparent = false: (the frames are fully opaque) only the changed area of each frame is stored. */
async function encodeGif(frames, w, h, opts) {
  const transparent = !!opts.transparent;
  const pal = gifBuildPalette(frames.map((f) => f.data));
  const total = pal.colors.length + 1;                 // + transparent index 0
  let bits = 1;
  while ((1 << bits) < total) bits++;
  const minCode = Math.max(2, bits);
  const out = new ByteWriter(1 << 16);

  out.ascii('GIF89a');
  out.u16le(w); out.u16le(h);
  out.u8(0x80 | 0x70 | (bits - 1));                    // global table, 8-bit color, size
  out.u8(0); out.u8(0);
  out.u8(0); out.u8(0); out.u8(0);                     // index 0 (transparent, color unused)
  for (let i = 0; i < pal.colors.length; i++) { const c = pal.colors[i]; out.u8(c[0]); out.u8(c[1]); out.u8(c[2]); }
  for (let i = total; i < (1 << bits); i++) { out.u8(0); out.u8(0); out.u8(0); }

  if (opts.loop) {
    out.u8(0x21); out.u8(0xFF); out.u8(11); out.ascii('NETSCAPE2.0');
    out.u8(3); out.u8(1); out.u16le(0); out.u8(0);     // loop forever
  }

  let prev = null;
  const pixels = w * h;
  for (let f = 0; f < frames.length; f++) {
    const d = frames[f].data;
    const idx = new Uint8Array(pixels);
    for (let p = 0, i = 0; p < pixels; p++, i += 4) {
      idx[p] = d[i + 3] < 128 ? 0 : pal.indexOf(d[i], d[i + 1], d[i + 2]) + 1;
    }

    let x = 0, y = 0, fw = w, fh = h, data = idx;
    if (!transparent && prev) {
      let minX = w, minY = h, maxX = -1, maxY = -1;
      for (let yy = 0; yy < h; yy++) {
        const row = yy * w;
        for (let xx = 0; xx < w; xx++) {
          if (idx[row + xx] !== prev[row + xx]) {
            if (xx < minX) minX = xx; if (xx > maxX) maxX = xx;
            if (yy < minY) minY = yy; if (yy > maxY) maxY = yy;
          }
        }
      }
      if (maxX < 0) {                                  // nothing changed: one transparent pixel
        x = 0; y = 0; fw = 1; fh = 1; data = new Uint8Array(1);
      } else {
        x = minX; y = minY; fw = maxX - minX + 1; fh = maxY - minY + 1;
        data = new Uint8Array(fw * fh);
        for (let yy = 0; yy < fh; yy++) {
          for (let xx = 0; xx < fw; xx++) {
            const v = idx[(y + yy) * w + x + xx];
            data[yy * fw + xx] = v === prev[(y + yy) * w + x + xx] ? 0 : v;
          }
        }
      }
    }
    prev = idx;

    out.u8(0x21); out.u8(0xF9); out.u8(4);
    out.u8(((transparent ? 2 : 1) << 2) | 1);          // disposal (2 = clear, 1 = keep) + transparent flag
    out.u16le(Math.max(2, frames[f].delay | 0));
    out.u8(0); out.u8(0);

    out.u8(0x2C); out.u16le(x); out.u16le(y); out.u16le(fw); out.u16le(fh); out.u8(0);
    out.u8(minCode);
    const lzw = gifLzw(data, minCode);
    for (let p = 0; p < lzw.length; p += 255) {
      const n = Math.min(255, lzw.length - p);
      out.u8(n);
      out.bytes(lzw.subarray(p, p + n));
    }
    out.u8(0);
    if (opts.progress) await opts.progress(f + 1, frames.length);
  }
  out.u8(0x3B);
  return out.result();
}

/* ---- Animated WebP ------------------------------------------------------- */

/* Returns the image chunks (ALPH / VP8 / VP8L, with their headers and padding) of a still WebP file. */
function webpImageChunks(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
  if (bytes.length < 20 || tag(0) !== 'RIFF' || tag(8) !== 'WEBP') throw new Error('webp-unsupported');
  const parts = [];
  let o = 12;
  while (o + 8 <= bytes.length) {
    const id = tag(o);
    const size = dv.getUint32(o + 4, true);
    const end = Math.min(bytes.length, o + 8 + size + (size & 1));
    if (id === 'ALPH' || id === 'VP8 ' || id === 'VP8L') parts.push(bytes.subarray(o, end));
    o = end;
  }
  if (!parts.length) throw new Error('webp-unsupported');
  return parts;
}

/* stills: Uint8Array[] (one WebP file per animation frame), delays in ms, all frames w x h.
   loop: 0 = forever, n = n times. */
function muxAnimatedWebp(stills, w, h, delays, loop, hasAlpha) {
  const u24 = (wr, v) => { wr.u8(v); wr.u8(v >> 8); wr.u8(v >> 16); };
  const u32 = (wr, v) => { wr.u16le(v & 0xFFFF); wr.u16le((v >>> 16) & 0xFFFF); };
  const body = new ByteWriter(1 << 16);
  body.ascii('WEBP');
  body.ascii('VP8X'); u32(body, 10);
  body.u8(0x02 | (hasAlpha ? 0x10 : 0)); body.u8(0); body.u8(0); body.u8(0);
  u24(body, w - 1); u24(body, h - 1);
  body.ascii('ANIM'); u32(body, 6);
  u32(body, 0);                                        // background color (transparent black)
  body.u16le(loop);
  for (let i = 0; i < stills.length; i++) {
    const parts = webpImageChunks(stills[i]);
    let dataLen = 0;
    for (const p of parts) dataLen += p.length;
    body.ascii('ANMF'); u32(body, 16 + dataLen);
    u24(body, 0); u24(body, 0);                        // x / 2, y / 2
    u24(body, w - 1); u24(body, h - 1);
    u24(body, Math.max(1, delays[i] | 0));
    body.u8(0x02);                                     // do not blend, do not dispose: each frame fills the canvas
    for (const p of parts) body.bytes(p);
    if ((16 + dataLen) & 1) body.u8(0);
  }
  const out = new ByteWriter(body.len + 8);
  out.ascii('RIFF'); u32(out, body.len);
  out.bytes(body.result());
  return out.result();
}

/* ---- MP4 (H.264) --------------------------------------------------------- */

/* samples: [{ data: Uint8Array (length-prefixed NAL units), key: bool }], avcC: AVCDecoderConfigurationRecord,
   fps: integer. Constant frame rate. Returns the file (moov before mdat, so it can start playing early). */
function muxMp4(samples, w, h, fps, avcC) {
  const enc = (v, n) => { const a = new Uint8Array(n); for (let i = n - 1; i >= 0; i--) { a[i] = v & 255; v = Math.floor(v / 256); } return a; };
  const cat = (arrs) => {
    let n = 0; for (const a of arrs) n += a.length;
    const o = new Uint8Array(n); let p = 0;
    for (const a of arrs) { o.set(a, p); p += a.length; }
    return o;
  };
  const str = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
  const box = (type, ...kids) => { const body = cat(kids); return cat([enc(body.length + 8, 4), str(type), body]); };
  const full = (type, ver, flags, ...kids) => box(type, enc((ver << 24) | flags, 4), ...kids);
  const zeros = (n) => new Uint8Array(n);
  const matrix = cat([enc(0x10000, 4), zeros(8), enc(0x10000, 4), zeros(8), enc(0x40000000, 4)]);

  const n = samples.length;
  const mediaScale = fps * 1000;
  const movieDur = Math.round(n * 1000 / fps);
  const ftyp = box('ftyp', str('isom'), enc(512, 4), str('isom'), str('iso2'), str('avc1'), str('mp41'));

  const build = (dataOffset) => {
    const mvhd = full('mvhd', 0, 0, enc(0, 4), enc(0, 4), enc(1000, 4), enc(movieDur, 4),
      enc(0x10000, 4), enc(0x100, 2), zeros(10), matrix, zeros(24), enc(2, 4));
    const tkhd = full('tkhd', 0, 7, enc(0, 4), enc(0, 4), enc(1, 4), zeros(4), enc(movieDur, 4),
      zeros(8), enc(0, 2), enc(0, 2), enc(0, 2), zeros(2), matrix, enc(w * 65536, 4), enc(h * 65536, 4));
    const mdhd = full('mdhd', 0, 0, enc(0, 4), enc(0, 4), enc(mediaScale, 4), enc(n * 1000, 4), enc(0x55C4, 2), zeros(2));
    const hdlr = full('hdlr', 0, 0, zeros(4), str('vide'), zeros(12), str('VideoHandler\0'));
    const vmhd = full('vmhd', 0, 1, zeros(8));
    const dinf = box('dinf', full('dref', 0, 0, enc(1, 4), full('url ', 0, 1)));
    const avc1 = box('avc1', zeros(6), enc(1, 2), zeros(16), enc(w, 2), enc(h, 2), enc(0x480000, 4), enc(0x480000, 4),
      zeros(4), enc(1, 2), zeros(32), enc(0x18, 2), enc(0xFFFF, 2), box('avcC', avcC));
    const stsd = full('stsd', 0, 0, enc(1, 4), avc1);
    const stts = full('stts', 0, 0, enc(1, 4), enc(n, 4), enc(1000, 4));
    const keys = [];
    samples.forEach((s, i) => { if (s.key) keys.push(i + 1); });
    const stss = full('stss', 0, 0, enc(keys.length, 4), cat(keys.map((k) => enc(k, 4))));
    const stsc = full('stsc', 0, 0, enc(1, 4), enc(1, 4), enc(n, 4), enc(1, 4));
    const stsz = full('stsz', 0, 0, enc(0, 4), enc(n, 4), cat(samples.map((s) => enc(s.data.length, 4))));
    const stco = full('stco', 0, 0, enc(1, 4), enc(dataOffset, 4));
    const stbl = box('stbl', stsd, stts, stss, stsc, stsz, stco);
    const minf = box('minf', vmhd, dinf, stbl);
    const mdia = box('mdia', mdhd, hdlr, minf);
    const trak = box('trak', tkhd, mdia);
    return box('moov', mvhd, trak);
  };

  let dataLen = 0;
  for (const s of samples) dataLen += s.data.length;
  if (dataLen + 8 > 0xFFFFFFF0) throw new Error('mp4-too-big');
  const moovSize = build(0).length;
  const moov = build(ftyp.length + moovSize + 8);
  return cat([ftyp, moov, enc(dataLen + 8, 4), str('mdat'), ...samples.map((s) => s.data)]);
}

/* Order of frames for an animation: loop / once play 0..n-1, ping-pong goes there and back
   (the first and last frame are not shown twice). */
function animSequence(n, mode) {
  const seq = [];
  for (let i = 0; i < n; i++) seq.push(i);
  if (mode === 'pingpong') for (let i = n - 2; i >= 1; i--) seq.push(i);
  return seq;
}

/* Delay of each of `count` frames at `fps`, in `unit` per second, so the total time stays exact. */
function frameDelays(count, fps, unit) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(Math.round(unit * (i + 1) / fps) - Math.round(unit * i / fps));
  return out;
}

/* =========================================================================
   EXPORT: SHEET / FRAMES (ZIP or one by one) / JSON
   ========================================================================= */
const tick = () => new Promise((r) => setTimeout(r, 0));

function getExportOpts() {
  return {
    fmt: $('exportFormat').value,
    quality: parseInt($('exportQuality').value, 10) || 92,
    bg: $('exportBg').value || '#ffffff'
  };
}

function getBaseName() { return sanitizeName($('exportName').value, 'spritesheet'); }

/* File name (without extension) of frame i: custom name from Paint Sprite, else base_00 */
function frameBaseName(i, total, base) {
  const f = state.frames[i];
  const custom = f && f.name ? sanitizeName(f.name, '') : '';
  return custom || (base + '_' + String(i).padStart(String(total).length, '0'));
}

function updateExportUI() {
  const fmt = $('exportFormat').value;
  const ext = (FORMATS[fmt] || FORMATS.png).ext;
  const base = getBaseName();
  $('exportQualityRow').hidden = fmt === 'png';
  $('exportBgField').hidden = fmt !== 'jpeg';
  $('exportQualityVal').textContent = $('exportQuality').value;
  $('exportNamePreview').textContent = tr('Nama file hasil:') + ' ' + base + '.' + ext + ' \u00b7 ' +
    base + '_00.' + ext + ' \u00b7 ' + base + '_frames.zip \u00b7 ' + base + '.json \u00b7 ' + base + '_anim.' + animExt();
  updateAnimUI();
}

/* Rebuilds the sheet if the frames changed after it was built, so Export never ships a stale
   sheet. Returns false (and says why) when there is nothing to export. */
function ensureFreshSheet() {
  if (state.exportSource === 'frames' && state.sheetStale && state.lastSheetSettings) {
    if (!state.frames.length) { showToast('Tidak ada frame'); return false; }
    buildAndShowSheet(state.lastSheetSettings);
    showToast('Spritesheet diperbarui otomatis dari frame terbaru');
  }
  return !!state.exportSheet;
}

/* Runs fn(setProgress) with the Export buttons disabled and the progress bar shown. */
async function withExportBusy(fn, showProgress, anchor) {
  const btns = document.querySelectorAll('#panel-export .btn');
  const wrap = $('exportProgressWrap'), fill = $('exportProgressFill'), label = $('exportProgressLabel');
  btns.forEach((b) => { b.disabled = true; });
  (anchor || $('exportBtnCol')).after(wrap);   // progress bar sits under the button that was pressed
  wrap.hidden = showProgress === false;
  fill.style.width = '0%';
  label.textContent = '0 / 0';
  try {
    await fn((done, total) => {
      fill.style.width = (done / total * 100) + '%';
      label.textContent = done + ' / ' + total;
    });
  } catch (err) {
    console.error(err);
    const msg = err && err.message;
    showToast(msg === 'zip-too-big' ? 'ZIP terlalu besar. Gunakan download satu per satu.'
      : msg === 'anim-too-big' ? 'Animasi terlalu besar. Kecilkan skala atau pilih lebih sedikit frame.'
      : msg === 'webp-unsupported' ? 'Browser ini tidak bisa membuat WebP.'
      : msg === 'mp4-unsupported' ? 'Browser ini belum mendukung MP4. Coba Chrome, Edge, atau Safari terbaru.'
      : msg === 'mp4-encode' ? 'Gagal membuat MP4'
      : 'Gagal membuat file', 3600);
  } finally {
    btns.forEach((b) => { b.disabled = false; });
    setTimeout(() => { wrap.hidden = true; fill.style.width = '0%'; }, 900);
  }
}

async function exportSheetImage() {
  if (!ensureFreshSheet()) {
    if (!state.exportSheet) showToast('Belum ada spritesheet. Bangun dulu di tab Spritesheet atau Gabung.');
    return;
  }
  await withExportBusy(async () => {
    const enc = await encodeCanvas(state.exportSheet, getExportOpts());
    if (!enc) throw new Error('encode');
    downloadBlob(enc.blob, getBaseName() + '.' + enc.ext);
    if (enc.fellBack) showToast('Browser tidak mendukung format ini. Disimpan sebagai PNG.', 3600);
  }, false);
}

async function exportFramesZip() {
  if (state.frames.length === 0) { showToast('Tidak ada frame'); return; }
  const opt = getExportOpts(), base = getBaseName(), total = state.frames.length;
  await withExportBusy(async (setProgress) => {
    const encoded = [];
    for (let i = 0; i < total; i++) {
      const enc = await encodeCanvas(state.frames[i].canvas, opt);
      if (!enc) throw new Error('encode');
      encoded.push(enc);
      setProgress(i + 1, total);
      if (i % 4 === 3) await tick();
    }
    const used = new Set();
    const files = [];
    for (let i = 0; i < total; i++) {
      files.push({
        name: uniqueFileName(used, frameBaseName(i, total, base), encoded[i].ext),
        data: new Uint8Array(await encoded[i].blob.arrayBuffer())
      });
    }
    downloadBlob(makeZip(files), base + '_frames.zip');
    showToast(encoded.some((e) => e.fellBack) ? 'Browser tidak mendukung format ini. Disimpan sebagai PNG.' : 'ZIP diunduh', encoded.some((e) => e.fellBack) ? 3600 : 2200);
  });
}

async function exportFramesOneByOne() {
  if (state.frames.length === 0) { showToast('Tidak ada frame'); return; }
  const opt = getExportOpts(), base = getBaseName(), total = state.frames.length;
  await withExportBusy(async (setProgress) => {
    const used = new Set();
    let fell = false;
    for (let i = 0; i < total; i++) {
      const enc = await encodeCanvas(state.frames[i].canvas, opt);
      if (!enc) throw new Error('encode');
      fell = fell || enc.fellBack;
      downloadBlob(enc.blob, uniqueFileName(used, frameBaseName(i, total, base), enc.ext));
      setProgress(i + 1, total);
      await new Promise((r) => setTimeout(r, 160));
    }
    showToast(fell ? 'Browser tidak mendukung format ini. Disimpan sebagai PNG.' : 'Semua frame diunduh', fell ? 3600 : 2200);
  });
}

function exportJsonMetadata() {
  if (!ensureFreshSheet()) {
    if (!state.exportSheet) showToast('Bangun spritesheet dulu di tab Spritesheet');
    return;
  }
  if (!state.sheetMeta) {
    showToast('JSON hanya tersedia untuk sheet dari tab Spritesheet atau gabungan Append Frames');
    return;
  }
  const m = state.sheetMeta;
  const base = getBaseName();
  const ext = (FORMATS[$('exportFormat').value] || FORMATS.png).ext;
  const withNames = state.exportSource === 'frames' && state.frames.length === m.count;
  const meta = {
    image: base + '.' + ext,
    frameWidth: m.frameW,
    frameHeight: m.frameH,
    columns: m.cols,
    rows: m.rows,
    totalFrames: m.count,
    padding: m.padding,
    margin: m.margin,
    sheetWidth: m.sheetW,
    sheetHeight: m.sheetH,
    frames: []
  };
  for (let i = 0; i < m.count; i++) {
    const col = i % m.cols;
    const row = Math.floor(i / m.cols);
    const fr = {
      index: i,
      x: m.margin + col * (m.frameW + m.padding),
      y: m.margin + row * (m.frameH + m.padding),
      width: m.frameW,
      height: m.frameH
    };
    if (withNames) fr.name = frameBaseName(i, m.count, base);
    meta.frames.push(fr);
  }
  downloadBlob(new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' }), base + '.json');
}

/* =========================================================================
   EXPORT: ANIMATION (GIF / animated WebP / MP4) from the frames
   ========================================================================= */
const ANIM_EXT = { gif: 'gif', webp: 'webp', mp4: 'mp4' };
const ANIM_MAX_BYTES = 480 * 1024 * 1024;   // composed frames kept in memory at once
const ANIM_MAX_SIDE = 8192;

function animExt() { return ANIM_EXT[$('animFormat').value] || 'gif'; }

function webpEncodeSupported() {
  try { return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0; } catch (e) { return false; }
}

/* Shows only the options that matter for the chosen format */
function updateAnimUI() {
  const fmt = $('animFormat').value;
  const transparent = fmt !== 'mp4' && $('animTransparent').checked;
  $('animTransparentField').hidden = fmt === 'mp4';
  $('animBgField').hidden = transparent;
  $('animQualityField').hidden = fmt !== 'webp';
  $('animQualityVal').textContent = $('animQuality').value;
  document.querySelectorAll('[data-anim-hint]').forEach((p) => { p.hidden = p.dataset.animHint !== fmt; });
}

/* Frames to export: the From / To fields (empty = first / last), as 0-based indexes */
function animFrameRange() {
  const n = state.frames.length;
  let a = parseInt($('animFrom').value, 10), b = parseInt($('animTo').value, 10);
  if (!(a >= 1)) a = 1;
  if (!(b >= 1)) b = n;
  a = Math.min(a, n); b = Math.min(b, n);
  if (a > b) { const t = a; a = b; b = t; }
  return [a - 1, b - 1];
}

/* One frame drawn on the animation canvas: centered, scaled by a whole number, optional background. */
function composeAnimFrame(src, W, H, scale, bg, even) {
  let cw = W * scale, ch = H * scale;
  if (even) { cw += cw & 1; ch += ch & 1; }          // H.264 needs even sizes
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch); }
  setCrisp(ctx);
  const dx = Math.floor((W - src.width) / 2) * scale, dy = Math.floor((H - src.height) / 2) * scale;
  ctx.drawImage(src, dx, dy, src.width * scale, src.height * scale);
  return c;
}

/* Finds an H.264 (Baseline, so no frame reordering) config this browser can encode. If the frame is
   too small for the encoder, the picture is enlarged by whole numbers until it works. */
async function pickMp4Config(W, H, fps, scale) {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') throw new Error('mp4-unsupported');
  for (let k = 1; k <= 16; k++) {
    const s = scale * k;
    const w = W * s + ((W * s) & 1), h = H * s + ((H * s) & 1);
    const px = w * h;
    if (w > 4096 || h > 4096 || px > 9437184) break;
    const level = px <= 921600 ? '1f' : px <= 2097152 ? '28' : '33';
    const cfg = {
      codec: 'avc1.4200' + level, width: w, height: h, framerate: fps,
      bitrate: Math.min(60e6, Math.max(2e6, Math.round(px * fps * 0.35))),
      avc: { format: 'avc' }, latencyMode: 'quality'
    };
    try {
      const r = await VideoEncoder.isConfigSupported(cfg);
      if (r && r.supported) return { scale: s, cfg };
    } catch (e) { /* try the next size */ }
  }
  throw new Error('mp4-unsupported');
}

async function exportAnimation() {
  if (state.frames.length === 0) { showToast('Tidak ada frame'); return; }
  const fmt = $('animFormat').value;
  const fps = Math.min(60, Math.max(1, parseInt($('animFps').value, 10) || 12));
  let scale = parseInt($('animScale').value, 10) || 1;
  const mode = $('animMode').value;
  const transparent = fmt !== 'mp4' && $('animTransparent').checked;
  const bg = transparent ? null : ($('animBg').value || '#ffffff');
  const base = getBaseName();
  const [from, to] = animFrameRange();
  const src = state.frames.slice(from, to + 1);
  const seq = animSequence(src.length, mode);
  let W = 1, H = 1;
  src.forEach((f) => { W = Math.max(W, f.canvas.width); H = Math.max(H, f.canvas.height); });

  await withExportBusy(async (setProgress) => {
    let mp4 = null;
    if (fmt === 'mp4') {
      mp4 = await pickMp4Config(W, H, fps, scale);
      if (mp4.scale !== scale) { showToast(tr('Gambar diperbesar {n}\u00d7 agar bisa dibuat MP4', mp4.scale / scale), 3200); scale = mp4.scale; }
    }
    const cw = W * scale + (fmt === 'mp4' ? (W * scale) & 1 : 0), ch = H * scale + (fmt === 'mp4' ? (H * scale) & 1 : 0);
    if (cw > ANIM_MAX_SIDE || ch > ANIM_MAX_SIDE || cw * ch * 4 * src.length > ANIM_MAX_BYTES) throw new Error('anim-too-big');
    const total = src.length + seq.length;
    setProgress(0, total);

    // 1) draw every frame once (ping-pong reuses them)
    const comp = [];
    for (let i = 0; i < src.length; i++) {
      comp.push(composeAnimFrame(src[i].canvas, W, H, scale, bg, fmt === 'mp4'));
      setProgress(i + 1, total);
      if (i % 4 === 3) await tick();
    }
    const step = (i) => setProgress(src.length + i, total);
    let blob;

    // 2) encode
    if (fmt === 'gif') {
      const datas = comp.map((c) => c.getContext('2d').getImageData(0, 0, cw, ch).data);
      const delays = frameDelays(seq.length, fps, 100);
      const frames = seq.map((u, i) => ({ data: datas[u], delay: delays[i] }));
      const bytes = await encodeGif(frames, cw, ch, {
        transparent, loop: mode !== 'once',
        progress: async (done) => { step(done); if (done % 2 === 0) await tick(); }
      });
      blob = new Blob([bytes], { type: 'image/gif' });
    } else if (fmt === 'webp') {
      const q = Math.min(1, Math.max(0.1, (parseInt($('animQuality').value, 10) || 100) / 100));
      const stills = [];
      for (let u = 0; u < comp.length; u++) {
        const b = await new Promise((res) => comp[u].toBlob(res, 'image/webp', q));
        if (!b || b.type !== 'image/webp') throw new Error('webp-unsupported');
        stills.push(new Uint8Array(await b.arrayBuffer()));
      }
      const delays = frameDelays(seq.length, fps, 1000);
      const bytes = muxAnimatedWebp(seq.map((u) => stills[u]), cw, ch, delays, mode === 'once' ? 1 : 0, transparent);
      step(seq.length);
      blob = new Blob([bytes], { type: 'image/webp' });
    } else {
      const chunks = [];
      let desc = null, encErr = null;
      const encoder = new VideoEncoder({
        output: (chunk, meta) => {
          const data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);
          chunks.push({ data, key: chunk.type === 'key' });
          if (!desc && meta && meta.decoderConfig && meta.decoderConfig.description) {
            const d = meta.decoderConfig.description;
            desc = d instanceof ArrayBuffer ? new Uint8Array(d.slice(0)) : new Uint8Array(d.buffer, d.byteOffset, d.byteLength).slice();
          }
        },
        error: (e) => { encErr = e; }
      });
      encoder.configure(mp4.cfg);
      for (let i = 0; i < seq.length && !encErr; i++) {
        const vf = new VideoFrame(comp[seq[i]], { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
        encoder.encode(vf, { keyFrame: i % 30 === 0 });
        vf.close();
        while (encoder.encodeQueueSize > 6 && !encErr) await new Promise((r) => setTimeout(r, 4));
        step(i + 1);
      }
      if (!encErr) { try { await encoder.flush(); } catch (e) { encErr = e; } }
      try { encoder.close(); } catch (e) { /* already closed */ }
      if (encErr || !desc || chunks.length !== seq.length) throw new Error('mp4-encode');
      blob = new Blob([muxMp4(chunks, cw, ch, fps, desc)], { type: 'video/mp4' });
    }
    downloadBlob(blob, base + '_anim.' + ANIM_EXT[fmt]);
    showToast('Animasi diunduh');
  }, true, $('exportAnimBtn'));
}

/* =========================================================================
   MERGE: 2 or more spritesheets
   ========================================================================= */
const MERGE_MAX = 12;
const MAX_CANVAS_SIDE = 16384;

function newMergeItem(prev) {
  return { id: nextId(), canvas: null, name: '', fw: prev ? prev.fw : 128, fh: prev ? prev.fh : 128 };
}

function mergeFrameCountText(it) {
  if (!it.canvas) return '';
  const n = Math.max(1, Math.floor(it.canvas.width / (it.fw || 1))) * Math.max(1, Math.floor(it.canvas.height / (it.fh || 1)));
  return tr('{n} frame', n);
}

function moveMergeItem(i, d) {
  const j = i + d, a = state.mergeItems;
  if (j < 0 || j >= a.length) return;
  const t = a[i]; a[i] = a[j]; a[j] = t;
  renderMergeList();
}

function removeMergeItem(i) {
  if (state.mergeItems.length <= 2) return;
  state.mergeItems.splice(i, 1);
  renderMergeList();
}

/* Rebuilds the list of spritesheet cards from state.mergeItems */
function renderMergeList() {
  const list = $('mergeList');
  const append = $('mergeMode').value === 'append';
  const items = state.mergeItems;
  list.textContent = '';
  items.forEach((it, i) => {
    const row = document.createElement('div');
    row.className = 'merge-item';

    const head = document.createElement('div');
    head.className = 'merge-head';
    const title = document.createElement('b');
    title.textContent = tr('Spritesheet') + ' ' + (i + 1);
    head.appendChild(title);
    const btn = (label, aria, fn, off) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-secondary btn-sm';
      b.textContent = label; b.setAttribute('aria-label', tr(aria)); b.title = tr(aria);
      b.disabled = !!off;
      b.addEventListener('click', fn);
      head.appendChild(b);
    };
    btn('\u2191', 'Pindah ke atas', () => moveMergeItem(i, -1), i === 0);
    btn('\u2193', 'Pindah ke bawah', () => moveMergeItem(i, 1), i === items.length - 1);
    btn('\u00d7', 'Hapus spritesheet', () => removeMergeItem(i), items.length <= 2);
    row.appendChild(head);

    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp'; input.hidden = true;
    input.addEventListener('change', async () => {
      const f = input.files[0];
      if (!f) return;
      try { it.canvas = await imageFileToCanvas(f); it.name = f.name; }
      catch (e) { showToast('Gagal membaca gambar'); return; }
      renderMergeList();
    });
    const pick = document.createElement('button');
    pick.type = 'button'; pick.className = 'btn btn-secondary btn-sm';
    pick.textContent = tr(it.canvas ? 'Ganti file' : 'Pilih file');
    pick.addEventListener('click', () => input.click());
    const info = document.createElement('p');
    info.className = 'merge-file';
    info.textContent = it.canvas ? it.name + ' \u00b7 ' + it.canvas.width + '\u00d7' + it.canvas.height : tr('Belum ada file');
    const pickRow = document.createElement('div');
    pickRow.className = 'merge-pick';
    pickRow.append(pick, input, info);
    row.appendChild(pickRow);

    if (it.canvas) {
      const cv = document.createElement('canvas');
      cv.className = 'checker-bg thumb-canvas';
      paintPreview(cv, it.canvas);
      row.appendChild(cv);
    }

    if (append) {
      const grid = document.createElement('div');
      grid.className = 'grid-2 merge-size';
      const count = document.createElement('p');
      count.className = 'hint';
      count.textContent = mergeFrameCountText(it);
      const fld = (label, key) => {
        const l = document.createElement('label');
        l.className = 'field';
        l.append(document.createTextNode(tr(label)));
        const n = document.createElement('input');
        n.type = 'number'; n.min = '1'; n.step = '1'; n.inputMode = 'numeric'; n.value = it[key];
        n.addEventListener('input', () => { it[key] = Math.max(1, parseInt(n.value, 10) || 1); count.textContent = mergeFrameCountText(it); });
        l.appendChild(n);
        grid.appendChild(l);
      };
      fld('Lebar frame (px)', 'fw');
      fld('Tinggi frame (px)', 'fh');
      row.appendChild(grid);
      row.appendChild(count);
    }
    list.appendChild(row);
  });
  $('mergeAddBtn').disabled = items.length >= MERGE_MAX;
}

function runMerge() {
  const items = state.mergeItems.filter((it) => it.canvas);
  if (items.length < 2) { showToast('Upload minimal 2 spritesheet dulu'); return; }
  const mode = $('mergeMode').value;
  const cs = items.map((it) => it.canvas);
  const sum = (k) => cs.reduce((a, c) => a + c[k], 0);
  const max = (k) => cs.reduce((a, c) => Math.max(a, c[k]), 0);
  let result;
  let meta = null; // only "append" produces a grid that JSON metadata can describe

  if (mode === 'horizontal' || mode === 'vertical') {
    const horiz = mode === 'horizontal';
    const rw = horiz ? sum('width') : max('width'), rh = horiz ? max('height') : sum('height');
    if (rw > MAX_CANVAS_SIDE || rh > MAX_CANVAS_SIDE) { showToast('Hasil terlalu besar (maks. 16384 px per sisi)', 3200); return; }
    result = document.createElement('canvas');
    result.width = rw; result.height = rh;
    const ctx = result.getContext('2d');
    let pos = 0;
    cs.forEach((c) => {
      if (horiz) { ctx.drawImage(c, pos, 0); pos += c.width; } else { ctx.drawImage(c, 0, pos); pos += c.height; }
    });
  } else if (mode === 'overlay') {
    result = document.createElement('canvas');
    result.width = max('width'); result.height = max('height');
    const ctx = result.getContext('2d');
    cs.forEach((c) => ctx.drawImage(c, 0, 0));
  } else {
    const colsOut = parseInt($('mergeColumnsOut').value, 10) || 1;
    const fitMode = $('mergeFitMode').value;
    const targetW = Math.max.apply(null, items.map((it) => it.fw));
    const targetH = Math.max.apply(null, items.map((it) => it.fh));
    let frames = [];
    items.forEach((it) => {
      frames = frames.concat(sliceSpritesheet(it.canvas, it.fw, it.fh).map((c) => normalizeFrame(c, targetW, targetH, fitMode)));
    });
    if (Math.min(colsOut, frames.length) * targetW > MAX_CANVAS_SIDE || Math.ceil(frames.length / colsOut) * targetH > MAX_CANVAS_SIDE) {
      showToast('Hasil terlalu besar (maks. 16384 px per sisi)', 3200); return;
    }
    const built = buildSpritesheet(frames, { frameW: targetW, frameH: targetH, columns: colsOut, padding: 0, margin: 0 });
    result = built.canvas;
    meta = built;
  }

  state.sheetMeta = meta;
  state.exportSheet = result;
  state.exportSource = 'merge';
  state.sheetStale = false;
  paintPreview($('mergeResultCanvas'), result);
  showToast('Digabungkan. Buka tab Export untuk mengunduh hasilnya.');
}

/* =========================================================================
   SPRITESHEET TAB
   ========================================================================= */
function buildAndShowSheet(settings) {
  const result = buildSpritesheet(state.frames.map((f) => f.canvas), settings);
  state.sheetMeta = result;
  state.exportSheet = result.canvas;
  state.exportSource = 'frames';
  state.lastSheetSettings = settings;
  state.sheetStale = false;

  paintPreview($('sheetPreviewCanvas'), result.canvas);
  $('sheetTotalFrames').textContent = result.count;
  $('sheetRows').textContent = result.rows;
  $('sheetColsOut').textContent = result.cols;
  $('sheetFrameSize').textContent = result.frameW + '\u00d7' + result.frameH;
  $('sheetResolution').textContent = result.sheetW + '\u00d7' + result.sheetH;
}

function runBuildSheet() {
  if (state.frames.length === 0) { showToast('Tidak ada frame untuk disusun'); return; }
  buildAndShowSheet({
    frameW: parseInt($('sheetFrameW').value, 10) || 1,
    frameH: parseInt($('sheetFrameH').value, 10) || 1,
    columns: parseInt($('sheetColumns').value, 10) || 1,
    padding: parseInt($('sheetPadding').value, 10) || 0,
    margin: parseInt($('sheetMargin').value, 10) || 0
  });
  showToast('Spritesheet dibangun');
}

/* =========================================================================
   BACKGROUND TAB
   ========================================================================= */
function getBgSettings() {
  return {
    mode: $('bgMode').value,
    color: hexToRgb($('bgColor').value),
    tolerance: parseInt($('bgTolerance').value, 10),
    feather: parseInt($('bgFeather').value, 10)
  };
}

/* =========================================================================
   FRAME SIZE (Editor): resize every frame, layers included
   ========================================================================= */
const FS_MAX = 2048;
let fsUndoData = null, fsDirty = false, fsRatio = 1;

function frameSizeFields() {
  const w = parseInt($('fsW').value, 10), h = parseInt($('fsH').value, 10);
  if (!(w >= 1 && w <= FS_MAX && h >= 1 && h <= FS_MAX)) return null;
  return { w, h };
}

function updateFrameSizeInfo() {
  const info = $('frameSizeInfo');
  if (!info) return;
  if (!state.frames.length) { info.textContent = ''; return; }
  const seen = [];
  state.frames.forEach((f) => { const k = f.canvas.width + '\u00d7' + f.canvas.height; if (!seen.includes(k)) seen.push(k); });
  info.textContent = tr('Ukuran saat ini:') + ' ' + (seen.length === 1 ? seen[0] : seen.slice(0, 3).join(', ') + (seen.length > 3 ? '\u2026' : '') + ' (' + tr('beragam') + ')');
  const first = state.frames[0].canvas;
  fsRatio = first.width / first.height;
  if (!fsDirty) { $('fsW').value = first.width; $('fsH').value = first.height; }
}

/* one canvas -> a W x H canvas, using the chosen fit mode (uses the Pixelated / Smoothed setting) */
function fitCanvas(src, W, H, mode) {
  const out = blankCanvas(W, H), ctx = out.getContext('2d');
  const sw = src.width, sh = src.height;
  if (mode === 'stretch') {
    accurateDrawScaled(ctx, src, 0, 0, sw, sh, 0, 0, W, H);
  } else if (mode === 'center') {
    ctx.drawImage(src, Math.round((W - sw) / 2), Math.round((H - sh) / 2));
  } else if (mode === 'cover') {
    const k = Math.max(W / sw, H / sh), cw = W / k, ch = H / k;
    accurateDrawScaled(ctx, src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, W, H);
  } else {
    const k = Math.min(W / sw, H / sh);
    const dw = Math.max(1, Math.min(W, Math.round(sw * k))), dh = Math.max(1, Math.min(H, Math.round(sh * k)));
    accurateDrawScaled(ctx, src, 0, 0, sw, sh, Math.round((W - dw) / 2), Math.round((H - dh) / 2), dw, dh);
  }
  return out;
}

function resizeFrameTo(f, W, H, mode) {
  if (f.layers) f.layers.forEach((L) => { L.canvas = fitCanvas(L.canvas, W, H, mode); });
  const flat = fitCanvas(f.canvas, W, H, mode);
  f.canvas.width = W; f.canvas.height = H;           // same canvas object, new size
  f.canvas.getContext('2d').drawImage(flat, 0, 0);
  if (f.layers) compositeFrame(f);
}

function applyFrameSize() {
  if (!state.frames.length) { showToast('Tidak ada frame'); return; }
  const sz = frameSizeFields();
  if (!sz) { showToast('Ukuran tidak valid (1\u20132048)'); return; }
  const mode = $('fsFit').value;
  if (state.frames.every((f) => f.canvas.width === sz.w && f.canvas.height === sz.h)) { showToast('Ukuran sudah sama'); return; }
  fsUndoData = state.frames.map((f) => ({
    f, w: f.canvas.width, h: f.canvas.height, canvas: cloneCanvas(f.canvas),
    list: f.layers ? f.layers.slice() : null, active: f.active, seq: f.layerSeq,
    layers: f.layers ? f.layers.map((L) => ({ L, canvas: cloneCanvas(L.canvas) })) : null
  }));
  state.frames.forEach((f) => resizeFrameTo(f, sz.w, sz.h, mode));
  paint.undo = []; paint.redo = [];                  // old layer snapshots have the old size
  bgUndo = null;
  $('sheetFrameW').value = sz.w; $('sheetFrameH').value = sz.h;
  fsDirty = false;
  $('fsUndoBtn').disabled = false;
  framesChanged();
  showToast('Ukuran frame diubah');
}

function undoFrameSize() {
  if (!fsUndoData) { showToast('Tidak ada yang bisa diurungkan'); return; }
  fsUndoData.forEach((it) => {
    const f = it.f;
    if (!state.frames.includes(f)) return;
    f.canvas.width = it.w; f.canvas.height = it.h;
    f.canvas.getContext('2d').drawImage(it.canvas, 0, 0);
    if (it.layers) {
      it.layers.forEach((x) => { x.L.canvas = x.canvas; });
      f.layers = it.list; f.active = it.active; f.layerSeq = it.seq;
      compositeFrame(f);
    } else if (f.layers) {
      f.layers = null; f.active = 0;
    }
  });
  fsUndoData = null;
  paint.undo = []; paint.redo = [];
  bgUndo = null;
  fsDirty = false;
  $('fsUndoBtn').disabled = true;
  framesChanged();
  showToast('Diurungkan');
}

function initFrameSizeTab() {
  const lockOn = () => $('fsLock').checked && fsRatio > 0;
  $('fsW').addEventListener('input', () => {
    fsDirty = true;
    const w = parseInt($('fsW').value, 10);
    if (lockOn() && w >= 1) $('fsH').value = Math.max(1, Math.round(w / fsRatio));
  });
  $('fsH').addEventListener('input', () => {
    fsDirty = true;
    const h = parseInt($('fsH').value, 10);
    if (lockOn() && h >= 1) $('fsW').value = Math.max(1, Math.round(h * fsRatio));
  });
  $('fsLock').addEventListener('change', () => {
    const sz = frameSizeFields();
    if ($('fsLock').checked && sz) fsRatio = sz.w / sz.h;
  });
  $('fsApplyBtn').addEventListener('click', applyFrameSize);
  $('fsUndoBtn').addEventListener('click', undoFrameSize);
  updateFrameSizeInfo();
}

/* =========================================================================
   EVENT WIRING
   ========================================================================= */
function updateMenuCurrent() {
  const a = document.querySelector('.tab-btn.active');
  if (a) $('menuCurrent').textContent = a.textContent.trim();
}

function setMenu(open) {
  if (open) updateTopbarH();
  $('topbar').classList.toggle('open', open);
  $('menuBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
  $('menu').setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open) { const m = $('menu'); m.scrollTop = 0; }
}

function initMenu() {
  $('menuBtn').addEventListener('click', () => setMenu(!$('topbar').classList.contains('open')));
  $('menuBackdrop').addEventListener('click', () => setMenu(false));
  document.addEventListener('click', (e) => { if (!$('topbar').contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  // the drawer sits right under the top bar: keep it in step with the bar's height (notches, rotation, resize)
  updateTopbarH();
  window.addEventListener('resize', updateTopbarH);
  window.addEventListener('orientationchange', updateTopbarH);
  $('menu').setAttribute('aria-hidden', 'true');
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      commitXf();                                   // a lasso transform in progress is applied before leaving Paint Sprite
      document.querySelectorAll('.tab-btn').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      $('panel-' + btn.dataset.tab).classList.add('active');
      document.body.classList.toggle('paint-mode', btn.dataset.tab === 'paint');
      updateTopbarH();
      window.scrollTo(0, 0);
      updateMenuCurrent();
      setMenu(false);
      if (btn.dataset.tab === 'background') renderBgPreview();
      if (btn.dataset.tab === 'paint') { renderPaintPicker(); }
      else if (state.thumbsDirty) { state.thumbsDirty = false; refreshAllFrameViews(); }
      if (btn.dataset.tab === 'export') updateExportUI();
      if (btn.dataset.tab === 'player') renderPlayer(); else if (player.playing) stopPlayer();
      if (btn.dataset.tab === 'font') { fcSyncSettings(); fcRenderAll(false); }
    });
  });
}

function initDropzone() {
  const dropzone = $('dropzone');
  const fileInput = $('fileInput');
  $('pickFileBtn').addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  fileInput.addEventListener('click', (e) => e.stopPropagation());
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleIncomingFile(fileInput.files[0]); fileInput.value = ''; });

  ['dragenter', 'dragover'].forEach((evt) => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); }));
  ['dragleave', 'drop'].forEach((evt) => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('drag-over'); }));
  dropzone.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) handleIncomingFile(f); });
}

function initImportTab() {
  $('extractMode').addEventListener('change', (e) => {
    const isFps = e.target.value === 'fps';
    $('fpsField').hidden = !isFps;
    $('intervalField').hidden = isFps;
    updateEstimatedFrames();
  });
  ['extractFps', 'extractInterval', 'extractStart', 'extractEnd', 'extractMaxFrames'].forEach((id) => {
    $(id).addEventListener('input', updateEstimatedFrames);
  });

  $('extractVideoBtn').addEventListener('click', async () => {
    const video = $('videoPreview');
    if (!video.duration) { showToast('Video belum siap'); return; }
    const btn = $('extractVideoBtn');
    btn.disabled = true;
    const wrap = $('videoProgressWrap');
    const fill = $('videoProgressFill');
    const label = $('videoProgressLabel');
    wrap.hidden = false;

    const settings = {
      mode: $('extractMode').value,
      fps: parseFloat($('extractFps').value) || 12,
      interval: parseFloat($('extractInterval').value) || 0.1,
      start: parseFloat($('extractStart').value) || 0,
      end: $('extractEnd').value ? parseFloat($('extractEnd').value) : null,
      maxFrames: parseInt($('extractMaxFrames').value, 10) || 1,
      width: parseInt($('extractWidth').value, 10) || 128,
      height: parseInt($('extractHeight').value, 10) || 128,
      fit: $('extractFit').value
    };

    try {
      video.pause();
      const originalTime = video.currentTime;
      const canvases = await extractVideoFrames(video, settings, (done, total) => {
        fill.style.width = (done / total * 100) + '%';
        label.textContent = done + ' / ' + total;
      });
      canvases.forEach((c) => state.frames.push({ id: nextId(), canvas: c }));
      framesChanged();
      showToast(canvases.length ? tr('{n} frame diekstrak', canvases.length) : 'Tidak ada frame');
      video.currentTime = originalTime;
    } catch (err) {
      console.error(err);
      showToast('Gagal mengekstrak frame video');
    } finally {
      btn.disabled = false;
      setTimeout(() => { wrap.hidden = true; fill.style.width = '0%'; }, 800);
    }
  });

  $('decodeGifBtn').addEventListener('click', async () => {
    if (!currentFile || currentMediaType !== 'gif') return;
    const btn = $('decodeGifBtn');
    btn.disabled = true;
    const wrap = $('gifProgressWrap');
    const fill = $('gifProgressFill');
    const label = $('gifProgressLabel');
    wrap.hidden = false;

    try {
      const buffer = await currentFile.arrayBuffer();
      const wRaw = $('gifWidth').value;
      const hRaw = $('gifHeight').value;
      const canvases = await decodeGifToCanvases(buffer, {
        maxFrames: parseInt($('gifMaxFrames').value, 10) || 200,
        targetW: wRaw ? parseInt(wRaw, 10) : null,
        targetH: hRaw ? parseInt(hRaw, 10) : null,
        fit: $('gifFit').value
      }, (done, total) => {
        fill.style.width = (done / total * 100) + '%';
        label.textContent = done + ' / ' + total;
      });
      canvases.forEach((c) => state.frames.push({ id: nextId(), canvas: c }));
      framesChanged();
      showToast(tr('{n} frame di-decode dari GIF', canvases.length));
    } catch (err) {
      console.error(err);
      showToast(tr('Gagal decode GIF: ') + err.message);
    } finally {
      btn.disabled = false;
      setTimeout(() => { wrap.hidden = true; fill.style.width = '0%'; }, 800);
    }
  });

  $('addImageFrameBtn').addEventListener('click', async () => {
    if (!currentFile) return;
    const canvas = await imageFileToCanvas(currentFile);
    state.frames.push({ id: nextId(), canvas });
    framesChanged();
    showToast('Frame ditambahkan');
  });
}

let bgUndo = null, bgRaf = 0;

function rgbToHex(r, g, b) { return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''); }

function renderBgPreview() {
  const src = $('bgSourceCanvas'), out = $('bgPreviewCanvas');
  if (!state.frames.length) {
    [src, out].forEach((c) => { c.width = 1; c.height = 1; });
    return;
  }
  const f = state.frames[0].canvas;
  paintPreview(src, f);
  const clone = cloneCanvas(f);
  applyBackgroundRemoval(clone, getBgSettings());
  paintPreview(out, clone);
}
function queueBgPreview() { cancelAnimationFrame(bgRaf); bgRaf = requestAnimationFrame(renderBgPreview); }

function setBgColor(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  hex = hex.toLowerCase();
  $('bgColor').value = hex;
  $('bgHex').value = hex;
  if ($('bgMode').value === 'normal') $('bgMode').value = 'transparent';
  queueBgPreview();
}

function detectCornerColor(c) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  const count = {};
  let best = null, bn = 0;
  [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].forEach(([x, y]) => {
    const d = ctx.getImageData(x, y, 1, 1).data;
    if (d[3] < 128) return;
    const k = rgbToHex(d[0], d[1], d[2]);
    count[k] = (count[k] || 0) + 1;
    if (count[k] > bn) { bn = count[k]; best = k; }
  });
  return best;
}

function initBackgroundTab() {
  $('bgTolerance').addEventListener('input', (e) => { $('bgToleranceVal').textContent = e.target.value; queueBgPreview(); });
  $('bgFeather').addEventListener('input', (e) => { $('bgFeatherVal').textContent = e.target.value; queueBgPreview(); });
  $('bgMode').addEventListener('change', queueBgPreview);
  $('bgColor').addEventListener('input', (e) => setBgColor(e.target.value));
  $('bgHex').addEventListener('input', (e) => {
    let v = e.target.value.trim();
    if (v && v[0] !== '#') v = '#' + v;
    setBgColor(v);
  });
  $('bgSwatches').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-color]');
    if (b) setBgColor(b.dataset.color);
  });
  $('bgSourceCanvas').addEventListener('click', (e) => {
    const c = e.currentTarget;
    if (!state.frames.length) return;
    const r = c.getBoundingClientRect();
    const x = Math.min(c.width - 1, Math.max(0, Math.floor((e.clientX - r.left) * c.width / r.width)));
    const y = Math.min(c.height - 1, Math.max(0, Math.floor((e.clientY - r.top) * c.height / r.height)));
    const d = c.getContext('2d').getImageData(x, y, 1, 1).data;
    setBgColor(rgbToHex(d[0], d[1], d[2]));
    showToast('Warna diambil');
  });
  $('bgAutoBtn').addEventListener('click', () => {
    if (!state.frames.length) { showToast('Tidak ada frame'); return; }
    const hex = detectCornerColor(state.frames[0].canvas);
    if (hex) setBgColor(hex); else showToast('Pojok sudah transparan');
  });

  $('bgApplyBtn').addEventListener('click', () => {
    if (state.frames.length === 0) { showToast('Tidak ada frame'); return; }
    const settings = getBgSettings();
    const applyAll = $('bgApplyAll').checked;
    const targets = applyAll ? state.frames : [state.frames[0]];
    bgUndo = targets.map((f) => ({ f, copy: cloneCanvas(f.canvas) }));
    let flattened = 0;
    targets.forEach((f) => { if (f.layers && f.layers.length > 1) flattened++; dropLayers(f); });   // Paint layers are flattened first
    targets.forEach((f) => applyBackgroundRemoval(f.canvas, settings));
    framesChanged();
    renderBgPreview();
    if (applyAll) showToast(flattened ? 'Diterapkan ke semua frame (layer diratakan)' : 'Diterapkan ke semua frame');
    else showToast(flattened ? 'Diterapkan ke frame pertama (layer diratakan)' : 'Diterapkan ke frame pertama');
  });
  $('bgUndoBtn').addEventListener('click', () => {
    if (!bgUndo) { showToast('Tidak ada yang bisa diurungkan'); return; }
    bgUndo.forEach(({ f, copy }) => {
      const ctx = f.canvas.getContext('2d');
      ctx.clearRect(0, 0, f.canvas.width, f.canvas.height);
      ctx.drawImage(copy, 0, 0);
      dropLayers(f);
    });
    bgUndo = null;
    framesChanged();
    renderBgPreview();
    showToast('Diurungkan');
  });
}

function initSheetTab() {
  $('buildSheetBtn').addEventListener('click', runBuildSheet);
}

function initEditorTab() {
  $('editorAddImageBtn').addEventListener('click', () => $('editorAddImageInput').click());
  $('editorAddImageInput').addEventListener('change', async (e) => {
    await addImageFiles(Array.from(e.target.files || []));
    e.target.value = '';
  });
  $('editorAddEmptyBtn').addEventListener('click', () => addEmptyFrame());
  $('rebuildSheetBtn').addEventListener('click', runBuildSheet);

  // drop image files straight onto the Editor to add them as frames
  const ed = $('panel-editor');
  const hasFiles = (e) => !!e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') !== -1;
  ['dragenter', 'dragover'].forEach((evt) => ed.addEventListener(evt, (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    ed.classList.add('drop-files');
  }));
  ed.addEventListener('dragleave', (e) => { if (!e.relatedTarget || !ed.contains(e.relatedTarget)) ed.classList.remove('drop-files'); });
  ed.addEventListener('drop', async (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    ed.classList.remove('drop-files');
    await addImageFiles(Array.from(e.dataTransfer.files));
  });
}

function initMergeTab() {
  state.mergeItems = [newMergeItem(), newMergeItem()];
  $('mergeAddBtn').addEventListener('click', () => {
    if (state.mergeItems.length >= MERGE_MAX) { showToast('Maksimal 12 spritesheet'); return; }
    state.mergeItems.push(newMergeItem(state.mergeItems[state.mergeItems.length - 1]));
    renderMergeList();
  });
  $('mergeMode').addEventListener('change', (e) => {
    $('mergeAppendSettings').hidden = e.target.value !== 'append';
    renderMergeList();
  });
  $('mergeRunBtn').addEventListener('click', runMerge);
  renderMergeList();
}

function initExportTab() {
  $('exportSheetBtn').addEventListener('click', exportSheetImage);
  $('exportZipBtn').addEventListener('click', exportFramesZip);
  $('exportFramesBtn').addEventListener('click', exportFramesOneByOne);
  $('exportJsonBtn').addEventListener('click', exportJsonMetadata);
  $('exportName').addEventListener('input', updateExportUI);
  $('exportName').addEventListener('change', () => { $('exportName').value = getBaseName(); updateExportUI(); });
  $('exportFormat').addEventListener('change', updateExportUI);
  $('exportQuality').addEventListener('input', updateExportUI);

  // Animation export
  let fps = 12;
  try { const s = parseInt(localStorage.getItem('ss.playerFps'), 10); if (s >= 1 && s <= 60) fps = s; } catch (e) { /* ignore */ }
  $('animFps').value = fps;
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    $('animFormat').querySelector('option[value="mp4"]').disabled = true;
    $('animNoMp4').hidden = false;
  }
  if (!webpEncodeSupported()) {
    $('animFormat').querySelector('option[value="webp"]').disabled = true;
    $('animNoWebp').hidden = false;
  }
  $('animFormat').addEventListener('change', updateExportUI);
  $('animTransparent').addEventListener('change', updateAnimUI);
  $('animQuality').addEventListener('input', updateAnimUI);
  $('exportAnimBtn').addEventListener('click', exportAnimation);
  updateExportUI();
}

