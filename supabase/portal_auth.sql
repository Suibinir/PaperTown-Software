-- Portal Auth Setup
-- Run this in Supabase SQL Editor AFTER schema.sql

-- Maps Supabase Auth users → client records
-- When a client logs in via magic link, we look up their client_id here
create table if not exists portal_users (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  created_at timestamptz default now(),
  unique(auth_user_id),
  unique(client_id)
);

-- Allow authenticated portal users to read their own mapping
alter table portal_users enable row level security;
create policy "Portal users read own row"
  on portal_users for select
  using (auth.uid() = auth_user_id);

-- Allow portal users to read their own client record
create policy "Portal read own client"
  on clients for select
  using (
    id in (
      select client_id from portal_users where auth_user_id = auth.uid()
    )
  );

-- Allow portal users to read their own client_visible deliverables
create policy "Portal read own deliverables"
  on deliverables for select
  using (
    client_visible = true
    and client_id in (
      select client_id from portal_users where auth_user_id = auth.uid()
    )
  );

-- Allow portal users to read their own campaigns
create policy "Portal read own campaigns"
  on campaigns for select
  using (
    client_id in (
      select client_id from portal_users where auth_user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- HOW TO GRANT A CLIENT PORTAL ACCESS:
-- 1. Client signs up / logs in via magic link (creates auth.users row)
-- 2. Find their auth user ID in Supabase Dashboard → Authentication → Users
-- 3. Run this (replace the UUIDs):
--
-- insert into portal_users (auth_user_id, client_id) values
--   ('AUTH-USER-UUID-HERE', 'CLIENT-UUID-HERE');
-- ─────────────────────────────────────────
