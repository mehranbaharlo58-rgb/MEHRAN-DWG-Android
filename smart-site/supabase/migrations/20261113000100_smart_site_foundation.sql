-- SMART SITE production foundation
-- Supabase PostgreSQL migration. Apply with Supabase CLI or SQL editor.
-- This migration creates tenant-scoped data and database-enforced access controls.
-- License and billing records are intentionally inaccessible to client roles.

begin;

create extension if not exists pgcrypto;

create type public.tenant_role as enum ('owner','admin','project_manager','engineer','supervisor','viewer');
create type public.project_status as enum ('planning','active','on_hold','completed','archived');
create type public.issue_status as enum ('open','in_progress','blocked','resolved','closed');
create type public.issue_priority as enum ('low','medium','high','critical');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_locale text not null default 'fa' check (preferred_locale in ('fa','en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  status text not null default 'active' check (status in ('active','suspended','closed')),
  default_locale text not null default 'fa' check (default_locale in ('fa','en')),
  timezone text not null default 'Asia/Tehran',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_branding (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  display_name text,
  logo_path text,
  primary_color text not null default '#E3A33B' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#17202A' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  custom_domain text unique,
  updated_at timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tenant_role not null default 'viewer',
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text,
  name text not null check (length(trim(name)) between 2 and 180),
  client_name text,
  location text,
  description text,
  status public.project_status not null default 'planning',
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  planned_start date,
  planned_finish date,
  actual_start date,
  actual_finish date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  unique (id, tenant_id),
  check (planned_finish is null or planned_start is null or planned_finish >= planned_start)
);
create index projects_tenant_status_idx on public.projects(tenant_id, status);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_role text not null default 'member' check (project_role in ('manager','engineer','supervisor','member','viewer')),
  added_at timestamptz not null default now(),
  primary key (project_id, user_id),
  foreign key (tenant_id, user_id) references public.tenant_members(tenant_id, user_id) on delete cascade
);
create index project_members_tenant_user_idx on public.project_members(tenant_id, user_id);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null,
  title text not null check (length(trim(title)) between 2 and 240),
  description text,
  category text,
  priority public.issue_priority not null default 'medium',
  status public.issue_status not null default 'open',
  responsible_user_id uuid,
  due_date date,
  resolved_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, tenant_id) references public.projects(id, tenant_id) on delete cascade
);
create index issues_tenant_project_status_idx on public.issues(tenant_id, project_id, status);

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  project_id uuid not null,
  report_date date not null,
  weather text,
  workforce_count integer check (workforce_count is null or workforce_count >= 0),
  equipment jsonb not null default '[]'::jsonb check (jsonb_typeof(equipment) = 'array'),
  completed_work text,
  next_day_plan text,
  safety_notes text,
  delays_and_constraints text,
  author_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, tenant_id) references public.projects(id, tenant_id) on delete cascade,
  unique (project_id, report_date)
);
create index daily_reports_tenant_date_idx on public.daily_reports(tenant_id, report_date desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_tenant_created_idx on public.audit_logs(tenant_id, created_at desc);

-- Platform-managed subscription/licensing data. No anon/authenticated policies are created.
create table public.tenant_licenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  plan_code text not null,
  status text not null default 'trial' check (status in ('trial','active','past_due','suspended','expired','cancelled')),
  max_users integer not null default 3 check (max_users > 0),
  feature_flags jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  external_customer_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.license_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);


-- Atomic tenant bootstrap: the caller becomes the first owner.
create or replace function public.create_tenant(
  tenant_name text,
  tenant_slug text,
  tenant_locale text default 'fa'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $
declare
  new_tenant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if tenant_locale not in ('fa','en') then
    raise exception 'Unsupported locale';
  end if;

  insert into public.tenants(name, slug, default_locale)
  values (tenant_name, lower(tenant_slug), tenant_locale)
  returning id into new_tenant_id;

  insert into public.tenant_members(tenant_id, user_id, role)
  values (new_tenant_id, auth.uid(), 'owner');

  insert into public.tenant_branding(tenant_id, display_name)
  values (new_tenant_id, tenant_name);

  return new_tenant_id;
end;
$;

revoke all on function public.create_tenant(text, text, text) from public;
grant execute on function public.create_tenant(text, text, text) to authenticated;

-- Security-definer helpers avoid recursive RLS evaluation on tenant_members.
create or replace function public.is_tenant_member(target_tenant uuid)
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = target_tenant and tm.user_id = auth.uid()
  );
$$;

create or replace function public.has_tenant_role(target_tenant uuid, allowed_roles public.tenant_role[])
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = target_tenant
      and tm.user_id = auth.uid()
      and tm.role = any(allowed_roles)
  );
$$;

