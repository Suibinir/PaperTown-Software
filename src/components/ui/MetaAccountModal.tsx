'use client'
import { useState } from 'react'
import Modal from './Modal'
import { supabase } from '@/lib/supabase'
import { Loader2, ExternalLink } from 'lucide-react'

interface Props {
  clientId: string
  clientName: string
  currentAccountId?: string | null
  onClose: () => void
  onSaved: (accountId: string | null) => void
}

export default function MetaAccountModal({ clientId, clientName, currentAccountId, onClose, onSaved }: Props) {
  const [value, setValue]   = useState(currentAccountId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const save = async () => {
    setSaving(true)
    setError('')
    const accountId = value.trim() || null
    // Ensure act_ prefix
    const formatted = accountId && !accountId.startsWith('act_') ? `act_${accountId}` : accountId
    const { error: err } = await supabase
      .from('clients')
      .update({ meta_ad_account_id: formatted })
      .eq('id', clientId)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(formatted)
    onClose()
  }

  const field = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono'

  return (
    <Modal title={`Meta Ads — ${clientName}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Ad Account ID</label>
          <input
            className={field}
            placeholder="act_123456789"
            value={value}
            onChange={e => setValue(e.target.value)}
          />
          <p className="text-xs text-stone-400 mt-1">
            Find this in{' '}
            <a href="https://business.facebook.com/settings/ad-accounts" target="_blank" rel="noopener noreferrer"
              className="text-indigo-500 hover:underline inline-flex items-center gap-0.5">
              Meta Business Manager <ExternalLink className="w-2.5 h-2.5" />
            </a>
            {' '}→ Ad Accounts. The ID looks like <code className="bg-stone-100 px-1 rounded">act_123456789</code>.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <p className="text-xs text-blue-700">
            After saving, go to <strong>Meta Ads</strong> in the sidebar and click <strong>"Sync now"</strong> to pull this client's data.
          </p>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 text-sm text-stone-500 border border-stone-200 rounded-lg py-2 hover:bg-stone-50">Cancel</button>
          {currentAccountId && (
            <button onClick={() => { setValue(''); save() }}
              className="text-sm text-red-400 border border-red-100 rounded-lg px-3 py-2 hover:bg-red-50 transition-colors">
              Remove
            </button>
          )}
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
