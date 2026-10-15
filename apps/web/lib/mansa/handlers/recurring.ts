import type { ToolHandler, listRecurring } from '@mansamusa/core'
import { prisma, type Currency } from '@wallet/db'
import { dayOf, dec, FREQ_PER_MONTH, money, nextMonthlyDate, todayIn, ZERO, type Dec } from '../util'

export const listRecurringHandler: ToolHandler<typeof listRecurring> = async (input, ctx) => {
  const today = todayIn(ctx.timezone)
  const items = await prisma.recurringExpense.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(input.activeOnly ? { isActive: true } : {}),
      ...(input.accountId ? { accountId: input.accountId } : {}),
    },
    include: {
      account: { select: { name: true } },
      transactions: { orderBy: { date: 'desc' }, take: 3, select: { date: true, amount: true } },
    },
    orderBy: { name: 'asc' },
  })

  const monthly = new Map<string, Dec>()
  const recurring = items.map((r) => {
    if (r.isActive) {
      monthly.set(r.currency, (monthly.get(r.currency) ?? ZERO).plus(dec(r.amount).times(FREQ_PER_MONTH[r.frequency] ?? 1)))
    }
    const latest = r.transactions[0]
    const drift = latest && dec(r.amount).gt(0)
      ? Number(dec(latest.amount).minus(r.amount).div(r.amount).times(100).toFixed(1))
      : null
    const next = r.nextDueDate && dayOf(r.nextDueDate, ctx.timezone) >= today
      ? dayOf(r.nextDueDate, ctx.timezone)
      : r.frequency === 'monthly' && r.dayOfMonth ? nextMonthlyDate(today, r.dayOfMonth) : null
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      accountId: r.accountId,
      account: r.account.name,
      currency: r.currency,
      amount: money(r.amount),
      frequency: r.frequency,
      dayOfMonth: r.dayOfMonth,
      nextDueDate: next,
      isActive: r.isActive,
      lastCharges: r.transactions.map((t) => ({ date: dayOf(t.date, ctx.timezone), amount: money(t.amount) })),
      priceDriftPct: drift,
    }
  })

  return {
    recurring,
    monthlyEquivalentByCurrency: [...monthly].map(([currency, total]) => ({ currency: currency as Currency, total: money(total) })),
  }
}
