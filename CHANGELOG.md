# Changelog

English | [Bahasa Indonesia](CHANGELOG.id.md)

## 2.7.8 — 2026-11-11
### Added
- **Save / Load** (new tab *Save / Load*, in the new **Files** group of the menu). Keep your work inside the browser and open it again later. Nothing is uploaded.
  - Three kinds of files: **Animation** (all frames with their names and layers, plus the Player and animation-export settings), **Spritesheet** (the built or merged sheet and its settings; it can be opened into the Spritesheet / Export tabs or sent to the Merge tab) and **Font** (everything of the Font Creator: glyphs, added characters, size, spacing, name).
  - **Folders.** Files are shown as folders. The three folders **Animation**, **Spritesheet** and **Font** always exist; you can make your own with **+ New Folder**, rename or delete them. Open a folder to see its files, each with a small picture, size and date. A file can be **Opened**, **Overwritten** with your current work, **Renamed**, **Moved** to another folder or **Deleted**. Saving with a name that already exists asks whether to overwrite or keep a copy.
  - Opening an animation asks whether to **replace** the current frames or **add them at the end**; unsaved changes are mentioned first.
- **Recovery Mode.** The app autosaves your current animation, font and merged sheet a few seconds after you stop working (and when the page is hidden). If the page was closed or crashed with work that was never saved, the next start asks to **Restore**, **Discard** or **Skip**. *Skip* pauses autosave so the snapshot is not overwritten; the **Recovery Mode** card in the Save / Load tab restores or discards it later. The contents of the Merge tab's slots are not part of the snapshot, only the merged result.
- **Storage in IndexedDB, limited to 1 GB.** The Storage card shows how much is used and the autosave status. Going over 1 GB needs your permission: the **Change Limit…** button (or the prompt that appears when a save would not fit) lets you choose 2, 4, 8 or 16 GB after you tick a confirmation, and the browser is asked for permanent storage. The choices never go above what the browser allows. If the browser is full, you get a clear message instead of a silent failure.
- The menu has a new group **Files**, the top bar shows v2.7.8, and the "What's new" notice has new text.

### Changed
- A fifth script, `js/storage.js`, holds all of this. It must be loaded last. The other scripts are unchanged.
- The Frame Size undo and the Background undo are cleared when frames are replaced by opening a file.

## 2.7.5 — 2026-11-09
No new features: this update only reorganizes the code. The app looks and works exactly as in 2.7.0.

### Changed
- **The JavaScript is split into 4 files** (before: one `app.js` of about 5,500 lines), in a new `js/` folder. The code is the same, only moved, and `index.html` loads the files in this order:
  - `js/core.js` — state, helpers, GIF decoder, video frames, background removal, spritesheet builder.
  - `js/tabs.js` — frame lists, Import, animation encoders, Export, Merge, Frame size and the event wiring.
  - `js/paint.js` — Paint Sprite (layers, lasso, Smart Split, color wheel).
  - `js/extras.js` — Player, the "What's new" notice, language (ID / EN), Font Creator and the start-up code.
- The files are plain scripts that share one scope (no build step, still works by opening `index.html`), so the **load order matters**.
- The "What's new" notice has its own version number, so it does **not** show again for people who already closed the 2.7.0 notice.
- The README and the Changelog (English and Indonesian) are updated, with a new *Project structure* section.

