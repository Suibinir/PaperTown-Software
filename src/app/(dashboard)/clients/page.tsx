'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Client, Campaign, Deliverable } from '@/types'
import { healthColor, statusColor, formatCurrency, formatDate } from '@/lib/utils'
import { Plus, CheckCircle, AlertCircle, Loader2, BarChart3, Trash2, X } from 'lucide-react'
import AddClientModal from '@/components/ui/AddClientModal'
import MetaAccountModal from '@/components/ui/MetaAccountModal'

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients]         = useState<Client[]>([])
  const [campaigns, setCampaigns]     = useState<Campaign[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading]         = useState(true)
  const [showAddModal, setShowAddModal]   = useState(false)
  const [metaTarget, setMetaTarget]       = useState<Client | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<Client | null>(null)
  const [deleting, setDeleting]           = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('campaigns').select('*'),
      supabase.from('deliverables').select('*'),
    ]).then(([c, camp, del]) => {
      setClients((c.data ?? []) as Client[])
      setCampaigns((camp.data ?? []) as Campaign[])
      setDeliverables((del.data ?? []) as Deliverable[])
      setLoading(false)
    })
  }, [])

  const deleteClient = async (client: Client) => {
    setDeleting(true)
    await supabase.from('campaigns').delete().eq('client_id', client.id)
    await supabase.from('deliverables').delete().eq('client_id', client.id)
    await supabase.from('content_calendar').delete().eq('client_id', client.id)
    await supabase.from('meta_ad_insights').delete().eq('client_id', client.id)
    await supabase.from('invoices').delete().eq('client_id', client.id)
    await supabase.from('clients').delete().eq('id', client.id)
    setClients(prev => prev.filter(c => c.id !== client.id))
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
      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onAdded={client => setClients(prev => [client, ...prev])}
        />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 z-10 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-stone-800">Delete client</h2>
              <button onClick={() => setDeleteTarget(null)}><X className="w-4 h-4 text-stone-400" /></button>
            </div>
            <p className="text-sm text-stone-600 mb-1">
              Are you sure you want to delete <span className="font-semibold">{deleteTarget.company}</span>?
            </p>
            <p className="text-xs text-stone-400 mb-4">
              This will permanently delete this client and all related campaigns, deliverables, invoices, and content calendar entries. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 text-sm text-stone-500 border border-stone-200 rounded-lg py-2 hover:bg-stone-50">Cancel</button>
              <button onClick={() => deleteClient(deleteTarget)} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-medium bg-red-500 text-white rounded-lg py-2 hover:bg-red-600 disabled:opacity-60">
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {metaTarget && (
        <MetaAccountModal
          clientId={metaTarget.id}
          clientName={metaTarget.company}
          currentAccountId={metaTarget.meta_ad_account_id}
          onClose={() => setMetaTarget(null)}
          onSaved={accountId => {
            setClients(prev => prev.map(c =>
              c.id === metaTarget.id ? { ...c, meta_ad_account_id: accountId } : c
            ))
            setMetaTarget(null)
          }}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Clients</h1>
          <p className="text-stone-400 text-sm mt-0.5">{clients.length} accounts</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Add client
        </button>
      </div>

      <div className="space-y-4">
        {clients.length === 0 && (
          <div className="text-center text-stone-400 text-sm py-16">No clients yet. Add your first client above.</div>
        )}
        {clients.map(client => {
          const clientCampaigns    = campaigns.filter(c => c.client_id === client.id)
          const clientDeliverables = deliverables.filter(d => d.client_id === client.id)
          const pending            = clientDeliverables.filter(d => d.status !== 'done').length

          return (
            <div key={client.id} onClick={() => router.push(`/clients/${client.id}`)} className="bg-white border border-stone-200 rounded-2xl p-6 hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                    {client.company[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-stone-800">{client.company}</h2>
                      {client.onboarding_complete
                        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        : <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Onboarding incomplete
                          </span>
                      }
                      {/* Meta Ads badge */}
                      {client.meta_ad_account_id ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setMetaTarget(client) }}
                          className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-blue-100 transition-colors"
                        >
                          <BarChart3 className="w-3 h-3" /> Meta connected
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setMetaTarget(client) }}
                          className="text-xs bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-stone-200 transition-colors"
                        >
                          <BarChart3 className="w-3 h-3" /> Connect Meta Ads
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {client.contact_name} · {client.contact_email}{client.industry ? ` · ${client.industry}` : ''}
                    </p>
                    {client.meta_ad_account_id && (
                      <p className="text-xs text-stone-300 mt-0.5 font-mono">{client.meta_ad_account_id}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${healthColor(client.health_score)}`}>{client.health_score}</div>
                    <div className="text-xs text-stone-400">health score</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(client) }}
                    className="text-stone-300 hover:text-red-400 transition-colors mt-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="w-full bg-stone-100 rounded-full h-1.5 mb-4">
                  <div
                    className={`h-1.5 rounded-full ${client.health_score >= 75 ? 'bg-emerald-400' : client.health_score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${client.health_score}%` }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-stone-50 rounded-xl p-3">
                    <div className="text-lg font-semibold text-stone-700">{clientCampaigns.length}</div>
                    <div className="text-xs text-stone-400">campaigns</div>
                  </div>
                  <div className="bg-stone-50 rounded-xl p-3">
                    <div className="text-lg font-semibold text-stone-700">
                      {formatCurrency(clientCampaigns.reduce((s, c) => s + c.budget_monthly, 0))}
                    </div>
                    <div className="text-xs text-stone-400">monthly budget</div>
                  </div>
                  <div className="bg-stone-50 rounded-xl p-3">
                    <div className="text-lg font-semibold text-stone-700">{pending}</div>
                    <div className="text-xs text-stone-400">open tasks</div>
                  </div>
                  <div className="bg-stone-50 rounded-xl p-3">
                    <div className="text-xs text-stone-500 font-medium">Since</div>
                    <div className="text-sm font-medium text-stone-700">{formatDate(client.created_at)}</div>
                  </div>
                </div>
              </div>

              {clientCampaigns.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-xs font-medium text-stone-500 mb-2">Campaigns</p>
                  <div className="flex flex-wrap gap-2">
                    {clientCampaigns.map(c => (
                      <span key={c.id} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColor(c.status)}`}>
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
