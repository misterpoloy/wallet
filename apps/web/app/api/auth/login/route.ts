import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { prisma } from '@wallet/db'
import { createSessionToken, COOKIE_NAME, MAX_AGE } from '@/lib/auth/session'

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const attempt = crypto.pbkdf2Sync(password, salt, 100_000, 32, 'sha256').toString('hex')
  // timing-safe compare
  const a = Buffer.from(attempt)
  const b = Buffer.from(hash)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, passwordHash: true, memberships: {
        select: { tenantId: true, role: true },
        orderBy: { joinedAt: 'asc' },
        take: 1,
      }},
    })

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const membership = user.memberships[0]
    if (!membership) {
      return NextResponse.json({ error: 'No tenant membership found' }, { status: 403 })
    }

    const token = await createSessionToken({
      userId: user.id,
      tenantId: membership.tenantId,
      role: membership.role,
      email: user.email,
    })

    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: MAX_AGE,
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
