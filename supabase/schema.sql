-- DriftOps — Supabase Schema
-- Run this in your Supabase SQL editor
-- Project: driftops | supabase.com

-- ── Enable UUID extension ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Users (extends Supabase auth.users) ─────────────────────────────────────
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text unique not null,
  full_name   text,
  plan        text default 'free' check (plan in ('free', 'pro', 'enterprise')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── API Tokens ───────────────────────────────────────────────────────────────
create table public.api_tokens (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  name        text not null,
  token_hash  text unique not null,  -- store hash, never plain token
  last_used   timestamptz,
  created_at  timestamptz default now(),
  expires_at  timestamptz
);

-- ── Repositories ─────────────────────────────────────────────────────────────
create table public.repositories (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  repo_full_name text not null,           -- e.g. "myorg/myrepo"
  provider      text default 'github' check (provider in ('github', 'gitlab', 'azure_devops')),
  iac_path      text default './terraform',
  enforce_mode  boolean default false,
  created_at    timestamptz default now(),
  unique(user_id, repo_full_name)
);

-- ── State Snapshots ──────────────────────────────────────────────────────────
create table public.state_snapshots (
  id              uuid default uuid_generate_v4() primary key,
  repo_id         uuid references public.repositories(id) on delete cascade not null,
  commit_sha      text not null,
  branch          text,
  resource_count  integer default 0,
  providers       text[],                -- ['aws', 'azurerm']
  fingerprint     text,                  -- quick change detection hash
  snapshot_data   jsonb not null,        -- full resource inventory
  created_at      timestamptz default now()
);

create index idx_snapshots_repo_created on public.state_snapshots(repo_id, created_at desc);

-- ── Scan Results ─────────────────────────────────────────────────────────────
create table public.scan_results (
  id                uuid default uuid_generate_v4() primary key,
  repo_id           uuid references public.repositories(id) on delete cascade not null,
  snapshot_id       uuid references public.state_snapshots(id),
  commit_sha        text,
  branch            text,
  compliance_score  integer check (compliance_score between 0 and 100),
  violations_count  integer default 0,
  critical_count    integer default 0,
  high_count        integer default 0,
  medium_count      integer default 0,
  low_count         integer default 0,
  drift_detected    boolean default false,
  blocked           boolean default false,   -- did we block the deploy?
  violations        jsonb,                   -- full violations array
  diff_summary      jsonb,                   -- diff stats
  ai_report         text,                    -- AI generated markdown report
  created_at        timestamptz default now()
);

create index idx_scans_repo_created on public.scan_results(repo_id, created_at desc);
create index idx_scans_score on public.scan_results(compliance_score);

-- ── Violations (denormalized for fast querying) ───────────────────────────────
create table public.violations (
  id              uuid default uuid_generate_v4() primary key,
  scan_id         uuid references public.scan_results(id) on delete cascade not null,
  repo_id         uuid references public.repositories(id) on delete cascade not null,
  control_id      text not null,      -- e.g. "SC-28"
  control_name    text,
  control_family  text,
  resource_id     text not null,      -- e.g. "aws_s3_bucket.main"
  resource_type   text,
  severity        text check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  message         text,
  remediation     text,
  file_path       text,
  line_number     integer,
  resolved        boolean default false,
  created_at      timestamptz default now()
);

create index idx_violations_scan on public.violations(scan_id);
create index idx_violations_severity on public.violations(severity);
create index idx_violations_control on public.violations(control_id);

-- ── Row Level Security (RLS) — users only see their own data ─────────────────
alter table public.profiles      enable row level security;
alter table public.api_tokens    enable row level security;
alter table public.repositories  enable row level security;
alter table public.state_snapshots enable row level security;
alter table public.scan_results  enable row level security;
alter table public.violations    enable row level security;

-- Profiles: users see only their own
create policy "Users see own profile"
  on public.profiles for all
  using (auth.uid() = id);

-- API tokens: users see only their own
create policy "Users see own tokens"
  on public.api_tokens for all
  using (auth.uid() = user_id);

-- Repositories: users see only their own
create policy "Users see own repos"
  on public.repositories for all
  using (auth.uid() = user_id);

-- Snapshots: through repo ownership
create policy "Users see own snapshots"
  on public.state_snapshots for all
  using (
    exists (
      select 1 from public.repositories r
      where r.id = state_snapshots.repo_id
      and r.user_id = auth.uid()
    )
  );

-- Scan results: through repo ownership
create policy "Users see own scans"
  on public.scan_results for all
  using (
    exists (
      select 1 from public.repositories r
      where r.id = scan_results.repo_id
      and r.user_id = auth.uid()
    )
  );

-- Violations: through repo ownership
create policy "Users see own violations"
  on public.violations for all
  using (
    exists (
      select 1 from public.repositories r
      where r.id = violations.repo_id
      and r.user_id = auth.uid()
    )
  );

-- ── Helpful views ─────────────────────────────────────────────────────────────

-- Latest scan per repo
create view public.latest_scans as
select distinct on (repo_id)
  sr.*,
  r.repo_full_name,
  r.user_id
from public.scan_results sr
join public.repositories r on r.id = sr.repo_id
order by repo_id, created_at desc;

-- Compliance trend (last 30 scans per repo)
create view public.compliance_trend as
select
  repo_id,
  r.repo_full_name,
  compliance_score,
  violations_count,
  drift_detected,
  created_at
from public.scan_results sr
join public.repositories r on r.id = sr.repo_id
order by repo_id, created_at desc;
