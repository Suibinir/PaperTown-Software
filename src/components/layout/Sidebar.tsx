'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Megaphone, CheckSquare, BarChart3,
  UserCircle, ChevronRight, MessageSquare, CalendarDays,
  ClipboardList, ShieldCheck, UsersRound, Settings, LogOut,
  TrendingUp, TableProperties, DollarSign, Zap
} from 'lucide-react'
import NotificationBell from '@/components/ui/NotificationBell'

const nav = [
  { label: 'Dashboard',        href: '/dashboard',          icon: LayoutDashboard },
  { label: 'Leads',            href: '/leads',               icon: UserCircle },
  { label: 'Clients',          href: '/clients',             icon: Users },
  { label: 'Onboarding',       href: '/onboarding',          icon: ClipboardList },
  { label: 'Campaigns',        href: '/campaigns',           icon: Megaphone },
  { label: 'Deliverables',     href: '/deliverables',        icon: CheckSquare },
  { label: 'Social',           href: '/calendar',            icon: CalendarDays },
  { label: 'Content Calendar', href: '/content-calendar',    icon: TableProperties },
  { label: 'Meta Ads',         href: '/adinsights',          icon: TrendingUp },
  { label: 'Comms log',        href: '/comms',               icon: MessageSquare },
  { label: 'Finance',          href: '/finance',             icon: DollarSign },
  { label: 'Vault',            href: '/vault',               icon: ShieldCheck },
  { label: 'Team',             href: '/team',                icon: UsersRound },
  { label: 'Reports',          href: '/reports',             icon: BarChart3 },
]

export default function Sidebar() {
  const path   = usePathname()
  const router = useRouter()
  const [agencyName, setAgencyName] = useState('PaperTown')
  const [logoUrl, setLogoUrl]       = useState<string | null>(null)
  const [userEmail, setUserEmail]   = useState('')

  useEffect(() => {
    supabase.from('agency_settings').select('agency_name, logo_url').single()
      .then(({ data }) => {
        if (data?.agency_name) setAgencyName(data.agency_name)
        if (data?.logo_url)    setLogoUrl(data.logo_url)
      })
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? '')
    })
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-neutral-200 bg-neutral-950 min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-neutral-800">
        <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl
            ? <img src={logoUrl} alt="" className="w-full h-full object-contain p-0.5" />
            : <Zap className="w-4 h-4 text-black" />
          }
        </div>
        <span className="font-semibold text-white tracking-tight truncate text-sm">{agencyName}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = path === href || (href !== '/dashboard' && path.startsWith(href))
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group',
                active
                  ? 'bg-white text-black font-medium'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              )}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-40" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-neutral-800 space-y-1">
        <Link href="/settings"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
            path === '/settings' ? 'bg-white text-black font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
          )}>
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </Link>

        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {userEmail?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <span className="flex-1 text-xs text-neutral-500 truncate">{userEmail || 'Admin'}</span>
          <NotificationBell />
          <button onClick={signOut} className="text-neutral-600 hover:text-red-400 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
