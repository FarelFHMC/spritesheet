# Spritesheet Studio

English | [Bahasa Indonesia](README.id.md)

A small web app that turns video, GIF and images into a spritesheet. Edit frames, remove backgrounds, merge two or more sheets, export as images or as an animation, save and reopen your work in folders, or draw your own pixel font and export it as a TTF. It runs 100% in your browser: plain HTML, CSS and JavaScript, no build step, nothing is uploaded.

Version 2.7.9 · [Changelog](CHANGELOG.md) · [MIT License](LICENSE)

Made by **Farelfhmc** · Studio Fhilion

## How to use

Open the app (online via GitHub Pages, or open `index.html` locally). Tabs, in order:

1. **Import** — drop a video (MP4/WebM/MOV), GIF or image. For video, set FPS (or interval), start/end, max frames and frame size, then **Extract Frames**. For GIF, **Decode GIF**. For an image, **Add to Frames**.
2. **Background** (optional) — pick **Remove a specific color** or **Chroma Key**. Click the original image to pick the color, or press **Detect from corners**. Adjust *Tolerance* (how close a color must be to disappear) and *Feather* (soft edge). **Apply**; **Undo** if it looks wrong.
3. **Spritesheet** — set frame size, columns, padding and margin, then **Build Spritesheet**.
4. **Editor** — manage the frames. Drag a card to reorder it (on a phone, press and hold a card briefly, then drag), or use ◀ ▶. Drag image files from your device onto the page to add them as frames. **+ Add Images** picks images, **+ Empty Frame** adds a blank transparent frame, × deletes. Then **Rebuild**.
5. **Paint Sprite** — the sprite fills the screen. A compact floating toolbar sits just under the hamburger and never grows: the top row has three categories (**Tools**, **Layer**, **View**), the color square and undo / redo; the row below changes with the category.
   - **Tools:** **Brush**, **Eraser**, **Fill**, **Eyedrop**, **Lasso**, **Pan**. Tap **Brush**, **Eraser**, **Fill** or **Lasso** to open its options (tap again to close). Brush and Eraser each keep their own *Size* (1–64 px). **Fill** has *Tolerance* (0–255: how different a color may be and still get filled; 0 = exactly the same color), *Fill area* (**Connected** = only the touching area, **All colors** = every matching pixel in the frame) and *Sample colors from* (**This layer** or **All layers**). The color square opens a **color wheel** (drag the ring for the hue, the square inside it for saturation and brightness), a hex field and swatches.
   - **Lasso:** draw a free-hand area around what you want. The mode sets how a new area is combined with the old one: **New** (replace), **Add** or **Subtract**; tapping once in *New* mode deselects. The area is shown as a dashed outline, and the actions work on the pixels of the *selected layer* inside it: **Move to new layer** (cut out), **Copy to new layer**, **Delete contents**, **Invert selection** and **Deselect**. **Move / Rotate / Resize** turns the selected pixels into a box you can drag to move, pull by a corner or side to resize, and turn with the round handle (Shift = 15° steps); width, height and angle can also be typed, **Apply** (Enter) confirms and **Cancel** (Esc) drops it. It never blurs: every pixel is copied from the original with no smoothing and no new colors. Shortcuts: L Lasso, Esc deselect, Delete erases the selected pixels, arrow keys nudge while transforming.
   - **Layer:** every frame can have several layers. **+ Layer** adds one above the current one; the list shows the layers top first. Tick the box to show / hide a layer, tap a layer to paint on it, tap its name again to rename it, ↑ ↓ change the order, × deletes (at least 1 stays). **Duplicate**, **Merge down** and an *Opacity* slider are in the same panel. Up to 16 layers per frame. Tapping the sprite closes the panel so you can paint right away. Layers are only a painting aid: the sheet, ZIP and JSON always use the flattened picture of the visible layers.
   - **Smart Split:** in the Layer panel, **Smart Split** splits the selected layer into several new layers automatically. *Split by* **Separate parts** (pixels that touch stay together; *Join distance* also joins parts that are close to each other, e.g. a floating eye next to a face) or **Color** (similar colors are grouped; *Color tolerance* sets how similar). *Ignore specks smaller than* collects tiny pieces into one layer called **Rest**. If an area is selected with the Lasso, you can split only that area. **Keep the original layer** keeps it (hidden). It never goes past 16 layers: the smallest pieces are merged into Rest. Undo brings the layer back in one step.
   - **View:** zoom with − / + (or Ctrl + scroll wheel), **Fit** resets it. **Onion skin** opens the onion settings (see below).
   - **Onion skin:** shows the frames before and after the current one as a faint shadow behind it, to help you draw motion. Turn it on with the button in the frame bar (next to ▶), with **O**, or with *Turn on onion skin* in the settings. Settings: *Frames before / after* (0–5), *Shadow opacity*, *Fainter the farther away*, *Wrap round from the end to the start (loop)* and *Tint with colors* (red = before, blue = after). It is display only: it is never part of the sheet, ZIP, JSON or any export.
   A floating frame bar at the bottom lists every frame: tap one to paint on it, **+** adds an empty frame after the selected one, and the field below it sets the frame's own name (used as its file name on export). Undo / redo (Ctrl+Z / Ctrl+Y) covers strokes, fills and every layer change. Shortcuts: B Brush, E Eraser, G Fill, I Eyedrop, L Lasso, H Pan. The brush is square with no anti-aliasing, made for pixel art. Note: using **Background → Apply** on a frame flattens its layers into one.
