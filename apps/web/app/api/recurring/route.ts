import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, Currency, RecurringFrequency } from '@wallet/db'
import { ok, created, handleError, DEFAULT_TENANT_ID } from '@/lib/api/response'

const CreateRecurringSchema = z.object({
  accountId: z.string().min(1),
  name: z.string().min(1).max(200),
  category: z.string().min(1),
  categoryRaw: z.string().optional(),
  currency: z.nativeEnum(Currency),
  amount: z.number().positive(),
  refAmount: z.number().optional(),
  frequency: z.nativeEnum(RecurringFrequency).default('monthly'),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  daysOfMonth: z.array(z.number().int().min(1).max(31)).default([]),
  isActive: z.boolean().default(true),
  nextDueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
})

// ─── GET /api/recurring ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('active') !== 'false'
    const accountId = searchParams.get('accountId')

    const recurring = await prisma.recurringExpense.findMany({
      where: {
        tenantId: DEFAULT_TENANT_ID,
        ...(activeOnly && { isActive: true }),
        ...(accountId && { accountId }),
      },
      include: {
        account: {
          select: { id: true, name: true, institution: true, color: true, colorEnd: true, currency: true },
        },
        _count: { select: { transactions: true } },
      },
      orderBy: [{ isActive: 'desc' }, { nextDueDate: 'asc' }],
    })

    // Group by upcoming / active / inactive
    const now = new Date()
    const upcoming = recurring.filter(
      (r) => r.isActive && r.nextDueDate && r.nextDueDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    )

    return ok({ recurring, upcoming, totalActive: recurring.filter((r) => r.isActive).length })
  } catch (e) {
    return handleError(e)
  }
}

// ─── POST /api/recurring ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = CreateRecurringSchema.parse(body)

    const recurring = await prisma.recurringExpense.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        accountId: data.accountId,
        name: data.name,
        category: data.category,
        categoryRaw: data.categoryRaw ?? data.category,
        currency: data.currency,
        amount: data.amount,
        refAmount: data.refAmount,
        frequency: data.frequency,
        dayOfMonth: data.dayOfMonth,
        daysOfMonth: data.daysOfMonth,
        isActive: data.isActive,
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
        notes: data.notes,
      },
      include: {
        account: {
          select: { id: true, name: true, institution: true, color: true, colorEnd: true },
        },
      },
    })

    return created(recurring)
  } catch (e) {
    return handleError(e)
  }
}
