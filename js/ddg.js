'use strict';

/* Spritesheet Studio v2.8.1 - ddg: DDG Editor (Document Design Game)
   A rich text editor for game design documents: text size, font weight, lists, checklists, tables,
   note boxes, images. Saves in IndexedDB (same database as Save / Load) and downloads as HTML,
   Markdown, plain text or a JSON backup.
   Made by Farelfhmc - Studio Fhilion. MIT License.
   Part 6 of 6. Classic script (no modules): it shares one scope with the other scripts and must load last. */

/* ---------------------------------------------------------------- data */
const DDG_FONTS = [
  ['sans', 'Sans-serif', 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'],
  ['serif', 'Serif', 'Georgia, "Times New Roman", serif'],
  ['mono', 'Monospace', 'ui-monospace, Menlo, Consolas, monospace'],
  ['display', 'Display', 'Impact, "Arial Black", Haettenschweiler, sans-serif'],
  ['hand', 'Tulisan tangan', '"Comic Sans MS", "Chalkboard SE", "Segoe Print", cursive']
];
const DDG_WEIGHTS = [[300, 'Tipis'], [400, 'Normal'], [500, 'Sedang'], [600, 'Semi-tebal'], [700, 'Tebal'], [800, 'Ekstra tebal'], [900, 'Hitam']];
const DDG_LINES = [1.2, 1.4, 1.6, 1.8, 2, 2.4];
const DDG_KINDS = { note: ['CATATAN', 'NOTE'], idea: ['IDE', 'IDEA'], mech: ['MEKANIK', 'MECHANIC'], risk: ['RISIKO', 'RISK'], todo: ['TUGAS', 'TASK'] };
const DDG_KIND_LABEL = { note: 'Catatan', idea: 'Ide', mech: 'Mekanik', risk: 'Risiko', todo: 'Tugas' };

/* The look of the document. Used by the editor AND by the HTML export, so both always match. */
const DDG_DOC_CSS = [
  '.ddg-doc{--p-bg:#ffffff;--p-text:#1b1f23;--p-dim:#5b646e;--p-line:#cfd6dd;--p-soft:#f1f4f7;--p-accent:#2f7d32;background:var(--p-bg);color:var(--p-text);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:var(--ddg-size,16px);line-height:var(--ddg-lh,1.6);overflow-wrap:anywhere;caret-color:var(--p-text)}',
  '.ddg-doc.dark{--p-bg:#16191d;--p-text:#e6e9ec;--p-dim:#98a1aa;--p-line:#363d45;--p-soft:#20252b;--p-accent:#8fbf5a}',
  '.ddg-doc.w-wide{max-width:860px}.ddg-doc.w-narrow{max-width:640px}.ddg-doc.w-full{max-width:none}',
  '.ddg-doc p{margin:0 0 .75em}',
  '.ddg-doc h1,.ddg-doc h2,.ddg-doc h3,.ddg-doc h4{line-height:1.25;margin:1.1em 0 .45em;font-weight:700;scroll-margin-top:calc(var(--topbar-h,52px) + 120px)}',
  '.ddg-doc h1{font-size:2em;border-bottom:2px solid var(--p-line);padding-bottom:.2em}.ddg-doc h2{font-size:1.5em}.ddg-doc h3{font-size:1.2em}',
  '.ddg-doc h4{font-size:1em;text-transform:uppercase;letter-spacing:.05em;color:var(--p-dim)}',
  '.ddg-doc>:first-child{margin-top:0}',
  '.ddg-doc ul,.ddg-doc ol{margin:0 0 .75em;padding-left:1.6em}.ddg-doc li{margin:.15em 0}',
  '.ddg-doc blockquote{margin:0 0 .75em;padding:.2em 1em;border-left:3px solid var(--p-line);color:var(--p-dim)}',
  '.ddg-doc a{color:var(--p-accent);text-decoration:underline}',
  '.ddg-doc hr{border:0;border-top:2px solid var(--p-line);margin:1.2em 0}',
  '.ddg-doc img{max-width:100%;height:auto;vertical-align:middle}',
  '.ddg-doc table{border-collapse:collapse;width:100%;margin:0 0 .9em;table-layout:fixed}',
  '.ddg-doc th,.ddg-doc td{border:1px solid var(--p-line);padding:.4em .6em;vertical-align:top;min-width:2em}',
  '.ddg-doc th{background:var(--p-soft);text-align:left}',
  '.ddg-doc ul.ddg-todo{list-style:none;padding-left:.2em}',
  '.ddg-doc ul.ddg-todo>li{position:relative;padding-left:1.7em}',
  '.ddg-doc ul.ddg-todo>li::before{content:"";position:absolute;left:0;top:.28em;width:1.05em;height:1.05em;border:2px solid var(--p-dim);border-radius:.2em;background:transparent;cursor:pointer}',
  '.ddg-doc ul.ddg-todo>li[data-done="1"]::before{border-color:var(--p-accent);background:var(--p-accent) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M3.5 8.5l3 3 6-7\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'2.2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E") center/80% no-repeat}',
  '.ddg-doc ul.ddg-todo>li[data-done="1"]{color:var(--p-dim);text-decoration:line-through}',
  '.ddg-doc ul.ddg-todo ul.ddg-todo{margin:0}',
  '.ddg-callout{--c:#3b82f6;margin:0 0 .85em;padding:.55em .9em .15em;background:var(--p-soft);border-left:4px solid var(--c);border-radius:0 4px 4px 0}',
  '.ddg-callout::before{content:attr(data-tag);display:block;font-size:.72em;font-weight:700;letter-spacing:.08em;color:var(--c)}',
  '.ddg-callout[data-kind="idea"]{--c:#d99a06}.ddg-callout[data-kind="mech"]{--c:#2e9e4f}.ddg-callout[data-kind="risk"]{--c:#dc3a3a}.ddg-callout[data-kind="todo"]{--c:#8b5cf6}',
  '.ddg-doc.dark .ddg-callout[data-kind="idea"]{--c:#f2b72b}.ddg-doc.dark .ddg-callout[data-kind="note"]{--c:#6aa7ff}'
].join('\n');

/* document templates: [tag, Indonesian text, English text]. ul / todo: items joined with " | ". table: rows with ";", cells with "|". */
const DDG_TPL = [
  { id: 'gdd', name: 'GDD Lengkap', nameEn: 'Full GDD', items: [
    ['h1', 'Judul Game', 'Game Title'],
    ['p', 'Tagline satu kalimat yang menjelaskan game ini.', 'A one-sentence tagline that explains this game.'],
    ['h2', '1. Ringkasan', '1. Overview'],
    ['p', 'Genre, platform, target pemain, dan hal yang membuat game ini berbeda.', 'Genre, platform, target players, and what makes this game different.'],
    ['h2', '2. Gameplay inti', '2. Core gameplay'],
    ['p', 'Apa yang dilakukan pemain setiap detik, menit, dan sesi bermain?', 'What does the player do every second, minute, and session?'],
    ['ul', 'Aksi utama | Tujuan pemain | Kondisi menang dan kalah', 'Main actions | Player goal | Win and lose conditions'],
    ['h2', '3. Mekanik dan sistem', '3. Mechanics and systems'],
    ['c-mech', 'Jelaskan satu mekanik: aturan, input, hasil, dan batasannya.', 'Describe one mechanic: rules, input, result, and limits.'],
    ['h2', '4. Karakter dan dunia', '4. Characters and world'],
    ['p', 'Tokoh, musuh, latar cerita, dan nada game.', 'Characters, enemies, setting, and tone.'],
    ['h2', '5. Level dan progres', '5. Levels and progression'],
    ['p', 'Alur level, kurva kesulitan, hadiah, dan ekonomi game.', 'Level flow, difficulty curve, rewards, and game economy.'],
    ['h2', '6. Seni dan audio', '6. Art and audio'],
    ['p', 'Gaya visual, palet warna, ukuran sprite, musik, dan efek suara.', 'Visual style, color palette, sprite size, music, and sound effects.'],
    ['h2', '7. Teknis', '7. Technical'],
    ['p', 'Mesin game, target performa, kontrol, dan batasan teknis.', 'Game engine, performance targets, controls, and technical limits.'],
    ['h2', '8. Rencana kerja', '8. Roadmap'],
    ['todo', 'Prototype | Vertical slice | Alpha | Beta | Rilis', 'Prototype | Vertical slice | Alpha | Beta | Release'],
    ['c-risk', 'Tulis risiko terbesar dan cara mengatasinya.', 'Write the biggest risks and how to handle them.']
  ] },
  { id: 'one', name: 'Satu halaman', nameEn: 'One-page GDD', items: [
    ['h1', 'Judul Game', 'Game Title'],
    ['p', 'Tagline satu kalimat yang menjelaskan game ini.', 'A one-sentence tagline that explains this game.'],
    ['h3', 'Fantasi pemain', 'Player fantasy'],
    ['p', 'Apa yang dirasakan pemain saat bermain?', 'How should the player feel while playing?'],
    ['h3', 'Loop inti', 'Core loop'],
    ['ul', 'Aksi | Hasil | Hadiah | Ulangi', 'Action | Result | Reward | Repeat'],
    ['h3', 'Fitur utama', 'Key features'],
    ['ul', 'Fitur 1 | Fitur 2 | Fitur 3', 'Feature 1 | Feature 2 | Feature 3'],
    ['h3', 'Referensi', 'References'],
    ['p', 'Game atau karya yang menjadi inspirasi.', 'Games or works that inspire this one.'],
    ['h3', 'Target rilis', 'Release target'],
    ['p', 'Platform, perkiraan waktu, dan ukuran tim.', 'Platform, estimated time, and team size.']
  ] },
  { id: 'chr', name: 'Lembar karakter / item', nameEn: 'Character / item sheet', items: [
    ['h1', 'Nama Karakter', 'Character Name'],
    ['p', 'Peran dan ringkasan singkat.', 'Role and short summary.'],
    ['h2', 'Statistik', 'Stats'],
    ['table', 'Atribut|Nilai;HP|100;Serangan|10;Kecepatan|5', 'Attribute|Value;HP|100;Attack|10;Speed|5'],
    ['h2', 'Kemampuan', 'Abilities'],
    ['ul', 'Kemampuan 1 | Kemampuan 2', 'Ability 1 | Ability 2'],
    ['h2', 'Perilaku', 'Behavior'],
    ['p', 'Cara karakter ini bergerak, menyerang, atau bereaksi.', 'How this character moves, attacks, or reacts.'],
    ['c-note', 'Catatan seni: ukuran sprite, jumlah frame animasi, dan warna utama.', 'Art notes: sprite size, animation frame count, and main colors.']
  ] }
];

Object.assign(EN, {
  'DDG Editor': 'DDG Editor',
  'Editor teks untuk dokumen desain game (Game Design Document): atur ukuran dan ketebalan teks, daftar, tabel, dan kotak catatan. Tersimpan di browser dan bisa diunduh.': 'A text editor for game design documents: set text size and weight, lists, tables and note boxes. Saved in the browser and ready to download.',
  'Judul dokumen': 'Document title', 'Dokumen baru': 'Untitled document',
  'Baru': 'New', 'Templat\u2026': 'Template\u2026', 'Simpan salinan': 'Save a copy',
  'Isi dokumen': 'Document content',
  'Daftar isi': 'Outline', 'Belum ada judul. Pakai Judul 1\u20134 supaya muncul di sini.': 'No headings yet. Use Heading 1\u20134 and they will show up here.',
  'Alat format': 'Formatting tools',
  'Paragraf': 'Paragraph', 'Judul 1': 'Heading 1', 'Judul 2': 'Heading 2', 'Judul 3': 'Heading 3', 'Judul 4': 'Heading 4', 'Kutipan': 'Quote',
  'Jenis font': 'Font', 'Tulisan tangan': 'Handwriting', 'Ukuran teks (px)': 'Text size (px)', 'Perkecil teks': 'Smaller text', 'Perbesar teks': 'Larger text',
  'Ketebalan': 'Weight', 'Tipis': 'Light', 'Normal': 'Regular', 'Sedang': 'Medium', 'Semi-tebal': 'Semi-bold', 'Tebal': 'Bold', 'Ekstra tebal': 'Extra bold', 'Hitam': 'Black',
  'Ketebalan font (tergantung font: sebagian hanya punya Normal dan Tebal)': 'Font weight (depends on the font: some only have Regular and Bold)',
  'Jarak baris': 'Line spacing',
  'Tebal (Ctrl+B)': 'Bold (Ctrl+B)', 'Miring (Ctrl+I)': 'Italic (Ctrl+I)', 'Garis bawah (Ctrl+U)': 'Underline (Ctrl+U)', 'Coret': 'Strikethrough',
  'Warna teks': 'Text color', 'Warna sorot': 'Highlight color',
  'Rata kiri': 'Align left', 'Rata tengah': 'Align center', 'Rata kanan': 'Align right', 'Rata kiri-kanan': 'Justify',
  'Daftar poin': 'Bullet list', 'Daftar angka': 'Numbered list', 'Daftar centang': 'Checklist', 'Geser masuk': 'Indent', 'Geser keluar': 'Outdent',
  'Tautan': 'Link', 'Sisipkan gambar': 'Insert image', 'Sisipkan tabel': 'Insert table', 'Garis pemisah': 'Divider',
  'Urungkan': 'Undo', 'Ulangi': 'Redo', 'Hapus format': 'Clear formatting',
  'Kotak catatan\u2026': 'Note box\u2026', 'Catatan': 'Note', 'Ide': 'Idea', 'Mekanik': 'Mechanic', 'Risiko': 'Risk', 'Tugas': 'Task',
  '+ Baris': '+ Row', '+ Kolom': '+ Column', '\u2212 Baris': '\u2212 Row', '\u2212 Kolom': '\u2212 Column', 'Hapus tabel': 'Delete table',
  'Jenis kotak': 'Box type', 'Lepas kotak': 'Unbox', 'Hapus kotak': 'Delete box',
  'Tanpa teks yang dipilih, ukuran, ketebalan, dan jarak baris berlaku untuk paragraf tempat kursor berada. Ketuk kotak di daftar centang untuk mencentangnya.': 'With no text selected, size, weight and line spacing apply to the paragraph the cursor is in. Tap the box in a checklist to tick it.',
  'Pengaturan Dokumen': 'Document Settings', 'Ukuran teks dasar (px)': 'Base text size (px)',
  'Lebar halaman': 'Page width', 'Penuh': 'Full', 'Lebar': 'Wide', 'Sempit': 'Narrow', 'Kertas': 'Paper', 'Terang': 'Light', 'Gelap': 'Dark',
  'Pengaturan ini ikut tersimpan bersama dokumen dan ikut ke berkas unduhan.': 'These settings are saved with the document and included in downloads.',
  'Unduh & Buka': 'Download & Open',
  'Unduh sebagai berkas di perangkatmu. Cadangan (.json) bisa dibuka lagi di sini dengan utuh.': 'Download as a file on your device. A backup (.json) can be opened here again as it was.',
  'Unduh HTML': 'Download HTML', 'Unduh Markdown': 'Download Markdown', 'Unduh Teks': 'Download Text', 'Unduh Cadangan': 'Download Backup', 'Cetak / PDF': 'Print / PDF',
  'Buka dari berkas\u2026': 'Open from file\u2026',
  'Dokumen DDG Tersimpan': 'Saved DDG Documents',
  'Dokumen yang kamu simpan muncul di sini dan juga di folder Dokumen DDG di tab Simpan & Buka.': 'Documents you save appear here and in the DDG Documents folder of the Save / Load tab.',
  'Belum ada dokumen tersimpan.': 'No saved documents yet.',
  'Penyimpanan browser tidak tersedia.': 'Browser storage is not available.',
  '{w} kata \u00b7 {c} karakter \u00b7 ~{m} menit baca': '{w} words \u00b7 {c} characters \u00b7 ~{m} min read',
  'Belum disimpan': 'Not saved yet', 'Tersimpan': 'Saved', 'Tersimpan pukul {t}': 'Saved at {t}', 'Draf dipulihkan otomatis': 'Draft restored automatically',
  'Draf disimpan otomatis di browser ini.': 'The draft is autosaved in this browser.',
  'Templat dokumen': 'Document template', 'Pilih templat': 'Choose a template', 'Pakai': 'Use',
  'Sisipkan tautan': 'Insert link', 'Alamat (URL)': 'Address (URL)', 'Sisipkan': 'Insert', 'Tautan dihapus': 'Link removed',
  'Baris': 'Rows', 'Kolom': 'Columns', 'Baris pertama sebagai judul': 'First row as header',
  'Hapus tabel?': 'Delete table?', 'Gambar tidak didukung': 'That image type is not supported', 'Gagal membaca gambar': 'Could not read the image',
  'Berkas bukan dokumen DDG': 'The file is not a DDG document', 'Gagal membuka berkas': 'Could not open the file',
  'Gagal mencetak': 'Could not print', 'Dokumen dibuka': 'Document opened', 'Dokumen baru dibuat': 'New document created',
  'Dokumen kosong': 'The document is empty', 'Diunduh': 'Downloaded',
  'gambar': 'image'
});
DDG_TPL.forEach((t) => {
  EN[t.name] = t.nameEn;
  t.items.forEach((i) => { EN[i[1]] = i[2]; });
});

/* ---------------------------------------------------------------- state + small helpers */
const ddg = {
  id: null, ready: false, range: null, saving: false, restored: false,
  settings: { paper: 'light', size: 16, lh: 1.6, width: 'wide' },
  savedSig: '', savedAt: 0, uiTimer: 0, draftTimer: 0
};
const ddgEd = () => $('ddgEditor');

function ddgEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function ddgIcon(d) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; }

