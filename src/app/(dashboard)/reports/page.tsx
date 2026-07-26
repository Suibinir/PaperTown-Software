'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Client, Campaign, Deliverable } from '@/types'
import { formatCurrency, healthColor } from '@/lib/utils'
import { FileText, Download, Loader2, CheckCircle } from 'lucide-react'
import { generateClientReport } from '@/lib/pdf-report'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function ReportsPage() {
  const [clients, setClients]         = useState<Client[]>([])
  const [campaigns, setCampaigns]     = useState<Campaign[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading]         = useState(true)
  const [generating, setGenerating]   = useState<string | null>(null)
  const [generated, setGenerated]     = useState<string[]>([])

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear())

  useEffect(() => {
    Promise.all([
      supabase.from('clients').select('*'),
      supabase.from('campaigns').select('*'),
      supabase.from('deliverables').select('*'),
    ]).then(([c, camp, del]) => {
      setClients((c.data ?? []) as Client[])
      setCampaigns((camp.data ?? []) as Campaign[])
      setDeliverables((del.data ?? []) as Deliverable[])
      setLoading(false)
    })
  }, [])

  const downloadPDF = async (client: Client) => {
    setGenerating(client.id)
    const clientCampaigns    = campaigns.filter(c => c.client_id === client.id)
    const clientDeliverables = deliverables.filter(d => d.client_id === client.id)
    const monthLabel = `${MONTHS[selectedMonth]} ${selectedYear}`
    await generateClientReport(client, clientCampaigns, clientDeliverables, monthLabel)
    setGenerating(null)
    setGenerated(prev => [...prev, client.id])
    setTimeout(() => setGenerated(prev => prev.filter(id => id !== client.id)), 3000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
    </div>
  )

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Reports</h1>
          <p className="text-stone-400 text-sm mt-0.5">Generate and download branded PDF reports for each client.</p>
        </div>
        {/* Month selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="text-sm border border-stone-200 rounded-lg px-3 py-2 text-stone-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="text-sm border border-stone-200 rounded-lg px-3 py-2 text-stone-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[2023, 2024, 2025].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {clients.map(client => {
          const clientCampaigns    = campaigns.filter(c => c.client_id === client.id)
          const clientDeliverables = deliverables.filter(d => d.client_id === client.id)
          const done         = clientDeliverables.filter(d => d.status === 'done').length
          const totalBudget  = clientCampaigns.reduce((s, c) => s + c.budget_monthly, 0)
          const totalSpend   = clientCampaigns.reduce((s, c) => s + c.spend_to_date, 0)
          const isGenerating = generating === client.id
          const isDone       = generated.includes(client.id)

          return (
            <div key={client.id} className="bg-white border border-stone-200 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                    {client.company[0]}
                  </div>
                  <div>
                    <h2 className="font-semibold text-stone-800">{client.company}</h2>
                    <p className="text-xs text-stone-400">{client.contact_name} · {MONTHS[selectedMonth]} {selectedYear}</p>
                  </div>
                </div>

                <button
                  onClick={() => downloadPDF(client)}
                  disabled={isGenerating}
                  className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                    isDone
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60'
                  }`}
                >
                  {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isDone        && <CheckCircle className="w-4 h-4" />}
                  {!isGenerating && !isDone && <Download className="w-4 h-4" />}
                  {isGenerating ? 'Building PDF…' : isDone ? 'Downloaded!' : 'Download PDF'}
                </button>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-3">
                <div className="bg-stone-50 rounded-xl p-3">
                  <div className="text-lg font-semibold text-stone-700">{formatCurrency(totalBudget)}</div>
                  <div className="text-xs text-stone-400">monthly budget</div>
                </div>
                <div className="bg-stone-50 rounded-xl p-3">
                  <div className="text-lg font-semibold text-stone-700">{formatCurrency(totalSpend)}</div>
                  <div className="text-xs text-stone-400">spend to date</div>
                </div>
                <div className="bg-stone-50 rounded-xl p-3">
                  <div className="text-lg font-semibold text-stone-700">{done}/{clientDeliverables.length}</div>
                  <div className="text-xs text-stone-400">deliverables done</div>
                </div>
                <div className="bg-stone-50 rounded-xl p-3">
                  <div className={`text-lg font-semibold ${healthColor(client.health_score)}`}>{client.health_score}</div>
                  <div className="text-xs text-stone-400">health score</div>
                </div>
              </div>

              {clientCampaigns.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-xs text-stone-400 font-medium mb-3">Campaign KPIs</p>
                  <div className="space-y-2">
                    {clientCampaigns.map(c => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="text-stone-600 font-medium">{c.name}</span>
                        <div className="flex items-center gap-4 text-stone-400">
                          <span>Target: <span className="text-stone-600">{c.kpi_target ?? '—'}</span></span>
                          <span>Current: <span className="text-stone-600">{c.kpi_current ?? '—'}</span></span>
                        </div>
                      </div>
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
