# SMART SITE

Bilingual-ready construction operations SaaS (fa/en), industrial UI direction, organization white-labeling, and hybrid licensing model.

## Current repository status

### Connected application layer
- Responsive Persian-first PWA interface
- Supabase Auth session enforcement and multi-tenant organization selector
- Tenant-scoped projects, issues, daily reports, and branding read/write flows
- Database RLS remains the authorization boundary; client-side tenant filters are additional scoping only
- JSON export for the selected tenant

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

## Authentication and organization onboarding scaffold

The repository now includes `auth.html`, `auth.js`, and `supabase-config.example.js`.

1. Copy `supabase-config.example.js` to `supabase-config.js`.
2. Set `supabaseUrl` and the project's publishable/anon key in that local config file.
3. Open `auth.html` through a local/static web server.
4. Enable Email authentication in Supabase. If email confirmation is enabled, confirm the signup email before signing in.
5. After signing in, create an organization. The authenticated user is assigned the initial owner role through the database RPC.

The real `supabase-config.js` is intentionally not committed and is excluded by the repository `.gitignore`. The browser key is public by design; database RLS is the security boundary.

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

The migration is a database foundation, not a deployed backend. It has not yet been applied to a live Supabase project or tested against a live instance. The PWA now contains Supabase client integration, but it requires a configured Supabase project and an applied migration before live operation.

Before production use, implement and test:
- Account recovery and invitation workflow
- Server-side license validation, platform-owner console, and subscription operations
- Storage policies for drawings, photos, and attachments
- Audit event generation for sensitive mutations
- Automated RLS isolation and privilege-escalation tests
- Backup/restore, monitoring, rate limits, and production deployment

Never store sensitive project information in the current front-end prototype.
