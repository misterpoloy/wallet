import type { ToolCtx, ToolHandler, getIncome } from '@mansamusa/core'
import { prisma, type IncomeEntry, type IncomeSource } from '@wallet/db'
import { clampedDay, dayOf, dec, lastDayOfMonth, money, todayIn, ZERO, type Dec } from '../util'

type Out = Awaited<ReturnType<ToolHandler<typeof getIncome>>>
type EntryOut = Out['sources'][number]['entries'][number]

/** Expected take-home per pay period: net when known, otherwise gross. */
function perPeriod(s: IncomeSource): Dec {
  return dec(s.netAmount ?? s.grossAmount)
}

/** Pay periods a source expects in a month. Semimonthly = quincenas on the 15th and the last day. */
function expectedSubPeriods(s: IncomeSource): number[] {
  return s.frequency === 'semimonthly' ? [1, 2] : [1]
}

/** Payday for a subPeriod (used for "upcoming"); monthly sources are assumed paid on the last day. */
function payday(s: IncomeSource, period: string, subPeriod: number): string {
  const [y, m] = period.split('-').map(Number) as [number, number]
  if (s.frequency === 'semimonthly' && subPeriod === 1) return clampedDay(y, m, 15)
  return clampedDay(y, m, lastDayOfMonth(y, m))
}

function activeIn(s: IncomeSource, period: string): boolean {
  const start = s.startDate.toISOString().slice(0, 7)
  const end = s.endDate ? s.endDate.toISOString().slice(0, 7) : null
  return period >= start && (!end || period <= end)
}

function entriesFor(s: IncomeSource & { entries: IncomeEntry[] }, period: string, tz: string): EntryOut[] {
  const recorded = s.entries.filter((e) => e.period === period)
  const out: EntryOut[] = recorded.map((e) => ({
    subPeriod: e.subPeriod,
    expected: money(e.expectedAmount),
    actual: e.actualAmount === null ? null : money(e.actualAmount),
    status: e.status,
    receivedAt: e.receivedAt ? dayOf(e.receivedAt, tz) : null,
  }))
  if (activeIn(s, period)) {
    for (const sub of expectedSubPeriods(s)) {
      if (!recorded.some((e) => e.subPeriod === sub)) {
        out.push({ subPeriod: sub, expected: money(perPeriod(s)), actual: null, status: 'projected', receivedAt: null })
      }
    }
  }
  return out.sort((a, b) => a.subPeriod - b.subPeriod)
}

export const getIncomeHandler: ToolHandler<typeof getIncome> = async (input, ctx) => {
  const period = input.period ?? todayIn(ctx.timezone).slice(0, 7)
  const sources = await prisma.incomeSource.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(input.sourceId ? { id: input.sourceId } : {}),
      ...(input.includeInactive ? {} : { isActive: true }),
    },
    include: { entries: { where: { period } } },
    orderBy: { startDate: 'asc' },
  })

  const totals = new Map<string, { expected: Dec; received: Dec }>()
  const rows = sources.map((s) => {
    const entries = entriesFor(s, period, ctx.timezone)
    const t = totals.get(s.currency) ?? { expected: ZERO, received: ZERO }
    for (const e of entries) {
      t.expected = t.expected.plus(e.expected)
      if (e.actual && (e.status === 'received' || e.status === 'partial')) t.received = t.received.plus(e.actual)
    }
    totals.set(s.currency, t)
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      employer: s.employer,
      currency: s.currency,
      frequency: s.frequency,
      expectedPerPeriod: money(perPeriod(s)),
      isActive: s.isActive,
      entries,
    }
  })

  return {
    period,
    sources: rows,
    totals: [...totals].map(([currency, t]) => ({ currency: currency as IncomeSource['currency'], expected: money(t.expected), received: money(t.received) })),
  }
}

/** Paydays between `from` and `to` (inclusive) that have not been received yet. */
export async function upcomingIncome(ctx: ToolCtx, from: string, to: string) {
  const periods = [...new Set([from.slice(0, 7), to.slice(0, 7)])]
  const sources = await prisma.incomeSource.findMany({
    where: { tenantId: ctx.tenantId, isActive: true },
    include: { entries: { where: { period: { in: periods } } } },
  })
  const out: { kind: 'income'; name: string; date: string; amount: string; currency: IncomeSource['currency'] }[] = []
  for (const s of sources) {
    for (const period of periods) {
      if (!activeIn(s, period)) continue
      for (const sub of expectedSubPeriods(s)) {
        const date = payday(s, period, sub)
        const entry = s.entries.find((e) => e.period === period && e.subPeriod === sub)
        if (date < from || date > to || entry?.status === 'received' || entry?.status === 'skipped') continue
        out.push({ kind: 'income', name: s.name, date, amount: money(entry?.expectedAmount ?? perPeriod(s)), currency: s.currency })
      }
    }
  }
  return out
}
