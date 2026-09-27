'use strict';

/* =========================================================================
   STATE
   ========================================================================= */
const state = {
  frames: [],        // [{ id, canvas }]
  sheetMeta: null,    // { canvas, cols, rows, frameW, frameH, count, sheetW, sheetH, padding, margin }
  exportSheet: null,  // last built/merged spritesheet canvas, used by Export tab
  mergeA: null,        // canvas of loaded spritesheet A
  mergeB: null         // canvas of loaded spritesheet B
};

let idCounter = 0;
const nextId = () => 'f' + (idCounter++);

let currentFile = null;
let currentObjectUrl = null;
let currentMediaType = null; // 'video' | 'gif' | 'image'

/* =========================================================================
   GENERIC HELPERS
   ========================================================================= */
function $(id) { return document.getElementById(id); }

function showToast(msg, duration) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), duration || 2200);
}

function formatDuration(sec) {
  if (!isFinite(sec)) return '-';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function hexToRgb(hex) {
  const v = hex.replace('#', '');
  return {
    r: parseInt(v.substr(0, 2), 16),
    g: parseInt(v.substr(2, 2), 16),
    b: parseInt(v.substr(4, 2), 16)
  };
}

function cloneCanvas(src) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

function paintPreview(canvasEl, sourceCanvas) {
  canvasEl.width = sourceCanvas.width;
  canvasEl.height = sourceCanvas.height;
  canvasEl.getContext('2d').drawImage(sourceCanvas, 0, 0);
}

function makeThumbCanvas(sourceCanvas, size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  drawWithFit(ctx, sourceCanvas, sourceCanvas.width, sourceCanvas.height, size, size, 'contain');
  return c;
}

/* Disable bilinear smoothing so scaling never introduces blur (crisp / pixel-accurate output). */
function setCrisp(ctx) {
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
}

/* Accurate area-based resampling: each output pixel is the alpha-weighted average of the
   exact source pixel block it covers. This is used instead of the browser's built-in
   drawImage scaling, which either blurs (bilinear smoothing) or, when smoothing is off,
   picks a single arbitrary source pixel per output pixel when downscaling by a large
   factor (e.g. a 1920px video frame down to a 32x32 sprite) — that single-pixel pick is
   what causes stray wrong-colored pixels and noisy/blurry-looking results. Averaging every
   source pixel that actually falls inside each output pixel's footprint fixes both: colors
   are correct and the result scales down cleanly. For upscaling, the same formula collapses
   to an exact nearest-neighbor pick per pixel, keeping pixel art crisp and blocky. */
function areaResample(srcImageData, sw, sh, dw, dh) {
  const sData = srcImageData.data;
  const out = new ImageData(dw, dh);
  const oData = out.data;
  for (let oy = 0; oy < dh; oy++) {
    const sy0 = Math.floor(oy * sh / dh);
    const sy1 = Math.max(sy0 + 1, Math.floor((oy + 1) * sh / dh));
    for (let ox = 0; ox < dw; ox++) {
      const sx0 = Math.floor(ox * sw / dw);
      const sx1 = Math.max(sx0 + 1, Math.floor((ox + 1) * sw / dw));
      let r = 0, g = 0, b = 0, aSum = 0, n = 0;
      for (let yy = sy0; yy < sy1 && yy < sh; yy++) {
        for (let xx = sx0; xx < sx1 && xx < sw; xx++) {
          const idx = (yy * sw + xx) * 4;
          const alpha = sData[idx + 3];
          // weight by alpha so fully-transparent source pixels never bleed their
          // (often garbage) RGB into the average — this is what causes stray wrong colors
          r += sData[idx] * alpha;
          g += sData[idx + 1] * alpha;
          b += sData[idx + 2] * alpha;
          aSum += alpha;
          n++;
        }
      }
      const oIdx = (oy * dw + ox) * 4;
      if (aSum > 0) {
        oData[oIdx] = Math.round(r / aSum);
        oData[oIdx + 1] = Math.round(g / aSum);
        oData[oIdx + 2] = Math.round(b / aSum);
        oData[oIdx + 3] = Math.round(aSum / n);
      }
      // else: leave fully transparent (0,0,0,0), which is already the default
    }
  }
  return out;
}

/* Draws a scaled/cropped region of sourceCanvas into destCtx using areaResample instead of
   the browser's own image scaling, for pixel-accurate results at any scale factor. */
function accurateDrawScaled(destCtx, sourceCanvas, sx, sy, sw, sh, dx, dy, dw, dh) {
  sx = Math.round(sx); sy = Math.round(sy);
  sw = Math.max(1, Math.round(sw));
  sh = Math.max(1, Math.round(sh));
  dw = Math.max(1, Math.round(dw));
  dh = Math.max(1, Math.round(dh));
  dx = Math.round(dx); dy = Math.round(dy);

  if (sw === dw && sh === dh) {
    // Exact 1:1 copy, no resampling needed — fastest path and perfectly accurate.
    destCtx.drawImage(sourceCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
    return;
  }

  const clampedSx = Math.max(0, Math.min(sx, sourceCanvas.width - 1));
  const clampedSy = Math.max(0, Math.min(sy, sourceCanvas.height - 1));
  const clampedSw = Math.max(1, Math.min(sw, sourceCanvas.width - clampedSx));
  const clampedSh = Math.max(1, Math.min(sh, sourceCanvas.height - clampedSy));
  const srcCtx = sourceCanvas.getContext('2d');
  const srcImageData = srcCtx.getImageData(clampedSx, clampedSy, clampedSw, clampedSh);
  const outImageData = areaResample(srcImageData, clampedSw, clampedSh, dw, dh);
  destCtx.putImageData(outImageData, dx, dy);
}

/* Draw sourceCanvas into ctx (dw x dh) using cover / contain / stretch, pixel-accurately. */
function drawWithFit(ctx, sourceCanvas, sw, sh, dw, dh, mode) {
  ctx.clearRect(0, 0, dw, dh);
  if (mode === 'stretch') {
    accurateDrawScaled(ctx, sourceCanvas, 0, 0, sw, sh, 0, 0, dw, dh);
    return;
  }
  const scale = mode === 'cover' ? Math.max(dw / sw, dh / sh) : Math.min(dw / sw, dh / sh);
  if (mode === 'cover') {
    // Crop the source region matching the destination aspect first, then scale
    // that exact region to fill dw x dh — avoids sampling outside the crop.
    const cropW = dw / scale;
    const cropH = dh / scale;
    const csx = (sw - cropW) / 2;
    const csy = (sh - cropH) / 2;
    accurateDrawScaled(ctx, sourceCanvas, csx, csy, cropW, cropH, 0, 0, dw, dh);
  } else {
    const rw = sw * scale;
    const rh = sh * scale;
    const dx = (dw - rw) / 2;
    const dy = (dh - rh) / 2;
    accurateDrawScaled(ctx, sourceCanvas, 0, 0, sw, sh, dx, dy, rw, rh);
  }
}

function imageFileToCanvas(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(c);
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function downloadCanvasAsPNG(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) { showToast('Gagal membuat PNG'); return; }
    downloadBlob(blob, filename);
  }, 'image/png');
}

