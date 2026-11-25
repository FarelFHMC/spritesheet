'use strict';

/* Spritesheet Studio v2.9.0 - sound: the audio engine of the Sound Studio
   Song model and cleaning, Web Audio synth + drums + master effects, a look-ahead player, offline render,
   WAV and MIDI writers, a MIDI reader, and an sfxr-style sound-effect generator (all written for this app, no library).
   Made by Farelfhmc - Studio Fhilion. MIT License.
   Part 7 of 8. Classic script (no modules): shares one scope with the other js/ files. It only defines things;
   the screen (tab) is in audio.js, which loads after it. */

/* =========================================================================
   CONSTANTS
   ========================================================================= */
const SND_LO = 24;                 // lowest note of the piano roll (C1)
const SND_HI = 95;                 // highest note (B6)
const SND_MAX_TRACKS = 8;
const SND_MAX_BARS = 64;
const SND_MAX_STEPS = 2048;        // bars x beats x steps never goes over this
const SND_MAX_NOTES = 6000;        // in the whole song
const SND_MAX_SFX = 64;            // sounds in the bank
const SND_MAX_SECONDS = 600;       // longest song that can be exported
const SND_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SND_WAVES = ['square', 'pulse25', 'pulse125', 'triangle', 'saw', 'sine', 'organ', 'noise'];
const SND_DRUMS = ['kick', 'snare', 'hat', 'ohat', 'clap', 'tomlo', 'tomhi', 'crash'];
const SND_DRUM_MIDI = [36, 38, 42, 46, 39, 45, 50, 49];          // General MIDI drum note of each row
const SND_PROGRAM = { square: 80, pulse25: 80, pulse125: 80, triangle: 73, saw: 81, sine: 79, organ: 19, noise: 122 };
const SND_SCALES = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentmaj: [0, 2, 4, 7, 9],
  pentmin: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  harmmin: [0, 2, 3, 5, 7, 8, 11]
};
const SND_CHORDS = {
  none: [0], maj: [0, 4, 7], min: [0, 3, 7], sus4: [0, 5, 7], dim: [0, 3, 6],
  seven: [0, 4, 7, 10], min7: [0, 3, 7, 10], oct: [0, 12]
};
const SND_COLORS = ['#8fbf5a', '#5aa9e6', '#e6a85a', '#e66a8f', '#a98fe6', '#5ae6c8', '#e6dc5a', '#e68a5a'];

/* =========================================================================
   SMALL HELPERS
   ========================================================================= */
function sndHas(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
function sndClamp(v, lo, hi, def) {
  v = Number(v);
  if (!isFinite(v)) return def;
  return v < lo ? lo : v > hi ? hi : v;
}
function sndInt(v, lo, hi, def) { return Math.round(sndClamp(v, lo, hi, def)); }
function sndText(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max); }
let sndUidN = 0;
function sndUid() { return 'k' + Date.now().toString(36) + (sndUidN++).toString(36) + Math.random().toString(36).slice(2, 5); }
function sndNoteName(p) { return SND_NAMES[((p % 12) + 12) % 12] + (Math.floor(p / 12) - 1); }
function sndIsBlack(p) { return [1, 3, 6, 8, 10].indexOf(((p % 12) + 12) % 12) >= 0; }
function sndTotalSteps(s) { return s.bars * s.bpb * s.spb; }
function sndStepSec(s) { return 60 / s.bpm / s.spb; }
function sndFreq(p) { return 440 * Math.pow(2, (p - 69) / 12); }
function sndMaxBars(bpb, spb) { return Math.max(1, Math.min(SND_MAX_BARS, Math.floor(SND_MAX_STEPS / (bpb * spb)))); }

/* =========================================================================
   SONG MODEL
   song  = { bpm, spb (steps per beat), bpb (beats per bar), bars, swing, root, scale, master, tracks }
   track = { id, name, kind 'synth' | 'drum', wave, vol, pan, mute, solo, env {a,d,s,r}, vib {depth,rate}, notes }
   note  = { s: start step, l: length in steps, p: pitch (MIDI number) or drum row, v: velocity 0.05 - 1 }
   ========================================================================= */
function sndNewTrack(kind, n) {
  return {
    id: sndUid(), name: kind === 'drum' ? 'Drums' : 'Track ' + n, kind: kind,
    wave: kind === 'drum' ? 'noise' : 'square', vol: 0.8, pan: 0, mute: false, solo: false,
    env: { a: 0.005, d: 0.12, s: 0.7, r: 0.06 }, vib: { depth: 0, rate: 5 }, notes: []
  };
}
function sndNewSong() {
  return {
    bpm: 120, spb: 4, bpb: 4, bars: 4, swing: 0, root: 0, scale: 'chromatic',
    master: { vol: 0.85, echo: { on: false, time: 0.25, fb: 0.3, mix: 0.25 }, rev: { on: false, mix: 0.2 } },
    tracks: [sndNewTrack('synth', 1)]
  };
}
function sndClone(o) { return JSON.parse(JSON.stringify(o)); }

function sndCleanTrack(r, song, used, budget) {
  const kind = r && r.kind === 'drum' ? 'drum' : 'synth';
  const t = sndNewTrack(kind, used.size + 1);
  if (!r || typeof r !== 'object') return t;
  t.id = typeof r.id === 'string' && /^[\w-]{1,40}$/.test(r.id) && !used.has(r.id) ? r.id : sndUid();
  used.add(t.id);
  t.name = sndText(r.name, 24) || t.name;
  if (kind === 'synth') t.wave = SND_WAVES.indexOf(r.wave) >= 0 ? r.wave : 'square';
  t.vol = Math.round(sndClamp(r.vol, 0, 1, 0.8) * 100) / 100;
  t.pan = Math.round(sndClamp(r.pan, -1, 1, 0) * 100) / 100;
  t.mute = !!r.mute; t.solo = !!r.solo;
  const e = r.env && typeof r.env === 'object' ? r.env : {};
  t.env = { a: sndClamp(e.a, 0.001, 2, 0.005), d: sndClamp(e.d, 0.005, 3, 0.12), s: sndClamp(e.s, 0, 1, 0.7), r: sndClamp(e.r, 0.005, 3, 0.06) };
  const vb = r.vib && typeof r.vib === 'object' ? r.vib : {};
  t.vib = { depth: sndClamp(vb.depth, 0, 100, 0), rate: sndClamp(vb.rate, 0.5, 12, 5) };
  const total = sndTotalSteps(song), hiP = kind === 'drum' ? SND_DRUMS.length - 1 : SND_HI, loP = kind === 'drum' ? 0 : SND_LO;
  (Array.isArray(r.notes) ? r.notes : []).forEach((n) => {
    if (budget.n <= 0 || !n || typeof n !== 'object') return;
    const s = Math.round(Number(n.s)), l = Math.round(Number(n.l)), p = Math.round(Number(n.p));
    if (!(s >= 0 && s < total) || !(l >= 1) || !isFinite(p) || p < loP || p > hiP) return;
    t.notes.push({ s: s, l: Math.min(l, total - s), p: p, v: Math.round(sndClamp(n.v, 0.05, 1, 0.8) * 100) / 100 });
    budget.n--;
  });
  return t;
}

/* Turns anything (a saved file, a JSON backup, a pasted object) into a safe song. Throws when it is not an object. */
function sndCleanSong(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('bad song');
  const s = sndNewSong();
  s.bpm = sndInt(raw.bpm, 30, 300, 120);
  s.spb = raw.spb === 2 || raw.spb === 8 ? raw.spb : 4;
  s.bpb = sndInt(raw.bpb, 2, 8, 4);
  s.bars = Math.min(sndInt(raw.bars, 1, SND_MAX_BARS, 4), sndMaxBars(s.bpb, s.spb));
  s.swing = Math.round(sndClamp(raw.swing, 0, 0.6, 0) * 100) / 100;
  s.root = sndInt(raw.root, 0, 11, 0);
  s.scale = typeof raw.scale === 'string' && sndHas(SND_SCALES, raw.scale) ? raw.scale : 'chromatic';
  const m = raw.master && typeof raw.master === 'object' ? raw.master : {};
  const ec = m.echo && typeof m.echo === 'object' ? m.echo : {}, rv = m.rev && typeof m.rev === 'object' ? m.rev : {};
  s.master = {
    vol: sndClamp(m.vol, 0, 1, 0.85),
    echo: { on: !!ec.on, time: sndClamp(ec.time, 0.05, 1, 0.25), fb: sndClamp(ec.fb, 0, 0.85, 0.3), mix: sndClamp(ec.mix, 0, 1, 0.25) },
    rev: { on: !!rv.on, mix: sndClamp(rv.mix, 0, 1, 0.2) }
  };
  const used = new Set(), budget = { n: SND_MAX_NOTES };
  s.tracks = (Array.isArray(raw.tracks) ? raw.tracks : []).slice(0, SND_MAX_TRACKS).map((t) => sndCleanTrack(t, s, used, budget));
  if (!s.tracks.length) s.tracks = [sndNewTrack('synth', 1)];
  return s;
}

