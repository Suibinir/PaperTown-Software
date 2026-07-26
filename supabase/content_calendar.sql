-- Content Calendar
-- Run in Supabase SQL Editor

create table if not exists content_calendar (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  date date not null,
  content_type text,        -- Static, Video, Motion Video, Reel, Cover Photo, Story, Carousel
  content_title text,
  purpose text,             -- Awareness, Engagement, Conversion, Retention, Brand
  content_direction text,   -- Brief/instructions for the designer/copywriter
  platform text,            -- Instagram, Facebook, LinkedIn, etc.
  status text default 'planned', -- planned, in_progress, done, cancelled
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table content_calendar enable row level security;
create policy "Team full access content_calendar" on content_calendar for all using (true);

create trigger content_calendar_updated before update on content_calendar
  for each row execute procedure update_updated_at();