## 2.7.0 — 2026-11-07
### Added
- **Font Creator** (new tab, under Edit). Draw your own pixel font glyph by glyph and export it.
  - **Draw:** pick a character from the grid (or step with ‹ ›) and draw or erase on a large pixel grid with mouse, touch or pen; drag to draw lines. **Undo / Redo** (also Ctrl+Z / Ctrl+Y), **Nudge** arrows (move the glyph by 1 px), **Clear** and **Restore classic**. A green line marks the baseline, so letters with tails (g, j, p, q, y) can go below it.
  - **Classic font fills the gaps.** Any glyph you have not drawn automatically uses a built-in classic 5×7 font (space, digits, A–Z, a–z and punctuation, ASCII 32–126). Faded pixels in the editor and a missing green dot in the grid show that a glyph is still the automatic one; the first real change makes it yours. A tap that changes nothing does not turn a classic glyph into a custom one. **Restore all to classic** starts over.
  - **More characters.** *Add other characters* (é, ñ, ü ...) adds any character of the Basic Multilingual Plane; added characters that stay empty are not exported.
  - **Font Settings:** font name, glyph width and height (1–32 px), baseline, letter spacing (0–8 px) and *Width follows each glyph* (proportional). Changing the size keeps your drawings (centered sideways, aligned to the baseline). The classic font uses 5 × 9 with baseline 7.
  - **Preview:** type any text and see it drawn with your font (1×–8×).
  - **Export Font:** one **ZIP** with any of: a **TrueType font (.ttf)** you can install, a **bitmap font** for game engines (`name.png` atlas + `name.fnt` in BMFont text format, glyphs white on transparent), a **JSON** file with the size (and atlas position) of every glyph, and **one PNG per glyph**; a short `README.txt` is always included. **Download TTF only** gives just the font file. The TTF is written inside the app, no library and nothing is uploaded: pixels are merged into one clean outline (no seams between neighbouring pixels), with a box as the missing-glyph symbol. Use it at the glyph height (e.g. 9 px) or a multiple for sharp edges.

### Changed
- The top bar and footer show v2.7.

