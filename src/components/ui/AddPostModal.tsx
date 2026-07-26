'use client'
import { useState } from 'react'
import Modal from './Modal'
import ImageUploader from './ImageUploader'
import { supabase } from '@/lib/supabase'
import { SocialPost, PostPlatform, PostStatus, Client } from '@/types'
import { Loader2 } from 'lucide-react'

const platforms: PostPlatform[] = ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'TikTok', 'Pinterest']
const statuses: PostStatus[] = ['idea', 'draft', 'scheduled', 'published']

interface Props {
  clients: Client[]
  selectedClientId: string
  defaultDate?: string
  onClose: () => void
  onAdded: (post: SocialPost) => void
}

export default function AddPostModal({ clients, selectedClientId, defaultDate, onClose, onAdded }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])

  const defaultDateTime = defaultDate
    ? `${defaultDate}T12:00`
    : new Date().toISOString().slice(0, 16)

  const [form, setForm] = useState({
    client_id: selectedClientId,
    platform: 'Instagram' as PostPlatform,
    status: 'idea' as PostStatus,
    caption: '',
    hashtags: '',
    scheduled_at: defaultDateTime,
    notes: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.caption.trim()) { setError('Caption is required.'); return }
    setSaving(true)
    const { data, error: err } = await supabase.from('social_posts').insert([{
      client_id: form.client_id,
      platform: form.platform,
      status: form.status,
      caption: form.caption,
      hashtags: form.hashtags || null,
      media_urls: mediaUrls,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      notes: form.notes || null,
    }]).select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onAdded(data as SocialPost)
    onClose()
  }

  const field = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  return (
    <Modal title="New post" onClose={onClose}>
      <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Client</label>
            <select className={field} value={form.client_id} onChange={e => set('client_id', e.target.value)}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Platform</label>
            <select className={field} value={form.platform} onChange={e => set('platform', e.target.value)}>
              {platforms.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Status</label>
            <select className={field} value={form.status} onChange={e => set('status', e.target.value)}>
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Scheduled date & time</label>
            <input className={field} type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Caption *</label>
          <textarea className={`${field} resize-none`} rows={4}
            placeholder="Write your post caption here…"
            value={form.caption} onChange={e => set('caption', e.target.value)} />
          <div className="flex justify-end mt-0.5">
            <span className={`text-xs ${form.caption.length > 2200 ? 'text-red-400' : 'text-stone-300'}`}>
              {form.caption.length}/2200
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Hashtags</label>
          <input className={field} placeholder="#hashtag1 #hashtag2" value={form.hashtags} onChange={e => set('hashtags', e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-medium text-stone-500 mb-2 block">Media (images / video)</label>
          <ImageUploader value={mediaUrls} onChange={setMediaUrls} maxFiles={4} />
        </div>

        <div>
          <label className="text-xs font-medium text-stone-500 mb-1 block">Internal notes</label>
          <input className={field} placeholder="e.g. Use the summer photoshoot images" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 text-sm text-stone-500 border border-stone-200 rounded-lg py-2 hover:bg-stone-50 transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Add post'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
