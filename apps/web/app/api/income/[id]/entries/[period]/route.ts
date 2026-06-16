import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, EntryStatus } from '@wallet/db'
import { ok, notFound, handleError, DEFAULT_TENANT_ID } from '@/lib/api/response'

const PatchSchema = z.object({
  status:        z.nativeEnum(EntryStatus),
  subPeriod:     z.number().int().min(1).max(2).default(1),
  actualAmount:  z.number().positive().optional(),
  receivedAt:    z.string().optional(),
  note:          z.string().optional(),
  accountId:     z.string().optional(),
})

// PATCH /api/income/[id]/entries/[period]
// Upserts the income entry for a given YYYY-MM period + subPeriod (1 or 2)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; period: string } }
) {
  try {
    const source = await prisma.incomeSource.findFirst({
      where: { id: params.id, tenantId: DEFAULT_TENANT_ID },
    })
    if (!source) return notFound()

    const body = await req.json()
    const data = PatchSchema.parse(body)

    const receivedAt = data.receivedAt
      ? new Date(data.receivedAt)
      : data.status === 'received' ? new Date() : null

    const entry = await prisma.incomeEntry.upsert({
      where: {
        incomeSourceId_period_subPeriod: {
          incomeSourceId: params.id,
          period:         params.period,
          subPeriod:      data.subPeriod,
        },
      },
      create: {
        incomeSourceId: params.id,
        period:         params.period,
        subPeriod:      data.subPeriod,
        expectedAmount: source.grossAmount,
        status:         data.status,
        actualAmount:   data.actualAmount,
        receivedAt,
        accountId:      data.accountId,
        note:           data.note,
      },
      update: {
        status:        data.status,
        actualAmount:  data.actualAmount,
        receivedAt,
        accountId:     data.accountId,
        note:          data.note,
      },
    })
    return ok(entry)
  } catch (e) { return handleError(e) }
}
