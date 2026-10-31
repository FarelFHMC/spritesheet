# Spritesheet Studio

English | [Bahasa Indonesia](README.id.md)

A small web app that turns video, GIF and images into a spritesheet. Edit frames, remove backgrounds, merge two sheets, export. It runs 100% in your browser: plain HTML, CSS and JavaScript, no build step, nothing is uploaded.

Version 2.0 · [Changelog](CHANGELOG.md) · [MIT License](LICENSE)

Made by **Farelfhmc** · Studio Fhilion

## How to use

Open the app (online via GitHub Pages, or open `index.html` locally). Tabs, in order:

1. **Import** — drop a video (MP4/WebM/MOV), GIF or image. For video, set FPS (or interval), start/end, max frames and frame size, then **Extract Frames**. For GIF, **Decode GIF**. For an image, **Add to Frames**.
2. **Background** (optional) — pick **Remove a specific color** or **Chroma Key**. Click the original image to pick the color, or press **Detect from corners**. Adjust *Tolerance* (how close a color must be to disappear) and *Feather* (soft edge). **Apply**; **Undo** if it looks wrong.
3. **Spritesheet** — set frame size, columns, padding and margin, then **Build Spritesheet**.
4. **Editor** — manage the frames. Drag a card to reorder it (on a phone, press and hold a card briefly, then drag), or use ◀ ▶. Drag image files from your device onto the page to add them as frames. **+ Add Images** picks images, **+ Empty Frame** adds a blank transparent frame, × deletes. Then **Rebuild**.
5. **Paint Sprite** — the sprite fills the screen. A compact floating toolbar sits just under the hamburger and never grows: the top row has three categories (**Tools**, **Layer**, **View**), the color square and undo / redo; the row below changes with the category.
   - **Tools:** **Brush**, **Eraser**, **Fill**, **Eyedrop**, **Pan**. Tap **Brush**, **Eraser** or **Fill** to open its options (tap again to close). Brush and Eraser each keep their own *Size* (1–64 px). **Fill** has *Tolerance* (0–255: how different a color may be and still get filled; 0 = exactly the same color), *Fill area* (**Connected** = only the touching area, **All colors** = every matching pixel in the frame) and *Sample colors from* (**This layer** or **All layers**). The color square opens a **color wheel** (drag the ring for the hue, the square inside it for saturation and brightness), a hex field and swatches.
   - **Layer:** every frame can have several layers. **+ Layer** adds one above the current one; the list shows the layers top first. Tick the box to show / hide a layer, tap a layer to paint on it, tap its name again to rename it, ↑ ↓ change the order, × deletes (at least 1 stays). **Duplicate**, **Merge down** and an *Opacity* slider are in the same panel. Up to 16 layers per frame. Tapping the sprite closes the panel so you can paint right away. Layers are only a painting aid: the sheet, ZIP and JSON always use the flattened picture of the visible layers.
   - **View:** zoom with − / + (or Ctrl + scroll wheel), **Fit** resets it.
   A floating frame bar at the bottom lists every frame: tap one to paint on it, **+** adds an empty frame after the selected one, and the field below it sets the frame's own name (used as its file name on export). Undo / redo (Ctrl+Z / Ctrl+Y) covers strokes, fills and every layer change. Shortcuts: B Brush, E Eraser, G Fill, I Eyedrop, H Pan. The brush is square with no anti-aliasing, made for pixel art. Note: using **Background → Apply** on a frame flattens its layers into one.
6. **Player** — plays your frames as an animation. **Play / Pause**, previous / next frame and a slider to scrub. *Speed* 1–60 FPS, *Play mode* (**Loop**, **Ping-pong**, **Once**), *Scale* (**Fit**, 1×–8×), *Background* (**Checker**, **Dark**, **Light**), and **From frame / To frame** to loop only part of the animation. Shortcuts: Space play / pause, ← → change frame. The ▶ button in the Paint Sprite frame bar opens it directly.
7. **Merge** — load sheet A and B and join them horizontally, vertically, as overlay, or append their frames.
8. **Export** — type a **File name**, choose **PNG / JPG / WebP** (JPG and WebP have a quality slider; JPG fills transparent areas with the background color you pick), then download the spritesheet, **all frames as one ZIP** (or one by one), or the JSON metadata (frame positions and names). If you changed frames after building the sheet, Export rebuilds it for you.

**Pixelated vs Smoothed** (top right). *Pixelated* never blends colors: best for pixel art. *Smoothed* averages when shrinking and interpolates when enlarging: better for photos and video. The setting applies when frames are extracted or the sheet is built, so rebuild after changing it.

**Tips.** Use a small frame size (e.g. 64–128 px) for video. Lower FPS gives fewer, cleaner frames. Everything stays in memory; refreshing the page clears your frames.

## Run locally
Open `index.html` in a browser. No install needed.

## Deploy to GitHub Pages
1. Create a GitHub account, then **+ → New repository**. Name it (e.g. `spritesheet-studio`), set **Public**, click **Create repository**.
2. **Add file → Upload files**. Upload the *contents* of the project folder (`index.html`, `style.css`, `app.js`, `README.md`, `README.id.md`, `LICENSE`, `CHANGELOG.md`, `CHANGELOG.id.md`) — extract the ZIP first. Click **Commit changes**.
3. **Settings → Pages**. Under *Build and deployment*, Source: **Deploy from a branch**, Branch: **main**, folder **/ (root)**, **Save**.
4. Wait 1–2 minutes. Your site: `https://<username>.github.io/<repo-name>/`.

To update later: open a file in the repo, click the pencil icon, edit, commit — or upload files again with the same names.

## Credits
Made by **Farelfhmc** · Studio Fhilion.

## License
[MIT](LICENSE). Free to use, change and share, including commercially, as long as the license notice is kept.
