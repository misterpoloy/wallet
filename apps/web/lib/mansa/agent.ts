// Wallet-side wiring for Mansa Musa: who is asking (ToolCtx), AWS credentials, Bedrock client.

import { createBedrockClient, type Channel, type Locale, type RuntimeKind, type ToolCtx } from '@mansamusa/core'
import { awsCredentialsProvider } from '@vercel/functions/oidc'
import { prisma } from '@wallet/db'
import type { Ctx } from '@/lib/auth/ctx'
import { ForbiddenError } from '@/lib/auth/ctx'
import { DEFAULT_TIMEZONE } from '@/lib/timezone'
import { mansaEnabled } from './flags'

export { mansaEnabled }

/** Mansa Musa is owner/admin only until it ships to everyone (D-16). */
export function requireMansaAccess(ctx: Ctx): void {
  if (!mansaEnabled()) throw new ForbiddenError('Mansa Musa is not enabled')
  if (ctx.role === 'viewer') throw new ForbiddenError('Mansa Musa is not available for read-only members')
}

export async function toolCtx(
  ctx: Ctx,
  opts: { channel: Channel; runtime: RuntimeKind; locale?: Locale; demo?: boolean },
): Promise<ToolCtx> {
  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { timezone: true } })
  return {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    locale: opts.locale ?? 'auto',
    channel: opts.channel,
    runtime: opts.runtime,
    demo: opts.demo ?? false,
    timezone: user?.timezone ?? DEFAULT_TIMEZONE,
  }
}

let client: ReturnType<typeof createBedrockClient> | undefined

/**
 * On Vercel: short-lived credentials from the project's OIDC token (no static keys).
 * Vercel injects placeholder AWS_* credentials and a runtime AWS_REGION into every
 * function, so we never rely on the default chain or AWS_REGION there.
 * Locally: the default AWS credential chain (AWS_PROFILE / ~/.aws).
 */
export function bedrock() {
  if (!client) {
    const roleArn = process.env.AWS_ROLE_ARN
    if (process.env.VERCEL && !roleArn) throw new Error('AWS_ROLE_ARN is not set (Vercel OIDC role for Bedrock)')
    client = createBedrockClient({
      region: process.env.MANSA_AWS_REGION ?? 'us-east-1',
      ...(process.env.VERCEL && roleArn ? { credentials: awsCredentialsProvider({ roleArn }) } : {}),
    })
  }
  return client
}