function ddgClosest(node, sel) {
  const el = node && node.nodeType === 3 ? node.parentElement : node;
  const c = el && el.closest ? el.closest(sel) : null;
  return c && c !== ddgEd() && ddgEd().contains(c) ? c : null;
}

function ddgSanitizeSettings(s) {
  const o = s || {};
  return {
    paper: o.paper === 'dark' ? 'dark' : 'light',
    size: Math.min(40, Math.max(10, Math.round(+o.size) || 16)),
    lh: DDG_LINES.indexOf(+o.lh) >= 0 ? +o.lh : 1.6,
    width: ['full', 'wide', 'narrow'].indexOf(o.width) >= 0 ? o.width : 'wide'
  };
}

/* ---------------------------------------------------------------- clean-up of HTML that comes from outside */
const DDG_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'DIV', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'BR', 'UL', 'OL', 'LI', 'A', 'TABLE', 'TBODY', 'THEAD', 'TR', 'TD', 'TH', 'IMG', 'HR', 'BLOCKQUOTE', 'SUB', 'SUP']);
const DDG_DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'TITLE', 'NOSCRIPT', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'SVG', 'MATH', 'TEMPLATE', 'HEAD']);
const DDG_CLASSES = ['ddg-todo', 'ddg-callout', 'ddg-table'];
const DDG_STYLE_FULL = ['font-weight', 'font-style', 'text-decoration', 'text-align', 'font-size', 'font-family', 'color', 'background-color', 'line-height', 'width', 'max-width', 'margin-left', 'text-indent', 'image-rendering'];
const DDG_STYLE_PASTE = ['font-weight', 'font-style', 'text-decoration', 'text-align'];