6. **Player** — plays your frames as an animation. **Play / Pause**, previous / next frame and a slider to scrub. *Speed* 1–60 FPS, *Play mode* (**Loop**, **Ping-pong**, **Once**), *Scale* (**Fit**, 1×–8×), *Background* (**Checker**, **Dark**, **Light**), and **From frame / To frame** to loop only part of the animation. Shortcuts: Space play / pause, ← → change frame. The ▶ button in the Paint Sprite frame bar opens it directly.
7. **Font Creator** — draw your own pixel font, glyph by glyph. Pick a character (tap it in the grid, or use ‹ ›), then draw or erase on the big grid; **Undo / Redo** (Ctrl+Z / Ctrl+Y), the **Nudge** arrows, **Clear** and **Restore classic** are right under it. The green line is the baseline: rows above it are the letter body, rows below it are tails (g, j, p, q, y). **Any glyph you never draw automatically uses a built-in classic 5×7 font** (space, digits, A–Z, a–z and punctuation, ASCII 32–126), so the font is always complete; a green dot on a character means it is yours. **Add other characters** (é, ñ, ü ...) with the field under the grid; added characters that stay empty are not exported. *Font Settings*: font name, glyph width / height (1–32 px), baseline, letter spacing and an optional *proportional* width. Changing the size keeps your drawings. A live **Preview** shows your text. **Export Font** makes one **ZIP** with a **TrueType font (.ttf)** you can install, a **bitmap font** for game engines (`name.png` + `name.fnt` in BMFont text format), a **JSON** file with the size of every glyph, optionally one PNG per glyph, and a short README. **Download TTF only** gives just the font file. The TTF is written inside the app with sharp, seam-free pixel outlines: use it at the glyph height (e.g. 9 px) or a multiple of it for crisp edges. Nothing is uploaded.
8. **Merge** — load **2 or more** spritesheets (**+ Add Spritesheet**, up to 12; ↑ ↓ change the order, × removes one) and join them horizontally, vertically, as overlay, or append their frames. In **Append Frames** each spritesheet has its own *Frame width / height* (and shows how many frames it holds), and the result can be exported with JSON metadata.
9. **Export** — type a **File name**, choose **PNG / JPG / WebP** (JPG and WebP have a quality slider; JPG fills transparent areas with the background color you pick), then download the spritesheet, **all frames as one ZIP** (or one by one), or the JSON metadata (frame positions and names). If you changed frames after building the sheet, Export rebuilds it for you.
   **Animation export** (second card in the Export tab): make a **GIF**, an **animated WebP** or an **MP4** video from the frames. Set *Speed* (1–60 FPS), *Size* (1×–8×, whole-number scaling), *Play mode* (**Loop**, **Ping-pong**, **Once**), *From / To frame* (empty = first / last) and **Transparent background** (GIF and WebP) or a background color. GIF uses up to 255 colors and all-or-nothing transparency; WebP keeps full transparency (quality 100 = sharpest); MP4 has no transparency and needs a browser with WebCodecs (recent Chrome, Edge or Safari). Frames of different sizes are centered. The file is named `name_anim.gif` / `.webp` / `.mp4`. Everything is encoded inside the app: no library, nothing is uploaded.

