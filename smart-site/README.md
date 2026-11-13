# SMART SITE — Local-first construction operations

SMART SITE is being built as an offline-first construction site operations app. The device-local database is the source of truth. Core workflows do not require an account, cloud backend, or internet connection after the app shell has been installed and cached.

## Local data architecture

- Browser/PWA database: IndexedDB database named smart-site-local.
- Stores: projects, issues, daily reports, and local metadata/branding.
- Data remains in the installed browser/PWA profile on that device.
- Service worker caches the app shell for offline relaunch.
- JSON backup export is available from the app header.
- The current local-first runtime does not require a Supabase client.

## PWA vs native APK

The current deliverable is an installable PWA using IndexedDB. This is a real device-local database and works offline after the first successful installation/cache. It is not SQLite yet. If the commercial release must be a native Android APK, the next packaging stage should use Capacitor with a native SQLite adapter and encrypted database support. The data layer should keep the same repository API so the UI does not need a rewrite.

## Data safety

Browser storage can be cleared by the user or operating system. Storage persistence is requested where supported but cannot be guaranteed on every device. Export regular backups and store them somewhere safe. A single device copy is not a backup.

## Offline installation and test

1. Open the deployed app once while connected to the internet.
2. Install it from the browser's Install app / Add to Home Screen command.
3. Open the installed app, create a project, issue, and daily report.
4. Enable airplane mode and close/reopen the app.
5. Verify records remain available and new records can still be added.
6. Export a JSON backup while offline.

## Current scope and next production work

Current local-first build includes projects, issues, daily reports, organization branding metadata, dashboard, offline app-shell cache, and JSON export. Not yet implemented: encrypted backup/restore UI, attachments/photos/drawings, native SQLite APK packaging, signed offline license activation, multi-device synchronization, and bilingual EN interface.

For an Android production APK, implement Capacitor + SQLite, device-level encryption/key management, explicit backup/restore, migration tests, and signed offline license files. Cloud sync should remain optional and must never block local operations.
