# Сadimac

A local-first 3D CAD design editor, optimised for touchpad use and for working without a mouse, anywhere you carry your Mac.

cadimac is a fork of [SketchForge-3D](https://github.com/Formsmith746/SketchForge-3D) by the SketchForge contributors.

## Key changes

- **Touchpad-first camera controls**, similar to Blender:
  - two-finger scroll: orbit
  - Shift + two-finger scroll: pan
  - pinch: zoom
- **macOS file path examples** instead of Windows ones.
- **Updated icons.**
- Automatic update checks and the Docker/FabLab server setup have been removed, since this fork is maintained as a personal project.

Everything else (primitive shapes, solid/hole workflow, boolean operations, edge chamfer/fillet, STL/OBJ/STEP import and export) comes from the original project. Projects are stored locally; nothing is uploaded anywhere.

## Download (Apple Silicon Macs)

Builds for Macs with M-series chips are available on the [Releases](../../releases) page.

1. Open the downloaded DMG.
2. Drag the app to the `Applications` folder.
3. Control-click the app, choose **Open**

## Build from source (any other computer)

Requires Node.js 20 or newer.

```
npm install
npm run build
```

To run in development mode:

```
npm run dev
```

Then open http://127.0.0.1:3000/.

To build the desktop app (on a Mac, for a DMG):

```
npm run desktop:dist
```

## License and attribution

cadimac is licensed under the **GNU Affero General Public License v3.0 only** (`AGPL-3.0-only`), the same license as the original project. See [LICENSE](LICENSE).

This is a modified version of SketchForge-3D. Original copyright © 2026 SketchForge contributors. If you host a modified version for others over a network, you must offer them the corresponding source code under the same license.

Original project: https://github.com/Formsmith746/SketchForge-3D