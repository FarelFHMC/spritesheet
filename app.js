'use strict';

/* Spritesheet Studio v1.6.0
   Made by Farelfhmc - Studio Fhilion. MIT License. */
const APP_VERSION = '1.6.0';

/* =========================================================================
   STATE
   ========================================================================= */
const state = {
  frames: [],        // [{ id, canvas, name? }]
  sheetMeta: null,    // { canvas, cols, rows, frameW, frameH, count, sheetW, sheetH, padding, margin }
  exportSheet: null,  // last built/merged spritesheet canvas, used by Export tab
  mergeA: null,        // canvas of loaded spritesheet A
  mergeB: null,        // canvas of loaded spritesheet B
  smooth: false,       // false = pixelated (nearest), true = smoothed
  lang: 'id',
  exportSource: null,  // 'frames' | 'merge': where exportSheet came from
  lastSheetSettings: null, // settings of the last sheet built from frames
  sheetStale: false,   // frames changed since the sheet was built
  thumbsDirty: false   // sprite editor changed pixels; other thumbnails need a refresh
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
  el.textContent = tr(msg);
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
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16)
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
  ctx.imageSmoothingEnabled = state.smooth;
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
  if (!state.smooth) {
    destCtx.putImageData(nearestResample(srcImageData, clampedSw, clampedSh, dw, dh), dx, dy);
  } else if (dw <= clampedSw && dh <= clampedSh) {
    destCtx.putImageData(areaResample(srcImageData, clampedSw, clampedSh, dw, dh), dx, dy);
  } else {
    destCtx.imageSmoothingEnabled = true;
    destCtx.imageSmoothingQuality = 'high';
    destCtx.drawImage(sourceCanvas, clampedSx, clampedSy, clampedSw, clampedSh, dx, dy, dw, dh);
  }
}

/* Pixelated mode: nearest-neighbor, picks the pixel at the centre of each output pixel's
   footprint. No colour blending, so pixel art stays sharp. */