/* =========================================================================
   GIF DECODER (vanilla JS, no external library)
   Implements GIF87a/89a parsing + LZW decompression + frame compositing
   according to disposal methods, per the GIF89a specification.
   ========================================================================= */
class GifBitReader {
  constructor(bytes) {
    this.bytes = bytes;
    this.bytePos = 0;
    this.bitBuffer = 0;
    this.bitCount = 0;
  }
  readCode(codeSize) {
    while (this.bitCount < codeSize) {
      if (this.bytePos >= this.bytes.length) {
        this.bitBuffer |= 0 << this.bitCount;
        this.bitCount += 8;
        this.bytePos++;
      } else {
        this.bitBuffer |= this.bytes[this.bytePos++] << this.bitCount;
        this.bitCount += 8;
      }
    }
    const code = this.bitBuffer & ((1 << codeSize) - 1);
    this.bitBuffer >>= codeSize;
    this.bitCount -= codeSize;
    return code;
  }
}

function lzwDecodeGif(data, minCodeSize, pixelCount) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  const reader = new GifBitReader(data);
  let codeSize, dict;

  function resetDict() {
    dict = new Array(clearCode);
    for (let i = 0; i < clearCode; i++) dict[i] = [i];
    dict[clearCode] = null;
    dict[endCode] = null;
    codeSize = minCodeSize + 1;
  }
  resetDict();

  const output = new Uint8Array(pixelCount);
  let outPos = 0;
  let prevCode = null;
  let safety = pixelCount * 4 + 1024; // guard against malformed streams

  while (outPos < pixelCount && safety-- > 0) {
    const code = reader.readCode(codeSize);
    if (code === clearCode) {
      resetDict();
      prevCode = null;
      continue;
    }
    if (code === endCode) break;

    let entry;
    if (dict[code] !== undefined && dict[code] !== null) {
      entry = dict[code];
    } else if (code === dict.length && prevCode !== null) {
      const prevEntry = dict[prevCode];
      entry = prevEntry.concat([prevEntry[0]]);
    } else {
      break; // corrupt / unexpected code, stop gracefully
    }

    for (let i = 0; i < entry.length && outPos < pixelCount; i++) output[outPos++] = entry[i];

    if (prevCode !== null && dict.length < 4096) {
      const prevEntry = dict[prevCode];
      dict.push(prevEntry.concat([entry[0]]));
      if (dict.length === (1 << codeSize) && codeSize < 12) codeSize++;
    }
    prevCode = code;
  }
  return output;
}