function sndCountNotes(song) { return song.tracks.reduce((a, t) => a + t.notes.length, 0); }

/* =========================================================================
   DEMO SONG (an original little tune, A minor: Am - F - C - G)
   ========================================================================= */
function sndDemoSong() {
  const s = sndNewSong();
  s.bpm = 124; s.bars = 8; s.root = 9; s.scale = 'minor';
  s.master.echo = { on: true, time: 0.24, fb: 0.28, mix: 0.2 };
  const lead = sndNewTrack('synth', 1), bass = sndNewTrack('synth', 2), arp = sndNewTrack('synth', 3), drum = sndNewTrack('drum', 4);
  lead.name = 'Lead'; lead.wave = 'pulse25'; lead.vol = 0.7; lead.env = { a: 0.004, d: 0.1, s: 0.6, r: 0.08 }; lead.vib = { depth: 14, rate: 5.5 };
  bass.name = 'Bass'; bass.wave = 'triangle'; bass.vol = 0.9; bass.env = { a: 0.003, d: 0.08, s: 0.8, r: 0.05 };
  arp.name = 'Arp'; arp.wave = 'pulse125'; arp.vol = 0.38; arp.pan = 0.3; arp.env = { a: 0.002, d: 0.06, s: 0.35, r: 0.04 };
  drum.name = 'Drums'; drum.vol = 0.85;
  const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const roots = [45, 41, 48, 43];
  const mel = [
    [[0, 76, 4], [4, 79, 2], [6, 76, 2], [8, 72, 4], [12, 74, 4]],
    [[0, 72, 4], [4, 77, 2], [6, 76, 2], [8, 72, 4], [12, 69, 4]],
    [[0, 76, 4], [4, 79, 4], [8, 84, 4], [12, 79, 4]],
    [[0, 74, 4], [4, 71, 4], [8, 74, 4], [12, 67, 4]],
    [[0, 81, 4], [4, 79, 2], [6, 76, 2], [8, 72, 4], [12, 76, 4]],
    [[0, 77, 4], [4, 76, 2], [6, 72, 2], [8, 69, 4], [12, 72, 4]],
    [[0, 79, 4], [4, 76, 4], [8, 72, 4], [12, 76, 4]],
    [[0, 74, 4], [4, 71, 4], [8, 69, 8]]
  ];
  for (let b = 0; b < 8; b++) {
    const base = b * 16, c = chords[b % 4], root = roots[b % 4];
    mel[b].forEach((m) => lead.notes.push({ s: base + m[0], l: m[2], p: m[1], v: 0.85 }));
    for (let i = 0; i < 8; i++) bass.notes.push({ s: base + i * 2, l: 2, p: root + (i % 4 === 3 ? 12 : 0), v: 0.9 });
    for (let i = 0; i < 16; i++) arp.notes.push({ s: base + i, l: 1, p: c[[0, 1, 2, 1][i % 4]] + 12, v: i % 4 === 0 ? 0.8 : 0.55 });
    [0, 8].concat(b % 2 ? [10] : []).forEach((st) => drum.notes.push({ s: base + st, l: 1, p: 0, v: 0.95 }));
    [4, 12].forEach((st) => drum.notes.push({ s: base + st, l: 1, p: 1, v: 0.9 }));
    for (let i = 0; i < 16; i += 2) drum.notes.push({ s: base + i, l: 1, p: 2, v: i % 4 === 0 ? 0.6 : 0.42 });
    if (b % 2) drum.notes.push({ s: base + 14, l: 1, p: 3, v: 0.6 });
    if (b === 0 || b === 4) drum.notes.push({ s: base, l: 1, p: 7, v: 0.7 });
  }
  s.tracks = [lead, bass, arp, drum];
  return s;
}

/* =========================================================================
   WEB AUDIO: VOICES
   Everything takes the context as an argument, so the very same code plays live (AudioContext)
   and renders to a file (OfflineAudioContext). Noise is made from a fixed seed, so nothing in a render is random.
   ========================================================================= */
const sndCache = new WeakMap();    // context -> { noise, waves, ir }
function sndC(ctx) {
  let c = sndCache.get(ctx);
  if (!c) { c = { waves: {}, noise: null, ir: null }; sndCache.set(ctx, c); }
  return c;
}
function sndNoiseBuf(ctx) {
  const c = sndC(ctx);
  if (!c.noise) {
    const len = Math.max(8000, Math.floor(ctx.sampleRate * 2));
    const b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let x = 2463534242;
    for (let i = 0; i < len; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; d[i] = ((x >>> 0) / 4294967295) * 2 - 1; }
    c.noise = b;
  }
  return c.noise;
}
function sndNoiseSrc(ctx, t0) {
  const s = ctx.createBufferSource();
  s.buffer = sndNoiseBuf(ctx);
  s.loop = true;
  s.start(t0, (t0 * 1.7) % 1.4);
  return s;
}
function sndPeriodic(ctx, wave) {
  const c = sndC(ctx);
  if (!c.waves[wave]) {
    const N = 64, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
    if (wave === 'pulse25' || wave === 'pulse125') {
      const d = wave === 'pulse25' ? 0.25 : 0.125;
      for (let n = 1; n <= N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d);
    } else {
      [1, 0.6, 0.45, 0.3, 0, 0.2, 0, 0.12].forEach((a, i) => { im[i + 1] = a; });
    }
    c.waves[wave] = ctx.createPeriodicWave(re, im);
  }
  return c.waves[wave];
}
function sndSetWave(ctx, osc, wave) {
  if (wave === 'square' || wave === 'triangle' || wave === 'sine') osc.type = wave;
  else if (wave === 'saw') osc.type = 'sawtooth';
  else osc.setPeriodicWave(sndPeriodic(ctx, wave));
}

/* attack / decay / sustain, then release from the moment the note ends. Returns when the sound is silent. */
function sndEnv(g, t0, dur, peak, env) {
  const a = Math.max(0.001, env.a), d = Math.max(0.005, env.d), r = Math.max(0.005, env.r);
  const off = t0 + dur;
  let level;
  g.gain.setValueAtTime(0, t0);
  if (dur <= a) {
    level = peak * (dur / a);
    g.gain.linearRampToValueAtTime(level, off);
  } else {
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    if (dur <= a + d) {
      level = peak + (peak * env.s - peak) * ((dur - a) / d);
      g.gain.linearRampToValueAtTime(level, off);
    } else {
      level = peak * env.s;
      g.gain.linearRampToValueAtTime(level, t0 + a + d);
      g.gain.setValueAtTime(level, off);
    }
  }
  g.gain.linearRampToValueAtTime(0, off + r);
  return off + r;
}

function sndVoice(ctx, dest, tr, pitch, t0, dur, vel) {
  const freq = sndFreq(pitch);
  const g = ctx.createGain();
  const end = sndEnv(g, t0, dur, vel * (tr.wave === 'noise' ? 0.45 : 0.3), tr.env);
  g.connect(dest);
  if (tr.wave === 'noise') {
    const src = sndNoiseSrc(ctx, t0), f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = Math.min(ctx.sampleRate / 2 - 200, Math.max(150, freq * 3));
    f.Q.value = 0.8;
    src.connect(f); f.connect(g);
    src.stop(end + 0.03);
    return;
  }
  const osc = ctx.createOscillator();
  sndSetWave(ctx, osc, tr.wave);
  osc.frequency.value = freq;
  osc.connect(g);
  if (tr.vib && tr.vib.depth > 0) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = tr.vib.rate;
    lg.gain.value = tr.vib.depth;                // in cents
    lfo.connect(lg); lg.connect(osc.detune);
    lfo.start(t0); lfo.stop(end + 0.03);
  }
  osc.start(t0);
  osc.stop(end + 0.03);
}

