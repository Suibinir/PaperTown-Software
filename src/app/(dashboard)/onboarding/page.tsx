'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Client } from '@/types'
import { CheckCircle, Circle, Loader2, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'

interface OnboardingItem {
  id: string
  client_id: string
  item: string
  category: string | null
  completed: boolean
  completed_at: string | null
  completed_by: string | null
}

const categoryOrder = ['Access', 'Assets', 'Strategy', 'Technical']

const categoryStyle: Record<string, { bg: string; text: string; border: string }> = {
  Access:    { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100' },
  Assets:    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100' },
  Strategy:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100' },
  Technical: { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-100' },
}

function healthColor(score: number) {
  if (score >= 75) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-500'
  return 'text-red-500'
}

export default function OnboardingPage() {
  const [clients, setClients]   = useState<Client[]>([])
  const [items, setItems]       = useState<OnboardingItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<string>('all')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('clients').select('*').order('company'),
      supabase.from('onboarding_items').select('*').order('category').order('item'),
    ]).then(([c, o]) => {
      setClients((c.data ?? []) as Client[])
      setItems((o.data ?? []) as OnboardingItem[])
      setLoading(false)
    })
  }, [])

  const toggle = async (item: OnboardingItem) => {
    setToggling(item.id)
    const now = new Date().toISOString()
    const update = item.completed
      ? { completed: false, completed_at: null, completed_by: null }
      : { completed: true,  completed_at: now, completed_by: 'Agency Admin' }

    await supabase.from('onboarding_items').update(update).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...update } : i))

    // Check if client is now fully onboarded
    const clientItems = items.map(i => i.id === item.id ? { ...i, ...update } : i)
      .filter(i => i.client_id === item.client_id)
    const allDone = clientItems.every(i => i.completed)
    if (allDone) {
      await supabase.from('clients').update({ onboarding_complete: true }).eq('id', item.client_id)
      setClients(prev => prev.map(c => c.id === item.client_id ? { ...c, onboarding_complete: true } : c))
    } else if (item.completed) {
      // unchecked something — mark incomplete again
      await supabase.from('clients').update({ onboarding_complete: false }).eq('id', item.client_id)
      setClients(prev => prev.map(c => c.id === item.client_id ? { ...c, onboarding_complete: false } : c))
    }
    setToggling(null)
  }

  const toggleCollapse = (key: string) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  const filteredClients = selected === 'all'
    ? clients
    : clients.filter(c => c.id === selected)

  const clientProgress = (clientId: string) => {
    const clientItems = items.filter(i => i.client_id === clientId)
    const done = clientItems.filter(i => i.completed).length
    return { done, total: clientItems.length, pct: clientItems.length > 0 ? Math.round((done / clientItems.length) * 100) : 0 }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
    </div>
  )

  const incompleteCount = clients.filter(c => !c.onboarding_complete).length

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Onboarding</h1>
          <p className="text-stone-400 text-sm mt-0.5">
            {clients.filter(c => c.onboarding_complete).length}/{clients.length} clients fully onboarded
            {incompleteCount > 0 && ` · ${incompleteCount} in progress`}
          </p>
        </div>
      </div>

      {/* Alert for incomplete clients */}
      {incompleteCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {incompleteCount} client{incompleteCount > 1 ? 's' : ''} still onboarding
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Complete all checklist items to mark them as fully onboarded.
            </p>
          </div>
        </div>
      )}

      {/* Client filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setSelected('all')}
          className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${selected === 'all' ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
          All clients
        </button>
        {clients.map(c => {
          const { pct } = clientProgress(c.id)
          return (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${selected === c.id ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
              {c.company}
              <span className={`${selected === c.id ? 'text-indigo-200' : pct === 100 ? 'text-emerald-500' : 'text-stone-400'}`}>
                {pct}%
              </span>
            </button>
          )
        })}
      </div>

      {/* Client onboarding cards */}
      <div className="space-y-4">
        {filteredClients.map(client => {
          const { done, total, pct } = clientProgress(client.id)
          const clientItems = items.filter(i => i.client_id === client.id)
          const categories = categoryOrder.filter(cat =>
            clientItems.some(i => (i.category ?? 'Other') === cat)
          )
          const collapseKey = `client-${client.id}`
          const isCollapsed = collapsed[collapseKey]

          return (
            <div key={client.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
              {/* Client header */}
              <div
                className="flex items-center gap-4 p-5 cursor-pointer hover:bg-stone-50 transition-colors"
                onClick={() => toggleCollapse(collapseKey)}
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
                  {client.company[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h2 className="font-semibold text-stone-800">{client.company}</h2>
                    {client.onboarding_complete
                      ? <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Complete ✓</span>
                      : <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">In progress</span>
                    }
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-stone-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-stone-400 shrink-0">{done}/{total}</span>
                  </div>
                </div>
                {isCollapsed
                  ? <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-stone-300 shrink-0" />
                }
              </div>

              {/* Checklist body */}
              {!isCollapsed && (
                <div className="border-t border-stone-100">
                  {categories.map(category => {
                    const catItems = clientItems.filter(i => (i.category ?? 'Other') === category)
                    const catDone  = catItems.filter(i => i.completed).length
                    const style = categoryStyle[category] ?? categoryStyle.Technical
                    const catKey = `${client.id}-${category}`
                    const catCollapsed = collapsed[catKey]

                    return (
                      <div key={category}>
                        <button
                          onClick={() => toggleCollapse(catKey)}
                          className={`w-full flex items-center justify-between px-5 py-2.5 hover:opacity-80 transition-opacity ${style.bg}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${style.text}`}>{category}</span>
                            <span className={`text-xs ${style.text} opacity-60`}>{catDone}/{catItems.length}</span>
                          </div>
                          {catCollapsed
                            ? <ChevronRight className={`w-3 h-3 ${style.text} opacity-50`} />
                            : <ChevronDown className={`w-3 h-3 ${style.text} opacity-50`} />
                          }
                        </button>

                        {!catCollapsed && catItems.map((item, idx) => (
                          <div
                            key={item.id}
                            className={`flex items-start gap-3 px-5 py-3 hover:bg-stone-50 transition-colors ${idx < catItems.length - 1 ? 'border-b border-stone-50' : ''}`}
                          >
                            <button
                              onClick={() => toggle(item)}
                              disabled={toggling === item.id}
                              className="mt-0.5 shrink-0 transition-colors"
                            >
                              {toggling === item.id
                                ? <Loader2 className="w-4 h-4 animate-spin text-stone-300" />
                                : item.completed
                                  ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                                  : <Circle className="w-4 h-4 text-stone-300 hover:text-indigo-400" />
                              }
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${item.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                                {item.item}
                              </p>
                              {item.completed && item.completed_at && (
                                <p className="text-xs text-stone-400 mt-0.5">
                                  Completed {new Date(item.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                  {item.completed_by ? ` by ${item.completed_by}` : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
