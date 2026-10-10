import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth/session'

const PUBLIC = ['/login', '/api/auth/login', '/api/auth/logout']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token) : null
  if (!session) {
    // API callers (web fetch, iOS app) get a JSON 401 they can act on; pages go to /login.
    const res = pathname.startsWith('/api/')
      ? NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', req.url))
    if (token) res.cookies.delete(COOKIE_NAME)
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