function sndDrum(ctx, dest, idx, t0, vel) {
  const v = Math.max(0.05, vel);
  const mk = () => { const g = ctx.createGain(); g.connect(dest); return g; };
  const decay = (g, peak, len) => { g.gain.setValueAtTime(peak, t0); g.gain.exponentialRampToValueAtTime(0.0008, t0 + len); };
  const hp = (hz) => { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hz; return f; };
  switch (idx) {
    case 0: {                                                    // kick
      const o = ctx.createOscillator(), g = mk();
      o.type = 'sine';
      o.frequency.setValueAtTime(165, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.12);
      decay(g, v * 0.95, 0.3);
      o.connect(g); o.start(t0); o.stop(t0 + 0.32);
      break;
    }
    case 1: {                                                    // snare
      const n = sndNoiseSrc(ctx, t0), f = hp(1400), g = mk();
      decay(g, v * 0.55, 0.18);
      n.connect(f); f.connect(g); n.stop(t0 + 0.2);
      const o = ctx.createOscillator(), g2 = mk();
      o.type = 'triangle';
      o.frequency.setValueAtTime(210, t0); o.frequency.exponentialRampToValueAtTime(130, t0 + 0.07);
      decay(g2, v * 0.4, 0.1);
      o.connect(g2); o.start(t0); o.stop(t0 + 0.12);
      break;
    }
    case 2: case 3: {                                            // closed / open hi-hat
      const open = idx === 3, n = sndNoiseSrc(ctx, t0), f = hp(7500), g = mk();
      decay(g, v * 0.32, open ? 0.3 : 0.05);
      n.connect(f); f.connect(g); n.stop(t0 + (open ? 0.32 : 0.07));
      break;
    }
    case 4: {                                                    // clap: three quick bursts and a tail
      const n = sndNoiseSrc(ctx, t0), f = ctx.createBiquadFilter(), g = mk();
      f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 1.1;
      [0, 0.012, 0.024].forEach((d) => { g.gain.setValueAtTime(v * 0.7, t0 + d); g.gain.exponentialRampToValueAtTime(0.05 * v, t0 + d + 0.01); });
      g.gain.setValueAtTime(v * 0.7, t0 + 0.036);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.2);
      n.connect(f); f.connect(g); n.stop(t0 + 0.22);
      break;
    }
    case 5: case 6: {                                            // low / high tom
      const hi = idx === 6, o = ctx.createOscillator(), g = mk();
      o.type = 'sine';
      o.frequency.setValueAtTime(hi ? 260 : 170, t0); o.frequency.exponentialRampToValueAtTime(hi ? 140 : 85, t0 + 0.14);
      decay(g, v * 0.8, hi ? 0.22 : 0.3);
      o.connect(g); o.start(t0); o.stop(t0 + 0.32);
      break;
    }
    default: {                                                   // crash
      const n = sndNoiseSrc(ctx, t0), f = hp(5200), g = mk();
      decay(g, v * 0.38, 1.0);
      n.connect(f); f.connect(g); n.stop(t0 + 1.05);
    }
  }
}

/* =========================================================================
   MASTER BUS: every track -> input -> (echo, reverb) -> compressor -> volume -> output
   ========================================================================= */
function sndImpulse(ctx) {
  const c = sndC(ctx);
  if (!c.ir) {
    const len = Math.floor(ctx.sampleRate * 1.5), b = ctx.createBuffer(2, len, ctx.sampleRate);
    let x = 88675123;
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
        d[i] = (((x >>> 0) / 4294967295) * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
    }
    c.ir = b;
  }
  return c.ir;
}
function sndSetParam(p, v, ctx, smooth) {
  if (smooth) p.setTargetAtTime(v, ctx.currentTime, 0.02);
  else p.value = v;
}
function sndMakeBus(ctx, m, dest) {
  const bus = { ctx: ctx, input: ctx.createGain(), comp: ctx.createDynamicsCompressor(), out: ctx.createGain(), echo: null, rev: null };
  const dry = ctx.createGain();
  bus.comp.threshold.value = -9; bus.comp.knee.value = 10; bus.comp.ratio.value = 6;
  bus.comp.attack.value = 0.004; bus.comp.release.value = 0.18;
  bus.input.connect(dry); dry.connect(bus.comp);
  bus.comp.connect(bus.out); bus.out.connect(dest);
  sndBusApply(bus, m, false);
  return bus;
}
/* (re)applies the master settings; echo and reverb are built the first time they are switched on */
function sndBusApply(bus, m, smooth) {
  const ctx = bus.ctx;
  sndSetParam(bus.out.gain, m.vol, ctx, smooth);
  if (m.echo.on && !bus.echo) {
    const d = ctx.createDelay(2), fb = ctx.createGain(), wet = ctx.createGain();
    bus.input.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(bus.comp);
    bus.echo = { d: d, fb: fb, wet: wet };
    d.delayTime.value = m.echo.time;
  }
  if (bus.echo) {
    if (smooth) bus.echo.d.delayTime.setTargetAtTime(m.echo.time, ctx.currentTime, 0.05); else bus.echo.d.delayTime.value = m.echo.time;
    sndSetParam(bus.echo.fb.gain, m.echo.on ? m.echo.fb : 0, ctx, smooth);
    sndSetParam(bus.echo.wet.gain, m.echo.on ? m.echo.mix : 0, ctx, smooth);
  }
  if (m.rev.on && !bus.rev) {
    const cv = ctx.createConvolver(), wet = ctx.createGain();
    cv.buffer = sndImpulse(ctx);
    bus.input.connect(cv); cv.connect(wet); wet.connect(bus.comp);
    bus.rev = { wet: wet };
  }
  if (bus.rev) sndSetParam(bus.rev.wet.gain, m.rev.on ? m.rev.mix : 0, ctx, smooth);
}
function sndTrackNode(ctx, bus) {
  const g = ctx.createGain();
  let pan = null;
  if (ctx.createStereoPanner) { pan = ctx.createStereoPanner(); g.connect(pan); pan.connect(bus.input); }
  else g.connect(bus.input);
  return { g: g, pan: pan };
}
function sndAnySolo(song) { return song.tracks.some((t) => t.solo); }
function sndAudible(tr, anySolo) { return !tr.mute && (!anySolo || tr.solo); }
function sndTrackApply(node, tr, anySolo, ctx, smooth) {
  sndSetParam(node.g.gain, sndAudible(tr, anySolo) ? tr.vol : 0, ctx, smooth);
  if (node.pan) sndSetParam(node.pan.pan, tr.pan, ctx, smooth);
}

/* =========================================================================
   TIMING + SCHEDULING (shared by the live player and the offline render)
   ========================================================================= */
/* start time and length in seconds of a note. gridT is the time of the plain grid position of step n.s.
   Swing pushes every odd step later by a part of a step. */
function sndNoteTiming(song, n, gridT) {
  const sd = sndStepSec(song), sw = song.swing * sd;
  const so = (n.s & 1) ? sw : 0, eo = ((n.s + n.l) & 1) ? sw : 0;
  return [gridT + so, Math.max(0.02, n.l * sd + eo - so)];
}
function sndIndex(song) {
  const m = new Map();
  song.tracks.forEach((tr, ti) => tr.notes.forEach((n) => {
    let a = m.get(n.s);
    if (!a) { a = []; m.set(n.s, a); }
    a.push([ti, n]);
  }));
  return m;
}
function sndScheduleStep(ctx, song, nodes, anySolo, list, gridT) {
  for (let i = 0; i < list.length; i++) {
    const tr = song.tracks[list[i][0]], n = list[i][1];
    if (!tr || !sndAudible(tr, anySolo)) continue;
    const node = nodes.get(tr.id);
    if (!node) continue;
    const tm = sndNoteTiming(song, n, gridT);
    if (tr.kind === 'drum') sndDrum(ctx, node.g, n.p, tm[0], n.v);
    else sndVoice(ctx, node.g, tr, n.p, tm[0], tm[1], n.v);
  }
}
function sndTailSeconds(song) {
  const m = song.master;
  let t = 0.5;
  const rel = song.tracks.reduce((a, tr) => Math.max(a, tr.env.r), 0);
  t = Math.max(t, rel + 0.1);
  if (m.echo.on) t = Math.max(t, Math.min(4, m.echo.time * (m.echo.fb > 0.01 ? Math.ceil(Math.log(0.01) / Math.log(m.echo.fb)) : 1)));
  if (m.rev.on) t = Math.max(t, 1.7);
  return t;
}

