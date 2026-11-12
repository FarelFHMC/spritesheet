'use strict';

/* Spritesheet Studio v2.7.9 - paint: Paint Sprite (layers, lasso, smart split, colour wheel)
   Made by Farelfhmc - Studio Fhilion. MIT License.
   Part 3 of 5. Classic script: shares one global scope with the other js/ files, so keep the load order from index.html. */

/* =========================================================================
   PAINT SPRITE: the sprite fills the screen; a compact toolbar floats on top (categories:
   Tools / Layers / View), frames float at the bottom.
   Tools: brush, eraser, fill (bucket), eyedrop, lasso, pan. Brush and eraser each have their own size.
   Lasso: freehand selection (new / add / subtract) -> move to a new layer, copy, delete, invert,
   or move / rotate / resize the selected pixels in place (nearest-neighbour, never blurred).
   Smart Split: splits the active layer into new layers by separate parts or by color.
   Layers: every frame can have several layers (f.layers). f.canvas always holds the flattened
   picture of the visible layers, so the sheet, ZIP and every other tab keep working unchanged.
   Undo / redo covers strokes, fills and every layer change.
   Pointer events cover mouse, touch and pen.
   ========================================================================= */
const paint = {
  id: null, tool: 'brush', color: '#000000',
  sizes: { brush: 1, eraser: 1 },
  fill: { tolerance: 32, mode: 'contig', sample: 'layer' },
  cat: 'tools', opDrag: false, sel: null, lasso: null, xf: null, selMode: 'new',
  zoom: 0, undo: [], redo: [], pid: null, last: null, pan: null, picking: false, padT: 12, padB: 80
};
const ZOOM_STEPS = [0.25, 0.5, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];
const TOOL_OPTS = { brush: true, eraser: true, fill: true, lasso: true };   // tools that have an options popup
const MAX_LAYERS = 16;

/* ---------- onion skin (v2.7.9) ----------
   Display only: the neighbouring frames are drawn faintly BEHIND the current frame on the paint canvas.
   It never touches f.canvas, so the sheet, ZIP, GIF and every other tab stay exactly as before.
   The faint picture is cached; it is rebuilt when the frame, the frame list or a setting changes (not on every stroke). */
const ONION_DEFAULT = { on: false, before: 2, after: 1, opacity: 40, fade: true, loop: false, tint: true, cb: '#ff5c5c', ca: '#4da3ff' };
const onion = Object.assign({ cache: null, dirty: true }, ONION_DEFAULT);

function onionHex(v, fb) { return /^#[0-9a-f]{6}$/i.test(v) ? v : fb; }
function loadOnion() {
  try {
    const o = JSON.parse(localStorage.getItem('ss.onion') || 'null');
    if (!o || typeof o !== 'object') return;
    onion.on = !!o.on; onion.fade = o.fade !== false; onion.loop = !!o.loop; onion.tint = o.tint !== false;
    onion.before = Math.max(0, Math.min(5, parseInt(o.before, 10) || 0));
    onion.after = Math.max(0, Math.min(5, parseInt(o.after, 10) || 0));
    onion.opacity = Math.max(5, Math.min(90, parseInt(o.opacity, 10) || ONION_DEFAULT.opacity));
    onion.cb = onionHex(o.cb, ONION_DEFAULT.cb); onion.ca = onionHex(o.ca, ONION_DEFAULT.ca);
  } catch (e) { /* storage blocked or broken: keep the defaults */ }
}
function saveOnion() {
  const o = {}; Object.keys(ONION_DEFAULT).forEach((k) => { o[k] = onion[k]; });
  try { localStorage.setItem('ss.onion', JSON.stringify(o)); } catch (e) { /* ignore */ }
}

/* neighbours to show, farthest first so the nearest one ends on top */
function onionFrames(f) {
  const n = state.frames.length, i = state.frames.indexOf(f), out = [];
  if (i < 0 || n < 2) return out;
  const used = new Set([i]);
  const pick = (dir, count, col) => {
    for (let k = 1; k <= count; k++) {
      let j = i + dir * k;
      if (onion.loop) j = ((j % n) + n) % n; else if (j < 0 || j >= n) break;
      if (used.has(j)) break;                                   // wrapped round onto a frame that is already shown
      used.add(j);
      out.push({ f: state.frames[j], k, count, col });
    }
  };
  pick(-1, onion.before, onion.cb);
  pick(1, onion.after, onion.ca);
  return out.sort((a, b) => b.k - a.k);
}

function buildOnion(f) {
  onion.dirty = false;
  onion.cache = null;
  const list = onionFrames(f);
  if (!list.length) return;
  const w = f.canvas.width, h = f.canvas.height;
  const out = blankCanvas(w, h), ctx = out.getContext('2d');
  let tmp = null;
  list.forEach((o) => {
    const src = o.f.canvas;
    const dx = Math.round((w - src.width) / 2), dy = Math.round((h - src.height) / 2);   // frames of another size are centred
    ctx.globalAlpha = Math.max(0.03, onion.opacity / 100 * (onion.fade ? (o.count - o.k + 1) / o.count : 1));
    if (onion.tint) {
      if (!tmp || tmp.width !== src.width || tmp.height !== src.height) tmp = blankCanvas(src.width, src.height);
      const t = tmp.getContext('2d');
      t.globalCompositeOperation = 'source-over';
      t.clearRect(0, 0, tmp.width, tmp.height);
      t.drawImage(src, 0, 0);
      t.globalCompositeOperation = 'source-in';                  // keep the shape of the frame, replace its colours
      t.fillStyle = o.col;
      t.fillRect(0, 0, tmp.width, tmp.height);
      ctx.drawImage(tmp, dx, dy);
    } else {
      ctx.drawImage(src, dx, dy);
    }
  });
  ctx.globalAlpha = 1;
  onion.cache = out;
}

function paintFrame() { return state.frames.find((f) => f.id === paint.id) || null; }

function resetPaintHistory() { paint.undo = []; paint.redo = []; paint.pid = null; paint.last = null; paint.pan = null; paint.picking = false; paint.sel = null; paint.lasso = null; paint.xf = null; }

/* ---------- layers ---------- */
let layerCounter = 0;
function blankCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function newLayerObj(canvas, name) { return { id: 'l' + (layerCounter++), name, canvas, visible: true, opacity: 1 }; }

/* A frame gets its layers the first time it is opened in Paint Sprite: one layer holding the picture */
function ensureLayers(f) {
  if (f.layers && f.layers.length) return;
  f.layers = [newLayerObj(cloneCanvas(f.canvas), 'Layer 1')];
  f.active = 0;
  f.layerSeq = 1;
}
function activeLayer(f) {
  ensureLayers(f);
  f.active = Math.max(0, Math.min(f.active | 0, f.layers.length - 1));
  return f.layers[f.active];
}
function layerCtx(f) { return activeLayer(f).canvas.getContext('2d'); }

/* f.canvas = all visible layers stacked (bottom to top) */
function compositeFrame(f) {
  if (!f.layers) return;
  const ctx = f.canvas.getContext('2d');
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, f.canvas.width, f.canvas.height);
  f.layers.forEach((L) => {
    if (!L.visible) return;
    ctx.globalAlpha = L.opacity;
    ctx.drawImage(L.canvas, 0, 0);
  });
  ctx.restore();
}

/* Other tabs (Background) change the flattened picture directly: the layers are flattened into it */
function dropLayers(f) {
  f.layers = null;
  f.active = 0;
  if (f.id === paint.id) { paint.undo = []; paint.redo = []; }
}

function snapLayers(f) {
  const w = f.canvas.width, h = f.canvas.height;
  return {
    active: f.active, seq: f.layerSeq,
    layers: f.layers.map((L) => ({ id: L.id, name: L.name, visible: L.visible, opacity: L.opacity, data: L.canvas.getContext('2d').getImageData(0, 0, w, h) }))
  };
}
function restoreLayers(f, s) {
  const w = f.canvas.width, h = f.canvas.height;
  f.layers = s.layers.map((o) => {
    const c = blankCanvas(w, h);
    c.getContext('2d').putImageData(o.data, 0, 0);
    return { id: o.id, name: o.name, visible: o.visible, opacity: o.opacity, canvas: c };
  });
  f.active = Math.max(0, Math.min(s.active, f.layers.length - 1));
  f.layerSeq = s.seq;
}

/* The paint screen sits right under the top bar, whatever its height is (notches, wrapping) */
function updateTopbarH() {
  document.documentElement.style.setProperty('--topbar-h', $('topbar').offsetHeight + 'px');
}

/* Keeps the sprite clear of the floating bars when it is centred or fitted */
function layoutPaintPad() {
  const tb = $('paintToolsBar'), fb = $('paintFramesBar'), wrap = $('paintWrap');
  // computer / tablet: the toolbar docks on the left (the stage moves over), so only the bottom bar needs room
  const side = !tb.hidden && window.matchMedia('(min-width: 768px)').matches;
  $('panel-paint').classList.toggle('side-on', side);
  paint.side = side;
  paint.padT = (tb.hidden || side) ? 12 : tb.offsetHeight + 20;
  paint.padB = fb.offsetHeight + 20;
  wrap.style.setProperty('--pt', paint.padT + 'px');
  wrap.style.setProperty('--pb', paint.padB + 'px');
}

function paintScale() {
  const f = paintFrame();
  if (!f) return 1;
  if (paint.zoom) return paint.zoom;
  const wrap = $('paintWrap');
  const availW = Math.max(120, wrap.clientWidth - 24);
  const availH = Math.max(120, wrap.clientHeight - paint.padT - paint.padB);
  let sc = Math.min(availW / f.canvas.width, availH / f.canvas.height);
  if (sc >= 1) sc = Math.floor(sc);
  return Math.max(0.05, Math.min(64, sc));
}

