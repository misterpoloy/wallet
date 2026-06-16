import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, AccountType, Currency, CardNetwork } from '@wallet/db'
import { ok, noContent, notFound, handleError, DEFAULT_TENANT_ID } from '@/lib/api/response'

const UpdateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  institution: z.string().min(1).max(100).optional(),
  accountType: z.nativeEnum(AccountType).optional(),
  currency: z.nativeEnum(Currency).optional(),
  lastFour: z.string().length(4).nullable().optional(),
  network: z.nativeEnum(CardNetwork).nullable().optional(),
  creditLimit: z.number().positive().nullable().optional(),
  color: z.string().optional(),
  colorEnd: z.string().optional(),
  logoUrl: z.string().url().nullable().optional(),
  actionUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  // Balance adjustment: creates an income/expense tx to reach a target balance
  targetBalance: z.number().optional(),
  targetBalanceNote: z.string().optional(),
})

// ─── GET /api/accounts/[id] ───────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const account = await prisma.account.findFirst({
      where: { id: params.id, tenantId: DEFAULT_TENANT_ID },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 10,
        },
        recurringExpenses: {
          where: { isActive: true },
        },
        _count: { select: { transactions: true } },
      },
    })

    if (!account) return notFound()

    // Compute balance
    const [income, expense] = await Promise.all([
      prisma.transaction.aggregate({
        where: { accountId: account.id, type: 'income' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { accountId: account.id, type: 'expense' },
        _sum: { amount: true },
      }),
    ])

    const balance = Number(income._sum.amount ?? 0) - Number(expense._sum.amount ?? 0)

    return ok({ ...account, balance })
  } catch (e) {
    return handleError(e)
  }
}

// ─── PATCH /api/accounts/[id] ─────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const data = UpdateAccountSchema.parse(body)

    const existing = await prisma.account.findFirst({
      where: { id: params.id, tenantId: DEFAULT_TENANT_ID },
    })
    if (!existing) return notFound()

    const { targetBalance, targetBalanceNote, ...fields } = data

    const account = await prisma.account.update({
      where: { id: params.id },
      data: { ...fields, updatedBy: 'user' },
    })

    // Balance adjustment: insert an income/expense tx to reconcile
    if (targetBalance !== undefined) {
      const [incAgg, expAgg] = await Promise.all([
        prisma.transaction.aggregate({ where: { accountId: existing.id, type: 'income' }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { accountId: existing.id, type: 'expense' }, _sum: { amount: true } }),
      ])
      const currentBalance = Number(incAgg._sum.amount ?? 0) - Number(expAgg._sum.amount ?? 0)
      const diff = targetBalance - currentBalance

      if (Math.abs(diff) > 0.001) {
        await prisma.transaction.create({
          data: {
            tenantId: DEFAULT_TENANT_ID,
            accountId: existing.id,
            type: diff > 0 ? 'income' : 'expense',
            amount: Math.abs(diff),
            refAmount: Math.abs(diff),
            currency: existing.currency,
            date: new Date(),
            category: 'Balance Adjustment',
            categoryRaw: 'Balance Adjustment',
            paymentType: existing.accountType === 'credit_card' ? 'credit_card' : 'debit',
            note: targetBalanceNote ?? 'Manual balance adjustment',
            isTransfer: false,
            isRecurring: false,
            createdBy: 'agent:adjustment',
            updatedBy: 'agent:adjustment',
          },
        })
      }
    }

    return ok(account)
  } catch (e) {
    return handleError(e)
  }
}

// ─── DELETE /api/accounts/[id] ────────────────────────────────────────────────
// Pass JSON body { hard: true } to permanently delete account + all transactions.
// Without body (or hard: false) → soft delete (isActive = false).

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.account.findFirst({
      where: { id: params.id, tenantId: DEFAULT_TENANT_ID },
    })
    if (!existing) return notFound()

    // Try to parse body — optional, ignore errors
    let hard = false
    try {
      const body = await req.json()
      hard = body?.hard === true
    } catch {}

    if (hard) {
      // Hard delete: wipe all transactions then the account itself
      await prisma.$transaction([
        prisma.transaction.deleteMany({ where: { accountId: params.id } }),
        prisma.account.delete({ where: { id: params.id } }),
      ])
    } else {
      // Soft delete
      await prisma.account.update({
        where: { id: params.id },
        data: { isActive: false, updatedBy: 'user' },
      })
    }

    return noContent()
  } catch (e) {
    return handleError(e)
  }
}
