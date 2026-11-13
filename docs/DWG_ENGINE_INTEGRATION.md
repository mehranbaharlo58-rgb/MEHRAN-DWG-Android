# MEHRAN DWG — Engine Integration History and Acceptance Plan

## Current engine decision

The active offline parser path is LibreDWG compiled to WebAssembly through @mlightcad/libredwg-web. It is bundled inside the Android application and loaded in a dedicated Web Worker. Runtime parsing must not depend on a CDN or remote service.

See:
- [Application README](../mehran-dwg/README.md)
- [Third-party license notice](../mehran-dwg/THIRD_PARTY_NOTICES.md)
- [LibreDWG WebAssembly upstream](https://github.com/mlightcad/libredwg-web)

## Current implementation boundary

The app currently parses DWG locally, converts the parsed database, and maps a limited set of model-space entities to the 2D viewer. The full converted database is retained in the local drawing snapshot where serialization succeeds.

The current stage is **offline DWG reading and partial rendering**, not a complete DWG editor. It does not yet guarantee native DWG write/save, lossless round-trip, complete block/layout rendering, or full support for advanced/proxy/Civil objects. Unsupported entities must never be silently discarded when preparing a future save workflow.

## Native database bridge requirements

The next bridge layer must expose:
- open(buffer) — parse a local DWG and return document metadata plus entity database.
- documentInfo() — version, units, extents, layers, layouts and entity counts.
- queryEntities(filter) — stable handles, type, layer, geometry and properties.
- applyTransaction(operations) — create, modify, erase, transform and property edits.
- undo() / redo() — transaction history.
- saveAs(buffer, targetVersion) — native DWG output with explicit validation metadata.

The parser must run off the UI thread. Large files must be processed with bounded memory and progress/error reporting. The original source file must remain unchanged unless a validated native writer is available.

## Engine states

Use explicit states:
- ENGINE_NOT_READY
- ENGINE_READY
- FILE_OPEN_FAILED
- PARTIAL_RENDER
- UNSUPPORTED_OBJECT
- SAVE_NOT_SUPPORTED
- SAVE_VALIDATION_FAILED

Never silently fall back to a flattened image or report a successful DWG save when only a JSON/DXF snapshot was written.

## Acceptance tests before calling DWG editing complete

1. Open representative DWG files from multiple AutoCAD generations, including large drawings.
2. Verify layers, blocks, dimensions, text styles, linetypes, Xrefs and layouts.
3. Select and edit LINE, ARC, CIRCLE, POLYLINE, TEXT, MTEXT, DIMENSION and BLOCK reference objects.
4. Save to a new DWG, close it, reopen it in MEHRAN DWG, and compare object counts and critical properties.
5. Open the saved file in an independent CAD application and verify geometry, annotations and layer state.
6. Verify undo/redo, crash recovery, source-file protection and offline operation.
7. Test Android ARM64 devices, touch selection, large-file memory pressure and Persian/Unicode text.

## Licensing and distribution

LibreDWG and the selected WebAssembly distribution are GPL-3.0. Worker isolation is a code-organization boundary, not a guarantee that the overall application is exempt from GPL obligations. Before any commercial/proprietary distribution, review GPL-3.0 obligations with qualified counsel and preserve required notices and corresponding source obligations.

## Product rule

Until native editing, DWG writing and independent round-trip acceptance tests pass, describe MEHRAN DWG as an offline DWG reader with partial CAD rendering — not a complete DWG editor.
