# Native DWG Engine Selection — Decision Record

Date: 2026-11-14

## Decision

Do not claim or simulate native DWG write support using the current `@mlightcad/libredwg-web` wrapper. Keep it as the offline read/parser path only. Introduce a vendor-neutral engine adapter contract so a validated native writer can replace or complement it without rewriting the CAD UI.

## Candidate A — ODA Drawings SDK

Official product information states that Drawings SDK supports reading, creating, editing and saving DWG, including mobile platforms and Android ARM64. It provides standard object editing and native DWG output.

Official references:
- https://www.opendesign.com/products/drawings
- https://www.opendesign.com/pricing
- https://www.opendesign.com/oda-membership
- https://docs.opendesign.com/

Published membership pricing currently lists:
- Commercial: USD 3,000 first year; USD 2,250 annual renewal; commercial distribution capped at 100 copies.
- Sustaining: USD 7,500 first year; USD 4,500 annual renewal; unlimited commercial distribution and web/SaaS use.
- The published FAQ states the SDK subscription is annual and distribution rights end if the subscription is terminated.

Prices and terms must be reconfirmed directly with ODA before purchase or product planning. This is technical due diligence, not legal advice or purchase authorization.

## Candidate B — Extend LibreDWG WebAssembly

The active wrapper exposes parsing/conversion features but does not currently expose a validated native DWG writer API to this application. Extending the C/WASM bridge requires:
- Auditing the exact upstream writer API and its format-version limitations.
- Building and maintaining a custom WASM toolchain.
- Exposing safe write APIs and ownership/lifetime management.
- Native round-trip tests against independent CAD software.
- GPL-3.0 compliance review for the complete distributed application.

A worker boundary does not remove GPL obligations. This route may reduce SDK licensing cost but increases engineering, compatibility and compliance risk.

## Current implementation state

`ENGINE_DESCRIPTOR` marks the active LibreDWG WebAssembly provider as read-only:
- DWG parsing: available
- Partial entity rendering: available
- Canonical database editing: not yet established
- Native DWG writing: unavailable
- Lossless DWG round-trip: unavailable

The application must block any native-save success indication while these flags remain false.

## Required proof before choosing a production writer

1. Build a minimal Android ARM64 proof-of-concept against the candidate engine.
2. Open representative DWG versions and enumerate model-space and paper-space objects.
3. Modify LINE, ARC, CIRCLE, LWPOLYLINE, TEXT, MTEXT, DIMENSION and BLOCK/INSERT objects.
4. Save as a new DWG and reopen it with the same engine.
5. Independently open the output in a separate CAD application.
6. Compare object counts, geometry, layers, units, text, dimensions, blocks and unsupported-object preservation.
7. Measure APK size, memory, parse/save time and large-file stability.
8. Confirm commercial redistribution rights for the intended release model.

## Release gate

No production release may be described as a DWG editor until the native DWG round-trip test suite passes. A successful Android build or successful DWG parse is not evidence of native DWG write support.