class GifParser {
  constructor(buffer) {
    this.data = new Uint8Array(buffer);
    this.pos = 0;
  }
  readByte() { return this.data[this.pos++]; }
  readBytes(n) { const b = this.data.subarray(this.pos, this.pos + n); this.pos += n; return b; }
  readUint16() {
    const v = this.data[this.pos] | (this.data[this.pos + 1] << 8);
    this.pos += 2;
    return v;
  }
  readColorTable(size) {
    const table = [];
    for (let i = 0; i < size; i++) table.push([this.readByte(), this.readByte(), this.readByte()]);
    return table;
  }
  skipSubBlocks() {
    while (true) {
      const size = this.readByte();
      if (!size) break;
      this.pos += size;
    }
  }
  readSubBlocksConcat() {
    const chunks = [];
    let total = 0;
    while (true) {
      const size = this.readByte();
      if (!size) break;
      const chunk = this.readBytes(size);
      chunks.push(chunk);
      total += size;
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { out.set(c, offset); offset += c.length; }
    return out;
  }
  parse() {
    const sig = String.fromCharCode.apply(null, this.readBytes(6));
    if (sig !== 'GIF87a' && sig !== 'GIF89a') throw new Error('Bukan file GIF yang valid');
    this.width = this.readUint16();
    this.height = this.readUint16();
    const packed = this.readByte();
    this.readByte(); // bg color index (unused for compositing to transparent canvas)
    this.readByte(); // pixel aspect
    const gctFlag = (packed & 0x80) !== 0;
    const gctSize = gctFlag ? (2 << (packed & 0x07)) : 0;
    this.globalColorTable = gctFlag ? this.readColorTable(gctSize) : null;

    const frames = [];
    let gce = null;

    while (this.pos < this.data.length) {
      const blockType = this.readByte();
      if (blockType === undefined || blockType === 0x3B) break;

      if (blockType === 0x21) {
        const label = this.readByte();
        if (label === 0xF9) {
          this.readByte(); // block size, always 4
          const p = this.readByte();
          const delay = this.readUint16();
          const transparentIndex = this.readByte();
          this.readByte(); // terminator
          gce = {
            disposal: (p >> 2) & 0x07,
            transparentFlag: (p & 0x01) !== 0,
            transparentIndex,
            delay
          };
        } else {
          this.skipSubBlocks();
        }
      } else if (blockType === 0x2C) {
        const left = this.readUint16();
        const top = this.readUint16();
        const w = this.readUint16();
        const h = this.readUint16();
        const p = this.readByte();
        const lctFlag = (p & 0x80) !== 0;
        const interlace = (p & 0x40) !== 0;
        const lctSize = lctFlag ? (2 << (p & 0x07)) : 0;
        const localColorTable = lctFlag ? this.readColorTable(lctSize) : null;
        const minCodeSize = this.readByte();
        const imageData = this.readSubBlocksConcat();
        const indices = lzwDecodeGif(imageData, minCodeSize, w * h);
        frames.push({
          left, top, width: w, height: h, interlace,
          colorTable: localColorTable || this.globalColorTable,
          transparentIndex: gce && gce.transparentFlag ? gce.transparentIndex : -1,
          disposal: gce ? gce.disposal : 0,
          delay: (gce ? gce.delay : 10) * 10,
          indices
        });
        gce = null;
      } else {
        this.skipSubBlocks();
      }
    }
    return frames;
  }
}

function buildInterlaceRowOrder(height) {
  const order = [];
  const passes = [[0, 8], [4, 8], [2, 4], [1, 2]];
  for (const [start, step] of passes) {
    for (let y = start; y < height; y += step) order.push(y);
  }
  return order;
}

async function decodeGifToCanvases(buffer, opts, onProgress) {
  const { maxFrames, targetW, targetH, fit } = opts;
  const parser = new GifParser(buffer);
  const rawFrames = parser.parse();
  const screenW = parser.width;
  const screenH = parser.height;

  const compose = document.createElement('canvas');
  compose.width = screenW;
  compose.height = screenH;
  const ctx = compose.getContext('2d');

  const outFrames = [];
  let savedImage = null;
  const limit = Math.min(rawFrames.length, maxFrames || rawFrames.length);

  for (let i = 0; i < limit; i++) {
    const f = rawFrames[i];

    if (f.disposal === 3) savedImage = ctx.getImageData(0, 0, screenW, screenH);

    const region = ctx.getImageData(f.left, f.top, f.width, f.height);
    const table = f.colorTable || [];
    const rowOrder = f.interlace ? buildInterlaceRowOrder(f.height) : null;
    let idx = 0;
    for (let ry = 0; ry < f.height; ry++) {
      const y = f.interlace ? rowOrder[ry] : ry;
      for (let x = 0; x < f.width; x++) {
        const colorIdx = f.indices[idx++];
        if (colorIdx === f.transparentIndex) continue;
        const c = table[colorIdx] || [0, 0, 0];
        const off = (y * f.width + x) * 4;
        region.data[off] = c[0];
        region.data[off + 1] = c[1];
        region.data[off + 2] = c[2];
        region.data[off + 3] = 255;
      }
    }
    ctx.putImageData(region, f.left, f.top);

    const outCanvas = document.createElement('canvas');
    const ow = targetW || screenW;
    const oh = targetH || screenH;
    outCanvas.width = ow;
    outCanvas.height = oh;
    const outCtx = outCanvas.getContext('2d');
    if (ow !== screenW || oh !== screenH) {
      drawWithFit(outCtx, compose, screenW, screenH, ow, oh, fit || 'cover');
    } else {
      outCtx.drawImage(compose, 0, 0);
    }
    outFrames.push(outCanvas);

    if (f.disposal === 2) {
      ctx.clearRect(f.left, f.top, f.width, f.height);
    } else if (f.disposal === 3 && savedImage) {
      ctx.putImageData(savedImage, 0, 0);
      savedImage = null;
    }

    if (onProgress) onProgress(i + 1, limit);
    if (i % 3 === 0) await new Promise((r) => setTimeout(r, 0)); // keep UI responsive
  }
  return outFrames;
}

/* =========================================================================
   VIDEO FRAME EXTRACTION (HTML5 <video> + Canvas, no FFmpeg)
   ========================================================================= */
function seekVideo(video, time) {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;
  });
}

