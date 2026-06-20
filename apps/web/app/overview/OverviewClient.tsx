'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Landmark, Repeat2, Wallet,
  ArrowUpRight, ArrowDownRight, Info, Wand2, Sparkles, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MonthRow } from './page'
import { CreditPaymentOverview, type ExtraSource, type MonthProjection } from './CreditPaymentOverview'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const FX_TO_MXN: Record<string, number> = { MXN: 1, GTQ: 2.49, USD: 19.2 }

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtMXN(n: number, compact = false) {
  if (compact && Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function sign(n: number) { return n >= 0 ? '+' : '-' }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function periodLabel(p: string) {
  const [y, m] = p.split('-').map(Number)
  return { month: MONTHS[m - 1], year: y, short: `${MONTHS[m - 1]} ${y}` }
}

const STATUS_DOT: Record<string, string> = {
  received: 'bg-emerald-400', paid: 'bg-emerald-400',
  partial:  'bg-yellow-400',   expected:  'bg-white/20',
  scheduled:'bg-white/20',    missed:    'bg-rose-400',
  skipped:  'bg-white/10',
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Meta = {
  periods: string[]
  curPeriod: string
  fxRates: Record<string, number>
  kpi: {
    monthlyIncomeNet: number
    monthlyLoans: number
    monthlyRecurring: number
    monthlyCashFlow: number
    ytdIncomeActual: number
    ytdLoansPaid: number
    ytdRecurring: number
    ytdNetFlow: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color, icon: Icon, simDelta,
}: {
  label: string; value: string; sub: string; color: string
  icon: React.ElementType
  simDelta?: string  // optional "+$X simulated" label
}) {
  return (
    <div className={cn(
      'rounded-xl border p-5 transition-colors',
      simDelta
        ? 'border-yellow-400/20 bg-yellow-400/[0.04]'
        : 'border-white/[0.06] bg-[#0a0d14]/80 backdrop-blur-xl'
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-white/30 uppercase tracking-[0.08em] font-semibold">{label}</span>
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-[11px] text-white/30 mt-1">{sub}</p>
      {simDelta && (
        <p className="text-[10px] text-yellow-300/70 mt-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />{simDelta}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATOR BANNER
// ─────────────────────────────────────────────────────────────────────────────

function SimulatorBanner({
  sources,
  extraTotalMXN,
  extraDebtMXN,
  onClear,
}: {
  sources: ExtraSource[]
  extraTotalMXN: number
  extraDebtMXN: number
  onClear: () => void
}) {
  if (sources.length === 0) return null
  return (
    <div className="rounded-xl bg-yellow-400/[0.06] border border-yellow-400/20 px-4 py-3 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Wand2 className="w-4 h-4 text-yellow-400" />
        <span className="text-[12px] font-semibold text-yellow-300">Simulator active</span>
      </div>
      <div className="flex items-center gap-4 flex-wrap text-[12px] flex-1">
        <span className="text-white/40">
          {sources.length} source{sources.length > 1 ? 's' : ''} ·{' '}
          <span className="text-emerald-400 font-semibold">+{fmtMXN(extraTotalMXN)}/mo</span> total income
        </span>
        <span className="text-white/25">·</span>
        <span className="text-white/40">
          <span className="text-rose-400 font-semibold">{fmtMXN(extraDebtMXN)}/mo</span> allocated to debt
        </span>
        <span className="text-white/25">·</span>
        <span className="text-white/40">
          <span className="text-white/70 font-semibold">{fmtMXN(extraTotalMXN - extraDebtMXN)}/mo</span> free cash
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
        <span className="text-[11px] text-white/25">KPIs & budget updated</span>
        <button
          onClick={onClear}
          className="p-1 rounded hover:bg-white/[0.06] text-white/20 hover:text-white/50 transition-colors"
          title="Clear simulation"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPANDABLE MONTH ROW
// ─────────────────────────────────────────────────────────────────────────────

function MonthRowUI({
  row, isCurrent, extraIncomeMXN, extraSources, projection, simActive,
}: {
  row: MonthRow
  isCurrent: boolean
  extraIncomeMXN: number
  extraSources: ExtraSource[]
  projection: MonthProjection | null
  simActive: boolean
}) {
  const [open, setOpen] = useState(isCurrent)
  const lbl = periodLabel(row.period)

  const adjustedNetIncome = isCurrent
    ? (row.income.totalNetMXN + extraIncomeMXN)
    : row.income.totalNetMXN

  const cashFlow   = isCurrent
    ? (row.projectedMXN + extraIncomeMXN)
    : row.projectedMXN
  const isPositive = cashFlow >= 0
  const rowSimActive = isCurrent && extraIncomeMXN > 0

  // Projection state for this specific month
  const hasMilestone  = (projection?.newlyClosedNames.length ?? 0) > 0
  const freedThisMonth = projection?.cumulativeFreedMXN ?? 0
  const totalSurplus   = projection?.totalSurplusMXN ?? 0
  const showProjection = simActive && projection !== null

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      hasMilestone
        ? 'border-emerald-400/25 bg-emerald-400/[0.03]'
        : isCurrent && rowSimActive
        ? 'border-yellow-400/20 bg-yellow-400/[0.03]'
        : isCurrent
        ? 'border-yellow-400/15 bg-white/[0.02]'
        : showProjection && freedThisMonth > 0
        ? 'border-emerald-500/[0.08] bg-white/[0.01]'
        : 'border-white/[0.05] bg-white/[0.01]'
    )}>

      {/* Milestone banner — when a loan closes this month */}
      {hasMilestone && (
        <div className="flex items-center gap-2 px-5 pt-3 pb-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-300">
              {projection!.newlyClosedNames.join(', ')} closes this month
            </span>
            <span className="text-[10px] text-emerald-400/60">· {fmtMXN(freedThisMonth)}/mo freed</span>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors rounded-xl"
      >
        {/* Month label */}
        <div className="w-20 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <p className={cn(
              'text-sm font-bold',
              hasMilestone ? 'text-emerald-300' : isCurrent ? 'text-yellow-300' : 'text-white/70'
            )}>
              {lbl.month}
            </p>
            {rowSimActive && <Sparkles className="w-3 h-3 text-yellow-400/60" />}
          </div>
          <p className="text-[10px] text-white/25">{lbl.year}</p>
        </div>

        {/* Income */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Income</p>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-emerald-400/50 flex-shrink-0" />
            <span className="text-sm font-semibold text-emerald-400 tabular-nums">
              {row.income.totalActualMXN > 0
                ? fmtMXN(row.income.totalActualMXN + (rowSimActive ? extraIncomeMXN : 0))
                : adjustedNetIncome > 0
                  ? `≈${fmtMXN(adjustedNetIncome)}`
                  : '—'}
            </span>
            {rowSimActive && <span className="text-[9px] text-yellow-400/50">+sim</span>}
          </div>
        </div>

        {/* Loans */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Loans</p>
          <div className="flex items-center gap-1.5">
            <Landmark className="w-3 h-3 text-rose-400/50 flex-shrink-0" />
            <span className="text-sm font-semibold text-rose-400 tabular-nums">
              {row.loans.totalMXN > 0 ? `-${fmtMXN(row.loans.totalMXN)}` : '—'}
            </span>
          </div>
        </div>

        {/* Recurring */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Recurring</p>
          <div className="flex items-center gap-1.5">
            <Repeat2 className="w-3 h-3 text-yellow-400/50 flex-shrink-0" />
            <span className="text-sm font-semibold text-yellow-400 tabular-nums">
              {row.recurring.totalMXN > 0 ? `-${fmtMXN(row.recurring.totalMXN)}` : '—'}
            </span>
          </div>
        </div>

        {/* Net cash flow */}
        <div className="w-32 flex-shrink-0 text-right">
          <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Net Flow</p>
          <div className="flex items-center justify-end gap-1">
            {isPositive
              ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
            <span className={cn('text-sm font-bold tabular-nums', isPositive ? 'text-emerald-400' : 'text-rose-400')}>
              {sign(cashFlow)}{fmtMXN(cashFlow)}
            </span>
          </div>
        </div>

        {/* Cumulative freed — only when sim active */}
        {showProjection && (
          <div className="w-36 flex-shrink-0 text-right">
            <p className="text-[10px] text-white/20 uppercase tracking-wider mb-1 flex items-center justify-end gap-1">
              <Sparkles className="w-2.5 h-2.5 text-yellow-400/40" /> Freed
            </p>
            {freedThisMonth > 0 ? (
              <div>
                <span className="text-sm font-bold text-emerald-400 tabular-nums">
                  +{fmtMXN(freedThisMonth)}
                </span>
                <p className="text-[9px] text-white/20 tabular-nums mt-0.5">
                  {fmtMXN(totalSurplus)} total capacity
                </p>
              </div>
            ) : (
              <span className="text-sm text-white/15 tabular-nums">—</span>
            )}
          </div>
        )}

        <div className="w-6 flex-shrink-0 text-white/15">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/[0.04] pt-4">

          {/* Income detail */}
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" /> Income
            </p>
            {row.income.items.length === 0 ? (
              <p className="text-xs text-white/20 italic">No income tracked this month</p>
            ) : row.income.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[item.status] ?? 'bg-white/20')} />
                  <Link href={`/income/${item.sourceId}`} className="text-xs text-white/60 hover:text-yellow-300 transition-colors truncate">
                    {item.name}
                  </Link>
                </div>
                <p className="text-xs font-semibold text-emerald-400 tabular-nums flex-shrink-0 ml-2">
                  {item.actualMXN != null ? fmtMXN(item.actualMXN) : `≈${fmtMXN(item.netMXN)}`}
                </p>
              </div>
            ))}
            {/* Simulated income rows */}
            {simActive && extraSources.map((s, i) => (
              <div key={`sim-${i}`} className="flex items-center justify-between py-1.5 border-b border-yellow-400/[0.08] last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-3 h-3 text-yellow-400/60 flex-shrink-0" />
                  <span className="text-xs text-yellow-300/60 italic truncate">{s.name} (sim)</span>
                </div>
                <p className="text-xs font-semibold text-yellow-400/70 tabular-nums flex-shrink-0 ml-2">
                  +{fmtMXN(s.amount * (FX_TO_MXN[s.currency] ?? 1))}
                </p>
              </div>
            ))}
            {row.income.items.length > 0 && (
              <div className="flex justify-between pt-2 mt-1">
                <span className="text-[10px] text-white/25">Net monthly</span>
                <span className="text-xs font-bold text-white tabular-nums">{fmtMXN(adjustedNetIncome)}</span>
              </div>
            )}
          </div>

          {/* Loans detail */}
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Landmark className="w-3 h-3" /> Loan Payments
            </p>
            {row.loans.items.length === 0 ? (
              <p className="text-xs text-white/20 italic">No loan payments this month</p>
            ) : row.loans.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[item.status] ?? 'bg-white/20')} />
                  <Link href={`/loans/${item.loanId}`} className="text-xs text-white/60 hover:text-yellow-300 transition-colors truncate">
                    {item.name}
                  </Link>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-xs font-semibold text-rose-400 tabular-nums">-{fmtMXN(item.amountMXN)}</p>
                  {item.currency !== 'MXN' && (
                    <p className="text-[9px] text-white/20">{item.currency} {item.amountNative.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                  )}
                </div>
              </div>
            ))}
            {row.loans.items.length > 0 && (
              <div className="flex justify-between pt-2 mt-1">
                <span className="text-[10px] text-white/25">Total payments</span>
                <span className="text-xs font-bold text-rose-400 tabular-nums">-{fmtMXN(row.loans.totalMXN)}</span>
              </div>
            )}
          </div>

          {/* Recurring detail */}
          <div>
            <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Repeat2 className="w-3 h-3" /> Recurring
            </p>
            {row.recurring.items.length === 0 ? (
              <p className="text-xs text-white/20 italic">No recurring expenses</p>
            ) : row.recurring.items.slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="min-w-0">
                  <p className="text-xs text-white/60 truncate">{item.name}</p>
                  <p className="text-[9px] text-white/25">{item.category}</p>
                </div>
                <p className="text-xs font-semibold text-yellow-400 tabular-nums flex-shrink-0 ml-2">-{fmtMXN(item.amountMXN)}</p>
              </div>
            ))}
            {row.recurring.items.length > 8 && (
              <p className="text-[10px] text-white/20 mt-1">+{row.recurring.items.length - 8} more</p>
            )}
            {row.recurring.items.length > 0 && (
              <div className="flex justify-between pt-2 mt-1">
                <span className="text-[10px] text-white/25">Total recurring</span>
                <span className="text-xs font-bold text-yellow-400 tabular-nums">-{fmtMXN(row.recurring.totalMXN)}</span>
              </div>
            )}
          </div>

          {/* Cash flow summary */}
          <div className="md:col-span-3 mt-2 pt-4 border-t border-white/[0.04]">
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <span className="text-white/25">Cash Flow Summary{simActive ? ' (with simulation)' : ''}</span>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-white/40">
                  Income <span className="text-emerald-400 font-semibold">
                    {fmtMXN(row.income.totalActualMXN > 0 ? row.income.totalActualMXN + (simActive ? extraIncomeMXN : 0) : adjustedNetIncome)}
                  </span>
                </span>
                <span className="text-white/15">−</span>
                <span className="text-white/40">Loans <span className="text-rose-400 font-semibold">{fmtMXN(row.loans.totalMXN)}</span></span>
                <span className="text-white/15">−</span>
                <span className="text-white/40">Recurring <span className="text-yellow-400 font-semibold">{fmtMXN(row.recurring.totalMXN)}</span></span>
                <span className="text-white/15">=</span>
                <span className={cn('font-bold text-sm', isPositive ? 'text-emerald-400' : 'text-rose-400')}>
                  {sign(cashFlow)}{fmtMXN(cashFlow)}
                </span>
              </div>
            </div>
            {adjustedNetIncome > 0 && (
              <div className="mt-2 h-1.5 rounded-full bg-white/[0.04] overflow-hidden flex">
                <div className="bg-rose-500 h-full"
                  style={{ width: `${Math.min(50, (row.loans.totalMXN / adjustedNetIncome) * 100)}%` }} />
                <div className="bg-yellow-500 h-full"
                  style={{ width: `${Math.min(30, (row.recurring.totalMXN / adjustedNetIncome) * 100)}%` }} />
                {simActive && (
                  <div className="bg-yellow-400/50 h-full"
                    style={{ width: `${Math.min(20, (extraIncomeMXN / adjustedNetIncome) * 100)}%` }} />
                )}
                <div className="bg-emerald-500/50 h-full flex-1" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function OverviewClient({
  monthMap, meta,
}: {
  monthMap: Record<string, MonthRow>
  meta: Meta
}) {
  const [year, setYear]                 = useState(() => new Date().getFullYear())
  const [extraSources, setExtraSources] = useState<ExtraSource[]>([])
  const [simProjection, setSimProjection] = useState<MonthProjection[]>([])

  // Map period string → projection entry (offset from current month)
  const projectionByPeriod = useMemo(() => {
    if (simProjection.length === 0) return {} as Record<string, MonthProjection>
    const now     = new Date()
    const baseOff = now.getFullYear() * 12 + now.getMonth()
    return Object.fromEntries(
      simProjection.map(p => {
        const abs   = baseOff + p.monthOffset
        const y     = Math.floor(abs / 12)
        const m     = (abs % 12) + 1
        const key   = `${y}-${String(m).padStart(2, '0')}`
        return [key, p]
      })
    )
  }, [simProjection])

  const yearPeriods = useMemo(
    () => meta.periods.filter(p => p.startsWith(`${year}-`)),
    [meta.periods, year]
  )

  const minYear = Number(meta.periods[0]?.split('-')[0] ?? year)
  const maxYear = Number(meta.periods[meta.periods.length - 1]?.split('-')[0] ?? year)

  const { kpi } = meta

  // ── Simulator-derived numbers ──────────────────────────────────────────────
  const extraTotalMXN = useMemo(
    () => extraSources.reduce((s, src) => s + src.amount * (FX_TO_MXN[src.currency] ?? 1), 0),
    [extraSources]
  )
  const extraDebtMXN = useMemo(
    () => extraSources.reduce((s, src) => s + src.amount * (FX_TO_MXN[src.currency] ?? 1) * (src.allocationPct / 100), 0),
    [extraSources]
  )

  // Adjusted KPIs — only mutate income & cash flow; loans/recurring are fixed obligations
  const adjIncome    = kpi.monthlyIncomeNet + extraTotalMXN
  const adjCashFlow  = kpi.monthlyCashFlow  + extraTotalMXN
  const simActive    = extraSources.length > 0

  // Budget allocation ratios
  const obligations  = kpi.monthlyLoans + kpi.monthlyRecurring
  const adjIncomeSafe = Math.max(adjIncome, 1)
  const dtiPct       = (kpi.monthlyLoans    / adjIncomeSafe) * 100
  const recurPct     = (kpi.monthlyRecurring / adjIncomeSafe) * 100
  const extraPct     = simActive ? (extraTotalMXN / adjIncomeSafe) * 100 : 0
  const freePct      = Math.max(0, 100 - dtiPct - recurPct)

  return (
    <div className="space-y-6">

      {/* ── KPI row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          label="Monthly Income (net)"
          value={fmtMXN(adjIncome, true)}
          sub={`MXN ${adjIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })} take-home`}
          color="text-emerald-400"
          simDelta={simActive ? `+${fmtMXN(extraTotalMXN)} simulated` : undefined}
        />
        <KpiCard
          icon={Landmark}
          label="Monthly Loan Payments"
          value={fmtMXN(kpi.monthlyLoans, true)}
          sub={`${dtiPct.toFixed(0)}% of income (DTI)`}
          color="text-rose-400"
        />
        <KpiCard
          icon={Repeat2}
          label="Monthly Recurring"
          value={fmtMXN(kpi.monthlyRecurring, true)}
          sub={`${recurPct.toFixed(0)}% of income`}
          color="text-yellow-400"
        />
        <KpiCard
          icon={adjCashFlow >= 0 ? Wallet : TrendingDown}
          label="Monthly Net Cash Flow"
          value={`${adjCashFlow >= 0 ? '+' : '-'}${fmtMXN(Math.abs(adjCashFlow), true)}`}
          sub={`After obligations · ${adjCashFlow >= 0 ? '✓ positive' : '⚠ negative'}`}
          color={adjCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}
          simDelta={simActive ? `+${fmtMXN(extraTotalMXN)} from simulator` : undefined}
        />
      </div>

      {/* ── Simulator banner ─────────────────────────────────────────────────── */}
      <SimulatorBanner
        sources={extraSources}
        extraTotalMXN={extraTotalMXN}
        extraDebtMXN={extraDebtMXN}
        onClear={() => setExtraSources([])}
      />

      {/* ── Budget Allocation ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14]/80 backdrop-blur-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white/80">Budget Allocation</h3>
            <p className="text-xs text-white/30 mt-0.5">
              Of {simActive ? 'adjusted' : 'your'} MXN {Math.round(adjIncome).toLocaleString()} net income
              {simActive && <span className="text-yellow-400/60 ml-1">(with simulation)</span>}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/20">
            <Info className="w-3 h-3" />
            <span>MXN · GTQ×2.49 · USD×19.2</span>
          </div>
        </div>

        {/* Stacked bar */}
        <div className="h-3 rounded-full overflow-hidden flex gap-px mb-3">
          <div className="bg-rose-500 h-full rounded-l-full transition-all duration-500" style={{ width: `${dtiPct}%` }} />
          <div className="bg-yellow-500 h-full transition-all duration-500" style={{ width: `${recurPct}%` }} />
          {simActive && (
            <div className="bg-yellow-400/50 h-full transition-all duration-500" style={{ width: `${extraPct}%` }} />
          )}
          <div className="bg-emerald-500/40 h-full rounded-r-full flex-1 transition-all duration-500" />
        </div>

        {/* Allocation legend */}
        <div className={cn('grid gap-4', simActive ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3')}>
          {[
            { label: 'Loan payments',      value: kpi.monthlyLoans,     pct: dtiPct,   color: 'text-rose-400',    dot: 'bg-rose-500',       sub: 'DTI ratio'   },
            { label: 'Recurring expenses', value: kpi.monthlyRecurring, pct: recurPct, color: 'text-yellow-400',   dot: 'bg-yellow-500',      sub: 'Fixed costs' },
            ...(simActive ? [
              { label: 'Simulated income', value: extraTotalMXN,        pct: extraPct, color: 'text-yellow-300',   dot: 'bg-yellow-400/50',   sub: `${extraSources.length} source${extraSources.length > 1 ? 's' : ''}` },
            ] : []),
            { label: 'Free / savings',     value: Math.max(0, adjCashFlow), pct: freePct, color: 'text-emerald-400', dot: 'bg-emerald-500/40', sub: 'Available'   },
          ].map(({ label, value, pct, color, dot, sub }) => (
            <div key={label} className="flex items-start gap-2">
              <div className={cn('w-2 h-2 rounded-full mt-1 flex-shrink-0', dot)} />
              <div>
                <p className="text-[10px] text-white/35">{label}</p>
                <p className={cn('text-sm font-bold mt-0.5', color)}>{fmtMXN(value)}</p>
                <p className="text-[9px] text-white/20">{pct.toFixed(1)}% · {sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* YTD row */}
        <div className="mt-4 pt-4 border-t border-white/[0.04] grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'YTD Income received', value: kpi.ytdIncomeActual, color: 'text-emerald-400' },
            { label: 'YTD Loans paid',       value: kpi.ytdLoansPaid,   color: 'text-rose-400'   },
            { label: 'YTD Recurring',         value: kpi.ytdRecurring,   color: 'text-yellow-400'  },
            { label: 'YTD Net flow',          value: kpi.ytdNetFlow,     color: kpi.ytdNetFlow >= 0 ? 'text-emerald-400' : 'text-rose-400' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-[10px] text-white/25">{label}</p>
              <p className={cn('text-base font-bold mt-0.5', color)}>
                {value < 0 ? '-' : ''}{fmtMXN(Math.abs(value))}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Credit Payment Overview + Simulator ─────────────────────────────── */}
      <CreditPaymentOverview
        monthlyIncomeMXN={kpi.monthlyIncomeNet}
        extraSources={extraSources}
        onExtraSourcesChange={setExtraSources}
        onProjection={setSimProjection}
      />

      {/* ── Monthly Breakdown ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.08em]">Monthly Breakdown</h3>
            {simActive && (
              <p className="text-[10px] text-yellow-400/50 mt-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Current month reflects simulation
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear(y => Math.max(minYear, y - 1))}
              disabled={year <= minYear}
              className="p-2 rounded-lg border border-white/[0.06] bg-[#0a0d14]/60 hover:border-white/[0.12] transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 text-white/50" />
            </button>
            <span className="text-lg font-bold text-white w-16 text-center">{year}</span>
            <button
              onClick={() => setYear(y => Math.min(maxYear, y + 1))}
              disabled={year >= maxYear}
              className="p-2 rounded-lg border border-white/[0.06] bg-[#0a0d14]/60 hover:border-white/[0.12] transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-3 px-5 py-2">
          <div className="w-20 flex-shrink-0">
            <span className="text-[10px] text-white/20 uppercase tracking-wider">Month</span>
          </div>
          {[
            { icon: TrendingUp, label: 'Income',    color: 'text-emerald-400/30' },
            { icon: Landmark,   label: 'Loans',     color: 'text-rose-400/30'   },
            { icon: Repeat2,    label: 'Recurring', color: 'text-yellow-400/30'  },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex-1">
              <span className={cn('text-[10px] text-white/20 uppercase tracking-wider flex items-center gap-1', color)}>
                <Icon className="w-3 h-3" /> {label}
              </span>
            </div>
          ))}
          <div className="w-32 flex-shrink-0 text-right">
            <span className="text-[10px] text-white/20 uppercase tracking-wider">Net Flow</span>
          </div>
          {simActive && (
            <div className="w-36 flex-shrink-0 text-right">
              <span className="text-[10px] text-yellow-400/40 uppercase tracking-wider flex items-center justify-end gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Freed (sim)
              </span>
            </div>
          )}
          <div className="w-6" />
        </div>

        {yearPeriods.length === 0 ? (
          <div className="rounded-xl border border-white/[0.05] py-16 text-center text-white/20 text-sm">
            No data for {year}
          </div>
        ) : (
          <div className="space-y-2">
            {yearPeriods.map(period => {
              const row = monthMap[period]
              if (!row) return null
              return (
                <MonthRowUI
                  key={period}
                  row={row}
                  isCurrent={period === meta.curPeriod}
                  extraIncomeMXN={period === meta.curPeriod ? extraTotalMXN : 0}
                  extraSources={period === meta.curPeriod ? extraSources : []}
                  projection={projectionByPeriod[period] ?? null}
                  simActive={simActive}
                />
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