function ddgCleanStyle(v, paste) {
  const allow = paste ? DDG_STYLE_PASTE : DDG_STYLE_FULL, out = [];
  String(v).split(';').forEach((d) => {
    const i = d.indexOf(':');
    if (i < 0) return;
    const p = d.slice(0, i).trim().toLowerCase(), val = d.slice(i + 1).trim();
    if (allow.indexOf(p) < 0 || !val) return;
    if (/url\s*\(|expression|javascript:|@import|behavior|\\/i.test(val)) return;
    out.push(p + ': ' + val);
  });
  return out.join('; ');
}

function ddgClean(html, paste) {
  const doc = new DOMParser().parseFromString('<body>' + html, 'text/html');
  const walk = (el) => {
    Array.from(el.childNodes).forEach((c) => {
      if (c.nodeType === 8) { c.remove(); return; }
      if (c.nodeType !== 1) return;
      const t = c.tagName;
      if (DDG_DROP.has(t)) { c.remove(); return; }
      if (!DDG_TAGS.has(t)) {
        walk(c);
        while (c.firstChild) el.insertBefore(c.firstChild, c);
        c.remove();
        return;
      }
      Array.from(c.attributes).forEach((a) => {
        const n = a.name.toLowerCase(), v = a.value;
        let ok = false;
        if (n === 'class' && !paste) {
          const k = v.split(/\s+/).filter((x) => DDG_CLASSES.indexOf(x) >= 0);
          if (k.length) { c.className = k.join(' '); ok = true; }
        } else if (n === 'style') {
          const s = ddgCleanStyle(v, paste);
          if (s) { c.setAttribute('style', s); ok = true; }
        } else if (n === 'href' && t === 'A') ok = /^(https?:|mailto:|#)/i.test(v.trim());
        else if (n === 'src' && t === 'IMG') ok = /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(v.trim());
        else if (n === 'data-done' && !paste) ok = v === '1' || v === '0';
        else if (n === 'data-kind' && !paste) ok = /^[a-z]{1,8}$/.test(v);
        else if (n === 'data-tag' && !paste) ok = v.length <= 20;
        else if ((n === 'colspan' || n === 'rowspan')) ok = /^\d{1,2}$/.test(v);
        else if (n === 'alt') ok = v.length <= 200;
        if (!ok) c.removeAttribute(a.name);
      });
      if (t === 'IMG' && !c.getAttribute('src')) { c.remove(); return; }
      walk(c);
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

/* ---------------------------------------------------------------- selection + commands */
function ddgSaveSel() {
  const s = window.getSelection();
  if (s && s.rangeCount && ddgEd() && ddgEd().contains(s.anchorNode)) ddg.range = s.getRangeAt(0).cloneRange();
}
function ddgRestoreSel() {
  const e = ddgEd();
  const cur = window.getSelection();
  // the editor still has focus (keyboard shortcut): the live selection is the truth; the saved one may be a keystroke behind
  if (document.activeElement === e && cur.rangeCount && e.contains(cur.anchorNode)) { ddgSaveSel(); return; }
  e.focus({ preventScroll: true });
  if (ddg.range) {
    const s = window.getSelection();
    s.removeAllRanges();
    try { s.addRange(ddg.range); } catch (err) { /* range no longer valid */ }
  }
}
/* Chrome moves the cursor to the start of the line after list commands (and rebuilds the text nodes), so the cursor
   is remembered as "which block, how many characters in" and put back afterwards. */
const DDG_BLK = 'p,h1,h2,h3,h4,li,blockquote,td,th';
function ddgCaretMark(node, off) {
  const b = ddgClosest(node, DDG_BLK);
  if (!b) return null;
  const r = document.createRange();
  r.selectNodeContents(b);
  r.setEnd(node, off);
  return { i: Array.from(ddgEd().querySelectorAll(DDG_BLK)).indexOf(b), n: r.toString().length };
}
function ddgCaretAt(m) {
  const b = ddgEd().querySelectorAll(DDG_BLK)[m.i];
  if (!b) return null;
  const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
  let acc = 0, t, last = null;
  while ((t = w.nextNode())) {
    const len = t.nodeValue.length;
    if (acc + len >= m.n) return [t, m.n - acc];
    acc += len; last = t;
  }
  return last ? [last, last.nodeValue.length] : [b, 0];
}
function ddgKeepCaret(fn) {
  const s = window.getSelection();
  let a = null, f = null;
  if (s.rangeCount && ddgEd().contains(s.anchorNode) && ddgEd().contains(s.focusNode)) {
    a = ddgCaretMark(s.anchorNode, s.anchorOffset);
    f = ddgCaretMark(s.focusNode, s.focusOffset);
  }
  fn();
  if (a && f) {
    const pa = ddgCaretAt(a), pf = ddgCaretAt(f);
    if (pa && pf) { try { s.setBaseAndExtent(pa[0], pa[1], pf[0], pf[1]); } catch (e) { /* ignore */ } }
  }
}
function ddgExec(cmd, val) {
  ddgRestoreSel();
  try { document.execCommand('styleWithCSS', false, false); } catch (e) { /* ignore */ }
  ddgKeepCaret(() => { document.execCommand(cmd, false, val); });
  ddgSaveSel();
  ddgChanged();
  ddgSyncUI();
}

/* leaf blocks touched by the selection (or the block of the cursor) */
function ddgBlocks() {
  const s = window.getSelection();
  if (!s || !s.rangeCount) return [];
  const r = s.getRangeAt(0), sel = 'p,h1,h2,h3,h4,li,blockquote,td,th';
  const hit = Array.from(ddgEd().querySelectorAll(sel)).filter((b) => r.intersectsNode(b) && (b.tagName === 'LI' || !b.querySelector(sel)));
  if (!hit.length) { const b = ddgClosest(r.startContainer, sel); if (b) hit.push(b); }
  return hit;
}

/* size / weight / font family: over a selection, wrap it in a span; with only a cursor, style the whole block */
function ddgApplyInline(prop, value) {
  ddgRestoreSel();
  const s = window.getSelection();
  if (!s.rangeCount) return;
  if (s.isCollapsed) {
    ddgBlocks().forEach((b) => { b.style[prop] = value; });
  } else {
    try { document.execCommand('styleWithCSS', false, false); } catch (e) { /* ignore */ }
    const mk = prop === 'fontSize' ? ['fontSize', '7', 'font[size="7"]'] : ['fontName', '__ddg_' + prop, 'font[face="__ddg_' + prop + '"]'];
    document.execCommand(mk[0], false, mk[1]);
    const made = [];
    ddgEd().querySelectorAll(mk[2]).forEach((f) => {
      const sp = document.createElement('span');
      while (f.firstChild) sp.appendChild(f.firstChild);
      sp.querySelectorAll('*').forEach((x) => {
        if (x.style && x.style[prop]) x.style[prop] = '';
        if (prop === 'fontWeight' && /^(B|STRONG)$/.test(x.tagName)) { while (x.firstChild) x.parentNode.insertBefore(x.firstChild, x); x.remove(); }
      });
      sp.style[prop] = value;
      f.replaceWith(sp);
      made.push(sp);
    });
    ddgEd().querySelectorAll('span[style=""]').forEach((x) => { while (x.firstChild) x.parentNode.insertBefore(x.firstChild, x); x.remove(); });
    // replacing the nodes collapsed the selection: select the styled text again, so the next change still hits it
    const live = made.filter((x) => x.isConnected);
    if (live.length) {
      const r = document.createRange();
      r.setStartBefore(live[0]); r.setEndAfter(live[live.length - 1]);
      s.removeAllRanges(); s.addRange(r);
    }
  }
  ddgSaveSel();
  ddgChanged();
  ddgSyncUI();
}

function ddgBumpSize(d) {
  const cur = parseFloat($('ddgSize').value) || ddg.settings.size;
  const n = Math.min(120, Math.max(8, Math.round(cur + d)));
  $('ddgSize').value = n;
  ddgApplyInline('fontSize', n + 'px');
}

function ddgColor(cmd, value) {
  ddgRestoreSel();
  try { document.execCommand('styleWithCSS', false, true); } catch (e) { /* ignore */ }
  if (cmd === 'hiliteColor') { if (!document.execCommand('hiliteColor', false, value)) document.execCommand('backColor', false, value); }
  else document.execCommand(cmd, false, value);
  try { document.execCommand('styleWithCSS', false, false); } catch (e) { /* ignore */ }
  ddgSaveSel();
  ddgChanged();
}

function ddgTodo() {
  ddgRestoreSel();
  const s = window.getSelection();
  if (!s.rangeCount) return;
  let ul = ddgClosest(s.anchorNode, 'ul');
  if (ul && ul.classList.contains('ddg-todo')) {
    ul.classList.remove('ddg-todo');
    if (!ul.getAttribute('class')) ul.removeAttribute('class');
    ul.querySelectorAll('li').forEach((li) => li.removeAttribute('data-done'));
    ddgChanged(); ddgSyncUI();
    return;
  }
  if (!ul || ddgClosest(s.anchorNode, 'ol')) ddgKeepCaret(() => { document.execCommand('insertUnorderedList'); });
  const s2 = window.getSelection();
  ul = s2.rangeCount ? ddgClosest(s2.anchorNode, 'ul') : null;
  if (ul) { ul.classList.add('ddg-todo'); ul.querySelectorAll(':scope > li').forEach((li) => { if (!li.hasAttribute('data-done')) li.setAttribute('data-done', '0'); }); }
  ddgSaveSel(); ddgChanged(); ddgSyncUI();
}

async function ddgLink() {
  ddgRestoreSel();
  const s = window.getSelection();
  if (s.rangeCount && ddgClosest(s.anchorNode, 'a')) { ddgExec('unlink'); showToast('Tautan dihapus'); return; }
  const r = await ssDialog({
    title: 'Sisipkan tautan', fields: [{ kind: 'text', label: 'Alamat (URL)', value: 'https://', max: 600 }],
    buttons: [{ label: 'Batal', value: 'no' }, { label: 'Sisipkan', value: 'ok', primary: true }]
  });
  if (!r || r.v !== 'ok') return;
  let u = r.f[0].trim();
  if (!u || u === 'https://') return;
  if (!/^(https?:|mailto:|#)/i.test(u)) u = /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(u) ? 'mailto:' + u : 'https://' + u.replace(/^\/+/, '');
  ddgRestoreSel();
  const s2 = window.getSelection();
  if (!s2.rangeCount || s2.isCollapsed) document.execCommand('insertHTML', false, '<a href="' + ddgEsc(u) + '">' + ddgEsc(u) + '</a>');
  else document.execCommand('createLink', false, u);
  ddgSaveSel(); ddgChanged();
}

/* ---------------------------------------------------------------- tables, note boxes, images */
function ddgTableHtml(grid, header, fresh) {
  return '<table class="ddg-table"' + (fresh ? ' data-new="1"' : '') + '>' + grid.map((row, i) => '<tr>' + row.map((c) => {
    const tag = header && i === 0 ? 'th' : 'td';
    return '<' + tag + '>' + (c ? ddgEsc(c) : '<br>') + '</' + tag + '>';
  }).join('') + '</tr>').join('') + '</table>';
}

async function ddgTableDialog() {
  const nums = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push([String(i), String(i)]); return o; };
  const r = await ssDialog({
    title: 'Sisipkan tabel',
    fields: [
      { kind: 'select', label: 'Baris', options: nums(1, 20), value: '4' },
      { kind: 'select', label: 'Kolom', options: nums(1, 8), value: '3' },
      { kind: 'check', label: 'Baris pertama sebagai judul', value: true }
    ],
    buttons: [{ label: 'Batal', value: 'no' }, { label: 'Sisipkan', value: 'ok', primary: true }]
  });
  if (!r || r.v !== 'ok') return;
  const rows = +r.f[0], cols = +r.f[1];
  const grid = [];
  for (let i = 0; i < rows; i++) grid.push(new Array(cols).fill(''));
  ddgRestoreSel();
  document.execCommand('insertHTML', false, ddgTableHtml(grid, !!r.f[2], true) + '<p><br></p>');
  const tb = ddgEd().querySelector('table[data-new]');
  if (tb) { tb.removeAttribute('data-new'); const c = tb.querySelector('th,td'); if (c) ddgCaretIn(c, false); }
  ddgChanged(); ddgSyncUI();
}

function ddgCell() {
  const s = window.getSelection();
  return s && s.rangeCount ? ddgClosest(s.anchorNode, 'td,th') : null;
}
function ddgTableOp(op) {
  const cell = ddgCell();
  if (!cell) return;
  const tr = cell.parentElement, table = cell.closest('table'), idx = cell.cellIndex, ri = tr.rowIndex;
  if (op === 'addRow') {
    const n = document.createElement('tr');
    for (let i = 0; i < tr.cells.length; i++) { const td = document.createElement('td'); td.innerHTML = '<br>'; n.appendChild(td); }
    tr.after(n);
  } else if (op === 'addCol') {
    Array.from(table.rows).forEach((row) => {
      const ref = row.cells[idx] || row.cells[row.cells.length - 1];
      const c = document.createElement(ref && ref.tagName === 'TH' ? 'th' : 'td');
      c.innerHTML = '<br>';
      if (ref) ref.after(c); else row.appendChild(c);
    });
  } else if (op === 'delRow') {
    tr.remove();
    if (!table.rows.length) table.remove();
  } else if (op === 'delCol') {
    Array.from(table.rows).forEach((row) => { if (row.cells[idx]) row.cells[idx].remove(); });
    if (!table.rows.length || !table.rows[0].cells.length) table.remove();
  } else if (op === 'delTable') {
    table.remove();
  }
  if (table.isConnected && table.rows.length && (op === 'delRow' || op === 'delCol')) {
    const row = table.rows[Math.min(ri, table.rows.length - 1)];
    const c = row.cells[Math.min(idx, row.cells.length - 1)];
    if (c) ddgCaretIn(c, false);
  }
  ddgEnsureP();
  ddgChanged(); ddgSyncUI();
}

function ddgCaretIn(el, atEnd) {
  const r = document.createRange();
  if (atEnd && el.textContent) { r.selectNodeContents(el); r.collapse(false); } else { r.setStart(el, 0); r.collapse(true); }
  const s = window.getSelection();
  s.removeAllRanges(); s.addRange(r);
  ddgSaveSel();
}
function ddgCalloutHtml(kind, text, fresh) {
  const k = DDG_KINDS[kind] || DDG_KINDS.note;
  return '<div class="ddg-callout"' + (fresh ? ' data-new="1"' : '') + ' data-kind="' + kind + '" data-tag="' + k[state.lang === 'en' ? 1 : 0] + '"><p>' + (text ? ddgEsc(text) : '<br>') + '</p></div>';
}
function ddgInsertCallout(kind) {
  ddgRestoreSel();
  const s = window.getSelection();
  const text = s.rangeCount && !s.isCollapsed ? s.toString() : '';
  document.execCommand('insertHTML', false, ddgCalloutHtml(kind, text, true) + '<p><br></p>');
  const box = ddgEd().querySelector('.ddg-callout[data-new]');
  if (box) { box.removeAttribute('data-new'); const p = box.querySelector('p'); if (p) ddgCaretIn(p, true); }
  ddgChanged(); ddgSyncUI();
}

async function ddgInsertImage(file) {
  if (!file || !/^image\/(png|jpeg|gif|webp)$/.test(file.type)) { showToast('Gambar tidak didukung'); return; }
  try {
    const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('img')); i.src = url; });
    let src = url, w = img.naturalWidth;
    if (w > 1400) {
      const c = document.createElement('canvas');
      c.width = 1400; c.height = Math.max(1, Math.round(img.naturalHeight * 1400 / w));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      src = c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88);
      w = 1400;
    }
    const style = w <= 128 ? 'image-rendering: pixelated; width: ' + (w * Math.max(1, Math.floor(192 / w))) + 'px; max-width: 100%' : 'max-width: 100%';
    ddgRestoreSel();
    document.execCommand('insertHTML', false, '<img src="' + src + '" style="' + style + '">');
    ddgSaveSel(); ddgChanged();
  } catch (e) {
    console.error(e);
    showToast('Gagal membaca gambar');
  }
}

/* ---------------------------------------------------------------- toolbar */
function ddgOpt(sel, value, label) {
  const o = document.createElement('option');
  o.value = value; o.textContent = label;
  sel.appendChild(o);
}
function ddgSelect(id, title, opts) {
  const s = document.createElement('select');
  s.id = id; s.className = 'ddg-sel'; s.title = title; s.setAttribute('aria-label', title);
  opts.forEach((o) => ddgOpt(s, o[0], o[1]));
  return s;
}
function ddgBtn(cmd, title, inner, cls) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'ddg-btn' + (cls ? ' ' + cls : ''); b.dataset.cmd = cmd;
  b.title = title; b.setAttribute('aria-label', title);
  b.innerHTML = inner;
  return b;
}
function ddgSep() { const s = document.createElement('span'); s.className = 'ddg-sep'; return s; }
function ddgColorBtn(id, title, label, init) {
  const l = document.createElement('label');
  l.className = 'ddg-btn ddg-color'; l.title = title; l.setAttribute('aria-label', title);
  l.innerHTML = '<span class="ddg-color-t">' + label + '</span><span class="ddg-color-sw" style="background:' + init + '"></span>';
  const i = document.createElement('input');
  i.type = 'color'; i.id = id; i.value = init;
  l.appendChild(i);
  return l;
}

function ddgBuildToolbar() {
  const r1 = $('ddgRow1'), r2 = $('ddgRow2');
  const block = ddgSelect('ddgBlock', 'Paragraf', [['p', 'Paragraf'], ['h1', 'Judul 1'], ['h2', 'Judul 2'], ['h3', 'Judul 3'], ['h4', 'Judul 4'], ['blockquote', 'Kutipan']]);
  const font = ddgSelect('ddgFont', 'Jenis font', [['', 'Jenis font']].concat(DDG_FONTS.map((f) => [f[0], f[1]])));
  const weight = ddgSelect('ddgWeight', 'Ketebalan font (tergantung font: sebagian hanya punya Normal dan Tebal)', [['', 'Ketebalan']].concat(DDG_WEIGHTS.map((w) => [String(w[0]), w[0] + ' ' + w[1]])));
  const line = ddgSelect('ddgLine', 'Jarak baris', [['', 'Jarak baris']].concat(DDG_LINES.map((l) => [String(l), String(l)])));
  const size = document.createElement('input');
  size.type = 'number'; size.id = 'ddgSize'; size.className = 'ddg-num'; size.min = '8'; size.max = '120'; size.step = '1';
  size.title = 'Ukuran teks (px)'; size.setAttribute('aria-label', 'Ukuran teks (px)');
  [block, font, ddgSep(), ddgBtn('sizeDown', 'Perkecil teks', 'A&minus;'), size, ddgBtn('sizeUp', 'Perbesar teks', 'A+'), weight, line].forEach((n) => r1.appendChild(n));

  const callout = ddgSelect('ddgCallout', 'Kotak catatan\u2026', [['', 'Kotak catatan\u2026']].concat(Object.keys(DDG_KINDS).map((k) => [k, DDG_KIND_LABEL[k]])));
  [
    ddgBtn('bold', 'Tebal (Ctrl+B)', '<b>B</b>'), ddgBtn('italic', 'Miring (Ctrl+I)', '<i>I</i>'),
    ddgBtn('underline', 'Garis bawah (Ctrl+U)', '<u>U</u>'), ddgBtn('strikeThrough', 'Coret', '<s>S</s>'),
    ddgColorBtn('ddgColor', 'Warna teks', 'A', '#d33a2a'), ddgColorBtn('ddgHilite', 'Warna sorot', '&#9646;', '#ffe066'),
    ddgSep(),
    ddgBtn('justifyLeft', 'Rata kiri', ddgIcon('M4 6h16M4 10h10M4 14h16M4 18h10')),
    ddgBtn('justifyCenter', 'Rata tengah', ddgIcon('M4 6h16M7 10h10M4 14h16M7 18h10')),
    ddgBtn('justifyRight', 'Rata kanan', ddgIcon('M4 6h16M10 10h10M4 14h16M10 18h10')),
    ddgBtn('justifyFull', 'Rata kiri-kanan', ddgIcon('M4 6h16M4 10h16M4 14h16M4 18h16')),
    ddgSep(),
    ddgBtn('insertUnorderedList', 'Daftar poin', ddgIcon('M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01')),
    ddgBtn('insertOrderedList', 'Daftar angka', '1.'),
    ddgBtn('todo', 'Daftar centang', ddgIcon('M4 4.5h5v5H4zM5 7l1 1 2-2M4 14.5h5v5H4zM12 7h8M12 17h8')),
    ddgBtn('indent', 'Geser masuk', ddgIcon('M4 6h16M10 10h10M10 14h10M4 18h16M4 9l3 3-3 3')),
    ddgBtn('outdent', 'Geser keluar', ddgIcon('M4 6h16M10 10h10M10 14h10M4 18h16M7 9l-3 3 3 3')),
    ddgSep(),
    ddgBtn('link', 'Tautan', ddgIcon('M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1')),
    ddgBtn('image', 'Sisipkan gambar', ddgIcon('M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01')),
    ddgBtn('table', 'Sisipkan tabel', ddgIcon('M4 5h16v14H4zM4 10h16M4 15h16M10 5v14')),
    callout,
    ddgBtn('insertHorizontalRule', 'Garis pemisah', ddgIcon('M4 12h16')),
    ddgSep(),
    ddgBtn('undo', 'Urungkan', '&#8630;'), ddgBtn('redo', 'Ulangi', '&#8631;'), ddgBtn('removeFormat', 'Hapus format', 'T&times;')
  ].forEach((n) => r2.appendChild(n));
}

function ddgBuildCtx() {
  const ctx = $('ddgCtx');
  const tbl = document.createElement('div');
  tbl.className = 'ddg-ctx-grp'; tbl.id = 'ddgCtxTable';
  [['addRow', '+ Baris'], ['addCol', '+ Kolom'], ['delRow', '\u2212 Baris'], ['delCol', '\u2212 Kolom'], ['delTable', 'Hapus tabel']].forEach((o) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-secondary btn-sm' + (o[0] === 'delTable' ? ' btn-danger' : ''); b.dataset.tableop = o[0]; b.textContent = o[1];
    tbl.appendChild(b);
  });
  const co = document.createElement('div');
  co.className = 'ddg-ctx-grp'; co.id = 'ddgCtxCallout';
  const ks = ddgSelect('ddgKind', 'Jenis kotak', Object.keys(DDG_KINDS).map((k) => [k, DDG_KIND_LABEL[k]]));
  co.appendChild(ks);
  [['unwrap', 'Lepas kotak'], ['remove', 'Hapus kotak']].forEach((o) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-secondary btn-sm' + (o[0] === 'remove' ? ' btn-danger' : ''); b.dataset.calloutop = o[0]; b.textContent = o[1];
    co.appendChild(b);
  });
  ctx.appendChild(tbl); ctx.appendChild(co);
}

