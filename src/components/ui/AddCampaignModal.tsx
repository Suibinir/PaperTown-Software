'use client'
import { useState, useEffect } from 'react'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'
import { Campaign, Client, ServiceType } from '@/types'
import { Loader2 } from 'lucide-react'

const services: ServiceType[] = ['SEO', 'PPC', 'Content', 'Social', 'Email', 'Web']

interface Props {
  onClose: () => void
  onAdded: (campaign: Campaign) => void
  preselectedClientId?: string
}

export default function AddCampaignModal({ onClose, onAdded, preselectedClientId }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState({
    client_id: preselectedClientId ?? '',
    name: '',
    service: 'SEO' as ServiceType,
    budget_monthly: '',
    kpi_target: '',
    start_date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    supabase.from('clients').select('id, company').order('company')
      .then(({ data }) => {
        const list = (data ?? []) as Client[]
        setClients(list)
        if (!preselectedClientId && list.length > 0) {
          setForm(f => ({ ...f, client_id: list[0].id }))
        }
      })
  }, [preselectedClientId])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.client_id || !form.name || !form.budget_monthly) {
      setError('Client, campaign name and budget are required.')
      return
    }
    setSaving(true)
    const { data, error: err } = await supabase.from('campaigns').insert([{
      client_id: form.client_id,
      name: form.name,
      service: form.service,
      status: 'active',
      budget_monthly: parseFloat(form.budget_monthly),
      spend_to_date: 0,
      kpi_target: form.kpi_target || null,
      kpi_current: '—',
      start_date: form.start_date,
    }]).select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onAdded(data as Campaign)
    onClose()
  }

  const field = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  return (
    <Modal title="New campaign" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Client *</label>
          <select className={field} value={form.client_id} onChange={e => set('client_id', e.target.value)}>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Campaign name *</label>
          <input className={field} placeholder="e.g. Summer SEO Push" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Service</label>
            <select className={field} value={form.service} onChange={e => set('service', e.target.value)}>
              {services.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Monthly budget (£) *</label>
            <input className={field} type="number" placeholder="3000" value={form.budget_monthly} onChange={e => set('budget_monthly', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">KPI target</label>
          <input className={field} placeholder="e.g. Top 3 for 10 keywords, ROAS 4x" value={form.kpi_target} onChange={e => set('kpi_target', e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Start date</label>
          <input className={field} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 text-sm text-stone-500 border border-stone-200 rounded-lg py-2 hover:bg-stone-50 transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Create campaign'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
