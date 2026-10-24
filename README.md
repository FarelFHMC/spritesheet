# Spritesheet Studio

English | [Bahasa Indonesia](README.id.md)

A small web app that turns video, GIF and images into a spritesheet. Edit frames, remove backgrounds, merge two sheets, export. It runs 100% in your browser: plain HTML, CSS and JavaScript, no build step, nothing is uploaded.

Version 1.5 · [Changelog](CHANGELOG.md) · [MIT License](LICENSE)

## How to use

Open the app (online via GitHub Pages, or open `index.html` locally). Tabs, in order:

1. **Import** — drop a video (MP4/WebM/MOV), GIF or image. For video, set FPS (or interval), start/end, max frames and frame size, then **Extract Frames**. For GIF, **Decode GIF**. For an image, **Add to Frames**.
2. **Background** (optional) — pick **Remove a specific color** or **Chroma Key**. Click the original image to pick the color, or press **Detect from corners**. Adjust *Tolerance* (how close a color must be to disappear) and *Feather* (soft edge). **Apply**; **Undo** if it looks wrong.
3. **Spritesheet** — set frame size, columns, padding and margin, then **Build Spritesheet**.
4. **Editor** — drag cards (or use ◀ ▶) to reorder, × to delete, **+ Add Images** to add more, then **Rebuild**.
5. **Merge** — load sheet A and B and join them horizontally, vertically, as overlay, or append their frames.
6. **Export** — download the sheet PNG, every frame as PNG, or JSON metadata (frame positions).

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

## License
[MIT](LICENSE). Free to use, change and share, including commercially, as long as the license notice is kept.
