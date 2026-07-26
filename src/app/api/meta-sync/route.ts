import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const META_API = 'https://graph.facebook.com/v19.0'

interface MetaInsight {
  campaign_id: string
  campaign_name: string
  adset_id?: string
  adset_name?: string
  date_start: string
  date_stop: string
  spend: string
  impressions: string
  clicks: string
  reach: string
  cpc: string
  cpm: string
  ctr: string
  actions?: { action_type: string; value: string }[]
  action_values?: { action_type: string; value: string }[]
}

function getConversions(actions?: MetaInsight['actions']): number {
  if (!actions) return 0
  const conv = actions.find(a =>
    ['purchase', 'offsite_conversion.fb_pixel_purchase', 'lead'].includes(a.action_type)
  )
  return conv ? parseInt(conv.value) : 0
}

function getConversionValue(actionValues?: MetaInsight['action_values']): number {
  if (!actionValues) return 0
  const val = actionValues.find(a =>
    ['purchase', 'offsite_conversion.fb_pixel_purchase'].includes(a.action_type)
  )
  return val ? parseFloat(val.value) : 0
}

async function fetchInsights(accountId: string, token: string): Promise<MetaInsight[]> {
  const fields = [
    'campaign_id', 'campaign_name', 'adset_id', 'adset_name',
    'spend', 'impressions', 'clicks', 'reach', 'cpc', 'cpm', 'ctr',
    'actions', 'action_values'
  ].join(',')

  const results: MetaInsight[] = []

  // Try monthly breakdown first
  const url = `${META_API}/${accountId}/insights?` + new URLSearchParams({
    access_token: token,
    fields,
    level: 'adset',
    date_preset: 'maximum',
    time_increment: 'monthly',
    limit: '500',
  })

  let nextUrl: string | null = url
  while (nextUrl) {
    const res: Response = await fetch(nextUrl)
    const json: any     = await res.json()
    if (json.error) throw new Error(json.error.message)
    results.push(...(json.data ?? []))
    nextUrl = json.paging?.next ?? null
  }

  if (results.length > 0) return results

  // Fallback: campaign-level lifetime totals
  const url2 = `${META_API}/${accountId}/insights?` + new URLSearchParams({
    access_token: token,
    fields: fields.replace('adset_id,adset_name,', ''),
    level: 'campaign',
    date_preset: 'maximum',
    limit: '500',
  })

  let nextUrl2: string | null = url2
  while (nextUrl2) {
    const res: Response = await fetch(nextUrl2)
    const json: any     = await res.json()
    if (json.error) throw new Error(json.error.message)
    results.push(...(json.data ?? []))
    nextUrl2 = json.paging?.next ?? null
  }

  return results
}

export async function GET(request: NextRequest) {
  const token          = process.env.META_ACCESS_TOKEN
  const defaultAccount = process.env.META_AD_ACCOUNT_ID

  if (!token) {
    return NextResponse.json({ error: 'Missing META_ACCESS_TOKEN in .env.local' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get all clients that have a Meta account ID set
  const { data: clients } = await supabase
    .from('clients')
    .select('id, company, meta_ad_account_id')

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, client_id, service')

  // Build list of accounts to sync:
  // - clients with their own meta_ad_account_id
  // - default account from env (assigned to no specific client if not already covered)
  const accountsToSync: { accountId: string; clientId: string | null; clientName: string }[] = []

  clients?.forEach(client => {
    if (client.meta_ad_account_id) {
      accountsToSync.push({
        accountId: client.meta_ad_account_id,
        clientId: client.id,
        clientName: client.company,
      })
    }
  })

  // Add default account if set and not already covered by a client
  if (defaultAccount) {
    const alreadyCovered = accountsToSync.some(a => a.accountId === defaultAccount)
    if (!alreadyCovered) {
      accountsToSync.push({ accountId: defaultAccount, clientId: null, clientName: 'Default account' })
    }
  }

  if (accountsToSync.length === 0) {
    return NextResponse.json({
      message: 'No ad accounts configured. Set META_AD_ACCOUNT_ID in .env.local or add Meta account IDs to client profiles.',
    })
  }

  const results: { account: string; client: string; synced: number; campaigns: string[]; error?: string }[] = []

  for (const account of accountsToSync) {
    try {
      const insights = await fetchInsights(account.accountId, token)

      if (insights.length === 0) {
        results.push({ account: account.accountId, client: account.clientName, synced: 0, campaigns: [], error: 'No data returned' })
        continue
      }

      const rows = insights.map(insight => {
        const spend     = parseFloat(insight.spend ?? '0')
        const convValue = getConversionValue(insight.action_values)
        const roas      = spend > 0 ? convValue / spend : 0

        // Match to internal campaign by name
        const matchedCampaign = campaigns?.find(c =>
          c.client_id === account.clientId &&
          insight.campaign_name.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
        )

        return {
          client_id:          account.clientId,
          campaign_id:        matchedCampaign?.id ?? null,
          meta_campaign_id:   insight.campaign_id,
          meta_campaign_name: insight.campaign_name,
          meta_adset_id:      insight.adset_id ?? insight.campaign_id,
          meta_adset_name:    insight.adset_name ?? insight.campaign_name,
          date_start:         insight.date_start,
          date_stop:          insight.date_stop,
          spend,
          impressions:        parseInt(insight.impressions ?? '0'),
          clicks:             parseInt(insight.clicks ?? '0'),
          reach:              parseInt(insight.reach ?? '0'),
          cpc:                parseFloat(insight.cpc ?? '0'),
          cpm:                parseFloat(insight.cpm ?? '0'),
          ctr:                parseFloat(insight.ctr ?? '0'),
          conversions:        getConversions(insight.actions),
          conversion_value:   convValue,
          roas:               Math.round(roas * 100) / 100,
          synced_at:          new Date().toISOString(),
        }
      })

      await supabase.from('meta_ad_insights')
        .upsert(rows, { onConflict: 'meta_campaign_id,date_start,date_stop' })

      // Update client sync timestamp
      if (account.clientId) {
        await supabase.from('clients')
          .update({ meta_synced_at: new Date().toISOString() })
          .eq('id', account.clientId)
      }

      results.push({
        account: account.accountId,
        client: account.clientName,
        synced: rows.length,
        campaigns: [...new Set(insights.map(i => i.campaign_name))],
      })

    } catch (err: any) {
      results.push({
        account: account.accountId,
        client: account.clientName,
        synced: 0,
        campaigns: [],
        error: err.message,
      })
    }
  }

  const totalSynced = results.reduce((s, r) => s + r.synced, 0)
  const anySuccess  = results.some(r => r.synced > 0)

  return NextResponse.json({
    success: anySuccess,
    total_synced: totalSynced,
    accounts: results,
  })
}