function repaintPaintView() {
  const f = paintFrame();
  if (!f) return;
  const v = $('paintCanvas');
  const ctx = v.getContext('2d');
  ctx.clearRect(0, 0, v.width, v.height);
  if (onion.on) {
    if (onion.dirty || (onion.cache && onion.cache.width !== f.canvas.width)) buildOnion(f);
    if (onion.cache) ctx.drawImage(onion.cache, 0, 0);
  }
  ctx.drawImage(f.canvas, 0, 0);
}

/* layers changed -> rebuild the flattened picture, then redraw the screen */
function refreshPaint() {
  const f = paintFrame();
  if (!f) return;
  compositeFrame(f);
  repaintPaintView();
}

function renderPaintCanvas() {
  const f = paintFrame();
  if (!f) return;
  onion.dirty = true;                                          // another frame or the frame list may have changed
  ensureLayers(f);
  layoutPaintPad();
  const v = $('paintCanvas'), w = f.canvas.width, h = f.canvas.height;
  if (v.width !== w || v.height !== h) { v.width = w; v.height = h; }
  repaintPaintView();
  const sc = paintScale();
  v.style.width = (w * sc) + 'px';
  v.style.height = (h * sc) + 'px';
  $('paintZoomLabel').textContent = Math.round(sc * 100) + '%';
  renderLayerPanel();
  drawSelOverlay();
}

function syncPaintName() { const f = paintFrame(); $('paintName').value = f && f.name ? f.name : ''; }

function updatePaintButtons() {
  $('paintUndoBtn').disabled = paint.undo.length === 0;
  $('paintRedoBtn').disabled = paint.redo.length === 0;
}

function scrollPaintStrip() {
  const strip = $('paintFrameStrip'), b = strip.querySelector('.frame-pick.sel');
  if (b) strip.scrollLeft = b.offsetLeft - (strip.clientWidth - b.offsetWidth) / 2;
}

function renderPaintPicker() {
  const strip = $('paintFrameStrip');
  const prev = paint.id;
  if (!paintFrame()) paint.id = state.frames.length ? state.frames[0].id : null;
  if (paint.id !== prev) { resetPaintHistory(); syncPaintName(); }
  strip.innerHTML = '';
  state.frames.forEach((f, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'frame-pick' + (f.id === paint.id ? ' sel' : '');
    b.dataset.id = f.id;
    b.setAttribute('aria-label', '#' + i);
    b.appendChild(makeThumbCanvas(f.canvas, 48));
    b.addEventListener('click', () => selectPaintFrame(f.id));
    strip.appendChild(b);
  });
  const has = !!paint.id;
  $('paintEmpty').hidden = has;
  $('paintCanvas').hidden = !has;
  $('paintToolsBar').hidden = !has;
  $('paintName').hidden = !has;
  if (!has) closePaintPops();
  if (has) renderPaintCanvas(); else layoutPaintPad();
  updatePaintButtons();
  scrollPaintStrip();
}

function selectPaintFrame(id) {
  if (id === paint.id) return;
  commitXf();
  paint.id = id;
  resetPaintHistory();
  syncPaintName();
  document.querySelectorAll('#paintFrameStrip .frame-pick').forEach((b) => b.classList.toggle('sel', b.dataset.id === id));
  renderPaintCanvas();
  updatePaintButtons();
  scrollPaintStrip();
}

/* New empty frame right after the selected one, and jump to it */
function paintAddEmpty() {
  const sel = state.frames.findIndex((f) => f.id === paint.id);
  const fr = addEmptyFrame(sel < 0 ? state.frames.length : sel + 1);
  selectPaintFrame(fr.id);
}

/* Called after pixels of the selected frame changed (stroke end, fill, undo, redo, layer change). */
function paintChanged() {
  state.sheetStale = true;
  state.thumbsDirty = true;
  const f = paintFrame();
  const b = $('paintFrameStrip').querySelector('.frame-pick.sel');
  if (f && b) { b.innerHTML = ''; b.appendChild(makeThumbCanvas(f.canvas, 48)); }
  if (paint.cat === 'layers') renderLayerPanel();
}

function pushPaintUndo(f) {
  ensureLayers(f);
  const w = f.canvas.width, h = f.canvas.height;
  paint.undo.push(snapLayers(f));
  const max = Math.max(3, Math.min(40, Math.floor(48e6 / (w * h * 4 * f.layers.length)))); // cap memory on big frames
  while (paint.undo.length > max) paint.undo.shift();
  paint.redo = [];
  updatePaintButtons();
}

function paintStep(from, to) {
  if (paint.xf) { cancelXf(); return; }                     // Ctrl+Z while transforming drops the transform
  const f = paintFrame();
  if (!f || !from.length || paint.pid !== null) return;
  ensureLayers(f);
  const snap = from.pop();
  to.push(snapLayers(f));
  restoreLayers(f, snap);
  refreshPaint();
  renderLayerPanel();
  paintChanged();
  updatePaintButtons();
}

/* ---------- brush / eraser ---------- */
function stampAt(ctx, x, y) {
  const sz = paint.sizes[paint.tool] || 1, o = Math.floor(sz / 2);
  if (paint.tool === 'eraser') {
    ctx.clearRect(x - o, y - o, sz, sz);
  } else {
    ctx.fillStyle = paint.color;
    ctx.fillRect(x - o, y - o, sz, sz);
  }
}

/* Bresenham: stamps every pixel between two points so fast strokes leave no gaps */
function strokeLine(ctx, x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 20000; guard++) {
    stampAt(ctx, x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/* ---------- fill (bucket) ----------
   Colors count as "the same" when every channel (R, G, B, A) differs by at most `tolerance`.
   Two fully transparent pixels always match. Mode: connected area only, or every matching pixel.
   Sample: look at the active layer only, or at the flattened picture of all visible layers.
   The result is always painted onto the active layer. */
function floodFill(f, x, y) {
  const w = f.canvas.width, h = f.canvas.height;
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const lctx = layerCtx(f);
  const dst = lctx.getImageData(0, 0, w, h);
  const dd = dst.data;
  const sd = paint.fill.sample === 'all'
    ? f.canvas.getContext('2d').getImageData(0, 0, w, h).data
    : new Uint8ClampedArray(dd);                       // a copy, so painting does not disturb the test
  const tol = paint.fill.tolerance;
  const i0 = (y * w + x) * 4;
  const tr = sd[i0], tg = sd[i0 + 1], tb = sd[i0 + 2], ta = sd[i0 + 3];
  const match = (i) => {
    const a = sd[i + 3];
    if (a === 0 && ta === 0) return true;
    return Math.abs(sd[i] - tr) <= tol && Math.abs(sd[i + 1] - tg) <= tol && Math.abs(sd[i + 2] - tb) <= tol && Math.abs(a - ta) <= tol;
  };
  const c = hexToRgb(paint.color);
  const put = (i) => { dd[i] = c.r; dd[i + 1] = c.g; dd[i + 2] = c.b; dd[i + 3] = 255; };

  if (paint.fill.mode === 'global') {
    for (let p = 0; p < w * h; p++) if (match(p * 4)) put(p * 4);
  } else {
    const seen = new Uint8Array(w * h);
    const stack = [x, y];
    while (stack.length) {
      const cy = stack.pop(), cx = stack.pop();
      let lx = cx;
      while (lx >= 0 && !seen[cy * w + lx] && match((cy * w + lx) * 4)) lx--;
      lx++;
      let up = false, down = false;
      for (let px = lx; px < w; px++) {
        const p = cy * w + px;
        if (seen[p] || !match(p * 4)) break;
        seen[p] = 1;
        put(p * 4);
        if (cy > 0) {
          const u = p - w, ok = !seen[u] && match(u * 4);
          if (ok && !up) { stack.push(px, cy - 1); up = true; } else if (!ok) up = false;
        }
        if (cy < h - 1) {
          const d = p + w, ok = !seen[d] && match(d * 4);
          if (ok && !down) { stack.push(px, cy + 1); down = true; } else if (!ok) down = false;
        }
      }
    }
  }
  lctx.putImageData(dst, 0, 0);
  return true;
}

function paintPoint(e) {
  const f = paintFrame(), r = $('paintCanvas').getBoundingClientRect();
  const w = f.canvas.width, h = f.canvas.height;
  const cl = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  return {
    x: cl(Math.floor((e.clientX - r.left) * w / r.width), -40, w + 40),
    y: cl(Math.floor((e.clientY - r.top) * h / r.height), -40, h + 40)
  };
}

/* keepTool = true while the eyedrop is picking, so the tool is not switched mid-gesture */
/* ---------- colour wheel: hue ring around a saturation / brightness square ---------- */
const wheel = { h: 0, s: 0, v: 0, size: 220, ring: 24, dpr: 1, ringCanvas: null, drag: null, pid: null };

function hsvToRgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

function wheelGeom() {
  const S = wheel.size, R = S / 2 - 3, ri = R - wheel.ring, half = (ri - 8) / Math.SQRT2;
  return { S, c: S / 2, R, ri, left: S / 2 - half, top: S / 2 - half, side: half * 2 };
}

/* the hue ring never changes, so it is drawn once into its own canvas */
function buildWheelRing() {
  const g = wheelGeom(), d = wheel.dpr, N = Math.round(g.S * d);
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N), px = img.data;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (x + 0.5) * g.S / N - g.c, dy = (y + 0.5) * g.S / N - g.c, r = Math.hypot(dx, dy);
      const a = Math.min(1, Math.max(0, g.R - r + 0.5)) * Math.min(1, Math.max(0, r - g.ri + 0.5));   // soft edges
      if (a <= 0) continue;
      let h = Math.atan2(dx, -dy) * 180 / Math.PI;
      if (h < 0) h += 360;
      const rgb = hsvToRgb(h, 1, 1), o = (y * N + x) * 4;
      px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2]; px[o + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  wheel.ringCanvas = cv;
}

function wheelMarker(ctx, x, y, rgb) {
  ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgb(' + rgb.join(',') + ')'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 9.5, 0, Math.PI * 2);
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.stroke();
}

function drawWheel(force) {
  const cv = $('wheelCanvas');
  if (!cv || (!force && $('paintPop').hidden)) return;       // nothing to draw while the popup is closed
  if (!wheel.ringCanvas) buildWheelRing();
  const g = wheelGeom(), N = cv.width, ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, N, N);
  ctx.drawImage(wheel.ringCanvas, 0, 0);
  ctx.setTransform(N / g.S, 0, 0, N / g.S, 0, 0);
  const hue = hsvToRgb(wheel.h, 1, 1);
  let gr = ctx.createLinearGradient(g.left, 0, g.left + g.side, 0);
  gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgb(' + hue.join(',') + ')');
  ctx.fillStyle = gr; ctx.fillRect(g.left, g.top, g.side, g.side);
  gr = ctx.createLinearGradient(0, g.top, 0, g.top + g.side);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000');
  ctx.fillStyle = gr; ctx.fillRect(g.left, g.top, g.side, g.side);
  const ang = wheel.h * Math.PI / 180, mr = (g.R + g.ri) / 2;
  wheelMarker(ctx, g.c + Math.sin(ang) * mr, g.c - Math.cos(ang) * mr, hue);
  wheelMarker(ctx, g.left + wheel.s * g.side, g.top + (1 - wheel.v) * g.side, hsvToRgb(wheel.h, wheel.s, wheel.v));
}

