'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Client, Campaign, Deliverable, BrandGuidelines, BrandColor } from '@/types'
import { healthColor, statusColor, formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft, Loader2, Upload, X, Plus, Trash2, Check,
  Palette, Type, Image as ImageIcon, FileText, Eye
} from 'lucide-react'

const TABS = ['Overview', 'Brand Guidelines'] as const
type Tab = typeof TABS[number]

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Poppins', 'Montserrat', 'Lato',
  'Playfair Display', 'Merriweather', 'DIN Next', 'Helvetica', 'Arial',
  'Georgia', 'Times New Roman', 'Work Sans', 'Nunito', 'Raleway', 'Other'
]

const PRESET_COLORS = [
  '#000000','#FFFFFF','#6366F1','#8B5CF6','#EC4899','#F59E0B',
  '#10B981','#3B82F6','#EF4444','#14B8A6','#F97316','#84CC16',
]

function uid() { return Math.random().toString(36).slice(2, 10) }

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [tab, setTab]               = useState<Tab>('Overview')
  const [client, setClient]         = useState<Client | null>(null)
  const [campaigns, setCampaigns]   = useState<Campaign[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [brand, setBrand]           = useState<BrandGuidelines | null>(null)
  const [loading, setLoading]       = useState(true)

  // Brand guideline local edit state
  const [primaryFont, setPrimaryFont]     = useState('')
  const [secondaryFont, setSecondaryFont] = useState('')
  const [colors, setColors]               = useState<BrandColor[]>([])
  const [notes, setNotes]                 = useState('')
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)

  // Upload state
  const [uploadingLogo, setUploadingLogo]   = useState(false)
  const [uploadingPost, setUploadingPost]   = useState<number | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const postInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  useEffect(() => {
    load()
  }, [id])

  const load = async () => {
    const [{ data: c }, { data: camp }, { data: del }, { data: bg }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('campaigns').select('*').eq('client_id', id),
      supabase.from('deliverables').select('*').eq('client_id', id),
      supabase.from('brand_guidelines').select('*').eq('client_id', id).maybeSingle(),
    ])
    setClient(c as Client)
    setCampaigns((camp ?? []) as Campaign[])
    setDeliverables((del ?? []) as Deliverable[])
    if (bg) {
      setBrand(bg as BrandGuidelines)
      setPrimaryFont(bg.primary_font ?? '')
      setSecondaryFont(bg.secondary_font ?? '')
      setColors((bg.colors ?? []) as BrandColor[])
      setNotes(bg.notes ?? '')
    }
    setLoading(false)
  }

  // ── Ensure a brand_guidelines row exists, return it ─────────────────────
  const ensureBrand = async (): Promise<BrandGuidelines> => {
    if (brand) return brand
    const { data } = await supabase.from('brand_guidelines')
      .insert([{ client_id: id }]).select().single()
    setBrand(data as BrandGuidelines)
    return data as BrandGuidelines
  }

  // ── Upload logo ───────────────────────────────────────────────────────────
  const uploadLogo = async (file: File) => {
    setUploadingLogo(true)
    const b = await ensureBrand()
    const ext  = file.name.split('.').pop()
    const path = `brand/${id}/logo-${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('social-media').upload(path, file, { upsert: true })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(data.path)
      const { data: updated } = await supabase.from('brand_guidelines')
        .update({ logo_url: urlData.publicUrl }).eq('id', b.id).select().single()
      if (updated) setBrand(updated as BrandGuidelines)
    }
    setUploadingLogo(false)
  }

  // ── Upload post example ──────────────────────────────────────────────────
  const uploadPostExample = async (file: File, index: number) => {
    setUploadingPost(index)
    const b = await ensureBrand()
    const ext  = file.name.split('.').pop()
    const path = `brand/${id}/post-${index}-${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('social-media').upload(path, file, { upsert: true })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(data.path)
      const examples = [...(b.post_examples ?? [])]
      examples[index] = urlData.publicUrl
      const { data: updated } = await supabase.from('brand_guidelines')
        .update({ post_examples: examples }).eq('id', b.id).select().single()
      if (updated) setBrand(updated as BrandGuidelines)
    }
    setUploadingPost(null)
  }

  const removePostExample = async (index: number) => {
    if (!brand) return
    const examples = [...(brand.post_examples ?? [])]
    examples[index] = ''
    const { data: updated } = await supabase.from('brand_guidelines')
      .update({ post_examples: examples }).eq('id', brand.id).select().single()
    if (updated) setBrand(updated as BrandGuidelines)
  }

  const removeLogo = async () => {
    if (!brand) return
    const { data: updated } = await supabase.from('brand_guidelines')
      .update({ logo_url: null }).eq('id', brand.id).select().single()
    if (updated) setBrand(updated as BrandGuidelines)
  }

  // ── Colors ────────────────────────────────────────────────────────────────
  const addColor = (hex: string) => {
    if (colors.some(c => c.hex.toLowerCase() === hex.toLowerCase())) return
    setColors(prev => [...prev, { hex, name: '' }])
  }
  const removeColor = (idx: number) => setColors(prev => prev.filter((_, i) => i !== idx))
  const updateColorName = (idx: number, name: string) =>
    setColors(prev => prev.map((c, i) => i === idx ? { ...c, name } : c))

  // ── Save fonts/colors/notes ──────────────────────────────────────────────
  const save = async () => {
    setSaving(true)
    const b = await ensureBrand()
    const { data: updated } = await supabase.from('brand_guidelines')
      .update({
        primary_font: primaryFont || null,
        secondary_font: secondaryFont || null,
        colors,
        notes: notes || null,
      })
      .eq('id', b.id).select().single()
    if (updated) setBrand(updated as BrandGuidelines)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
    </div>
  )

  if (!client) return (
    <div className="p-8 text-center text-stone-400">Client not found.</div>
  )

  const field = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <button onClick={() => router.push('/clients')}
        className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to clients
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg shrink-0 overflow-hidden">
          {brand?.logo_url
            ? <img src={brand.logo_url} alt="" className="w-full h-full object-contain" />
            : client.company[0]
          }
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">{client.company}</h1>
          <p className="text-stone-400 text-sm mt-0.5">{client.contact_name} · {client.contact_email}</p>
        </div>
        <div className="ml-auto text-right">
          <div className={`text-2xl font-bold ${healthColor(client.health_score)}`}>{client.health_score}</div>
          <div className="text-xs text-stone-400">health score</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-stone-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${tab === t ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            {t === 'Brand Guidelines' && <Palette className="w-3.5 h-3.5" />}
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {tab === 'Overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <div className="text-lg font-semibold text-stone-700">{campaigns.length}</div>
              <div className="text-xs text-stone-400">campaigns</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <div className="text-lg font-semibold text-stone-700">{formatCurrency(campaigns.reduce((s, c) => s + c.budget_monthly, 0))}</div>
              <div className="text-xs text-stone-400">monthly budget</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <div className="text-lg font-semibold text-stone-700">{deliverables.filter(d => d.status !== 'done').length}</div>
              <div className="text-xs text-stone-400">open tasks</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4">
              <div className="text-xs text-stone-500 font-medium">Client since</div>
              <div className="text-sm font-medium text-stone-700">{formatDate(client.created_at)}</div>
            </div>
          </div>

          {campaigns.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-stone-700 mb-3">Campaigns</h2>
              <div className="flex flex-wrap gap-2">
                {campaigns.map(c => (
                  <span key={c.id} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColor(c.status)}`}>
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {deliverables.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-stone-700 mb-3">Deliverables</h2>
              <div className="space-y-2">
                {deliverables.map(d => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="text-stone-700">{d.title}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(d.status)}`}>{d.status.replace('_',' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BRAND GUIDELINES TAB ─────────────────────────────────────────────── */}
      {tab === 'Brand Guidelines' && (
        <div className="space-y-5">
          {/* Logo */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Logo
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center overflow-hidden">
                {brand?.logo_url
                  ? <img src={brand.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                  : <ImageIcon className="w-6 h-6 text-stone-300" />
                }
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                  className="flex items-center gap-1.5 text-xs font-medium bg-stone-100 text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-60">
                  {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                </button>
                {brand?.logo_url && (
                  <button onClick={removeLogo} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
                <p className="text-xs text-stone-400">PNG, JPG or SVG · max 2MB</p>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </div>
          </div>

          {/* Post examples */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Post examples
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map(idx => {
                const url = brand?.post_examples?.[idx]
                const isUploading = uploadingPost === idx
                return (
                  <div key={idx}>
                    <div className="aspect-square rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center overflow-hidden relative group">
                      {url
                        ? (
                          <>
                            <img src={url} alt={`Example ${idx + 1}`} className="w-full h-full object-cover" />
                            <button onClick={() => removePostExample(idx)}
                              className="absolute top-2 right-2 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50">
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </>
                        )
                        : (
                          <button onClick={() => postInputRefs[idx].current?.click()} disabled={isUploading}
                            className="flex flex-col items-center gap-2 text-stone-300 hover:text-indigo-400 transition-colors p-4">
                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            <span className="text-xs">{isUploading ? 'Uploading…' : `Example ${idx + 1}`}</span>
                          </button>
                        )
                      }
                    </div>
                    <input ref={postInputRefs[idx]} type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && uploadPostExample(e.target.files[0], idx)} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Typography */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
              <Type className="w-4 h-4" /> Typeface & Typography
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1 block">Primary font</label>
                <select className={field} value={primaryFont} onChange={e => setPrimaryFont(e.target.value)}>
                  <option value="">Select font…</option>
                  {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1 block">Secondary font</label>
                <select className={field} value={secondaryFont} onChange={e => setSecondaryFont(e.target.value)}>
                  <option value="">Select font…</option>
                  {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            {/* Preview */}
            {(primaryFont || secondaryFont) && (
              <div className="bg-stone-50 rounded-xl p-4 space-y-2">
                {primaryFont && (
                  <div>
                    <p className="text-xs text-stone-400 mb-1">{primaryFont} (Primary)</p>
                    <p className="text-2xl font-bold text-stone-800" style={{ fontFamily: primaryFont }}>
                      ABCDEFGHIJKLM abcdefghijklm 0123456789
                    </p>
                  </div>
                )}
                {secondaryFont && (
                  <div>
                    <p className="text-xs text-stone-400 mb-1">{secondaryFont} (Secondary)</p>
                    <p className="text-lg text-stone-700" style={{ fontFamily: secondaryFont }}>
                      ABCDEFGHIJKLM abcdefghijklm 0123456789
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Color palette */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4" /> Color palette
            </h2>

            {/* Current colors */}
            {colors.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
                {colors.map((c, idx) => (
                  <div key={idx} className="text-center group relative">
                    <div className="w-full aspect-square rounded-xl border border-stone-200 mb-1.5 relative"
                      style={{ backgroundColor: c.hex }}>
                      <button onClick={() => removeColor(idx)}
                        className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-stone-400" />
                      </button>
                    </div>
                    <input
                      className="text-xs text-stone-500 text-center w-full border-0 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1"
                      placeholder="name"
                      value={c.name}
                      onChange={e => updateColorName(idx, e.target.value)}
                    />
                    <p className="text-xs font-mono text-stone-400">{c.hex.toUpperCase()}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add color */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-stone-400 mr-1">Quick add:</span>
              {PRESET_COLORS.map(hex => (
                <button key={hex} onClick={() => addColor(hex)}
                  className="w-7 h-7 rounded-full border border-stone-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: hex }} title={hex} />
              ))}
              <input
                type="color"
                onChange={e => addColor(e.target.value)}
                className="w-7 h-7 rounded-full border border-stone-200 cursor-pointer"
                title="Custom color"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Brand notes
            </h2>
            <textarea className={`${field} resize-none`} rows={4}
              placeholder="Tone of voice, dos and don'ts, brand story, target audience…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {/* Save */}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saved && !saving && <Check className="w-4 h-4" />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save brand guidelines'}
          </button>
        </div>
      )}
    </div>
  )
}
