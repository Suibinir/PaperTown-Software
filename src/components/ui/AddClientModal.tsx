'use client'
import { useState } from 'react'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'
import { Client } from '@/types'
import { Loader2 } from 'lucide-react'

const industries = ['Tech', 'Finance', 'Hospitality', 'Retail', 'Health', 'Legal', 'Education', 'Real Estate', 'Other']

interface Props {
  onClose: () => void
  onAdded: (client: Client) => void
}

export default function AddClientModal({ onClose, onAdded }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company: '', contact_name: '', contact_email: '',
    contact_phone: '', industry: 'Tech',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.company || !form.contact_name || !form.contact_email) {
      setError('Company, contact name and email are required.')
      return
    }
    setSaving(true)
    const { data, error: err } = await supabase.from('clients').insert([{
      company: form.company,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone || null,
      industry: form.industry,
      health_score: 100,
      onboarding_complete: false,
    }]).select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onAdded(data as Client)
    onClose()
  }

  const field = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  return (
    <Modal title="Add client" onClose={onClose}>
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
            <label className="text-xs font-medium text-stone-500 mb-1 block">Phone</label>
            <input className={field} placeholder="+44 7700 900000" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Industry</label>
            <select className={field} value={form.industry} onChange={e => set('industry', e.target.value)}>
              {industries.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-stone-400 bg-stone-50 rounded-lg p-3">
          Client will be created with health score 100 and onboarding incomplete. An onboarding checklist will be triggered automatically.
        </p>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 text-sm text-stone-500 border border-stone-200 rounded-lg py-2 hover:bg-stone-50 transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Add client'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
