-- Meta Ads Integration
-- Run in Supabase SQL Editor

create table if not exists meta_ad_insights (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  meta_campaign_id text,
  meta_campaign_name text,
  meta_adset_id text,
  meta_adset_name text,
  date_start date not null,
  date_stop date not null,
  spend numeric default 0,
  impressions integer default 0,
  clicks integer default 0,
  reach integer default 0,
  cpc numeric default 0,
  cpm numeric default 0,
  ctr numeric default 0,
  conversions integer default 0,
  conversion_value numeric default 0,
  roas numeric default 0,
  synced_at timestamptz default now(),
  unique(meta_campaign_id, date_start, date_stop)
);

alter table meta_ad_insights enable row level security;
create policy "Team full access meta insights" on meta_ad_insights for all using (true);

-- Per-client Meta account mapping
-- Stores which Meta ad account belongs to which client
alter table clients
  add column if not exists meta_ad_account_id text,
  add column if not exists meta_synced_at timestamptz;

-- Set default account for existing clients (can be updated per client later)
-- update clients set meta_ad_account_id = 'act_2190691971324416' where id = 'YOUR_CLIENT_UUID';
