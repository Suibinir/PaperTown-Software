import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './supabase-server'
import { TeamRole } from '@/types'

// ───────────────────────────────────────────────────────────────────────────
// Server-side auth helpers.
//
// All authorization decisions MUST go through these helpers (or an equivalent
// getUser() check). The proxy.ts file is a UX convenience only — it never
// validates the session and must not be relied on for security. See the Next 16
// proxy.md doc ("Always verify authentication and authorization inside each
// Server Function rather than relying on Proxy alone").
// ───────────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string
  email: string | null
  /** Role from team_members table; null if no row or a portal/external user. */
  role: TeamRole | null
}

async function loadSession(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Look up the agency team_member row (if any). Portal users have no row.
  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  return {
    id: user.id,
    email: user.email ?? null,
    role: (member?.role as TeamRole | undefined) ?? null,
  }
}

/**
 * Require an authenticated agency user. Redirects to /login if absent.
 * Use this in every (dashboard) server component / layout.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await loadSession()
  if (!session) redirect('/login')
  return session
}

/**
 * Require an authenticated agency user with one of the listed roles.
 * Redirects to /dashboard (with insufficient permission) if the role doesn't
 * match. Admins always pass.
 */
export async function requireRole(...allowed: TeamRole[]): Promise<SessionUser> {
  const session = await requireUser()
  if (session.role === 'admin') return session
  if (session.role && allowed.includes(session.role)) return session
  redirect('/dashboard')
}

/** Convenience: admin-only. */
export function requireAdmin(): Promise<SessionUser> {
  return requireRole('admin')
}

/**
 * Require an authenticated portal (client) user. Redirects to /portal/login.
 * Returns the client_id they are scoped to.
 */
export async function requirePortalUser(): Promise<{ userId: string; clientId: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal/login')

  const { data: portalUser } = await supabase
    .from('portal_users')
    .select('client_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!portalUser) redirect('/portal/login')
  return { userId: user.id, clientId: portalUser.client_id }
}

/** Check a session without redirecting. Returns null if unauthenticated. */
export async function getSession(): Promise<SessionUser | null> {
  return loadSession()
}
