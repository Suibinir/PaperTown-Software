-- Social Media Image Storage Setup
-- Run in Supabase SQL Editor

-- Create storage bucket for social post media
insert into storage.buckets (id, name, public)
values ('social-media', 'social-media', true)
on conflict (id) do nothing;

-- Allow authenticated users (team) to upload
create policy "Team can upload social media"
  on storage.objects for insert
  with check (bucket_id = 'social-media');

-- Allow public read (so images show in portal and calendar)
create policy "Public can read social media"
  on storage.objects for select
  using (bucket_id = 'social-media');

-- Allow team to delete their uploads
create policy "Team can delete social media"
  on storage.objects for delete
  using (bucket_id = 'social-media');

-- Add media_urls array column to social_posts for multiple images
alter table social_posts
  add column if not exists media_urls text[] default '{}';
