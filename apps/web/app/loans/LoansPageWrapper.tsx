'use client'

import { useState, useMemo } from 'react'
import { LayoutGrid, Table2, DollarSign, TrendingDown, Info } from 'lucide-react'
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
  const summary = useMemo(() => {
    const byCurrency: Record<string, number> = {}
    for (const loan of loans) {
      // Only count loans that still have scheduled payments
      const hasScheduled = loan.payments.some(
        (p: any) => p.status === 'scheduled' || p.status === 'partial'
      )
      if (!hasScheduled) continue
      const cur = loan.currency as string
      byCurrency[cur] = (byCurrency[cur] ?? 0) + loan.monthlyPayment
    }
    return byCurrency
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
    <div className="glass rounded-2xl p-5 border border-white/[0.06]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white/80">Payment Summary</h3>
          <p className="text-xs text-white/30 mt-0.5">Active loans · monthly &amp; yearly totals</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/25">
          <Info className="w-3 h-3" />
          <span>FX rates approximate</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Per-currency breakdown */}
        {currencies.map(cur => (
          <div
            key={cur}
            className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4"
          >
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
        <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-violet-300/70 uppercase tracking-widest">
              Total · USD
            </span>
            <DollarSign className="w-3.5 h-3.5 text-violet-400/60" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-white/30">Monthly</span>
              <span className="text-base font-bold text-violet-300 tabular-nums">
                {fmtUSD(totalUSDMonthly)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-white/30">Yearly</span>
              <span className="text-sm font-semibold text-violet-300/60 tabular-nums">
                {fmtUSD(totalUSDMonthly * 12)}
              </span>
            </div>
            {fxNote && (
              <div className="pt-2 border-t border-violet-500/10">
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

export function LoansPageWrapper({ loans }: Props) {
  const [view, setView] = useState<'card' | 'table'>('card')

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <LoanSummary loans={loans} />

      {/* View toggle */}
      <div className="flex justify-end">
        <div className="inline-flex items-center glass rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setView('card')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              view === 'card'
                ? 'bg-violet-500/20 text-violet-300'
                : 'text-white/40 hover:text-white/70'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards
          </button>
          <button
            onClick={() => setView('table')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              view === 'table'
                ? 'bg-violet-500/20 text-violet-300'
                : 'text-white/40 hover:text-white/70'
            )}
          >
            <Table2 className="w-3.5 h-3.5" />
            Table
          </button>
        </div>
      </div>

      {view === 'card'
        ? <LoansClient initialLoans={loans} />
        : <LoansTable loans={loans} />
      }
    </div>
  )
}
