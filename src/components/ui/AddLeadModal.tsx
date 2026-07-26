'use client'
import { useState } from 'react'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'
import { Lead, ServiceType } from '@/types'
import { Loader2 } from 'lucide-react'

const services: ServiceType[] = ['SEO', 'PPC', 'Content', 'Social', 'Email', 'Web']
const sources = ['Referral', 'LinkedIn', 'Website', 'Cold Outreach', 'Instagram', 'Google', 'Event', 'Other']

interface Props {
  onClose: () => void
  onAdded: (lead: Lead) => void
}

export default function AddLeadModal({ onClose, onAdded }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company: '', contact_name: '', contact_email: '',
    service: 'SEO' as ServiceType, source: 'Website', budget: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.company || !form.contact_name || !form.contact_email) {
      setError('Company, contact name and email are required.')
      return
    }
    setSaving(true)
    const { data, error: err } = await supabase.from('leads').insert([{
      company: form.company,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      service: form.service,
      source: form.source,
      budget: form.budget ? parseFloat(form.budget) : null,
      status: 'new',
    }]).select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onAdded(data as Lead)
    onClose()
  }

  const field = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  return (
    <Modal title="Add lead" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Company *</label>
          <input className={field} placeholder="Acme Ltd" value={form.company} onChange={e => set('company', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Contact name *</label>
            <input className={field} placeholder="Jane Smith" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Email *</label>
            <input className={field} type="email" placeholder="jane@acme.com" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Service</label>
            <select className={field} value={form.service} onChange={e => set('service', e.target.value)}>
              {services.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Source</label>
            <select className={field} value={form.source} onChange={e => set('source', e.target.value)}>
              {sources.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Monthly budget (£)</label>
          <input className={field} type="number" placeholder="3000" value={form.budget} onChange={e => set('budget', e.target.value)} />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 text-sm text-stone-500 border border-stone-200 rounded-lg py-2 hover:bg-stone-50 transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Add lead'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
