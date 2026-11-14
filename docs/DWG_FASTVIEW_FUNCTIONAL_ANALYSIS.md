# DWG FastView — Clean-Room Functional Analysis for MEHRAN DWG

Date: 2026-11-14

## Scope and method

This is a clean-room, feature-level analysis based on the vendor's public mobile product page, public Android user guide, official edit-mode documentation, and public store feature descriptions. It does not reproduce proprietary source code, private protocols, protected assets, or implementation internals. Exact pixel-level behavior and undocumented edge cases require controlled observation of the app itself.

Primary public references:
- https://en.dwgfastview.com/cloud/mobile/
- https://blog.dwgfastview.com/dwg-fastview-edit-mode/
- https://cdn-sg-gw.gstarcad.net/gstarsoft_pdf/DWG-FastView-for-Mobile-User-Guide-Android.pdf
- https://play.google.com/store/apps/details?id=com.gstarmc.android

## Functional decomposition

### A. File workspace
- Browse local drawings and folders.
- Search, filter by format, sort by name/time/size/type.
- List and thumbnail presentation.
- File details and operations: open, rename, copy, move, delete, favorite, share.
- Offline local file access; cloud providers and synchronization are optional extensions.
- Batch selection and batch file operations.

### B. Drawing viewport
- Open supported DWG/DXF files and display model/layout content.
- Pan, pinch zoom, full drawing/fit extents, full-screen view.
- Smooth large-drawing navigation.
- Simulated cursor/magnifier for precise touch interaction.
- 2D visual styles and supported 3D visual styles.
- Font and symbol resolution, including user-provided fonts.

### C. Drawing database and inspection
- Layer list, visibility on/off, isolate/off-other, restore previous, turn all on, set current.
- Model space/layout switching.
- Entity inspection and properties.
- Text search and block counting.
- Preserve object identity, handles, block references, attributes, styles, and layout context.

### D. Selection and precision input
- Tap selection and multi-selection.
- Smart object snaps, including endpoint, midpoint, intersection and other geometry-specific candidates.
- Coordinate input: absolute, relative and polar.
- Precision settings for coordinates, distances and angles.
- Magnifier/crosshair workflow for dense geometry.

### E. Creation tools
- Line, polyline, circle, arc, rectangle, revision cloud, freehand sketch, smart pen, text and notation.
- Annotation tools: sketch, arrow, text, revision cloud, recording, image, leader, line, rectangle and ellipse.
- Native dimensions: aligned, linear, angular, radius, diameter and arc-length dimensions.

### F. Modification tools
- Move, copy, rotate, scale, mirror, color/property changes and erase.
- Trim, extend, offset, fillet and chamfer.
- Undo/redo with coherent transaction history.
- Operations must modify the drawing database, not merely draw a visual overlay.

### G. Measurement and reporting
- Distance, area, point coordinate/ID, arc length, entity measurement, angle and scale.
- Snap-aware measurement.
- Display results with units/precision and retain/export measurement records where required.

### H. Export and conversion
- Native DWG save/save-as and supported version conversion.
- DXF support.
- PDF/vector PDF and raster image export (PNG/JPG/BMP).
- Export range selection, paper size, orientation and color mode.
- Conversion must report the actual output format/version and validate the result.

## MEHRAN DWG current-state mapping

The current application is a Capacitor/Vite Android shell with a Web Worker using @mlightcad/libredwg-web. Its current implementation includes a subset of 2D creation/editing, selection, snapping, coordinate input, undo/redo, touch navigation, partial DXF import/export and local persistence.

Known gaps that block parity:
1. No validated native DWG writer is currently exposed by the installed WASM wrapper. Saving a JSON snapshot or exporting the unchanged source DWG is not native DWG editing.
2. The current viewer model maps only a subset of parsed entities. Some objects may appear in the SVG preview without being represented as editable entities.
3. Full fidelity for blocks/attributes, dimensions, MTEXT, tables, hatches, leaders, external references, layouts, paper space, proxy objects and Civil objects is not established.
4. Native associative dimensions and full CAD constraint/property behavior are not implemented.
5. The current OFFSET/TRIM behavior is limited and must not be described as complete AutoCAD-compatible functionality.
6. Original-DWG recovery is preservation only; edits made in the app are not merged into that file.

