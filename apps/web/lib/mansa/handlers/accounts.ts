import type { ToolHandler, getCardStatus, getOverview, listAccounts, ToolCtx } from '@mansamusa/core'
import { prisma, type Account } from '@wallet/db'
import { creditCardStats } from '@/lib/account-balance'
import { addDays, clampedDay, dayOf, dayRange, dec, maxDec, money, moneyOrNull, nextMonthlyDate, todayIn, ZERO, type Dec } from '../util'
import { upcomingIncome } from './income'

const BANK_TYPES = ['checking', 'savings', 'debit'] as const

// Statement/due days arrive with the P4.02 migration (Account.statementDay, paymentDueDay, aprPercent).
// Until then they read as null and the tools say so instead of guessing.
type CardDays = { statementDay: number | null; paymentDueDay: number | null }
function cardDays(account: Account): CardDays {
  const a = account as Account & Partial<CardDays>
  return { statementDay: a.statementDay ?? null, paymentDueDay: a.paymentDueDay ?? null }
}

function summarize(a: Account) {
  const isCard = a.accountType === 'credit_card'
  const stats = isCard ? creditCardStats(a.currentBalance.toString(), a.creditLimit?.toString() ?? null) : null
  return {
    id: a.id,
    name: a.name,
    institution: a.institution,
    type: a.accountType,
    currency: a.currency,
    balance: money(a.currentBalance),
    creditLimit: moneyOrNull(a.creditLimit),
    available: stats && a.creditLimit ? money(stats.available) : null,
    lastFour: a.lastFour,
    ...cardDays(a),
  }
}

