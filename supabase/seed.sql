-- Seed data for AgencyOS
-- Run this AFTER schema.sql in the Supabase SQL Editor

-- Clients
insert into clients (id, company, contact_name, contact_email, contact_phone, industry, health_score, onboarding_complete, created_at) values
  ('11111111-0000-0000-0000-000000000001', 'Drift & Dine',     'Marco Rossi',   'marco@driftdine.com',   '+44 7700 900123', 'Hospitality', 87, true,  '2024-04-01'),
  ('11111111-0000-0000-0000-000000000002', 'Helix Finance',    'Nina Patel',    'nina@helixfinance.com', '+44 7700 900456', 'Finance',     42, true,  '2024-02-15'),
  ('11111111-0000-0000-0000-000000000003', 'Orchard Digital',  'Ed Murphy',     'ed@orcharddigital.co',  null,              'Tech',        91, true,  '2024-01-10'),
  ('11111111-0000-0000-0000-000000000004', 'Wren & Root',      'Sophie Larkin', 'sophie@wrenroot.com',   null,              'Retail',      65, false, '2024-06-01');

-- Campaigns
insert into campaigns (id, client_id, name, service, status, budget_monthly, spend_to_date, kpi_target, kpi_current, start_date) values
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Summer SEO Push',      'SEO',     'active', 2500, 1800, 'Top 3 for 10 keywords', '7 keywords in top 10', '2024-04-01'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Meta Retargeting',     'PPC',     'active', 3000, 2400, 'ROAS 4x',               'ROAS 3.8x',            '2024-05-01'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 'Google Ads – Lead Gen','PPC',     'active', 6000, 6100, '50 leads/mo',           '18 leads/mo',          '2024-02-15'),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003', 'Content Authority',    'Content', 'active', 4000, 1200, '8 articles/mo',         '8 articles/mo',        '2024-01-10');

-- Deliverables
insert into deliverables (id, campaign_id, client_id, title, type, status, due_date, assignee, client_visible) values
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'June SEO Report',              'Report',      'in_progress', '2024-06-30', 'Agency Admin', true),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Q2 Ad Creative Set',           'Ad Copy',     'review',      '2024-06-15', 'Agency Admin', true),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 'Landing Page Copy',            'Copywriting', 'not_started', '2024-06-20', 'Agency Admin', false),
  ('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003', 'June Content Pack (8 articles)','Content',    'done',        '2024-06-10', 'Agency Admin', true),
  ('33333333-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Technical SEO Audit',          'Audit',       'done',        '2024-06-05', 'Agency Admin', true),
  ('33333333-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 'Keyword Research Doc',         'Strategy',    'in_progress', '2024-06-18', 'Agency Admin', false);

-- Leads
insert into leads (company, contact_name, contact_email, service, status, source, budget) values
  ('Bloom & Co',     'Sarah Chen',    'sarah@bloom.co',           'SEO',     'new',       'Referral',      3000),
  ('Vertex Labs',    'James Okafor',  'james@vertexlabs.io',      'PPC',     'qualified', 'LinkedIn',      8000),
  ('Nomad Goods',    'Priya Singh',   'priya@nomadgoods.com',     'Content', 'proposal',  'Website',       4500),
  ('Drift & Dine',   'Marco Rossi',   'marco@driftdine.com',      'Social',  'won',       'Cold Outreach', 2500),
  ('Kova Health',    'Aisha Williams','aisha@kovahealth.com',      'SEO',     'qualified', 'Referral',      6000),
  ('Solari Studio',  'Tom Blake',     'tom@solari.studio',        'Web',     'proposal',  'Instagram',     12000),
  ('Pebble Pets',    'Lin Zhao',      'lin@pebblepets.com',       'Email',   'lost',      'Website',       1500);

-- Sample comms log
insert into comms_log (client_id, channel, direction, subject, logged_by) values
  ('11111111-0000-0000-0000-000000000001', 'email', 'outbound', 'June campaign update', 'Agency Admin'),
  ('11111111-0000-0000-0000-000000000002', 'call',  'inbound',  'Performance concerns', 'Agency Admin'),
  ('11111111-0000-0000-0000-000000000003', 'slack', 'outbound', 'Content pack delivered','Agency Admin');

-- Sample onboarding items for Wren & Root (incomplete)
insert into onboarding_items (client_id, item, completed) values
  ('11111111-0000-0000-0000-000000000004', 'Brand guidelines received', true),
  ('11111111-0000-0000-0000-000000000004', 'GA4 access granted', false),
  ('11111111-0000-0000-0000-000000000004', 'Google Search Console access', false),
  ('11111111-0000-0000-0000-000000000004', 'Ad account access (Meta)', false);
