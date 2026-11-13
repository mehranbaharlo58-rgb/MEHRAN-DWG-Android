# MEHRAN DWG

Offline-first Android CAD and surveying workspace.

## Current application foundation
- Full-viewport phone workspace and touch navigation
- Local drawing database: SQLite on Capacitor Android; IndexedDB in browser fallback
- DXF ASCII import for LINE, CIRCLE, POINT, LWPOLYLINE and TEXT/MTEXT
- Offline DWG parsing through `@mlightcad/libredwg-web` WebAssembly (GPL-3.0)
- LibreDWG parser runs in a dedicated Web Worker; WASM assets are copied into the APK at build time
- Basic 2D canvas rendering, pan/zoom, line/circle tools, distance measurement, layer visibility
- Local drawing save/load and JSON export

## DWG import scope
The DWG worker parses the binary DWG file locally, converts the database and maps supported model-space entities to the current 2D viewer. The current viewer mapping covers LINE, CIRCLE, POINT, TEXT/MTEXT and common polyline variants. Other entity types remain in the saved native database snapshot but are not yet rendered or editable through the current canvas tools.

This stage implements offline DWG reading and a first rendering bridge. It does **not** yet provide reliable DWG round-trip editing or native DWG save/export. Keep the original DWG file as the authoritative source until a validated writer and entity-preservation workflow are implemented.

## Build
From this directory:

```bash
npm install
npm run build
```

The build copies the package's `wasm/libredwg-web.js` and `wasm/libredwg-web.wasm` files into `public/libredwg/` so the engine is available locally without a CDN or network connection at runtime.

## Native DWG engine status
The ODA integration contract is no longer the active parser path. LibreDWG WebAssembly is the selected offline parser. The earlier ODA contract remains historical documentation only.

## Licensing
See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md). LibreDWG and its WebAssembly distribution are GPL-3.0. A commercial/proprietary release requires a legal review of GPL obligations; a worker boundary alone does not eliminate those obligations.

## Remaining engineering work
- Validate the WASM loader and DWG parsing on a physical Android device
- Add representative DWG regression fixtures across versions and entity classes
- Improve mapping and rendering for arcs, ellipses, splines, dimensions, hatches, blocks/inserts, attributes, and paper-space layouts
- Implement entity editing against the native drawing database
- Implement and validate native DWG write/save, including reopen/round-trip tests
- Add undo/redo transactions, robust file persistence and backup/restore
- Complete accessibility, performance and device QA before release
