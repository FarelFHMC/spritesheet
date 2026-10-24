# Changelog

English | [Bahasa Indonesia](CHANGELOG.id.md)

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
