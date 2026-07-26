export type LeadStatus = 'new' | 'qualified' | 'proposal' | 'won' | 'lost'
export type ServiceType = 'SEO' | 'PPC' | 'Content' | 'Social' | 'Email' | 'Web'
export type DeliverableStatus = 'not_started' | 'in_progress' | 'review' | 'done'
export type CampaignStatus = 'active' | 'paused' | 'ended'

export interface Lead {
  id: string
  company: string
  contact_name: string
  contact_email: string
  service: ServiceType
  status: LeadStatus
  source: string
  budget?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  company: string
  contact_name: string
  contact_email: string
  contact_phone?: string
  industry?: string
  logo_url?: string
  health_score: number
  onboarding_complete: boolean
  meta_ad_account_id?: string | null
  meta_synced_at?: string | null
  created_at: string
}

export interface Campaign {
  id: string
  client_id: string
  name: string
  service: ServiceType
  status: CampaignStatus
  budget_monthly: number
  spend_to_date: number
  kpi_target: string
  kpi_current: string
  start_date: string
  end_date?: string
}

export interface Deliverable {
  id: string
  campaign_id: string
  client_id: string
  title: string
  type: string
  status: DeliverableStatus
  due_date: string
  assignee?: string
  notes?: string
  client_visible: boolean
}

export interface HealthAlert {
  client_id: string
  client_name: string
  score: number
  reason: string
  severity: 'low' | 'medium' | 'high'
}

export type PostStatus = 'idea' | 'draft' | 'scheduled' | 'published' | 'cancelled'
export type PostPlatform = 'Instagram' | 'Facebook' | 'LinkedIn' | 'Twitter' | 'TikTok' | 'Pinterest'

export interface SocialPost {
  id: string
  client_id: string
  campaign_id?: string | null
  platform: PostPlatform
  status: PostStatus
  caption: string | null
  media_url: string | null
  media_urls: string[]
  hashtags: string | null
  scheduled_at: string | null
  published_at: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type TeamRole = 'admin' | 'account_manager' | 'designer' | 'copywriter' | 'analyst' | 'viewer'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: TeamRole
  avatar_color: string
  active: boolean
  created_at: string
}

export interface ClientAssignment {
  id: string
  client_id: string
  member_id: string
  role: string
  created_at: string
}

export interface VaultCredential {
  id: string
  client_id: string
  label: string
  category: string
  username: string | null
  secret_value: string | null
  url: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MetaAdInsight {
  id: string
  client_id: string | null
  campaign_id: string | null
  meta_campaign_id: string
  meta_campaign_name: string
  meta_adset_id: string
  meta_adset_name: string
  date_start: string
  date_stop: string
  spend: number
  impressions: number
  clicks: number
  reach: number
  cpc: number
  cpm: number
  ctr: number
  conversions: number
  conversion_value: number
  roas: number
  synced_at: string
}

export interface ContentEntry {
  id: string
  client_id: string
  date: string
  content_type: string | null
  content_title: string | null
  purpose: string | null
  content_direction: string | null
  platform: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  data: any
  recipient_role: string | null
  read: boolean
  created_at: string
}

export interface InvoiceLine {
  description: string
  qty: number
  rate: number
  amount: number
}

export interface Invoice {
  id: string
  client_id: string | null
  issue_date: string
  due_date: string | null
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'
  pay_type: 'final' | 'advance' | 'balance'
  advance_pct: number
  lines: InvoiceLine[]
  subtotal: number
  vat: number
  total: number
  amount_due: number
  notes: string | null
  txn_id: string | null
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  date: string
  description: string
  category: string | null
  vendor_id: string | null
  client_id: string | null
  amount: number
  receipt_url: string | null
  notes: string | null
  created_at: string
}

export interface Vendor {
  id: string
  name: string
  category: string | null
  email: string | null
  phone: string | null
  terms: string
  ytd: number
  outstanding: number
  created_at: string
}

export interface Staff {
  id: string
  name: string
  role: string | null
  email: string | null
  salary: number
  start_date: string | null
  active: boolean
  created_at: string
}

export interface FinanceSettings {
  currency: string
  tax_rate: number
  vat_rate: number
  pay_terms: number
  inv_prefix: string
  next_inv_num: number
  inv_note: string | null
  late_fee: number
  agency_phone: string | null
  agency_email: string | null
  agency_website: string | null
  agency_address: string | null
}

export interface BrandColor {
  hex: string
  name: string
}

export interface BrandGuidelines {
  id: string
  client_id: string
  logo_url: string | null
  post_examples: string[]
  primary_font: string | null
  secondary_font: string | null
  colors: BrandColor[]
  notes: string | null
  updated_at: string
}
