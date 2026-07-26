'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, Check, LogOut, Zap, Trash2 } from 'lucide-react'

interface AgencySettings {
  agency_name: string
  logo_url: string | null
  primary_color: string
}

export default function SettingsPage() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [agencyName, setAgencyName] = useState('PaperTown')
  const [logoUrl, setLogoUrl]       = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState('')
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null)
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwError, setPwError]   = useState('')
  const [pwSaved, setPwSaved]   = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('agency_settings').select('agency_name, logo_url').single(),
      supabase.auth.getUser(),
    ]).then(([s, u]) => {
      if (s.data) {
        setAgencyName(s.data.agency_name ?? 'PaperTown')
        setLogoUrl(s.data.logo_url ?? null)
      }
      if (u.data.user) setCurrentUser({ email: u.data.user.email ?? '' })
      setLoading(false)
    })
  }, [])

  const save = async () => {
    setSaving(true)
    setError('')
    // Use raw SQL via rpc to avoid WHERE clause issues
    const { error: err } = await supabase.rpc('update_agency_settings', {
      p_name: agencyName,
      p_logo: logoUrl,
    })
    if (err) {
      // Fallback: try direct update with true condition
      const { error: err2 } = await supabase
        .from('agency_settings')
        .update({ agency_name: agencyName })
        .gt('next_inv_num', 0)
      if (err2) { setError(err2.message); setSaving(false); return }
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const uploadLogo = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Logo must be under 2MB.'); return }
    setUploading(true)
    setError('')
    const ext  = file.name.split('.').pop()
    const path = `logos/agency-logo-${Date.now()}.${ext}`
    const { data, error: upErr } = await supabase.storage
      .from('social-media').upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('social-media').getPublicUrl(data.path)
    const url = urlData.publicUrl
    await supabase.from('agency_settings').update({ logo_url: url }).gt('next_inv_num', 0)
    setLogoUrl(url)
    setUploading(false)
  }

  const removeLogo = async () => {
    await supabase.from('agency_settings').update({ logo_url: null }).gt('next_inv_num', 0)
    setLogoUrl(null)
  }

  const changePassword = async () => {
    if (newPassword.length < 8) { setPwError('Min. 8 characters.'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return }
    setSavingPw(true)
    setPwError('')
    const { error: err } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPw(false)
    if (err) { setPwError(err.message); return }
    setNewPassword(''); setConfirmPassword('')
    setPwSaved(true)
    setTimeout(() => setPwSaved(false), 2000)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const field = 'w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-neutral-300" />
    </div>
  )

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="text-neutral-400 text-sm mt-0.5">Manage your agency profile and account.</p>
      </div>

      {/* Agency branding */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-neutral-700 mb-4">Agency branding</h2>

        {/* Logo */}
        <div className="mb-5">
          <label className="text-xs font-medium text-neutral-500 mb-2 block">Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border border-neutral-200 flex items-center justify-center bg-neutral-50 overflow-hidden">
              {logoUrl
                ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                : <Zap className="w-6 h-6 text-neutral-400" />
              }
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 text-xs font-medium bg-neutral-100 text-neutral-600 px-3 py-2 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-60">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? 'Uploading…' : 'Upload logo'}
              </button>
              {logoUrl && (
                <button onClick={removeLogo} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              )}
              <p className="text-xs text-neutral-400">PNG, JPG or SVG · max 2MB</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
        </div>

        {/* Agency name */}
        <div className="mb-5">
          <label className="text-xs font-medium text-neutral-500 mb-1 block">Agency name</label>
          <input className={field} value={agencyName}
            onChange={e => setAgencyName(e.target.value)}
            placeholder="Your Agency Name" />
        </div>

        {/* Preview */}
        <div className="bg-neutral-50 rounded-xl p-3 mb-5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center overflow-hidden">
            {logoUrl
              ? <img src={logoUrl} alt="" className="w-full h-full object-contain" />
              : <Zap className="w-3.5 h-3.5 text-white" />
            }
          </div>
          <span className="text-sm font-semibold text-neutral-800">{agencyName || 'Agency Name'}</span>
          <span className="text-xs text-neutral-400 ml-1">← sidebar preview</span>
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 text-sm font-semibold bg-neutral-900 text-white px-4 py-2 rounded-lg hover:bg-black disabled:opacity-60 transition-colors">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saved  && <Check className="w-3.5 h-3.5" />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
        </button>
      </div>

      {/* Account */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6 mb-4">
        <h2 className="text-sm font-semibold text-neutral-700 mb-1">Your account</h2>
        {currentUser && <p className="text-xs text-neutral-400 mb-4">Logged in as <span className="font-medium text-neutral-600">{currentUser.email}</span></p>}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">New password</label>
            <input className={field} type="password" placeholder="Min. 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">Confirm password</label>
            <input className={field} type="password" placeholder="Repeat new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          {pwError && <p className="text-xs text-red-500">{pwError}</p>}
          <button onClick={changePassword} disabled={savingPw || !newPassword}
            className="flex items-center gap-2 text-sm font-semibold bg-neutral-900 text-white px-4 py-2 rounded-lg hover:bg-black disabled:opacity-60 transition-colors">
            {savingPw && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {pwSaved  && <Check className="w-3.5 h-3.5" />}
            {savingPw ? 'Updating…' : pwSaved ? 'Updated!' : 'Update password'}
          </button>
        </div>
      </div>

      {/* Sign out */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-neutral-700 mb-1">Sign out</h2>
        <p className="text-xs text-neutral-400 mb-4">Sign out of your agency workspace on this device.</p>
        <button onClick={signOut}
          className="flex items-center gap-2 text-sm font-medium text-red-500 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  )
}