/* =========================================================================
   LIVE PLAYER (look-ahead scheduler: a timer fills the next ~0.14 s of music)
   ========================================================================= */
const sndEng = {
  ctx: null, bus: null, analyser: null, nodes: new Map(), prev: null, click: null,
  playing: false, ending: false, endT: 0, timer: 0, step: 0, nextT: 0, posLog: [],
  getSong: null, loop: false, loopA: 0, loopB: 0, metro: false, onEnd: null,
  ver: 0, idx: null, idxVer: -1, sfx: null
};
function sndGetCtx() {
  if (!sndEng.ctx) {
    const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AC) return null;
    try { sndEng.ctx = new AC({ latencyHint: 'interactive' }); }
    catch (e) { try { sndEng.ctx = new AC(); } catch (e2) { return null; } }
  }
  if (sndEng.ctx.state === 'suspended') sndEng.ctx.resume().catch(() => { /* needs a tap first */ });
  return sndEng.ctx;
}
/* call after any edit to the song while it plays */
function sndTouch() { sndEng.ver++; }

function sndSyncNodes(song) {
  const e = sndEng, anySolo = sndAnySolo(song), ids = new Set();
  song.tracks.forEach((tr) => {
    ids.add(tr.id);
    let node = e.nodes.get(tr.id);
    if (!node) { node = sndTrackNode(e.ctx, e.bus); e.nodes.set(tr.id, node); sndTrackApply(node, tr, anySolo, e.ctx, false); }
  });
  e.nodes.forEach((node, id) => { if (!ids.has(id)) { try { node.g.disconnect(); } catch (x) { /* gone */ } e.nodes.delete(id); } });
}
/* applies volume / pan / mute / solo / master changes to the running song */
function sndLiveApply() {
  const e = sndEng;
  if (!e.playing || !e.getSong) return;
  const song = e.getSong(), anySolo = sndAnySolo(song);
  sndSyncNodes(song);
  song.tracks.forEach((tr) => sndTrackApply(e.nodes.get(tr.id), tr, anySolo, e.ctx, true));
  sndBusApply(e.bus, song.master, true);
}

function sndClick(ctx, t, accent) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'square'; o.frequency.value = accent ? 1760 : 1100;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  o.connect(g); g.connect(ctx.destination);
  o.start(t); o.stop(t + 0.05);
}

function sndTick() {
  const e = sndEng;
  if (!e.playing) return;
  const ctx = e.ctx, song = e.getSong();
  sndSyncNodes(song);
  if (e.idxVer !== e.ver || !e.idx) { e.idx = sndIndex(song); e.idxVer = e.ver; }
  const total = sndTotalSteps(song), sd = sndStepSec(song), anySolo = sndAnySolo(song);
  const loopOn = e.loop && e.loopB > e.loopA;
  const a = loopOn ? Math.min(e.loopA, total - 1) : 0, b = loopOn ? Math.min(e.loopB, total) : total;
  while (!e.ending && e.nextT < ctx.currentTime + 0.14) {
    if (e.step >= b) {
      if (loopOn && a < b) e.step = a;
      else {
        e.ending = true;
        const m = song.master;
        e.endT = e.nextT + 0.4 + (m.echo.on ? Math.min(2.5, m.echo.time * 5) : 0) + (m.rev.on ? 1.2 : 0);
        break;
      }
    }
    const list = e.idx.get(e.step);
    if (list) sndScheduleStep(ctx, song, e.nodes, anySolo, list, e.nextT);
    if (e.metro && e.step % song.spb === 0) sndClick(ctx, e.nextT, e.step % (song.spb * song.bpb) === 0);
    e.posLog.push({ t: e.nextT, s: e.step, sd: sd });
    e.nextT += sd;
    e.step++;
  }
  if (e.ending && ctx.currentTime >= e.endT) {
    const cb = e.onEnd;
    sndStop();
    if (cb) cb();
  }
}

/* o: { getSong, from, loop, loopA, loopB, metro, onEnd }. Returns false when the browser has no Web Audio. */
function sndPlay(o) {
  sndStop();
  const ctx = sndGetCtx();
  if (!ctx) return false;
  const e = sndEng;
  e.getSong = o.getSong; e.loop = !!o.loop; e.loopA = o.loopA || 0; e.loopB = o.loopB || 0; e.metro = !!o.metro; e.onEnd = o.onEnd || null;
  const song = e.getSong();
  e.analyser = ctx.createAnalyser();
  e.analyser.fftSize = 1024;
  e.analyser.connect(ctx.destination);
  e.bus = sndMakeBus(ctx, song.master, e.analyser);
  e.nodes = new Map();
  e.ending = false; e.posLog = []; e.idx = null;
  e.step = Math.max(0, Math.min(o.from || 0, sndTotalSteps(song) - 1));
  e.nextT = ctx.currentTime + 0.06;
  e.playing = true;
  sndSyncNodes(song);
  sndTick();
  e.timer = setInterval(sndTick, 25);
  return true;
}
function sndStop() {
  const e = sndEng;
  if (e.timer) { clearInterval(e.timer); e.timer = 0; }
  const was = e.playing;
  e.playing = false; e.ending = false; e.posLog = [];
  if (was && e.bus && e.ctx) {
    const bus = e.bus, an = e.analyser, ctx = e.ctx;
    try { bus.out.gain.cancelScheduledValues(ctx.currentTime); bus.out.gain.setTargetAtTime(0, ctx.currentTime, 0.015); } catch (x) { /* ignore */ }
    setTimeout(() => { try { bus.out.disconnect(); an.disconnect(); } catch (x) { /* already gone */ } }, 220);
  }
  e.bus = null; e.analyser = null; e.nodes = new Map();
}
/* where the playhead is, in steps (fractional), or null when nothing plays */
function sndPosition() {
  const e = sndEng;
  if (!e.playing || !e.ctx) return null;
  const now = e.ctx.currentTime - (e.ctx.outputLatency || e.ctx.baseLatency || 0);
  const L = e.posLog;
  if (!L.length) return e.step;
  let k = -1;
  for (let i = 0; i < L.length; i++) { if (L[i].t <= now) k = i; else break; }
  if (k > 1) L.splice(0, k - 1);
  if (k < 0) return L[0].s;
  const it = L[k < 2 ? k : 1];
  return it.s + Math.min(1, Math.max(0, (now - it.t) / it.sd));
}
function sndScopeData(arr) {
  const e = sndEng;
  if (!e.playing || !e.analyser) return false;
  e.analyser.getByteTimeDomainData(arr);
  return true;
}

/* short sounds: a piano key, a drum pad (they do not go through the song's master bus) */
function sndPreviewNote(tr, pitch, vel) {
  const ctx = sndGetCtx();
  if (!ctx) return;
  const e = sndEng;
  if (!e.prev || e.prev.ctx !== ctx) {
    const g = ctx.createGain(), c = ctx.createDynamicsCompressor();
    g.connect(c); c.connect(ctx.destination);
    e.prev = { ctx: ctx, g: g };
  }
  e.prev.g.gain.value = tr.vol;
  const t = ctx.currentTime + 0.01;
  if (tr.kind === 'drum') sndDrum(ctx, e.prev.g, pitch, t, vel || 0.9);
  else sndVoice(ctx, e.prev.g, tr, pitch, t, 0.28, vel || 0.9);
}
/* plays a mono Float32Array (a sound effect) */
function sndPlaySamples(data, sr) {
  const ctx = sndGetCtx();
  if (!ctx || !data.length) return false;
  const e = sndEng;
  if (e.sfx) { try { e.sfx.stop(); } catch (x) { /* ended */ } }
  const buf = ctx.createBuffer(1, data.length, sr);
  buf.getChannelData(0).set(data);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
  e.sfx = src;
  return true;
}
function sndStopSamples() {
  if (sndEng.sfx) { try { sndEng.sfx.stop(); } catch (x) { /* ended */ } sndEng.sfx = null; }
}

/* =========================================================================
   OFFLINE RENDER (the file export)
   ========================================================================= */
function sndSongSeconds(song) { return sndStepSec(song) * sndTotalSteps(song) + (song.swing ? song.swing * sndStepSec(song) : 0); }

