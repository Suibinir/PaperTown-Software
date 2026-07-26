'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Client } from '@/types'
import { Loader2, Plus, Mail, Phone, MessageSquare, Video, Users, Hash } from 'lucide-react'

type Channel = 'email' | 'slack' | 'call' | 'meeting' | 'other'
type Direction = 'inbound' | 'outbound'

interface CommsEntry {
  id: string
  client_id: string
  channel: Channel
  direction: Direction
  subject: string | null
  body: string | null
  logged_by: string | null
  logged_at: string
}

const channelIcon: Record<Channel, React.ReactNode> = {
  email:   <Mail className="w-3.5 h-3.5" />,
  slack:   <Hash className="w-3.5 h-3.5" />,
  call:    <Phone className="w-3.5 h-3.5" />,
  meeting: <Video className="w-3.5 h-3.5" />,
  other:   <MessageSquare className="w-3.5 h-3.5" />,
}

const channelColor: Record<Channel, string> = {
  email:   'bg-blue-50 text-blue-600',
  slack:   'bg-violet-50 text-violet-600',
  call:    'bg-emerald-50 text-emerald-600',
  meeting: 'bg-amber-50 text-amber-600',
  other:   'bg-stone-100 text-stone-500',
}

const directionColor: Record<Direction, string> = {
  inbound:  'bg-indigo-50 text-indigo-600',
  outbound: 'bg-stone-100 text-stone-500',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function CommsPage() {
  const [entries, setEntries] = useState<CommsEntry[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterClient, setFilterClient] = useState('all')
  const [filterChannel, setFilterChannel] = useState<Channel | 'all'>('all')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    channel: 'email' as Channel,
    direction: 'outbound' as Direction,
    subject: '',
    body: '',
    logged_by: 'Agency Admin',
  })

  useEffect(() => {
    Promise.all([
      supabase.from('comms_log').select('*').order('logged_at', { ascending: false }),
      supabase.from('clients').select('*').order('company'),
    ]).then(([c, cls]) => {
      setEntries((c.data ?? []) as CommsEntry[])
      const clientList = (cls.data ?? []) as Client[]
      setClients(clientList)
      if (clientList.length > 0) setForm(f => ({ ...f, client_id: clientList[0].id }))
      setLoading(false)
    })
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.client_id || !form.subject) return
    setSaving(true)
    const { data, error } = await supabase.from('comms_log').insert([{
      client_id: form.client_id,
      channel: form.channel,
      direction: form.direction,
      subject: form.subject,
      body: form.body || null,
      logged_by: form.logged_by || 'Agency Admin',
      logged_at: new Date().toISOString(),
    }]).select().single()
    setSaving(false)
    if (error) { console.error(error); return }
    setEntries(prev => [data as CommsEntry, ...prev])
    setForm(f => ({ ...f, subject: '', body: '' }))
    setShowForm(false)
  }

  const filtered = entries
    .filter(e => filterClient === 'all' || e.client_id === filterClient)
    .filter(e => filterChannel === 'all' || e.channel === filterChannel)

  const field = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
    </div>
  )

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Comms log</h1>
          <p className="text-stone-400 text-sm mt-0.5">{entries.length} total interactions logged</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Log interaction
        </button>
      </div>

      {/* Inline log form */}
      {showForm && (
        <div className="bg-white border border-indigo-200 rounded-2xl p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Log new interaction</h2>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">Client</label>
              <select className={field} value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">Channel</label>
              <select className={field} value={form.channel} onChange={e => set('channel', e.target.value)}>
                {(['email', 'slack', 'call', 'meeting', 'other'] as Channel[]).map(c =>
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">Direction</label>
              <select className={field} value={form.direction} onChange={e => set('direction', e.target.value)}>
                <option value="outbound">Outbound (we contacted them)</option>
                <option value="inbound">Inbound (they contacted us)</option>
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-stone-500 mb-1 block">Subject *</label>
            <input className={field} placeholder="e.g. June campaign update call" value={form.subject} onChange={e => set('subject', e.target.value)} />
          </div>
          <div className="mb-4">
            <label className="text-xs font-medium text-stone-500 mb-1 block">Notes</label>
            <textarea className={`${field} resize-none`} rows={3}
              placeholder="Key points discussed, action items, follow-ups…"
              value={form.body} onChange={e => set('body', e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="text-sm text-stone-500 border border-stone-200 rounded-lg px-4 py-2 hover:bg-stone-50 transition-colors">Cancel</button>
            <button onClick={submit} disabled={saving || !form.subject}
              className="flex items-center gap-2 text-sm font-medium bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Saving…' : 'Log interaction'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select className="text-xs border border-stone-200 rounded-lg px-3 py-1.5 text-stone-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={filterClient} onChange={e => setFilterClient(e.target.value)}>
          <option value="all">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
        </select>
        <div className="flex gap-1.5">
          {(['all', 'email', 'slack', 'call', 'meeting', 'other'] as const).map(ch => (
            <button key={ch} onClick={() => setFilterChannel(ch)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${filterChannel === ch ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
              {ch === 'all' ? 'All' : ch.charAt(0).toUpperCase() + ch.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl py-12 text-center text-stone-400 text-sm">
            No interactions logged yet. Click "Log interaction" to start.
          </div>
        )}
        {filtered.map(entry => {
          const client = clients.find(c => c.id === entry.client_id)
          return (
            <div key={entry.id} className="bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${channelColor[entry.channel]}`}>
                  {channelIcon[entry.channel]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-stone-800">{entry.subject}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${directionColor[entry.direction]}`}>
                      {entry.direction}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-stone-500 font-medium">{client?.company ?? '—'}</span>
                    <span className="text-stone-200 text-xs">·</span>
                    <span className="text-xs text-stone-400">{entry.channel}</span>
                    {entry.logged_by && <>
                      <span className="text-stone-200 text-xs">·</span>
                      <span className="text-xs text-stone-400">by {entry.logged_by}</span>
                    </>}
                    <span className="text-stone-200 text-xs">·</span>
                    <span className="text-xs text-stone-400">{timeAgo(entry.logged_at)}</span>
                  </div>
                  {entry.body && (
                    <p className="text-xs text-stone-500 mt-2 bg-stone-50 rounded-lg px-3 py-2 leading-relaxed">
                      {entry.body}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
