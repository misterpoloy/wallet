import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@wallet/db'
import { ok, badRequest, handleError } from '@/lib/api/response'

// Hardcoded until auth is wired — maps to the seeded user
const DEFAULT_USER_ID = 'user_juan_portiz'
const DEFAULT_TIMEZONE = 'America/Mexico_City'

const UpdateUserSchema = z.object({
  timezone: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  avatarColor: z.string().optional(),
})

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'jp@calaps.com' },
      select: { id: true, name: true, email: true, avatarColor: true, timezone: true },
    })
    // Return defaults if user not yet in DB
    return ok(user ?? { id: DEFAULT_USER_ID, name: 'Juan Portiz', email: 'jp@calaps.com', avatarColor: '#7c3aed', timezone: DEFAULT_TIMEZONE })
  } catch (e) {
    return handleError(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const data = UpdateUserSchema.parse(body)

    const user = await prisma.user.upsert({
      where: { email: 'jp@calaps.com' },
      create: { email: 'jp@calaps.com', name: 'Juan Portiz', avatarColor: '#7c3aed', timezone: data.timezone ?? DEFAULT_TIMEZONE },
      update: data,
      select: { id: true, name: true, email: true, avatarColor: true, timezone: true },
    })
    return ok(user)
  } catch (e) {
    return handleError(e)
  }
}
