'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { encrypt, decrypt } from '@/lib/crypto'
import { VaultCredential, Client } from '@/types'
import { Plus, Eye, EyeOff, Copy, ExternalLink, Lock, Loader2, Check, Trash2, Shield } from 'lucide-react'
import Modal from '@/components/ui/Modal'

const categories = ['Ad Platform', 'Analytics', 'CMS', 'Social Media', 'Email', 'Hosting', 'Domain', 'API Key', 'Other']

const categoryStyle: Record<string, string> = {
  'Ad Platform':  'bg-blue-50 text-blue-600',
  'Analytics':    'bg-violet-50 text-violet-600',
  'CMS':          'bg-amber-50 text-amber-600',
  'Social Media': 'bg-pink-50 text-pink-600',
  'Email':        'bg-teal-50 text-teal-600',
  'Hosting':      'bg-emerald-50 text-emerald-600',
  'Domain':       'bg-stone-100 text-stone-600',
  'API Key':      'bg-red-50 text-red-500',
  'Other':        'bg-stone-100 text-stone-500',
}

function CredentialCard({ cred, onDelete }: { cred: VaultCredential; onDelete: (id: string) => void }) {
  const [revealed, setRevealed]   = useState(false)
  const [decrypted, setDecrypted] = useState('••••••••')
  const [copied, setCopied]       = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)

  const reveal = async () => {
    if (revealed) { setRevealed(false); setDecrypted('••••••••'); return }
    if (!cred.secret_value) return
    setLoading(true)
    const plain = await decrypt(cred.secret_value)
    setDecrypted(plain)
    setRevealed(true)
    setLoading(false)
  }

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const copyPassword = async () => {
    if (!cred.secret_value) return
    const plain = await decrypt(cred.secret_value)
    copy(plain, 'pw')
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-stone-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">{cred.label}</p>
            {cred.url && (
              <a href={cred.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-indigo-500 hover:underline flex items-center gap-0.5 mt-0.5">
                {new URL(cred.url).hostname} <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryStyle[cred.category] ?? categoryStyle.Other}`}>
          {cred.category}
        </span>
      </div>

      <div className="space-y-2">
        {cred.username && (
          <div className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
            <div>
              <p className="text-xs text-stone-400">Username / Email</p>
              <p className="text-sm text-stone-700 font-mono">{cred.username}</p>
            </div>
            <button onClick={() => copy(cred.username!, 'user')}
              className="text-stone-300 hover:text-indigo-500 transition-colors">
              {copied === 'user' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {cred.secret_value && (
          <div className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-400">Password / Key</p>
              <p className={`text-sm font-mono truncate ${revealed ? 'text-stone-700' : 'text-stone-400 tracking-widest'}`}>
                {loading ? '…' : decrypted}
              </p>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <button onClick={reveal} className="text-stone-300 hover:text-indigo-500 transition-colors">
                {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button onClick={copyPassword} className="text-stone-300 hover:text-indigo-500 transition-colors">
                {copied === 'pw' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {cred.notes && (
          <p className="text-xs text-stone-400 px-1">{cred.notes}</p>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
        <p className="text-xs text-stone-400">
          Added {new Date(cred.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {cred.created_by ? ` by ${cred.created_by}` : ''}
        </p>
        <button onClick={() => onDelete(cred.id)} className="text-stone-300 hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function AddCredModal({ clients, onClose, onAdded }: {
  clients: Client[]
  onClose: () => void
  onAdded: (cred: VaultCredential) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [form, setForm] = useState({
    client_id: clients[0]?.id ?? '',
    label: '', category: 'Ad Platform',
    username: '', password: '', url: '', notes: '',
  })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const field = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  const submit = async () => {
    if (!form.label || !form.client_id) { setError('Label and client are required.'); return }
    setSaving(true)
    const encrypted = form.password ? await encrypt(form.password) : null
    const { data, error: err } = await supabase.from('vault_credentials').insert([{
      client_id: form.client_id,
      label: form.label,
      category: form.category,
      username: form.username || null,
      secret_value: encrypted,
      url: form.url || null,
      notes: form.notes || null,
      created_by: 'Agency Admin',
    }]).select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onAdded(data as VaultCredential)
    onClose()
  }

  return (
    <Modal title="Add credential" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Client *</label>
            <select className={field} value={form.client_id} onChange={e => set('client_id', e.target.value)}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Category</label>
            <select className={field} value={form.category} onChange={e => set('category', e.target.value)}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Label *</label>
          <input className={field} placeholder="e.g. Google Ads Account" value={form.label} onChange={e => set('label', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">URL</label>
          <input className={field} placeholder="https://ads.google.com" value={form.url} onChange={e => set('url', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Username / Email</label>
            <input className={field} placeholder="client@email.com" value={form.username} onChange={e => set('username', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Password / Key</label>
            <input className={field} type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Notes</label>
          <input className={field} placeholder="e.g. MCC account, sub-account ID: 123" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Passwords are AES-256 encrypted before storage. Set <code className="font-mono">NEXT_PUBLIC_VAULT_KEY</code> in your <code className="font-mono">.env.local</code> for a custom encryption key.</p>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 text-sm text-stone-500 border border-stone-200 rounded-lg py-2 hover:bg-stone-50 transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Encrypting…' : 'Save credential'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function VaultPage() {
  const [creds, setCreds]     = useState<VaultCredential[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterClient, setFilterClient]     = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  useEffect(() => {
    Promise.all([
      supabase.from('vault_credentials').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('company'),
    ]).then(([v, c]) => {
      setCreds((v.data ?? []) as VaultCredential[])
      setClients((c.data ?? []) as Client[])
      setLoading(false)
    })
  }, [])

  const deleteCred = async (id: string) => {
    setCreds(prev => prev.filter(c => c.id !== id))
    await supabase.from('vault_credentials').delete().eq('id', id)
  }

  const filtered = creds
    .filter(c => filterClient === 'all' || c.client_id === filterClient)
    .filter(c => filterCategory === 'all' || c.category === filterCategory)

  const usedCategories = [...new Set(creds.map(c => c.category))]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
    </div>
  )

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {showModal && (
        <AddCredModal
          clients={clients}
          onClose={() => setShowModal(false)}
          onAdded={c => setCreds(prev => [c, ...prev])}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-stone-800">Agency vault</h1>
            <div className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
              <Shield className="w-3 h-3" /> AES-256
            </div>
          </div>
          <p className="text-stone-400 text-sm mt-0.5">{creds.length} credentials stored across {clients.length} clients</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Add credential
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
          className="text-xs border border-stone-200 rounded-lg px-3 py-1.5 text-stone-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
        </select>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilterCategory('all')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${filterCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
            All
          </button>
          {usedCategories.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${filterCategory === cat ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl py-16 text-center">
          <Lock className="w-8 h-8 text-stone-200 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">No credentials yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(cred => {
            const client = clients.find(c => c.id === cred.client_id)
            return (
              <div key={cred.id}>
                {client && (
                  <p className="text-xs text-stone-400 font-medium mb-1.5 px-1">{client.company}</p>
                )}
                <CredentialCard cred={cred} onDelete={deleteCred} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