async function extractVideoFrames(video, settings, onProgress) {
  const duration = video.duration;
  const startTime = Math.max(0, settings.start || 0);
  const endTime = settings.end ? Math.min(settings.end, duration) : duration;
  const step = settings.mode === 'fps' ? 1 / settings.fps : settings.interval;

  const timestamps = [];
  for (let t = startTime; t < endTime && timestamps.length < settings.maxFrames; t += step) {
    timestamps.push(t);
  }

  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = video.videoWidth;
  tmpCanvas.height = video.videoHeight;
  const tmpCtx = tmpCanvas.getContext('2d');

  const frames = [];
  for (let i = 0; i < timestamps.length; i++) {
    await seekVideo(video, timestamps[i]);
    tmpCtx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
    tmpCtx.drawImage(video, 0, 0);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = settings.width;
    outCanvas.height = settings.height;
    const outCtx = outCanvas.getContext('2d');
    drawWithFit(outCtx, tmpCanvas, tmpCanvas.width, tmpCanvas.height, settings.width, settings.height, settings.fit);
    frames.push(outCanvas);

    if (onProgress) onProgress(i + 1, timestamps.length);
    await new Promise((r) => setTimeout(r, 0)); // yield each iteration, avoids UI freeze
  }
  return frames;
}

/* =========================================================================
   BACKGROUND REMOVAL (getImageData / putImageData pixel manipulation)
   ========================================================================= */
