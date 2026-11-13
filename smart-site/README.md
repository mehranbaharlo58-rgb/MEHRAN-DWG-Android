# SMART SITE — Local-first construction operations

## Architecture
- Android native target: Capacitor 7 + SQLite plugin.
- Android database: SQLite stored in the app private sandbox.
- Browser/PWA fallback: IndexedDB.
- Local database is the source of truth; no account or internet connection is required for core project, issue, daily-report, and branding operations.
- Vite bundles the app for browser and Android targets.
- JSON export is available in the app.

## Android APK build
GitHub Actions builds a debug APK on relevant pushes or manual dispatch: install Node dependencies, bundle with Vite, generate the Capacitor Android project, sync SQLite, run Gradle assembleDebug, and publish artifact `smart-site-android-debug`.

This is a debug APK for installation and testing, not a signed production release. The first workflow run must pass before the APK is considered build-verified.

## Data protection status
The Android SQLite database currently uses `no-encryption` mode. App-private storage is not equivalent to database encryption. SQLCipher encryption, secure key provisioning, encrypted backup/restore, and signed offline licensing are required before commercial production. Avoid storing highly sensitive project information in this test build until encryption is implemented and verified.

## Offline operation
After installation, core records are stored locally. Internet is not required to create, read, or update projects, issues, daily reports, or branding. Internet is only needed to download the APK initially and for optional future synchronization or updates.

## PWA
The browser build uses IndexedDB and a service worker cache. Browser storage is less durable than native app-private SQLite; export backups regularly.

## Remaining production work
- SQLCipher encryption and secure key management.
- Backup import/restore and attachments/photos/drawings.
- Signed offline license activation and verification.
- Production APK signing and release pipeline.
- English UI and multi-device sync (optional, never required for local work).
