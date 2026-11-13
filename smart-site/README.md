# SMART SITE — Local-first construction operations

## Architecture
- Android native target: Capacitor 7 + SQLite plugin.
- Android database: SQLCipher-encrypted SQLite in the app private sandbox.
- Database key: generated with a cryptographically secure random source and stored through the SQLite plugin secure-secret facility; it is never hardcoded in the repository.
- Browser/PWA fallback: IndexedDB.
- Local database is the source of truth; no account or internet connection is required for core project, issue, daily-report, and branding operations.
- Vite bundles the app for browser and Android targets.
- JSON export is available in the app.

## Android APK build
GitHub Actions builds a debug APK on relevant pushes or manual dispatch: install Node dependencies, bundle with Vite, generate the Capacitor Android project, sync SQLite, run Gradle assembleDebug, and publish artifact `smart-site-android-debug`.

This is a debug APK for installation and testing, not a signed production release. The first workflow run must pass before the APK is considered build-verified.

## Data protection
Android uses SQLCipher encryption configured through the Capacitor SQLite plugin. The plugin's secure-secret storage retains the randomly generated database passphrase. If an existing encrypted database is detected but its key is unavailable, startup stops with an error rather than silently creating a new empty database.

Encrypted backup/restore, key migration/recovery procedures, and device-loss recovery still need implementation and testing before commercial production. The current JSON export is not an encrypted backup; treat exported files as sensitive.

## Offline operation
After installation, core records are stored locally. Internet is not required to create, read, or update projects, issues, daily reports, or branding. Internet is only needed to download the APK initially and for optional future synchronization or updates.

## PWA
The browser build uses IndexedDB and a service worker cache. Browser storage is less durable than native app-private SQLite; export backups regularly.

## Remaining production work
- Encrypted backup/restore and recovery workflow.
- Attachments/photos/drawings.
- Signed offline license activation and verification.
- Production APK signing and release pipeline.
- English UI and optional multi-device sync (never required for local work).
- Physical Android device tests: airplane mode, restart persistence, encryption verification, and database migration.