## 2.6.0 — 2026-11-06
### Added
- **Animation export** (Export tab, new *Export Animation* card). Make a **GIF**, an **animated WebP** or an **MP4** video from the frames in the Editor. Options: *Speed* (1–60 FPS, starts at the Player's speed), *Size* (1×, 2×, 3×, 4×, 6×, 8×, whole-number scaling that follows the *Pixelated / Smoothed* setting), *Play mode* (**Loop**, **Ping-pong**, **Once**), *From frame / To frame* (empty = first / last), **Transparent background** (GIF and WebP) or a background color, and *Animation quality* for WebP. The file is named `name_anim.gif` / `.webp` / `.mp4`. Frames of different sizes are centered. Nothing is uploaded and no library is used:
  - **GIF** is encoded inside the app: one palette of up to 255 colors for the whole animation (the exact colors when there are few, as in pixel art), transparency that is all or nothing, and, for opaque GIFs, only the changed area of each frame is stored to keep the file small.
  - **Animated WebP** joins one WebP image per frame into a single file, with full transparency. Needs a browser that can create WebP (Chrome, Edge, Firefox); otherwise the option is disabled.
  - **MP4** uses the browser's H.264 encoder (WebCodecs) and writes the file itself. MP4 has no transparency, so the background is filled with the color you pick. If the picture is too small for the encoder it is enlarged by a whole number (you are told). Needs a recent Chrome, Edge or Safari; otherwise the option is disabled.
  - Timing is exact: frame times are rounded so the total length matches the FPS (for example 12 FPS in a GIF alternates 80 / 90 ms).
- **Merge 2 or more spritesheets** (Merge tab). **+ Add Spritesheet** adds a slot (up to 12); each slot has its own file picker, preview, **↑ ↓** to change the order and **×** to remove it (at least 2 stay). The modes **Horizontal**, **Vertical**, **Overlay** and **Append Frames** work with any number of sheets. In **Append Frames** every spritesheet has its own *Frame width / height* (a new slot starts with the size of the one above) and shows how many frames it holds, so sheets with different frame sizes can be mixed. Empty slots are ignored, but at least 2 sheets must be loaded.

### Changed
- The tab **Merge** now reads *Merge Spritesheets* (before: *Merge 2 Spritesheets*). The *Frame width A / B* and *Frame height A / B* fields are replaced by the per-spritesheet fields described above.
- The progress bar in the Export tab now appears under the button that was pressed.
- The file names shown in the Export tab also list the animation name.
- A merge result that would be wider or taller than 16384 px is stopped with a message instead of producing a broken image.

## 2.5.0 — 2026-11-04
More features are still coming in later 2.5 updates.

### Added
- **Smart Split** (Paint Sprite → Layer → *Smart Split*). Splits the selected layer into several new layers in one tap. **Separate parts** keeps touching pixels together and has a *Join distance* (0–8 px) that also joins parts lying close to each other; **Color** groups similar colors (*Color tolerance*), the most common colors first, and names each layer after its color. *Ignore specks smaller than* gathers tiny pieces into one layer called **Rest**. Options: **Keep the original layer** (hidden), and **Selected area only** when a lasso area exists. The 16-layer limit is respected (the smallest pieces are merged into Rest). One **Undo** step brings the original layer back.
- **Lasso tool** (Paint Sprite → Tools, shortcut L). Draw a free-hand area with mouse, touch or pen. Modes **New / Add / Subtract**; a tap in *New* mode deselects. The area is shown as a dashed outline that stays visible with any tool and follows zoom. Actions on the pixels of the selected layer inside the area: **Move / Rotate / Resize** (see below), **Move to new layer**, **Copy to new layer**, **Delete contents**, **Invert selection**, **Deselect**. Esc deselects and Delete erases the selected pixels. All actions can be undone.
- **Move, rotate and resize inside the lasso** (Lasso → **Move / Rotate / Resize**). The pixels of the selected layer inside the area get a box with handles: drag inside it to **move**, drag a corner to **resize** (keeps the proportions), drag a side to stretch only that side, and drag the round handle on top to **rotate** (hold Shift for steps of 15°). Width, height and angle can also be typed, with a *Lock ratio* option, plus **↺ 90° / ↻ 90°** and **Reset**. Arrow keys nudge by 1 px (Shift: 10 px). **Apply** (Enter) confirms, **Cancel** (Esc) drops the change; the result is one **Undo** step and the lasso area follows the moved pixels. **Nothing is blurred:** every pixel of the result copies exactly one pixel of the original (no smoothing, no anti-aliasing, no new colors), sizes and moves are whole pixels, and the *Pixelated / Smoothed* setting does not affect it. Rotating by 90° is exact. The transform is applied by itself when you pick another tool, frame, layer action or section.
- **Frame size** (Editor tab, new *Frame Size* section). Set a width and height (1–2048 px) and resize every frame at once, layers included. Four fit modes: **Fit** (whole picture kept, the rest transparent), **Fill** (fills the frame, edges cropped), **Stretch** and **Center** (no scaling). The *Pixelated / Smoothed* setting is respected, so pixel art stays sharp. The fields start with the size of the first frame; an optional lock keeps the width : height ratio; **Undo** brings the old sizes back. The new size is also copied to the Spritesheet tab. A checkbox makes **new empty frames** use this size.
- **Hamburger slide animation.** The menu now slides in from the left with a dimmed backdrop, its groups fade in one after another, and the icon turns into an ×. Respects the "reduce motion" system setting.

### Changed
- On phones the six tool buttons are a little narrower so the toolbar still fits on one row.

### Fixed
- **Hamburger menu: the language switch (and sometimes Theme / Display) was cut off on phones.** The menu was sized to the full browser height, which is taller than what a phone really shows while the address bar is visible. It is now a drawer that fills exactly the space under the top bar and scrolls inside itself, so every item can be reached.
- **Paint Sprite on computer / tablet.** On screens 768 px wide or more, the tools dock in a panel on the left (two-column tool buttons, color wheel and layers open inside the panel instead of floating over the sprite), the frame bar runs along the bottom with larger thumbnails, and the sprite is fitted in the remaining space. It re-fits when the window is resized or rotated. Phones keep the floating bars.

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
