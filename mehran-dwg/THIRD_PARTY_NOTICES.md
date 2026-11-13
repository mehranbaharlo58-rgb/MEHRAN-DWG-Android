# Third-party notices

## LibreDWG / @mlightcad/libredwg-web

MEHRAN DWG integrates the JavaScript/WebAssembly distribution of `@mlightcad/libredwg-web` (version 0.8.8), based on GNU LibreDWG.

- Upstream: https://github.com/mlightcad/libredwg-web
- Core library: https://github.com/LibreDWG/libredwg
- License: GNU General Public License v3.0 (GPL-3.0)
- Package: https://www.npmjs.com/package/@mlightcad/libredwg-web

The parser is loaded in a dedicated Web Worker and the WebAssembly files are copied into the APK at build time. The runtime does not fetch the engine from a CDN.

Before distributing a commercial/proprietary build, obtain legal review of GPL-3.0 obligations. Worker isolation is an engineering boundary, not a guarantee that the overall combined application is exempt from GPL obligations. Preserve upstream license and corresponding source-offer obligations applicable to the distributed build.
