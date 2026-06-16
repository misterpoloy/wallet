import { prisma } from '@wallet/db'
import { Header } from '@/components/layout/Header'
import { OverviewClient } from './OverviewClient'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

// ── FX rates to MXN (unified reference currency) ───────────────────────────
const FX_TO_MXN: Record<string, number> = {
  MXN: 1,
  GTQ: 2.49,   // 1 GTQ ≈ 2.49 MXN  (19.2 MXN/USD ÷ 7.7 GTQ/USD)
  USD: 19.2,
  EUR: 20.9,
  COP: 0.0047,
  TRY: 0.59,
  EGP: 0.39,
}

// ── Recurring frequency → monthly multiplier ───────────────────────────────
const FREQ_MULT: Record<string, number> = {
  daily:         30.4167,
  weekly:        4.3333,
  twice_monthly: 2,
  monthly:       1,
  quarterly:     1 / 3,
  annual:        1 / 12,
}

function toMXN(amount: number, currency: string) {
  return amount * (FX_TO_MXN[currency] ?? 1)
}

// ── Period helpers ──────────────────────────────────────────────────────────
function periodFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(period: string, n: number): string {
  const [y, m] = period.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return periodFromDate(d)
}

function periodRange(start: string, end: string): string[] {
  const periods: string[] = []
  let cur = start
  while (cur <= end) {
    periods.push(cur)
    cur = addMonths(cur, 1)
  }
  return periods
}

// ── Types passed to client ──────────────────────────────────────────────────
export type IncomeItem  = { sourceId: string; name: string; grossMXN: number; netMXN: number; currency: string; gross: number; net: number; status: string; actualMXN: number | null }
export type LoanItem    = { loanId: string; name: string; currency: string; amountNative: number; amountMXN: number; status: string }
export type RecurItem   = { id: string; name: string; category: string; currency: string; amountNative: number; amountMXN: number; frequency: string }

export type MonthRow = {
  period: string
  income:    { items: IncomeItem[];  totalGrossMXN: number; totalNetMXN: number; totalActualMXN: number }
  loans:     { items: LoanItem[];    totalMXN: number; totalPaidMXN: number }
  recurring: { items: RecurItem[];   totalMXN: number }
  cashFlowMXN: number          // net income - loans - recurring (MXN)
  projectedMXN: number         // gross income - loans - recurring
}