function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function applyBackgroundRemoval(canvas, settings) {
  if (settings.mode === 'normal') return canvas;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const { r: tr, g: tg, b: tb } = settings.color;
  const tol = settings.tolerance;
  const feather = settings.feather;

  for (let i = 0; i < data.length; i += 4) {
    const dist = colorDistance(data[i], data[i + 1], data[i + 2], tr, tg, tb);
    if (dist <= tol) {
      data[i + 3] = 0;
    } else if (feather > 0 && dist <= tol + feather) {
      const t = (dist - tol) / feather;
      data[i + 3] = Math.round(data[i + 3] * t);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/* =========================================================================
   SPRITESHEET BUILDER
   ========================================================================= */
function buildSpritesheet(canvases, settings) {
  const count = canvases.length;
  const cols = Math.max(1, Math.min(settings.columns, count) || 1);
  const rows = Math.max(1, Math.ceil(count / cols));
  const frameW = settings.frameW;
  const frameH = settings.frameH;
  const padding = settings.padding;
  const margin = settings.margin;

  const sheetW = margin * 2 + cols * frameW + Math.max(0, cols - 1) * padding;
  const sheetH = margin * 2 + rows * frameH + Math.max(0, rows - 1) * padding;

  const canvas = document.createElement('canvas');
  canvas.width = sheetW;
  canvas.height = sheetH;
  const ctx = canvas.getContext('2d');
  setCrisp(ctx);

  canvases.forEach((src, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = margin + col * (frameW + padding);
    const y = margin + row * (frameH + padding);
    accurateDrawScaled(ctx, src, 0, 0, src.width, src.height, x, y, frameW, frameH);
  });

  return { canvas, cols, rows, frameW, frameH, count, sheetW, sheetH, padding, margin };
}

function sliceSpritesheet(canvas, frameW, frameH) {
  const cols = Math.max(1, Math.floor(canvas.width / frameW));
  const rows = Math.max(1, Math.floor(canvas.height / frameH));
  const frames = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fc = document.createElement('canvas');
      fc.width = frameW;
      fc.height = frameH;
      const fcCtx = fc.getContext('2d');
      setCrisp(fcCtx);
      fcCtx.drawImage(canvas, c * frameW, r * frameH, frameW, frameH, 0, 0, frameW, frameH);
      frames.push(fc);
    }
  }
  return frames;
}

function normalizeFrame(src, targetW, targetH, mode) {
  const out = document.createElement('canvas');
  out.width = targetW;
  out.height = targetH;
  const ctx = out.getContext('2d');
  setCrisp(ctx);
  if (mode === 'crop') {
    const sx = Math.max(0, (src.width - targetW) / 2);
    const sy = Math.max(0, (src.height - targetH) / 2);
    const sw = Math.min(src.width, targetW);
    const sh = Math.min(src.height, targetH);
    const dx = Math.max(0, (targetW - src.width) / 2);
    const dy = Math.max(0, (targetH - src.height) / 2);
    ctx.drawImage(src, sx, sy, sw, sh, dx, dy, sw, sh);
  } else if (mode === 'center') {
    ctx.drawImage(src, (targetW - src.width) / 2, (targetH - src.height) / 2);
  } else if (mode === 'fit') {
    drawWithFit(ctx, src, src.width, src.height, targetW, targetH, 'contain');
  } else {
    drawWithFit(ctx, src, src.width, src.height, targetW, targetH, 'stretch');
  }
  return out;
}

/* =========================================================================
   FRAME LIST RENDERING (import strip + editor grid)
   ========================================================================= */
function refreshAllFrameViews() {
  $('importFrameCount').textContent = state.frames.length;
  renderFrameStrip($('importFrameStrip'));
  renderFrameGrid($('editorFrameGrid'));
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
  refreshAllFrameViews();
}

function renderFrameGrid(container) {
  container.innerHTML = '';
  state.frames.forEach((f, index) => {
    const card = document.createElement('div');
    card.className = 'frame-card';
    card.draggable = true;

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
    delBtn.title = 'Hapus frame';
    delBtn.textContent = '\u00d7';
    delBtn.addEventListener('click', () => {
      state.frames = state.frames.filter((x) => x.id !== f.id);
      refreshAllFrameViews();
    });
    card.appendChild(delBtn);

    // Touch-friendly reorder controls (native HTML5 drag & drop below is for mouse/desktop)
    const moveWrap = document.createElement('div');
    moveWrap.style.cssText = 'position:absolute;bottom:2px;right:2px;display:flex;gap:2px;';
    const leftBtn = document.createElement('button');
    leftBtn.type = 'button';
    leftBtn.className = 'frame-del';
    leftBtn.style.position = 'static';
    leftBtn.title = 'Pindah ke kiri';
    leftBtn.textContent = '\u25c0';
    leftBtn.addEventListener('click', () => moveFrame(index, index - 1));
    const rightBtn = document.createElement('button');
    rightBtn.type = 'button';
    rightBtn.className = 'frame-del';
    rightBtn.style.position = 'static';
    rightBtn.title = 'Pindah ke kanan';
    rightBtn.textContent = '\u25b6';
    rightBtn.addEventListener('click', () => moveFrame(index, index + 1));
    moveWrap.appendChild(leftBtn);
    moveWrap.appendChild(rightBtn);
    card.appendChild(moveWrap);

    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', String(index));
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      moveFrame(fromIndex, index);
    });

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

  await new Promise((resolve) => video.addEventListener('loadedmetadata', resolve, { once: true }));

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
  const step = mode === 'fps' ? 1 / fps : interval;
  const est = Math.max(0, Math.min(maxFrames, Math.floor((end - start) / step)));
  $('metaEstFrames').textContent = String(est);
}

/* =========================================================================
   EXPORT: FRAMES / SHEET / JSON
   ========================================================================= */
async function exportAllFrames() {
  if (state.frames.length === 0) { showToast('Tidak ada frame'); return; }
  const wrap = $('exportProgressWrap');
  const fill = $('exportProgressFill');
  const label = $('exportProgressLabel');
  wrap.hidden = false;
  const total = state.frames.length;
  const pad = String(total).length;

  for (let i = 0; i < total; i++) {
    await new Promise((resolve) => {
      state.frames[i].canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, 'frame_' + String(i).padStart(pad, '0') + '.png');
        resolve();
      }, 'image/png');
    });
    fill.style.width = ((i + 1) / total * 100) + '%';
    label.textContent = (i + 1) + ' / ' + total;
    await new Promise((r) => setTimeout(r, 160));
  }
  showToast('Semua frame diunduh');
  setTimeout(() => { wrap.hidden = true; fill.style.width = '0%'; }, 1000);
}

