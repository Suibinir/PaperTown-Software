-- Social Media Calendar
-- Run in Supabase SQL Editor

create type post_status as enum ('idea', 'draft', 'scheduled', 'published', 'cancelled');
create type post_platform as enum ('Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok', 'Pinterest');

create table social_posts (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  platform post_platform not null,
  status post_status not null default 'idea',
  caption text,
  media_url text,
  hashtags text,
  scheduled_at timestamptz,
  published_at timestamptz,
  notes text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table social_posts enable row level security;
create policy "Team full access" on social_posts for all using (true);

create trigger social_posts_updated_at before update on social_posts
  for each row execute procedure update_updated_at();

-- Sample posts for Drift & Dine (Social client)
insert into social_posts (client_id, platform, status, caption, hashtags, scheduled_at, created_by) values
  ('11111111-0000-0000-0000-000000000001', 'Instagram', 'published', 'Summer is here and so are our new seasonal cocktails 🍹 Come drift with us this weekend.', '#driftanddine #summer #cocktails #london', '2024-06-03 18:00:00+00', 'Agency Admin'),
  ('11111111-0000-0000-0000-000000000001', 'Facebook',  'published', 'We''re thrilled to announce our new weekend brunch menu! Join us every Saturday and Sunday from 10am.', '#brunch #weekend #londoneats', '2024-06-05 09:00:00+00', 'Agency Admin'),
  ('11111111-0000-0000-0000-000000000001', 'Instagram', 'scheduled', 'Behind the scenes: watch our chef prepare the signature drift burger 🍔🔥', '#behindthescenes #chef #foodie', '2024-06-12 12:00:00+00', 'Agency Admin'),
  ('11111111-0000-0000-0000-000000000001', 'LinkedIn',  'scheduled', 'Excited to share we''ve partnered with local farms to source 100% sustainable ingredients.', '#sustainability #localbusiness #hospitality', '2024-06-14 10:00:00+00', 'Agency Admin'),
  ('11111111-0000-0000-0000-000000000001', 'Instagram', 'draft',     'Father''s Day special — treat Dad to an unforgettable Sunday roast 🥩', '#fathersday #sundayroast #londonfood', '2024-06-16 11:00:00+00', 'Agency Admin'),
  ('11111111-0000-0000-0000-000000000001', 'Facebook',  'draft',     'Mid-week deal: 20% off all mains every Wednesday. No code needed!', '#midweekdeal #londoneats #discount', '2024-06-19 17:00:00+00', 'Agency Admin'),
  ('11111111-0000-0000-0000-000000000001', 'Instagram', 'idea',      'Customer spotlight — share a review from a recent guest', '#customerreview #testimonial', '2024-06-24 13:00:00+00', 'Agency Admin'),
  ('11111111-0000-0000-0000-000000000001', 'TikTok',    'idea',      'Quick recipe video: our famous lemon tart in 60 seconds 🍋', '#recipe #tiktokfood #lemontart', '2024-06-26 15:00:00+00', 'Agency Admin'),
  ('11111111-0000-0000-0000-000000000001', 'Instagram', 'idea',      'End of month recap — highlights from June at Drift & Dine ✨', '#monthlyrecap #june', '2024-06-28 18:00:00+00', 'Agency Admin');