function nearestResample(src, sw, sh, dw, dh) {
  const out = new ImageData(dw, dh);
  for (let oy = 0; oy < dh; oy++) {
    const sy = Math.min(sh - 1, Math.floor((oy + 0.5) * sh / dh));
    for (let ox = 0; ox < dw; ox++) {
      const sx = Math.min(sw - 1, Math.floor((ox + 0.5) * sw / dw));
      const si = (sy * sw + sx) * 4, oi = (oy * dw + ox) * 4;
      out.data[oi] = src.data[si]; out.data[oi + 1] = src.data[si + 1];
      out.data[oi + 2] = src.data[si + 2]; out.data[oi + 3] = src.data[si + 3];
    }
  }
  return out;
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

/* ---- File names ---- */
const FORMATS = {
  png: { mime: 'image/png', ext: 'png' },
  jpeg: { mime: 'image/jpeg', ext: 'jpg' },
  webp: { mime: 'image/webp', ext: 'webp' }
};

/* Makes a safe file name: no path or reserved characters, no extension, no trailing dot/space. */
function sanitizeName(raw, fallback) {
  let n = String(raw == null ? '' : raw)
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/[\u0000-\u001f\u007f\\/:*?"<>|]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/\.(png|jpe?g|webp|zip|json)$/i, '')
    .replace(/^\.+/, '')
    .replace(/[. ]+$/, '');
  if (n.length > 80) n = n.slice(0, 80).replace(/[. ]+$/, '');
  if (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(n)) n = '_' + n;
  return n || fallback;
}

/* Returns name.ext, adding _2, _3 ... if the name is already used in `used`. */
function uniqueFileName(used, base, ext) {
  let name = base + '.' + ext, k = 2;
  while (used.has(name.toLowerCase())) name = base + '_' + (k++) + '.' + ext;
  used.add(name.toLowerCase());
  return name;
}

/* ---- Image encoding (PNG / JPG / WebP) ---- */
/* Resolves { blob, ext, fellBack } or null. fellBack = the browser can't encode that format
   and returned PNG instead, so the extension is corrected to match the real bytes. */
function encodeCanvas(canvas, opt) {
  return new Promise((resolve) => {
    const f = FORMATS[opt.fmt] || FORMATS.png;
    let src = canvas;
    if (opt.fmt === 'jpeg') {
      // JPG has no transparency: put the sprite on a solid color instead of black
      src = document.createElement('canvas');
      src.width = canvas.width;
      src.height = canvas.height;
      const c = src.getContext('2d');
      c.fillStyle = opt.bg || '#ffffff';
      c.fillRect(0, 0, src.width, src.height);
      c.drawImage(canvas, 0, 0);
    }
    const q = opt.fmt === 'png' ? undefined : Math.min(1, Math.max(0.1, (opt.quality || 92) / 100));
    try {
      src.toBlob((blob) => {
        if (!blob) { resolve(null); return; }
        if (blob.type !== f.mime) resolve({ blob, ext: 'png', fellBack: true });
        else resolve({ blob, ext: f.ext, fellBack: false });
      }, f.mime, q);
    } catch (e) { resolve(null); }
  });
}

/* ---- Minimal ZIP writer (store, no compression: PNG/JPG/WebP are already compressed) ---- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* files: [{ name: string, data: Uint8Array }]. Names are stored as UTF-8. Returns a Blob. */
function makeZip(files) {
  if (files.length > 65535) throw new Error('zip-too-big');
  const enc = new TextEncoder();
  const d = new Date();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosDate = (Math.max(0, d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const parts = [], central = [];
  let offset = 0, cdSize = 0;

  for (const f of files) {
    const name = enc.encode(f.name);
    const len = f.data.length;
    const crc = crc32(f.data);
    if (offset + 30 + name.length + len > 0xFFFFFFFF) throw new Error('zip-too-big');

    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 0x0800, true);          // bit 11: UTF-8 file names
    lh.setUint16(8, 0, true);               // method 0 = stored
    lh.setUint16(10, dosTime, true);
    lh.setUint16(12, dosDate, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, len, true);
    lh.setUint32(22, len, true);
    lh.setUint16(26, name.length, true);
    lh.setUint16(28, 0, true);
    parts.push(lh.buffer, name, f.data);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, dosTime, true);
    ch.setUint16(14, dosDate, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, len, true);
    ch.setUint32(24, len, true);
    ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(ch.buffer, name);
    cdSize += 46 + name.length;
    offset += 30 + name.length + len;
  }

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
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
/* Waits until the video really shows the requested time. Fixes the old bug where the canvas
   was drawn right after 'seeked', before the new frame was painted (stale/duplicated frames),
   and where seeking to the current time never fired 'seeked' (hang). */
function seekVideo(video, time) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(guard);
      video.removeEventListener('seeked', settle);
      resolve();
    };
    function settle() {
      video.removeEventListener('seeked', settle);
      if (typeof video.requestVideoFrameCallback === 'function') {
        video.requestVideoFrameCallback(finish);
        setTimeout(finish, 250);
      } else {
        requestAnimationFrame(() => requestAnimationFrame(finish));
      }
    }
    const guard = setTimeout(finish, 4000);
    if (Math.abs(video.currentTime - time) < 0.0005 && video.readyState >= 2) {
      settle();
    } else {
      video.addEventListener('seeked', settle);
      video.currentTime = time;
    }
  });
}

/* Frame times are start + i*step (no float accumulation). The last frame is kept and clamped
   just inside the video length, because seeking exactly to the end gives no new frame. */
function buildTimestamps(duration, s) {
  const start = Math.max(0, s.start || 0);
  const end = s.end ? Math.min(s.end, duration) : duration;
  const step = s.mode === 'fps' ? 1 / s.fps : s.interval;
  const last = Math.max(0, duration - 0.001);
  const out = [];
  for (let i = 0; out.length < s.maxFrames; i++) {
    const t = start + i * step;
    if (t >= end - 1e-6) break;
    out.push(Math.min(t, last));
  }
  return out;
}