function exportJsonMetadata() {
  if (!state.sheetMeta) { showToast('Bangun spritesheet dulu di tab Spritesheet'); return; }
  const m = state.sheetMeta;
  const meta = {
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
    meta.frames.push({
      index: i,
      x: m.margin + col * (m.frameW + m.padding),
      y: m.margin + row * (m.frameH + m.padding),
      width: m.frameW,
      height: m.frameH
    });
  }
  downloadBlob(new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' }), 'spritesheet.json');
}

/* =========================================================================
   MERGE
   ========================================================================= */
function runMerge() {
  if (!state.mergeA || !state.mergeB) { showToast('Upload kedua spritesheet dulu'); return; }
  const mode = $('mergeMode').value;
  let result;

  if (mode === 'horizontal') {
    result = document.createElement('canvas');
    result.width = state.mergeA.width + state.mergeB.width;
    result.height = Math.max(state.mergeA.height, state.mergeB.height);
    const ctx = result.getContext('2d');
    ctx.drawImage(state.mergeA, 0, 0);
    ctx.drawImage(state.mergeB, state.mergeA.width, 0);
  } else if (mode === 'vertical') {
    result = document.createElement('canvas');
    result.width = Math.max(state.mergeA.width, state.mergeB.width);
    result.height = state.mergeA.height + state.mergeB.height;
    const ctx = result.getContext('2d');
    ctx.drawImage(state.mergeA, 0, 0);
    ctx.drawImage(state.mergeB, 0, state.mergeA.height);
  } else if (mode === 'overlay') {
    result = document.createElement('canvas');
    result.width = Math.max(state.mergeA.width, state.mergeB.width);
    result.height = Math.max(state.mergeA.height, state.mergeB.height);
    const ctx = result.getContext('2d');
    ctx.drawImage(state.mergeA, 0, 0);
    ctx.drawImage(state.mergeB, 0, 0);
  } else {
    const fwA = parseInt($('mergeFrameWA').value, 10) || 1;
    const fhA = parseInt($('mergeFrameHA').value, 10) || 1;
    const fwB = parseInt($('mergeFrameWB').value, 10) || 1;
    const fhB = parseInt($('mergeFrameHB').value, 10) || 1;
    const colsOut = parseInt($('mergeColumnsOut').value, 10) || 1;
    const fitMode = $('mergeFitMode').value;
    const targetW = Math.max(fwA, fwB);
    const targetH = Math.max(fhA, fhB);

    const framesA = sliceSpritesheet(state.mergeA, fwA, fhA).map((c) => normalizeFrame(c, targetW, targetH, fitMode));
    const framesB = sliceSpritesheet(state.mergeB, fwB, fhB).map((c) => normalizeFrame(c, targetW, targetH, fitMode));
    const built = buildSpritesheet(framesA.concat(framesB), { frameW: targetW, frameH: targetH, columns: colsOut, padding: 0, margin: 0 });
    result = built.canvas;
    state.sheetMeta = built;
  }

  state.exportSheet = result;
  paintPreview($('mergeResultCanvas'), result);
  showToast('Digabungkan. Buka tab Export untuk mengunduh PNG-nya.');
}

/* =========================================================================
   SPRITESHEET TAB
   ========================================================================= */
function runBuildSheet() {
  if (state.frames.length === 0) { showToast('Tidak ada frame untuk disusun'); return; }
  const settings = {
    frameW: parseInt($('sheetFrameW').value, 10) || 1,
    frameH: parseInt($('sheetFrameH').value, 10) || 1,
    columns: parseInt($('sheetColumns').value, 10) || 1,
    padding: parseInt($('sheetPadding').value, 10) || 0,
    margin: parseInt($('sheetMargin').value, 10) || 0
  };
  const result = buildSpritesheet(state.frames.map((f) => f.canvas), settings);
  state.sheetMeta = result;
  state.exportSheet = result.canvas;

  paintPreview($('sheetPreviewCanvas'), result.canvas);
  $('sheetTotalFrames').textContent = result.count;
  $('sheetRows').textContent = result.rows;
  $('sheetColsOut').textContent = result.cols;
  $('sheetFrameSize').textContent = result.frameW + '\u00d7' + result.frameH;
  $('sheetResolution').textContent = result.sheetW + '\u00d7' + result.sheetH;
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
   EVENT WIRING
   ========================================================================= */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      $('panel-' + btn.dataset.tab).classList.add('active');
    });
  });
}

