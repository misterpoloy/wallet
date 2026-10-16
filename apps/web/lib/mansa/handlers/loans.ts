import type { ToolHandler, getLoans } from '@mansamusa/core'
import { prisma, type LoanPayment } from '@wallet/db'
import { dayOf, money, moneyOrNull, todayIn } from '../util'

function paymentRow(p: LoanPayment, tz: string) {
  return {
    period: p.period,
    dueDate: dayOf(p.dueDate, tz),
    dueAmount: money(p.dueAmount),
    principal: moneyOrNull(p.principalAmount),
    interest: moneyOrNull(p.interestAmount),
    paidAmount: moneyOrNull(p.paidAmount),
    status: p.status,
  }
}

export const getLoansHandler: ToolHandler<typeof getLoans> = async (input, ctx) => {
  const today = todayIn(ctx.timezone)
  const loans = await prisma.loan.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(input.loanId ? { id: input.loanId } : {}),
      ...(input.includeInactive ? {} : { isActive: true }),
    },
    include: { payments: { orderBy: { period: 'asc' } } },
    orderBy: { startDate: 'asc' },
  })

  return {
    loans: loans.map((l) => {
      const unpaid = l.payments.filter((p) => p.status !== 'paid' && p.status !== 'skipped')
      const next = unpaid.find((p) => dayOf(p.dueDate, ctx.timezone) >= today) ?? null
      const missed = unpaid.filter((p) => p.status === 'missed' || dayOf(p.dueDate, ctx.timezone) < today)
      const paid = l.payments.filter((p) => p.status === 'paid').length
      return {
        id: l.id,
        name: l.name,
        lender: l.lender,
        type: l.type,
        currency: l.currency,
        originalAmount: money(l.originalAmount),
        currentBalance: money(l.currentBalance),
        interestRatePct: Number(l.interestRate),
        monthlyPayment: money(l.monthlyPayment),
        termMonths: l.termMonths,
        startDate: dayOf(l.startDate, ctx.timezone),
        endDate: dayOf(l.endDate, ctx.timezone),
        paidPeriods: paid,
        remainingPeriods: Math.max(0, l.termMonths - paid),
        nextPayment: next ? paymentRow(next, ctx.timezone) : null,
        missedPeriods: missed.map((p) => p.period),
        ...(input.includeSchedule && { schedule: l.payments.map((p) => paymentRow(p, ctx.timezone)) }),
      }
    }),
  }
}