function wheelPoint(e) {
  const r = $('wheelCanvas').getBoundingClientRect(), S = wheel.size;
  return { x: (e.clientX - r.left) * S / (r.width || S), y: (e.clientY - r.top) * S / (r.height || S) };
}

function wheelSet(e) {
  const g = wheelGeom(), p = wheelPoint(e);
  if (wheel.drag === 'hue') {
    let h = Math.atan2(p.x - g.c, -(p.y - g.c)) * 180 / Math.PI;
    wheel.h = h < 0 ? h + 360 : h;
  } else {
    wheel.s = Math.min(1, Math.max(0, (p.x - g.left) / g.side));
    wheel.v = 1 - Math.min(1, Math.max(0, (p.y - g.top) / g.side));
  }
  const rgb = hsvToRgb(wheel.h, wheel.s, wheel.v);
  setPaintColor(rgbToHex(rgb[0], rgb[1], rgb[2]), false, true);
  drawWheel(true);
}

function initColorWheel() {
  const cv = $('wheelCanvas');
  wheel.dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  cv.width = cv.height = Math.round(wheel.size * wheel.dpr);
  cv.addEventListener('pointerdown', (e) => {
    if (wheel.drag) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const g = wheelGeom(), p = wheelPoint(e), r = Math.hypot(p.x - g.c, p.y - g.c);
    if (r >= g.ri - 4 && r <= g.R + 6) wheel.drag = 'hue';
    else if (p.x >= g.left - 6 && p.x <= g.left + g.side + 6 && p.y >= g.top - 6 && p.y <= g.top + g.side + 6) wheel.drag = 'sv';
    else return;
    e.preventDefault();
    wheel.pid = e.pointerId;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    wheelSet(e);
  });
  cv.addEventListener('pointermove', (e) => { if (wheel.drag && e.pointerId === wheel.pid) wheelSet(e); });
  const end = (e) => { if (e.pointerId === wheel.pid) { wheel.drag = null; wheel.pid = null; } };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
}

function setPaintColor(hex, keepTool, fromWheel) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  paint.color = hex.toLowerCase();
  $('paintHex').value = paint.color;
  $('paintChipFill').style.background = paint.color;
  if (!fromWheel) {                                   // swatch, hex field or eyedrop: move the wheel to match
    const c = hexToRgb(paint.color), hsv = rgbToHsv(c.r, c.g, c.b);
    wheel.s = hsv[1]; wheel.v = hsv[2];
    if (hsv[1] > 0.001 && hsv[2] > 0.001) wheel.h = hsv[0];   // grey / black have no hue: keep the old one
    drawWheel();
  }
  if (!keepTool && paint.tool !== 'brush' && paint.tool !== 'fill') setPaintTool('brush'); // picking a color means you want to paint with it
}

function setPaintTool(tool) {
  if (paint.xf && tool !== 'lasso') commitXf();
  paint.tool = tool;
  document.querySelectorAll('#paintToolsBar [data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
  const v = $('paintCanvas');
  v.classList.toggle('tool-pan', tool === 'pan');
  v.classList.toggle('tool-pick', tool === 'picker');
  v.classList.toggle('tool-fill', tool === 'fill');
  if (!$('paintOpts').hidden) { if (TOOL_OPTS[tool]) renderOpts(); else $('paintOpts').hidden = true; }
}

/* Eyedrop: read the colour under the pointer from the frame itself (not from the zoomed view) */
function pickColorAt(e, first) {
  const f = paintFrame();
  if (!f) return;
  const pt = paintPoint(e), w = f.canvas.width, h = f.canvas.height;
  if (pt.x < 0 || pt.y < 0 || pt.x >= w || pt.y >= h) return;
  const d = f.canvas.getContext('2d').getImageData(pt.x, pt.y, 1, 1).data;
  if (d[3] === 0) { if (first) showToast('Piksel transparan'); return; }
  setPaintColor(rgbToHex(d[0], d[1], d[2]), true);
}

/* Zoom around a screen point (default: the middle of the screen) so the spot you look at stays put */
function zoomPaintTo(next, px, py) {
  const v = $('paintCanvas'), wrap = $('paintWrap');
  const r = v.getBoundingClientRect();
  if (px == null) { const wr = wrap.getBoundingClientRect(); px = wr.left + wr.width / 2; py = wr.top + wr.height / 2; }
  const fx = r.width ? (px - r.left) / r.width : 0.5, fy = r.height ? (py - r.top) / r.height : 0.5;
  paint.zoom = next;
  renderPaintCanvas();
  const r2 = v.getBoundingClientRect();
  wrap.scrollLeft += (r2.left + fx * r2.width) - px;
  wrap.scrollTop += (r2.top + fy * r2.height) - py;
}

function stepPaintZoom(dir, px, py) {
  const cur = paintScale();
  let next;
  if (dir > 0) next = ZOOM_STEPS.find((z) => z > cur * 1.0001) || ZOOM_STEPS[ZOOM_STEPS.length - 1];
  else next = [...ZOOM_STEPS].reverse().find((z) => z < cur * 0.9999) || ZOOM_STEPS[0];
  zoomPaintTo(next, px, py);
}

/* ---------- popups: colour, tool options, layers (only one is open at a time) ---------- */
function closePaintPops() {
  $('paintPop').hidden = true;
  $('paintOpts').hidden = true;
  $('paintOnion').hidden = true;
  $('paintOnionCfgBtn').setAttribute('aria-expanded', 'false');
  $('paintColorChip').setAttribute('aria-expanded', 'false');
}

function renderOpts() {
  const t = paint.tool, sized = t === 'brush' || t === 'eraser';
  $('optSizeField').hidden = !sized;
  $('optFill').hidden = t !== 'fill';
  $('optLasso').hidden = t !== 'lasso';
  if (t === 'lasso') renderLassoOpts();
  if (sized) {
    $('optSize').value = paint.sizes[t];
    $('optSizeVal').textContent = paint.sizes[t];
  }
  if (t === 'fill') {
    $('fillTol').value = paint.fill.tolerance;
    $('fillTolVal').textContent = paint.fill.tolerance;
    document.querySelectorAll('[data-fillmode]').forEach((b) => b.classList.toggle('on', b.dataset.fillmode === paint.fill.mode));
    document.querySelectorAll('[data-fillsample]').forEach((b) => b.classList.toggle('on', b.dataset.fillsample === paint.fill.sample));
  }
}

function openOpts(show) {
  const pop = $('paintOpts');
  if (show) {
    closePaintPops();
    renderOpts();
    pop.hidden = false;
  } else {
    pop.hidden = true;
  }
}

function setPaintCat(cat) {
  paint.cat = cat;
  document.querySelectorAll('#paintCats [data-cat]').forEach((b) => b.classList.toggle('on', b.dataset.cat === cat));
  document.querySelectorAll('[data-cat-row]').forEach((r) => { r.hidden = r.dataset.catRow !== cat; });
  closePaintPops();
  $('paintLayers').hidden = cat !== 'layers';
  if (cat === 'layers') renderLayerPanel();
  layoutPaintPad();
}

/* ---------- lasso: freehand selection ----------
   The selection is a mask (1 byte per pixel) of the frame. It is drawn as a dashed outline on an overlay
   canvas above the sprite. Actions work on the pixels of the ACTIVE layer inside the mask. */
function getSel(f) {
  const s = paint.sel;
  if (!s) return null;
  if (!f || s.w !== f.canvas.width || s.h !== f.canvas.height) { paint.sel = null; return null; }
  return s;
}

function lassoPoint(e) {
  const f = paintFrame(), r = $('paintCanvas').getBoundingClientRect();
  const w = f.canvas.width, h = f.canvas.height;
  const cl = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  return { x: cl((e.clientX - r.left) * w / r.width, 0, w), y: cl((e.clientY - r.top) * h / r.height, 0, h) };
}

function lassoMove(e) {
  const l = paint.lasso;
  if (!l || !paintFrame()) return;
  const pt = lassoPoint(e), last = l.pts[l.pts.length - 1];
  if (Math.abs(pt.x - last.x) < 0.3 && Math.abs(pt.y - last.y) < 0.3) return;
  l.pts.push(pt);
  drawSelOverlay();
}

/* A polygon becomes a mask: a pixel is inside when at least half of it is covered */
function polygonMask(pts, w, h) {
  const c = blankCanvas(w, h), ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  const d = ctx.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
  for (let p = 0; p < m.length; p++) if (d[p * 4 + 3] >= 128) m[p] = 1;
  return m;
}

/* Outline of the mask as one path (frame coordinates): an edge wherever a selected pixel touches an unselected one */
function maskOutline(m, w, h) {
  const path = new Path2D();
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (m[y * w + x] !== 1) continue;
      if (!on(x, y - 1)) { path.moveTo(x, y); path.lineTo(x + 1, y); }
      if (!on(x, y + 1)) { path.moveTo(x, y + 1); path.lineTo(x + 1, y + 1); }
      if (!on(x - 1, y)) { path.moveTo(x, y); path.lineTo(x, y + 1); }
      if (!on(x + 1, y)) { path.moveTo(x + 1, y); path.lineTo(x + 1, y + 1); }
    }
  }
  return path;
}

