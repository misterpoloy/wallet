import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@wallet/db'
import { ok, notFound, handleError } from '@/lib/api/response'
import { requireCtx } from '@/lib/auth/ctx'

const UpdateUserSchema = z.object({
  timezone: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  avatarColor: z.string().optional(),
})

const PUBLIC_FIELDS = { id: true, name: true, email: true, avatarColor: true, timezone: true } as const

export async function GET() {
  try {
    const ctx = await requireCtx()
    const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: PUBLIC_FIELDS })
    if (!user) return notFound('User not found')
    return ok(user)
  } catch (e) {
    return handleError(e)
  }
}

// Profile edits apply to the signed-in user only; viewers may edit their own profile.
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireCtx()
    const data = UpdateUserSchema.parse(await req.json())
    const user = await prisma.user.update({ where: { id: ctx.userId }, data, select: PUBLIC_FIELDS })
    return ok(user)
  } catch (e) {
    return handleError(e)
  }
}
