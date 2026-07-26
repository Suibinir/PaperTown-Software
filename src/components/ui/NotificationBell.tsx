'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Notification } from '@/types'
import { Bell, X, CheckCheck, Loader2 } from 'lucide-react'
import Link from 'next/link'

const CONTENT_TYPES = ['Static','Video','Motion Video','Reel','Cover Photo','Story','Carousel']

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
  const mins  = Math.floor(diff / 60000)
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationBell() {
  const [open, setOpen]             = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [generating, setGenerating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.read).length

  const load = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications((data ?? []) as Notification[])
  }

  useEffect(() => {
    load()
    // Poll every 30 seconds for new notifications
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (!unreadIds.length) return
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const generateDigest = async () => {
    setGenerating(true)
    await fetch('/api/weekly-digest')
    await load()
    setGenerating(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-7 h-7 rounded-lg hover:bg-stone-200 transition-colors"
      >
        <Bell className="w-4 h-4 text-stone-500" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-8 left-0 w-80 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-stone-800">Notifications</h3>
              {unread > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">{unread}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" /> All read
                </button>
              )}
              <button onClick={() => setOpen(false)}>
                <X className="w-3.5 h-3.5 text-stone-400 hover:text-stone-600" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-72 overflow-y-auto divide-y divide-stone-100">
            {notifications.length === 0 && (
              <div className="px-4 py-6 text-center text-stone-400 text-xs">No notifications yet.</div>
            )}
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`px-4 py-3 cursor-pointer hover:bg-stone-50 transition-colors ${!n.read ? 'bg-indigo-50/40' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs font-medium leading-snug ${!n.read ? 'text-stone-800' : 'text-stone-500'}`}>
                    {n.title}
                  </p>
                  {!n.read && <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1" />}
                </div>
                {n.type === 'weekly_digest' && n.data?.clientBreakdowns && (
                  <div className="mt-2 space-y-1.5">
                    {n.data.clientBreakdowns.slice(0, 2).map((b: any) => (
                      <div key={b.clientId}>
                        <p className="text-xs text-stone-500 font-medium">{b.clientName} — {b.total} posts</p>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {Object.entries(b.typeCounts).map(([type, count]: [string, any]) => (
                            <span key={type} className={`text-xs text-white px-1.5 py-0.5 rounded-full ${typeColor[type] ?? 'bg-stone-400'}`}>
                              {type} {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {n.data.clientBreakdowns.length > 2 && (
                      <p className="text-xs text-stone-400">+{n.data.clientBreakdowns.length - 2} more clients</p>
                    )}
                  </div>
                )}
                <p className="text-xs text-stone-400 mt-1">{timeAgo(n.created_at)} · {n.recipient_role ?? 'all'}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-stone-100 flex items-center justify-between">
            <button onClick={generateDigest} disabled={generating}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline disabled:opacity-60">
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : '📊'}
              {generating ? 'Generating…' : 'Generate digest now'}
            </button>
            <Link href="/notifications" onClick={() => setOpen(false)}
              className="text-xs text-stone-400 hover:text-stone-600">
              View all →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