/* o: { sr }. Resolves to { chans: [Float32Array L, R], sr, loopLen } where loopLen is the length of the song itself in samples. */
async function sndRenderSong(song, o) {
  const OAC = typeof window !== 'undefined' ? (window.OfflineAudioContext || window.webkitOfflineAudioContext) : null;
  if (!OAC) throw new Error('no-offline-audio');
  const sr = o.sr || 44100;
  const dur = sndSongSeconds(song);
  if (dur > SND_MAX_SECONDS) throw new Error('song-too-long');
  const tail = sndTailSeconds(song);
  const len = Math.ceil((dur + tail) * sr);
  const ctx = new OAC(2, len, sr);
  const bus = sndMakeBus(ctx, song.master, ctx.destination);
  const nodes = new Map(), anySolo = sndAnySolo(song);
  song.tracks.forEach((tr) => { const n = sndTrackNode(ctx, bus); sndTrackApply(n, tr, anySolo, ctx, false); nodes.set(tr.id, n); });
  const idx = sndIndex(song), sd = sndStepSec(song), total = sndTotalSteps(song);
  for (let s = 0; s < total; s++) {
    const list = idx.get(s);
    if (list) sndScheduleStep(ctx, song, nodes, anySolo, list, s * sd);
  }
  const buf = await ctx.startRendering();
  return { chans: [new Float32Array(buf.getChannelData(0)), new Float32Array(buf.getChannelData(1))], sr: sr, loopLen: Math.min(len, Math.round(dur * sr)) };
}

/* Folds the tail (echo, reverb, release) back onto the start so the file loops without a gap, or cuts it. */
function sndFoldLoop(chans, loopLen) {
  return chans.map((c) => {
    const out = new Float32Array(loopLen);
    for (let i = 0; i < c.length; i++) out[i % loopLen] += c[i];
    return out;
  });
}
function sndPeak(chans) {
  let p = 0;
  chans.forEach((c) => { for (let i = 0; i < c.length; i++) { const a = c[i] < 0 ? -c[i] : c[i]; if (a > p) p = a; } });
  return p;
}
function sndMono(chans) {
  if (chans.length < 2) return chans;
  const n = chans[0].length, out = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < chans.length; c++) s += chans[c][i]; out[i] = s / chans.length; }
  return [out];
}
function sndResample(data, from, to) {
  if (from === to) return data;
  const n = Math.max(1, Math.round(data.length * to / from)), out = new Float32Array(n), k = from / to;
  for (let i = 0; i < n; i++) {
    const x = i * k, i0 = Math.floor(x), f = x - i0;
    const a = data[Math.min(i0, data.length - 1)], b = data[Math.min(i0 + 1, data.length - 1)];
    out[i] = a + (b - a) * f;
  }
  return out;
}

/* =========================================================================
   WAV WRITER (PCM, 16 or 8 bit, any number of channels)
   ========================================================================= */
function sndWav(chans, sr, bits) {
  const n = chans[0].length, nc = chans.length, bp = bits === 8 ? 1 : 2, dataLen = n * nc * bp;
  const buf = new ArrayBuffer(44 + dataLen), dv = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); dv.setUint32(4, 36 + dataLen, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, nc, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * nc * bp, true); dv.setUint16(32, nc * bp, true); dv.setUint16(34, bp * 8, true);
  str(36, 'data'); dv.setUint32(40, dataLen, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nc; c++) {
      let v = chans[c][i];
      v = v > 1 ? 1 : v < -1 ? -1 : v;
      if (bp === 1) { dv.setUint8(o, Math.round(v * 127) + 128); o += 1; }
      else { dv.setInt16(o, Math.round(v * 32767), true); o += 2; }
    }
  }
  return new Uint8Array(buf);
}

/* =========================================================================
   MIDI WRITER (Standard MIDI File, format 1, 480 ticks per beat)
   One tempo track, then one track per song track. Drums go on channel 10. Swing is not written.
   ========================================================================= */
function sndVlq(n) {
  const b = [n & 0x7f];
  while ((n >>= 7) > 0) b.unshift((n & 0x7f) | 0x80);
  return b;
}
function sndMidi(song, title) {
  const PPQ = 480, stT = PPQ / song.spb, endTick = sndTotalSteps(song) * stT;
  const enc = new TextEncoder();
  const push = (a, b) => { for (let i = 0; i < b.length; i++) a.push(b[i]); };
  const meta = (type, data) => { const a = [0xff, type]; push(a, sndVlq(data.length)); push(a, data); return a; };
  const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const chunk = (tag, bytes) => { const a = [tag.charCodeAt(0), tag.charCodeAt(1), tag.charCodeAt(2), tag.charCodeAt(3)]; push(a, be32(bytes.length)); push(a, bytes); return a; };
  const pack = (events) => {
    events.sort((a, b) => a.t - b.t || a.o - b.o);
    const out = [];
    let last = 0;
    events.forEach((ev) => { push(out, sndVlq(ev.t - last)); push(out, ev.b); last = ev.t; });
    push(out, sndVlq(Math.max(0, endTick - last)));
    out.push(0xff, 0x2f, 0x00);
    return out;
  };
  const us = Math.round(60000000 / song.bpm);
  const tempo = [
    { t: 0, o: 0, b: meta(0x03, Array.from(enc.encode(sndText(title, 60) || 'Song'))) },
    { t: 0, o: 0, b: meta(0x51, [(us >> 16) & 255, (us >> 8) & 255, us & 255]) },
    { t: 0, o: 0, b: meta(0x58, [song.bpb, 2, 24, 8]) }
  ];
  const tracks = [chunk('MTrk', pack(tempo))];
  let nextCh = 0;
  song.tracks.forEach((tr) => {
    const drum = tr.kind === 'drum';
    let ch = 9;
    if (!drum) { if (nextCh === 9) nextCh++; ch = nextCh++ & 15; }
    const ev = [{ t: 0, o: 0, b: meta(0x03, Array.from(enc.encode(tr.name))) }];
    if (!drum) ev.push({ t: 0, o: 0, b: [0xc0 | ch, SND_PROGRAM[tr.wave] || 80] });
    ev.push({ t: 0, o: 0, b: [0xb0 | ch, 7, Math.round(tr.vol * 127)] });
    ev.push({ t: 0, o: 0, b: [0xb0 | ch, 10, Math.round((tr.pan + 1) / 2 * 127)] });
    tr.notes.forEach((n) => {
      const key = drum ? SND_DRUM_MIDI[n.p] : n.p, vel = Math.max(1, Math.min(127, Math.round(n.v * 127)));
      ev.push({ t: Math.round(n.s * stT), o: 2, b: [0x90 | ch, key, vel] });
      ev.push({ t: Math.round((n.s + n.l) * stT), o: 1, b: [0x80 | ch, key, 0] });
    });
    tracks.push(chunk('MTrk', pack(ev)));
  });
  const head = chunk('MThd', [0, 1, (tracks.length >> 8) & 255, tracks.length & 255, (PPQ >> 8) & 255, PPQ & 255]);
  const all = head.slice();
  tracks.forEach((t) => push(all, t));
  return new Uint8Array(all);
}

/* =========================================================================
   MIDI READER (becomes a song; notes are rounded to a 16th-note grid)
   ========================================================================= */
