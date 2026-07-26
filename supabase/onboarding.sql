-- Onboarding Checklist Setup
-- Run in Supabase SQL Editor

-- Default onboarding template items (used when a new client is created)
create table if not exists onboarding_templates (
  id uuid primary key default uuid_generate_v4(),
  item text not null,
  category text not null,  -- 'Access', 'Assets', 'Strategy', 'Technical'
  sort_order integer default 0
);

-- Insert default template
insert into onboarding_templates (item, category, sort_order) values
  ('Google Analytics 4 access granted',        'Access',    1),
  ('Google Search Console access granted',     'Access',    2),
  ('Google Ads account access granted',        'Access',    3),
  ('Meta Business Manager access granted',     'Access',    4),
  ('Website CMS / hosting login received',     'Access',    5),
  ('Brand guidelines document received',       'Assets',    6),
  ('Logo files (SVG/PNG) received',            'Assets',    7),
  ('Brand colour palette received',            'Assets',    8),
  ('Tone of voice / messaging guide received', 'Assets',    9),
  ('Competitor analysis completed',            'Strategy',  10),
  ('Target audience defined',                  'Strategy',  11),
  ('Campaign goals & KPIs agreed',             'Strategy',  12),
  ('Contract / proposal signed',               'Strategy',  13),
  ('Kick-off call completed',                  'Technical', 14),
  ('Tracking pixels / tags installed',         'Technical', 15),
  ('Conversion tracking verified',             'Technical', 16);

-- Trigger: auto-create onboarding items when a new client is added
create or replace function create_onboarding_items()
returns trigger as $$
begin
  insert into onboarding_items (client_id, item, completed)
  select new.id, item, false
  from onboarding_templates
  order by sort_order;
  return new;
end;
$$ language plpgsql;

create trigger on_client_created
  after insert on clients
  for each row execute procedure create_onboarding_items();

-- Backfill existing clients that have no onboarding items
insert into onboarding_items (client_id, item, completed)
select c.id, t.item, false
from clients c
cross join onboarding_templates t
where not exists (
  select 1 from onboarding_items oi where oi.client_id = c.id
)
order by t.sort_order;

-- Add completed_by column if not present
alter table onboarding_items
  add column if not exists completed_by text,
  add column if not exists category text;

-- Backfill category from template
update onboarding_items oi
set category = t.category
from onboarding_templates t
where oi.item = t.item and oi.category is null;