function setSelection(m, w, h) {
  let n = 0;
  for (let p = 0; p < m.length; p++) n += m[p];
  paint.sel = n ? { w, h, mask: m, count: n, path: maskOutline(m, w, h) } : null;
  drawSelOverlay();
  if (!$('splitBox').hidden) syncSplitUI();
  if (!$('paintOpts').hidden && paint.tool === 'lasso') renderLassoOpts();
}

function clearSelection() {
  paint.sel = null;
  drawSelOverlay();
  if (!$('splitBox').hidden) syncSplitUI();
  if (!$('paintOpts').hidden && paint.tool === 'lasso') renderLassoOpts();
}

function finishLasso() {
  const l = paint.lasso;
  paint.lasso = null;
  const f = paintFrame();
  if (!l || !f) { drawSelOverlay(); return; }
  const w = f.canvas.width, h = f.canvas.height;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  l.pts.forEach((q) => { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); });
  if (l.pts.length < 3 || (x1 - x0 < 1 && y1 - y0 < 1)) {          // a tap: deselect (only in New mode)
    if (paint.selMode === 'new') clearSelection(); else drawSelOverlay();
    if (paint.tool === 'lasso') openOpts(true);
    return;
  }
  const m = polygonMask(l.pts, w, h), old = getSel(f);
  if (paint.selMode !== 'new' && old) {
    for (let p = 0; p < m.length; p++) m[p] = paint.selMode === 'add' ? (m[p] | old.mask[p]) : (old.mask[p] && !m[p] ? 1 : 0);
  } else if (paint.selMode === 'sub') {
    m.fill(0);
  }
  setSelection(m, w, h);
  if (paint.tool === 'lasso') openOpts(true);                       // bring the actions back after drawing
}

/* Dashed outline (white + black, so it shows on any color) and the lasso being drawn */
function drawSelOverlay() {
  const ov = $('paintOverlay'), f = paintFrame();
  if (!ov) return;
  if (!f) { ov.width = 1; ov.height = 1; return; }
  const w = f.canvas.width, h = f.canvas.height, sc = paintScale();
  const k = Math.min(1, 4096 / Math.max(w * sc, h * sc, 1));
  const ow = Math.max(1, Math.round(w * sc * k)), oh = Math.max(1, Math.round(h * sc * k));
  if (ov.width !== ow || ov.height !== oh) { ov.width = ow; ov.height = oh; }
  const ctx = ov.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ov.width, ov.height);
  const s = ov.width / w, px = 1 / (sc || 1);        // 1 screen pixel, in frame units
  ctx.setTransform(s, 0, 0, s, 0, 0);
  const strokeBoth = (draw) => {
    ctx.lineJoin = 'round';
    ctx.setLineDash([]); ctx.lineWidth = 2.5 * px; ctx.strokeStyle = '#fff'; draw();
    ctx.setLineDash([5 * px, 5 * px]); ctx.lineWidth = 1.25 * px; ctx.strokeStyle = '#000'; draw();
  };
  const sel = getSel(f);
  if (sel && !paint.xf) strokeBoth(() => ctx.stroke(sel.path));
  if (paint.xf) drawXfBox(ctx, paint.xf, px, strokeBoth);
  if (paint.lasso && paint.lasso.pts.length > 1) {
    const pts = paint.lasso.pts;
    strokeBoth(() => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    });
  }
}

function renderLassoOpts() {
  const f = paintFrame(), s = getSel(f), has = !!s;
  $('selCount').textContent = has ? s.count : 0;
  document.querySelectorAll('[data-lassomode]').forEach((b) => b.classList.toggle('on', b.dataset.lassomode === paint.selMode));
  ['selCutBtn', 'selCopyBtn', 'selDelBtn', 'selClearBtn', 'selXfBtn'].forEach((id) => { $(id).disabled = !has; });
  $('selInvBtn').disabled = !f;
  $('lassoMain').hidden = !!paint.xf;
  $('lassoXf').hidden = !paint.xf;
  if (paint.xf) xfSyncUI();
}

function invertSelection() {
  const f = paintFrame();
  if (!f) return;
  const w = f.canvas.width, h = f.canvas.height, old = getSel(f), m = new Uint8Array(w * h);
  for (let p = 0; p < m.length; p++) m[p] = old ? (old.mask[p] ? 0 : 1) : 1;   // nothing selected: invert = select all
  setSelection(m, w, h);
}

/* ---------- lasso: move / rotate / resize the selected pixels ----------
   "Geser / Putar / Ubah ukuran" lifts the pixels of the selected layer inside the lasso and shows a box:
   drag inside = move, corners = resize (keeps the proportions), edges = stretch one side, round handle = rotate
   (Shift = steps of 15 deg). Width / height / angle can also be typed. Terapkan (Enter) applies, Batal (Esc) drops it.
   Nothing is ever blurred: every pixel of the result copies exactly ONE source pixel (nearest neighbour), sizes are
   whole pixels, moves are whole pixels, and no anti-aliasing is added. It ignores the Pixelated / Smoothed switch. */
const XF_SIGN = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };
const XF_CURSOR = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', rot: 'grab', move: 'move' };
const XF_MAX = 4096;

function xfToWorld(o, lx, ly) { const c = Math.cos(o.ang), s = Math.sin(o.ang); return { x: o.cx + lx * c - ly * s, y: o.cy + lx * s + ly * c }; }
function xfToLocal(o, wx, wy) { const c = Math.cos(o.ang), s = Math.sin(o.ang), dx = wx - o.cx, dy = wy - o.cy; return { x: dx * c + dy * s, y: -dx * s + dy * c }; }
function xfNorm(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a <= -Math.PI) a += 2 * Math.PI; return a; }
function xfIsIdentity(xf) { return Math.abs(xf.ang) < 1e-9 && xf.w === xf.bw && xf.h === xf.bh && xf.cx === xf.x0 + xf.bw / 2 && xf.cy === xf.y0 + xf.bh / 2; }

/* frame position of a pointer, as decimals and without clamping (the box may leave the frame) */
function xfPoint(e) {
  const f = paintFrame(), r = $('paintCanvas').getBoundingClientRect();
  return { x: (e.clientX - r.left) * f.canvas.width / r.width, y: (e.clientY - r.top) * f.canvas.height / r.height };
}

/* Result of the transform on top of xf.base. Every destination pixel looks up one source pixel. mask (optional) is filled with the new selection. */
function xfRender(xf, W, H, mask) {
  const out = new ImageData(new Uint8ClampedArray(xf.base.data), W, H), od = out.data, sd = xf.src.data;
  const c = Math.cos(xf.ang), s = Math.sin(xf.ang), hw = xf.w / 2, hh = xf.h / 2, kx = xf.bw / xf.w, ky = xf.bh / xf.h, bw = xf.bw, bh = xf.bh;
  const ex = Math.abs(hw * c) + Math.abs(hh * s), ey = Math.abs(hw * s) + Math.abs(hh * c);
  const X0 = Math.max(0, Math.floor(xf.cx - ex)), X1 = Math.min(W - 1, Math.ceil(xf.cx + ex));
  const Y0 = Math.max(0, Math.floor(xf.cy - ey)), Y1 = Math.min(H - 1, Math.ceil(xf.cy + ey));
  for (let y = Y0; y <= Y1; y++) {
    for (let x = X0; x <= X1; x++) {
      const dx = x + 0.5 - xf.cx, dy = y + 0.5 - xf.cy;
      const u = dx * c + dy * s, v = -dx * s + dy * c;
      if (u < -hw || u >= hw || v < -hh || v >= hh) continue;
      const sx = Math.min(bw - 1, Math.floor((u + hw) * kx)), sy = Math.min(bh - 1, Math.floor((v + hh) * ky)), sp = sy * bw + sx;
      if (!xf.smask[sp]) continue;
      if (mask) mask[y * W + x] = 1;
      const si = sp * 4, a = sd[si + 3];
      if (!a) continue;
      const di = (y * W + x) * 4, ba = od[di + 3];
      if (a === 255 || !ba) {                                  // whole pixel copied as it is
        od[di] = sd[si]; od[di + 1] = sd[si + 1]; od[di + 2] = sd[si + 2]; od[di + 3] = a;
      } else {                                                 // see-through pixel over something: normal "over" mix, no smoothing
        const fa = a / 255, fb = ba / 255 * (1 - fa), fo = fa + fb;
        od[di] = (sd[si] * fa + od[di] * fb) / fo; od[di + 1] = (sd[si + 1] * fa + od[di + 1] * fb) / fo;
        od[di + 2] = (sd[si + 2] * fa + od[di + 2] * fb) / fo; od[di + 3] = fo * 255;
      }
    }
  }
  return out;
}

function startXf() {
  const f = paintFrame();
  if (!f || paint.xf) return;
  const sel = getSel(f);
  if (!sel) { showToast('Belum ada area terpilih'); return; }
  ensureLayers(f);
  const L = activeLayer(f);
  if (!L.visible) { showToast('Layer tersembunyi'); return; }
  const W = f.canvas.width, H = f.canvas.height;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let p = 0; p < W * H; p++) {
    if (!sel.mask[p]) continue;
    const x = p % W, y = (p - x) / W;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const base = L.canvas.getContext('2d').getImageData(0, 0, W, H), bd = base.data;
  const orig = new ImageData(new Uint8ClampedArray(bd), W, H);
  const src = new ImageData(bw, bh), smask = new Uint8Array(bw * bh);
  let any = 0;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const p = (y0 + y) * W + x0 + x;
      if (!sel.mask[p]) continue;
      const i = p * 4, j = (y * bw + x) * 4;
      smask[y * bw + x] = 1;
      src.data[j] = bd[i]; src.data[j + 1] = bd[i + 1]; src.data[j + 2] = bd[i + 2]; src.data[j + 3] = bd[i + 3];
      if (bd[i + 3]) any++;
      bd[i] = bd[i + 1] = bd[i + 2] = bd[i + 3] = 0;
    }
  }
  if (!any) { showToast('Tidak ada piksel di area ini pada layer terpilih'); return; }
  paint.xf = { L, orig, base, src, smask, bw, bh, x0, y0, cx: x0 + bw / 2, cy: y0 + bh / 2, w: bw, h: bh, ang: 0, drag: null };
  openOpts(true);
  drawSelOverlay();
}