function sndDrumRow(k) {
  if (k === 35 || k === 36) return 0;
  if (k === 37 || k === 38 || k === 40) return 1;
  if (k === 42 || k === 44) return 2;
  if (k === 46) return 3;
  if (k === 39) return 4;
  if (k === 41 || k === 43 || k === 45) return 5;
  if (k === 47 || k === 48 || k === 50) return 6;
  if (k === 49 || k === 51 || k === 52 || k === 55 || k === 57 || k === 59) return 7;
  return -1;
}
function sndFromMidi(bytes) {
  const len = bytes.length, dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
  if (len < 14 || tag(0) !== 'MThd') throw new Error('midi-header');
  const hl = dv.getUint32(4), ntrks = dv.getUint16(10), div = dv.getUint16(12);
  if (!div || (div & 0x8000)) throw new Error('midi-division');
  const dec = new TextDecoder('utf-8');
  const lanes = new Map();
  let p = 8 + hl, seen = 0, tempo = 0, nn = 4, dd = 4, haveSig = false, tempoCount = 0;
  while (p + 8 <= len && seen < ntrks && seen < 64) {
    const ct = tag(p), cl = dv.getUint32(p + 4);
    let q = p + 8;
    const end = Math.min(len, q + cl);
    p = q + cl;
    if (ct !== 'MTrk') continue;
    seen++;
    const ti = seen;
    let tick = 0, run = 0, tname = '';
    const open = new Map();
    const readV = () => {
      let v = 0, c, k = 0;
      do { if (q >= end) throw new Error('midi-trunc'); c = bytes[q++]; v = (v * 128) + (c & 0x7f); k++; } while ((c & 0x80) && k < 5);
      return v;
    };
    const addNote = (ch, pitch, t0, t1, vel) => {
      const key = ti + ':' + ch;
      let lane = lanes.get(key);
      if (!lane) { lane = { ch: ch, name: tname, notes: [] }; lanes.set(key, lane); }
      lane.notes.push([t0, Math.max(t1, t0 + 1), pitch, vel]);
    };
    try {
      while (q < end) {
        tick += readV();
        let st = bytes[q];
        if (st >= 0x80) q++;
        else { st = run; if (!st) throw new Error('midi-run'); }
        if (st === 0xff) {
          run = 0;
          const type = bytes[q++], ml = readV(), ds = q;
          q += ml;
          if (q > end) throw new Error('midi-trunc');
          if (type === 0x2f) break;
          if (type === 0x51 && ml === 3) { tempoCount++; if (!tempo) tempo = (bytes[ds] << 16) | (bytes[ds + 1] << 8) | bytes[ds + 2]; }
          else if (type === 0x58 && ml >= 2 && !haveSig) { nn = bytes[ds] || 4; dd = 1 << Math.min(6, bytes[ds + 1]); haveSig = true; }
          else if (type === 0x03 && !tname) tname = dec.decode(bytes.subarray(ds, ds + ml));
          continue;
        }
        if (st === 0xf0 || st === 0xf7) { run = 0; const ml = readV(); q += ml; continue; }
        run = st;
        const hi = st & 0xf0, ch = st & 0x0f;
        const d1 = bytes[q++], d2 = (hi === 0xc0 || hi === 0xd0) ? 0 : bytes[q++];
        const k = ch + ':' + d1;
        if (hi === 0x90 && d2 > 0) {
          const o = open.get(k);
          if (o) addNote(ch, d1, o[0], tick, o[1]);
          open.set(k, [tick, d2]);
        } else if (hi === 0x80 || (hi === 0x90 && d2 === 0)) {
          const o = open.get(k);
          if (o) { open.delete(k); addNote(ch, d1, o[0], tick, o[1]); }
        }
      }
    } catch (e) { if (!/^midi-/.test(String(e.message))) throw e; /* a damaged tail: keep what was read */ }
    open.forEach((o, k) => addNote(+k.split(':')[0], +k.split(':')[1], o[0], tick, o[1]));
  }
  const all = Array.from(lanes.values()).filter((l) => l.notes.length);
  if (!all.length) throw new Error('midi-empty');
  const song = sndNewSong();
  song.bpm = tempo ? sndInt(60000000 / tempo, 30, 300, 120) : 120;
  song.spb = 4;
  song.bpb = sndInt(Math.round(nn * 4 / dd), 2, 8, 4);
  const kept = all.slice(0, SND_MAX_TRACKS), stepT = div / 4;
  let lastEnd = 0;
  kept.forEach((l) => l.notes.forEach((n) => { const e = Math.round(n[1] / stepT); if (e > lastEnd) lastEnd = e; }));
  const maxBars = sndMaxBars(song.bpb, 4), want = Math.max(1, Math.ceil(lastEnd / (song.bpb * 4)));
  song.bars = Math.min(want, maxBars);
  const total = sndTotalSteps(song);
  let dropped = 0, shifted = 0, budget = SND_MAX_NOTES, wi = 0;
  const waves = ['square', 'pulse25', 'triangle', 'saw', 'pulse125', 'sine'];
  song.tracks = kept.map((l, i) => {
    const drum = l.ch === 9, tr = sndNewTrack(drum ? 'drum' : 'synth', i + 1);
    tr.name = drum && !/drum|perc/i.test(l.name) ? 'Drums' : sndText(l.name, 24) || (drum ? 'Drums' : 'Track ' + (i + 1));
    if (!drum) tr.wave = /bass/i.test(l.name) ? 'triangle' : waves[wi++ % waves.length];
    tr.vol = drum ? 0.85 : 0.7;
    l.notes.sort((a, b) => a[0] - b[0]);
    l.notes.forEach((n) => {
      const s = Math.round(n[0] / stepT);
      if (s >= total || budget <= 0) { dropped++; return; }
      const e = Math.max(s + 1, Math.round(n[1] / stepT));
      let pitch = n[2];
      if (drum) { pitch = sndDrumRow(pitch); if (pitch < 0) { dropped++; return; } }
      else { const o = pitch; while (pitch < SND_LO) pitch += 12; while (pitch > SND_HI) pitch -= 12; if (pitch !== o) shifted++; }
      tr.notes.push({ s: s, l: Math.min(e - s, total - s), p: pitch, v: Math.round(sndClamp(n[3] / 127, 0.05, 1, 0.8) * 100) / 100 });
      budget--;
    });
    return tr;
  });
  const nameCount = new Map();
  song.tracks.forEach((t) => {                                    // same name twice (several channels in one MIDI track): number them
    const k = t.name.toLowerCase(), c = (nameCount.get(k) || 0) + 1;
    nameCount.set(k, c);
    if (c > 1) t.name = (t.name.slice(0, 20) + ' ' + c).slice(0, 24);
  });
  return {
    song: song,
    info: { tracks: song.tracks.length, notes: sndCountNotes(song), dropped: dropped, shifted: shifted, droppedTracks: all.length - kept.length, cutBars: want > maxBars, tempoChanges: tempoCount > 1 }
  };
}

/* =========================================================================
   SFX GENERATOR (sfxr style): a handful of numbers become a short sound, made one sample at a time.
   Rewritten for this app; the sound model and the .sfxr file layout follow the well-known sfxr tool.
   ========================================================================= */
const SFX_RATE = 44100;
const SFX_WAVES = ['square', 'saw', 'sine', 'noise'];
/* [id, group, min, max, default] */
const SFX_DEFS = [
  ['attack', 'env', 0, 1, 0], ['sustain', 'env', 0, 1, 0.3], ['punch', 'env', 0, 1, 0], ['decay', 'env', 0, 1, 0.4],
  ['freq', 'pitch', 0, 1, 0.3], ['limit', 'pitch', 0, 1, 0], ['slide', 'pitch', -1, 1, 0], ['dslide', 'pitch', -1, 1, 0],
  ['vibDepth', 'vib', 0, 1, 0], ['vibSpeed', 'vib', 0, 1, 0],
  ['arpMod', 'arp', -1, 1, 0], ['arpSpeed', 'arp', 0, 1, 0],
  ['duty', 'duty', 0, 1, 0], ['dutyRamp', 'duty', -1, 1, 0],
  ['repeat', 'repeat', 0, 1, 0],
  ['lpf', 'filter', 0, 1, 1], ['lpfRamp', 'filter', -1, 1, 0], ['lpfRes', 'filter', 0, 1, 0], ['hpf', 'filter', 0, 1, 0], ['hpfRamp', 'filter', -1, 1, 0],
  ['phaOff', 'phaser', -1, 1, 0], ['phaRamp', 'phaser', -1, 1, 0]
];
const SFX_GROUPS = ['env', 'pitch', 'vib', 'arp', 'duty', 'repeat', 'filter', 'phaser'];

function sfxDefault() {
  const p = { wave: 0, vol: 0.5, norm: true, rev: false };
  SFX_DEFS.forEach((d) => { p[d[0]] = d[4]; });
  return p;
}
function sfxClean(raw) {
  const p = sfxDefault();
  if (!raw || typeof raw !== 'object') return p;
  p.wave = sndInt(raw.wave, 0, 3, 0);
  p.vol = sndClamp(raw.vol, 0, 1, 0.5);
  p.norm = raw.norm === undefined ? true : !!raw.norm;
  p.rev = !!raw.rev;
  SFX_DEFS.forEach((d) => { p[d[0]] = Math.round(sndClamp(raw[d[0]], d[2], d[3], d[4]) * 1000) / 1000; });
  return p;
}

