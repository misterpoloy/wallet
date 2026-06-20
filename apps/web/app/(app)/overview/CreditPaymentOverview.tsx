'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Landmark, TrendingDown, CalendarDays, DollarSign,
  CheckCircle2, Clock, AlertTriangle, ChevronRight, BarChart3,
  Wand2, Plus, Trash2, Sparkles, X, Info, ChevronDown, ChevronUp,
  ArrowRight, Zap, TrendingUp, Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type LoanPayment = {
  period: string
  status: string
  dueAmount: number
  principalAmount: number | null
}

type Loan = {
  id: string
  name: string
  lender: string
  type: string
  currency: string
  originalAmount: number
  currentBalance: number
  interestRate: number
  monthlyPayment: number
  termMonths: number
  startDate: string
  endDate: string
  isActive: boolean
  payments: LoanPayment[]
}

/** An extra income source the user adds for "what-if" simulation */
export type ExtraSource = {
  id: string
  name: string
  amount: number        // native monthly amount
  currency: 'MXN' | 'USD' | 'GTQ'
  allocationPct: number // 0–100 — how much goes to debt payoff
}

/** Result of a month-by-month payoff simulation */
type SimResult = {
  totalMonths: number
  perLoan: Record<string, number>  // loan.id → months until paid off
}

/** Per-month projection data fired up to OverviewClient */
export type MonthProjection = {
  monthOffset:        number    // months from current month (0 = current, 1 = next, …)
  cumulativeFreedMXN: number    // running total of freed minimum payments from closed loans
  newlyClosedNames:   string[]  // loan names that closed exactly this month
  totalSurplusMXN:    number    // cumulativeFreed + extra from sources (full new capacity)
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & FX
// ─────────────────────────────────────────────────────────────────────────────

const FX_TO_MXN: Record<string, number> = { MXN: 1, GTQ: 2.49, USD: 19.2 }

const FX_LABELS: { currency: string; label: string; rate: string }[] = [
  { currency: 'MXN', label: 'Mexican Peso',      rate: '1.00 MXN' },
  { currency: 'USD', label: 'US Dollar',          rate: '19.20 MXN' },
  { currency: 'GTQ', label: 'Guatemalan Quetzal', rate: '2.49 MXN'  },
]

const CURRENCY_OPTIONS = ['MXN', 'USD', 'GTQ'] as const

function toMXN(amount: number, currency: string) {
  return amount * (FX_TO_MXN[currency] ?? 1)
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'MXN') {
  const sym = currency === 'GTQ' ? 'Q' : '$'
  return `${sym}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtMXN(n: number) { return fmt(n, 'MXN') }

function monthsLabel(m: number) {
  if (m <= 0) return 'Paid off'
  if (m < 12) return `${m}mo`
  const yrs = Math.floor(m / 12)
  const mos = m % 12
  return mos > 0 ? `${yrs}y ${mos}mo` : `${yrs}yr`
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Month-by-month debt payoff simulation using the avalanche method
 * (extra money goes to highest-interest loan first).
 *
 * Simulates minimum scheduled payments + optional extra monthly cash (MXN).
 * Returns total months until all balances reach $0.
 */
function simulatePayoff(loans: Loan[], extraMonthlyMXN: number): SimResult {
  const MAX_MONTHS = 600 // 50-year cap

  // Mutable working state — all values in MXN for uniform math
  const balances: Record<string, number> = {}
  const monthlyRates: Record<string, number> = {}
  const minPayments: Record<string, number> = {}

  for (const loan of loans) {
    balances[loan.id]     = toMXN(Math.max(0, Number(loan.currentBalance)), loan.currency)
    monthlyRates[loan.id] = Number(loan.interestRate) / 100 / 12
    minPayments[loan.id]  = toMXN(Number(loan.monthlyPayment), loan.currency)
  }

  // Avalanche order: highest interest first
  const avalancheOrder = [...loans].sort(
    (a, b) => Number(b.interestRate) - Number(a.interestRate)
  )

  const perLoan: Record<string, number> = {}
  let month = 0

  while (month < MAX_MONTHS) {
    month++

    // 1. Apply minimum payments to all loans (interest-aware amortisation)
    for (const loan of loans) {
      if (balances[loan.id] <= 0) continue

      const interest  = balances[loan.id] * monthlyRates[loan.id]
      const principal = Math.max(0, minPayments[loan.id] - interest)
      balances[loan.id] = Math.max(0, balances[loan.id] - principal)

      if (balances[loan.id] === 0 && perLoan[loan.id] === undefined) {
        perLoan[loan.id] = month
      }
    }

    // 2. Apply extra money (avalanche — largest rate first)
    let extra = extraMonthlyMXN
    for (const loan of avalancheOrder) {
      if (extra <= 0) break
      if (balances[loan.id] <= 0) continue
      const applied = Math.min(extra, balances[loan.id])
      balances[loan.id] -= applied
      extra -= applied
      if (balances[loan.id] === 0 && perLoan[loan.id] === undefined) {
        perLoan[loan.id] = month
      }
    }

    // 3. Check if all paid
    if (Object.values(balances).every(b => b <= 0)) break
  }

  // Any loan not yet finished gets current month as cap
  for (const loan of loans) {
    if (perLoan[loan.id] === undefined) perLoan[loan.id] = month
  }

  return { totalMonths: month, perLoan }
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAILED SIMULATION — month-by-month with cascade tracking
// ─────────────────────────────────────────────────────────────────────────────

type MonthEntry = {
  monthIdx:   number          // 1-based from now
  label:      string          // "Jan 2025"
  perLoan: Record<string, {
    minPaid:   number         // minimum payment applied (MXN)
    extraPaid: number         // extra applied this month (MXN)
    balance:   number         // balance after this month (MXN)
    closed:    boolean        // closed this exact month
  }>
  totalExtra:  number         // total extra pool this month (cascades included)
  cascadeFrom: string[]       // loan ids that just freed their payment
}

type Phase = {
  phaseIdx:     number
  targetLoanId: string
  startMonth:   number        // inclusive, 1-based
  endMonth:     number        // inclusive
  monthlyExtra: number        // extra budget during this phase (MXN)
  cascadeGain:  number        // freed cash cascading from prior closed loans
}

type DetailedResult = {
  months:    MonthEntry[]
  phases:    Phase[]
  totalMonths: number
  perLoan:   Record<string, number>
}

function simulateDetailed(
  loans: Loan[],
  extraFromSources: number,   // extra MXN/mo from added income sources
  strategy: 'avalanche' | 'snowball',
): DetailedResult {
  const MAX_MONTHS = 600
  const now        = new Date()

  const balances:     Record<string, number> = {}
  const monthlyRates: Record<string, number> = {}
  const minPayments:  Record<string, number> = {}

  for (const l of loans) {
    balances[l.id]     = toMXN(Math.max(0, Number(l.currentBalance)), l.currency)
    monthlyRates[l.id] = Number(l.interestRate) / 100 / 12
    minPayments[l.id]  = toMXN(Number(l.monthlyPayment), l.currency)
  }

  const ordered = [...loans].sort((a, b) =>
    strategy === 'avalanche'
      ? Number(b.interestRate) - Number(a.interestRate)
      : toMXN(Number(a.currentBalance), a.currency) - toMXN(Number(b.currentBalance), b.currency)
  )

  const perLoan: Record<string, number> = {}
  const months:  MonthEntry[]           = []
  let   month    = 0
  // cascadePool grows as loans close and free their minimum payment
  let   cascadePool = 0

  while (month < MAX_MONTHS) {
    month++
    const date = new Date(now.getFullYear(), now.getMonth() + month - 1, 1)
    const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

    const entry: MonthEntry = {
      monthIdx:  month,
      label,
      perLoan:   {},
      totalExtra: extraFromSources + cascadePool,
      cascadeFrom: [],
    }

    // 1. Minimum payments on all active loans
    const justClosed: string[] = []
    for (const loan of loans) {
      if (balances[loan.id] <= 0) { entry.perLoan[loan.id] = { minPaid: 0, extraPaid: 0, balance: 0, closed: false }; continue }
      const interest  = balances[loan.id] * monthlyRates[loan.id]
      const principal = Math.max(0, minPayments[loan.id] - interest)
      balances[loan.id] = Math.max(0, balances[loan.id] - principal)
      entry.perLoan[loan.id] = { minPaid: minPayments[loan.id], extraPaid: 0, balance: balances[loan.id], closed: false }
      if (balances[loan.id] === 0 && perLoan[loan.id] === undefined) {
        perLoan[loan.id] = month
        entry.perLoan[loan.id].closed = true
        justClosed.push(loan.id)
      }
    }

    // 2. Extra payments (avalanche / snowball order)
    let extra = extraFromSources + cascadePool
    for (const loan of ordered) {
      if (extra <= 0) break
      if (balances[loan.id] <= 0) continue
      const applied = Math.min(extra, balances[loan.id])
      balances[loan.id] -= applied
      entry.perLoan[loan.id].extraPaid  += applied
      entry.perLoan[loan.id].balance     = balances[loan.id]
      extra -= applied
      if (balances[loan.id] === 0 && perLoan[loan.id] === undefined) {
        perLoan[loan.id] = month
        entry.perLoan[loan.id].closed = true
        justClosed.push(loan.id)
      }
    }

    // 3. Cascade: any newly closed loan frees its minimum payment next month
    for (const id of justClosed) {
      cascadePool += minPayments[id]
      entry.cascadeFrom.push(id)
    }

    months.push(entry)
    if (Object.values(balances).every(b => b <= 0)) break
  }

  for (const l of loans) {
    if (perLoan[l.id] === undefined) perLoan[l.id] = month
  }

  // Build phases: one phase per loan in attack order
  const phases: Phase[] = []
  let phaseStart = 1
  let accCascade = 0
  for (let pi = 0; pi < ordered.length; pi++) {
    const tgt = ordered[pi]
    if (perLoan[tgt.id] === undefined) continue
    const endM = perLoan[tgt.id]
    phases.push({
      phaseIdx:     pi + 1,
      targetLoanId: tgt.id,
      startMonth:   phaseStart,
      endMonth:     endM,
      monthlyExtra: extraFromSources + accCascade,
      cascadeGain:  accCascade,
    })
    accCascade += minPayments[tgt.id]
    phaseStart  = endM + 1
  }

  return { months, phases, totalMonths: month, perLoan }
}

// ─────────────────────────────────────────────────────────────────────────────
// CASCADE VIEW — payoff phases + monthly breakdown
// ─────────────────────────────────────────────────────────────────────────────

function monthsLabel2(n: number) {
  if (n <= 0) return '0mo'
  const y = Math.floor(n / 12), m = n % 12
  return y > 0 && m > 0 ? `${y}y ${m}mo` : y > 0 ? `${y}yr` : `${m}mo`
}

function CascadeView({
  loans,
  extraFromSources,
}: {
  loans: Loan[]
  extraFromSources: number
}) {
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche')
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0)
  const [showFullGrid, setShowFullGrid] = useState(false)

  const result = useMemo(
    () => simulateDetailed(loans, extraFromSources, strategy),
    [loans, extraFromSources, strategy]
  )

  const loanById = useMemo(() => Object.fromEntries(loans.map(l => [l.id, l])), [loans])

  const now = new Date()
  function monthLabel(idx: number) {
    const d = new Date(now.getFullYear(), now.getMonth() + idx - 1, 1)
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  // Only show loans that still have balance
  const activeLoans = loans.filter(l =>
    l.payments.some(p => p.status === 'scheduled' || p.status === 'partial')
  )

  // Grid: cap display unless expanded
  const GRID_PREVIEW = 12
  const displayedMonths = showFullGrid
    ? result.months
    : result.months.slice(0, GRID_PREVIEW)

  if (extraFromSources <= 0) return null

  return (
    <div className="space-y-4 pt-4 border-t border-white/[0.05]">

      {/* Header + strategy toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[13px] font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Payoff Cascade
          </p>
          <p className="text-[11px] text-white/30 mt-0.5">
            How your payments accelerate as each debt closes
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/25 mr-1 flex items-center gap-1"><Filter className="w-3 h-3" /> Strategy</span>
          {(['avalanche', 'snowball'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStrategy(s)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all',
                strategy === s
                  ? 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30'
                  : 'bg-white/[0.03] text-white/30 border-white/[0.06] hover:text-white/60'
              )}
            >
              {s === 'avalanche' ? '⚡ Avalanche' : '❄️ Snowball'}
            </button>
          ))}
        </div>
      </div>

      {/* Strategy explanation + sequential note */}
      <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] px-3.5 py-2.5 text-[11px] text-white/35 leading-relaxed">
        {strategy === 'avalanche'
          ? '⚡ Avalanche: Attack the highest-interest loan first. Minimizes total interest paid — optimal financially.'
          : '❄️ Snowball: Attack the smallest balance first. More motivating — earlier wins, but pays more interest total.'}
      </div>
      <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] px-3.5 py-2.5 flex items-start gap-2">
        <span className="text-yellow-400/70 text-[12px] flex-shrink-0 mt-px">→</span>
        <p className="text-[11px] text-white/35 leading-relaxed">
          <span className="text-white/55 font-semibold">Sequential attack — one loan at a time.</span>{' '}
          Your entire extra income ({fmtMXN(extraFromSources)}/mo) goes to a single target loan each phase.
          Other loans only receive their scheduled minimum payments from your base income.
          When a loan closes, its freed minimum joins the attack pool for the next phase (cascade).
        </p>
      </div>

      {/* Phase cards */}
      <div className="space-y-2">
        {result.phases.map((phase, pi) => {
          const loan   = loanById[phase.targetLoanId]
          if (!loan) return null
          const dur    = phase.endMonth - phase.startMonth + 1
          const isOpen = expandedPhase === pi
          const startLbl = monthLabel(phase.startMonth)
          const endLbl   = monthLabel(phase.endMonth)
          const balMXN   = toMXN(Number(loan.currentBalance), loan.currency)

          return (
            <div
              key={phase.phaseIdx}
              className={cn(
                'rounded-xl border overflow-hidden transition-all',
                pi === 0
                  ? 'border-yellow-400/20 bg-yellow-400/[0.03]'
                  : 'border-white/[0.06] bg-white/[0.01]'
              )}
            >
              {/* Phase header — always visible */}
              <button
                onClick={() => setExpandedPhase(isOpen ? null : pi)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              >
                {/* Phase badge */}
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0',
                  pi === 0 ? 'bg-yellow-400/20 text-yellow-300' : 'bg-white/[0.06] text-white/40'
                )}>
                  {phase.phaseIdx}
                </div>

                {/* Loan name + dates */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-semibold text-white/80 truncate">{loan.name}</p>
                    {phase.cascadeGain > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold whitespace-nowrap">
                        +{fmtMXN(phase.cascadeGain)} cascade
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {startLbl} → {endLbl} · {dur} month{dur !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Monthly extra during phase */}
                <div className="text-right flex-shrink-0">
                  <p className="text-[12px] font-bold text-yellow-300 tabular-nums">
                    {fmtMXN(extraFromSources)}
                    {phase.cascadeGain > 0 && (
                      <span className="text-emerald-400">+{fmtMXN(phase.cascadeGain)}</span>
                    )}
                    <span className="text-[10px] text-white/30 font-normal">/mo</span>
                  </p>
                  <p className="text-[10px] text-white/25 tabular-nums">{fmtMXN(balMXN)} remaining</p>
                </div>

                <div className="text-white/15 flex-shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-4 pb-4 border-t border-white/[0.05] pt-3 space-y-3">

                  {/* Payment breakdown during this phase */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Min payment',  value: fmtMXN(toMXN(Number(loan.monthlyPayment), loan.currency)), color: 'text-white/50' },
                      { label: 'Total to loan', value: fmtMXN(toMXN(Number(loan.monthlyPayment), loan.currency) + phase.monthlyExtra), color: 'text-white/80' },
                      { label: 'Duration',      value: monthsLabel2(dur), color: 'text-emerald-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2.5">
                        <p className="text-[10px] text-white/25 mb-1">{label}</p>
                        <p className={cn('text-[13px] font-bold tabular-nums', color)}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Extra attack breakdown: sources + cascade */}
                  <div className="rounded-lg bg-yellow-400/[0.04] border border-yellow-400/[0.12] px-3 py-2.5">
                    <p className="text-[10px] text-yellow-400/50 uppercase tracking-wider mb-2">Extra attack pool this phase</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/40">From income sources</span>
                        <span className="text-[12px] font-bold text-yellow-300 tabular-nums">{fmtMXN(extraFromSources)}/mo</span>
                      </div>
                      {phase.cascadeGain > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white/40 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            Freed minimums (cascade)
                          </span>
                          <span className="text-[12px] font-bold text-emerald-400 tabular-nums">+{fmtMXN(phase.cascadeGain)}/mo</span>
                        </div>
                      )}
                      <div className="border-t border-white/[0.06] pt-1.5 flex items-center justify-between">
                        <span className="text-[11px] text-white/55 font-semibold">Total extra to this loan</span>
                        <span className="text-[13px] font-bold text-yellow-300 tabular-nums">{fmtMXN(phase.monthlyExtra)}/mo</span>
                      </div>
                    </div>
                  </div>

                  {/* Monthly progress bars for this loan during this phase */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider">Balance progression</p>
                    {result.months
                      .filter(m => m.monthIdx >= phase.startMonth && m.monthIdx <= phase.endMonth)
                      .map(m => {
                        const data = m.perLoan[loan.id]
                        if (!data) return null
                        const startBal = balMXN // rough
                        const pct = Math.max(0, Math.min(100, (1 - data.balance / Math.max(balMXN, 1)) * 100))
                        return (
                          <div key={m.monthIdx} className="flex items-center gap-2">
                            <span className="text-[10px] text-white/20 w-14 flex-shrink-0 tabular-nums">{m.label}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden flex">
                              <div className="bg-rose-500/40 h-full rounded-full transition-all" style={{ width: `${Math.max(0, 100 - pct)}%` }} />
                            </div>
                            <span className="text-[10px] text-white/30 tabular-nums w-20 text-right">
                              {data.closed
                                ? <span className="text-emerald-400 font-semibold">✓ Closed</span>
                                : fmtMXN(data.balance)}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Monthly grid — compact heat map */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
          <p className="text-[11px] text-white/40 uppercase tracking-[0.08em] font-semibold">
            Monthly Breakdown
          </p>
          <div className="flex items-center gap-3 text-[10px] text-white/25">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-yellow-400/60" /> Extra</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-white/[0.15]" /> Min</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-emerald-500/60" /> Cascade</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="px-3 py-2 text-left text-white/25 font-normal w-20">Month</th>
                <th className="px-3 py-2 text-center text-white/25 font-normal">Extra pool</th>
                {activeLoans.map(l => (
                  <th key={l.id} className="px-3 py-2 text-center text-white/25 font-normal max-w-[120px]">
                    <span className="truncate block">{l.name.split(' ')[0]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedMonths.map((m, mi) => {
                const hasCascade = m.cascadeFrom.length > 0
                return (
                  <tr
                    key={m.monthIdx}
                    className={cn(
                      'border-b border-white/[0.03] transition-colors',
                      hasCascade ? 'bg-emerald-500/[0.04]' : mi % 2 === 0 ? 'bg-white/[0.01]' : ''
                    )}
                  >
                    {/* Month label */}
                    <td className="px-3 py-2 text-white/40 whitespace-nowrap">
                      {m.label}
                      {hasCascade && <span className="ml-1 text-emerald-400">⚡</span>}
                    </td>

                    {/* Total extra pool */}
                    <td className="px-3 py-2 text-center">
                      <span className={cn('font-semibold tabular-nums', m.totalExtra > 0 ? 'text-yellow-300' : 'text-white/15')}>
                        {m.totalExtra > 0 ? fmtMXN(m.totalExtra) : '—'}
                      </span>
                    </td>

                    {/* Per-loan payment cells */}
                    {activeLoans.map(l => {
                      const data = m.perLoan[l.id]
                      if (!data) return <td key={l.id} className="px-3 py-2" />
                      if (data.balance === 0 && !data.closed && data.minPaid === 0) {
                        return (
                          <td key={l.id} className="px-3 py-2 text-center">
                            <span className="text-emerald-400/50 text-[10px]">✓</span>
                          </td>
                        )
                      }
                      return (
                        <td key={l.id} className="px-3 py-2">
                          <div className="flex flex-col items-center gap-0.5">
                            {data.extraPaid > 0 && (
                              <span className="text-yellow-300 font-bold tabular-nums">{fmtMXN(data.extraPaid)}</span>
                            )}
                            {data.minPaid > 0 && (
                              <span className="text-white/30 tabular-nums">{fmtMXN(data.minPaid)}</span>
                            )}
                            {data.closed && (
                              <span className="text-[9px] text-emerald-400 font-bold">CLOSED ✓</span>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Show more / less */}
        {result.months.length > GRID_PREVIEW && (
          <button
            onClick={() => setShowFullGrid(v => !v)}
            className="w-full py-2.5 text-[11px] text-white/30 hover:text-white/60 transition-colors border-t border-white/[0.05] flex items-center justify-center gap-1.5"
          >
            {showFullGrid
              ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
              : <><ChevronDown className="w-3.5 h-3.5" /> Show all {result.months.length} months</>
            }
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SummaryChip({
  label, value, sub, color, icon: Icon,
}: {
  label: string; value: string; sub: string; color: string; icon: React.ElementType
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-white/30 uppercase tracking-[0.08em] font-semibold">{label}</span>
        <Icon className={cn('w-3.5 h-3.5', color)} />
      </div>
      <p className={cn('text-xl font-bold', color)}>{value}</p>
      <p className="text-[11px] text-white/25 mt-0.5">{sub}</p>
    </div>
  )
}

function ProgressBar({ pct, color = 'bg-rose-500', thin }: { pct: number; color?: string; thin?: boolean }) {
  return (
    <div className={cn('rounded-full bg-white/[0.06] overflow-hidden', thin ? 'h-1' : 'h-1.5')}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAN LIST ROW
// ─────────────────────────────────────────────────────────────────────────────

function LoanRow({ loan, view, incomeMXN }: { loan: Loan; view: 'monthly' | 'annual'; incomeMXN: number }) {
  const paidPayments  = loan.payments.filter(p => p.status === 'paid')
  const scheduledLeft = loan.payments.filter(p => p.status === 'scheduled' || p.status === 'partial')
  const totalPaid     = paidPayments.length
  const monthsLeft    = scheduledLeft.length
  const pctPaid       = loan.termMonths > 0 ? (totalPaid / loan.termMonths) * 100 : 0
  const monthlyMXN    = toMXN(Number(loan.monthlyPayment), loan.currency)
  const cost          = view === 'monthly' ? monthlyMXN : monthlyMXN * 12
  const pctOfInc      = incomeMXN > 0 ? (monthlyMXN / incomeMXN) * 100 : 0
  const endDate       = loan.endDate ? new Date(loan.endDate) : null

  const urgency      = monthsLeft <= 3 ? 'high' : monthsLeft <= 12 ? 'mid' : 'low'
  const urgencyColor = urgency === 'high' ? 'text-rose-400' : urgency === 'mid' ? 'text-yellow-400' : 'text-white/40'
  const barColor     = urgency === 'high' ? 'bg-rose-500'  : urgency === 'mid' ? 'bg-yellow-500'  : 'bg-emerald-500'

  return (
    <Link
      href={`/loans/${loan.id}`}
      className="flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.025] transition-colors group border-b border-white/[0.04] last:border-0"
    >
      <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
        <Landmark className="w-3.5 h-3.5 text-rose-400" />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-white/80 group-hover:text-yellow-300 transition-colors truncate">{loan.name}</p>
          <span className={cn('text-[11px] font-semibold tabular-nums flex-shrink-0', urgencyColor)}>
            {monthsLeft > 0 ? `${monthsLeft}mo left` : <span className="text-emerald-400">✓ done</span>}
          </span>
        </div>
        <ProgressBar pct={pctPaid} color={barColor} thin />
        <div className="flex items-center justify-between text-[10px] text-white/25">
          <span>{totalPaid}/{loan.termMonths} payments · {pctPaid.toFixed(0)}% paid</span>
          {endDate && <span>{endDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</span>}
        </div>
      </div>

      <div className="text-right flex-shrink-0 space-y-0.5">
        <p className="text-[13px] font-bold text-rose-400 tabular-nums">
          {fmt(view === 'monthly' ? Number(loan.monthlyPayment) : Number(loan.monthlyPayment) * 12, loan.currency)}
          <span className="text-[10px] text-white/30 font-normal ml-0.5">/{view === 'monthly' ? 'mo' : 'yr'}</span>
        </p>
        {loan.currency !== 'MXN' && (
          <p className="text-[10px] text-white/30 tabular-nums">≈ {fmtMXN(cost)} MXN</p>
        )}
        <p className="text-[10px] text-white/25 tabular-nums">{fmt(Number(loan.currentBalance), loan.currency)} left</p>
        {view === 'monthly' && incomeMXN > 0 && (
          <p className="text-[10px] text-yellow-400/60">{pctOfInc.toFixed(1)}% income</p>
        )}
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-white/15 group-hover:text-yellow-400/50 transition-colors flex-shrink-0" />
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD SOURCE MODAL
// ─────────────────────────────────────────────────────────────────────────────

const ALLOCATION_PRESETS = [25, 50, 75, 100]

function AddSourceModal({
  onAdd,
  onClose,
}: {
  onAdd: (s: Omit<ExtraSource, 'id'>) => void
  onClose: () => void
}) {
  const [name, setName]         = useState('')
  const [amount, setAmount]     = useState('')
  const [currency, setCurrency] = useState<'MXN' | 'USD' | 'GTQ'>('USD')
  const [pct, setPct]           = useState(50)
  const nameRef                 = useRef<HTMLInputElement>(null)

  const amountNum = parseFloat(amount) || 0
  const amountMXN = toMXN(amountNum, currency)
  const debtExtra = amountMXN * (pct / 100)
  const valid     = name.trim().length > 0 && amountNum > 0

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    nameRef.current?.focus()
    return () => { document.body.style.overflow = prev }
  }, [])

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function submit() {
    if (!valid) return
    onAdd({ name: name.trim(), amount: amountNum, currency, allocationPct: pct })
    onClose()
  }

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
    >
      {/* Full-page backdrop — covers sidebar + main, true black blur */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(4, 6, 10, 0.82)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.10] bg-[#0b0e17] overflow-hidden"
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 40px 100px rgba(0,0,0,0.9)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Amber top glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
              <Wand2 className="w-4.5 h-4.5 text-yellow-400" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-white">Add Income Source</p>
              <p className="text-[11px] text-white/30 mt-0.5">Simulate extra income → debt payoff</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-white/25 hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Source name */}
          <div>
            <label className="text-[10px] text-white/35 uppercase tracking-[0.10em] font-semibold block mb-2">
              Source name
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="e.g. Client A, Freelance Project…"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-yellow-400/50 focus:bg-yellow-400/[0.02] transition-all"
            />
          </div>

          {/* Amount + Currency */}
          <div>
            <label className="text-[10px] text-white/35 uppercase tracking-[0.10em] font-semibold block mb-2">
              Monthly income
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit() }}
                placeholder="0.00"
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-yellow-400/50 focus:bg-yellow-400/[0.02] transition-all"
              />
              <div className="flex rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.04]">
                {CURRENCY_OPTIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={cn(
                      'px-3 py-2.5 text-[12px] font-semibold transition-all',
                      currency === c
                        ? 'bg-yellow-400/15 text-yellow-300'
                        : 'text-white/30 hover:text-white/60'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {amountNum > 0 && currency !== 'MXN' && (
              <p className="text-[11px] text-white/30 mt-2">
                ≈ <span className="text-white/50 font-semibold">{fmtMXN(amountMXN)} MXN/mo</span>
                {' '}at 1 {currency} = {fmtMXN(FX_TO_MXN[currency])} MXN
              </p>
            )}
          </div>

          {/* Allocation % */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-white/35 uppercase tracking-[0.10em] font-semibold">
                Allocate to debt payoff
              </label>
              <span className="text-[15px] font-bold text-yellow-300">{pct}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={pct}
              onChange={e => setPct(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-white/[0.08] accent-yellow-400 cursor-pointer"
            />
            <div className="flex gap-1.5 mt-2.5">
              {ALLOCATION_PRESETS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPct(p)}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all border',
                    pct === p
                      ? 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30'
                      : 'bg-white/[0.03] text-white/25 border-white/[0.06] hover:text-white/60'
                  )}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* Preview box — only when amount is entered */}
          {amountNum > 0 && (
            <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-4 space-y-2">
              <p className="text-[10px] text-emerald-400/60 uppercase tracking-[0.10em] font-semibold">Effect preview</p>
              <div className="space-y-1.5">
                {[
                  { label: `To debt (${pct}%)`,              value: fmtMXN(debtExtra),        color: 'text-emerald-400 font-bold' },
                  { label: `Free cash (${100 - pct}%)`,       value: fmtMXN(amountMXN - debtExtra), color: 'text-white/50' },
                  { label: 'Annual to debt',                   value: fmtMXN(debtExtra * 12),   color: 'text-emerald-400/60' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between text-[12px]">
                    <span className="text-white/35">{label}</span>
                    <span className={color}>{value} MXN</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FX legend — collapsed, subtle */}
          <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Info className="w-3 h-3 text-white/15" />
              <span className="text-[10px] text-white/20 uppercase tracking-wider">FX rates</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {FX_LABELS.map(({ currency: c, rate }) => (
                <span key={c} className="text-[11px] text-white/20">
                  {c} <span className="text-white/30 font-mono">= {rate}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky footer actions */}
        <div className="flex gap-2 px-5 py-4 border-t border-white/[0.06] bg-[#0b0e17]">
          <button
            onClick={submit}
            disabled={!valid}
            className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-black text-[13px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Add to simulation
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-[13px] text-white/30 hover:text-white/60 hover:border-white/[0.12] transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  // Portal to document.body — bypasses all stacking contexts (backdrop-blur, transform, overflow)
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRA SOURCE CARD
// ─────────────────────────────────────────────────────────────────────────────

function ExtraSourceCard({
  source,
  onRemove,
  onChangePct,
}: {
  source: ExtraSource
  onRemove: () => void
  onChangePct: (pct: number) => void
}) {
  const amountMXN = toMXN(source.amount, source.currency)
  const debtMXN   = amountMXN * (source.allocationPct / 100)

  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white/80 truncate">{source.name}</p>
            <p className="text-[10px] text-white/30">
              {fmt(source.amount, source.currency)}/mo
              {source.currency !== 'MXN' && ` ≈ ${fmtMXN(amountMXN)}`}
            </p>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-white/[0.06] text-white/20 hover:text-rose-400 transition-colors flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inline allocation slider */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white/30">Debt allocation</span>
          <span className="text-yellow-300 font-bold">{source.allocationPct}% → {fmtMXN(debtMXN)} MXN</span>
        </div>
        <input
          type="range"
          min={5}
          max={100}
          step={5}
          value={source.allocationPct}
          onChange={e => onChangePct(Number(e.target.value))}
          className="w-full h-1 rounded-full appearance-none bg-white/[0.08] accent-yellow-400 cursor-pointer"
        />
        <div className="flex gap-1">
          {ALLOCATION_PRESETS.map(p => (
            <button
              key={p}
              onClick={() => onChangePct(p)}
              className={cn(
                'flex-1 py-0.5 rounded text-[10px] font-semibold transition-all',
                source.allocationPct === p ? 'text-yellow-300' : 'text-white/20 hover:text-white/50'
              )}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYOFF SIMULATOR
// ─────────────────────────────────────────────────────────────────────────────

function PayoffSimulator({
  loans,
  baselineMonths,
  baselinePerLoan,
  incomeMXN,
  sources,
  onSourcesChange,
  onAddClient,
}: {
  loans: Loan[]
  baselineMonths: number
  baselinePerLoan: Record<string, number>
  incomeMXN: number
  sources: ExtraSource[]
  onSourcesChange: (sources: ExtraSource[]) => void
  onAddClient: () => void
}) {
  const addSource = useCallback((s: Omit<ExtraSource, 'id'>) => {
    onSourcesChange([...sources, { ...s, id: crypto.randomUUID() }])
  }, [sources, onSourcesChange])

  const removeSource = useCallback((id: string) => {
    onSourcesChange(sources.filter(s => s.id !== id))
  }, [sources, onSourcesChange])

  const updatePct = useCallback((id: string, pct: number) => {
    onSourcesChange(sources.map(s => s.id === id ? { ...s, allocationPct: pct } : s))
  }, [sources, onSourcesChange])

  // Total extra MXN/mo going to debt
  const extraDebtMXN = useMemo(
    () => sources.reduce((sum, s) => sum + toMXN(s.amount, s.currency) * (s.allocationPct / 100), 0),
    [sources]
  )

  // Run simulation only when sources change
  const simResult = useMemo<SimResult | null>(
    () => sources.length > 0 ? simulatePayoff(loans, extraDebtMXN) : null,
    [loans, extraDebtMXN, sources.length]
  )

  const monthsSaved = simResult ? Math.max(0, baselineMonths - simResult.totalMonths) : 0
  const maxMonths   = Math.max(baselineMonths, 1)

  // Build per-loan comparison bars
  const comparisonLanes = useMemo(() => {
    return [...loans]
      .filter(l => l.payments.some(p => p.status === 'scheduled' || p.status === 'partial'))
      .sort((a, b) => (baselinePerLoan[b.id] ?? 0) - (baselinePerLoan[a.id] ?? 0))
      .map(loan => ({
        loan,
        baselineWidth: ((baselinePerLoan[loan.id] ?? 0) / maxMonths) * 100,
        simWidth: simResult
          ? ((simResult.perLoan[loan.id] ?? 0) / maxMonths) * 100
          : null,
        baselineMonths: baselinePerLoan[loan.id] ?? 0,
        simMonths: simResult?.perLoan[loan.id] ?? null,
      }))
  }, [loans, baselinePerLoan, simResult, maxMonths])

  const now = new Date()
  function monthsToDate(m: number) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1)
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-4 pt-4 border-t border-white/[0.05]">

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-yellow-400" />
          <div>
            <p className="text-[13px] font-semibold text-white">Income Simulator</p>
            <p className="text-[10px] text-white/30">Add client income — see how fast you become debt-free</p>
          </div>
        </div>
        <button
          onClick={onAddClient}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20 hover:bg-yellow-400/15 text-yellow-300 text-[12px] font-semibold transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add another
        </button>
      </div>

      {/* Source cards */}
      {sources.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sources.map(s => (
            <ExtraSourceCard
              key={s.id}
              source={s}
              onRemove={() => removeSource(s.id)}
              onChangePct={pct => updatePct(s.id, pct)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {sources.length === 0 && (
        <div
          className="rounded-xl border border-dashed border-white/[0.08] py-8 flex flex-col items-center gap-2 cursor-pointer hover:border-yellow-400/20 hover:bg-yellow-400/[0.02] transition-all"
          onClick={onAddClient}
        >
          <Wand2 className="w-6 h-6 text-white/15" />
          <p className="text-[12px] text-white/25">Click to add a client or extra income source</p>
          <p className="text-[11px] text-white/15">Simulate how extra cash accelerates debt payoff</p>
        </div>
      )}

      {/* Summary strip — only when sources added */}
      {sources.length > 0 && (
        <div className="rounded-lg bg-emerald-500/[0.05] border border-emerald-500/15 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1">
          <div className="text-[12px]">
            <span className="text-white/30">Extra to debt: </span>
            <span className="text-emerald-400 font-bold">{fmtMXN(extraDebtMXN)}/mo</span>
          </div>
          {incomeMXN > 0 && (
            <div className="text-[12px]">
              <span className="text-white/30">Total income w/ extras: </span>
              <span className="text-white/60 font-semibold">
                {fmtMXN(incomeMXN + sources.reduce((s, x) => s + toMXN(x.amount, x.currency), 0))}/mo
              </span>
            </div>
          )}
          {monthsSaved > 0 && (
            <div className="ml-auto text-[12px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-yellow-300 font-bold">{monthsLabel(monthsSaved)} sooner</span>
            </div>
          )}
        </div>
      )}

      {/* Comparison timeline */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 space-y-3">
        {/* Header with legend */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] text-white/40 uppercase tracking-[0.08em] font-semibold">
            Payoff Timeline
          </p>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-white/30">
              <span className="inline-block w-3 h-1.5 rounded-full bg-rose-500/50" />
              Current path
            </span>
            {simResult && (
              <span className="flex items-center gap-1 text-emerald-400/70">
                <span className="inline-block w-3 h-1.5 rounded-full bg-emerald-500" />
                With extra income
              </span>
            )}
          </div>
        </div>

        {/* Per-loan bars */}
        {comparisonLanes.map(({ loan, baselineWidth, simWidth, baselineMonths: bm, simMonths: sm }) => (
          <div key={loan.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/50 truncate max-w-[180px]">{loan.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-white/25">{monthsLabel(bm)}</span>
                {sm !== null && sm < bm && (
                  <>
                    <span className="text-white/15">→</span>
                    <span className="text-emerald-400 font-semibold">{monthsLabel(sm)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Stacked bars — baseline behind, sim on top */}
            <div className="relative h-2.5 rounded-full bg-white/[0.04] overflow-hidden">
              {/* Baseline (dim) */}
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-rose-500/35 transition-all duration-500"
                style={{ width: `${baselineWidth}%` }}
              />
              {/* Simulated (bright, shorter) */}
              {simWidth !== null && (
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/70 transition-all duration-700"
                  style={{ width: `${simWidth}%` }}
                />
              )}
            </div>
          </div>
        ))}

        {/* Time axis */}
        <div className="flex justify-between text-[9px] text-white/15 pt-0.5">
          <span>Now</span>
          {simResult && monthsSaved > 0 && (
            <span className="text-emerald-400/50">
              Debt-free {monthsToDate(simResult.totalMonths)}
            </span>
          )}
          <span>{monthsToDate(baselineMonths)}</span>
        </div>

        {/* Savings callout */}
        {simResult && monthsSaved > 0 && (
          <div className="mt-1 pt-3 border-t border-white/[0.04] flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-white/50 leading-relaxed">
              With {sources.length} extra source{sources.length > 1 ? 's' : ''} allocating{' '}
              <span className="text-emerald-400 font-semibold">{fmtMXN(extraDebtMXN)}/mo</span> to debt,
              you'll be debt-free{' '}
              <span className="text-yellow-300 font-bold">{monthsLabel(monthsSaved)} sooner</span>{' '}
              — by <span className="text-white/70">{monthsToDate(simResult.totalMonths)}</span> instead of{' '}
              <span className="text-white/40">{monthsToDate(baselineMonths)}</span>.
            </p>
          </div>
        )}

        {simResult && monthsSaved === 0 && sources.length > 0 && (
          <p className="text-[11px] text-white/25 text-center pt-1">
            Extra income doesn't materially change the payoff timeline at these allocations.
          </p>
        )}
      </div>

      {/* FX rates legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
        <div className="flex items-center gap-1 text-[10px] text-white/20">
          <Info className="w-3 h-3" /> FX rates:
        </div>
        {FX_LABELS.map(({ currency, rate }) => (
          <span key={currency} className="text-[10px] text-white/20">
            1 {currency} = <span className="text-white/30">{rate}</span>
          </span>
        ))}
      </div>

      {/* Cascade breakdown — only visible when sources are added */}
      <CascadeView loans={loans} extraFromSources={extraDebtMXN} />

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DEBT-FREE TIMELINE (current path only — with simulator below)
// ─────────────────────────────────────────────────────────────────────────────

function DebtFreeTimeline({
  loans, incomeMXN, extraSources, onExtraSourcesChange, showModal, onShowModalChange,
}: {
  loans: Loan[]
  incomeMXN: number
  extraSources: ExtraSource[]
  onExtraSourcesChange: (sources: ExtraSource[]) => void
  showModal: boolean
  onShowModalChange: (v: boolean) => void
}) {
  const now     = new Date()
  const nowYear = now.getFullYear()
  const nowMo   = now.getMonth()

  const endDates = loans
    .filter(l => l.payments.some(p => p.status === 'scheduled' || p.status === 'partial'))
    .map(l => new Date(l.endDate))

  if (endDates.length === 0) return (
    <div className="py-12 text-center">
      <CheckCircle2 className="w-8 h-8 text-emerald-400/40 mx-auto mb-2" />
      <p className="text-sm text-white/30">All credits paid off 🎉</p>
    </div>
  )

  const latestEnd          = new Date(Math.max(...endDates.map(d => d.getTime())))
  const baselineMonths     = Math.max(0, (latestEnd.getFullYear() - nowYear) * 12 + (latestEnd.getMonth() - nowMo))
  const totalRemainingMXN  = loans.reduce((s, l) => s + toMXN(Number(l.currentBalance), l.currency), 0)
  const totalMonthlyMXN    = loans
    .filter(l => l.payments.some(p => p.status === 'scheduled'))
    .reduce((s, l) => s + toMXN(Number(l.monthlyPayment), l.currency), 0)
  const debtOfIncomePct    = incomeMXN > 0 ? (totalMonthlyMXN / incomeMXN) * 100 : 0

  // Baseline simulation (no extra income)
  const baseline = useMemo(() => simulatePayoff(loans, 0), [loans])

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryChip icon={TrendingDown} label="Total Remaining"
          value={fmtMXN(totalRemainingMXN)} sub="across all active loans" color="text-rose-400" />
        <SummaryChip icon={DollarSign} label="Monthly Debt Cost"
          value={fmtMXN(totalMonthlyMXN)} sub={`${debtOfIncomePct.toFixed(1)}% of income`} color="text-yellow-400" />
        <SummaryChip icon={CalendarDays} label="Debt-Free In"
          value={monthsLabel(baselineMonths)}
          sub={latestEnd.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          color="text-emerald-400" />
        <SummaryChip icon={BarChart3} label="Annual Debt Cost"
          value={fmtMXN(totalMonthlyMXN * 12)}
          sub={`≈ ${((totalMonthlyMXN * 12 / Math.max(incomeMXN * 12, 1)) * 100).toFixed(0)}% of annual income`}
          color="text-sky-400" />
      </div>

      {/* Insight */}
      {incomeMXN > 0 && (
        <div className="rounded-xl bg-yellow-400/[0.04] border border-yellow-400/[0.10] px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-400/70 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-white/50 leading-relaxed">
            At your current salary of <span className="text-white/80 font-semibold">{fmtMXN(incomeMXN)}/mo</span>,
            you spend <span className="text-rose-400 font-semibold">{fmtMXN(totalMonthlyMXN)}/mo</span> on debt
            ({debtOfIncomePct.toFixed(1)}% DTI). Paying minimums, debt-free in{' '}
            <span className="text-yellow-300 font-semibold">{monthsLabel(baselineMonths)}</span>{' '}
            ({latestEnd.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}).
          </p>
        </div>
      )}

      {/* Simulator */}
      <PayoffSimulator
        loans={loans}
        baselineMonths={baseline.totalMonths}
        baselinePerLoan={baseline.perLoan}
        incomeMXN={incomeMXN}
        sources={extraSources}
        onSourcesChange={onExtraSourcesChange}
        onAddClient={() => onShowModalChange(true)}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface CreditPaymentOverviewProps {
  monthlyIncomeMXN: number
  extraSources: ExtraSource[]
  onExtraSourcesChange: (sources: ExtraSource[]) => void
  onProjection?: (projection: MonthProjection[]) => void
}

export function CreditPaymentOverview({ monthlyIncomeMXN, extraSources, onExtraSourcesChange, onProjection }: CreditPaymentOverviewProps) {
  const [loans, setLoans]         = useState<Loan[]>([])
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState<'monthly' | 'annual'>('monthly')
  const [tab, setTab]             = useState<'list' | 'timeline'>('list')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetch('/api/loans')
      .then(r => r.json())
      .then(j => setLoans(j.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const activeLoans = useMemo(
    () => loans.filter(l => l.isActive && l.payments.some(p => p.status === 'scheduled' || p.status === 'partial')),
    [loans]
  )

  // Compute & fire projection whenever sources or loans change
  useEffect(() => {
    if (!onProjection) return
    const extraDebtMXN = extraSources.reduce(
      (s, src) => s + src.amount * (FX_TO_MXN[src.currency] ?? 1) * (src.allocationPct / 100), 0
    )
    const extraTotalMXN = extraSources.reduce(
      (s, src) => s + src.amount * (FX_TO_MXN[src.currency] ?? 1), 0
    )
    if (extraDebtMXN === 0 || activeLoans.length === 0) {
      onProjection([])
      return
    }
    const result = simulateDetailed(activeLoans, extraDebtMXN, 'avalanche')
    const loanById = Object.fromEntries(activeLoans.map(l => [l.id, l]))
    const projection: MonthProjection[] = result.months.map(m => {
      const newlyClosedNames = m.cascadeFrom.map(id => loanById[id]?.name ?? id)
      // Cumulative freed = sum of minPayments of all loans whose close month < current month
      const cumulativeFreedMXN = activeLoans.reduce((sum, l) => {
        const closeMonth = result.perLoan[l.id] ?? 9999
        return closeMonth < m.monthIdx ? sum + toMXN(Number(l.monthlyPayment), l.currency) : sum
      }, 0)
      return {
        monthOffset:        m.monthIdx - 1,
        cumulativeFreedMXN,
        newlyClosedNames,
        totalSurplusMXN:    cumulativeFreedMXN + extraTotalMXN,
      }
    })
    onProjection(projection)
  }, [extraSources, activeLoans, onProjection])

  const totalMonthlyMXN = useMemo(
    () => activeLoans.reduce((s, l) => s + toMXN(Number(l.monthlyPayment), l.currency), 0),
    [activeLoans]
  )

  const displayTotal = view === 'monthly' ? totalMonthlyMXN : totalMonthlyMXN * 12

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14]/80 backdrop-blur-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.05]">
        <div>
          <h3 className="text-sm font-semibold text-white">Credit Payment Overview</h3>
          <p className="text-[11px] text-white/30 mt-0.5">
            {activeLoans.length} active credit{activeLoans.length !== 1 ? 's' : ''} ·{' '}
            <span className="text-rose-400 font-medium">{fmtMXN(displayTotal)}/{view === 'monthly' ? 'mo' : 'yr'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Add client — primary CTA, always visible */}
          <button
            onClick={() => { setTab('timeline'); setShowModal(true) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 active:scale-[0.97] text-black text-[12px] font-bold transition-all"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Add client
          </button>

          {/* Monthly / Annual toggle (only relevant for list view) */}
          {tab === 'list' && (
            <div className="flex items-center border border-white/[0.06] bg-black/20 rounded-lg p-0.5 gap-0.5">
              {(['monthly', 'annual'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all',
                    view === v
                      ? 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/25'
                      : 'text-white/30 hover:text-white/60'
                  )}
                >
                  {v === 'monthly' ? '1M' : '12M'}
                </button>
              ))}
            </div>
          )}

          {/* List / Simulator toggle */}
          <div className="flex items-center border border-white/[0.06] bg-black/20 rounded-lg p-0.5 gap-0.5">
            {([
              { key: 'list',     label: 'List'      },
              { key: 'timeline', label: 'Simulator' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all',
                  tab === key
                    ? 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/25'
                    : 'text-white/30 hover:text-white/60'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={cn(tab === 'list' ? '' : 'p-5')}>
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-3 text-white/20 text-sm">
            <Clock className="w-4 h-4 animate-pulse" />
            Loading credits…
          </div>
        ) : activeLoans.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400/40 mx-auto mb-2" />
            <p className="text-sm text-white/30">No active credits</p>
          </div>
        ) : tab === 'list' ? (
          <div>
            {activeLoans.map(loan => (
              <LoanRow key={loan.id} loan={loan} view={view} incomeMXN={monthlyIncomeMXN} />
            ))}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] bg-white/[0.02]">
              <span className="text-[11px] text-white/30 uppercase tracking-[0.08em] font-semibold">
                Total {view === 'monthly' ? 'Monthly' : 'Annual'}
              </span>
              <span className="text-sm font-bold text-rose-400 tabular-nums">
                {fmtMXN(displayTotal)}
                <span className="text-[10px] text-white/30 font-normal ml-1">/ {view === 'monthly' ? 'mo' : 'yr'}</span>
              </span>
            </div>
          </div>
        ) : (
          <DebtFreeTimeline
            loans={activeLoans}
            incomeMXN={monthlyIncomeMXN}
            extraSources={extraSources}
            onExtraSourcesChange={onExtraSourcesChange}
            showModal={showModal}
            onShowModalChange={setShowModal}
          />
        )}
      </div>

      {/* Modal — portalled from CreditPaymentOverview so it's always reachable */}
      {showModal && (
        <AddSourceModal
          onAdd={s => onExtraSourcesChange([...extraSources, { ...s, id: crypto.randomUUID() }])}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
