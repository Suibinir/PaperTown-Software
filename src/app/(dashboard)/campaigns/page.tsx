'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Campaign, Client } from '@/types'
import { statusColor, formatCurrency } from '@/lib/utils'
import { Plus, TrendingUp, Loader2, Trash2, X } from 'lucide-react'
import AddCampaignModal from '@/components/ui/AddCampaignModal'

const serviceColors: Record<string, string> = {
  SEO: 'bg-violet-50 text-violet-600 border-violet-100',
  PPC: 'bg-blue-50 text-blue-600 border-blue-100',
  Content: 'bg-amber-50 text-amber-600 border-amber-100',
  Social: 'bg-pink-50 text-pink-600 border-pink-100',
  Email: 'bg-teal-50 text-teal-600 border-teal-100',
  Web: 'bg-indigo-50 text-indigo-600 border-indigo-100',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('campaigns').select('*').order('start_date', { ascending: false }),
      supabase.from('clients').select('*'),
    ]).then(([camp, cls]) => {
      setCampaigns((camp.data ?? []) as Campaign[])
      setClients((cls.data ?? []) as Client[])
      setLoading(false)
    })
  }, [])

  const totalBudget = campaigns.reduce((s, c) => s + c.budget_monthly, 0)
  const totalSpend = campaigns.reduce((s, c) => s + c.spend_to_date, 0)

  const deleteCampaign = async (campaign: Campaign) => {
    setDeleting(true)
    await supabase.from('campaigns').delete().eq('id', campaign.id)
    setCampaigns(prev => prev.filter(c => c.id !== campaign.id))
    setDeleting(false)
    setDeleteTarget(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
    </div>
  )

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {showModal && (
        <AddCampaignModal
          onClose={() => setShowModal(false)}
          onAdded={c => setCampaigns(prev => [c, ...prev])}
        />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 z-10 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-stone-800">Delete campaign</h2>
              <button onClick={() => setDeleteTarget(null)}><X className="w-4 h-4 text-stone-400" /></button>
            </div>
            <p className="text-sm text-stone-600 mb-4">
              Delete <span className="font-semibold">{deleteTarget.name}</span>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 text-sm text-stone-500 border border-stone-200 rounded-lg py-2 hover:bg-stone-50">Cancel</button>
              <button onClick={() => deleteCampaign(deleteTarget)} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-medium bg-red-500 text-white rounded-lg py-2 hover:bg-red-600 disabled:opacity-60">
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Campaigns</h1>
          <p className="text-stone-400 text-sm mt-0.5">
            {formatCurrency(totalBudget)}/mo budget · {formatCurrency(totalSpend)} spent to date
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> New campaign
        </button>
      </div>

      <div className="space-y-3">
        {campaigns.length === 0 && (
          <div className="text-center text-stone-400 text-sm py-16">No campaigns yet. Create your first one above.</div>
        )}
        {campaigns.map(campaign => {
          const client = clients.find(c => c.id === campaign.client_id)
          const spendPct = campaign.budget_monthly > 0
            ? Math.round((campaign.spend_to_date / campaign.budget_monthly) * 100)
            : 0
          const overBudget = campaign.spend_to_date > campaign.budget_monthly

          return (
            <div key={campaign.id} className="bg-white border border-stone-200 rounded-2xl p-5 hover:border-stone-300 transition-colors">
              <div className="flex items-start gap-4">
                <div className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${serviceColors[campaign.service] ?? 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                  {campaign.service}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-stone-800">{campaign.name}</h2>
                      <p className="text-xs text-stone-400 mt-0.5">{client?.company ?? '—'} · started {campaign.start_date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                      <button onClick={() => setDeleteTarget(campaign)}
                        className="text-stone-300 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-stone-400">Budget</span>
                        <span className={`font-medium ${overBudget ? 'text-red-500' : 'text-stone-600'}`}>
                          {spendPct}%
                          {overBudget && <TrendingUp className="w-3 h-3 inline ml-0.5 text-red-500" />}
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${overBudget ? 'bg-red-400' : 'bg-indigo-400'}`}
                          style={{ width: `${Math.min(spendPct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-stone-400 mt-1">
                        <span>{formatCurrency(campaign.spend_to_date)}</span>
                        <span>{formatCurrency(campaign.budget_monthly)}</span>
                      </div>
                    </div>

                    <div className="col-span-2 bg-stone-50 rounded-xl px-4 py-2.5">
                      <p className="text-xs text-stone-400 mb-1">KPI</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-stone-500">
                          Target: <span className="text-stone-700 font-medium">{campaign.kpi_target ?? '—'}</span>
                        </p>
                        <p className="text-xs text-stone-500">
                          Now: <span className="text-stone-700 font-medium">{campaign.kpi_current ?? '—'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
