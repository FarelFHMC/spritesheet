# Changelog

English | [Bahasa Indonesia](CHANGELOG.id.md)

## 2.0.0 — 2026-10-31
### Changed
- **Hamburger menu.** The top bar is now just a hamburger icon and the name of the current section. The menu lists the sections in three categories: **Source** (Import, Background), **Edit** (Editor, Paint Sprite) and **Output** (Spritesheet, Merge, Export), with the Light / Dark, Pixelated / Smoothed and ID / EN switches at the bottom. It closes by itself when you pick a section or tap outside. Nothing scrolls sideways.
- **New colors and a Light / Dark theme.** Cool grey with a single green accent, no beige or brown. Pick **Light** or **Dark** in the menu; the first time it follows your system, and your choice is remembered.
- **Plainer shapes.** No boxed cards: sections are separated by a thin line. Standard fields, buttons and sliders with small rounded corners.
- Switching sections scrolls back to the top.
- The **Sprite Editor** tab is now called **Paint Sprite** (see below). Apart from what is listed here, every tool, setting and export behaves as in 1.6.

### Added
- **Paint Sprite, full screen.** The sprite now fills the whole screen. A floating toolbar sits just under the hamburger and a floating frame bar sits at the bottom (pick a frame, add an empty one, rename it). Zoom still works: − / + buttons, **Fit**, and Ctrl + scroll wheel or trackpad pinch on desktop, always around the spot you are looking at. The frame bar and the toolbar stay out of the way of the sprite.
- **Eyedrop tool** in Paint Sprite. Tap or drag on the sprite to pick its color; the app then returns to the Brush. Transparent pixels are ignored. Shortcuts: B Brush, E Eraser, G Fill, I Eyedrop, H Pan.
- **Compact toolbar with categories.** The Paint Sprite toolbar is now always two short rows, so it no longer grows downwards or sideways. The top row has the categories **Tools**, **Layer** and **View**, the color square and undo / redo (now icons). The row below changes with the category: the tools (Brush, Eraser, Fill, Eyedrop, Pan), the current layer, or the zoom controls.
- **Brush and Eraser options.** Tap **Brush** or **Eraser** to open its options. Each tool keeps its own *Size* (1–64 px; before: one size of 1–32 px for both, hidden inside the color popup). Tap the tool again to close the options.
- **Fill (bucket) tool** with options: *Tolerance* (0–255), *Fill area* (**Connected** or **All colors**) and *Sample colors from* (**This layer** or **All layers**). One tap fills, and it can be undone. Shortcut: G.
- **Layers.** Every frame can have up to 16 layers: add, duplicate, delete, reorder (↑ ↓), show / hide, rename (tap the name of the selected layer), *Opacity* and **Merge down**. Painting, erasing and filling happen on the selected layer. Undo / redo now covers every layer change. The sheet, ZIP and JSON use the flattened picture of the visible layers, so nothing else changes. Using **Background → Apply / Undo** on a frame flattens its layers into one. Layers are kept while the page stays open, like frames.
- **Empty frames.** **+ Empty Frame** in the Editor adds a blank transparent frame at the end; **+** in Paint Sprite adds one right after the selected frame and selects it. It has the same size as the frame you are working on (or the Spritesheet tab's frame size if there are no frames yet).
- **Drag and drop in the Editor.** Reordering frames by dragging now works with mouse, touch and pen (touch: press and hold a card briefly, then drag; the page scrolls while you drag near the edge). You can also drag image files from your device onto the Editor to add them as frames. ◀ ▶ buttons are still there.
- **Player** (new tab, under Edit). Plays the frames as an animation: Play / Pause, previous / next frame and a slider to scrub. *Speed* 1–60 FPS (remembered), *Play mode* (**Loop**, **Ping-pong**, **Once**), *Scale* (**Fit** or 1×, 2×, 4×, 8×), *Background* (**Checker**, **Dark**, **Light**) and **From frame / To frame** to loop only part of the animation. Shortcuts: Space and ← →. A ▶ button in the Paint Sprite frame bar opens it directly. It shows the flattened picture of every frame, so layers and names are respected.
- **Color wheel** in Paint Sprite. The color square now opens a wheel instead of the browser's own color box: drag the ring for the hue and the square inside it for saturation and brightness. Works with mouse, touch and pen. The hex field and swatches are still there, the eyedrop moves the wheel to the picked color, and grey / black keep the last hue.

### Fixed
- **Paint Sprite: the frame stretched or got squeezed after picking some tools.** The Eyedrop tool reused a style name (`pick`) that the Background tab uses to cap its canvas at 240 px, so the sprite was squeezed in height and stretched sideways. The tools now use their own style names and the Paint canvas can never be capped.
- **Paint Sprite: the frame could overlap the toolbar.** When the toolbar changed height (another category, a row wrapping on a narrow screen) the sprite kept its old size. It now fits again by itself whenever the toolbar or the frame bar changes height.

## 1.6.0 — 2026-10-25
### Added
- **Export all frames as one ZIP** (new button in the Export tab). The ZIP is built inside the app: no library, nothing is uploaded.
- **Rename downloads.** The new *File name* field names the sheet (`name.png`), the frames (`name_00.png`), the ZIP (`name_frames.zip`) and the JSON (`name.json`). Any single frame can have its own name in the Sprite Editor. Unsafe characters are removed and duplicate names get `_2`, `_3`.
- **More export formats:** PNG, JPG and WebP, with a quality slider. JPG fills transparent areas with a color you pick (default white). If a browser cannot encode a format, the file is saved as PNG and you are told.
- **Sprite Editor (beta)**, new tab: **Brush**, **Eraser**, color (picker, hex or swatches), brush size, pan, zoom, undo / redo (also Ctrl+Z / Ctrl+Y). Works with mouse, touch and pen. The brush is square with no anti-aliasing, made for pixel art.
- JSON metadata now includes the image file name and the name of every frame.
- A "What's new" notice (shown once per version) and a credit footer: made by **Farelfhmc**, **Studio Fhilion**.

### Changed
- Export tab redesigned. Downloading frames one by one is now its own button. Default frame names follow the *File name* field (`spritesheet_00.png`, before: `frame_00.png`).
- Copyright in `LICENSE` and credit in the README now name Farelfhmc (Studio Fhilion).

### Fixed
- Anything marked hidden was still visible: empty progress bars showed up everywhere, and the FPS and Interval fields were shown at the same time.
- Export used the sheet built earlier. After deleting, reordering or adding frames, or removing a background, the downloaded PNG and JSON were out of date. Export now rebuilds the sheet from the latest frames first.
- JSON metadata after a Horizontal / Vertical / Overlay merge described the previous sheet instead of the merged image. It is now only offered for sheets that have a frame grid (Spritesheet tab, or Append Frames).
- Slider labels (Tolerance, Feather) broke into several lines on narrow screens.

## 1.5.0 — 2026-10-24
### Added
- **Pixelated / Smoothed** toggle (header). Pixelated = nearest-neighbor, keeps pixel art sharp. Smoothed = averaged downscale and smooth upscale.
- **English / Indonesian** language switch in the app; choice is remembered.
- Background: click the original image to pick a color, hex input, preset swatches, "Detect from corners", live preview, and **Undo**.
- Chroma Key now removes color spill on edges (before, it behaved the same as "Remove a specific color").
- `LICENSE` (MIT), bilingual README, this changelog.

### Changed
- Simpler, flatter interface: single accent color, no gradients, light and dark theme follow the system.

### Fixed
- Video extraction: the last frame was sometimes missing and the second frame was duplicated. Cause: the canvas was drawn right after `seeked`, before the new frame was shown, and frame times were built by adding floats. Now each frame waits until it is really displayed, and times are calculated as `start + i × step`.
- "Estimated frames" now uses the same calculation as the real extraction.
- Choosing a file could open the file dialog twice in some browsers.

## 1.0.0
- First release: video / GIF / image import, background removal, spritesheet builder, frame editor, merge, export (PNG, individual frames, JSON).
