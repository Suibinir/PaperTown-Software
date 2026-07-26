'use client'
import { useState, useEffect } from 'react'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'
import { Deliverable, Client, Campaign } from '@/types'
import { Loader2 } from 'lucide-react'

const types = ['Report', 'Ad Copy', 'Content', 'Copywriting', 'Audit', 'Strategy', 'Design', 'Video', 'Email', 'Social Post', 'Other']

interface Props {
  onClose: () => void
  onAdded: (deliverable: Deliverable) => void
}

export default function AddDeliverableModal({ onClose, onAdded }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [form, setForm] = useState({
    client_id: '',
    campaign_id: '',
    title: '',
    type: 'Report',
    due_date: '',
    assignee: '',
    client_visible: false,
    notes: '',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('clients').select('*').order('company'),
      supabase.from('campaigns').select('*').order('name'),
    ]).then(([c, camp]) => {
      const cls = (c.data ?? []) as Client[]
      const camps = (camp.data ?? []) as Campaign[]
      setClients(cls)
      setCampaigns(camps)
      if (cls.length > 0) {
        const firstClient = cls[0].id
        const firstCamps = camps.filter(x => x.client_id === firstClient)
        setFilteredCampaigns(firstCamps)
        setForm(f => ({
          ...f,
          client_id: firstClient,
          campaign_id: firstCamps[0]?.id ?? '',
        }))
      }
    })
  }, [])

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const onClientChange = (clientId: string) => {
    const camps = campaigns.filter(c => c.client_id === clientId)
    setFilteredCampaigns(camps)
    setForm(f => ({ ...f, client_id: clientId, campaign_id: camps[0]?.id ?? '' }))
  }

  const submit = async () => {
    if (!form.title || !form.client_id || !form.due_date) {
      setError('Title, client and due date are required.')
      return
    }
    setSaving(true)
    const { data, error: err } = await supabase.from('deliverables').insert([{
      client_id: form.client_id,
      campaign_id: form.campaign_id || null,
      title: form.title,
      type: form.type,
      status: 'not_started',
      due_date: form.due_date,
      assignee: form.assignee || null,
      client_visible: form.client_visible,
      notes: form.notes || null,
    }]).select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onAdded(data as Deliverable)
    onClose()
  }

  const field = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  return (
    <Modal title="Add deliverable" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Title *</label>
          <input className={field} placeholder="e.g. June SEO Report" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Client *</label>
            <select className={field} value={form.client_id} onChange={e => onClientChange(e.target.value)}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Campaign</label>
            <select className={field} value={form.campaign_id} onChange={e => set('campaign_id', e.target.value)}>
              <option value="">— None —</option>
              {filteredCampaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Type</label>
            <select className={field} value={form.type} onChange={e => set('type', e.target.value)}>
              {types.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Due date *</label>
            <input className={field} type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Assignee</label>
          <input className={field} placeholder="e.g. Agency Admin" value={form.assignee} onChange={e => set('assignee', e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Notes</label>
          <textarea className={`${field} resize-none`} rows={2} placeholder="Any additional context…" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <div
            onClick={() => set('client_visible', !form.client_visible)}
            className={`w-9 h-5 rounded-full transition-colors relative ${form.client_visible ? 'bg-indigo-600' : 'bg-stone-200'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.client_visible ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-stone-600">Visible to client in portal</span>
        </label>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 text-sm text-stone-500 border border-stone-200 rounded-lg py-2 hover:bg-stone-50 transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Add deliverable'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
