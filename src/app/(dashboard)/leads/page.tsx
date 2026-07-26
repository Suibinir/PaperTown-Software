'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Lead, LeadStatus } from '@/types'
import { statusColor, formatCurrency } from '@/lib/utils'
import { Plus, Mail, Loader2 } from 'lucide-react'
import AddLeadModal from '@/components/ui/AddLeadModal'

const columns: { id: LeadStatus; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
]

const serviceColors: Record<string, string> = {
  SEO: 'bg-violet-50 text-violet-600',
  PPC: 'bg-blue-50 text-blue-600',
  Content: 'bg-amber-50 text-amber-600',
  Social: 'bg-pink-50 text-pink-600',
  Email: 'bg-teal-50 text-teal-600',
  Web: 'bg-indigo-50 text-indigo-600',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    supabase.from('leads').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setLeads((data ?? []) as Lead[]); setLoading(false) })
  }, [])

  const onDragStart = (id: string) => setDragging(id)

  const onDrop = async (status: LeadStatus) => {
    if (!dragging) return
    const prev = leads
    setLeads(l => l.map(x => x.id === dragging ? { ...x, status } : x))
    const { error } = await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', dragging)
    if (error) setLeads(prev)
    setDragging(null)
  }

  const totalValue = leads.filter(l => l.status !== 'lost').reduce((s, l) => s + (l.budget || 0), 0)
  const wonValue = leads.filter(l => l.status === 'won').reduce((s, l) => s + (l.budget || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
    </div>
  )

  return (
    <div className="p-8">
      {showModal && (
        <AddLeadModal
          onClose={() => setShowModal(false)}
          onAdded={lead => setLeads(prev => [lead, ...prev])}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Lead pipeline</h1>
          <p className="text-stone-400 text-sm mt-0.5">{formatCurrency(totalValue)} pipeline · {formatCurrency(wonValue)} won</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Add lead
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => {
          const colLeads = leads.filter(l => l.status === col.id)
          const colValue = colLeads.reduce((s, l) => s + (l.budget || 0), 0)
          return (
            <div key={col.id} className="w-64 shrink-0"
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(col.id)}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(col.id)}`}>{col.label}</span>
                  <span className="text-xs text-stone-400">{colLeads.length}</span>
                </div>
                {colValue > 0 && <span className="text-xs text-stone-500 font-medium">{formatCurrency(colValue)}</span>}
              </div>
              <div className="space-y-2 min-h-20">
                {colLeads.map(lead => (
                  <div key={lead.id} draggable onDragStart={() => onDragStart(lead.id)}
                    className="bg-white border border-stone-200 rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-indigo-200 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-800">{lead.company}</p>
                        <p className="text-xs text-stone-400">{lead.contact_name}</p>
                      </div>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${serviceColors[lead.service] ?? 'bg-slate-100 text-slate-500'}`}>{lead.service}</span>
                    </div>
                    {lead.budget && (
                      <p className="text-sm font-semibold text-stone-700 mb-2">{formatCurrency(lead.budget)}<span className="text-xs font-normal text-stone-400">/mo</span></p>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                      <span className="text-xs text-stone-400 flex-1">via {lead.source}</span>
                      <a href={`mailto:${lead.contact_email}`} className="text-stone-300 hover:text-indigo-500 transition-colors">
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
                {colLeads.length === 0 && (
                  <div className="border-2 border-dashed border-stone-100 rounded-xl h-20 flex items-center justify-center text-xs text-stone-300">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
