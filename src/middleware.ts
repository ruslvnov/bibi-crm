import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import type { SessionData } from '@/types'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/integrations/ycloud']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()

  // Skip static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next()

  const session = await getIronSession<SessionData>(req, NextResponse.next(), {
    password: process.env.SESSION_SECRET!,
    cookieName: 'dental_session',
  })

  if (!session.userId) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, code: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
