-- Notifications + Weekly Digest
-- Run in Supabase SQL Editor

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  type text not null,         -- 'weekly_digest', 'health_alert', 'deliverable_due' etc
  title text not null,
  body text,
  data jsonb,                 -- arbitrary payload
  recipient_role text,        -- 'admin', 'designer', 'account_manager', or null = all
  read boolean default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;
create policy "Team full access notifications" on notifications for all using (true);
