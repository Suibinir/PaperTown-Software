import { Lead, Client, Campaign, Deliverable, HealthAlert } from '@/types'

export const mockLeads: Lead[] = [
  { id: '1', company: 'Bloom & Co', contact_name: 'Sarah Chen', contact_email: 'sarah@bloom.co', service: 'SEO', status: 'new', source: 'Referral', budget: 3000, created_at: '2024-06-01', updated_at: '2024-06-01' },
  { id: '2', company: 'Vertex Labs', contact_name: 'James Okafor', contact_email: 'james@vertexlabs.io', service: 'PPC', status: 'qualified', source: 'LinkedIn', budget: 8000, created_at: '2024-06-02', updated_at: '2024-06-03' },
  { id: '3', company: 'Nomad Goods', contact_name: 'Priya Singh', contact_email: 'priya@nomadgoods.com', service: 'Content', status: 'proposal', source: 'Website', budget: 4500, created_at: '2024-05-28', updated_at: '2024-06-04' },
  { id: '4', company: 'Drift & Dine', contact_name: 'Marco Rossi', contact_email: 'marco@driftdine.com', service: 'Social', status: 'won', source: 'Cold Outreach', budget: 2500, created_at: '2024-05-20', updated_at: '2024-06-01' },
  { id: '5', company: 'Kova Health', contact_name: 'Aisha Williams', contact_email: 'aisha@kovahealth.com', service: 'SEO', status: 'qualified', source: 'Referral', budget: 6000, created_at: '2024-06-05', updated_at: '2024-06-05' },
  { id: '6', company: 'Solari Studio', contact_name: 'Tom Blake', contact_email: 'tom@solari.studio', service: 'Web', status: 'proposal', source: 'Instagram', budget: 12000, created_at: '2024-06-03', updated_at: '2024-06-06' },
  { id: '7', company: 'Pebble Pets', contact_name: 'Lin Zhao', contact_email: 'lin@pebblepets.com', service: 'Email', status: 'lost', source: 'Website', budget: 1500, created_at: '2024-05-15', updated_at: '2024-05-30' },
]

export const mockClients: Client[] = [
  { id: 'c1', company: 'Drift & Dine', contact_name: 'Marco Rossi', contact_email: 'marco@driftdine.com', contact_phone: '+44 7700 900123', industry: 'Hospitality', health_score: 87, onboarding_complete: true, created_at: '2024-04-01' },
  { id: 'c2', company: 'Helix Finance', contact_name: 'Nina Patel', contact_email: 'nina@helixfinance.com', contact_phone: '+44 7700 900456', industry: 'Finance', health_score: 42, onboarding_complete: true, created_at: '2024-02-15' },
  { id: 'c3', company: 'Orchard Digital', contact_name: 'Ed Murphy', contact_email: 'ed@orcharddigital.co', industry: 'Tech', health_score: 91, onboarding_complete: true, created_at: '2024-01-10' },
  { id: 'c4', company: 'Wren & Root', contact_name: 'Sophie Larkin', contact_email: 'sophie@wrenroot.com', industry: 'Retail', health_score: 65, onboarding_complete: false, created_at: '2024-06-01' },
]

export const mockCampaigns: Campaign[] = [
  { id: 'camp1', client_id: 'c1', name: 'Summer SEO Push', service: 'SEO', status: 'active', budget_monthly: 2500, spend_to_date: 1800, kpi_target: 'Top 3 for 10 keywords', kpi_current: '7 keywords in top 10', start_date: '2024-04-01' },
  { id: 'camp2', client_id: 'c1', name: 'Meta Retargeting', service: 'PPC', status: 'active', budget_monthly: 3000, spend_to_date: 2400, kpi_target: 'ROAS 4x', kpi_current: 'ROAS 3.8x', start_date: '2024-05-01' },
  { id: 'camp3', client_id: 'c2', name: 'Google Ads – Lead Gen', service: 'PPC', status: 'active', budget_monthly: 6000, spend_to_date: 6100, kpi_target: '50 leads/mo', kpi_current: '18 leads/mo', start_date: '2024-02-15' },
  { id: 'camp4', client_id: 'c3', name: 'Content Authority', service: 'Content', status: 'active', budget_monthly: 4000, spend_to_date: 1200, kpi_target: '8 articles/mo', kpi_current: '8 articles/mo', start_date: '2024-01-10' },
]

export const mockDeliverables: Deliverable[] = [
  { id: 'd1', campaign_id: 'camp1', client_id: 'c1', title: 'June SEO Report', type: 'Report', status: 'in_progress', due_date: '2024-06-30', assignee: 'You', client_visible: true },
  { id: 'd2', campaign_id: 'camp2', client_id: 'c1', title: 'Q2 Ad Creative Set', type: 'Ad Copy', status: 'review', due_date: '2024-06-15', assignee: 'You', client_visible: true },
  { id: 'd3', campaign_id: 'camp3', client_id: 'c2', title: 'Landing Page Copy', type: 'Copywriting', status: 'not_started', due_date: '2024-06-20', assignee: 'You', client_visible: false },
  { id: 'd4', campaign_id: 'camp4', client_id: 'c3', title: 'June Content Pack (8 articles)', type: 'Content', status: 'done', due_date: '2024-06-10', assignee: 'You', client_visible: true },
  { id: 'd5', campaign_id: 'camp1', client_id: 'c1', title: 'Technical SEO Audit', type: 'Audit', status: 'done', due_date: '2024-06-05', assignee: 'You', client_visible: true },
  { id: 'd6', campaign_id: 'camp3', client_id: 'c2', title: 'Keyword Research Doc', type: 'Strategy', status: 'in_progress', due_date: '2024-06-18', assignee: 'You', client_visible: false },
]

export const mockAlerts: HealthAlert[] = [
  { client_id: 'c2', client_name: 'Helix Finance', score: 42, reason: 'PPC spend 2% over budget; leads 64% below target', severity: 'high' },
  { client_id: 'c4', client_name: 'Wren & Root', score: 65, reason: 'Onboarding incomplete — missing GA4 access', severity: 'medium' },
]
