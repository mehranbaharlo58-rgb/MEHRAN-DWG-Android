# SMART SITE

Bilingual-ready construction operations SaaS (fa/en), industrial UI direction, organization white-labeling, and hybrid licensing model.

## Current repository status

### Front-end prototype
- Responsive Persian-first PWA interface
- Project portfolio, progress, issues/blockers, and daily reports
- Demonstration branding and license screens
- Browser-local demo data only; not connected to a production API

### Database foundation (Supabase/PostgreSQL)
Migration: `supabase/migrations/20261113000100_smart_site_foundation.sql`

Includes:
- Organizations (tenants), tenant branding, and membership roles
- Projects and project team membership
- Issues/blockers and daily site reports
- Audit log foundation
- Private platform-managed license and license-event tables
- Tenant-scoped Row Level Security policies
- Atomic `create_tenant(...)` bootstrap function; authenticated caller becomes the first owner

## Apply the database migration

1. Create a Supabase project.
2. Install the Supabase CLI and authenticate.
3. Link the local project:
   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```
4. From the repository root, apply migrations:
   ```bash
   supabase db push
   ```
   Or run the migration SQL in the Supabase SQL Editor for a first manual setup.

Do not commit project secrets. Never expose the Supabase `service_role` key in browser code. The browser may use only the publishable/anon key; authorization must be enforced by RLS and trusted server-side functions.

## Important security and deployment boundary

The migration is a database foundation, not a deployed backend. It has not yet been applied to a live Supabase project or tested against a live instance. The existing PWA still uses browser localStorage and does not yet authenticate or read/write these tables.

Before production use, implement and test:
- Supabase Auth integration and account recovery
- Tenant selection and membership onboarding
- Server-side license validation and platform-owner operations
- Storage policies for drawings, photos, and attachments
- Audit event generation for sensitive mutations
- Automated RLS isolation and privilege-escalation tests
- Backup/restore, monitoring, rate limits, and production deployment

Never store sensitive project information in the current front-end prototype.
