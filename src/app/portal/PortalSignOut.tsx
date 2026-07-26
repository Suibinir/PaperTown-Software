'use client'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function PortalSignOut() {
  const router = useRouter()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/portal/login')
    router.refresh()
  }

  return (
    <button
      onClick={signOut}
      className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors"
    >
      <LogOut className="w-3.5 h-3.5" />
      Sign out
    </button>
  )
}
