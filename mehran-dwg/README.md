# MEHRAN DWG
Offline-first Android CAD and surveying workspace.

## Current foundation
- Full-viewport phone workspace and touch navigation
- Local drawing database: SQLite on Capacitor Android; IndexedDB in browser fallback
- DXF ASCII import for LINE, CIRCLE, POINT, LWPOLYLINE and TEXT/MTEXT
- Basic 2D canvas rendering, pan/zoom, line/circle tools, distance measurement, layer visibility
- Local drawing save/load and JSON export

## Known scope limitations
This is a development foundation, not a commercial release. Full binary DWG read/write and advanced CAD editing require a properly licensed CAD engine. DXF coverage, geometry editing, dimensioning, blocks, layouts, plotting, coordinate systems, survey calculations, robust backup/restore, and device QA remain to be implemented.

## Native DWG engine status
The current build is a CAD/DXF prototype and does not provide native DWG read/edit/write. The engineering integration requirements and acceptance tests are tracked in [docs/DWG_ENGINE_INTEGRATION.md](../docs/DWG_ENGINE_INTEGRATION.md).

A native engine package and a distribution license are required before native DWG editing can be enabled. Do not represent DXF import or canvas rendering as DWG editing.
