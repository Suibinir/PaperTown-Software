export const dynamic = 'force-dynamic'

import Sidebar from '@/components/layout/Sidebar'
import { requireUser } from '@/lib/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Single authentication gate for every (dashboard)/* route. Server-side,
  // validated via Supabase getUser(). Redirects to /login if unauthenticated.
  // (proxy.ts also redirects unauthenticated browser nav, but the docs are
  // explicit that proxy must not be the only auth check.)
  await requireUser()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
