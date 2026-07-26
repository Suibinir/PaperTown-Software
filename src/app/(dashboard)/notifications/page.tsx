'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Notification } from '@/types'
import { Loader2, CheckCheck, Trash2, RefreshCw } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

const typeColor: Record<string, string> = {
  'Static':       'bg-indigo-500',
  'Video':        'bg-sky-500',
  'Motion Video': 'bg-purple-500',
  'Reel':         'bg-pink-500',
  'Cover Photo':  'bg-amber-500',
  'Story':        'bg-emerald-500',
  'Carousel':     'bg-orange-500',
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading]     = useState(true)
  const [generating, setGenerating] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const load = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
    setNotifications((data ?? []) as Notification[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = async () => {
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setNotifications([])
  }

  const generateDigest = async () => {
    setGenerating(true)
    const res  = await fetch('/api/weekly-digest')
    const data = await res.json()
    await load()
    setGenerating(false)
  }

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
    </div>
  )

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Notifications</h1>
          <p className="text-stone-400 text-sm mt-0.5">
            {notifications.length} total · {unreadCount} unread
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generateDigest} disabled={generating}
            className="flex items-center gap-1.5 text-sm font-medium border border-stone-200 text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-50 disabled:opacity-60 transition-colors">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {generating ? 'Generating…' : 'Generate digest'}
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 text-sm font-medium border border-stone-200 text-stone-600 px-3 py-2 rounded-lg hover:bg-stone-50 transition-colors">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll}
              className="text-xs text-red-400 hover:text-red-600 transition-colors">
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
            {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Generate digest CTA if empty */}
      {notifications.length === 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl py-16 text-center">
          <p className="text-stone-400 text-sm mb-4">No notifications yet.</p>
          <button onClick={generateDigest} disabled={generating}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors mx-auto">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : '📊'}
            Generate first digest
          </button>
        </div>
      )}

      {/* Notification cards */}
      <div className="space-y-3">
        {filtered.map(n => (
          <div key={n.id}
            onClick={() => !n.read && markRead(n.id)}
            className={`bg-white border rounded-2xl p-5 transition-all cursor-pointer group ${!n.read ? 'border-indigo-200 bg-indigo-50/30' : 'border-stone-200 hover:border-stone-300'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {!n.read && <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1.5" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${!n.read ? 'text-stone-800' : 'text-stone-600'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {timeAgo(n.created_at)}
                    {n.recipient_role && ` · for ${n.recipient_role.replace('_', ' ')}`}
                  </p>
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteNotification(n.id) }}
                className="text-stone-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Weekly digest breakdown */}
            {n.type === 'weekly_digest' && n.data?.clientBreakdowns && (
              <div className="mt-4 space-y-4">
                {/* Days remaining banner */}
                <div className="bg-indigo-600 text-white rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {MONTHS[n.data.month]} {n.data.year}
                  </span>
                  <span className="text-sm font-bold">
                    {n.data.daysLeft} days remaining
                  </span>
                </div>

                {/* Per-client breakdown */}
                {n.data.clientBreakdowns.map((b: any) => (
                  <div key={b.clientId} className="border border-stone-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-stone-800">{b.clientName}</p>
                      <div className="flex gap-3 text-xs text-stone-500">
                        <span>{b.total} posts</span>
                        <span className="text-emerald-600 font-medium">{b.done} done</span>
                        <span className="text-amber-600">{b.planned} planned</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-stone-100 rounded-full h-1.5 mb-3">
                      <div
                        className="h-1.5 rounded-full bg-emerald-400 transition-all"
                        style={{ width: `${b.total > 0 ? (b.done / b.total) * 100 : 0}%` }}
                      />
                    </div>

                    {/* Type pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(b.typeCounts).map(([type, count]: [string, any]) => (
                        <span key={type}
                          className={`text-xs font-semibold text-white px-2.5 py-1 rounded-full ${typeColor[type] ?? 'bg-stone-400'}`}>
                          {type} · {count}
                        </span>
                      ))}
                      {Object.keys(b.typeCounts).length === 0 && (
                        <span className="text-xs text-stone-400 italic">No content types assigned yet</span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Role-specific note */}
                {n.recipient_role === 'designer' && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                    <p className="text-xs text-amber-700">
                      🎨 <span className="font-medium">Designer reminder:</span> Make sure all assets for planned posts are ready before end of month.
                    </p>
                  </div>
                )}
                {n.recipient_role === 'admin' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                    <p className="text-xs text-blue-700">
                      📋 <span className="font-medium">Admin note:</span> Review posts still in "planned" status and confirm team is on track.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && notifications.length > 0 && (
          <div className="text-center text-stone-400 text-sm py-8">
            No unread notifications.
          </div>
        )}
      </div>
    </div>
  )
}