/* the sound itself: mono Float32Array at 44100 Hz (before normalising / reversing) */
function sfxSynth(p) {
  const pw = Math.pow;
  const envLen = [Math.floor(p.attack * p.attack * 100000), Math.floor(p.sustain * p.sustain * 100000), Math.floor(p.decay * p.decay * 100000)];
  const out = new Float32Array(Math.min(SFX_RATE * 8, envLen[0] + envLen[1] + envLen[2] + 16));
  const noiseBuf = new Float32Array(32), phaserBuf = new Float32Array(1024);
  let phase = 0, fperiod = 0, period = 0, fmaxperiod = 0, fslide = 0, fdslide = 0, squareDuty = 0, squareSlide = 0, arpMod = 1, arpTime = 0, arpLimit = 0;
  let fltp = 0, fltdp = 0, fltw = 0, fltwD = 1, fltdmp = 0, fltphp = 0, flthp = 0, flthpD = 1, vibPhase = 0, vibSpeed = 0, vibAmp = 0;
  let envVol = 0, envStage = 0, envTime = 0, fphase = 0, fdphase = 0, iphase = 0, ipp = 0, repTime = 0, repLimit = 0;
  const fillNoise = () => { for (let i = 0; i < 32; i++) noiseBuf[i] = Math.random() * 2 - 1; };
  function reset(restart) {
    if (!restart) phase = 0;
    fperiod = 100 / (p.freq * p.freq + 0.001);
    period = Math.floor(fperiod);
    fmaxperiod = 100 / (p.limit * p.limit + 0.001);
    fslide = 1 - pw(p.slide, 3) * 0.01;
    fdslide = -pw(p.dslide, 3) * 0.000001;
    squareDuty = 0.5 - p.duty * 0.5;
    squareSlide = -p.dutyRamp * 0.00005;
    arpMod = p.arpMod >= 0 ? 1 - pw(p.arpMod, 2) * 0.9 : 1 + pw(p.arpMod, 2) * 10;
    arpTime = 0;
    arpLimit = p.arpSpeed === 1 ? 0 : Math.floor(pw(1 - p.arpSpeed, 2) * 20000 + 32);
    if (!restart) {
      fltp = 0; fltdp = 0;
      fltw = pw(p.lpf, 3) * 0.1;
      fltwD = 1 + p.lpfRamp * 0.0001;
      fltdmp = Math.min(0.8, 5 / (1 + pw(p.lpfRes, 2) * 20) * (0.01 + fltw));
      fltphp = 0;
      flthp = pw(p.hpf, 2) * 0.1;
      flthpD = 1 + p.hpfRamp * 0.0003;
      vibPhase = 0; vibSpeed = pw(p.vibSpeed, 2) * 0.01; vibAmp = p.vibDepth * 0.5;
      envVol = 0; envStage = 0; envTime = 0;
      fphase = pw(p.phaOff, 2) * 1020; if (p.phaOff < 0) fphase = -fphase;
      fdphase = pw(p.phaRamp, 2); if (p.phaRamp < 0) fdphase = -fdphase;
      iphase = Math.abs(Math.trunc(fphase));
      ipp = 0; phaserBuf.fill(0); fillNoise();
      repTime = 0;
      repLimit = p.repeat === 0 ? 0 : Math.floor(pw(1 - p.repeat, 2) * 20000 + 32);
    }
  }
  reset(false);
  let n = 0;
  while (n < out.length) {
    repTime++;
    if (repLimit !== 0 && repTime >= repLimit) { repTime = 0; reset(true); }
    arpTime++;
    if (arpLimit !== 0 && arpTime >= arpLimit) { arpLimit = 0; fperiod *= arpMod; }
    fslide += fdslide;
    fperiod *= fslide;
    if (fperiod > fmaxperiod) {
      fperiod = fmaxperiod;
      if (p.limit > 0) break;
    }
    let rf = fperiod;
    if (vibAmp > 0) { vibPhase += vibSpeed; rf = fperiod * (1 + Math.sin(vibPhase) * vibAmp); }
    period = Math.floor(rf);
    if (period < 8) period = 8;
    squareDuty += squareSlide;
    if (squareDuty < 0) squareDuty = 0;
    if (squareDuty > 0.5) squareDuty = 0.5;
    envTime++;
    if (envTime > envLen[envStage]) {
      envTime = 0;
      envStage++;
      if (envStage === 3) break;
    }
    if (envStage === 0) envVol = envLen[0] ? envTime / envLen[0] : 1;
    else if (envStage === 1) envVol = 1 + (1 - (envLen[1] ? envTime / envLen[1] : 1)) * 2 * p.punch;
    else envVol = 1 - (envLen[2] ? envTime / envLen[2] : 1);
    fphase += fdphase;
    iphase = Math.min(1023, Math.abs(Math.trunc(fphase)));
    if (flthpD !== 0) {
      flthp *= flthpD;
      if (flthp < 0.00001) flthp = 0.00001;
      if (flthp > 0.1) flthp = 0.1;
    }
    let ss = 0;
    for (let si = 0; si < 8; si++) {                         // 8x oversampling
      let sample;
      phase++;
      if (phase >= period) { phase %= period; if (p.wave === 3) fillNoise(); }
      const fp = phase / period;
      if (p.wave === 0) sample = fp < squareDuty ? 0.5 : -0.5;
      else if (p.wave === 1) sample = 1 - fp * 2;
      else if (p.wave === 2) sample = Math.sin(fp * 2 * Math.PI);
      else sample = noiseBuf[Math.floor(phase * 32 / period)];
      const pp = fltp;
      fltw *= fltwD;
      if (fltw < 0) fltw = 0;
      if (fltw > 0.1) fltw = 0.1;
      if (p.lpf !== 1) { fltdp += (sample - fltp) * fltw; fltdp -= fltdp * fltdmp; }
      else { fltp = sample; fltdp = 0; }
      fltp += fltdp;
      fltphp += fltp - pp;
      fltphp -= fltphp * flthp;
      sample = fltphp;
      phaserBuf[ipp & 1023] = sample;
      sample += phaserBuf[(ipp - iphase + 1024) & 1023];
      ipp = (ipp + 1) & 1023;
      ss += sample * envVol;
    }
    const v = ss / 8 * 2 * p.vol;
    out[n++] = isFinite(v) ? v : 0;
  }
  return out.slice(0, Math.max(n, 1));
}
/* reverse, then normalise to 0.95 (or just keep inside -1..1) */
function sfxFinish(raw, p) {
  const out = Float32Array.from(raw);
  if (p.rev) out.reverse();
  let peak = 0;
  for (let i = 0; i < out.length; i++) { const a = out[i] < 0 ? -out[i] : out[i]; if (a > peak) peak = a; }
  const k = p.norm && peak > 1e-6 ? 0.95 / peak : 1;
  for (let i = 0; i < out.length; i++) { const v = out[i] * k; out[i] = v > 1 ? 1 : v < -1 ? -1 : v; }
  return out;
}
function sfxRender(p) { return sfxFinish(sfxSynth(p), p); }
function sfxPeak(data) { let m = 0; for (let i = 0; i < data.length; i++) { const a = data[i] < 0 ? -data[i] : data[i]; if (a > m) m = a; } return m; }

