# SMART SITE — Prototype v0.1

A Persian-first, industrial-style responsive PWA interface for construction site operations.

## Included
- Dashboard and project portfolio
- Project registration and progress tracking
- Issue / blocker log with owner, priority and close-out status
- Daily site reports
- Basic organization branding preview
- JSON data export
- Installable PWA shell and basic offline cache

## Run locally
Serve this directory from any static HTTP server and open `index.html`. For example:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080/smart-site/`.

## Important implementation boundary
This is a front-end prototype only. Records are stored in the browser's localStorage and are not synchronized between users or devices. The branding and Hybrid license screens are demonstrative only.

Not implemented: authentication, multi-tenant isolation, server database, role-based access control, audit trail, secure license signing/validation, billing, file storage, custom domains, backups, or production security controls. Do not use it as a production system or store sensitive project data in it.

## Next engineering milestone
Build the production foundation: API + PostgreSQL, tenant-scoped authorization, server-side RBAC, secure license service, object storage, audit events, and automated tests.