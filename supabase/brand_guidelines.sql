-- Brand Guidelines per client
-- Run in Supabase SQL Editor

create table if not exists brand_guidelines (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade unique,
  logo_url text,
  post_examples jsonb default '[]',  -- array of up to 3 image URLs
  primary_font text,
  secondary_font text,
  colors jsonb default '[]',  -- array of {hex, name} objects
  notes text,
  updated_at timestamptz default now()
);

alter table brand_guidelines enable row level security;
create policy "Team full access brand_guidelines" on brand_guidelines for all using (true);

create trigger brand_guidelines_updated before update on brand_guidelines
  for each row execute procedure update_updated_at();