function xfPreview() {
  const xf = paint.xf, f = paintFrame();
  if (!xf || !f) return;
  xf.L.canvas.getContext('2d').putImageData(xfRender(xf, f.canvas.width, f.canvas.height, null), 0, 0);
  refreshPaint();
  drawSelOverlay();
  xfSyncUI();
}

function xfEnd() {
  paint.xf = null;
  $('paintCanvas').style.cursor = '';
  drawSelOverlay();
  if (!$('paintOpts').hidden && paint.tool === 'lasso') renderLassoOpts();
}

function applyXf() {
  const xf = paint.xf, f = paintFrame();
  if (!xf) return;
  if (!f) { paint.xf = null; return; }
  const W = f.canvas.width, H = f.canvas.height, lctx = xf.L.canvas.getContext('2d');
  lctx.putImageData(xf.orig, 0, 0);                         // first the old picture, so the undo step holds it
  if (xfIsIdentity(xf)) { paint.xf = null; refreshPaint(); xfEnd(); return; }
  paint.xf = null;
  pushPaintUndo(f);
  const m = new Uint8Array(W * H);
  lctx.putImageData(xfRender(xf, W, H, m), 0, 0);
  setSelection(m, W, H);                                    // the lasso follows the moved pixels
  refreshPaint();
  paintChanged();
  renderLayerPanel();
  updatePaintButtons();
  xfEnd();
  showToast('Perubahan diterapkan');
}

function cancelXf() {
  const xf = paint.xf, f = paintFrame();
  if (!xf) return;
  paint.xf = null;
  if (f) { xf.L.canvas.getContext('2d').putImageData(xf.orig, 0, 0); refreshPaint(); }
  xfEnd();
}

function commitXf() { if (paint.xf) applyXf(); }

function xfSyncUI() {
  const xf = paint.xf;
  if (!xf) return;
  const set = (id, v) => { const el = $(id); if (document.activeElement !== el) el.value = v; };
  set('xfW', xf.w); set('xfH', xf.h);
  set('xfAngle', Math.round(xf.ang * 1800 / Math.PI) / 10);
}

/* what is under the pointer: 'rot', a handle name, 'move' or null */
function xfHit(e) {
  const xf = paint.xf, f = paintFrame();
  if (!xf || !f) return null;
  const r = $('paintCanvas').getBoundingClientRect(), k = r.width / f.canvas.width, p = xfPoint(e);
  const rad = (e.pointerType === 'touch' ? 20 : 11) / k, hw = xf.w / 2, hh = xf.h / 2;
  const near = (lx, ly) => { const q = xfToWorld(xf, lx, ly); return Math.hypot(q.x - p.x, q.y - p.y) <= rad; };
  if (near(0, -hh - 26 / k)) return 'rot';
  for (const n of ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w']) if (near(XF_SIGN[n][0] * hw, XF_SIGN[n][1] * hh)) return n;
  const l = xfToLocal(xf, p.x, p.y);
  return (Math.abs(l.x) <= hw && Math.abs(l.y) <= hh) ? 'move' : null;
}

function xfDown(e) {
  const xf = paint.xf, hit = xfHit(e);
  xf.drag = hit ? { kind: hit, p0: xfPoint(e), cx: xf.cx, cy: xf.cy, w: xf.w, h: xf.h, ang: xf.ang } : null;
  if (hit) $('paintCanvas').style.cursor = hit === 'move' || hit === 'rot' ? 'grabbing' : XF_CURSOR[hit];
}

function xfDrag(e) {
  const xf = paint.xf, d = xf && xf.drag;
  if (!d) return;
  const p = xfPoint(e);
  if (d.kind === 'move') {
    xf.cx = d.cx + Math.round(p.x - d.p0.x);
    xf.cy = d.cy + Math.round(p.y - d.p0.y);
  } else if (d.kind === 'rot') {
    let a = Math.atan2(p.y - d.cy, p.x - d.cx) + Math.PI / 2;
    if (e.shiftKey) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12);
    xf.ang = xfNorm(a);
  } else {
    const [hx, hy] = XF_SIGN[d.kind], o = { cx: d.cx, cy: d.cy, ang: d.ang };
    const pl = xfToLocal(o, p.x, p.y), ax = -hx * d.w / 2, ay = -hy * d.h / 2;   // the opposite side / corner stays where it is
    let nw = d.w, nh = d.h;
    if (hx && hy) {
      const Dx = hx * d.w, Dy = hy * d.h, kk = ((pl.x - ax) * Dx + (pl.y - ay) * Dy) / (Dx * Dx + Dy * Dy);
      nw = d.w * kk; nh = d.h * kk;
    } else {
      if (hx) nw = hx * (pl.x - ax);
      if (hy) nh = hy * (pl.y - ay);
    }
    nw = Math.max(1, Math.min(XF_MAX, Math.round(nw)));
    nh = Math.max(1, Math.min(XF_MAX, Math.round(nh)));
    const q = xfToWorld(o, ax + hx * nw / 2, ay + hy * nh / 2);
    xf.w = nw; xf.h = nh; xf.cx = q.x; xf.cy = q.y;
  }
  xfPreview();
}

/* the box, its handles and the rotate handle on the overlay (frame units; px = 1 screen pixel) */
function drawXfBox(ctx, xf, px, strokeBoth) {
  const hw = xf.w / 2, hh = xf.h / 2, W = (lx, ly) => xfToWorld(xf, lx, ly);
  const pts = [W(-hw, -hh), W(hw, -hh), W(hw, hh), W(-hw, hh)], top = W(0, -hh), rot = W(0, -hh - 26 * px);
  strokeBoth(() => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.moveTo(top.x, top.y); ctx.lineTo(rot.x, rot.y);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.lineWidth = 1.5 * px; ctx.strokeStyle = '#000'; ctx.fillStyle = '#fff';
  const dot = (q, round) => {
    ctx.beginPath();
    if (round) ctx.arc(q.x, q.y, 6 * px, 0, Math.PI * 2); else ctx.rect(q.x - 5 * px, q.y - 5 * px, 10 * px, 10 * px);
    ctx.fill(); ctx.stroke();
  };
  Object.keys(XF_SIGN).forEach((n) => dot(W(XF_SIGN[n][0] * hw, XF_SIGN[n][1] * hh), false));
  dot(rot, true);
}

/* kind: 'cut' (move to a new layer) | 'copy' (copy to a new layer) | 'delete' (erase) */
function selectionOp(kind) {
  const f = paintFrame();
  if (!f) return;
  const s = getSel(f);
  if (!s) { showToast('Belum ada area terpilih'); return; }
  ensureLayers(f);
  if (kind !== 'delete' && f.layers.length >= MAX_LAYERS) { showToast('Maksimal 16 layer'); return; }
  const w = f.canvas.width, h = f.canvas.height, L = activeLayer(f);
  const src = L.canvas.getContext('2d').getImageData(0, 0, w, h), sd = src.data;
  const part = new ImageData(w, h), pd = part.data;
  let moved = 0;
  for (let p = 0; p < w * h; p++) {
    if (!s.mask[p]) continue;
    const i = p * 4;
    if (!sd[i + 3]) continue;
    pd[i] = sd[i]; pd[i + 1] = sd[i + 1]; pd[i + 2] = sd[i + 2]; pd[i + 3] = sd[i + 3];
    if (kind !== 'copy') { sd[i] = sd[i + 1] = sd[i + 2] = sd[i + 3] = 0; }
    moved++;
  }
  if (!moved) { showToast('Tidak ada piksel di area ini pada layer terpilih'); return; }
  const op = L.opacity, vis = L.visible;
  layerOp((ff) => {
    if (kind !== 'copy') ff.layers[ff.active].canvas.getContext('2d').putImageData(src, 0, 0);
    if (kind !== 'delete') {
      const c = blankCanvas(w, h);
      c.getContext('2d').putImageData(part, 0, 0);
      ff.layerSeq = (ff.layerSeq || ff.layers.length) + 1;
      const nl = newLayerObj(c, (kind === 'cut' ? tr('Potongan') : tr('Salinan')) + ' ' + ff.layerSeq);
      nl.opacity = op; nl.visible = vis;
      ff.layers.splice(ff.active + 1, 0, nl);
      ff.active += 1;
    }
  });
  showToast(kind === 'cut' ? 'Dipisah ke layer baru' : kind === 'copy' ? 'Disalin ke layer baru' : 'Isi area dihapus');
}

/* ---------- smart split: one layer -> several layers ----------
   Parts: pixels that touch (8 directions, plus a "join distance") belong together.
   Colors: similar colors are grouped (the most common colors seed the groups).
   Pieces smaller than the "ignore" size are gathered into one layer called Rest.
   Keeps within the 16-layer limit by merging the smallest pieces into Rest. */
const split = { mode: 'parts', gap: 0, tol: 40, min: 2, keep: false, useSel: true };

/* square grow of a mask by r pixels (two passes, one per direction) */
function dilateMask(src, w, h, r) {
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let last = -1e9;
    for (let x = 0; x < w; x++) { if (src[row + x]) last = x; if (x - last <= r) tmp[row + x] = 1; }
    let nxt = 1e9;
    for (let x = w - 1; x >= 0; x--) { if (src[row + x]) nxt = x; if (nxt - x <= r) tmp[row + x] = 1; }
  }
  for (let x = 0; x < w; x++) {
    let last = -1e9;
    for (let y = 0; y < h; y++) { if (tmp[y * w + x]) last = y; if (y - last <= r) out[y * w + x] = 1; }
    let nxt = 1e9;
    for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) nxt = y; if (nxt - y <= r) out[y * w + x] = 1; }
  }
  return out;
}