revoke all on function public.is_tenant_member(uuid) from public;
revoke all on function public.has_tenant_role(uuid, public.tenant_role[]) from public;
grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.has_tenant_role(uuid, public.tenant_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_branding enable row level security;
alter table public.tenant_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.issues enable row level security;
alter table public.daily_reports enable row level security;
alter table public.audit_logs enable row level security;
alter table public.tenant_licenses enable row level security;
alter table public.license_events enable row level security;

create policy "profiles_select_self" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_insert_self" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "tenants_select_member" on public.tenants for select to authenticated using (public.is_tenant_member(id));
create policy "tenants_update_admin" on public.tenants for update to authenticated using (public.has_tenant_role(id, array['owner','admin']::public.tenant_role[])) with check (public.has_tenant_role(id, array['owner','admin']::public.tenant_role[]));

create policy "branding_select_member" on public.tenant_branding for select to authenticated using (public.is_tenant_member(tenant_id));
create policy "branding_manage_admin" on public.tenant_branding for all to authenticated using (public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role[])) with check (public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role[]));

create policy "members_select_same_tenant" on public.tenant_members for select to authenticated using (public.is_tenant_member(tenant_id));
create policy "members_manage_owner" on public.tenant_members for all to authenticated using (public.has_tenant_role(tenant_id, array['owner']::public.tenant_role[])) with check (public.has_tenant_role(tenant_id, array['owner']::public.tenant_role[]));

create policy "projects_select_member" on public.projects for select to authenticated using (public.is_tenant_member(tenant_id));
create policy "projects_insert_manager" on public.projects for insert to authenticated with check (public.has_tenant_role(tenant_id, array['owner','admin','project_manager']::public.tenant_role[]));
create policy "projects_update_manager" on public.projects for update to authenticated using (public.has_tenant_role(tenant_id, array['owner','admin','project_manager']::public.tenant_role[])) with check (public.has_tenant_role(tenant_id, array['owner','admin','project_manager']::public.tenant_role[]));
create policy "projects_delete_admin" on public.projects for delete to authenticated using (public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role[]));

create policy "project_members_select_member" on public.project_members for select to authenticated using (public.is_tenant_member(tenant_id));
create policy "project_members_manage_manager" on public.project_members for all to authenticated using (public.has_tenant_role(tenant_id, array['owner','admin','project_manager']::public.tenant_role[])) with check (public.has_tenant_role(tenant_id, array['owner','admin','project_manager']::public.tenant_role[]));

create policy "issues_select_member" on public.issues for select to authenticated using (public.is_tenant_member(tenant_id));
create policy "issues_insert_project_team" on public.issues for insert to authenticated with check (public.has_tenant_role(tenant_id, array['owner','admin','project_manager','engineer','supervisor']::public.tenant_role[]));
create policy "issues_update_project_team" on public.issues for update to authenticated using (public.has_tenant_role(tenant_id, array['owner','admin','project_manager','engineer','supervisor']::public.tenant_role[])) with check (public.has_tenant_role(tenant_id, array['owner','admin','project_manager','engineer','supervisor']::public.tenant_role[]));
create policy "issues_delete_manager" on public.issues for delete to authenticated using (public.has_tenant_role(tenant_id, array['owner','admin','project_manager']::public.tenant_role[]));

create policy "reports_select_member" on public.daily_reports for select to authenticated using (public.is_tenant_member(tenant_id));
create policy "reports_insert_team" on public.daily_reports for insert to authenticated with check (author_id = auth.uid() and public.has_tenant_role(tenant_id, array['owner','admin','project_manager','engineer','supervisor']::public.tenant_role[]));
create policy "reports_update_author_or_manager" on public.daily_reports for update to authenticated using (author_id = auth.uid() or public.has_tenant_role(tenant_id, array['owner','admin','project_manager']::public.tenant_role[])) with check (author_id = auth.uid() or public.has_tenant_role(tenant_id, array['owner','admin','project_manager']::public.tenant_role[]));
create policy "reports_delete_manager" on public.daily_reports for delete to authenticated using (public.has_tenant_role(tenant_id, array['owner','admin','project_manager']::public.tenant_role[]));

create policy "audit_select_admin" on public.audit_logs for select to authenticated using (public.has_tenant_role(tenant_id, array['owner','admin']::public.tenant_role[]));
create policy "audit_insert_member" on public.audit_logs for insert to authenticated with check (actor_id = auth.uid() and public.is_tenant_member(tenant_id));

-- Never expose license or billing tables to browser clients.
revoke all on public.tenant_licenses, public.license_events from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.tenants, public.tenant_branding,
  public.tenant_members, public.projects, public.project_members, public.issues,
  public.daily_reports, public.audit_logs to authenticated;
grant usage, select on all sequences in schema public to authenticated;

commit;
