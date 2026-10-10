import { NextRequest } from 'next/server'
import type { GuardrailStreamConfiguration, Message } from '@aws-sdk/client-bedrock-runtime'
import { z } from 'zod'
import {
  PERSONA, SSE_HEADERS, appendUserText, encodeSSE, modelFor, requestContext, runAgent,
  type AgentEvent, type ToolCtx,
} from '@mansamusa/core'
import { handleError } from '@/lib/api/response'
import { requireCtx } from '@/lib/auth/ctx'
import { bedrock, requireMansaAccess, toolCtx } from '@/lib/mansa/agent'
import { walletRegistry } from '@/lib/mansa/handlers'

// POST /api/agent/raw — Mansa Musa with the agent loop running in this function.
// The client keeps the conversation (Bedrock messages) and sends it back each turn.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_HISTORY = 40

const BodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.array(z.record(z.unknown())) })).max(200).default([]),
  locale: z.enum(['es', 'en', 'auto']).default('auto'),
  demo: z.boolean().default(false),
})

/** Keep the tail of the conversation, starting at a plain user turn (never an orphan tool result). */
function trimHistory(history: Message[]): Message[] {
  const tail = history.slice(-MAX_HISTORY)
  const start = tail.findIndex((m) => m.role === 'user' && (m.content ?? []).some((b) => 'text' in b) && !(m.content ?? []).some((b) => 'toolResult' in b))
  return start === -1 ? [] : tail.slice(start)
}

function guardrailFor(ctx: ToolCtx): GuardrailStreamConfiguration | undefined {
  const id = ctx.demo ? process.env.MANSA_DEMO_GUARDRAIL_ID : process.env.MANSA_GUARDRAIL_ID
  const version = ctx.demo ? process.env.MANSA_DEMO_GUARDRAIL_VERSION : process.env.MANSA_GUARDRAIL_VERSION
  return id && version ? { guardrailIdentifier: id, guardrailVersion: version, streamProcessingMode: 'async' } : undefined
}

async function* run(ctx: ToolCtx, messages: Message[], signal: AbortSignal): AsyncGenerator<AgentEvent> {
  let modelId: string
  try {
    modelId = modelFor('chat', process.env)
  } catch (error) {
    yield { type: 'error', message: (error as Error).message, retryable: false }
    yield { type: 'done', stopReason: 'error', steps: 0, messages }
    return
  }
  yield* runAgent({
    client: bedrock(),
    modelId,
    persona: PERSONA,
    context: requestContext(ctx),
    messages,
    registry: walletRegistry(),
    ctx,
    guardrail: guardrailFor(ctx),
    signal,
  })
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireCtx()
    requireMansaAccess(session)
    const body = BodySchema.parse(await req.json())
    const ctx = await toolCtx(session, { channel: 'web', runtime: 'raw', locale: body.locale, demo: body.demo })
    const messages = appendUserText(trimHistory(body.history as unknown as Message[]), body.message)

    const started = Date.now()
    const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
    const tools: string[] = []
    let stopReason = 'unknown'

    const stream = encodeSSE(run(ctx, messages, req.signal), {
      onEvent: (e) => {
        if (e.type === 'usage') {
          usage.input += e.inputTokens; usage.output += e.outputTokens
          usage.cacheRead += e.cacheReadTokens; usage.cacheWrite += e.cacheWriteTokens
        } else if (e.type === 'tool_call') tools.push(e.name)
        else if (e.type === 'done') stopReason = e.stopReason
      },
      // AgentRun persistence lands with the P4.02 schema; until then the run is logged.
      onClose: () => {
        console.info('[mansa] run', JSON.stringify({ runtime: 'raw', tenant: ctx.tenantId, stopReason, ms: Date.now() - started, usage, tools }))
      },
    })
    return new Response(stream, { headers: SSE_HEADERS })
  } catch (e) {
    return handleError(e)
  }
}
