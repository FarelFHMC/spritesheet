'use strict';

/* Spritesheet Studio v2.6.0
   Made by Farelfhmc - Studio Fhilion. MIT License. */
const APP_VERSION = '2.6.0';

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

  setPaintColor(paint.color, true);
  setPaintCat('tools');
}

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
  'Baru di v2.6.0': "What's new in v2.6.0",
  'Frame di tab Editor sekarang bisa diekspor sebagai animasi: GIF, WebP animasi, atau video MP4, lengkap dengan FPS, skala, mode putar (ulang, bolak-balik, sekali), rentang frame, dan latar transparan. Tab Gabung kini bisa menggabungkan 2 spritesheet atau lebih (sampai 12), dengan urutan yang bisa diatur dan ukuran frame sendiri untuk tiap spritesheet di mode Append Frames.': 'Frames from the Editor tab can now be exported as an animation: GIF, animated WebP or MP4 video, with FPS, scale, play mode (loop, ping-pong, once), a frame range and a transparent background. The Merge tab can now join 2 or more spritesheets (up to 12), in an order you can change, with its own frame size for each spritesheet in Append Frames mode.',
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
initPrefs();
initNotice();
