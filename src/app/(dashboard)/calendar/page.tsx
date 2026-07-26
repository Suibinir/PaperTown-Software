'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SocialPost, PostStatus, PostPlatform, Client } from '@/types'
import { Plus, ChevronLeft, ChevronRight, Loader2, ImageIcon } from 'lucide-react'
import AddPostModal from '@/components/ui/AddPostModal'
import ImageUploader from '@/components/ui/ImageUploader'

const platformStyle: Record<PostPlatform, { bg: string; text: string; dot: string }> = {
  Instagram: { bg: 'bg-pink-50',   text: 'text-pink-600',   dot: 'bg-pink-400' },
  Facebook:  { bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-400' },
  LinkedIn:  { bg: 'bg-sky-50',    text: 'text-sky-700',    dot: 'bg-sky-500' },
  Twitter:   { bg: 'bg-cyan-50',   text: 'text-cyan-600',   dot: 'bg-cyan-400' },
  TikTok:    { bg: 'bg-stone-100', text: 'text-stone-700',  dot: 'bg-stone-500' },
  Pinterest: { bg: 'bg-red-50',    text: 'text-red-500',    dot: 'bg-red-400' },
}

const statusStyle: Record<PostStatus, string> = {
  idea:      'bg-stone-100 text-stone-500',
  draft:     'bg-amber-50 text-amber-600',
  scheduled: 'bg-indigo-50 text-indigo-600',
  published: 'bg-emerald-50 text-emerald-600',
  cancelled: 'bg-red-50 text-red-400',
}

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number)    { return new Date(y, m, 1).getDay() }
function pad(n: number)                        { return String(n).padStart(2, '0') }
function dateKey(y: number, m: number, d: number) { return `${y}-${pad(m+1)}-${pad(d)}` }

// ── Post card (calendar cell) ────────────────────────────────────────────────
function PostCard({ post, onClick }: { post: SocialPost; onClick: () => void }) {
  const s = platformStyle[post.platform]
  const hasImages = post.media_urls?.length > 0
  return (
    <div onClick={onClick}
      className={`rounded-md mb-0.5 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden ${s.bg}`}>
      {hasImages && (
        <img src={post.media_urls[0]} alt="" className="w-full h-10 object-cover" />
      )}
      <div className="px-1.5 py-1">
        <div className="flex items-center gap-1 min-w-0">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
          <span className={`text-xs font-medium truncate ${s.text}`}>{post.platform}</span>
          {hasImages && <ImageIcon className={`w-2.5 h-2.5 shrink-0 ${s.text} opacity-60`} />}
        </div>
        <p className="text-xs text-stone-500 truncate leading-snug mt-0.5">{post.caption}</p>
      </div>
    </div>
  )
}

