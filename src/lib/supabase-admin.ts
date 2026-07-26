import { createClient } from '@supabase/supabase-js'

// ───────────────────────────────────────────────────────────────────────────
// Privileged Supabase client (service role).
//
// IMPORTANT: This bypasses Row Level Security. Only import this from code that
// runs on the server (Route Handlers with `export const runtime`, server
// components, server functions). NEVER import from a 'use client' file. The
// service-role key must be set via the non-public SUPABASE_SERVICE_ROLE_KEY
// env var and must NEVER be prefixed with NEXT_PUBLIC_.
// ───────────────────────────────────────────────────────────────────────────

let cached: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (server-only, never NEXT_PUBLIC_).',
    )
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
