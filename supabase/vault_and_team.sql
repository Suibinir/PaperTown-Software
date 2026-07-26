-- Agency Vault + Team Members
-- Run in Supabase SQL Editor

-- ─── VAULT ────────────────────────────────────────────────────────────────
-- Stores encrypted credentials per client.
-- Supabase encrypts columns marked with pgsodium / vault extension,
-- but for broad compatibility we store an AES-GCM encrypted blob
-- and manage the key server-side via an environment variable.
-- The `secret_value` column is the encrypted credential.

create table if not exists vault_credentials (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  label text not null,
  category text not null default 'Other',
  username text,
  secret_value text,          -- AES-GCM base64-encoded encrypted value
  url text,
  notes text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table vault_credentials enable row level security;
create policy "Team full access vault" on vault_credentials for all using (true);

create trigger vault_updated before update on vault_credentials
  for each row execute procedure update_updated_at();

-- ─── TEAM MEMBERS ────────────────────────────────────────────────────────
create type team_role as enum ('admin', 'account_manager', 'designer', 'copywriter', 'analyst', 'viewer');

create table if not exists team_members (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  role team_role not null default 'account_manager',
  avatar_color text default '#6366f1',
  active boolean default true,
  created_at timestamptz default now()
);

alter table team_members enable row level security;
create policy "Team full access members" on team_members for all using (true);

-- Client assignments: which team member manages which client
create table if not exists client_assignments (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  member_id uuid references team_members(id) on delete cascade,
  role text default 'account_manager',
  created_at timestamptz default now(),
  unique(client_id, member_id)
);

alter table client_assignments enable row level security;
create policy "Team full access assignments" on client_assignments for all using (true);

-- Seed team members
insert into team_members (name, email, role, avatar_color) values
  ('Agency Admin',   'admin@agency.com',   'admin',           '#6366f1'),
  ('Sarah Clarke',   'sarah@agency.com',   'account_manager', '#0ea5e9'),
  ('James Osei',     'james@agency.com',   'designer',        '#f59e0b'),
  ('Priya Nair',     'priya@agency.com',   'copywriter',      '#10b981')
on conflict (email) do nothing;