/* 8-connected labeling. Returns { label: Int32Array (0 = none), n } */
function labelParts(reach, w, h) {
  const label = new Int32Array(w * h), stack = new Int32Array(w * h);
  let n = 0;
  for (let p0 = 0; p0 < w * h; p0++) {
    if (!reach[p0] || label[p0]) continue;
    n++;
    let sp = 0;
    stack[sp++] = p0; label[p0] = n;
    while (sp) {
      const p = stack[--sp], x = p % w, y = (p - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w || (!dx && !dy)) continue;
          const q = ny * w + nx;
          if (reach[q] && !label[q]) { label[q] = n; stack[sp++] = q; }
        }
      }
    }
  }
  return { label, n };
}

/* Colors: histogram on 5 bits per channel, most common first; each color joins the nearest group within tolerance */
function labelColors(d, solid, w, h, tol, cap) {
  const cnt = new Uint32Array(32768), sr = new Uint32Array(32768), sg = new Uint32Array(32768), sb = new Uint32Array(32768);
  const keyOf = (i) => ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
  for (let p = 0; p < w * h; p++) {
    if (!solid[p]) continue;
    const i = p * 4, k = keyOf(i);
    cnt[k]++; sr[k] += d[i]; sg[k] += d[i + 1]; sb[k] += d[i + 2];
  }
  const keys = [];
  for (let k = 0; k < 32768; k++) if (cnt[k]) keys.push(k);
  keys.sort((a, b) => cnt[b] - cnt[a]);
  const seeds = [], groupOf = new Int32Array(32768).fill(-1);
  const dist = (c, r, g, b) => Math.max(Math.abs(c.r - r), Math.abs(c.g - g), Math.abs(c.b - b));
  keys.forEach((k) => {
    const r = sr[k] / cnt[k], g = sg[k] / cnt[k], b = sb[k] / cnt[k];
    let best = -1, bd = Infinity;
    seeds.forEach((c, i) => { const dd = dist(c, r, g, b); if (dd < bd) { bd = dd; best = i; } });
    if (best < 0 || (bd > tol && seeds.length < cap)) { seeds.push({ r, g, b }); best = seeds.length - 1; }
    groupOf[k] = best;
  });
  const label = new Int32Array(w * h);
  for (let p = 0; p < w * h; p++) if (solid[p]) label[p] = groupOf[keyOf(p * 4)] + 1;
  return { label, n: seeds.length, seeds };
}

function smartSplit() {
  const f = paintFrame();
  if (!f) return;
  ensureLayers(f);
  const w = f.canvas.width, h = f.canvas.height, L = activeLayer(f), n = w * h;
  const img = L.canvas.getContext('2d').getImageData(0, 0, w, h), d = img.data;
  const sel = split.useSel ? getSel(f) : null;
  const solid = new Uint8Array(n);
  let total = 0, inside = 0;
  for (let p = 0; p < n; p++) {
    if (!d[p * 4 + 3]) continue;
    total++;
    if (!sel || sel.mask[p]) { solid[p] = 1; inside++; }
  }
  if (!inside) { showToast('Layer kosong'); return; }

  const willRemove = !split.keep && total === inside;         // the original ends up empty
  const available = MAX_LAYERS - f.layers.length + (willRemove ? 1 : 0);
  if (available < 2) { showToast('Layer hampir penuh (maks 16)'); return; }

  let lab;
  if (split.mode === 'colors') lab = labelColors(d, solid, w, h, split.tol, available);
  else lab = labelParts(split.gap > 0 ? dilateMask(solid, w, h, split.gap) : solid, w, h);

  const counts = new Int32Array(lab.n + 1);
  for (let p = 0; p < n; p++) if (solid[p]) counts[lab.label[p]]++;
  let list = [];
  for (let i = 1; i <= lab.n; i++) if (counts[i]) list.push({ id: i, count: counts[i] });
  list.sort((a, b) => b.count - a.count);
  let keep = list.filter((o) => o.count >= split.min), rest = list.filter((o) => o.count < split.min);
  if (keep.length + (rest.length ? 1 : 0) > available) {      // too many: the smallest go to Rest
    const k = Math.max(0, available - 1);
    rest = rest.concat(keep.slice(k));
    keep = keep.slice(0, k);
  }
  const groups = keep.length + (rest.length ? 1 : 0);
  if (groups < 2) { showToast('Tidak ada yang bisa dipisah'); return; }

  const groupOf = new Int32Array(lab.n + 1).fill(-1);
  keep.forEach((o, i) => { groupOf[o.id] = i; });
  rest.forEach((o) => { groupOf[o.id] = keep.length; });

  // build one canvas per group, reusing one buffer
  const canvases = [], buf = new ImageData(w, h), bd = buf.data;
  for (let g = 0; g < groups; g++) {
    bd.fill(0);
    for (let p = 0; p < n; p++) {
      if (!solid[p] || groupOf[lab.label[p]] !== g) continue;
      const i = p * 4;
      bd[i] = d[i]; bd[i + 1] = d[i + 1]; bd[i + 2] = d[i + 2]; bd[i + 3] = d[i + 3];
    }
    const c = blankCanvas(w, h);
    c.getContext('2d').putImageData(buf, 0, 0);
    canvases.push(c);
  }
  const names = keep.map((o, i) => split.mode === 'colors'
    ? rgbToHex(Math.round(lab.seeds[o.id - 1].r), Math.round(lab.seeds[o.id - 1].g), Math.round(lab.seeds[o.id - 1].b))
    : tr('Bagian') + ' ' + (i + 1));
  if (rest.length) names.push(tr('Sisa'));

  // what stays on the original layer (only when it is not kept untouched)
  let left = null;
  if (!split.keep && !willRemove) {
    left = new ImageData(new Uint8ClampedArray(d), w, h);
    for (let p = 0; p < n; p++) if (solid[p]) { const i = p * 4; left.data[i] = left.data[i + 1] = left.data[i + 2] = left.data[i + 3] = 0; }
  }
  const opacity = L.opacity;
  layerOp((ff) => {
    const idx = ff.active;
    const news = canvases.map((c, i) => { const nl = newLayerObj(c, names[i]); nl.opacity = opacity; return nl; });
    if (split.keep) {
      ff.layers[idx].visible = false;
      ff.layers.splice(idx + 1, 0, ...news);
      ff.active = idx + 1;
    } else if (willRemove) {
      ff.layers.splice(idx, 1, ...news);
      ff.active = idx;
    } else {
      ff.layers[idx].canvas.getContext('2d').putImageData(left, 0, 0);
      ff.layers.splice(idx + 1, 0, ...news);
      ff.active = idx + 1;
    }
  });
  showToast(tr('{n} layer dibuat', groups));
}

function syncSplitUI() {
  const f = paintFrame(), has = !!getSel(f);
  $('splitSelField').hidden = !has;
  document.querySelectorAll('[data-splitmode]').forEach((b) => b.classList.toggle('on', b.dataset.splitmode === split.mode));
  $('splitParts').hidden = split.mode !== 'parts';
  $('splitColors').hidden = split.mode !== 'colors';
  $('splitGap').value = split.gap; $('splitGapVal').textContent = split.gap;
  $('splitTol').value = split.tol; $('splitTolVal').textContent = split.tol;
  $('splitMin').value = split.min; $('splitMinVal').textContent = split.min;
  $('splitKeep').checked = split.keep;
  $('splitSel').checked = split.useSel;
}

/* ---------- layer panel ---------- */
function layerOp(fn) {
  commitXf();
  const f = paintFrame();
  if (!f) return;
  pushPaintUndo(f);
  fn(f);
  refreshPaint();
  paintChanged();
  renderLayerPanel();
  updatePaintButtons();
}

function layerAdd() {
  const f = paintFrame();
  if (!f) return;
  ensureLayers(f);
  if (f.layers.length >= MAX_LAYERS) { showToast('Maksimal 16 layer'); return; }
  layerOp((ff) => {
    ff.layerSeq = (ff.layerSeq || ff.layers.length) + 1;
    ff.layers.splice(ff.active + 1, 0, newLayerObj(blankCanvas(ff.canvas.width, ff.canvas.height), 'Layer ' + ff.layerSeq));
    ff.active += 1;
  });
}

function layerDuplicate() {
  const f = paintFrame();
  if (!f) return;
  ensureLayers(f);
  if (f.layers.length >= MAX_LAYERS) { showToast('Maksimal 16 layer'); return; }
  layerOp((ff) => {
    const src = activeLayer(ff);
    const copy = newLayerObj(cloneCanvas(src.canvas), src.name + ' copy');
    copy.opacity = src.opacity;
    copy.visible = src.visible;
    ff.layers.splice(ff.active + 1, 0, copy);
    ff.active += 1;
  });
}

function layerDelete(idx) {
  const f = paintFrame();
  if (!f) return;
  ensureLayers(f);
  if (f.layers.length <= 1) { showToast('Minimal 1 layer'); return; }
  layerOp((ff) => {
    ff.layers.splice(idx, 1);
    if (idx < ff.active) ff.active -= 1;
    else if (idx === ff.active) ff.active = Math.min(idx, ff.layers.length - 1);
  });
}

function layerMove(idx, dir) {
  const f = paintFrame();
  if (!f) return;
  ensureLayers(f);
  const to = idx + dir;
  if (to < 0 || to >= f.layers.length) return;
  layerOp((ff) => {
    const t = ff.layers[idx]; ff.layers[idx] = ff.layers[to]; ff.layers[to] = t;
    if (ff.active === idx) ff.active = to; else if (ff.active === to) ff.active = idx;
  });
}