10. **Save / Load** — keep your work in this browser and open it later. Type a **Name**, pick a **Folder** (or leave it automatic) and press **Save Animation** (frames with layers and names, plus Player and animation-export settings), **Save Spritesheet** (the built or merged sheet and its settings) or **Save Font** (the whole Font Creator). Files appear as folders: **Animation**, **Spritesheet**, **Font** and any you make with **+ New Folder**. Open a folder, then **Open**, **Overwrite** (with your current work), **Rename**, **Move** or **Delete** a file. Opening an animation lets you replace the current frames or add them at the end; a saved spritesheet can be opened into the Spritesheet / Export tabs or sent to the Merge tab.
    **Recovery Mode:** the app autosaves a few seconds after you stop working. If the page closed with unsaved work, the next start offers **Restore**, **Discard** or **Skip** (Skip pauses autosave; the **Recovery Mode** card in this tab restores or discards it later). The slots of the Merge tab are not part of the snapshot, only the merged result.
    **Storage:** everything lives in IndexedDB in this browser (never uploaded) and is limited to **1 GB**. Going over needs your permission: **Change Limit…** (or the prompt when a save would not fit) offers 2, 4, 8 or 16 GB after you confirm, and asks the browser to keep the data permanent. Clearing the site data in the browser deletes saved files too.

**Pixelated vs Smoothed** (in the menu). *Pixelated* never blends colors: best for pixel art. *Smoothed* averages when shrinking and interpolates when enlarging: better for photos and video. The setting applies when frames are extracted or the sheet is built, so rebuild after changing it.

**Settings** (gear button in the top bar, or *Settings…* in the menu). **Language** (ID / EN), **Mode** (Light / Dark) and **Theme** are together here. For the theme, pick **Default**, **Ocean**, **Sunset**, **Grape**, **Rose** or **Mono**, then change *Background*, *Panel*, *Text* and *Accent* to make your own. Colors are kept separately for Light and Dark mode. **Default** goes back to the built-in colors. Everything is remembered in this browser.

**Tips.** Use a small frame size (e.g. 64–128 px) for video. Lower FPS gives fewer, cleaner frames. Work is kept in memory while the page is open; use **Save / Load** to keep it. Recovery Mode brings back unsaved work after a refresh or crash.

## Project structure
```
spritesheet-studio/
├── index.html        page and all text (Indonesian by default)
├── style.css         styles (Light / Dark)
├── js/
│   ├── core.js       state, helpers, GIF decoder, video frames, background removal, spritesheet builder
│   ├── tabs.js       frame lists, Import, encoders (GIF / WebP / MP4), Export, Merge, Frame size, event wiring
│   ├── paint.js      Paint Sprite: layers, lasso, Smart Split, color wheel
│   ├── extras.js     Player, what's-new notice, language (ID / EN), Font Creator, init
│   └── storage.js    Save / Load, folders, Recovery Mode, IndexedDB (1 GB limit)
├── README.md / README.id.md
├── CHANGELOG.md / CHANGELOG.id.md
└── LICENSE
```
The five scripts are plain (non-module) files that share one scope, so `index.html` must load them in this order: `core.js`, `tabs.js`, `paint.js`, `extras.js`, `storage.js`. There is still no build step.

## Run locally
Open `index.html` in a browser. No install needed.

## Deploy to GitHub Pages
1. Create a GitHub account, then **+ → New repository**. Name it (e.g. `spritesheet-studio`), set **Public**, click **Create repository**.
2. **Add file → Upload files**. Upload the *contents* of the project folder (`index.html`, `style.css`, the `js` folder with its 5 files, `README.md`, `README.id.md`, `LICENSE`, `CHANGELOG.md`, `CHANGELOG.id.md`) — extract the ZIP first. Click **Commit changes**.
   - **Keep the `js` folder.** On a computer, drag the *folder* `js` itself onto the upload page (not the files inside it). If you choose or drop the files one by one, GitHub puts them in the main folder, outside `js`. On a phone the upload page cannot keep folders: use **Add file → Create new file**, type `js/core.js` as the name (the slash makes the folder), paste the content and commit; repeat for each file.
   - **A file landed outside `js` by mistake?** Open it in the repo, click the pencil icon, and in the name field at the top type `js/` in front of the name (so `core.js` becomes `js/core.js`), then **Commit changes**. The file moves into the folder.
3. **Settings → Pages**. Under *Build and deployment*, Source: **Deploy from a branch**, Branch: **main**, folder **/ (root)**, **Save**.
4. Wait 1–2 minutes. Your site: `https://<username>.github.io/<repo-name>/`.

To update later: open a file in the repo, click the pencil icon, edit, commit — or upload files again with the same names.

## Credits
Made by **Farelfhmc** · Studio Fhilion.

## License
[MIT](LICENSE). Free to use, change and share, including commercially, as long as the license notice is kept.
