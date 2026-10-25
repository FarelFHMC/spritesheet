# Changelog

English | [Bahasa Indonesia](CHANGELOG.id.md)

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
