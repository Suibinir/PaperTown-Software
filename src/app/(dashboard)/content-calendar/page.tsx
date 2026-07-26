'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ContentEntry, Client } from '@/types'
import { ChevronLeft, ChevronRight, Download, Loader2, Trash2, Settings2, X, Plus } from 'lucide-react'
import { generateContentCalendarPDF } from '@/lib/content-calendar-pdf'

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const CONTENT_TYPES = ['Static','Video','Motion Video','Reel','Cover Photo','Story','Carousel']
const PURPOSES  = ['Awareness','Engagement','Conversion','Retention','Brand','Promotional','Educational']
const PLATFORMS = ['Instagram','Facebook','LinkedIn','Twitter','TikTok','Pinterest','All']
const STATUSES  = ['planned','in_progress','done','cancelled']

const ALL_COLUMNS = [
  { key: 'content_type',      label: 'Content Type' },
  { key: 'content_title',     label: 'Content Title' },
  { key: 'purpose',           label: 'Purpose' },
  { key: 'content_direction', label: 'Content Direction' },
  { key: 'platform',          label: 'Platform' },
  { key: 'status',            label: 'Status' },
]

const typeColor: Record<string, string> = {
  'Static':       'bg-indigo-500 text-white',
  'Video':        'bg-sky-500 text-white',
  'Motion Video': 'bg-purple-500 text-white',
  'Reel':         'bg-pink-500 text-white',
  'Cover Photo':  'bg-amber-500 text-white',
  'Story':        'bg-emerald-500 text-white',
  'Carousel':     'bg-orange-500 text-white',
}

const typeBadgeStyle: Record<string, { bg: string; bar: string }> = {
  'Static':       { bg: 'bg-indigo-50',  bar: 'bg-indigo-500' },
  'Video':        { bg: 'bg-sky-50',     bar: 'bg-sky-500' },
  'Motion Video': { bg: 'bg-purple-50',  bar: 'bg-purple-500' },
  'Reel':         { bg: 'bg-pink-50',    bar: 'bg-pink-500' },
  'Cover Photo':  { bg: 'bg-amber-50',   bar: 'bg-amber-500' },
  'Story':        { bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
  'Carousel':     { bg: 'bg-orange-50',  bar: 'bg-orange-500' },
}

const statusStyle: Record<string, string> = {
  planned:     'bg-stone-100 text-stone-500',
  in_progress: 'bg-indigo-50 text-indigo-600',
  done:        'bg-emerald-50 text-emerald-600',
  cancelled:   'bg-red-50 text-red-400',
}

function pad(n: number) { return String(n).padStart(2, '0') }
function dateStr(y: number, m: number, d: number) { return `${y}-${pad(m+1)}-${pad(d)}` }
function getDaysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate() }

function EditCell({ value, placeholder, onChange, multiline = false, options }: {
  value: string; placeholder: string; onChange: (v: string) => void; multiline?: boolean; options?: string[]
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value)
  const commit = () => { onChange(draft); setEditing(false) }

  if (options) return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full text-xs bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5 cursor-pointer">
      <option value="">—</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  if (editing) return multiline
    ? <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} rows={2}
        className="w-full text-xs border border-indigo-300 rounded px-1 py-0.5 resize-none focus:outline-none" />
    : <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={e => e.key === 'Enter' && commit()}
        className="w-full text-xs border border-indigo-300 rounded px-1 py-0.5 focus:outline-none" />

  return (
    <div onClick={() => { setDraft(value); setEditing(true) }}
      className="min-h-5 text-xs cursor-text hover:bg-stone-100 rounded px-1 py-0.5 transition-colors">
      {value || <span className="text-stone-300">{placeholder}</span>}
    </div>
  )
}