function initDropzone() {
  const dropzone = $('dropzone');
  const fileInput = $('fileInput');
  $('pickFileBtn').addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
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
      refreshAllFrameViews();
      showToast(canvases.length + ' frame diekstrak');
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
      refreshAllFrameViews();
      showToast(canvases.length + ' frame di-decode dari GIF');
    } catch (err) {
      console.error(err);
      showToast('Gagal decode GIF: ' + err.message);
    } finally {
      btn.disabled = false;
      setTimeout(() => { wrap.hidden = true; fill.style.width = '0%'; }, 800);
    }
  });

  $('addImageFrameBtn').addEventListener('click', async () => {
    if (!currentFile) return;
    const canvas = await imageFileToCanvas(currentFile);
    state.frames.push({ id: nextId(), canvas });
    refreshAllFrameViews();
    showToast('Frame ditambahkan');
  });
}

function initBackgroundTab() {
  $('bgTolerance').addEventListener('input', (e) => { $('bgToleranceVal').textContent = e.target.value; });
  $('bgFeather').addEventListener('input', (e) => { $('bgFeatherVal').textContent = e.target.value; });

  $('bgPreviewBtn').addEventListener('click', () => {
    if (state.frames.length === 0) { showToast('Tidak ada frame'); return; }
    const clone = cloneCanvas(state.frames[0].canvas);
    applyBackgroundRemoval(clone, getBgSettings());
    paintPreview($('bgPreviewCanvas'), clone);
  });

  $('bgApplyBtn').addEventListener('click', () => {
    if (state.frames.length === 0) { showToast('Tidak ada frame'); return; }
    const settings = getBgSettings();
    const applyAll = $('bgApplyAll').checked;
    const targets = applyAll ? state.frames : [state.frames[0]];
    targets.forEach((f) => applyBackgroundRemoval(f.canvas, settings));
    refreshAllFrameViews();
    paintPreview($('bgPreviewCanvas'), targets[0].canvas);
    showToast(applyAll ? 'Diterapkan ke semua frame' : 'Diterapkan ke frame pertama');
  });
}

