import { createSupabaseServerClient } from './supabase-server'
import { Lead, Client, Campaign, Deliverable, HealthAlert } from '@/types'

// ───────────────────────────────────────────────────────────────────────────
// Server-side data access layer.
//
// Every query here runs through the cookie-aware SSR client, so requests are
// made AS the authenticated user and are subject to Supabase Row Level
// Security. Callers of these helpers MUST also run requireUser() (from
// @/lib/auth) in their server component / route to guarantee a session exists.
// ───────────────────────────────────────────────────────────────────────────

async function db() {
  return createSupabaseServerClient()
}

export async function getLeads(): Promise<Lead[]> {
  const { data } = await (await db()).from('leads').select('*').order('created_at', { ascending: false })
  return (data ?? []) as Lead[]
}

export async function getClients(): Promise<Client[]> {
  const { data } = await (await db()).from('clients').select('*').order('created_at', { ascending: false })
  return (data ?? []) as Client[]
}

export async function getCampaigns(clientId?: string): Promise<Campaign[]> {
  let q = (await db()).from('campaigns').select('*').order('start_date', { ascending: false })
  if (clientId) q = q.eq('client_id', clientId)
  const { data } = await q
  return (data ?? []) as Campaign[]
}

export async function getDeliverables(clientId?: string): Promise<Deliverable[]> {
  let q = (await db()).from('deliverables').select('*').order('due_date', { ascending: true })
  if (clientId) q = q.eq('client_id', clientId)
  const { data } = await q
  return (data ?? []) as Deliverable[]
}

export async function getHealthAlerts(): Promise<HealthAlert[]> {
  const { data } = await (await db())
    .from('clients')
    .select('id, company, health_score')
    .lt('health_score', 70)
    .order('health_score', { ascending: true })

  return (data ?? []).map((c: any) => ({
    client_id: c.id,
    client_name: c.company,
    score: c.health_score,
    reason:
      c.health_score < 50
        ? 'Score critically low — check campaigns'
        : 'Score below target — review performance',
    severity: c.health_score < 50 ? 'high' : 'medium',
  }))
}
