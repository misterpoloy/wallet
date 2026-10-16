'use client'

import { useState, useMemo } from 'react'
import { LayoutGrid, Table2, DollarSign, TrendingDown, Info, Eye, EyeOff } from 'lucide-react'
import { LoansClient } from './LoansClient'
import { LoansTable } from './LoansTable'
import { cn } from '@/lib/utils'

type Props = { loans: any[] }

// Approximate FX rates to USD (update manually when needed)
const FX_TO_USD: Record<string, number> = {
  MXN: 1 / 19.2,   // ~0.052
  GTQ: 1 / 7.7,    // ~0.13
  USD: 1,
  EUR: 1.09,
  COP: 1 / 4100,
  TRY: 1 / 32,
  EGP: 1 / 49,
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  MXN: '$', GTQ: 'Q', USD: '$', EUR: '€', COP: '$', TRY: '₺', EGP: '£',
}

function fmtNative(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOLS[currency] ?? ''
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtUSD(amount: number) {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function LoanSummary({ loans }: { loans: any[] }) {
  const { summary, loansByCurrency } = useMemo(() => {
    const byCurrency: Record<string, number> = {}
    const loansBy: Record<string, { name: string; lender: string; monthlyPayment: number }[]> = {}
    for (const loan of loans) {
      const hasScheduled = loan.payments.some(
        (p: any) => p.status === 'scheduled' || p.status === 'partial'
      )
      if (!hasScheduled) continue
      const cur = loan.currency as string
      byCurrency[cur] = (byCurrency[cur] ?? 0) + loan.monthlyPayment
      ;(loansBy[cur] ??= []).push({ name: loan.name, lender: loan.lender, monthlyPayment: loan.monthlyPayment })
    }
    return { summary: byCurrency, loansByCurrency: loansBy }
  }, [loans])

  const totalUSDMonthly = useMemo(
    () =>
      Object.entries(summary).reduce(
        (sum, [cur, monthly]) => sum + monthly * (FX_TO_USD[cur] ?? 0),
        0
      ),
    [summary]
  )

  const currencies = Object.keys(summary)
  if (currencies.length === 0) return null

  const fxNote = currencies
    .filter(c => c !== 'USD')
    .map(c => {
      const rate = FX_TO_USD[c]
      return `${c} ≈ ${(1 / (rate ?? 1)).toFixed(1)}`
    })
    .join(' · ')

  return (
    <div className="rounded-xl bg-[#0a0d14]/80 backdrop-blur-xl border border-white/[0.06] p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white/80">Payment Summary</h3>
          <p className="text-xs text-white/30 mt-0.5">Active loans · monthly &amp; yearly totals</p>
        </div>
        <div className="relative group/fx flex items-center gap-1.5 text-[10px] text-white/25 cursor-help">
          <Info className="w-3 h-3" />
          <span>FX rates approximate</span>
          {/* Conversion breakdown tooltip */}
          <div className="absolute right-0 top-full mt-2 z-50 hidden group-hover/fx:block pointer-events-none">
            <div className="bg-[#0d1017] border border-white/[0.10] rounded-xl px-4 py-3.5 w-80 shadow-2xl">
              <p className="text-[11px] font-semibold text-white/60 mb-2.5 uppercase tracking-wider">USD Conversion Breakdown</p>
              <div className="space-y-1.5">
                {currencies.map(cur => {
                  const monthly = summary[cur]
                  const rate = FX_TO_USD[cur] ?? 0
                  const usd = monthly * rate
                  const sym = CURRENCY_SYMBOLS[cur] ?? ''
                  const fmtMonthly = monthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  return (
                    <div key={cur} className="flex items-baseline justify-between text-[11px] tabular-nums">
                      <span className="text-white/40">
                        {sym}{fmtMonthly} {cur} × {cur === 'USD' ? '1' : `(1/${(1/rate).toFixed(1)})`}
                      </span>
                      <span className="text-white/70 font-medium ml-3">
                        = ${usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-baseline justify-between text-[11px]">
                <span className="text-amber-300/60 font-semibold">Total USD / month</span>
                <span className="text-amber-300 font-bold tabular-nums">
                  ${totalUSDMonthly.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Per-currency breakdown */}
        {currencies.map(cur => (
          <div
            key={cur}
            className="relative group/cur rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 cursor-help"
          >
            {/* Per-loan breakdown tooltip */}
            <div className="absolute left-0 bottom-full mb-2 z-50 hidden group-hover/cur:block pointer-events-none">
              <div className="bg-[#0d1017] border border-white/[0.10] rounded-xl px-4 py-3.5 w-72 shadow-2xl">
                <p className="text-[11px] font-semibold text-white/60 mb-2.5 uppercase tracking-wider">{cur} Loans Breakdown</p>
                <div className="space-y-2">
                  {(loansByCurrency[cur] ?? []).map((loan, i) => (
                    <div key={i} className="flex items-baseline justify-between text-[11px]">
                      <div className="text-white/40 truncate mr-3">
                        <span className="text-white/60 font-medium">{loan.name}</span>
                        <span className="text-white/25 ml-1">· {loan.lender}</span>
                      </div>
                      <span className="text-white/70 font-medium tabular-nums flex-shrink-0">
                        {fmtNative(loan.monthlyPayment, cur)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-baseline justify-between text-[11px]">
                  <span className="text-white/50 font-semibold">Total {cur} / month</span>
                  <span className="text-white font-bold tabular-nums">{fmtNative(summary[cur], cur)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">
                {cur}
              </span>
              <TrendingDown className="w-3.5 h-3.5 text-rose-400/60" />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-white/30">Monthly</span>
                <span className="text-base font-bold text-white tabular-nums">
                  {fmtNative(summary[cur], cur)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-white/30">Yearly</span>
                <span className="text-sm font-semibold text-white/60 tabular-nums">
                  {fmtNative(summary[cur] * 12, cur)}
                </span>
              </div>
              {cur !== 'USD' && (
                <div className="pt-2 border-t border-white/[0.05] flex items-baseline justify-between">
                  <span className="text-[10px] text-white/25">≈ USD / mo</span>
                  <span className="text-xs font-semibold text-emerald-400/80 tabular-nums">
                    {fmtUSD(summary[cur] * (FX_TO_USD[cur] ?? 0))}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* USD total */}
        <div className="relative group/total rounded-xl bg-amber-400/[0.06] border border-amber-400/20 p-4 cursor-help">
          {/* Total equivalents tooltip */}
          <div className="absolute left-0 bottom-full mb-2 z-50 hidden group-hover/total:block pointer-events-none">
            <div className="bg-[#0d1017] border border-white/[0.10] rounded-xl px-4 py-3.5 w-80 shadow-2xl">
              <p className="text-[11px] font-semibold text-white/60 mb-2.5 uppercase tracking-wider">Total in All Currencies</p>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between text-[11px] tabular-nums">
                  <span className="text-amber-300/60 font-medium">USD (base)</span>
                  <span className="text-amber-300 font-bold">{fmtUSD(totalUSDMonthly)} /mo · {fmtUSD(totalUSDMonthly * 12)} /yr</span>
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/[0.08] space-y-1.5">
                {currencies.filter(c => c !== 'USD').map(cur => {
                  const rate = FX_TO_USD[cur] ?? 0
                  const perUnit = rate > 0 ? 1 / rate : 0
                  const eqMonthly = totalUSDMonthly * perUnit
                  const eqYearly = totalUSDMonthly * 12 * perUnit
                  return (
                    <div key={cur} className="flex items-baseline justify-between text-[11px] tabular-nums">
                      <span className="text-white/40">
                        ≈ {cur} <span className="text-white/25">(×{perUnit.toFixed(1)})</span>
                      </span>
                      <span className="text-white/70 font-medium">
                        {fmtNative(eqMonthly, cur)} /mo · {fmtNative(eqYearly, cur)} /yr
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-amber-300/70 uppercase tracking-widest">
              Total · USD
            </span>
            <DollarSign className="w-3.5 h-3.5 text-amber-400/60" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-white/30">Monthly</span>
              <span className="text-base font-bold text-amber-300 tabular-nums">
                {fmtUSD(totalUSDMonthly)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-white/30">Yearly</span>
              <span className="text-sm font-semibold text-amber-300/60 tabular-nums">
                {fmtUSD(totalUSDMonthly * 12)}
              </span>
            </div>
            {fxNote && (
              <div className="pt-2 border-t border-amber-400/[0.08]">
                <p className="text-[9px] text-white/20 leading-snug">
                  {fxNote} per USD
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function isLoanCompleted(loan: any): boolean {
  return !loan.payments.some((p: any) => p.status === 'scheduled' || p.status === 'partial')
}

export function LoansPageWrapper({ loans }: Props) {
  const [view, setView] = useState<'card' | 'table'>('card')
  const [hideCompleted, setHideCompleted] = useState(true)

  const completedCount = useMemo(() => loans.filter(isLoanCompleted).length, [loans])
  const filteredLoans = useMemo(
    () => hideCompleted ? loans.filter(l => !isLoanCompleted(l)) : loans,
    [loans, hideCompleted]
  )

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <LoanSummary loans={loans} />

      {/* View toggle + filter */}
      <div className="flex items-center justify-between">
        {completedCount > 0 && (
          <button
            onClick={() => setHideCompleted(h => !h)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
              hideCompleted
                ? 'border-white/[0.06] bg-[#0a0d14]/60 text-white/35 hover:text-white/70 hover:bg-white/[0.04]'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
            )}
          >
            {hideCompleted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {hideCompleted ? `Show completed (${completedCount})` : `Showing all`}
          </button>
        )}
        <div className="inline-flex items-center border border-white/[0.06] bg-[#0a0d14]/60 backdrop-blur-xl rounded-lg p-1 gap-0.5 ml-auto">
          <button
            onClick={() => setView('card')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              view === 'card'
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/25'
                : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards
          </button>
          <button
            onClick={() => setView('table')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
              view === 'table'
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/25'
                : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]'
            )}
          >
            <Table2 className="w-3.5 h-3.5" />
            Table
          </button>
        </div>
      </div>

      {view === 'card'
        ? <LoansClient initialLoans={filteredLoans} />
        : <LoansTable loans={filteredLoans} />
      }
    </div>
  )
}