function initSheetTab() {
  $('buildSheetBtn').addEventListener('click', runBuildSheet);
}

function initEditorTab() {
  $('editorAddImageBtn').addEventListener('click', () => $('editorAddImageInput').click());
  $('editorAddImageInput').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const c = await imageFileToCanvas(f);
      state.frames.push({ id: nextId(), canvas: c });
    }
    refreshAllFrameViews();
    e.target.value = '';
  });
  $('rebuildSheetBtn').addEventListener('click', runBuildSheet);
}

function initMergeTab() {
  $('mergeFileA').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    state.mergeA = await imageFileToCanvas(f);
    paintPreview($('mergePreviewA'), state.mergeA);
  });
  $('mergeFileB').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    state.mergeB = await imageFileToCanvas(f);
    paintPreview($('mergePreviewB'), state.mergeB);
  });
  $('mergeMode').addEventListener('change', (e) => {
    $('mergeAppendSettings').hidden = e.target.value !== 'append';
  });
  $('mergeRunBtn').addEventListener('click', runMerge);
}

function initExportTab() {
  $('exportSheetBtn').addEventListener('click', () => {
    if (!state.exportSheet) { showToast('Belum ada spritesheet. Bangun dulu di tab Spritesheet atau Gabung.'); return; }
    downloadCanvasAsPNG(state.exportSheet, 'spritesheet.png');
  });
  $('exportFramesBtn').addEventListener('click', exportAllFrames);
  $('exportJsonBtn').addEventListener('click', exportJsonMetadata);
}

/* =========================================================================
   INIT
   ========================================================================= */
initTabs();
initDropzone();
initImportTab();
initBackgroundTab();
initSheetTab();
initEditorTab();
initMergeTab();
initExportTab();
