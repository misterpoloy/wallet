import { NextRequest } from 'next/server'
import { z } from 'zod'
import { handleError, notFound, ok } from '@/lib/api/response'
import { requireCtx } from '@/lib/auth/ctx'
import { requireMansaAccess, toolCtx } from '@/lib/mansa/agent'
import { walletRegistry } from '@/lib/mansa/handlers'

// Dev-only window into the agent's tools: the same handlers the model calls,
// invoked directly with the caller's session. Never available in production.
export const dynamic = 'force-dynamic'

const CallSchema = z.object({ name: z.string(), input: z.unknown().optional() })

function devOnly() {
  return process.env.NODE_ENV === 'production' ? notFound() : null
}

export async function GET() {
  try {
    const blocked = devOnly()
    if (blocked) return blocked
    const ctx = await requireCtx()
    requireMansaAccess(ctx)
    const specs = await walletRegistry().specs()
    return ok(specs.map((s) => s.toolSpec?.name))
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const blocked = devOnly()
    if (blocked) return blocked
    const ctx = await requireCtx()
    requireMansaAccess(ctx)
    const { name, input } = CallSchema.parse(await req.json())
    const started = Date.now()
    const outcome = await walletRegistry().call(name, input ?? {}, await toolCtx(ctx, { channel: 'cli', runtime: 'raw' }))
    return ok({ ...outcome, ms: Date.now() - started })
  } catch (e) {
    return handleError(e)
  }
}
