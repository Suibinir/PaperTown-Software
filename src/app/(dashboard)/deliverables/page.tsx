'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Deliverable, DeliverableStatus, Client } from '@/types'
import { statusColor } from '@/lib/utils'
import { Plus, Eye, EyeOff, CheckCircle, Loader2, Trash2 } from 'lucide-react'
import AddDeliverableModal from '@/components/ui/AddDeliverableModal'

const statuses: DeliverableStatus[] = ['not_started', 'in_progress', 'review', 'done']

export default function DeliverablesPage() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [filter, setFilter] = useState<DeliverableStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: dels }, { data: cls }] = await Promise.all([
        supabase.from('deliverables').select('*').order('due_date'),
        supabase.from('clients').select('*'),
      ])
      setDeliverables((dels ?? []) as Deliverable[])
      setClients((cls ?? []) as Client[])
      setLoading(false)
    }
    load()
  }, [])

  const advance = async (id: string, currentStatus: DeliverableStatus) => {
    const idx = statuses.indexOf(currentStatus)
    const next = statuses[Math.min(idx + 1, statuses.length - 1)]
    setAdvancing(id)
    await supabase.from('deliverables').update({ status: next, updated_at: new Date().toISOString() }).eq('id', id)
    setDeliverables(prev => prev.map(d => d.id === id ? { ...d, status: next } : d))
    setAdvancing(null)
  }

  const filtered = filter === 'all' ? deliverables : deliverables.filter(d => d.status === filter)
  const done = deliverables.filter(d => d.status === 'done').length

  const deleteDeliverable = async (id: string) => {
    setDeletingId(id)
    await supabase.from('deliverables').delete().eq('id', id)
    setDeliverables(prev => prev.filter(d => d.id !== id))
    setDeletingId(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
    </div>
  )

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {showModal && (
        <AddDeliverableModal
          onClose={() => setShowModal(false)}
          onAdded={d => setDeliverables(prev => [...prev, d].sort((a, b) => a.due_date.localeCompare(b.due_date)))}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Deliverables</h1>
          <p className="text-stone-400 text-sm mt-0.5">{done}/{deliverables.length} complete</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Add deliverable
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', ...statuses] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${filter === s ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
            {s === 'all' ? `All (${deliverables.length})` : `${s.replace('_', ' ')} (${deliverables.filter(d => d.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="mb-6 bg-white border border-stone-200 rounded-xl p-4">
        <div className="flex justify-between text-xs text-stone-400 mb-2">
          <span>Overall progress</span>
          <span>{deliverables.length > 0 ? Math.round((done / deliverables.length) * 100) : 0}%</span>
        </div>
        <div className="w-full bg-stone-100 rounded-full h-2">
          <div className="h-2 rounded-full bg-indigo-500 transition-all"
            style={{ width: `${deliverables.length > 0 ? (done / deliverables.length) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-xs text-stone-400 font-medium">
              <th className="text-left px-5 py-3">Deliverable</th>
              <th className="text-left px-5 py-3">Client</th>
              <th className="text-left px-5 py-3">Type</th>
              <th className="text-left px-5 py-3">Due</th>
              <th className="text-left px-5 py-3">Visible</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map(d => {
              const client = clients.find(c => c.id === d.client_id)
              const isOverdue = d.status !== 'done' && new Date(d.due_date) < new Date()
              const isAdvancing = advancing === d.id
              return (
                <tr key={d.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-stone-800">{d.title}</td>
                  <td className="px-5 py-3.5 text-stone-500">{client?.company ?? '—'}</td>
                  <td className="px-5 py-3.5 text-stone-400">{d.type}</td>
                  <td className={`px-5 py-3.5 text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-stone-400'}`}>
                    {isOverdue && '⚠ '}{d.due_date}
                  </td>
                  <td className="px-5 py-3.5">
                    {d.client_visible ? <Eye className="w-4 h-4 text-indigo-400" /> : <EyeOff className="w-4 h-4 text-stone-300" />}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(d.status)}`}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {d.status !== 'done' && (
                      <button onClick={() => advance(d.id, d.status)} disabled={isAdvancing}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors disabled:opacity-40">
                        {isAdvancing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Advance →'}
                      </button>
                    )}
                    {d.status === 'done' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  </td>
                  <td className="px-2 py-3.5 text-center">
                    <button onClick={() => deleteDeliverable(d.id)} disabled={deletingId === d.id}
                      className="text-stone-300 hover:text-red-400 transition-colors">
                      {deletingId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-stone-400 text-sm">No deliverables found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
