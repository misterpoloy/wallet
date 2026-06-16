'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Landmark, Repeat2, Wallet,
  ArrowUpRight, ArrowDownRight, Minus, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MonthRow } from './page'

// ── Formatters ─────────────────────────────────────────────────────────────
function fmtMXN(n: number, compact = false) {
  if (compact && Math.abs(n) >= 1_000) {
    return `$${(n / 1_000).toFixed(1)}k`
  }
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function sign(n: number) { return n >= 0 ? '+' : '-' }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function periodLabel(p: string) {
  const [y, m] = p.split('-').map(Number)
  return { month: MONTHS[m - 1], year: y, short: `${MONTHS[m - 1]} ${y}` }
}

// ── Status dot ─────────────────────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  received:  'bg-emerald-400',
  paid:      'bg-emerald-400',
  partial:   'bg-amber-400',
  expected:  'bg-white/20',
  scheduled: 'bg-white/20',
  missed:    'bg-rose-400',
  skipped:   'bg-white/10',
}

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

// ── KPI card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub: string; color: string; icon: React.ElementType
}) {
  return (
    <div className="glass rounded-2xl p-5 border border-white/[0.06]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">{label}</span>
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-[11px] text-white/30 mt-1">{sub}</p>
    </div>
  )
}

// ── Expandable row ─────────────────────────────────────────────────────────
function MonthRowUI({ row, isCurrent }: { row: MonthRow; isCurrent: boolean }) {
  const [open, setOpen] = useState(isCurrent)
  const lbl = periodLabel(row.period)

  const cashFlow = row.projectedMXN   // net income - loans - recurring
  const isPositive = cashFlow >= 0

  return (
    <div className={cn(
      'rounded-2xl border transition-all',
      isCurrent
        ? 'border-violet-500/30 bg-violet-500/[0.04]'
        : 'border-white/[0.06] bg-white/[0.02]'
    )}>
      {/* Summary row — always visible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors rounded-2xl"
      >
        {/* Month label */}
        <div className="w-20 flex-shrink-0">
          <p className={cn('text-sm font-bold', isCurrent ? 'text-violet-300' : 'text-white/80')}>
            {lbl.month}
          </p>
          <p className="text-[10px] text-white/30">{lbl.year}</p>
        </div>

        {/* Income */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Income</p>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-emerald-400/60 flex-shrink-0" />
            <span className="text-sm font-semibold text-emerald-400 tabular-nums">
              {row.income.totalActualMXN > 0
                ? fmtMXN(row.income.totalActualMXN)
                : row.income.totalNetMXN > 0
                  ? `≈${fmtMXN(row.income.totalNetMXN)}`
                  : '—'}
            </span>
            {row.income.totalActualMXN === 0 && row.income.totalNetMXN > 0 && (
              <span className="text-[9px] text-white/20">projected</span>
            )}
          </div>
        </div>

        {/* Loans */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Loans</p>
          <div className="flex items-center gap-1.5">
            <Landmark className="w-3 h-3 text-rose-400/60 flex-shrink-0" />
            <span className="text-sm font-semibold text-rose-400 tabular-nums">
              {row.loans.totalMXN > 0 ? `-${fmtMXN(row.loans.totalMXN)}` : '—'}
            </span>
          </div>
        </div>

        {/* Recurring */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Recurring</p>
          <div className="flex items-center gap-1.5">
            <Repeat2 className="w-3 h-3 text-amber-400/60 flex-shrink-0" />
            <span className="text-sm font-semibold text-amber-400 tabular-nums">
              {row.recurring.totalMXN > 0 ? `-${fmtMXN(row.recurring.totalMXN)}` : '—'}
            </span>
          </div>
        </div>

        {/* Net cash flow */}
        <div className="w-32 flex-shrink-0 text-right">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Net Flow</p>
          <div className="flex items-center justify-end gap-1">
            {isPositive
              ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
            <span className={cn(
              'text-sm font-bold tabular-nums',
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            )}>
              {sign(cashFlow)}{fmtMXN(cashFlow)}
            </span>
          </div>
        </div>

        {/* Expand toggle */}
        <div className="w-6 flex-shrink-0 text-white/20">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/[0.05] pt-4">

          {/* Income detail */}
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" /> Income
            </p>
            {row.income.items.length === 0 ? (
              <p className="text-xs text-white/20 italic">No income tracked this month</p>
            ) : row.income.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[item.status] ?? 'bg-white/20')} />
                  <Link href={`/income/${item.sourceId}`} className="text-xs text-white/70 hover:text-violet-300 transition-colors truncate">
                    {item.name}
                  </Link>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-xs font-semibold text-emerald-400 tabular-nums">
                    {item.actualMXN != null ? fmtMXN(item.actualMXN) : `≈${fmtMXN(item.netMXN)}`}
                  </p>
                  {item.currency !== 'MXN' && (
                    <p className="text-[9px] text-white/20">{item.currency}</p>
                  )}
                </div>
              </div>
            ))}
            {row.income.items.length > 0 && (
              <div className="flex justify-between pt-2 mt-1">
                <span className="text-[10px] text-white/30">Net monthly</span>
                <span className="text-xs font-bold text-white tabular-nums">{fmtMXN(row.income.totalNetMXN)}</span>
              </div>
            )}
          </div>

          {/* Loans detail */}
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Landmark className="w-3 h-3" /> Loan Payments
            </p>
            {row.loans.items.length === 0 ? (
              <p className="text-xs text-white/20 italic">No loan payments this month</p>
            ) : row.loans.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_DOT[item.status] ?? 'bg-white/20')} />
                  <Link href={`/loans/${item.loanId}`} className="text-xs text-white/70 hover:text-violet-300 transition-colors truncate">
                    {item.name}
                  </Link>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-xs font-semibold text-rose-400 tabular-nums">
                    -{fmtMXN(item.amountMXN)}
                  </p>
                  {item.currency !== 'MXN' && (
                    <p className="text-[9px] text-white/20">
                      {item.currency} {item.amountNative.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {row.loans.items.length > 0 && (
              <div className="flex justify-between pt-2 mt-1">
                <span className="text-[10px] text-white/30">Total payments</span>
                <span className="text-xs font-bold text-rose-400 tabular-nums">-{fmtMXN(row.loans.totalMXN)}</span>
              </div>
            )}
          </div>

          {/* Recurring detail */}
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Repeat2 className="w-3 h-3" /> Recurring
            </p>
            {row.recurring.items.length === 0 ? (
              <p className="text-xs text-white/20 italic">No recurring expenses</p>
            ) : row.recurring.items.slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="min-w-0">
                  <p className="text-xs text-white/70 truncate">{item.name}</p>
                  <p className="text-[9px] text-white/25">{item.category}</p>
                </div>
                <p className="text-xs font-semibold text-amber-400 tabular-nums flex-shrink-0 ml-2">
                  -{fmtMXN(item.amountMXN)}
                </p>
              </div>
            ))}
            {row.recurring.items.length > 8 && (
              <p className="text-[10px] text-white/25 mt-1">+{row.recurring.items.length - 8} more</p>
            )}
            {row.recurring.items.length > 0 && (
              <div className="flex justify-between pt-2 mt-1">
                <span className="text-[10px] text-white/30">Total recurring</span>
                <span className="text-xs font-bold text-amber-400 tabular-nums">-{fmtMXN(row.recurring.totalMXN)}</span>
              </div>
            )}
          </div>

          {/* Cash flow summary bar */}
          <div className="md:col-span-3 mt-2 pt-4 border-t border-white/[0.05]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">Cash Flow Summary</span>
              <div className="flex items-center gap-4">
                <span className="text-white/50">
                  Income <span className="text-emerald-400 font-semibold">
                    {row.income.totalActualMXN > 0 ? fmtMXN(row.income.totalActualMXN) : `≈${fmtMXN(row.income.totalNetMXN)}`}
                  </span>
                </span>
                <span className="text-white/20">−</span>
                <span className="text-white/50">
                  Loans <span className="text-rose-400 font-semibold">{fmtMXN(row.loans.totalMXN)}</span>
                </span>
                <span className="text-white/20">−</span>
                <span className="text-white/50">
                  Recurring <span className="text-amber-400 font-semibold">{fmtMXN(row.recurring.totalMXN)}</span>
                </span>
                <span className="text-white/20">=</span>
                <span className={cn('font-bold text-sm', isPositive ? 'text-emerald-400' : 'text-rose-400')}>
                  {sign(cashFlow)}{fmtMXN(cashFlow)}
                </span>
              </div>
            </div>
            {/* Visual bar */}
            {row.income.totalNetMXN > 0 && (
              <div className="mt-2 h-1.5 rounded-full bg-white/[0.05] overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${Math.min(100, (row.income.totalNetMXN / (row.loans.totalMXN + row.recurring.totalMXN + Math.max(0, cashFlow))) * 100)}%` }}
                />
                <div
                  className="bg-rose-500 h-full"
                  style={{ width: `${(row.loans.totalMXN / (row.income.totalNetMXN)) * 100}%` }}
                />
                <div
                  className="bg-amber-500 h-full"
                  style={{ width: `${(row.recurring.totalMXN / (row.income.totalNetMXN)) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export function OverviewClient({
  monthMap,
  meta,
}: {
  monthMap: Record<string, MonthRow>
  meta: Meta
}) {
  const [year, setYear] = useState(() => new Date().getFullYear())

  // O(1): filter periods to selected year
  const yearPeriods = useMemo(
    () => meta.periods.filter(p => p.startsWith(`${year}-`)),
    [meta.periods, year]
  )

  const minYear = Number(meta.periods[0]?.split('-')[0] ?? year)
  const maxYear = Number(meta.periods[meta.periods.length - 1]?.split('-')[0] ?? year)

  const { kpi } = meta
  const obligationsMonthly = kpi.monthlyLoans + kpi.monthlyRecurring
  const obligationsPct = kpi.monthlyIncomeNet > 0
    ? Math.min(100, (obligationsMonthly / kpi.monthlyIncomeNet) * 100)
    : 0
  const dtiPct = kpi.monthlyIncomeNet > 0
    ? (kpi.monthlyLoans / kpi.monthlyIncomeNet) * 100
    : 0

  return (
    <div className="space-y-6">

      {/* ── Intelligence KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          label="Monthly Income (net)"
          value={`$${Math.round(kpi.monthlyIncomeNet / 1000)}k`}
          sub={`MXN ${kpi.monthlyIncomeNet.toLocaleString('en-US', { maximumFractionDigits: 0 })} take-home`}
          color="text-emerald-400"
        />
        <KpiCard
          icon={Landmark}
          label="Monthly Loan Payments"
          value={`$${Math.round(kpi.monthlyLoans / 1000)}k`}
          sub={`${dtiPct.toFixed(0)}% of net income (DTI)`}
          color="text-rose-400"
        />
        <KpiCard
          icon={Repeat2}
          label="Monthly Recurring"
          value={`$${Math.round(kpi.monthlyRecurring / 1000)}k`}
          sub={`${((kpi.monthlyRecurring / kpi.monthlyIncomeNet) * 100).toFixed(0)}% of net income`}
          color="text-amber-400"
        />
        <KpiCard
          icon={kpi.monthlyCashFlow >= 0 ? Wallet : TrendingDown}
          label="Monthly Net Cash Flow"
          value={`${kpi.monthlyCashFlow >= 0 ? '+' : '-'}$${Math.round(Math.abs(kpi.monthlyCashFlow) / 1000)}k`}
          sub={`After all obligations · ${kpi.monthlyCashFlow >= 0 ? '✓ positive' : '⚠ negative'}`}
          color={kpi.monthlyCashFlow >= 0 ? 'text-violet-400' : 'text-rose-400'}
        />
      </div>

      {/* ── Intelligence bar ──────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 border border-white/[0.06]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white/80">Budget Allocation</h3>
            <p className="text-xs text-white/30 mt-0.5">
              Of your MXN {Math.round(kpi.monthlyIncomeNet).toLocaleString()} net income
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/25">
            <Info className="w-3 h-3" />
            <span>All amounts in MXN · GTQ converted at ×2.49</span>
          </div>
        </div>

        {/* Stacked bar */}
        <div className="h-3 rounded-full overflow-hidden flex gap-0.5 mb-3">
          <div className="bg-rose-500 h-full rounded-l-full transition-all" style={{ width: `${dtiPct}%` }} />
          <div className="bg-amber-500 h-full transition-all"
            style={{ width: `${(kpi.monthlyRecurring / kpi.monthlyIncomeNet) * 100}%` }} />
          <div className="bg-violet-500 h-full rounded-r-full flex-1 transition-all" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Loan payments', value: kpi.monthlyLoans, pct: dtiPct, color: 'text-rose-400', dot: 'bg-rose-500', sub: 'DTI ratio' },
            { label: 'Recurring expenses', value: kpi.monthlyRecurring, pct: (kpi.monthlyRecurring / kpi.monthlyIncomeNet) * 100, color: 'text-amber-400', dot: 'bg-amber-500', sub: 'Fixed costs' },
            { label: 'Remaining / savings', value: Math.max(0, kpi.monthlyCashFlow), pct: Math.max(0, 100 - obligationsPct), color: 'text-violet-400', dot: 'bg-violet-500', sub: 'Available' },
          ].map(({ label, value, pct, color, dot, sub }) => (
            <div key={label} className="flex items-start gap-2">
              <div className={cn('w-2 h-2 rounded-full mt-1 flex-shrink-0', dot)} />
              <div>
                <p className="text-[10px] text-white/40">{label}</p>
                <p className={cn('text-sm font-bold mt-0.5', color)}>{fmtMXN(value)}</p>
                <p className="text-[9px] text-white/25">{pct.toFixed(1)}% · {sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* YTD row */}
        <div className="mt-4 pt-4 border-t border-white/[0.05] grid grid-cols-4 gap-4">
          {[
            { label: 'YTD Income received', value: kpi.ytdIncomeActual, color: 'text-emerald-400' },
            { label: 'YTD Loans paid',       value: kpi.ytdLoansPaid,   color: 'text-rose-400'   },
            { label: 'YTD Recurring',         value: kpi.ytdRecurring,   color: 'text-amber-400'  },
            { label: 'YTD Net flow',          value: kpi.ytdNetFlow,     color: kpi.ytdNetFlow >= 0 ? 'text-violet-400' : 'text-rose-400' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-[10px] text-white/30">{label}</p>
              <p className={cn('text-base font-bold mt-0.5', color)}>
                {value < 0 ? '-' : ''}{fmtMXN(Math.abs(value))}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Monthly table ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Year nav */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Monthly Breakdown</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear(y => Math.max(minYear, y - 1))}
              disabled={year <= minYear}
              className="p-2 rounded-xl glass hover:bg-white/10 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 text-white/60" />
            </button>
            <span className="text-lg font-bold text-white w-16 text-center">{year}</span>
            <button
              onClick={() => setYear(y => Math.min(maxYear, y + 1))}
              disabled={year >= maxYear}
              className="p-2 rounded-xl glass hover:bg-white/10 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-3 px-5 py-2">
          <div className="w-20 flex-shrink-0">
            <span className="text-[10px] text-white/25 uppercase tracking-wider">Month</span>
          </div>
          <div className="flex-1">
            <span className="text-[10px] text-white/25 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400/40" /> Income
            </span>
          </div>
          <div className="flex-1">
            <span className="text-[10px] text-white/25 uppercase tracking-wider flex items-center gap-1">
              <Landmark className="w-3 h-3 text-rose-400/40" /> Loans
            </span>
          </div>
          <div className="flex-1">
            <span className="text-[10px] text-white/25 uppercase tracking-wider flex items-center gap-1">
              <Repeat2 className="w-3 h-3 text-amber-400/40" /> Recurring
            </span>
          </div>
          <div className="w-32 flex-shrink-0 text-right">
            <span className="text-[10px] text-white/25 uppercase tracking-wider">Net Flow</span>
          </div>
          <div className="w-6" />
        </div>

        {yearPeriods.length === 0 ? (
          <div className="glass rounded-2xl py-16 text-center text-white/30 text-sm">
            No data for {year}
          </div>
        ) : (
          <div className="space-y-2">
            {yearPeriods.map(period => {
              // O(1) lookup
              const row = monthMap[period]
              if (!row) return null
              return (
                <MonthRowUI
                  key={period}
                  row={row}
                  isCurrent={period === meta.curPeriod}
                />
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
