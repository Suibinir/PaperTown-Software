'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Zap, Mail } from 'lucide-react'

export default function PortalLoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!email) { setError('Please enter your email.'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/portal` },
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  const field = 'w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-stone-800">PaperTown</span>
          <span className="text-stone-300">·</span>
          <span className="text-sm text-stone-400">Client Portal</span>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
          {!sent ? (
            <>
              <h1 className="text-xl font-semibold text-stone-800 mb-1">Welcome back</h1>
              <p className="text-sm text-stone-400 mb-6">Enter your email and we'll send you a magic link.</p>
              <div className="space-y-3">
                <input className={field} type="email" placeholder="you@company.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button onClick={submit} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-medium py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Mail className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
              <h2 className="font-semibold text-stone-800 mb-2">Check your inbox</h2>
              <p className="text-sm text-stone-400">We sent a magic link to <span className="font-medium text-stone-600">{email}</span>.</p>
              <button onClick={() => setSent(false)} className="mt-4 text-xs text-indigo-600 hover:underline">Use a different email</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
