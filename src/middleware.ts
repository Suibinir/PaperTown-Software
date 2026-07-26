import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const cookies = request.cookies.getAll()
  const hasSession = cookies.some(c =>
    c.name.includes('auth-token') || c.name.includes('sb-')
  )

  const publicPaths = ['/login', '/portal/login', '/api/', '/_next/', '/favicon.ico']
  const isPublic = publicPaths.some(p => path.startsWith(p))

  if (isPublic) return NextResponse.next()

  const isDashboard = [
    '/dashboard', '/leads', '/clients', '/campaigns', '/deliverables',
    '/comms', '/reports', '/calendar', '/onboarding', '/vault', '/team',
    '/settings', '/notifications', '/adinsights', '/content-calendar'
  ].some(p => path.startsWith(p))

  if (isDashboard && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (path === '/portal' && !hasSession) {
    return NextResponse.redirect(new URL('/portal/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