## Required target architecture

### 1. Native document engine adapter
Define a vendor-neutral adapter so the UI is not coupled to a parser:
- open(inputBytes) -> document handle + metadata + diagnostics
- getDocumentInfo(handle) -> version, units, extents, layers, layouts, blocks and counts
- enumerateEntities(handle, query) -> stable handles and typed properties
- readEntity(handle, entityHandle) -> complete editable properties
- applyTransaction(handle, operations) -> committed/rejected transaction
- undo(handle), redo(handle)
- saveAs(handle, targetFormat, targetVersion) -> bytes + validation report
- export(handle, options) -> PDF/raster output

Candidate implementations must be evaluated for Android ARM64 support, DWG read/write fidelity, offline runtime, memory use, commercial licensing, and version compatibility. The adapter must permit a licensed commercial engine to replace the current parser without rewriting the UI.

### 2. Canonical CAD model
Maintain one authoritative entity database. Rendering, selection, snapping, measurement, property panels and saving must all consume the same model. SVG/canvas output is a renderer only and must never become the source of truth.

Every entity needs:
- Stable source handle / identity
- DXF/DWG type and complete properties
- Layer, linetype, lineweight, color/transparency
- Geometry in drawing coordinates
- Owner/block/layout context
- Source version and unsupported-property diagnostics

Unknown or unsupported entities must be preserved losslessly through save, or saving must be blocked with a clear diagnostic. Never silently discard them.

### 3. Transaction and command layer
All commands must produce database transactions. Each transaction records before/after state, affected handles, and validation results. Undo/redo replays transactions; it must not rely on screenshots or whole-document lossy snapshots.

### 4. Touch interaction layer
Implement CAD interaction independently of rendering:
- Screen-to-world and world-to-screen transforms
- Gesture arbitration for pan, pinch, tap, long press and simulated cursor
- Snap candidate ranking by pixel distance and geometric validity
- Selection cycling for overlapping entities
- Dynamic input and coordinate entry
- Context-sensitive command toolbar

### 5. Validation and recovery
- Keep original bytes immutable until a successful save is validated.
- Save to a temporary output, reopen it through the engine, compare entity counts and critical properties, then atomically replace/rename.
- Maintain crash-recovery journal and explicit save state.
- Report partial support and unsupported objects before modifying the source.

## Implementation order — DWG-first

P0 — Engine feasibility and native round-trip:
- Prove native DWG write capability with a small representative test drawing.
- Open -> edit LINE/CIRCLE/ARC/LWPOLYLINE/TEXT -> save DWG -> reopen -> compare.
- Verify the output in an independent CAD reader.
- Resolve licensing before selecting the production engine.

P1 — Complete document model:
- Layers, blocks, attributes, text styles, dimensions, linetypes, layouts and paper space.
- Stable handles and preservation of unsupported objects.

P2 — Core editing parity:
- Selection, snaps, coordinate input, properties, undo/redo.
- Move/copy/rotate/scale/mirror/erase.
- Trim/extend/offset/fillet/chamfer with geometry tests.

P3 — Drawing and annotation:
- Creation tools, native dimensions, leaders, hatches and annotation objects.

P4 — Measurement and field tools:
- Distance, area, angle, point coordinates, arc length, entity properties and report export.
- Surveying/civil extensions only after core DWG fidelity is proven.

P5 — File workspace and output:
- Local file manager, batch actions, PDF/raster export, version conversion and optional cloud sync.

## Release gates

A feature is not complete merely because a toolbar button exists. Each command needs:
- Geometry/property unit tests.
- Transaction + undo/redo tests.
- Touch interaction tests on Android.
- Save/reopen persistence tests.
- Native DWG round-trip tests where applicable.

The product must not be called a full DWG editor until native DWG edits survive save/reopen and pass independent-file validation.
