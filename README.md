# Spritesheet Studio

English | [Bahasa Indonesia](README.id.md)

A small web app that turns video, GIF and images into a spritesheet. Edit frames, remove backgrounds, merge two or more sheets, export as images or as an animation. It runs 100% in your browser: plain HTML, CSS and JavaScript, no build step, nothing is uploaded.

Version 2.6 · [Changelog](CHANGELOG.md) · [MIT License](LICENSE)

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
   - **View:** zoom with − / + (or Ctrl + scroll wheel), **Fit** resets it.
   A floating frame bar at the bottom lists every frame: tap one to paint on it, **+** adds an empty frame after the selected one, and the field below it sets the frame's own name (used as its file name on export). Undo / redo (Ctrl+Z / Ctrl+Y) covers strokes, fills and every layer change. Shortcuts: B Brush, E Eraser, G Fill, I Eyedrop, L Lasso, H Pan. The brush is square with no anti-aliasing, made for pixel art. Note: using **Background → Apply** on a frame flattens its layers into one.
6. **Player** — plays your frames as an animation. **Play / Pause**, previous / next frame and a slider to scrub. *Speed* 1–60 FPS, *Play mode* (**Loop**, **Ping-pong**, **Once**), *Scale* (**Fit**, 1×–8×), *Background* (**Checker**, **Dark**, **Light**), and **From frame / To frame** to loop only part of the animation. Shortcuts: Space play / pause, ← → change frame. The ▶ button in the Paint Sprite frame bar opens it directly.
7. **Merge** — load **2 or more** spritesheets (**+ Add Spritesheet**, up to 12; ↑ ↓ change the order, × removes one) and join them horizontally, vertically, as overlay, or append their frames. In **Append Frames** each spritesheet has its own *Frame width / height* (and shows how many frames it holds), and the result can be exported with JSON metadata.
8. **Export** — type a **File name**, choose **PNG / JPG / WebP** (JPG and WebP have a quality slider; JPG fills transparent areas with the background color you pick), then download the spritesheet, **all frames as one ZIP** (or one by one), or the JSON metadata (frame positions and names). If you changed frames after building the sheet, Export rebuilds it for you.
   **Animation export** (second card in the Export tab): make a **GIF**, an **animated WebP** or an **MP4** video from the frames. Set *Speed* (1–60 FPS), *Size* (1×–8×, whole-number scaling), *Play mode* (**Loop**, **Ping-pong**, **Once**), *From / To frame* (empty = first / last) and **Transparent background** (GIF and WebP) or a background color. GIF uses up to 255 colors and all-or-nothing transparency; WebP keeps full transparency (quality 100 = sharpest); MP4 has no transparency and needs a browser with WebCodecs (recent Chrome, Edge or Safari). Frames of different sizes are centered. The file is named `name_anim.gif` / `.webp` / `.mp4`. Everything is encoded inside the app: no library, nothing is uploaded.

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
