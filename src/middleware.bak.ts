import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Check for Supabase session cookie directly
  const cookies = request.cookies.getAll()
  const hasSession = cookies.some(c => 
    c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )

  const isDashboard = [
    '/dashboard', '/leads', '/clients', '/campaigns', '/deliverables',
    '/comms', '/reports', '/calendar', '/onboarding', '/vault', '/team', '/settings'
  ].some(p => path.startsWith(p))

  if (isDashboard && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (path === '/login' && hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (path.startsWith('/portal') && !path.startsWith('/portal/login') && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/portal/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*', '/leads/:path*', '/clients/:path*', '/campaigns/:path*',
    '/deliverables/:path*', '/comms/:path*', '/reports/:path*', '/calendar/:path*',
    '/onboarding/:path*', '/vault/:path*', '/team/:path*', '/settings/:path*',
    '/portal/:path*', '/login',
  ],
}