// Single post row within a day
function PostRow({ entry, onUpdate, onDelete, saving }: {
  entry: ContentEntry
  onUpdate: (id: string, field: string, value: string) => void
  onDelete: (entry: ContentEntry) => void
  saving: boolean
}) {
  return (
    <tr className="border-t border-stone-100 hover:bg-indigo-50/20 transition-colors group">
      {/* Spacer for date column */}
      <td className="px-2 py-1.5 w-20">
        {saving && <Loader2 className="w-3 h-3 animate-spin text-indigo-400 mx-auto" />}
      </td>

      {/* Content Type */}
      <td className="px-2 py-1.5 w-28">
        <div className={`text-xs font-semibold px-2 py-0.5 rounded-full text-center ${entry.content_type ? typeColor[entry.content_type] ?? 'bg-stone-100 text-stone-600' : 'bg-stone-100 text-stone-400'}`}>
          <select value={entry.content_type ?? ''}
            onChange={e => onUpdate(entry.id, 'content_type', e.target.value)}
            className="bg-transparent border-0 focus:outline-none cursor-pointer w-full text-center text-xs font-semibold"
            style={{ color: 'inherit' }}>
            <option value="">— type —</option>
            {CONTENT_TYPES.map(t => <option key={t} value={t} className="text-stone-800 bg-white">{t}</option>)}
          </select>
        </div>
      </td>

      {/* Content Title */}
      <td className="px-2 py-1.5 w-36">
        <EditCell value={entry.content_title ?? ''} placeholder="Add title…" onChange={v => onUpdate(entry.id, 'content_title', v)} />
      </td>

      {/* Purpose */}
      <td className="px-2 py-1.5 w-28">
        <EditCell value={entry.purpose ?? ''} placeholder="Purpose…" onChange={v => onUpdate(entry.id, 'purpose', v)} options={PURPOSES} />
      </td>

      {/* Content Direction */}
      <td className="px-2 py-1.5">
        <EditCell value={entry.content_direction ?? ''} placeholder="Direction for designer/copywriter…" onChange={v => onUpdate(entry.id, 'content_direction', v)} multiline />
      </td>

      {/* Platform */}
      <td className="px-2 py-1.5 w-24">
        <EditCell value={entry.platform ?? ''} placeholder="Platform…" onChange={v => onUpdate(entry.id, 'platform', v)} options={PLATFORMS} />
      </td>

      {/* Status */}
      <td className="px-2 py-1.5 w-24">
        <select value={entry.status ?? 'planned'}
          onChange={e => onUpdate(entry.id, 'status', e.target.value)}
          className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 focus:outline-none cursor-pointer ${statusStyle[entry.status ?? 'planned']}`}>
          {STATUSES.map(s => <option key={s} value={s} className="text-stone-800 bg-white">{s}</option>)}
        </select>
      </td>

      {/* Delete */}
      <td className="px-1 py-1.5 w-8 text-center">
        <button onClick={() => onDelete(entry)}
          className="text-stone-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  )
}

// Day group: date label row + one or more post rows + add button
function DayGroup({ day, year, month, entries, onUpdate, onDelete, onAddPost, savingIds }: {
  day: number
  year: number
  month: number
  entries: ContentEntry[]
  onUpdate: (id: string, field: string, value: string) => void
  onDelete: (entry: ContentEntry) => void
  onAddPost: (day: number) => void
  savingIds: Set<string>
}) {
  const date      = dateStr(year, month, day)
  const dow       = new Date(year, month, day).getDay()
  const dowName   = DAYS_SHORT[(dow + 6) % 7]
  const isWeekend = dow === 0 || dow === 6
  const today     = new Date()
  const isToday   = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  const hasEntries = entries.length > 0

  return (
    <>
      {/* Date header row */}
      <tr className={`${isWeekend ? 'bg-stone-50' : 'bg-white'} border-t-2 border-stone-200`}>
        <td className="px-3 py-2 w-20" rowSpan={hasEntries ? entries.length + 1 : 1}>
          <div className={`font-bold text-xs ${isToday ? 'text-indigo-600' : isWeekend ? 'text-stone-400' : 'text-stone-700'}`}>
            {dowName}
          </div>
          <div className={`text-lg font-bold leading-tight ${isToday ? 'text-indigo-600' : isWeekend ? 'text-stone-300' : 'text-stone-800'}`}>
            {day}
          </div>
          <button
            onClick={() => onAddPost(day)}
            className="mt-1 flex items-center gap-0.5 text-xs text-stone-300 hover:text-indigo-500 transition-colors"
          >
            <Plus className="w-3 h-3" /> post
          </button>
        </td>

        {/* If no entries yet, show placeholder cells */}
        {!hasEntries && (
          <>
            <td colSpan={7} className="px-3 py-2 text-xs text-stone-300 italic">
              <button onClick={() => onAddPost(day)} className="hover:text-indigo-400 transition-colors">
                + Add post for this day
              </button>
            </td>
          </>
        )}
      </tr>

      {/* Post rows */}
      {entries.map(entry => (
        <PostRow
          key={entry.id}
          entry={entry}
          onUpdate={onUpdate}
          onDelete={onDelete}
          saving={savingIds.has(entry.id)}
        />
      ))}
    </>
  )
}

export default function ContentCalendarPage() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [clients, setClients]   = useState<Client[]>([])
  const [entries, setEntries]   = useState<ContentEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [selectedClient, setSelectedClient] = useState('')
  const [agencyName, setAgencyName] = useState('PaperTown')
  const [logoUrl, setLogoUrl]       = useState<string | null>(null)
  const [showColPicker, setShowColPicker] = useState(false)
  const [exportCols, setExportCols] = useState<string[]>(ALL_COLUMNS.map(c => c.key))

  const toggleCol = (key: string) =>
    setExportCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  useEffect(() => {
    Promise.all([
      supabase.from('clients').select('*').order('company'),
      supabase.from('agency_settings').select('agency_name,logo_url').single(),
    ]).then(([c, s]) => {
      const cls = (c.data ?? []) as Client[]
      setClients(cls)
      if (cls.length > 0) setSelectedClient(cls[0].id)
      if (s.data?.agency_name) setAgencyName(s.data.agency_name)
      if (s.data?.logo_url)    setLogoUrl(s.data.logo_url)
      setLoading(false)
    })
  }, [])

  useEffect(() => { if (selectedClient) loadEntries() }, [selectedClient, month, year])

  const loadEntries = async () => {
    const startDate = `${year}-${pad(month+1)}-01`
    const endDate   = `${year}-${pad(month+1)}-${pad(getDaysInMonth(year, month))}`
    const { data } = await supabase.from('content_calendar').select('*')
      .eq('client_id', selectedClient).gte('date', startDate).lte('date', endDate).order('date').order('created_at')
    setEntries((data ?? []) as ContentEntry[])
  }

  const getEntriesForDay = (day: number) =>
    entries.filter(e => e.date === dateStr(year, month, day))

  // Add a new post row for a specific day
  const addPost = async (day: number) => {
    const date = dateStr(year, month, day)
    const { data } = await supabase.from('content_calendar')
      .insert([{ client_id: selectedClient, date, status: 'planned' }]).select().single()
    if (data) setEntries(prev => [...prev, data as ContentEntry])
  }

  // Add a post for every day in the month (one per day if none exists)
  const addAllDays = async () => {
    const dim      = getDaysInMonth(year, month)
    const existing = new Set(entries.map(e => e.date))
    const toInsert = []
    for (let d = 1; d <= dim; d++) {
      const date = dateStr(year, month, d)
      if (!existing.has(date)) toInsert.push({ client_id: selectedClient, date, status: 'planned' })
    }
    if (!toInsert.length) return
    const { data } = await supabase.from('content_calendar').insert(toInsert).select()
    if (data) setEntries(prev => [...prev, ...(data as ContentEntry[])].sort((a,b) =>
      a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at)
    ))
  }

  // Update a specific field on a specific entry
  const updateEntry = async (id: string, field: string, value: string) => {
    setSavingIds(prev => new Set(prev).add(id))
    const { data } = await supabase.from('content_calendar')
      .update({ [field]: value || null, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (data) setEntries(prev => prev.map(e => e.id === id ? data as ContentEntry : e))
    setSavingIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  const deleteEntry = async (entry: ContentEntry) => {
    await supabase.from('content_calendar').delete().eq('id', entry.id)
    setEntries(prev => prev.filter(e => e.id !== entry.id))
  }

  const exportPDF = async () => {
    const client = clients.find(c => c.id === selectedClient)
    if (!client) return
    setExporting(true)
    await generateContentCalendarPDF(
      client,
      [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at)),
      month, year, agencyName, logoUrl, exportCols
    )
    setExporting(false)
  }

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  const nextMonth = () => { if (month === 11) { setMonth(0);  setYear(y => y+1) } else setMonth(m => m+1) }

  const daysInMonth = getDaysInMonth(year, month)
  const client      = clients.find(c => c.id === selectedClient)

  const typeCounts = CONTENT_TYPES.reduce((acc, t) => {
    acc[t] = entries.filter(e => e.content_type === t).length
    return acc
  }, {} as Record<string, number>)
  const totalTyped = entries.filter(e => e.content_type).length
  const maxCount   = Math.max(...Object.values(typeCounts), 1)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
    </div>
  )

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Content calendar</h1>
          <p className="text-stone-400 text-sm mt-0.5">
            {entries.length} posts · {totalTyped} with type · {MONTHS[month]} {year}
            {client ? ` · ${client.company}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addAllDays}
            className="text-xs font-medium text-stone-500 border border-stone-200 px-3 py-2 rounded-lg hover:bg-stone-50 transition-colors">
            + Fill all days
          </button>

          {/* Column picker */}
          <div className="relative">
            <button onClick={() => setShowColPicker(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${showColPicker ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-stone-200 text-stone-500 hover:bg-stone-50'}`}>
              <Settings2 className="w-3.5 h-3.5" />
              PDF columns ({exportCols.length}/{ALL_COLUMNS.length})
            </button>
            {showColPicker && (
              <div className="absolute right-0 top-10 bg-white border border-stone-200 rounded-xl shadow-lg p-4 z-20 w-56">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-stone-700">Export columns</p>
                  <button onClick={() => setShowColPicker(false)}><X className="w-3.5 h-3.5 text-stone-400" /></button>
                </div>
                <div className="space-y-2">
                  {ALL_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center gap-2.5 cursor-pointer">
                      <div onClick={() => toggleCol(col.key)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${exportCols.includes(col.key) ? 'bg-indigo-600 border-indigo-600' : 'border-stone-300'}`}>
                        {exportCols.includes(col.key) && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-stone-600">{col.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100">
                  <button onClick={() => setExportCols(ALL_COLUMNS.map(c => c.key))} className="text-xs text-indigo-600 hover:underline">All</button>
                  <button onClick={() => setExportCols([])} className="text-xs text-stone-400 hover:underline">None</button>
                </div>
              </div>
            )}
          </div>

          <button onClick={exportPDF} disabled={exporting || entries.length === 0}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-5">
        <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
          className="text-sm border border-stone-200 rounded-lg px-3 py-2 text-stone-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
            <ChevronLeft className="w-4 h-4 text-stone-500" />
          </button>
          <span className="text-sm font-semibold text-stone-700 min-w-32 text-center">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
            <ChevronRight className="w-4 h-4 text-stone-500" />
          </button>
          <button onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()) }}
            className="text-xs text-indigo-600 hover:underline">Today</button>
        </div>
      </div>

      {/* Type counter */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Post type breakdown — {MONTHS[month]}</h2>
          <span className="text-xs text-stone-400">{entries.length} total posts · {totalTyped} with type assigned</span>
        </div>
        <div className="grid grid-cols-7 gap-3">
          {CONTENT_TYPES.map(type => {
            const count  = typeCounts[type]
            const pct    = maxCount > 0 ? (count / maxCount) * 100 : 0
            const styles = typeBadgeStyle[type]
            return (
              <div key={type} className={`rounded-xl p-3 ${styles.bg}`}>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-bold text-stone-800">{count}</span>
                  {count > 0 && totalTyped > 0 && (
                    <span className="text-xs text-stone-400 mb-1">{Math.round((count/totalTyped)*100)}%</span>
                  )}
                </div>
                <div className="w-full bg-white/60 rounded-full h-1.5 mb-2">
                  <div className={`h-1.5 rounded-full ${styles.bar} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs font-medium text-stone-600 truncate">{type}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Calendar table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-800 text-white">
              <th className="text-left px-3 py-2.5 text-xs font-semibold w-20">Date</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold w-28">Content Type</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold w-36">Content Title</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold w-28">Purpose</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold">Content Direction</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold w-24">Platform</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold w-24">Status</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
              <DayGroup
                key={day}
                day={day}
                year={year}
                month={month}
                entries={getEntriesForDay(day)}
                onUpdate={updateEntry}
                onDelete={deleteEntry}
                onAddPost={addPost}
                savingIds={savingIds}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-stone-400 mt-3 text-center">
        Click any cell to edit · Click "+ post" on a date to add another post · Changes save automatically
      </p>
    </div>
  )
}
