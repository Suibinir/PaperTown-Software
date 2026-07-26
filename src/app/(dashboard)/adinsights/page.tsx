'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MetaAdInsight, Client } from '@/types'
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Eye, MousePointer, DollarSign, BarChart3, CheckCircle, AlertCircle } from 'lucide-react'

function fmt(n: number, type: 'currency' | 'number' | 'percent' | 'roas' = 'number') {
  if (type === 'currency') return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)
  if (type === 'percent')  return `${n.toFixed(2)}%`
  if (type === 'roas')     return `${n.toFixed(2)}x`
  if (n >= 1000000)        return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000)           return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

function StatCard({ label, value, icon: Icon, sub, trend }: {
  label: string; value: string; icon: any; sub?: string; trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-indigo-600" />
        </div>
        {trend && (
          trend === 'up' ? <TrendingUp className="w-4 h-4 text-emerald-500" /> :
          trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-400" /> : null
        )}
      </div>
      <div className="text-2xl font-semibold text-stone-800">{value}</div>
      <div className="text-xs text-stone-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-stone-500 mt-1">{sub}</div>}
    </div>
  )
}

export default function AdInsightsPage() {
  const [insights, setInsights]   = useState<MetaAdInsight[]>([])
  const [clients, setClients]     = useState<Client[]>([])
  const [loading, setLoading]     = useState(true)
  const [syncing, setSyncing]     = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [filterClient, setFilterClient] = useState('all')
  const [filterCampaign, setFilterCampaign] = useState('all')
  const [dateRange, setDateRange] = useState('all')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const [{ data: ins }, { data: cls }] = await Promise.all([
      supabase.from('meta_ad_insights').select('*').order('date_start', { ascending: false }),
      supabase.from('clients').select('*').order('company'),
    ])
    setInsights((ins ?? []) as MetaAdInsight[])
    setClients((cls ?? []) as Client[])
    setLoading(false)
  }

  const triggerSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res  = await fetch('/api/meta-sync')
      const data = await res.json()
      setSyncResult(data)
      if (data.success) await load()
    } catch (e: any) {
      setSyncResult({ message: e.message })
    }
    setSyncing(false)
  }

  // Filter insights
  const cutoff = dateRange === 'all' ? null : (() => { const d = new Date(); d.setDate(d.getDate() - parseInt(dateRange)); return d })();

  const filtered = insights
    .filter(i => filterClient === 'all' || i.client_id === filterClient)
    .filter(i => filterCampaign === 'all' || i.meta_campaign_name === filterCampaign)
    .filter(i => !cutoff || new Date(i.date_start) >= cutoff)

  // Aggregate totals
  const totalSpend       = filtered.reduce((s, i) => s + i.spend, 0)
  const totalImpressions = filtered.reduce((s, i) => s + i.impressions, 0)
  const totalClicks      = filtered.reduce((s, i) => s + i.clicks, 0)
  const totalConversions = filtered.reduce((s, i) => s + i.conversions, 0)
  const totalConvValue   = filtered.reduce((s, i) => s + i.conversion_value, 0)
  const avgCTR           = filtered.length > 0 ? filtered.reduce((s, i) => s + i.ctr, 0) / filtered.length : 0
  const avgCPC           = filtered.length > 0 ? filtered.reduce((s, i) => s + i.cpc, 0) / filtered.length : 0
  const overallROAS      = totalSpend > 0 ? totalConvValue / totalSpend : 0

  // Campaign rollups
  const campaignMap = new Map<string, { name: string; spend: number; impressions: number; clicks: number; conversions: number; convValue: number; days: number }>()
  filtered.forEach(i => {
    const key = i.meta_campaign_id
    const existing = campaignMap.get(key)
    if (existing) {
      existing.spend       += i.spend
      existing.impressions += i.impressions
      existing.clicks      += i.clicks
      existing.conversions += i.conversions
      existing.convValue   += i.conversion_value
      existing.days        += 1
    } else {
      campaignMap.set(key, {
        name: i.meta_campaign_name,
        spend: i.spend,
        impressions: i.impressions,
        clicks: i.clicks,
        conversions: i.conversions,
        convValue: i.conversion_value,
        days: 1,
      })
    }
  })
  const campaigns = [...campaignMap.values()].sort((a, b) => b.spend - a.spend)

  // Daily spend chart data (last 14 days)
  const dailyMap = new Map<string, number>()
  filtered.filter(i => {
    const d = new Date(i.date_start)
    const cutoff14 = new Date(); cutoff14.setDate(cutoff14.getDate() - 14)
    return d >= cutoff14
  }).forEach(i => {
    const key = i.date_start
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + i.spend)
  })
  const dailySpend = [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const maxSpend = Math.max(...dailySpend.map(d => d[1]), 1)

  const uniqueCampaignNames = [...new Set(insights.map(i => i.meta_campaign_name))]
  const lastSync = insights[0]?.synced_at

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
    </div>
  )

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-stone-800">Meta Ads</h1>
            <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">Live data</span>
          </div>
          <p className="text-stone-400 text-sm mt-0.5">
            {lastSync
              ? `Last synced ${new Date(lastSync).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
              : 'Never synced — click Sync Now to fetch data'
            }
          </p>
        </div>
        <button onClick={triggerSync} disabled={syncing}
          className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div className={`rounded-xl p-4 mb-6 border ${syncResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {syncResult.success
              ? <CheckCircle className="w-4 h-4 text-emerald-500" />
              : <AlertCircle className="w-4 h-4 text-amber-500" />
            }
            <p className={`text-sm font-medium ${syncResult.success ? 'text-emerald-800' : 'text-amber-800'}`}>
              {syncResult.success
                ? `Synced ${syncResult.total_synced} data points across ${syncResult.accounts?.length} account(s)`
                : syncResult.message
              }
            </p>
          </div>
          {syncResult.accounts?.map((a: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs ml-6 mt-1">
              {a.error
                ? <span className="text-amber-600">⚠ {a.client}: {a.error}</span>
                : <span className="text-emerald-700">✓ {a.client} — {a.synced} rows · {a.campaigns?.slice(0,2).join(', ')}{a.campaigns?.length > 2 ? ` +${a.campaigns.length - 2} more` : ''}</span>
              }
            </div>
          ))}
        </div>
      )}

      {/* No data state */}
      {insights.length === 0 && !syncing && (
        <div className="bg-white border border-stone-200 rounded-2xl py-16 text-center mb-6">
          <BarChart3 className="w-10 h-10 text-stone-200 mx-auto mb-3" />
          <p className="text-stone-600 font-medium mb-1">No ad data yet</p>
          <p className="text-sm text-stone-400 mb-4">Click "Sync now" to pull data from your Meta Ads account.</p>
          <button onClick={triggerSync}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors mx-auto">
            <RefreshCw className="w-4 h-4" /> Sync now
          </button>
        </div>
      )}

      {insights.length > 0 && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-3 py-1.5 text-stone-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">All clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
            <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-3 py-1.5 text-stone-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">All campaigns</option>
              {uniqueCampaignNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <div className="flex gap-1 ml-auto">
              {['7','14','30'].map(d => (
                <button key={d} onClick={() => setDateRange(d)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${dateRange === d ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* KPI stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Total spend" value={fmt(totalSpend, 'currency')} icon={DollarSign} sub={`last ${dateRange} days`} />
            <StatCard label="Impressions" value={fmt(totalImpressions)} icon={Eye} />
            <StatCard label="Clicks" value={fmt(totalClicks)} icon={MousePointer} sub={`CTR ${fmt(avgCTR, 'percent')}`} />
            <StatCard label="ROAS" value={fmt(overallROAS, 'roas')} icon={TrendingUp}
              trend={overallROAS >= 3 ? 'up' : overallROAS >= 1 ? 'neutral' : 'down'}
              sub={`${fmt(totalConversions)} conversions`} />
          </div>

          {/* Daily spend sparkline */}
          {dailySpend.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-stone-700 mb-4">Daily spend — last 14 days</h2>
              <div className="flex items-end gap-1 h-24">
                {dailySpend.map(([date, spend]) => (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full">
                      <div
                        className="w-full bg-indigo-500 rounded-t-sm hover:bg-indigo-600 transition-colors cursor-pointer"
                        style={{ height: `${Math.max((spend / maxSpend) * 80, 2)}px` }}
                        title={`${date}: ${fmt(spend, 'currency')}`}
                      />
                    </div>
                    <span className="text-xs text-stone-400 hidden group-hover:block absolute -bottom-4 text-center whitespace-nowrap">
                      {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-stone-400 mt-2">
                {dailySpend.length > 0 && (
                  <>
                    <span>{new Date(dailySpend[0][0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    <span>{new Date(dailySpend[dailySpend.length - 1][0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Campaign breakdown table */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="text-sm font-semibold text-stone-700">Campaign breakdown</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-xs text-stone-400 font-medium">
                  <th className="text-left px-5 py-3">Campaign</th>
                  <th className="text-right px-5 py-3">Spend</th>
                  <th className="text-right px-5 py-3">Impressions</th>
                  <th className="text-right px-5 py-3">Clicks</th>
                  <th className="text-right px-5 py-3">Conversions</th>
                  <th className="text-right px-5 py-3">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {campaigns.map((camp, i) => {
                  const roas = camp.spend > 0 ? camp.convValue / camp.spend : 0
                  const pct  = totalSpend > 0 ? (camp.spend / totalSpend) * 100 : 0
                  return (
                    <tr key={i} className="hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-stone-800 text-sm">{camp.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-24 bg-stone-100 rounded-full h-1">
                            <div className="h-1 bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-stone-400">{pct.toFixed(0)}% of spend</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-stone-700">{fmt(camp.spend, 'currency')}</td>
                      <td className="px-5 py-3.5 text-right text-stone-500">{fmt(camp.impressions)}</td>
                      <td className="px-5 py-3.5 text-right text-stone-500">{fmt(camp.clicks)}</td>
                      <td className="px-5 py-3.5 text-right text-stone-500">{camp.conversions}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`font-semibold ${roas >= 3 ? 'text-emerald-600' : roas >= 1 ? 'text-amber-500' : 'text-red-400'}`}>
                          {fmt(roas, 'roas')}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {campaigns.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-stone-400 text-sm">No campaigns in selected period.</td></tr>
                )}
              </tbody>
              {campaigns.length > 0 && (
                <tfoot>
                  <tr className="border-t border-stone-200 bg-stone-50">
                    <td className="px-5 py-3 text-xs font-semibold text-stone-500">TOTAL</td>
                    <td className="px-5 py-3 text-right font-bold text-stone-800">{fmt(totalSpend, 'currency')}</td>
                    <td className="px-5 py-3 text-right font-semibold text-stone-600">{fmt(totalImpressions)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-stone-600">{fmt(totalClicks)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-stone-600">{totalConversions}</td>
                    <td className="px-5 py-3 text-right font-bold">
                      <span className={overallROAS >= 3 ? 'text-emerald-600' : overallROAS >= 1 ? 'text-amber-500' : 'text-red-400'}>
                        {fmt(overallROAS, 'roas')}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  )
}
