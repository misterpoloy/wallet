import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, Currency, RecurringFrequency } from '@wallet/db'
import { ok, notFound, handleError } from '@/lib/api/response'
import { requireCtx, requireWriter } from '@/lib/auth/ctx'
import { assertOwned } from '@/lib/auth/ownership'

const UpdateSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  category:    z.string().min(1).optional(),
  categoryRaw: z.string().optional(),
  currency:    z.nativeEnum(Currency).optional(),
  amount:      z.number().positive().optional(),
  refAmount:   z.number().optional(),
  frequency:   z.nativeEnum(RecurringFrequency).optional(),
  dayOfMonth:  z.number().int().min(1).max(31).nullable().optional(),
  daysOfMonth: z.array(z.number().int().min(1).max(31)).optional(),
  isActive:    z.boolean().optional(),
  nextDueDate: z.string().datetime().nullable().optional(),
  notes:       z.string().nullable().optional(),
  accountId:   z.string().min(1).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCtx()
    const item = await prisma.recurringExpense.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
      include: {
        account: { select: { id: true, name: true, institution: true, color: true, colorEnd: true, currency: true, lastFour: true } },
        transactions: {
          orderBy: { date: 'desc' },
          take: 10,
          include: { account: { select: { id: true, name: true, institution: true, color: true, colorEnd: true, currency: true, accountType: true, lastFour: true } } },
        },
        _count: { select: { transactions: true } },
      },
    })
    if (!item) return notFound('Recurring expense not found')
    return ok(item)
  } catch (e) {
    return handleError(e)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCtx()
    requireWriter(ctx)
    const body = await req.json()
    const data = UpdateSchema.parse(body)
    await assertOwned(ctx, { accounts: [data.accountId] })

    const existing = await prisma.recurringExpense.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    })
    if (!existing) return notFound('Recurring expense not found')

    const item = await prisma.recurringExpense.update({
      where: { id: params.id },
      data: {
        ...data,
        ...(data.nextDueDate !== undefined && {
          nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
        }),
      },
      include: {
        account: { select: { id: true, name: true, institution: true, color: true, colorEnd: true } },
      },
    })
    return ok(item)
  } catch (e) {
    return handleError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCtx()
    requireWriter(ctx)
    const existing = await prisma.recurringExpense.findFirst({
      where: { id: params.id, tenantId: ctx.tenantId },
    })
    if (!existing) return notFound('Recurring expense not found')

    await prisma.recurringExpense.delete({ where: { id: params.id } })
    return ok({ deleted: true })
  } catch (e) {
    return handleError(e)
  }
}