// ── Post detail panel ────────────────────────────────────────────────────────
function PostDetail({ post, clients, onClose, onStatusChange, onDelete, onImagesUpdate }: {
  post: SocialPost
  clients: Client[]
  onClose: () => void
  onStatusChange: (id: string, status: PostStatus) => void
  onDelete: (id: string) => void
  onImagesUpdate: (id: string, urls: string[]) => void
}) {
  const s = platformStyle[post.platform]
  const statuses: PostStatus[] = ['idea', 'draft', 'scheduled', 'published', 'cancelled']
  const client = clients.find(c => c.id === post.client_id)
  const [mediaUrls, setMediaUrls] = useState<string[]>(post.media_urls ?? [])
  const [savingImages, setSavingImages] = useState(false)

  const handleImagesChange = async (urls: string[]) => {
    setMediaUrls(urls)
    setSavingImages(true)
    await supabase.from('social_posts').update({ media_urls: urls }).eq('id', post.id)
    setSavingImages(false)
    onImagesUpdate(post.id, urls)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 z-10 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${s.bg} ${s.text}`}>{post.platform}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyle[post.status]}`}>{post.status}</span>
              {client && <span className="text-xs text-stone-400">{client.company}</span>}
            </div>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
          </div>

          {/* Scheduled time */}
          {post.scheduled_at && (
            <p className="text-xs text-stone-400 mb-4">
              🗓 {new Date(post.scheduled_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' at '}
              {new Date(post.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}

          {/* Images section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-stone-500">Media</label>
              {savingImages && <span className="text-xs text-indigo-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Saving…</span>}
            </div>
            <ImageUploader value={mediaUrls} onChange={handleImagesChange} maxFiles={4} />
          </div>

          {/* Caption */}
          <div className="bg-stone-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{post.caption}</p>
            {post.hashtags && (
              <p className="text-xs text-indigo-500 mt-2 font-medium">{post.hashtags}</p>
            )}
          </div>

          {/* Notes */}
          {post.notes && (
            <div className="bg-amber-50 rounded-xl px-3 py-2 mb-4">
              <p className="text-xs text-amber-700"><span className="font-medium">Note:</span> {post.notes}</p>
            </div>
          )}

          {/* Status buttons */}
          <div className="mb-4">
            <p className="text-xs font-medium text-stone-500 mb-2">Move to</p>
            <div className="flex flex-wrap gap-1.5">
              {statuses.filter(s => s !== post.status).map(s => (
                <button key={s} onClick={() => onStatusChange(post.id, s)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors hover:opacity-80 ${statusStyle[s]}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-3 border-t border-stone-100">
            <button onClick={() => onDelete(post.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
              Delete post
            </button>
            <button onClick={onClose}
              className="ml-auto text-sm text-stone-500 border border-stone-200 rounded-lg px-4 py-1.5 hover:bg-stone-50 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [posts, setPosts]     = useState<SocialPost[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient]     = useState('all')
  const [selectedPlatform, setSelectedPlatform] = useState<PostPlatform | 'all'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [clickedDate, setClickedDate]   = useState<string | undefined>()
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')

  useEffect(() => {
    Promise.all([
      supabase.from('social_posts').select('*').order('scheduled_at'),
      supabase.from('clients').select('*').order('company'),
    ]).then(([p, c]) => {
      setPosts((p.data ?? []) as SocialPost[])
      setClients((c.data ?? []) as Client[])
      setLoading(false)
    })
  }, [])

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  const nextMonth = () => { if (month === 11) { setMonth(0);  setYear(y => y+1) } else setMonth(m => m+1) }

  const visiblePosts = posts
    .filter(p => selectedClient  === 'all' || p.client_id === selectedClient)
    .filter(p => selectedPlatform === 'all' || p.platform === selectedPlatform)

  const postsForDay = (day: number) => {
    const key = dateKey(year, month, day)
    return visiblePosts.filter(p => p.scheduled_at?.startsWith(key))
  }

  const monthPosts = visiblePosts.filter(p => {
    if (!p.scheduled_at) return false
    const d = new Date(p.scheduled_at)
    return d.getFullYear() === year && d.getMonth() === month
  })

  const statusCounts = {
    idea:      monthPosts.filter(p => p.status === 'idea').length,
    draft:     monthPosts.filter(p => p.status === 'draft').length,
    scheduled: monthPosts.filter(p => p.status === 'scheduled').length,
    published: monthPosts.filter(p => p.status === 'published').length,
  }

  const updateStatus = async (id: string, status: PostStatus) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    await supabase.from('social_posts').update({ status }).eq('id', id)
    setSelectedPost(prev => prev?.id === id ? { ...prev, status } : prev)
  }

  const updateImages = (id: string, urls: string[]) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, media_urls: urls } : p))
    setSelectedPost(prev => prev?.id === id ? { ...prev, media_urls: urls } : prev)
  }

  const deletePost = async (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id))
    await supabase.from('social_posts').delete().eq('id', id)
    setSelectedPost(null)
  }

  const daysInMonth   = getDaysInMonth(year, month)
  const firstDayOfMonth = getFirstDay(year, month)
  const selectedClientObj = clients.find(c => c.id === selectedClient)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
    </div>
  )

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {selectedPost && (
        <PostDetail
          post={selectedPost}
          clients={clients}
          onClose={() => setSelectedPost(null)}
          onStatusChange={updateStatus}
          onDelete={deletePost}
          onImagesUpdate={updateImages}
        />
      )}
      {showAddModal && (
        <AddPostModal
          clients={clients}
          selectedClientId={selectedClient === 'all' ? (clients[0]?.id ?? '') : selectedClient}
          defaultDate={clickedDate}
          onClose={() => { setShowAddModal(false); setClickedDate(undefined) }}
          onAdded={post => setPosts(prev =>
            [...prev, post].sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
          )}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Social calendar</h1>
          <p className="text-stone-400 text-sm mt-0.5">
            {monthPosts.length} posts in {MONTHS[month]} {year}
            {selectedClientObj ? ` · ${selectedClientObj.company}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-stone-200">
            <button onClick={() => setView('calendar')}
              className={`text-xs font-medium px-3 py-1.5 transition-colors ${view === 'calendar' ? 'bg-indigo-600 text-white' : 'text-stone-500 hover:bg-stone-50'}`}>
              Calendar
            </button>
            <button onClick={() => setView('list')}
              className={`text-xs font-medium px-3 py-1.5 transition-colors ${view === 'list' ? 'bg-indigo-600 text-white' : 'text-stone-500 hover:bg-stone-50'}`}>
              List
            </button>
          </div>
          <button onClick={() => { setClickedDate(undefined); setShowAddModal(true) }}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> New post
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
          className="text-xs border border-stone-200 rounded-lg px-3 py-1.5 text-stone-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
        </select>
        <div className="flex gap-1 flex-wrap">
          {(['all','Instagram','Facebook','LinkedIn','Twitter','TikTok','Pinterest'] as const).map(p => (
            <button key={p} onClick={() => setSelectedPlatform(p)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${selectedPlatform === p ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
              {p}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {Object.entries(statusCounts).map(([s, count]) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle[s as PostStatus]}`}>{s}</span>
              <span className="text-xs text-stone-400 font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
          <ChevronLeft className="w-4 h-4 text-stone-500" />
        </button>
        <h2 className="text-base font-semibold text-stone-800 min-w-36 text-center">{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
          <ChevronRight className="w-4 h-4 text-stone-500" />
        </button>
        <button onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()) }}
          className="text-xs text-indigo-600 hover:underline ml-1">Today</button>
      </div>

      {view === 'calendar' ? (
        <>
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => <div key={d} className="text-xs font-medium text-stone-400 text-center py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 border-l border-t border-stone-200 rounded-xl overflow-hidden">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`e${i}`} className="border-r border-b border-stone-200 bg-stone-50 min-h-28" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dayPosts = postsForDay(day)
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              const key = dateKey(year, month, day)
              return (
                <div key={day}
                  className="border-r border-b border-stone-200 min-h-28 p-1.5 bg-white hover:bg-stone-50 transition-colors group"
                  onClick={() => { setClickedDate(key); setShowAddModal(true) }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-stone-500'}`}>{day}</span>
                    <Plus className="w-3 h-3 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    {dayPosts.slice(0, 3).map(post => (
                      <PostCard key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                    ))}
                    {dayPosts.length > 3 && <p className="text-xs text-stone-400 pl-1">+{dayPosts.length - 3} more</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          {monthPosts.length === 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl py-12 text-center text-stone-400 text-sm">
              No posts scheduled for {MONTHS[month]}. Click "New post" to add one.
            </div>
          )}
          {monthPosts
            .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
            .map(post => {
              const s = platformStyle[post.platform]
              const client = clients.find(c => c.id === post.client_id)
              const hasImages = post.media_urls?.length > 0
              return (
                <div key={post.id} onClick={() => setSelectedPost(post)}
                  className="bg-white border border-stone-200 rounded-xl hover:border-stone-300 cursor-pointer transition-colors flex gap-4 overflow-hidden">
                  {hasImages && (
                    <img src={post.media_urls[0]} alt="" className="w-20 h-20 object-cover shrink-0" />
                  )}
                  <div className="flex items-start gap-3 p-4 flex-1 min-w-0">
                    <div className={`text-xs font-semibold px-2 py-1 rounded-lg shrink-0 ${s.bg} ${s.text}`}>{post.platform}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-700 truncate">{post.caption}</p>
                      {post.hashtags && <p className="text-xs text-indigo-400 mt-0.5 truncate">{post.hashtags}</p>}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {client && <span className="text-xs text-stone-400">{client.company}</span>}
                        {post.scheduled_at && <>
                          <span className="text-stone-200">·</span>
                          <span className="text-xs text-stone-400">
                            {new Date(post.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            {' '}{new Date(post.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>}
                        {hasImages && <>
                          <span className="text-stone-200">·</span>
                          <span className="text-xs text-stone-400 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />{post.media_urls.length} image{post.media_urls.length > 1 ? 's' : ''}
                          </span>
                        </>}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${statusStyle[post.status]}`}>{post.status}</span>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 flex-wrap">
        {Object.entries(platformStyle).map(([platform, s]) => (
          <div key={platform} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${s.dot}`} />
            <span className="text-xs text-stone-400">{platform}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
