import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, Currency, TransactionType, PaymentType } from '@wallet/db'
import { ok, noContent, notFound, handleError, DEFAULT_TENANT_ID } from '@/lib/api/response'
import { balanceDelta } from '@/lib/account-balance'

const UpdateTransactionSchema = z.object({
  category: z.string().min(1).optional(),
  categoryRaw: z.string().optional(),
  currency: z.nativeEnum(Currency).optional(),
  amount: z.number().positive().optional(),
  refAmount: z.number().optional(),
  type: z.nativeEnum(TransactionType).optional(),
  paymentType: z.nativeEnum(PaymentType).optional(),
  note: z.string().nullable().optional(),
  payee: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  date: z.string().datetime().optional(),
  isRecurring: z.boolean().optional(),
  recurringId: z.string().nullable().optional(),
})

// ─── GET /api/transactions/[id] ───────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tx = await prisma.transaction.findFirst({
      where: { id: params.id, tenantId: DEFAULT_TENANT_ID },
      include: {
        account: {
          select: {
            id: true, name: true, institution: true,
            color: true, colorEnd: true, currency: true,
            accountType: true, lastFour: true,
          },
        },
        recurring: true,
      },
    })

    if (!tx) return notFound()

    // If this is a transfer, fetch the paired leg
    let transferPair = null
    if (tx.isTransfer && tx.transferGroupId) {
      transferPair = await prisma.transaction.findFirst({
        where: {
          transferGroupId: tx.transferGroupId,
          id: { not: tx.id },
        },
        include: {
          account: {
            select: { id: true, name: true, institution: true, color: true, colorEnd: true },
          },
        },
      })
    }

    // Related: same account, excluding current
    const related = await prisma.transaction.findMany({
      where: {
        accountId: tx.accountId,
        id: { not: tx.id },
        isTransfer: false,
      },
      orderBy: { date: 'desc' },
      take: 4,
    })

    return ok({ ...tx, transferPair, related })
  } catch (e) {
    return handleError(e)
  }
}

// ─── PATCH /api/transactions/[id] ─────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const data = UpdateTransactionSchema.parse(body)

    const existing = await prisma.transaction.findFirst({
      where: { id: params.id, tenantId: DEFAULT_TENANT_ID },
      include: { account: { select: { accountType: true } } },
    })
    if (!existing) return notFound()

    // Reverse old delta, apply new delta
    const oldDelta = balanceDelta(existing.account.accountType, existing.type, Number(existing.amount))
    const newType   = data.type   ?? existing.type
    const newAmount = data.amount ?? Number(existing.amount)
    const newDelta  = balanceDelta(existing.account.accountType, newType, newAmount)

    const [updated] = await prisma.$transaction([
      prisma.transaction.update({
        where: { id: params.id },
        data: {
          ...data,
          ...(data.date && { date: new Date(data.date) }),
          updatedBy: 'user',
        },
        include: {
          account: {
            select: { id: true, name: true, institution: true, color: true, colorEnd: true },
          },
        },
      }),
      prisma.account.update({
        where: { id: existing.accountId },
        data: { currentBalance: { increment: newDelta - oldDelta } },
      }),
    ])

    return ok(updated)
  } catch (e) {
    return handleError(e)
  }
}

// ─── DELETE /api/transactions/[id] ────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: params.id, tenantId: DEFAULT_TENANT_ID },
      include: { account: { select: { accountType: true } } },
    })
    if (!existing) return notFound()

    const delta = balanceDelta(existing.account.accountType, existing.type, Number(existing.amount))

    await prisma.$transaction([
      prisma.transaction.delete({ where: { id: params.id } }),
      prisma.account.update({
        where: { id: existing.accountId },
        data: { currentBalance: { increment: -delta } },
      }),
    ])

    return noContent()
  } catch (e) {
    return handleError(e)
  }
}