// ── Main page ───────────────────────────────────────────────────────────────
export default async function OverviewPage() {
  const [loans, incomeSources, recurring] = await Promise.all([
    prisma.loan.findMany({
      where:   { tenantId: TENANT },
      include: { payments: { orderBy: { period: 'asc' } } },
    }),
    prisma.incomeSource.findMany({
      where:   { tenantId: TENANT, isActive: true },
      include: { entries: { orderBy: { period: 'asc' } } },
    }),
    prisma.recurringExpense.findMany({
      where:   { tenantId: TENANT, isActive: true },
    }),
  ])

  // ── Determine period range (data-driven) ──────────────────────────────────
  const now = new Date()
  const curPeriod = periodFromDate(now)

  // Start: 3 months before earliest income or loan activity
  const allPeriods: string[] = [
    ...loans.flatMap(l => l.payments.map(p => p.period)),
    ...incomeSources.flatMap(s => s.entries.map(e => e.period)),
  ]
  const earliest = allPeriods.length ? allPeriods.sort()[0] : addMonths(curPeriod, -3)
  const startPeriod = addMonths(earliest, 0)

  // End: latest loan end date or +12 months from now
  const latestLoanEnd = loans.length
    ? periodFromDate(new Date(Math.max(...loans.map(l => new Date(l.endDate).getTime()))))
    : addMonths(curPeriod, 12)
  const endPeriod = latestLoanEnd > addMonths(curPeriod, 12) ? latestLoanEnd : addMonths(curPeriod, 12)

  const periods = periodRange(startPeriod, endPeriod)

  // ── Build O(1) lookup maps ────────────────────────────────────────────────

  // Loan payments: Map<period, LoanItem[]>
  const loansByPeriod = new Map<string, LoanItem[]>()
  for (const loan of loans) {
    for (const pmt of loan.payments) {
      const item: LoanItem = {
        loanId:       loan.id,
        name:         loan.name,
        currency:     loan.currency,
        amountNative: Number(pmt.dueAmount),
        amountMXN:    toMXN(Number(pmt.dueAmount), loan.currency),
        status:       pmt.status,
      }
      const arr = loansByPeriod.get(pmt.period) ?? []
      arr.push(item)
      loansByPeriod.set(pmt.period, arr)
    }
  }

  // Income entries: Map<period, IncomeItem[]>
  const incomeByPeriod = new Map<string, IncomeItem[]>()
  for (const src of incomeSources) {
    const grossMXN = toMXN(Number(src.grossAmount), src.currency)
    const netMXN   = src.netAmount ? toMXN(Number(src.netAmount), src.currency) : grossMXN

    for (const entry of src.entries) {
      const actualMXN = entry.actualAmount ? toMXN(Number(entry.actualAmount), src.currency) : null
      const item: IncomeItem = {
        sourceId:  src.id,
        name:      src.name,
        currency:  src.currency,
        gross:     Number(src.grossAmount),
        net:       src.netAmount ? Number(src.netAmount) : Number(src.grossAmount),
        grossMXN,
        netMXN,
        status:    entry.status,
        actualMXN,
      }
      const arr = incomeByPeriod.get(entry.period) ?? []
      arr.push(item)
      incomeByPeriod.set(entry.period, arr)
    }
  }

  // Recurring: pre-compute monthly MXN for each expense (same every month)
  const recurringItems: RecurItem[] = recurring.map(r => {
    const mult   = FREQ_MULT[r.frequency] ?? 1
    const native = Number(r.amount) * mult
    // Use refAmount (MXN equivalent) if available, otherwise convert
    const mxn    = r.refAmount ? Number(r.refAmount) * mult : toMXN(native, r.currency)
    return {
      id:            r.id,
      name:          r.name,
      category:      r.category,
      currency:      r.currency,
      amountNative:  native,
      amountMXN:     mxn,
      frequency:     r.frequency,
    }
  })
  const recurTotalMXN = recurringItems.reduce((s, r) => s + r.amountMXN, 0)

  // ── Build MonthRow for every period ──────────────────────────────────────
  const monthMap: Record<string, MonthRow> = {}

  for (const period of periods) {
    const loanItems  = loansByPeriod.get(period) ?? []
    const incItems   = incomeByPeriod.get(period) ?? []

    const loanTotalMXN = loanItems.reduce((s, l) => s + l.amountMXN, 0)
    const loanPaidMXN  = loanItems.filter(l => l.status === 'paid').reduce((s, l) => s + l.amountMXN, 0)

    const incGrossMXN  = incItems.reduce((s, i) => s + i.grossMXN, 0)
    const incNetMXN    = incItems.reduce((s, i) => s + i.netMXN, 0)
    const incActualMXN = incItems.reduce((s, i) => s + (i.actualMXN ?? 0), 0)

    const cashFlowMXN   = incActualMXN - loanTotalMXN - recurTotalMXN
    const projectedMXN  = incNetMXN    - loanTotalMXN - recurTotalMXN

    monthMap[period] = {
      period,
      income:    { items: incItems,      totalGrossMXN: incGrossMXN, totalNetMXN: incNetMXN, totalActualMXN: incActualMXN },
      loans:     { items: loanItems,     totalMXN: loanTotalMXN, totalPaidMXN: loanPaidMXN },
      recurring: { items: recurringItems, totalMXN: recurTotalMXN },
      cashFlowMXN,
      projectedMXN,
    }
  }

  // ── Aggregate KPIs (current month as baseline) ────────────────────────────
  const curRow = monthMap[curPeriod]

  // YTD across all periods in current year
  const yearPeriods = periods.filter(p => p.startsWith(`${now.getFullYear()}-`))
  const pastPeriods = yearPeriods.filter(p => p <= curPeriod)

  const ytdIncomeActual  = pastPeriods.reduce((s, p) => s + (monthMap[p]?.income.totalActualMXN  ?? 0), 0)
  const ytdLoansPaid     = pastPeriods.reduce((s, p) => s + (monthMap[p]?.loans.totalPaidMXN     ?? 0), 0)
  const ytdRecurring     = pastPeriods.reduce((s, p) => s + (monthMap[p]?.recurring.totalMXN      ?? 0), 0)
  const ytdNetFlow       = ytdIncomeActual - ytdLoansPaid - ytdRecurring

  const meta = {
    periods,
    curPeriod,
    fxRates: FX_TO_MXN,
    kpi: {
      monthlyIncomeNet:  curRow?.income.totalNetMXN   ?? 0,
      monthlyLoans:      curRow?.loans.totalMXN        ?? 0,
      monthlyRecurring:  curRow?.recurring.totalMXN    ?? 0,
      monthlyCashFlow:   curRow?.projectedMXN          ?? 0,
      ytdIncomeActual,
      ytdLoansPaid,
      ytdRecurring,
      ytdNetFlow,
    },
  }

  return (
    <div className="space-y-6">
      <Header
        title="Overview"
        subtitle={`Cash flow · ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
      />
      <OverviewClient monthMap={monthMap} meta={meta} />
    </div>
  )
}
