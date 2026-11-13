# MEHRAN DWG — Native DWG Engine Integration

## Decision
The application must use a native DWG database engine. A canvas renderer, DXF conversion, thumbnail, or raster preview is not an acceptable substitute for native DWG editing.

## Engine target
Primary candidate: Open Design Alliance (ODA) Drawings SDK, C++ API, Android ARM64 build.
The ODA Android sample to use as the integration reference is `Drawing/Examples/Android/OdaAndroidApp`. The sample demonstrates native DWG/DXF loading and rendering. The SDK's Drawings database API is responsible for native entity access, transactions, undo/redo, and DWG save.

Civil 3D object support is a separate scope item. Standard DWG entities and Civil-specific entities must not be conflated. If native Civil objects are required, evaluate the ODA Civil SDK extension and its license separately.

## Current blocker
The repository does not contain ODA SDK headers, Android static libraries, trial archive, or a license entitlement. The SDK is proprietary. It cannot legally or technically be recreated from public headers or replaced with a fake parser. Do not commit vendor binaries, license keys, or credentials.

## Required secure inputs
- ODA member/trial archive for the Android platform, including ARM64 libraries and matching headers.
- Confirmation that the license tier permits development, distribution, and the intended DWG-editing application use.
- Vendor license/configuration data supplied through a secure CI secret or private artifact store, never committed to Git.

## Native integration boundary
Implement the engine behind a native Android bridge, not in JavaScript:
- `open(path, password?)` — open the original DWG database; preserve the source file.
- `getDocumentInfo()` — units, extents, layers, layouts, version and object counts.
- `queryEntities(filter)` — stable entity IDs, type, layer, geometry and properties.
- `applyTransaction(operations)` — create, modify, erase, transform and property edits.
- `undo()` / `redo()` — database transaction history.
- `saveAs(path, targetVersion)` — write a native DWG file and return validation metadata.
- `render(viewport, style)` — render from the same database used for edits.

The bridge must report explicit engine states: `ENGINE_NOT_CONFIGURED`, `ENGINE_READY`, `FILE_OPEN_FAILED`, `UNSUPPORTED_OBJECT`, and `SAVE_VALIDATION_FAILED`. Never silently fall back to a flattened image.

## Acceptance tests before calling DWG editing complete
1. Open representative DWG files from multiple AutoCAD generations, including large drawings.
2. Preserve layers, blocks, dimensions, text styles, linetypes, Xrefs and layouts.
3. Select and edit LINE, ARC, CIRCLE, POLYLINE, TEXT, MTEXT, DIMENSION and BLOCK reference objects.
4. Save to a new DWG, close it, reopen it in MEHRAN DWG, and compare object counts and critical properties.
5. Open the saved file in an independent CAD application and verify geometry, annotations and layer state.
6. Verify undo/redo, crash recovery, read-only source protection and offline operation.
7. Test ARM64 devices, touch selection, large-file memory pressure and Persian/Unicode text.

## Delivery sequence
1. Obtain the authorized SDK package and confirm the distribution license.
2. Build the vendor Android sample in CI for ARM64.
3. Integrate the native database and renderer behind the bridge.
4. Implement selection, grips, commands, properties, transactions and save.
5. Add professional CAD workflows and engineering modules.
6. Produce a signed release APK only after interoperability and device QA.

## Non-negotiable product rule
Until the native SDK is integrated and the acceptance tests pass, describe the app as a CAD/DXF prototype — never as a full DWG editor.
