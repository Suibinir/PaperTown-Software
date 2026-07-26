import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { Client, Campaign, Deliverable } from '@/types'
import { statusColor, formatCurrency } from '@/lib/utils'
import { CheckCircle, Clock, Eye, LogOut } from 'lucide-react'
import PortalSignOut from './PortalSignOut'

export const dynamic = 'force-dynamic'

export default async function PortalPage() {
  const supabase = await createSupabaseServerClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal/login')

  // Look up which client this user belongs to
  const { data: portalUser } = await supabase
    .from('portal_users')
    .select('client_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!portalUser) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="text-4xl mb-4">🔐</div>
          <h1 className="font-semibold text-stone-800 mb-2">Access not set up yet</h1>
          <p className="text-sm text-stone-400">
            Your account ({user.email}) hasn't been linked to a client yet.
            Please contact your agency to get access.
          </p>
        </div>
      </div>
    )
  }

  const clientId = portalUser.client_id

  const [clientRes, campaignsRes, deliverablesRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single(),
    supabase.from('campaigns').select('*').eq('client_id', clientId),
    supabase.from('deliverables').select('*').eq('client_id', clientId).eq('client_visible', true),
  ])

  const client = clientRes.data as Client | null
  const campaigns = (campaignsRes.data ?? []) as Campaign[]
  const deliverables = (deliverablesRes.data ?? []) as Deliverable[]

  if (!client) redirect('/portal/login')

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold">A</div>
          <span className="text-sm font-semibold text-stone-700">PaperTown</span>
          <span className="text-stone-300 text-sm">·</span>
          <span className="text-sm text-stone-500">Client Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold">
              {client.company[0]}
            </div>
            <span className="text-sm text-stone-600 font-medium">{client.company}</span>
          </div>
          <PortalSignOut />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-stone-800">
            Hello, {client.contact_name.split(' ')[0]} 👋
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Here's a live view of your campaigns and deliverables.
          </p>
        </div>

        {/* Campaigns */}
        <h2 className="text-sm font-semibold text-stone-600 mb-3">Your campaigns</h2>
        {campaigns.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-stone-400 text-sm mb-8">
            No active campaigns yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {campaigns.map(c => {
              const spendPct = c.budget_monthly > 0
                ? Math.round((c.spend_to_date / c.budget_monthly) * 100)
                : 0
              const over = c.spend_to_date > c.budget_monthly
              return (
                <div key={c.id} className="bg-white border border-stone-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-stone-800 text-sm">{c.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-stone-400 mb-1">
                        <span>Budget used</span>
                        <span className={over ? 'text-red-500 font-medium' : ''}>{spendPct}%</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${over ? 'bg-red-400' : 'bg-indigo-400'}`}
                          style={{ width: `${Math.min(spendPct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-stone-400 mt-1">
                        <span>{formatCurrency(c.spend_to_date)} spent</span>
                        <span>{formatCurrency(c.budget_monthly)} budget</span>
                      </div>
                    </div>
                    {(c.kpi_target || c.kpi_current) && (
                      <div className="bg-stone-50 rounded-xl p-3">
                        <p className="text-xs text-stone-400 mb-1">Performance</p>
                        <p className="text-xs text-stone-600"><span className="font-medium">Target:</span> {c.kpi_target ?? '—'}</p>
                        <p className="text-xs text-stone-600"><span className="font-medium">Current:</span> {c.kpi_current ?? '—'}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Deliverables */}
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-stone-600">Deliverables</h2>
          <span className="flex items-center gap-1 text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
            <Eye className="w-3 h-3" /> Shared with you
          </span>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100">
          {deliverables.length === 0 && (
            <div className="px-5 py-8 text-center text-stone-400 text-sm">No deliverables shared yet.</div>
          )}
          {deliverables.map(d => (
            <div key={d.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                {d.status === 'done'
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  : <Clock className="w-4 h-4 text-stone-300 shrink-0" />
                }
                <div>
                  <p className="text-sm font-medium text-stone-700">{d.title}</p>
                  <p className="text-xs text-stone-400">{d.type} · Due {d.due_date}</p>
                </div>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(d.status)}`}>
                {d.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-center text-stone-300 mt-8">
          Powered by PaperTown · Questions? Email your account manager
        </p>
      </div>
    </div>
  )
}
