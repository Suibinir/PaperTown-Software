-- DEVELOPMENT ONLY: disable RLS so the app works without auth
-- Re-enable and configure properly when you add Supabase Auth login

alter table leads disable row level security;
alter table clients disable row level security;
alter table campaigns disable row level security;
alter table deliverables disable row level security;
alter table comms_log disable row level security;
alter table vault_entries disable row level security;
alter table onboarding_items disable row level security;