/* Merge the layer into the one below it */
function layerMergeDown(idx) {
  const f = paintFrame();
  if (!f) return;
  ensureLayers(f);
  if (idx <= 0) { showToast('Tidak ada layer di bawah'); return; }
  layerOp((ff) => {
    const up = ff.layers[idx], lo = ff.layers[idx - 1];
    if (up.visible) {
      const ctx = lo.canvas.getContext('2d');
      ctx.save();
      ctx.globalAlpha = up.opacity;
      ctx.drawImage(up.canvas, 0, 0);
      ctx.restore();
    }
    ff.layers.splice(idx, 1);
    ff.active = idx - 1;
  });
  showToast('Layer digabung');
}

function layerSelect(idx) {
  const f = paintFrame();
  if (!f) return;
  ensureLayers(f);
  f.active = idx;
  renderLayerPanel();
}

function startLayerRename(btn, idx) {
  const f = paintFrame();
  if (!f) return;
  const inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'layer-rename'; inp.maxLength = 40; inp.value = f.layers[idx].name;
  inp.setAttribute('aria-label', 'Nama layer');
  btn.replaceWith(inp);
  inp.focus(); inp.select();
  let done = false;
  const commit = (save) => {
    if (done) return;
    done = true;
    const v = inp.value.trim();
    if (save && v && v !== f.layers[idx].name) layerOp((ff) => { ff.layers[idx].name = v; });
    else renderLayerPanel();
  };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(true); else if (e.key === 'Escape') commit(false); });
  inp.addEventListener('blur', () => commit(true));
}

function renderLayerPanel() {
  const f = paintFrame();
  const list = $('layerList');
  if (!f || !f.layers) { list.innerHTML = ''; $('layerCurName').textContent = ''; return; }
  const act = Math.max(0, Math.min(f.active | 0, f.layers.length - 1));
  const cur = f.layers[act];
  $('layerCurName').textContent = cur.name + '  \u00b7  ' + (act + 1) + '/' + f.layers.length;
  $('layerOpacity').value = Math.round(cur.opacity * 100);
  $('layerOpacityVal').textContent = Math.round(cur.opacity * 100);
  $('layerMergeBtn').disabled = act === 0;
  $('layerDupBtn').disabled = f.layers.length >= MAX_LAYERS;
  $('layerAddBtn').disabled = f.layers.length >= MAX_LAYERS;
  if ($('paintLayers').hidden) return;   // the list only needs drawing while it is visible

  list.innerHTML = '';
  const mk = (txt, label, fn, dis) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'layer-btn'; b.textContent = txt;
    b.setAttribute('aria-label', tr(label)); b.setAttribute('title', tr(label));
    b.disabled = !!dis;
    b.addEventListener('click', fn);
    return b;
  };
  for (let i = f.layers.length - 1; i >= 0; i--) {     // top layer first
    const L = f.layers[i];
    const row = document.createElement('div');
    row.className = 'layer-row' + (i === act ? ' sel' : '');

    const vis = document.createElement('input');
    vis.type = 'checkbox'; vis.checked = L.visible;
    vis.setAttribute('aria-label', tr('Tampilkan layer'));
    vis.addEventListener('change', () => layerOp((ff) => { ff.layers[i].visible = vis.checked; }));

    const th = document.createElement('span');
    th.className = 'layer-thumb';
    th.appendChild(makeThumbCanvas(L.canvas, 32));

    const name = document.createElement('button');
    name.type = 'button'; name.className = 'layer-name'; name.textContent = L.name;
    name.addEventListener('click', () => { if (i === paintFrame().active) startLayerRename(name, i); else layerSelect(i); });

    row.append(vis, th, name,
      mk('\u2191', 'Naik', () => layerMove(i, 1), i === f.layers.length - 1),
      mk('\u2193', 'Turun', () => layerMove(i, -1), i === 0),
      mk('\u00d7', 'Hapus layer', () => layerDelete(i), f.layers.length <= 1));
    list.appendChild(row);
  }
}

function onionChanged() {
  onion.dirty = true;
  saveOnion();
  syncOnionUI();
  repaintPaintView();
}

function syncOnionUI() {
  $('onionOn').checked = onion.on;
  $('onionBefore').value = onion.before; $('onionBeforeVal').textContent = onion.before;
  $('onionAfter').value = onion.after; $('onionAfterVal').textContent = onion.after;
  $('onionOpacity').value = onion.opacity; $('onionOpacityVal').textContent = onion.opacity;
  $('onionFade').checked = onion.fade;
  $('onionLoop').checked = onion.loop;
  $('onionTint').checked = onion.tint;
  $('onionColB').value = onion.cb; $('onionColA').value = onion.ca;
  $('onionColors').hidden = !onion.tint;
  $('paintOnionBtn').classList.toggle('on', onion.on);
  $('paintOnionBtn').setAttribute('aria-pressed', onion.on ? 'true' : 'false');
  $('paintOnionCfgBtn').classList.toggle('on', onion.on);
}

function toggleOnion() {
  onion.on = !onion.on;
  onionChanged();
  showToast(onion.on ? 'Onion skin aktif' : 'Onion skin mati');
}

