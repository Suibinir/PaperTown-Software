-- AgencyOS Database Schema
-- Run this in your Supabase SQL editor to set up all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────
create table leads (
  id uuid primary key default uuid_generate_v4(),
  company text not null,
  contact_name text not null,
  contact_email text not null,
  service text not null check (service in ('SEO','PPC','Content','Social','Email','Web')),
  status text not null default 'new' check (status in ('new','qualified','proposal','won','lost')),
  source text,
  budget numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────
create table clients (
  id uuid primary key default uuid_generate_v4(),
  company text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  industry text,
  logo_url text,
  health_score integer default 100 check (health_score between 0 and 100),
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- CAMPAIGNS
-- ─────────────────────────────────────────
create table campaigns (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  service text not null check (service in ('SEO','PPC','Content','Social','Email','Web')),
  status text not null default 'active' check (status in ('active','paused','ended')),
  budget_monthly numeric default 0,
  spend_to_date numeric default 0,
  kpi_target text,
  kpi_current text,
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- DELIVERABLES
-- ─────────────────────────────────────────
create table deliverables (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid references campaigns(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  type text not null,
  status text not null default 'not_started' check (status in ('not_started','in_progress','review','done')),
  due_date date,
  assignee text,
  notes text,
  client_visible boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- COMMS LOG
-- ─────────────────────────────────────────
create table comms_log (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  channel text not null check (channel in ('email','slack','call','meeting','other')),
  direction text check (direction in ('inbound','outbound')),
  subject text,
  body text,
  logged_by text,
  logged_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- AGENCY VAULT (encrypted credentials)
-- Note: Use Supabase Vault or a secrets manager in production.
-- This stores metadata only; actual secrets live in Supabase Vault.
-- ─────────────────────────────────────────
create table vault_entries (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  label text not null,          -- e.g. "Google Ads login"
  category text,                -- e.g. "Ad platform", "CMS", "Analytics"
  vault_secret_id text,         -- Reference to Supabase Vault secret
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- ONBOARDING CHECKLISTS
-- ─────────────────────────────────────────
create table onboarding_items (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  item text not null,           -- e.g. "GA4 access granted"
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table leads enable row level security;
alter table clients enable row level security;
alter table campaigns enable row level security;
alter table deliverables enable row level security;
alter table comms_log enable row level security;
alter table vault_entries enable row level security;
alter table onboarding_items enable row level security;

-- Internal team: full access (authenticated users)
create policy "Team full access" on leads for all using (auth.role() = 'authenticated');
create policy "Team full access" on clients for all using (auth.role() = 'authenticated');
create policy "Team full access" on campaigns for all using (auth.role() = 'authenticated');
create policy "Team full access" on deliverables for all using (auth.role() = 'authenticated');
create policy "Team full access" on comms_log for all using (auth.role() = 'authenticated');
create policy "Team full access" on vault_entries for all using (auth.role() = 'authenticated');
create policy "Team full access" on onboarding_items for all using (auth.role() = 'authenticated');

-- Client portal: can only read their own client_visible deliverables
-- (wire this to a portal_user table keyed by client_id in production)
create policy "Portal read own deliverables"
  on deliverables for select
  using (client_visible = true);

-- ─────────────────────────────────────────
-- AUTO-UPDATE updated_at
-- ─────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger leads_updated_at before update on leads
  for each row execute procedure update_updated_at();
create trigger deliverables_updated_at before update on deliverables
  for each row execute procedure update_updated_at();
create trigger vault_updated_at before update on vault_entries
  for each row execute procedure update_updated_at();

-- ─────────────────────────────────────────
-- HEALTH SCORE FUNCTION
-- Call this to recompute a client's health score based on:
--   - Campaign spend vs budget
--   - Deliverable on-time rate
--   - Days since last comms log
-- ─────────────────────────────────────────
create or replace function compute_health_score(p_client_id uuid)
returns integer as $$
declare
  spend_score integer := 100;
  delivery_score integer := 100;
  comms_score integer := 100;
  total_score integer;

  v_budget numeric; v_spend numeric;
  v_total_del integer; v_done_del integer;
  v_last_comms timestamptz;
  v_days_since integer;
begin
  -- 1. Spend vs budget (penalise overspend)
  select sum(budget_monthly), sum(spend_to_date)
  into v_budget, v_spend
  from campaigns where client_id = p_client_id and status = 'active';

  if v_budget > 0 then
    spend_score := greatest(0, 100 - greatest(0, round(((v_spend - v_budget) / v_budget) * 100)));
  end if;

  -- 2. Deliverable on-time rate
  select count(*), count(*) filter (where status = 'done')
  into v_total_del, v_done_del
  from deliverables
  where client_id = p_client_id
    and due_date < current_date;

  if v_total_del > 0 then
    delivery_score := round((v_done_del::numeric / v_total_del) * 100);
  end if;

  -- 3. Comms recency (penalise > 14 days silence)
  select max(logged_at) into v_last_comms from comms_log where client_id = p_client_id;
  v_days_since := coalesce(extract(day from now() - v_last_comms)::integer, 30);
  comms_score := greatest(0, 100 - (v_days_since - 14) * 3);

  -- Weighted average: 40% spend, 40% delivery, 20% comms
  total_score := round(spend_score * 0.4 + delivery_score * 0.4 + comms_score * 0.2);
  return greatest(0, least(100, total_score));
end;
$$ language plpgsql;
