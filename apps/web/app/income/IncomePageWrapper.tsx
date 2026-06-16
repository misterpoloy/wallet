'use client'

import { useState, useMemo } from 'react'
import { LayoutGrid, Table2, ChevronLeft, ChevronRight, TrendingUp, DollarSign, Info } from 'lucide-react'
import { IncomeClient } from './IncomeClient'
import { IncomeTable } from './IncomeTable'
import { cn } from '@/lib/utils'

type Props = { sources: any[] }

// ── FX rates (approximate, update manually) ──────────────────────────────────
const FX_TO_USD: Record<string, number> = {
  MXN: 1 / 19.2,
  GTQ: 1 / 7.7,
  USD: 1,
  EUR: 1.09,
  COP: 1 / 4100,
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  MXN: '$', GTQ: 'Q', USD: '$', EUR: '€', COP: '$',
}

// Frequency → monthly multiplier
const FREQ_MULT: Record<string, number> = {
  weekly:       52 / 12,
  biweekly:     26 / 12,
  semimonthly:  2,        // quincenal: 24 payments/year = 2/month
  monthly:      1,
  quarterly:    1 / 3,
  annual:       1 / 12,
}

function fmtNative(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOLS[currency] ?? ''
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtUSD(amount: number) {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ── Income summary panel ─────────────────────────────────────────────────────
function IncomeSummary({ sources }: { sources: any[] }) {
  // Monthly net per currency (active sources only)
  const summary = useMemo(() => {
    const byCurrency: Record<string, { net: number; gross: number }> = {}
    for (const s of sources) {
      if (!s.isActive) continue
      const mult = FREQ_MULT[s.frequency as string] ?? 1
      const cur  = s.currency as string
      if (!byCurrency[cur]) byCurrency[cur] = { net: 0, gross: 0 }
      byCurrency[cur].net   += (s.netAmount ?? s.grossAmount) * mult
      byCurrency[cur].gross += s.grossAmount * mult
    }
    return byCurrency
  }, [sources])

  const totalUSDMonthly = useMemo(
    () =>
      Object.entries(summary).reduce(
        (sum, [cur, v]) => sum + v.net * (FX_TO_USD[cur] ?? 0),
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
          <h3 className="text-sm font-semibold text-white/80">Income Summary</h3>
          <p className="text-xs text-white/30 mt-0.5">Active sources · monthly &amp; yearly totals</p>
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
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400/60" />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-white/30">Monthly</span>
                <span className="text-base font-bold text-white tabular-nums">
                  {fmtNative(summary[cur].net, cur)}
                </span>
              </div>
              {summary[cur].net !== summary[cur].gross && (
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-white/25">Gross</span>
                  <span className="text-xs text-white/35 tabular-nums">
                    {fmtNative(summary[cur].gross, cur)}
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-white/30">Yearly</span>
                <span className="text-sm font-semibold text-white/60 tabular-nums">
                  {fmtNative(summary[cur].net * 12, cur)}
                </span>
              </div>
              {cur !== 'USD' && (
                <div className="pt-2 border-t border-white/[0.05] flex items-baseline justify-between">
                  <span className="text-[10px] text-white/25">≈ USD / mo</span>
                  <span className="text-xs font-semibold text-emerald-400/80 tabular-nums">
                    {fmtUSD(summary[cur].net * (FX_TO_USD[cur] ?? 0))}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Total USD */}
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-emerald-300/70 uppercase tracking-widest">
              Total · USD
            </span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400/60" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-white/30">Monthly</span>
              <span className="text-base font-bold text-emerald-300 tabular-nums">
                {fmtUSD(totalUSDMonthly)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-white/30">Yearly</span>
              <span className="text-sm font-semibold text-emerald-300/60 tabular-nums">
                {fmtUSD(totalUSDMonthly * 12)}
              </span>
            </div>
            {fxNote && (
              <div className="pt-2 border-t border-emerald-500/10">
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

// ── Page wrapper ─────────────────────────────────────────────────────────────
export function IncomePageWrapper({ sources }: Props) {
  const [view, setView] = useState<'card' | 'table'>('card')

  return (
    <div className="space-y-4">
      {/* Summary panel */}
      <IncomeSummary sources={sources} />

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
        ? <IncomeClient initialSources={sources} />
        : <IncomeTableWrapper sources={sources} />
      }
    </div>
  )
}

// ── Table wrapper (year selector lives here for table view) ──────────────────
function IncomeTableWrapper({ sources }: { sources: any[] }) {
  const [year, setYear] = useState(new Date().getFullYear())
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setYear(y => y - 1)}
          className="p-2 rounded-xl glass hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-white/60" />
        </button>
        <span className="text-lg font-bold text-white w-16 text-center">{year}</span>
        <button
          onClick={() => setYear(y => y + 1)}
          disabled={year >= new Date().getFullYear()}
          className="p-2 rounded-xl glass hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4 text-white/60" />
        </button>
      </div>
      <IncomeTable sources={sources} year={year} />
    </div>
  )
}