function initOnion() {
  loadOnion();
  syncOnionUI();
  $('paintOnionBtn').addEventListener('click', toggleOnion);
  $('paintOnionCfgBtn').addEventListener('click', () => {
    const open = $('paintOnion').hidden;
    closePaintPops();
    $('paintOnion').hidden = !open;
    $('paintOnionCfgBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  const bind = (id, key, kind) => $(id).addEventListener(kind === 'check' ? 'change' : 'input', (e) => {
    if (kind === 'check') onion[key] = e.target.checked;
    else if (kind === 'color') onion[key] = onionHex(e.target.value, onion[key]);
    else onion[key] = parseInt(e.target.value, 10) || 0;
    onionChanged();
  });
  bind('onionOn', 'on', 'check'); bind('onionFade', 'fade', 'check'); bind('onionLoop', 'loop', 'check'); bind('onionTint', 'tint', 'check');
  bind('onionBefore', 'before', 'num'); bind('onionAfter', 'after', 'num'); bind('onionOpacity', 'opacity', 'num');
  bind('onionColB', 'cb', 'color'); bind('onionColA', 'ca', 'color');
  $('onionResetBtn').addEventListener('click', () => {
    const keep = onion.on;
    Object.assign(onion, ONION_DEFAULT, { on: keep });
    onionChanged();
  });
}

function initPaintTab() {
  const v = $('paintCanvas'), wrap = $('paintWrap'), pop = $('paintPop'), bar = $('paintToolsBar');
  initColorWheel();

  const endStroke = () => {
    const drew = !paint.pan && !paint.picking && paint.last;
    const picked = paint.picking;
    paint.pid = null; paint.last = null; paint.pan = null; paint.picking = false;
    if (paint.xf) { paint.xf.drag = null; v.style.cursor = ''; return; }
    if (paint.lasso) finishLasso();
    if (drew) { paintChanged(); updatePaintButtons(); }
    if (picked) setPaintTool('brush'); // after picking a colour, go back to painting with it
  };

  v.addEventListener('pointerdown', (e) => {
    const f = paintFrame();
    if (!f || paint.pid !== null) return;                      // ignore a 2nd finger mid-stroke
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const drawing = paint.tool === 'brush' || paint.tool === 'eraser' || paint.tool === 'fill';
    if (drawing && !activeLayer(f).visible) { e.preventDefault(); showToast('Layer tersembunyi'); return; }
    e.preventDefault();
    try { v.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    paint.pid = e.pointerId;
    if (paint.xf) { xfDown(e); return; }                       // lasso transform: handles, move
    if (paint.tool === 'pan') {
      paint.pan = { x: e.clientX, y: e.clientY, l: wrap.scrollLeft, t: wrap.scrollTop };
      return;
    }
    if (paint.tool === 'picker') {
      paint.picking = true;
      pickColorAt(e, true);
      return;
    }
    if (paint.tool === 'lasso') {
      paint.lasso = { pts: [lassoPoint(e)] };
      return;
    }
    if (paint.tool === 'fill') {
      const pt = paintPoint(e);
      pushPaintUndo(f);
      if (floodFill(f, pt.x, pt.y)) { refreshPaint(); paintChanged(); }
      else { paint.undo.pop(); }
      updatePaintButtons();
      return;                                                  // a fill is one tap: no stroke follows
    }
    pushPaintUndo(f);
    const pt = paintPoint(e);
    paint.last = pt;
    stampAt(layerCtx(f), pt.x, pt.y);
    refreshPaint();
  });
  v.addEventListener('pointermove', (e) => {
    if (paint.xf && paint.pid === null) {                      // hovering: show what a drag would do
      if (e.pointerType !== 'touch') { const h = xfHit(e); v.style.cursor = h ? XF_CURSOR[h] : 'default'; }
      return;
    }
    if (e.pointerId !== paint.pid) return;
    if (paint.xf) { xfDrag(e); return; }
    if (paint.pan) {
      wrap.scrollLeft = paint.pan.l - (e.clientX - paint.pan.x);
      wrap.scrollTop = paint.pan.t - (e.clientY - paint.pan.y);
      return;
    }
    if (paint.picking) { pickColorAt(e, false); return; }
    if (paint.lasso) { lassoMove(e); return; }
    const f = paintFrame();
    if (!f || !paint.last) return;
    const pt = paintPoint(e);
    if (pt.x === paint.last.x && pt.y === paint.last.y) return;
    strokeLine(layerCtx(f), paint.last.x, paint.last.y, pt.x, pt.y);
    paint.last = pt;
    refreshPaint();
  });
  const finish = (e) => { if (e.pointerId === paint.pid) endStroke(); };
  v.addEventListener('pointerup', finish);
  v.addEventListener('pointercancel', finish);
  v.addEventListener('lostpointercapture', finish);

  // category: Tools / Layers / View
  document.querySelectorAll('#paintCats [data-cat]').forEach((b) => b.addEventListener('click', () => setPaintCat(b.dataset.cat)));

  // tool buttons: pick the tool; Brush, Eraser and Fill also open their options (tap again to close)
  document.querySelectorAll('#paintToolsBar [data-tool]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.tool;
    if (paint.xf && t === 'lasso') return;
    const same = paint.tool === t, open = !$('paintOpts').hidden;
    setPaintTool(t);
    openOpts(!!TOOL_OPTS[t] && !(same && open));
  }));

  // brush / eraser size (each tool keeps its own)
  $('optSize').addEventListener('input', (e) => {
    const t = paint.tool;
    if (t !== 'brush' && t !== 'eraser') return;
    paint.sizes[t] = parseInt(e.target.value, 10) || 1;
    $('optSizeVal').textContent = paint.sizes[t];
  });
  // fill options
  $('fillTol').addEventListener('input', (e) => {
    paint.fill.tolerance = parseInt(e.target.value, 10) || 0;
    $('fillTolVal').textContent = paint.fill.tolerance;
  });
  document.querySelectorAll('[data-fillmode]').forEach((b) => b.addEventListener('click', () => { paint.fill.mode = b.dataset.fillmode; renderOpts(); }));
  document.querySelectorAll('[data-fillsample]').forEach((b) => b.addEventListener('click', () => { paint.fill.sample = b.dataset.fillsample; renderOpts(); }));

  // colour popup under the colour chip
  $('paintColorChip').addEventListener('click', () => {
    const open = pop.hidden;
    if (paint.cat === 'layers') setPaintCat('tools');
    closePaintPops();
    pop.hidden = !open;
    if (open) drawWheel(true);
    $('paintColorChip').setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  // tapping the sprite or empty space closes popups (and leaves the Layers category so you can paint)
  document.addEventListener('pointerdown', (e) => {
    if (!$('panel-paint').classList.contains('active')) return;
    if (bar.contains(e.target)) return;
    if (paint.xf) return;                                      // the transform panel stays open until Terapkan / Batal
    closePaintPops();
    if (paint.cat === 'layers' && wrap.contains(e.target)) setPaintCat('tools');
  });

  $('paintHex').addEventListener('input', (e) => {
    let val = e.target.value.trim();
    if (val && val[0] !== '#') val = '#' + val;
    setPaintColor(val);
  });
  $('paintSwatches').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-color]');
    if (b) setPaintColor(b.dataset.color);
  });

  // lasso
  document.querySelectorAll('[data-lassomode]').forEach((b) => b.addEventListener('click', () => { paint.selMode = b.dataset.lassomode; renderLassoOpts(); }));
  $('selCutBtn').addEventListener('click', () => selectionOp('cut'));
  $('selCopyBtn').addEventListener('click', () => selectionOp('copy'));
  $('selDelBtn').addEventListener('click', () => selectionOp('delete'));
  $('selInvBtn').addEventListener('click', invertSelection);
  $('selClearBtn').addEventListener('click', clearSelection);
  $('selXfBtn').addEventListener('click', startXf);
  $('xfApplyBtn').addEventListener('click', applyXf);
  $('xfCancelBtn').addEventListener('click', cancelXf);
  $('xfResetBtn').addEventListener('click', () => {
    const xf = paint.xf;
    if (!xf) return;
    xf.cx = xf.x0 + xf.bw / 2; xf.cy = xf.y0 + xf.bh / 2; xf.w = xf.bw; xf.h = xf.bh; xf.ang = 0;
    xfPreview();
  });
  [['xfRotL', -1], ['xfRotR', 1]].forEach(([id, dir]) => $(id).addEventListener('click', () => {
    if (!paint.xf) return;
    paint.xf.ang = xfNorm(paint.xf.ang + dir * Math.PI / 2);
    xfPreview();
  }));
  const xfSize = (axis) => (e) => {
    const xf = paint.xf, v = parseInt(e.target.value, 10);
    if (!xf || !v || v < 1) return;
    const n = Math.min(XF_MAX, v);
    if (axis === 'w') { xf.w = n; if ($('xfLock').checked) xf.h = Math.max(1, Math.min(XF_MAX, Math.round(n * xf.bh / xf.bw))); }
    else { xf.h = n; if ($('xfLock').checked) xf.w = Math.max(1, Math.min(XF_MAX, Math.round(n * xf.bw / xf.bh))); }
    xfPreview();
  };
  $('xfW').addEventListener('input', xfSize('w'));
  $('xfH').addEventListener('input', xfSize('h'));
  $('xfAngle').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    if (!paint.xf || !isFinite(v)) return;
    paint.xf.ang = xfNorm(v * Math.PI / 180);
    xfPreview();
  });
  ['xfW', 'xfH', 'xfAngle'].forEach((id) => $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }));

  // smart split
  $('layerSplitBtn').addEventListener('click', () => {
    const box = $('splitBox'), open = box.hidden;
    box.hidden = !open;
    $('layerSplitBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) syncSplitUI();
  });
  document.querySelectorAll('[data-splitmode]').forEach((b) => b.addEventListener('click', () => { split.mode = b.dataset.splitmode; syncSplitUI(); }));
  $('splitGap').addEventListener('input', (e) => { split.gap = parseInt(e.target.value, 10) || 0; $('splitGapVal').textContent = split.gap; });
  $('splitTol').addEventListener('input', (e) => { split.tol = parseInt(e.target.value, 10) || 4; $('splitTolVal').textContent = split.tol; });
  $('splitMin').addEventListener('input', (e) => { split.min = parseInt(e.target.value, 10) || 0; $('splitMinVal').textContent = split.min; });
  $('splitKeep').addEventListener('change', (e) => { split.keep = e.target.checked; });
  $('splitSel').addEventListener('change', (e) => { split.useSel = e.target.checked; });
  $('splitRunBtn').addEventListener('click', smartSplit);

  // layers
  $('layerAddBtn').addEventListener('click', layerAdd);
  $('layerDupBtn').addEventListener('click', layerDuplicate);
  $('layerMergeBtn').addEventListener('click', () => { const f = paintFrame(); if (f) layerMergeDown(f.active | 0); });
  $('layerOpacity').addEventListener('input', (e) => {
    const f = paintFrame();
    if (!f) return;
    if (!paint.opDrag) { pushPaintUndo(f); paint.opDrag = true; }   // one undo step per drag
    activeLayer(f).opacity = (parseInt(e.target.value, 10) || 0) / 100;
    $('layerOpacityVal').textContent = e.target.value;
    refreshPaint();
    paintChanged();
  });
  $('layerOpacity').addEventListener('change', () => { paint.opDrag = false; });

  $('paintUndoBtn').addEventListener('click', () => paintStep(paint.undo, paint.redo));
  $('paintRedoBtn').addEventListener('click', () => paintStep(paint.redo, paint.undo));
  $('paintZoomInBtn').addEventListener('click', () => stepPaintZoom(1));
  $('paintZoomOutBtn').addEventListener('click', () => stepPaintZoom(-1));
  $('paintFitBtn').addEventListener('click', () => { paint.zoom = 0; renderPaintCanvas(); wrap.scrollLeft = 0; wrap.scrollTop = 0; });
  $('paintAddFrameBtn').addEventListener('click', paintAddEmpty);
  $('paintEmptyAddBtn').addEventListener('click', paintAddEmpty);
  $('paintPlayBtn').addEventListener('click', () => document.querySelector('.tab-btn[data-tab="player"]').click());

  // the bars change height (rows wrap, a category has a different second row): re-fit the sprite so it never overlaps them
  if (window.ResizeObserver) {
    let raf = 0, lastKey = '';
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!$('panel-paint').classList.contains('active')) return;
        layoutPaintPad();
        const key = paint.padT + '/' + paint.padB + '/' + (paint.side ? 1 : 0) + '/' + $('paintWrap').clientWidth + '/' + $('paintWrap').clientHeight;
        if (key !== lastKey) { lastKey = key; if (!paint.zoom && paintFrame()) renderPaintCanvas(); }
      });
    });
    ro.observe($('paintToolsBar'));
    ro.observe($('paintFramesBar'));
    ro.observe($('paintWrap'));
  }
  $('paintName').addEventListener('input', (e) => {
    const f = paintFrame();
    if (f) f.name = e.target.value.trim() ? e.target.value : undefined;
  });

  // Ctrl + wheel (or trackpad pinch) zooms around the pointer; a plain wheel scrolls
  let wheelAt = 0;
  wrap.addEventListener('wheel', (e) => {
    if (!paintFrame() || !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const now = Date.now();
    if (now - wheelAt < 60) return;
    wheelAt = now;
    stepPaintZoom(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
  }, { passive: false });

  document.addEventListener('keydown', (e) => {
    if (!$('panel-paint').classList.contains('active')) return;
    if (!$('settingsModal').hidden) return;
    const t = e.target && e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (paint.xf && !(e.ctrlKey || e.metaKey)) {               // lasso transform: Enter applies, Esc drops, arrows nudge (Shift = 10 px)
      const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (e.key === 'Enter') { e.preventDefault(); applyXf(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelXf(); }
      else if (dir) { e.preventDefault(); const st = e.shiftKey ? 10 : 1; paint.xf.cx += dir[0] * st; paint.xf.cy += dir[1] * st; xfPreview(); }
      return;
    }
    if (!(e.ctrlKey || e.metaKey)) {
      const tool = { b: 'brush', e: 'eraser', g: 'fill', i: 'picker', l: 'lasso', h: 'pan' }[k];
      if (tool && paintFrame()) setPaintTool(tool);
      else if (k === 'o' && paintFrame()) toggleOnion();
      else if (e.key === 'Escape' && paint.sel) clearSelection();
      else if ((e.key === 'Delete' || e.key === 'Backspace') && paint.sel) { e.preventDefault(); selectionOp('delete'); }
      return;
    }
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); paintStep(paint.undo, paint.redo); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); paintStep(paint.redo, paint.undo); }
  });

  let rz = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      updateTopbarH();
      if ($('panel-paint').classList.contains('active') && paintFrame()) renderPaintCanvas();
    }, 120);
  });

  initOnion();
  setPaintColor(paint.color, true);
  setPaintCat('tools');
}

