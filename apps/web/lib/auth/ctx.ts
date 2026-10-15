// Request identity for server components and route handlers.
// The tenant always comes from the signed session cookie, never from a literal or the client.

import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_NAME, verifySessionToken } from './session'

export type Role = 'owner' | 'admin' | 'viewer'

export interface Ctx {
  tenantId: string
  userId: string
  role: Role
  email: string
}

export class UnauthorizedError extends Error {
  readonly status = 401
}

export class ForbiddenError extends Error {
  readonly status = 403
}

// One HMAC verification per request, however many helpers ask.
const readCtx = cache(async (): Promise<Ctx | null> => {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) return null
  const session = await verifySessionToken(token)
  if (!session) return null
  return {
    tenantId: session.tenantId,
    userId: session.userId,
    role: session.role as Role,
    email: session.email,
  }
})

/** Route handlers: throws UnauthorizedError (mapped to 401 by handleError). */
export async function requireCtx(): Promise<Ctx> {
  const ctx = await readCtx()
  if (!ctx) throw new UnauthorizedError('Not signed in')
  return ctx
}

/** Server components: sends the visitor to /login when there is no valid session. */
export async function getServerCtx(): Promise<Ctx> {
  const ctx = await readCtx()
  if (!ctx) redirect('/login')
  return ctx
}

/** Viewers can read but not change anything. */
export function requireWriter(ctx: Ctx): void {
  if (ctx.role === 'viewer') throw new ForbiddenError('This member has read-only access')
}
