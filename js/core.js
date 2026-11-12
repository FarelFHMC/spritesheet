'use strict';

/* Spritesheet Studio v2.7.9 - core: state, helpers, GIF decoder, video frames, background removal, spritesheet builder
   Made by Farelfhmc - Studio Fhilion. MIT License.
   Part 1 of 5. Classic script: shares one global scope with the other js/ files, so keep the load order from index.html. */

const APP_VERSION = '2.7.9';
/* version of the "What's new" notice (the text in index.html); only change it when the notice text changes */
const NOTICE_VERSION = '2.7.9';

/* =========================================================================
   STATE
   ========================================================================= */
const state = {
  frames: [],        // [{ id, canvas, name? }]
  sheetMeta: null,    // { canvas, cols, rows, frameW, frameH, count, sheetW, sheetH, padding, margin }
  exportSheet: null,  // last built/merged spritesheet canvas, used by Export tab
  mergeItems: [],      // spritesheets in the Merge tab: [{ id, canvas, name, fw, fh }] (2 or more)
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

