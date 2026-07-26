-- Team Auth + Agency Settings
-- Run in Supabase SQL Editor

-- ── Agency settings table ─────────────────────────────────────────────────
create table if not exists agency_settings (
  id uuid primary key default uuid_generate_v4(),
  agency_name text not null default 'AgencyOS',
  logo_url text,
  primary_color text default '#6366f1',
  updated_at timestamptz default now()
);

insert into agency_settings (agency_name) values ('AgencyOS')
on conflict do nothing;

alter table agency_settings enable row level security;
create policy "Team full access settings" on agency_settings for all using (true);

-- ── Link Supabase auth users to team_members ──────────────────────────────
alter table team_members
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists deleted boolean default false;

-- ── HOW TO CREATE TEAM MEMBER LOGINS ─────────────────────────────────────
-- For each team member:
-- 1. Go to Supabase Dashboard → Authentication → Users → "Invite user"
--    OR use the SQL below to create a user programmatically (replace values):
--
-- The app's "Add member" flow will call supabase.auth.admin.createUser()
-- via a server action, so you don't need to do this manually.
--
-- To manually link an existing auth user to a team member:
-- update team_members
--   set auth_user_id = 'AUTH-UUID-HERE'
--   where email = 'member@agency.com';
