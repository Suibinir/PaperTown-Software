import { getClients, getLeads, getDeliverables, getHealthAlerts, getCampaigns } from '@/lib/db'
import { healthColor, healthBg, statusColor, formatCurrency } from '@/lib/utils'
import { AlertTriangle, TrendingUp, Users, CheckSquare, DollarSign, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [clients, leads, deliverables, alerts, campaigns] = await Promise.all([
    getClients(), getLeads(), getDeliverables(), getHealthAlerts(), getCampaigns()
  ])

  const totalBudget = campaigns.reduce((s, c) => s + c.budget_monthly, 0)
  const overdueDeliverables = deliverables.filter(d => d.status !== 'done' && new Date(d.due_date) < new Date())

  const stats = [
    { label: 'Active clients', value: clients.filter(c => c.onboarding_complete).length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Open leads', value: leads.filter(l => l.status !== 'won' && l.status !== 'lost').length, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Monthly budget', value: formatCurrency(totalBudget), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Overdue tasks', value: overdueDeliverables.length, icon: CheckSquare, color: 'text-red-500', bg: 'bg-red-50' },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-800">Good morning 👋</h1>
        <p className="text-stone-400 text-sm mt-1">Here's what needs your attention today.</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-stone-200 rounded-xl p-5">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className="text-2xl font-semibold text-stone-800">{s.value}</div>
            <div className="text-xs text-stone-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-700">⚠ Health alerts</h2>
            <Link href="/clients" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">All clients <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-3">
            {alerts.length === 0 && (
              <div className="rounded-xl border border-stone-200 p-6 text-center text-stone-400 text-sm">All clients healthy ✓</div>
            )}
            {alerts.map(a => (
              <div key={a.client_id} className={`rounded-xl border p-4 ${healthBg(a.score)}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${healthColor(a.score)}`} />
                      <span className="font-medium text-stone-800 text-sm">{a.client_name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.severity === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{a.severity}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1 ml-6">{a.reason}</p>
                  </div>
                  <span className={`text-lg font-semibold ${healthColor(a.score)}`}>{a.score}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3 mt-6">
            <h2 className="text-sm font-semibold text-stone-700">Recent deliverables</h2>
            <Link href="/deliverables" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {deliverables.slice(0, 4).map(d => (
              <div key={d.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-stone-700">{d.title}</p>
                  <p className="text-xs text-stone-400">{d.type} · Due {d.due_date}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(d.status)}`}>{d.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-700">Client health</h2>
            <Link href="/clients" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {clients.map(c => (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-stone-700 truncate">{c.company}</span>
                  <span className={`text-sm font-semibold ${healthColor(c.health_score)}`}>{c.health_score}</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${c.health_score >= 75 ? 'bg-emerald-400' : c.health_score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${c.health_score}%` }} />
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-stone-700 mt-6 mb-3">Pipeline snapshot</h2>
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
            {(['new', 'qualified', 'proposal', 'won'] as const).map(stage => {
              const count = leads.filter(l => l.status === stage).length
              const value = leads.filter(l => l.status === stage).reduce((s, l) => s + (l.budget || 0), 0)
              return (
                <div key={stage} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(stage)}`}>{stage}</span>
                    <span className="text-xs text-stone-400">{count} leads</span>
                  </div>
                  <span className="text-xs font-medium text-stone-600">{formatCurrency(value)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