async function extractVideoFrames(video, settings, onProgress) {
  const duration = video.duration;
  const timestamps = buildTimestamps(duration, settings);

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
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const { r: tr_, g: tg, b: tb } = settings.color;
  const tol = settings.tolerance, feather = settings.feather;
  const chroma = settings.mode === 'chroma';
  // Chroma key: also pull the key colour's dominant channel down on edge pixels (despill)
  const keyCh = tr_ >= tg && tr_ >= tb ? 0 : (tg >= tb ? 1 : 2);
  const o1 = (keyCh + 1) % 3, o2 = (keyCh + 2) % 3;

  for (let i = 0; i < data.length; i += 4) {
    const dist = colorDistance(data[i], data[i + 1], data[i + 2], tr_, tg, tb);
    if (dist <= tol) { data[i + 3] = 0; continue; }
    if (feather > 0 && dist < tol + feather) {
      const t = (dist - tol) / feather;
      data[i + 3] = Math.round(data[i + 3] * (chroma ? t * t * (3 - 2 * t) : t));
    }
    if (chroma && dist < tol + feather + 60) {
      const lim = (data[i + o1] + data[i + o2]) / 2;
      if (data[i + keyCh] > lim) data[i + keyCh] = lim;
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
    delBtn.title = tr('Hapus frame');
    delBtn.textContent = '\u00d7';
    delBtn.addEventListener('click', () => {
      state.frames = state.frames.filter((x) => x.id !== f.id);
      framesChanged();
    });
    card.appendChild(delBtn);

    // Touch-friendly reorder controls (native HTML5 drag & drop below is for mouse/desktop)
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

/* File name (without extension) of frame i: custom name from the Sprite Editor, else base_00 */
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
    base + '_00.' + ext + ' \u00b7 ' + base + '_frames.zip \u00b7 ' + base + '.json';
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
async function withExportBusy(fn, showProgress) {
  const btns = document.querySelectorAll('#panel-export .btn');
  const wrap = $('exportProgressWrap'), fill = $('exportProgressFill'), label = $('exportProgressLabel');
  btns.forEach((b) => { b.disabled = true; });
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
    showToast(err && err.message === 'zip-too-big' ? 'ZIP terlalu besar. Gunakan download satu per satu.' : 'Gagal membuat file');
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
   MERGE
   ========================================================================= */
function runMerge() {
  if (!state.mergeA || !state.mergeB) { showToast('Upload kedua spritesheet dulu'); return; }
  const mode = $('mergeMode').value;
  let result;
  state.sheetMeta = null; // only "append" produces a grid that JSON metadata can describe

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
      if (btn.dataset.tab === 'background') renderBgPreview();
      if (btn.dataset.tab === 'paint') { renderPaintPicker(); }
      else if (state.thumbsDirty) { state.thumbsDirty = false; refreshAllFrameViews(); }
      if (btn.dataset.tab === 'export') updateExportUI();
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
    targets.forEach((f) => applyBackgroundRemoval(f.canvas, settings));
    framesChanged();
    renderBgPreview();
    showToast(applyAll ? 'Diterapkan ke semua frame' : 'Diterapkan ke frame pertama');
  });
  $('bgUndoBtn').addEventListener('click', () => {
    if (!bgUndo) { showToast('Tidak ada yang bisa diurungkan'); return; }
    bgUndo.forEach(({ f, copy }) => {
      const ctx = f.canvas.getContext('2d');
      ctx.clearRect(0, 0, f.canvas.width, f.canvas.height);
      ctx.drawImage(copy, 0, 0);
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
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const c = await imageFileToCanvas(f);
      state.frames.push({ id: nextId(), canvas: c });
    }
    framesChanged();
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
  $('exportSheetBtn').addEventListener('click', exportSheetImage);
  $('exportZipBtn').addEventListener('click', exportFramesZip);
  $('exportFramesBtn').addEventListener('click', exportFramesOneByOne);
  $('exportJsonBtn').addEventListener('click', exportJsonMetadata);
  $('exportName').addEventListener('input', updateExportUI);
  $('exportName').addEventListener('change', () => { $('exportName').value = getBaseName(); updateExportUI(); });
  $('exportFormat').addEventListener('change', updateExportUI);
  $('exportQuality').addEventListener('input', updateExportUI);
  updateExportUI();
}

/* =========================================================================
   SPRITE EDITOR (beta): brush, eraser, color, pan, zoom, undo / redo
   Draws straight onto the frame's own canvas at its real pixel size, so what you paint is
   exactly what gets exported. Pointer events cover mouse, touch and pen.
   ========================================================================= */
const paint = { id: null, tool: 'brush', color: '#000000', size: 1, zoom: 0, undo: [], redo: [], pid: null, last: null, pan: null };
const ZOOM_STEPS = [0.25, 0.5, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];

function paintFrame() { return state.frames.find((f) => f.id === paint.id) || null; }

function resetPaintHistory() { paint.undo = []; paint.redo = []; paint.pid = null; paint.last = null; paint.pan = null; }

function paintScale() {
  const f = paintFrame();
  if (!f) return 1;
  if (paint.zoom) return paint.zoom;
  const availW = Math.max(120, $('paintWrap').clientWidth - 14);
  const availH = Math.max(160, Math.round(window.innerHeight * 0.55));
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
  ctx.drawImage(f.canvas, 0, 0);
}

function renderPaintCanvas() {
  const f = paintFrame();
  if (!f) return;
  const v = $('paintCanvas'), w = f.canvas.width, h = f.canvas.height;
  if (v.width !== w || v.height !== h) { v.width = w; v.height = h; }
  repaintPaintView();
  const sc = paintScale();
  v.style.width = (w * sc) + 'px';
  v.style.height = (h * sc) + 'px';
  $('paintZoomLabel').textContent = Math.round(sc * 100) + '%';
}

function syncPaintName() { const f = paintFrame(); $('paintName').value = f && f.name ? f.name : ''; }

function updatePaintButtons() {
  $('paintUndoBtn').disabled = paint.undo.length === 0;
  $('paintRedoBtn').disabled = paint.redo.length === 0;
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
    b.appendChild(makeThumbCanvas(f.canvas, 56));
    b.addEventListener('click', () => selectPaintFrame(f.id));
    strip.appendChild(b);
  });
  const has = !!paint.id;
  $('paintEmpty').hidden = has;
  $('paintWork').hidden = !has;
  if (has) renderPaintCanvas();
  updatePaintButtons();
}

function selectPaintFrame(id) {
  if (id === paint.id) return;
  paint.id = id;
  resetPaintHistory();
  syncPaintName();
  document.querySelectorAll('#paintFrameStrip .frame-pick').forEach((b) => b.classList.toggle('sel', b.dataset.id === id));
  renderPaintCanvas();
  updatePaintButtons();
}

/* Called after pixels of the selected frame changed (stroke end, undo, redo). */
function paintChanged() {
  state.sheetStale = true;
  state.thumbsDirty = true;
  const f = paintFrame();
  const b = $('paintFrameStrip').querySelector('.frame-pick.sel');
  if (f && b) { b.innerHTML = ''; b.appendChild(makeThumbCanvas(f.canvas, 56)); }
}

function pushPaintUndo(f) {
  const w = f.canvas.width, h = f.canvas.height;
  paint.undo.push(f.canvas.getContext('2d').getImageData(0, 0, w, h));
  const max = Math.max(3, Math.min(40, Math.floor(48e6 / (w * h * 4)))); // cap memory on big frames
  while (paint.undo.length > max) paint.undo.shift();
  paint.redo = [];
  updatePaintButtons();
}

function paintStep(from, to) {
  const f = paintFrame();
  if (!f || !from.length || paint.pid !== null) return;
  const ctx = f.canvas.getContext('2d');
  const snap = from.pop();
  to.push(ctx.getImageData(0, 0, f.canvas.width, f.canvas.height));
  ctx.putImageData(snap, 0, 0);
  repaintPaintView();
  paintChanged();
  updatePaintButtons();
}

function stampAt(ctx, x, y) {
  const sz = paint.size, o = Math.floor(sz / 2);
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

function paintPoint(e) {
  const f = paintFrame(), r = $('paintCanvas').getBoundingClientRect();
  const w = f.canvas.width, h = f.canvas.height;
  const cl = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  return {
    x: cl(Math.floor((e.clientX - r.left) * w / r.width), -40, w + 40),
    y: cl(Math.floor((e.clientY - r.top) * h / r.height), -40, h + 40)
  };
}

function setPaintColor(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
  paint.color = hex.toLowerCase();
  $('paintColor').value = paint.color;
  $('paintHex').value = paint.color;
  if (paint.tool !== 'brush') setPaintTool('brush'); // picking a color means you want to paint with it
}

function setPaintTool(tool) {
  paint.tool = tool;
  document.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
  $('paintCanvas').classList.toggle('pan', tool === 'pan');
}

function stepPaintZoom(dir) {
  const cur = paintScale();
  let next;
  if (dir > 0) next = ZOOM_STEPS.find((z) => z > cur * 1.0001) || ZOOM_STEPS[ZOOM_STEPS.length - 1];
  else next = [...ZOOM_STEPS].reverse().find((z) => z < cur * 0.9999) || ZOOM_STEPS[0];
  paint.zoom = next;
  renderPaintCanvas();
}

function initPaintTab() {
  const v = $('paintCanvas'), wrap = $('paintWrap');

  const endStroke = () => {
    const drew = !paint.pan && paint.last;
    paint.pid = null; paint.last = null; paint.pan = null;
    if (drew) { paintChanged(); updatePaintButtons(); }
  };

  v.addEventListener('pointerdown', (e) => {
    const f = paintFrame();
    if (!f || paint.pid !== null) return;                      // ignore a 2nd finger mid-stroke
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try { v.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    paint.pid = e.pointerId;
    if (paint.tool === 'pan') {
      paint.pan = { x: e.clientX, y: e.clientY, l: wrap.scrollLeft, t: wrap.scrollTop };
      return;
    }
    pushPaintUndo(f);
    const pt = paintPoint(e);
    paint.last = pt;
    stampAt(f.canvas.getContext('2d'), pt.x, pt.y);
    repaintPaintView();
  });
  v.addEventListener('pointermove', (e) => {
    if (e.pointerId !== paint.pid) return;
    if (paint.pan) {
      wrap.scrollLeft = paint.pan.l - (e.clientX - paint.pan.x);
      wrap.scrollTop = paint.pan.t - (e.clientY - paint.pan.y);
      return;
    }
    const f = paintFrame();
    if (!f || !paint.last) return;
    const pt = paintPoint(e);
    if (pt.x === paint.last.x && pt.y === paint.last.y) return;
    strokeLine(f.canvas.getContext('2d'), paint.last.x, paint.last.y, pt.x, pt.y);
    paint.last = pt;
    repaintPaintView();
  });
  const finish = (e) => { if (e.pointerId === paint.pid) endStroke(); };
  v.addEventListener('pointerup', finish);
  v.addEventListener('pointercancel', finish);
  v.addEventListener('lostpointercapture', finish);

  document.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => setPaintTool(b.dataset.tool)));
  $('paintColor').addEventListener('input', (e) => setPaintColor(e.target.value));
  $('paintHex').addEventListener('input', (e) => {
    let val = e.target.value.trim();
    if (val && val[0] !== '#') val = '#' + val;
    setPaintColor(val);
  });
  $('paintSwatches').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-color]');
    if (b) setPaintColor(b.dataset.color);
  });
  $('paintSize').addEventListener('input', (e) => {
    paint.size = parseInt(e.target.value, 10) || 1;
    $('paintSizeVal').textContent = paint.size;
  });
  $('paintUndoBtn').addEventListener('click', () => paintStep(paint.undo, paint.redo));
  $('paintRedoBtn').addEventListener('click', () => paintStep(paint.redo, paint.undo));
  $('paintZoomInBtn').addEventListener('click', () => stepPaintZoom(1));
  $('paintZoomOutBtn').addEventListener('click', () => stepPaintZoom(-1));
  $('paintFitBtn').addEventListener('click', () => { paint.zoom = 0; renderPaintCanvas(); });
  $('paintName').addEventListener('input', (e) => {
    const f = paintFrame();
    if (f) f.name = e.target.value.trim() ? e.target.value : undefined;
  });

  document.addEventListener('keydown', (e) => {
    if (!$('panel-paint').classList.contains('active')) return;
    const t = e.target && e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); paintStep(paint.undo, paint.redo); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); paintStep(paint.redo, paint.undo); }
  });

  let rz = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if ($('panel-paint').classList.contains('active') && paintFrame()) renderPaintCanvas(); }, 120);
  });
}