/* show the real state of the text under the cursor in the toolbar */
function ddgSyncUI() {
  if (!ddg.ready || !$('panel-ddg').classList.contains('active')) return;
  const s = window.getSelection();
  if (!s || !s.rangeCount || !ddgEd().contains(s.anchorNode)) return;
  let el = s.anchorNode.nodeType === 3 ? s.anchorNode.parentElement : s.anchorNode;
  if (!el || !el.nodeType) return;
  const cs = window.getComputedStyle(el);
  const idle = (id) => document.activeElement !== $(id);
  if (idle('ddgSize')) $('ddgSize').value = Math.round(parseFloat(cs.fontSize)) || '';
  if (idle('ddgWeight')) {
    const w = Math.round((parseInt(cs.fontWeight, 10) || 400) / 100) * 100;
    $('ddgWeight').value = DDG_WEIGHTS.some((x) => x[0] === w) ? String(w) : '';
  }
  if (idle('ddgFont')) {
    const fam = cs.fontFamily.toLowerCase().replace(/["']/g, '');
    const f = DDG_FONTS.find((x) => fam.indexOf(x[2].split(',')[0].toLowerCase().replace(/["']/g, '').trim()) === 0);
    $('ddgFont').value = f ? f[0] : '';
  }
  if (idle('ddgBlock')) {
    const b = ddgClosest(el, 'h1,h2,h3,h4,blockquote,p');
    $('ddgBlock').value = b ? b.tagName.toLowerCase() : 'p';
  }
  if (idle('ddgLine')) {
    const blk = ddgClosest(el, 'p,h1,h2,h3,h4,li,blockquote,td,th') || el;
    const bs = window.getComputedStyle(blk), ratio = parseFloat(bs.lineHeight) / parseFloat(bs.fontSize);
    const near = DDG_LINES.find((l) => Math.abs(l - ratio) < 0.03);
    $('ddgLine').value = near ? String(near) : '';
  }
  const q = (c) => { try { return document.queryCommandState(c); } catch (e) { return false; } };
  const todoUl = ddgClosest(el, 'ul');
  const isTodo = !!(todoUl && todoUl.classList.contains('ddg-todo'));
  $('ddgToolbar').querySelectorAll('.ddg-btn[data-cmd]').forEach((b) => {
    const c = b.dataset.cmd;
    let on = false;
    if (['bold', 'italic', 'underline', 'strikeThrough', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].indexOf(c) >= 0) on = q(c);
    else if (c === 'insertUnorderedList') on = q(c) && !isTodo;
    else if (c === 'insertOrderedList') on = q(c);
    else if (c === 'todo') on = isTodo;
    else if (c === 'link') on = !!ddgClosest(el, 'a');
    b.classList.toggle('on', on);
  });
  const cell = ddgClosest(el, 'td,th'), box = ddgClosest(el, '.ddg-callout');
  $('ddgCtx').hidden = !cell && !box;
  $('ddgCtxTable').hidden = !cell;
  $('ddgCtxCallout').hidden = !box;
  if (box && idle('ddgKind')) $('ddgKind').value = box.getAttribute('data-kind') || 'note';
}

/* ---------------------------------------------------------------- document state */
function ddgEmpty() {
  const e = ddgEd();
  return !e.textContent.trim() && !e.querySelector('img,table,hr');
}
function ddgEnsureP() {
  const e = ddgEd();
  if (e.children.length) return;
  if (!e.textContent.trim()) {
    e.innerHTML = '<p><br></p>';
    const r = document.createRange();
    r.setStart(e.firstChild, 0); r.collapse(true);
    const s = window.getSelection();
    s.removeAllRanges(); s.addRange(r);
  } else document.execCommand('formatBlock', false, '<p>');
}
function ddgTitle() { return $('ddgName').value.trim().slice(0, 60); }
function ddgSig() { return String(hashStr(hashStr(2166136261, ddgTitle() + '\n' + JSON.stringify(ddg.settings)), ddgEd().innerHTML)); }
function ddgIsDirty() { return ddgSig() !== ddg.savedSig; }

function ddgStats() {
  const text = ddgEd().innerText.trim();
  const words = text ? text.split(/\s+/).length : 0;
  return { words, chars: text.length };
}
function ddgPayload() {
  const st = ddgStats();
  return { v: 1, kind: 'ddg', name: ddgTitle(), html: ddgEd().innerHTML, settings: Object.assign({}, ddg.settings), words: st.words, chars: st.chars };
}
function ddgPayloadSize(p) { return new Blob([p.html]).size + 256; }

function ddgThumb() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(10, 4, 44, 56);
  g.strokeStyle = '#b8c0c8'; g.strokeRect(10.5, 4.5, 43, 55);
  g.fillStyle = '#3d7a1c'; g.fillRect(16, 10, 22, 5);
  g.fillStyle = '#cfd6dd';
  [20, 26, 32, 38, 44, 50].forEach((y, i) => g.fillRect(16, y, i % 2 ? 26 : 32, 3));
  return c.toDataURL('image/png');
}

function ddgCount() {
  const st = ddgStats();
  $('ddgCount').textContent = fmt('{w} kata \u00b7 {c} karakter \u00b7 ~{m} menit baca', { w: st.words, c: st.chars, m: Math.max(1, Math.ceil(st.words / 200)) });
}
function ddgStatus() {
  const el = $('ddgSave');
  const dirty = ddgIsDirty();
  el.classList.toggle('dirty', dirty);
  if (dirty) el.textContent = '\u25cf ' + tr('Belum disimpan') + ' \u00b7 ' + tr('Draf disimpan otomatis di browser ini.');
  else el.textContent = '\u2713 ' + (ddg.savedAt ? fmt('Tersimpan pukul {t}', { t: fmtClock(ddg.savedAt) }) : tr('Tersimpan'));
}
function ddgOutline() {
  const box = $('ddgOutline');
  box.textContent = '';
  const hs = Array.from(ddgEd().querySelectorAll('h1,h2,h3,h4')).filter((h) => h.textContent.trim());
  if (!hs.length) { box.appendChild(stEl('p', 'hint', tr('Belum ada judul. Pakai Judul 1\u20134 supaya muncul di sini.'))); return; }
  hs.forEach((h) => {
    const b = stEl('button', 'ddg-ol ddg-ol-' + h.tagName.toLowerCase(), h.textContent.trim().slice(0, 80));
    b.type = 'button';
    b.addEventListener('click', () => { h.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    box.appendChild(b);
  });
}

/* Chrome puts a list (or a table) INSIDE a <p> when a list command runs on a paragraph. That is not valid HTML
   (a reload would leave empty paragraphs), so the paragraph is unwrapped and the caret is put back. */
function ddgFixBlocks() {
  const e = ddgEd();
  const bad = e.querySelectorAll('p > ul, p > ol, p > table, p > div, p > h1, p > h2, p > h3, p > h4, p > blockquote, p > hr');
  if (!bad.length) return;
  const s = window.getSelection();
  const keep = s.rangeCount && e.contains(s.anchorNode) ? [s.anchorNode, s.anchorOffset, s.focusNode, s.focusOffset] : null;
  new Set(Array.from(bad, (x) => x.parentElement)).forEach((p) => {
    while (p.firstChild) p.parentNode.insertBefore(p.firstChild, p);
    p.remove();
  });
  if (keep && keep[0].isConnected && keep[2].isConnected) { try { s.setBaseAndExtent(keep[0], keep[1], keep[2], keep[3]); } catch (err) { /* ignore */ } }
}

function ddgChanged() {
  ddgFixBlocks();
  ddgEnsureP();
  clearTimeout(ddg.uiTimer);
  ddg.uiTimer = setTimeout(() => { ddgCount(); ddgOutline(); ddgStatus(); }, 250);
  clearTimeout(ddg.draftTimer);
  ddg.draftTimer = setTimeout(ddgDraftSave, 1200);
}

function ddgApplySettings() {
  const s = ddg.settings, e = ddgEd();
  e.style.setProperty('--ddg-size', s.size + 'px');
  e.style.setProperty('--ddg-lh', String(s.lh));
  e.classList.toggle('dark', s.paper === 'dark');
  ['full', 'wide', 'narrow'].forEach((w) => e.classList.toggle('w-' + w, w === s.width));
  $('ddgBaseSize').value = s.size;
  $('ddgBaseLine').value = String(s.lh);
  document.querySelectorAll('[data-ddgw]').forEach((b) => b.classList.toggle('on', b.dataset.ddgw === s.width));
  document.querySelectorAll('[data-ddgpaper]').forEach((b) => b.classList.toggle('on', b.dataset.ddgpaper === s.paper));
}

/* load content into the editor; savedSig tells what "saved" looks like (null = the loaded state counts as saved) */
function ddgLoadState(d, id, savedSig, savedAt) {
  ddg.range = null;
  $('ddgName').value = d.name || '';
  ddg.settings = ddgSanitizeSettings(d.settings);
  ddgApplySettings();
  const html = ddgClean(d.html || '');
  ddgEd().innerHTML = html.trim() ? html : '<p><br></p>';
  ddg.id = id;
  ddg.savedSig = savedSig === null || savedSig === undefined ? ddgSig() : savedSig;
  ddg.savedAt = savedAt || 0;
  ddgCount(); ddgOutline(); ddgStatus();
  ddgSyncUI();
}

async function ddgConfirmReplace() {
  if (ddgEmpty() || !ddgIsDirty()) return true;
  const r = await ssDialog({
    title: 'Ganti dokumen yang sekarang?', text: tr('Perubahan yang belum disimpan akan hilang.'),
    buttons: [{ label: 'Batal', value: 'no' }, { label: 'Ganti', value: 'ok', primary: true, danger: true }]
  });
  return !!(r && r.v === 'ok');
}

/* called by Save / Load when it opens or saves a DDG file */
function ddgLoadItem(d, it) {
  ddgLoadState({ name: it.name, html: d.html, settings: d.settings }, it.id, null, it.updated);
  ddgDraftSave();
}
function ddgMarkSaved(meta) {
  ddg.id = meta.id;
  if (!ddgTitle()) $('ddgName').value = meta.name;
  ddg.savedSig = ddgSig();
  ddg.savedAt = meta.updated;
  ddgStatus();
  ddgDraftSave();
}

/* ---------------------------------------------------------------- IndexedDB: draft + saved documents */
function ddgDraftSave() {
  if (!ddg.ready) return Promise.resolve();
  clearTimeout(ddg.draftTimer);
  ddg.draftTimer = 0;
  const v = { id: ddg.id, name: $('ddgName').value, html: ddgEd().innerHTML, settings: ddg.settings, sig: ddg.savedSig, savedAt: ddg.savedAt, t: Date.now() };
  return dbTx(['meta'], 'readwrite', (t) => { t.objectStore('meta').put({ key: 'ddg-draft', value: v }); }).catch(() => { /* storage not available: no draft */ });
}

async function ddgRestoreDraft() {
  try {
    const row = await dbGet('meta', 'ddg-draft');
    const v = row && row.value;
    if (!v || typeof v.html !== 'string') return;
    const html = ddgClean(v.html);
    const has = html.replace(/<[^>]*>/g, '').trim() || /<(img|table|hr)/i.test(html);
    if (!has && !String(v.name || '').trim()) return;
    ddgLoadState({ name: v.name, html, settings: v.settings }, v.id || null, v.sig || '', v.savedAt || 0);
    ddg.restored = true;
  } catch (e) { /* no storage */ }
}

function ddgUnique(name, folder, exceptId) {
  let n = name, k = 2;
  const taken = (x) => lib.items.some((i) => i.folder === folder && i.type === 'ddg' && i.id !== exceptId && i.name.toLowerCase() === x.toLowerCase());
  while (taken(n)) n = name + ' (' + (k++) + ')';
  return n;
}

async function ddgSave(asCopy) {
  if (ddg.saving) return;
  if (!lib.ok) { showToast('Penyimpanan browser tidak tersedia.', 3000); return; }
  if (ddgEmpty()) { showToast('Dokumen kosong'); return; }
  ddg.saving = true;
  try {
    await loadLibrary();
    let target = !asCopy && ddg.id ? lib.items.find((i) => i.id === ddg.id) || null : null;
    let name = ddgTitle() || (target ? target.name : tr('Dokumen DDG') + ' ' + fmtClock(Date.now()));
    const folder = target ? target.folder : ST_FOLDER.ddg;
    if (!target) {
      const dup = lib.items.find((i) => i.folder === folder && i.type === 'ddg' && i.name.toLowerCase() === name.toLowerCase());
      if (dup && !asCopy && !ddg.id) {
        const r = await ssDialog({
          title: 'Timpa berkas?', text: tr('Sudah ada berkas dengan nama ini') + ': ' + name,
          buttons: [{ label: 'Batal', value: 'no' }, { label: 'Simpan salinan', value: 'copy' }, { label: 'Timpa', value: 'over', primary: true, danger: true }]
        });
        if (!r || r.v === 'no') return;
        if (r.v === 'over') target = dup; else name = ddgUnique(name, folder);
      } else if (dup) name = ddgUnique(name, folder);
    }
    const payload = ddgPayload();
    payload.name = name;
    const size = ddgPayloadSize(payload);
    if (!(await ensureRoom(size, target ? target.size || 0 : 0, true))) return;
    const now = Date.now();
    const meta = {
      id: target ? target.id : stUid(), type: 'ddg', folder: target ? target.folder : folder, name,
      created: target ? target.created : now, updated: now, size,
      info: { words: payload.words, chars: payload.chars }, thumb: ddgThumb()
    };
    await writeItem(meta, payload);
    $('ddgName').value = name;
    ddgMarkSaved(meta);
    await loadLibrary();
    renderFiles();
    await ddgRenderList();
    showToast(target ? 'Diganti' : 'Tersimpan');
  } catch (e) {
    storageError(e);
  } finally {
    ddg.saving = false;
  }
}

async function ddgNew() {
  if (!(await ddgConfirmReplace())) return;
  ddgLoadState({ name: '', html: '', settings: ddg.settings }, null, null, 0);
  ddgDraftSave();
  showToast('Dokumen baru dibuat');
  ddgEd().focus();
}

async function ddgOpenSaved(it) {
  try {
    const row = await dbGet('blobs', it.id);
    const d = row && row.data;
    if (!d || d.kind !== 'ddg' || typeof d.html !== 'string') throw new Error('bad');
    if (d.v > 1) { showToast('Berkas dibuat oleh versi yang lebih baru.', 3500); return; }
    if (!(await ddgConfirmReplace())) return;
    ddgLoadItem(d, it);
    showToast('Dokumen dibuka');
    window.scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    showToast('Berkas tidak bisa dibaca. Datanya mungkin rusak.', 3500);
  }
}

async function ddgRenderList() {
  const box = $('ddgList');
  if (!box) return;
  box.textContent = '';
  if (!lib.ok) { box.appendChild(stEl('p', 'hint', tr('Penyimpanan browser tidak tersedia.'))); return; }
  try { await loadLibrary(); } catch (e) { console.error(e); }
  const items = lib.items.filter((i) => i.type === 'ddg').sort((a, b) => b.updated - a.updated);
  if (!items.length) { box.appendChild(stEl('p', 'hint', tr('Belum ada dokumen tersimpan.'))); return; }
  const small = (label, fn, cls) => {
    const b = stEl('button', 'btn btn-secondary btn-sm' + (cls ? ' ' + cls : ''), tr(label));
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  };
  items.forEach((it) => {
    const row = stEl('div', 'fm-row fm-file');
    const th = document.createElement('img');
    th.className = 'fm-thumb checker-bg'; th.alt = ''; th.src = it.thumb || '';
    const info = stEl('span', 'fm-info');
    info.appendChild(stEl('b', 'fm-name', it.name));
    info.appendChild(stEl('span', 'fm-sub', fmt('{n} kata', { n: (it.info && it.info.words) || 0 }) + ' \u00b7 ' + fmtBytes(it.size || 0)));
    info.appendChild(stEl('span', 'fm-sub', fmtDate(it.updated) + (it.id === ddg.id ? ' \u00b7 \u25b6' : '')));
    const acts = stEl('span', 'fm-acts');
    acts.appendChild(small('Buka', () => ddgOpenSaved(it), 'btn-primary'));
    acts.appendChild(small('Ubah nama', async () => {
      await renameItem(it);
      if (it.id === ddg.id) { const n = lib.items.find((i) => i.id === it.id); if (n) { $('ddgName').value = n.name; ddgDraftSave(); } }
      ddgRenderList();
    }));
    acts.appendChild(small('Hapus berkas', async () => {
      await deleteItem(it);
      if (!lib.items.some((i) => i.id === it.id) && ddg.id === it.id) { ddg.id = null; ddg.savedSig = ''; ddg.savedAt = 0; ddgStatus(); ddgDraftSave(); }
      ddgRenderList();
    }));
    row.appendChild(th); row.appendChild(info); row.appendChild(acts);
    box.appendChild(row);
  });
}

/* ---------------------------------------------------------------- templates */
function ddgTemplateHtml(tpl) {
  return tpl.items.map((it) => {
    const tag = it[0], text = tr(it[1]);
    if (tag === 'ul' || tag === 'todo') {
      const li = text.split('|').map((x) => '<li' + (tag === 'todo' ? ' data-done="0"' : '') + '>' + ddgEsc(x.trim()) + '</li>').join('');
      return '<ul' + (tag === 'todo' ? ' class="ddg-todo"' : '') + '>' + li + '</ul>';
    }
    if (tag === 'table') return ddgTableHtml(text.split(';').map((r) => r.split('|')), true) + '<p><br></p>';
    if (tag.indexOf('c-') === 0) return ddgCalloutHtml(tag.slice(2), text);
    return '<' + tag + '>' + ddgEsc(text) + '</' + tag + '>';
  }).join('');
}

async function ddgTemplates() {
  const empty = ddgEmpty();
  const r = await ssDialog({
    title: 'Templat dokumen',
    fields: [{ kind: 'select', label: 'Pilih templat', options: DDG_TPL.map((t) => [t.id, tr(t.name)]), value: DDG_TPL[0].id }],
    buttons: empty
      ? [{ label: 'Batal', value: 'no' }, { label: 'Pakai', value: 'replace', primary: true }]
      : [{ label: 'Batal', value: 'no' }, { label: 'Tambahkan di akhir', value: 'append' }, { label: 'Ganti', value: 'replace', primary: true, danger: true }]
  });
  if (!r || r.v === 'no') return;
  const tpl = DDG_TPL.find((t) => t.id === r.f[0]);
  if (!tpl) return;
  const html = ddgTemplateHtml(tpl);
  if (r.v === 'append') ddgEd().insertAdjacentHTML('beforeend', html);
  else ddgEd().innerHTML = html;
  ddg.range = null;
  ddgChanged();
  ddgDraftSave();
}

/* ---------------------------------------------------------------- export: HTML / Markdown / text / backup / print */
function ddgSerialize(root, plain) {
  const isBlock = (c) => c.nodeType === 1 && /^(P|H[1-6]|DIV|UL|OL|TABLE|HR|BLOCKQUOTE)$/.test(c.tagName);
  const hasBlockChild = (c) => Array.from(c.children).some(isBlock);
  const inline = (n) => { let s = ''; n.childNodes.forEach((c) => { s += inl(c); }); return s; };
  const inl = (c) => {
    if (c.nodeType === 3) return c.nodeValue.replace(/\u00a0/g, ' ');
    if (c.nodeType !== 1) return '';
    const t = c.tagName;
    if (t === 'BR') return plain ? '\n' : '  \n';
    if (t === 'IMG') return '[' + tr('gambar') + ']';
    if (isBlock(c)) return inline(c);
    let s = inline(c);
    if (plain || !s.trim()) return s;
    const w = parseInt(c.style.fontWeight, 10);
    if (t === 'A' && c.getAttribute('href')) s = '[' + s + '](' + c.getAttribute('href') + ')';
    if (t === 'B' || t === 'STRONG' || w >= 600) s = '**' + s + '**';
    if (t === 'I' || t === 'EM' || c.style.fontStyle === 'italic') s = '*' + s + '*';
    if (t === 'S' || t === 'STRIKE' || t === 'DEL' || (c.style.textDecoration || '').indexOf('line-through') >= 0) s = '~~' + s + '~~';
    return s;
  };
  const list = (ul, d) => {
    const todo = ul.classList.contains('ddg-todo'), ol = ul.tagName === 'OL';
    const lines = [];
    let i = 0;
    Array.from(ul.children).forEach((li) => {
      if (/^(UL|OL)$/.test(li.tagName)) { lines.push(list(li, d + 1)); return; }   // browsers put a nested list straight inside the list
      if (li.tagName !== 'LI') return;
      i++;
      let text = '';
      const nested = [];
      li.childNodes.forEach((c) => {
        if (c.nodeType === 1 && /^(UL|OL)$/.test(c.tagName)) nested.push(list(c, d + 1));
        else text += inl(c);
      });
      const box = todo ? (li.getAttribute('data-done') === '1' ? '[x] ' : '[ ] ') : '';
      lines.push('  '.repeat(d) + (ol ? i + '. ' : '- ') + box + text.trim());
      nested.forEach((n) => lines.push(n));
    });
    return lines.join('\n');
  };
  const table = (t) => {
    const rows = Array.from(t.rows).map((r) => Array.from(r.cells).map((c) => inline(c).replace(/\n/g, ' ').replace(/\|/g, '\\|').trim()));
    if (!rows.length) return '';
    if (plain) return rows.map((r) => r.join(' | ')).join('\n');
    const n = Math.max.apply(null, rows.map((r) => r.length));
    const pad = (r) => { const x = r.slice(); while (x.length < n) x.push(''); return '| ' + x.join(' | ') + ' |'; };
    return [pad(rows[0]), '| ' + new Array(n).fill('---').join(' | ') + ' |'].concat(rows.slice(1).map(pad)).join('\n');
  };
  const blocks = (parent) => {
    const res = [];
    let run = '';
    const flush = () => { if (run.trim()) res.push(run.trim()); run = ''; };
    parent.childNodes.forEach((c) => {
      if (c.nodeType === 3 || (c.nodeType === 1 && !isBlock(c))) { run += inl(c); return; }
      if (c.nodeType !== 1) return;
      flush();
      const t = c.tagName;
      if (/^H[1-6]$/.test(t)) res.push((plain ? '' : '#'.repeat(Math.min(4, +t[1])) + ' ') + inline(c).trim());
      else if (t === 'HR') res.push(plain ? '--------' : '---');
      else if (t === 'UL' || t === 'OL') res.push(list(c, 0));
      else if (t === 'TABLE') res.push(table(c));
      else if (t === 'DIV' && c.classList.contains('ddg-callout')) {
        const body = blocks(c).join('\n'), tag = c.getAttribute('data-tag') || '';
        res.push(plain ? '[' + tag + '] ' + body : body.split('\n').map((l, i) => '> ' + (i === 0 ? '**' + tag + '** ' : '') + l).join('\n'));
      } else if (t === 'BLOCKQUOTE') {
        const body = blocks(c).join('\n');
        res.push(plain ? body : body.split('\n').map((l) => '> ' + l).join('\n'));
      } else if (hasBlockChild(c)) blocks(c).forEach((x) => res.push(x));
      else { const s = inline(c).trim(); if (s) res.push(s); }
    });
    flush();
    return res;
  };
  return blocks(root).join('\n\n') + '\n';
}

function ddgExportHtml() {
  const s = ddg.settings, title = ddgTitle() || tr('Dokumen baru');
  const bodyBg = s.paper === 'dark' ? '#0e1114' : '#e9edf0';
  const css = DDG_DOC_CSS + '\nbody{margin:0;padding:24px 12px;background:' + bodyBg + '}.ddg-doc{box-sizing:border-box;padding:32px 36px;margin:0 auto;border-radius:4px;box-shadow:0 1px 6px rgba(0,0,0,.2)}'
    + '@media (max-width:520px){body{padding:0}.ddg-doc{padding:18px 14px;border-radius:0}}'
    + '@media print{body{padding:0;background:none}.ddg-doc{box-shadow:none;max-width:none!important;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
  const cls = 'ddg-doc w-' + s.width + (s.paper === 'dark' ? ' dark' : '');
  return '<!DOCTYPE html>\n<html lang="' + state.lang + '">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + ddgEsc(title) + '</title>\n<style>\n' + css + '\n</style>\n</head>\n<body>\n<article class="' + cls + '" style="--ddg-size:' + s.size + 'px;--ddg-lh:' + s.lh + '">\n' + ddgEd().innerHTML + '\n</article>\n</body>\n</html>\n';
}

function ddgFileBase() {
  return (ddgTitle() || 'dokumen-ddg').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/\s+/g, '_').slice(0, 60) || 'dokumen-ddg';
}
function ddgDownload(kind) {
  if (ddgEmpty() && kind !== 'json') { showToast('Dokumen kosong'); return; }
  const base = ddgFileBase();
  let blob, name;
  if (kind === 'html') { blob = new Blob([ddgExportHtml()], { type: 'text/html;charset=utf-8' }); name = base + '.html'; }
  else if (kind === 'md') { blob = new Blob([ddgSerialize(ddgEd(), false)], { type: 'text/markdown;charset=utf-8' }); name = base + '.md'; }
  else if (kind === 'txt') { blob = new Blob([ddgSerialize(ddgEd(), true)], { type: 'text/plain;charset=utf-8' }); name = base + '.txt'; }
  else {
    const p = ddgPayload();
    p.app = 'spritesheet-studio'; p.exported = new Date().toISOString();
    blob = new Blob([JSON.stringify(p)], { type: 'application/json' }); name = base + '.ddg.json';
  }
  downloadBlob(blob, name);
  showToast('Diunduh');
}

function ddgPrint() {
  if (ddgEmpty()) { showToast('Dokumen kosong'); return; }
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  f.setAttribute('aria-hidden', 'true');
  f.onload = () => {
    try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { showToast('Gagal mencetak'); }
    setTimeout(() => f.remove(), 60000);
  };
  f.srcdoc = ddgExportHtml();
  document.body.appendChild(f);
}

/* ---------------------------------------------------------------- import */
function ddgMdToHtml(md) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inl = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*([^*\n]+)\*/g, '<i>$1</i>').replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
  let out = '', list = null, para = [];
  const flushP = () => { if (para.length) { out += '<p>' + para.map(inl).join('<br>') + '</p>'; para = []; } };
  const closeL = () => { if (list) { out += list === 'ol' ? '</ol>' : '</ul>'; list = null; } };
  md.replace(/\r\n?/g, '\n').split('\n').forEach((L) => {
    let m;
    if (!L.trim()) { flushP(); closeL(); }
    else if ((m = L.match(/^(#{1,6})\s+(.*)$/))) { flushP(); closeL(); const n = Math.min(4, m[1].length); out += '<h' + n + '>' + inl(m[2]) + '</h' + n + '>'; }
    else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(L)) { flushP(); closeL(); out += '<hr>'; }
    else if ((m = L.match(/^\s*[-*+]\s+(?:\[( |x|X)\]\s+)?(.*)$/))) {
      flushP();
      const todo = m[1] !== undefined, kind = todo ? 'todo' : 'ul';
      if (list !== kind) { closeL(); out += todo ? '<ul class="ddg-todo">' : '<ul>'; list = kind; }
      out += '<li' + (todo ? ' data-done="' + (m[1] === ' ' ? '0' : '1') + '"' : '') + '>' + inl(m[2]) + '</li>';
    } else if ((m = L.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flushP();
      if (list !== 'ol') { closeL(); out += '<ol>'; list = 'ol'; }
      out += '<li>' + inl(m[1]) + '</li>';
    } else { closeL(); para.push(L.trim()); }
  });
  flushP(); closeL();
  return out;
}

async function ddgImportFile(file) {
  try {
    const text = await file.text();
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    let d;
    if (ext === 'json') {
      const o = JSON.parse(text);
      if (!o || o.kind !== 'ddg' || typeof o.html !== 'string') { showToast('Berkas bukan dokumen DDG', 3000); return; }
      if (o.v > 1) { showToast('Berkas dibuat oleh versi yang lebih baru.', 3500); return; }
      d = { name: o.name, html: o.html, settings: o.settings };
    } else if (ext === 'html' || ext === 'htm') {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const art = doc.querySelector('article.ddg-doc') || doc.body;
      d = { name: (doc.title || '').slice(0, 60), html: art.innerHTML, settings: ddg.settings };
    } else if (ext === 'md' || ext === 'markdown') {
      d = { name: file.name.replace(/\.[^.]+$/, '').slice(0, 60), html: ddgMdToHtml(text), settings: ddg.settings };
    } else {
      const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      d = {
        name: file.name.replace(/\.[^.]+$/, '').slice(0, 60),
        html: text.replace(/\r\n?/g, '\n').split(/\n{2,}/).map((p) => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join(''),
        settings: ddg.settings
      };
    }
    if (!(await ddgConfirmReplace())) return;
    ddgLoadState(d, null, '', 0);
    ddgDraftSave();
    showToast('Dokumen dibuka');
  } catch (e) {
    console.error(e);
    showToast('Gagal membuka berkas', 3000);
  }
}

/* ---------------------------------------------------------------- tab wiring */
function ddgOnShow() {
  ddgCount(); ddgOutline(); ddgStatus();
  ddgRenderList();
  if (ddg.restored) { ddg.restored = false; showToast('Draf dipulihkan otomatis', 2800); }
}

function initDdgTab() {
  const st = document.createElement('style');
  st.id = 'ddgDocStyle';
  st.textContent = DDG_DOC_CSS;
  document.head.appendChild(st);
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* ignore */ }
  ddgBuildToolbar();
  ddgBuildCtx();
  const e = ddgEd();
  e.innerHTML = '<p><br></p>';

  // selection is remembered, so toolbar controls that take focus (selects, color pickers) still work
  document.addEventListener('selectionchange', () => { ddgSaveSel(); ddgSyncUI(); });
  $('ddgToolbar').addEventListener('mousedown', (ev) => { if (!ev.target.closest('select,input,label')) ev.preventDefault(); });
  $('ddgCtx').addEventListener('mousedown', (ev) => { if (!ev.target.closest('select')) ev.preventDefault(); });

  $('ddgToolbar').addEventListener('click', (ev) => {
    const b = ev.target.closest('.ddg-btn[data-cmd]');
    if (!b || b.tagName === 'LABEL') return;
    const c = b.dataset.cmd;
    if (c === 'todo') ddgTodo();
    else if (c === 'link') ddgLink();
    else if (c === 'image') $('ddgImgFile').click();
    else if (c === 'table') ddgTableDialog();
    else if (c === 'sizeUp') ddgBumpSize(2);
    else if (c === 'sizeDown') ddgBumpSize(-2);
    else ddgExec(c);
  });
  $('ddgBlock').addEventListener('change', () => ddgExec('formatBlock', '<' + $('ddgBlock').value + '>'));
  $('ddgFont').addEventListener('change', () => {
    const f = DDG_FONTS.find((x) => x[0] === $('ddgFont').value);
    if (f) ddgApplyInline('fontFamily', f[2]);
  });
  $('ddgWeight').addEventListener('change', () => { if ($('ddgWeight').value) ddgApplyInline('fontWeight', $('ddgWeight').value); });
  $('ddgLine').addEventListener('change', () => {
    const v = $('ddgLine').value;
    if (!v) return;
    ddgRestoreSel();
    ddgBlocks().forEach((b) => { b.style.lineHeight = v; });
    ddgChanged();
  });
  $('ddgSize').addEventListener('change', () => {
    const n = Math.min(120, Math.max(8, Math.round(parseFloat($('ddgSize').value) || 0)));
    if (!n) return;
    $('ddgSize').value = n;
    ddgApplyInline('fontSize', n + 'px');
  });
  $('ddgSize').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); $('ddgSize').blur(); } });
  $('ddgColor').addEventListener('change', () => { ddgColor('foreColor', $('ddgColor').value); $('ddgColor').parentElement.querySelector('.ddg-color-sw').style.background = $('ddgColor').value; });
  $('ddgHilite').addEventListener('change', () => { ddgColor('hiliteColor', $('ddgHilite').value); $('ddgHilite').parentElement.querySelector('.ddg-color-sw').style.background = $('ddgHilite').value; });
  $('ddgCallout').addEventListener('change', () => { const k = $('ddgCallout').value; $('ddgCallout').value = ''; if (k) ddgInsertCallout(k); });

  // context bar (table / note box)
  $('ddgCtx').addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-tableop]'), c = ev.target.closest('[data-calloutop]');
    if (t) {
      if (t.dataset.tableop !== 'delTable') { ddgTableOp(t.dataset.tableop); return; }
      ssDialog({
        title: 'Hapus tabel?', buttons: [{ label: 'Batal', value: 'no' }, { label: 'Hapus tabel', value: 'ok', primary: true, danger: true }]
      }).then((r) => { if (r && r.v === 'ok') ddgTableOp('delTable'); });
    } else if (c) {
      const box = ddgClosest(window.getSelection().anchorNode, '.ddg-callout');
      if (!box) return;
      if (c.dataset.calloutop === 'unwrap') { while (box.firstChild) box.parentNode.insertBefore(box.firstChild, box); }
      box.remove();
      ddgEnsureP(); ddgChanged(); ddgSyncUI();
    }
  });
  $('ddgKind').addEventListener('change', () => {
    const box = ddgClosest(window.getSelection().anchorNode, '.ddg-callout');
    if (!box) return;
    const k = $('ddgKind').value;
    box.setAttribute('data-kind', k);
    box.setAttribute('data-tag', DDG_KINDS[k][state.lang === 'en' ? 1 : 0]);
    ddgChanged();
  });

  // editor
  e.addEventListener('input', (ev) => {
    if (ev.inputType === 'insertParagraph') {
      const s = window.getSelection(), li = s.rangeCount ? ddgClosest(s.anchorNode, 'li') : null;
      if (li && li.parentElement.classList.contains('ddg-todo')) li.setAttribute('data-done', '0');
    }
    ddgChanged();
  });
  e.addEventListener('click', (ev) => {
    const li = ev.target.closest && ev.target.closest('ul.ddg-todo > li');
    if (!li || !e.contains(li)) return;
    const r = li.getBoundingClientRect(), fs = parseFloat(window.getComputedStyle(li).fontSize) || 16;
    if (ev.clientX - r.left <= fs * 1.6 && ev.clientY - r.top <= fs * 1.9) {
      li.setAttribute('data-done', li.getAttribute('data-done') === '1' ? '0' : '1');
      ddgChanged();
    }
  });
  e.addEventListener('paste', (ev) => {
    const cd = ev.clipboardData;
    if (!cd) return;
    const img = Array.from(cd.files || []).find((f) => /^image\//.test(f.type));
    if (img) { ev.preventDefault(); ddgInsertImage(img); return; }
    ev.preventDefault();
    const html = cd.getData('text/html');
    if (html) document.execCommand('insertHTML', false, ddgClean(html, true));
    else document.execCommand('insertText', false, cd.getData('text/plain'));
    ddgChanged();
  });
  e.addEventListener('dragover', (ev) => { if (ev.dataTransfer && Array.from(ev.dataTransfer.types || []).indexOf('Files') >= 0) ev.preventDefault(); });
  e.addEventListener('drop', (ev) => {
    const f = ev.dataTransfer && Array.from(ev.dataTransfer.files || []).find((x) => /^image\//.test(x.type));
    if (!f) return;
    ev.preventDefault();
    ddgInsertImage(f);
  });
  e.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Tab' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const s = window.getSelection();
    if (s.rangeCount && ddgClosest(s.anchorNode, 'li')) { ev.preventDefault(); ddgExec(ev.shiftKey ? 'outdent' : 'indent'); }
  });
  document.addEventListener('keydown', (ev) => {
    if (!$('panel-ddg').classList.contains('active')) return;
    if ((ev.ctrlKey || ev.metaKey) && (ev.key === 's' || ev.key === 'S')) { ev.preventDefault(); ddgSave(false); }
  });

  // top buttons, settings, download, import
  $('ddgName').addEventListener('input', () => { ddgStatus(); clearTimeout(ddg.draftTimer); ddg.draftTimer = setTimeout(ddgDraftSave, 1200); });
  $('ddgNewBtn').addEventListener('click', ddgNew);
  $('ddgSaveBtn').addEventListener('click', () => ddgSave(false));
  $('ddgCopyBtn').addEventListener('click', () => ddgSave(true));
  $('ddgTplBtn').addEventListener('click', ddgTemplates);
  $('ddgBaseSize').addEventListener('change', () => {
    ddg.settings.size = Math.min(40, Math.max(10, Math.round(parseFloat($('ddgBaseSize').value) || 16)));
    ddgApplySettings(); ddgChanged();
  });
  $('ddgBaseLine').addEventListener('change', () => { ddg.settings.lh = +$('ddgBaseLine').value; ddgApplySettings(); ddgChanged(); });
  document.querySelectorAll('[data-ddgw]').forEach((b) => b.addEventListener('click', () => { ddg.settings.width = b.dataset.ddgw; ddgApplySettings(); ddgChanged(); }));
  document.querySelectorAll('[data-ddgpaper]').forEach((b) => b.addEventListener('click', () => { ddg.settings.paper = b.dataset.ddgpaper; ddgApplySettings(); ddgChanged(); }));
  $('ddgDlHtml').addEventListener('click', () => ddgDownload('html'));
  $('ddgDlMd').addEventListener('click', () => ddgDownload('md'));
  $('ddgDlTxt').addEventListener('click', () => ddgDownload('txt'));
  $('ddgDlJson').addEventListener('click', () => ddgDownload('json'));
  $('ddgPrintBtn').addEventListener('click', ddgPrint);
  $('ddgOpenBtn').addEventListener('click', () => $('ddgImportFile').click());
  $('ddgImportFile').addEventListener('change', () => { const f = $('ddgImportFile').files[0]; $('ddgImportFile').value = ''; if (f) ddgImportFile(f); });
  $('ddgImgFile').addEventListener('change', () => { const f = $('ddgImgFile').files[0]; $('ddgImgFile').value = ''; if (f) ddgInsertImage(f); });

  // keep the draft when the page is hidden or closed
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && ddg.ready) ddgDraftSave(); });
  window.addEventListener('pagehide', () => { if (ddg.ready) ddgDraftSave(); });
  // language switch: texts built in code are drawn again
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => setTimeout(() => { ddgCount(); ddgOutline(); ddgStatus(); ddgRenderList(); }, 0)));

  ddgApplySettings();
  ddg.savedSig = ddgSig();
  ddg.ready = true;
  applyLang();
  ddgCount(); ddgOutline(); ddgStatus();
  ddgRestoreDraft();
}

initDdgTab();
