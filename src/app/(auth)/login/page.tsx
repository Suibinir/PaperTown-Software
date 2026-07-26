'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Zap, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const submit = async () => {
    if (!email || !password) { setError('Email and password are required.'); return }
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      setLoading(false)
      setError('Invalid email or password: ' + err.message)
      return
    }

    if (!data.session) {
      setLoading(false)
      setError('Login succeeded but no session returned. Check Supabase email confirmation settings.')
      return
    }

    // Log cookie names to console so we can debug middleware
    console.log('Session obtained, cookies:', document.cookie)
    console.log('Access token preview:', data.session.access_token.slice(0, 20))

    // Wait a tick for cookies to be written then navigate
    setTimeout(() => {
      window.location.replace('/dashboard')
    }, 300)
  }

  const field = 'w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-stone-800 text-lg">PaperTown</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-stone-800 mb-1">Team login</h1>
          <p className="text-sm text-stone-400 mb-6">Sign in to your agency workspace.</p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1.5 block">Email</label>
              <input className={field} type="email" placeholder="you@agency.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
            </div>

            <div>
              <label className="text-xs font-medium text-stone-500 mb-1.5 block">Password</label>
              <div className="relative">
                <input className={field} type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button onClick={submit} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-medium py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors mt-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </div>

        <p className="text-xs text-center text-stone-400 mt-4">
          Forgot your password? Ask your agency admin to reset it.
        </p>
      </div>
    </div>
  )
}