/* =========================================================================
   WHAT'S NEW NOTICE (shown once per version)
   ========================================================================= */
function initNotice() {
  const box = $('newsNotice');
  let seen = null;
  try { seen = localStorage.getItem('ss.seen'); } catch (e) { /* storage blocked: just show it */ }
  box.hidden = seen === APP_VERSION;
  $('newsClose').addEventListener('click', () => {
    box.hidden = true;
    try { localStorage.setItem('ss.seen', APP_VERSION); } catch (e) { /* ignore */ }
  });
}

/* =========================================================================
   LANGUAGE (ID default text lives in the HTML; EN is swapped in from this table)
   ========================================================================= */
const EN = {
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
  'Seret kartu untuk mengubah urutan. Ketuk \u00d7 untuk menghapus.': 'Drag cards to reorder. Tap \u00d7 to delete.',
  '+ Tambah Gambar': '+ Add Images', 'Gabungkan 2 Spritesheet': 'Merge 2 Spritesheets', 'Mode Gabung': 'Merge Mode',
  'Fit mode (jika ukuran beda)': 'Fit mode (if sizes differ)', 'Gabungkan': 'Merge',
  'Download Spritesheet': 'Download Spritesheet',
  'Download Semua Frame (ZIP)': 'Download All Frames (ZIP)',
  'Download Frame Satu per Satu': 'Download Frames One by One',
  'Download JSON Metadata': 'Download JSON Metadata',
  'Nama file': 'File name', 'Format gambar': 'Image format',
  'PNG (transparan)': 'PNG (transparent)', 'JPG (tanpa transparansi)': 'JPG (no transparency)', 'WebP (transparan)': 'WebP (transparent)',
  'Kualitas (': 'Quality (', 'Warna latar JPG': 'JPG background color',
  'Nama file hasil:': 'Output file names:',
  'ZIP menyatukan semua frame dalam satu file. Nama frame bisa diubah satu per satu di tab Editor Sprite.': 'A ZIP puts every frame in one file. You can rename frames one by one in the Sprite Editor tab.',
  'Editor Sprite': 'Sprite Editor',
  'Pilih frame, lalu gambar langsung di atasnya. Hasilnya ikut ke Export.': 'Pick a frame, then draw right on it. Your changes go into Export.',
  'Belum ada frame. Import dulu di tab Import.': 'No frames yet. Import some in the Import tab first.',
  'Alat': 'Tools', 'Geser': 'Pan', 'Ukuran kuas (': 'Brush size (', 'Ulangi': 'Redo',
  'Nama frame (untuk nama file saat export)': 'Frame name (used as the file name on export)',
  'Fitur beta: kuas persegi tanpa anti-alias (cocok untuk pixel art). Spritesheet otomatis diperbarui saat export.': 'Beta: square brush with no anti-aliasing (made for pixel art). The spritesheet is refreshed automatically on export.',
  'Baru di v1.6.0': "What's new in v1.6.0",
  'Export frame ke ZIP, ganti nama file, format JPG/WebP, dan Editor Sprite (beta).': 'Export frames to ZIP, rename files, JPG/WebP formats, and the Sprite Editor (beta).',
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
}

function setLang(l) {
  state.lang = l;
  try { localStorage.setItem('ss.lang', l); } catch (e) {}
  applyLang();
  refreshAllFrameViews();
  updateExportUI();
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

function initPrefs() {
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
initPaintTab();
initPrefs();
initNotice();