async function activeAccounts(ctx: ToolCtx, includeInactive = false) {
  return prisma.account.findMany({
    where: { tenantId: ctx.tenantId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

export const listAccountsHandler: ToolHandler<typeof listAccounts> = async (input, ctx) => {
  const accounts = await activeAccounts(ctx, input.includeInactive)
  return {
    accounts: accounts
      .filter((a) => {
        if (input.currency && a.currency !== input.currency) return false
        if (input.type === 'bank') return (BANK_TYPES as readonly string[]).includes(a.accountType)
        if (input.type === 'credit_card') return a.accountType === 'credit_card'
        if (input.type === 'cash') return a.accountType === 'cash'
        return true
      })
      .map(summarize),
  }
}

export const getOverviewHandler: ToolHandler<typeof getOverview> = async (_input, ctx) => {
  const today = todayIn(ctx.timezone)
  const horizon = addDays(today, 14)
  const [accounts, loans, recurring, income] = await Promise.all([
    activeAccounts(ctx),
    prisma.loan.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      include: { payments: { where: { status: { in: ['scheduled', 'partial'] } }, orderBy: { dueDate: 'asc' } } },
    }),
    prisma.recurringExpense.findMany({ where: { tenantId: ctx.tenantId, isActive: true } }),
    upcomingIncome(ctx, today, horizon),
  ])

  const cash = new Map<string, { total: Dec; accounts: number }>()
  const cards = new Map<string, { owed: Dec; limit: Dec; hasLimit: boolean; cards: number }>()
  for (const a of accounts) {
    if (a.accountType === 'credit_card') {
      const c = cards.get(a.currency) ?? { owed: ZERO, limit: ZERO, hasLimit: false, cards: 0 }
      c.owed = c.owed.plus(maxDec(a.currentBalance, ZERO))
      if (a.creditLimit) { c.limit = c.limit.plus(a.creditLimit); c.hasLimit = true }
      c.cards++
      cards.set(a.currency, c)
    } else {
      const c = cash.get(a.currency) ?? { total: ZERO, accounts: 0 }
      c.total = c.total.plus(a.currentBalance)
      c.accounts++
      cash.set(a.currency, c)
    }
  }
  const loanTotals = new Map<string, { balance: Dec; loans: number }>()
  for (const l of loans) {
    const t = loanTotals.get(l.currency) ?? { balance: ZERO, loans: 0 }
    t.balance = t.balance.plus(l.currentBalance)
    t.loans++
    loanTotals.set(l.currency, t)
  }

  const currencies = new Set([...cash.keys(), ...cards.keys(), ...loanTotals.keys()])
  const netByCurrency = [...currencies].map((currency) => ({
    currency: currency as Account['currency'],
    total: money((cash.get(currency)?.total ?? ZERO).minus(cards.get(currency)?.owed ?? ZERO).minus(loanTotals.get(currency)?.balance ?? ZERO)),
  }))

  const upcoming: Awaited<ReturnType<ToolHandler<typeof getOverview>>>['upcoming'] = []
  for (const l of loans) {
    for (const p of l.payments) {
      const day = dayOf(p.dueDate, ctx.timezone)
      if (day >= today && day <= horizon) {
        upcoming.push({ kind: 'loan_payment', name: l.name, date: day, amount: money(dec(p.dueAmount).minus(p.paidAmount ?? 0)), currency: l.currency })
      }
    }
  }
  for (const r of recurring) {
    const next = r.nextDueDate && dayOf(r.nextDueDate, ctx.timezone) >= today
      ? dayOf(r.nextDueDate, ctx.timezone)
      : r.frequency === 'monthly' && r.dayOfMonth ? nextMonthlyDate(today, r.dayOfMonth) : null
    if (next && next <= horizon) upcoming.push({ kind: 'recurring', name: r.name, date: next, amount: money(r.amount), currency: r.currency })
  }
  const notes: string[] = []
  for (const a of accounts.filter((x) => x.accountType === 'credit_card')) {
    const { paymentDueDay } = cardDays(a)
    if (paymentDueDay) {
      const due = nextMonthlyDate(today, paymentDueDay)
      if (due <= horizon) upcoming.push({ kind: 'card_payment', name: a.name, date: due, amount: null, currency: a.currency })
    }
  }
  if (accounts.some((a) => a.accountType === 'credit_card' && !cardDays(a).paymentDueDay)) {
    notes.push('Card payment due dates are not configured yet, so card payments are not listed in upcoming.')
  }
  upcoming.push(...income)
  upcoming.sort((a, b) => a.date.localeCompare(b.date))

  return {
    asOf: today,
    cash: [...cash].map(([currency, c]) => ({ currency: currency as Account['currency'], total: money(c.total), accounts: c.accounts })),
    creditCards: [...cards].map(([currency, c]) => ({
      currency: currency as Account['currency'],
      owed: money(c.owed),
      limit: c.hasLimit ? money(c.limit) : null,
      utilizationPct: c.hasLimit && c.limit.gt(0) ? Number(c.owed.div(c.limit).times(100).toFixed(1)) : null,
      cards: c.cards,
    })),
    loans: [...loanTotals].map(([currency, t]) => ({ currency: currency as Account['currency'], balance: money(t.balance), loans: t.loans })),
    netByCurrency,
    upcoming,
    notes,
  }
}

// ─── get_card_status ─────────────────────────────────────────────────────────

/** Most recent statement (corte) date on or before `today`, and the next one. */
export function statementWindow(today: string, statementDay: number) {
  const [y, m] = today.split('-').map(Number) as [number, number]
  const prev = (yy: number, mm: number) => (mm === 1 ? [yy - 1, 12] : [yy, mm - 1]) as [number, number]
  const nextM = (yy: number, mm: number) => (mm === 12 ? [yy + 1, 1] : [yy, mm + 1]) as [number, number]
  const thisCut = clampedDay(y, m, statementDay)
  const [ly, lm] = thisCut <= today ? [y, m] : prev(y, m)
  const [ny, nm] = nextM(ly, lm)
  return { last: clampedDay(ly, lm, statementDay), next: clampedDay(ny, nm, statementDay) }
}

export const getCardStatusHandler: ToolHandler<typeof getCardStatus> = async (input, ctx) => {
  const today = todayIn(ctx.timezone)
  const cards = await prisma.account.findMany({
    where: { tenantId: ctx.tenantId, accountType: 'credit_card', isActive: true, ...(input.accountId ? { id: input.accountId } : {}) },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  return {
    cards: await Promise.all(cards.map(async (a) => {
      const { statementDay, paymentDueDay } = cardDays(a)
      const stats = creditCardStats(a.currentBalance.toString(), a.creditLimit?.toString() ?? null)
      const notes: string[] = []
      let window: { last: string; next: string } | null = null
      let statementBalance: string | null = null
      let paidSince: string | null = null
      let spentSince: string | null = null
      let nextDueDate: string | null = null

      if (statementDay) {
        window = statementWindow(today, statementDay)
        const since = await prisma.transaction.groupBy({
          by: ['type'],
          where: { tenantId: ctx.tenantId, accountId: a.id, date: { gte: dayRange(addDays(window.last, 1), undefined, ctx.timezone).gte } },
          _sum: { amount: true },
        })
        const spent = dec(since.find((s) => s.type === 'expense')?._sum.amount)
        const paid = dec(since.find((s) => s.type === 'income')?._sum.amount)
        // owed at statement = owed now − charges since + payments since
        statementBalance = money(maxDec(dec(a.currentBalance).minus(spent).plus(paid), ZERO))
        paidSince = money(paid)
        spentSince = money(spent)
        if (paymentDueDay) nextDueDate = nextMonthlyDate(addDays(window.last, 1), paymentDueDay)
      } else {
        notes.push('Statement (corte) day not configured for this card, so the statement balance and due date are unknown.')
      }
      if (!a.creditLimit) notes.push('Credit limit not set.')

      return {
        id: a.id,
        name: a.name,
        institution: a.institution,
        currency: a.currency,
        owed: money(stats.used),
        limit: moneyOrNull(a.creditLimit),
        available: a.creditLimit ? money(stats.available) : null,
        utilizationPct: a.creditLimit ? stats.usagePct : null,
        statementDay,
        paymentDueDay,
        lastStatementDate: window?.last ?? null,
        nextStatementDate: window?.next ?? null,
        nextDueDate,
        statementBalance,
        paidSinceStatement: paidSince,
        spentSinceStatement: spentSince,
        notes,
      }
    })),
  }
}