/* ready-made starting points: coin, laser, explosion, power-up, hit, jump, blip, random */
function sfxGen(kind) {
  const p = sfxDefault();
  const R = (x) => Math.random() * x, rn = (n) => Math.floor(Math.random() * (n + 1));
  switch (kind) {
    case 'coin':
      p.freq = 0.4 + R(0.5); p.attack = 0; p.sustain = R(0.1); p.decay = 0.1 + R(0.4); p.punch = 0.3 + R(0.3);
      if (rn(1)) { p.arpSpeed = 0.5 + R(0.2); p.arpMod = 0.2 + R(0.4); }
      break;
    case 'laser':
      p.wave = rn(2);
      if (p.wave === 2 && rn(1)) p.wave = rn(1);
      p.freq = 0.5 + R(0.5); p.limit = Math.max(0.2, p.freq - 0.2 - R(0.6)); p.slide = -0.15 - R(0.2);
      if (rn(2) === 0) { p.freq = 0.3 + R(0.6); p.limit = R(0.1); p.slide = -0.35 - R(0.3); }
      if (rn(1)) { p.duty = R(0.5); p.dutyRamp = R(0.2); } else { p.duty = 0.4 + R(0.5); p.dutyRamp = -R(0.7); }
      p.attack = 0; p.sustain = 0.1 + R(0.2); p.decay = R(0.4);
      if (rn(1)) p.punch = R(0.3);
      if (rn(2) === 0) { p.phaOff = R(0.2); p.phaRamp = -R(0.2); }
      if (rn(1)) p.hpf = R(0.3);
      break;
    case 'explosion':
      p.wave = 3;
      if (rn(1)) { p.freq = 0.1 + R(0.4); p.slide = -0.1 + R(0.4); } else { p.freq = 0.2 + R(0.7); p.slide = -0.2 - R(0.2); }
      p.freq *= p.freq;
      if (rn(4) === 0) p.slide = 0;
      if (rn(2) === 0) p.repeat = 0.3 + R(0.5);
      p.attack = 0; p.sustain = 0.1 + R(0.3); p.decay = R(0.5);
      if (rn(1) === 0) { p.phaOff = -0.3 + R(0.9); p.phaRamp = -R(0.3); }
      p.punch = 0.2 + R(0.6);
      if (rn(1)) { p.vibDepth = R(0.7); p.vibSpeed = R(0.6); }
      if (rn(2) === 0) { p.arpSpeed = 0.6 + R(0.3); p.arpMod = 0.8 - R(1.6); }
      break;
    case 'power':
      if (rn(1)) p.wave = 1; else p.duty = R(0.6);
      if (rn(1)) { p.freq = 0.2 + R(0.3); p.slide = 0.1 + R(0.4); p.repeat = 0.4 + R(0.4); }
      else { p.freq = 0.2 + R(0.3); p.slide = 0.05 + R(0.2); if (rn(1)) { p.vibDepth = R(0.7); p.vibSpeed = R(0.6); } }
      p.attack = 0; p.sustain = R(0.4); p.decay = 0.1 + R(0.4);
      break;
    case 'hit':
      p.wave = rn(2);
      if (p.wave === 2) p.wave = 3;
      if (p.wave === 0) p.duty = R(0.6);
      p.freq = 0.2 + R(0.6); p.slide = -0.3 - R(0.4); p.attack = 0; p.sustain = R(0.1); p.decay = 0.1 + R(0.2);
      if (rn(1)) p.hpf = R(0.3);
      break;
    case 'jump':
      p.wave = 0; p.duty = R(0.6); p.freq = 0.3 + R(0.3); p.slide = 0.1 + R(0.2);
      p.attack = 0; p.sustain = 0.1 + R(0.3); p.decay = 0.1 + R(0.2);
      if (rn(1)) p.hpf = R(0.3);
      if (rn(1)) p.lpf = 1 - R(0.6);
      break;
    case 'blip':
      p.wave = rn(1);
      if (p.wave === 0) p.duty = R(0.6);
      p.freq = 0.2 + R(0.4); p.attack = 0; p.sustain = 0.1 + R(0.1); p.decay = R(0.2); p.hpf = 0.1;
      break;
    default: {                                              // random
      const sq = (x) => x * x, cu = (x) => x * x * x, s2 = () => R(2) - 1;
      p.wave = rn(3);
      p.freq = sq(s2());
      if (rn(1)) p.freq = cu(s2()) + 0.5;
      p.limit = 0;
      p.slide = Math.pow(s2(), 5);
      if (p.freq > 0.7 && p.slide > 0.2) p.slide = -p.slide;
      if (p.freq < 0.2 && p.slide < -0.05) p.slide = -p.slide;
      p.dslide = cu(s2());
      p.duty = s2(); p.dutyRamp = cu(s2());
      p.vibDepth = cu(s2()); p.vibSpeed = s2();
      p.attack = cu(s2()); p.sustain = sq(s2()); p.decay = s2(); p.punch = sq(R(0.8));
      if (p.attack + p.sustain + p.decay < 0.2) { p.sustain += 0.2 + R(0.3); p.decay += 0.2 + R(0.3); }
      p.lpfRes = s2(); p.lpf = 1 - cu(R(1)); p.lpfRamp = cu(s2());
      if (p.lpf < 0.1 && p.lpfRamp < -0.05) p.lpfRamp = -p.lpfRamp;
      p.hpf = Math.pow(R(1), 5); p.hpfRamp = Math.pow(s2(), 5);
      p.phaOff = cu(s2()); p.phaRamp = cu(s2());
      p.repeat = s2(); p.arpSpeed = s2(); p.arpMod = s2();
    }
  }
  return sfxClean(p);
}
/* a random sound that is not silent */
function sfxRandomAudible(kind) {
  let p = sfxGen(kind);
  for (let i = 0; i < 20; i++) {
    const d = sfxSynth(p);
    if (d.length > 600 && d.length < SFX_RATE * 1.6 && sfxPeak(d) > 0.02) break;     // audible, and short like a sound effect
    p = sfxGen(kind);
  }
  return p;
}
function sfxMutate(p) {
  const q = sfxClean(p);
  SFX_DEFS.forEach((d) => {
    if (d[0] === 'limit') return;
    if (Math.random() < 0.5) q[d[0]] += Math.random() * 0.1 - 0.05;
  });
  return sfxClean(q);
}

/* ---- .sfxr file (version 102, little endian) ---- */
const SFX_FILE_ORDER = ['freq', 'limit', 'slide', 'dslide', 'duty', 'dutyRamp', 'vibDepth', 'vibSpeed', null, 'attack', 'sustain', 'decay', 'punch'];
const SFX_FILE_ORDER2 = ['lpfRes', 'lpf', 'lpfRamp', 'hpf', 'hpfRamp', 'phaOff', 'phaRamp', 'repeat', 'arpSpeed', 'arpMod'];
function sfxToFile(p) {
  const buf = new ArrayBuffer(105), dv = new DataView(buf);
  let o = 0;
  dv.setInt32(o, 102, true); o += 4;
  dv.setInt32(o, p.wave, true); o += 4;
  dv.setFloat32(o, p.vol, true); o += 4;
  SFX_FILE_ORDER.forEach((k) => { dv.setFloat32(o, k ? p[k] : 0, true); o += 4; });
  dv.setUint8(o, 1); o += 1;
  SFX_FILE_ORDER2.forEach((k) => { dv.setFloat32(o, p[k], true); o += 4; });
  return new Uint8Array(buf);
}
function sfxFromFile(bytes) {
  if (bytes.length < 12) throw new Error('sfxr-short');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let o = 0;
  const f32 = () => { if (o + 4 > bytes.length) throw new Error('sfxr-short'); const v = dv.getFloat32(o, true); o += 4; return v; };
  const ver = dv.getInt32(o, true); o += 4;
  if (ver !== 100 && ver !== 101 && ver !== 102) throw new Error('sfxr-version');
  const raw = { wave: dv.getInt32(o, true) }; o += 4;
  raw.vol = ver === 102 ? f32() : 0.5;
  raw.freq = f32(); raw.limit = f32(); raw.slide = f32();
  raw.dslide = ver >= 101 ? f32() : 0;
  raw.duty = f32(); raw.dutyRamp = f32(); raw.vibDepth = f32(); raw.vibSpeed = f32(); f32();
  raw.attack = f32(); raw.sustain = f32(); raw.decay = f32(); raw.punch = f32();
  if (o >= bytes.length) throw new Error('sfxr-short');
  o += 1;
  raw.lpfRes = f32(); raw.lpf = f32(); raw.lpfRamp = f32(); raw.hpf = f32(); raw.hpfRamp = f32();
  raw.phaOff = f32(); raw.phaRamp = f32(); raw.repeat = f32();
  if (ver >= 101) { raw.arpSpeed = f32(); raw.arpMod = f32(); }
  return sfxClean(raw);
}

/* =========================================================================
   PROJECT (what is saved: the song + the sound effects)
   ========================================================================= */
function sfxCleanBank(arr) {
  const out = [], used = new Set();
  (Array.isArray(arr) ? arr : []).slice(0, SND_MAX_SFX).forEach((it, i) => {
    if (!it || typeof it !== 'object') return;
    let id = typeof it.id === 'string' && /^[\w-]{1,40}$/.test(it.id) && !used.has(it.id) ? it.id : sndUid();
    used.add(id);
    out.push({ id: id, name: sndText(it.name, 40) || 'SFX ' + (i + 1), p: sfxClean(it.p) });
  });
  return out;
}
function sndCleanProject(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('bad project');
  const sfx = raw.sfx && typeof raw.sfx === 'object' ? raw.sfx : {};
  return { name: sndText(raw.name, 60), song: raw.song ? sndCleanSong(raw.song) : sndNewSong(), sfx: { cur: sfxClean(sfx.cur), bank: sfxCleanBank(sfx.bank) } };
}
