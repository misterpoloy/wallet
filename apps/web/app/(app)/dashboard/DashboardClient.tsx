'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Wallet, CreditCard, ShieldCheck, TrendingDown, ArrowUpRight } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { GlassCard } from '@/components/ui/GlassCard'
import { TransactionRow } from '@/components/ui/TransactionRow'
import { SpendingChart } from '@/components/charts/SpendingChart'
import { CategoryDonut } from '@/components/charts/CategoryDonut'
import { PeriodSelector, type PeriodState } from '@/components/dashboard/PeriodSelector'
import { AccountSummaryCard } from '@/components/dashboard/AccountSummaryCard'
import { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'
import { api, type DashboardData } from '@/lib/api-client'
import { formatMoneyCompact, formatMoney, cn } from '@/lib/utils'

// ─── constants ────────────────────────────────────────────────────────────────
const CURRENT_YEAR = 2026
const CURRENT_MONTH = 5 // 0-indexed (May = 4, June = 5)
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─── helpers ─────────────────────────────────────────────────────────────────

function pct(current: number, reference: number) {
  if (!reference) return 0
  return Math.round(((current - reference) / reference) * 100 * 10) / 10
}

function periodLabel(state: PeriodState): string {
  if (state.mode === 'prev-month') return `vs ${MONTH_NAMES[CURRENT_MONTH - 1]} ${CURRENT_YEAR}`
  if (state.mode === 'custom-month') return `vs ${MONTH_NAMES[state.customMonth]} ${state.customYear}`
  return `${state.viewYear} vs ${state.compareYear}`
}

// Build month-keyed lookup from monthlySeries: { '2026-5': 29900, ... }
function buildMonthMap(series: DashboardData['monthlySeries']) {
  const map: Record<string, number> = {}
  series.forEach((r) => { map[`${r.year}-${r.month - 1}`] = r.total }) // API month is 1-indexed
  return map
}

// Build year-mode chart data from monthly series
function buildYearChartData(
  series: DashboardData['monthlySeries'],
  viewYear: number,
  compareYear: number
) {
  const byYearMonth: Record<number, Record<number, number>> = {}
  series.forEach((r) => {
    if (!byYearMonth[r.year]) byYearMonth[r.year] = {}
    byYearMonth[r.year][r.month - 1] = r.total // convert to 0-indexed
  })
  return MONTH_NAMES.map((month, i) => ({
    month,
    [`${viewYear}`]: byYearMonth[viewYear]?.[i] ?? null,
    [`${compareYear}`]: byYearMonth[compareYear]?.[i] ?? null,
  }))
}

// Build category chart data for prev/custom month comparison
function buildCategoryChartData(
  currentCategories: DashboardData['spendingByCategory'],
  refCategories: DashboardData['spendingByCategory'] | null,
  currentLabel: string,
  refLabel: string
) {
  const cats = currentCategories.slice(0, 6)
  const refMap: Record<string, number> = {}
  refCategories?.forEach((c) => { refMap[c.category] = c.total })
  return cats.map((c) => ({
    category: c.category.split(',')[0].split(' ')[0], // short label
    [currentLabel]: Math.round(c.total),
    [refLabel]: Math.round(refMap[c.category] ?? 0),
  }))
}

// ─── component ────────────────────────────────────────────────────────────────

export function DashboardClient() {
  const [period, setPeriod] = useState<PeriodState>({
    mode: 'prev-month',
    customYear: CURRENT_YEAR,
    customMonth: CURRENT_MONTH - 1,
    viewYear: CURRENT_YEAR,
    compareYear: CURRENT_YEAR - 1,
  })

  const [dashData, setDashData] = useState<DashboardData | null>(null)
  const [refDashData, setRefDashData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch current month dashboard data once
  useEffect(() => {
    api.dashboard({ year: CURRENT_YEAR, month: CURRENT_MONTH })
      .then(setDashData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Fetch reference period data when period changes
  const fetchRefData = useCallback(async (p: PeriodState) => {
    try {
      if (p.mode === 'prev-month') {
        setRefDashData(await api.dashboard({ year: CURRENT_YEAR, month: CURRENT_MONTH - 1 }))
      } else if (p.mode === 'custom-month') {
        setRefDashData(await api.dashboard({ year: p.customYear, month: p.customMonth }))
      } else {
        // Year mode: fetch compare year data
        setRefDashData(await api.dashboard({ year: p.compareYear, month: 11 }))
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => { fetchRefData(period) }, [period, fetchRefData])

  // ── Derived values ──────────────────────────────────────────────────────────
  const kpi = dashData?.kpi
  const monthMap = useMemo(() => buildMonthMap(dashData?.monthlySeries ?? []), [dashData])

  const currentSpend = useMemo(() => {
    if (!dashData) return 0
    if (period.mode === 'year') {
      const ydata = dashData.monthlySeries.filter((r) => r.year === period.viewYear)
      return ydata.reduce((s, r) => s + r.total, 0)
    }
    return kpi?.monthSpendMXN ?? 0
  }, [dashData, period, kpi])

  const refSpend = useMemo(() => {
    if (!refDashData) return 0
    if (period.mode === 'year') {
      const ydata = refDashData.monthlySeries.filter((r) => r.year === period.compareYear)
      return ydata.reduce((s, r) => s + r.total, 0)
    }
    return refDashData.kpi.monthSpendMXN
  }, [refDashData, period])

  const spendTrend = pct(currentSpend, refSpend)

  // ── Chart data ──────────────────────────────────────────────────────────────
  const { chartData, primaryLabel, compareLabel, chartTitle, chartSub } = useMemo(() => {
    if (!dashData) return { chartData: [], primaryLabel: '', compareLabel: '', chartTitle: '', chartSub: '' }

    if (period.mode === 'year') {
      return {
        chartData: buildYearChartData(dashData.monthlySeries, period.viewYear, period.compareYear),
        primaryLabel: String(period.viewYear),
        compareLabel: String(period.compareYear),
        chartTitle: `${period.viewYear} vs ${period.compareYear} — Full year`,
        chartSub: 'MXN · monthly total',
      }
    }

    const curLabel = period.mode === 'prev-month'
      ? MONTH_NAMES[CURRENT_MONTH]
      : `${MONTH_NAMES[CURRENT_MONTH]} '${String(CURRENT_YEAR).slice(2)}`
    const refLabel = period.mode === 'prev-month'
      ? MONTH_NAMES[CURRENT_MONTH - 1]
      : `${MONTH_NAMES[period.customMonth]} '${String(period.customYear).slice(2)}`

    return {
      chartData: buildCategoryChartData(
        dashData.spendingByCategory,
        refDashData?.spendingByCategory ?? null,
        curLabel,
        refLabel
      ),
      primaryLabel: curLabel,
      compareLabel: refLabel,
      chartTitle: `${curLabel} vs ${refLabel}`,
      chartSub: 'By spending category · MXN',
    }
  }, [dashData, refDashData, period])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-7">
      {/* Header + period selector */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <PeriodSelector state={period} onChange={setPeriod} />
          <div className="border border-white/[0.06] bg-[#0a0d14]/60 backdrop-blur-xl flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/25 w-40 cursor-pointer hover:border-white/[0.10] transition-colors">
            <span className="text-[11px]">⌘K Search…</span>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              label="Credit Used"
              value={formatMoneyCompact({ amount: kpi?.creditUsedMXN ?? 0, currency: 'MXN' })}
              subValue={`${kpi?.creditUsagePct ?? 0}% of limit`}
              icon={CreditCard}
              iconColor="text-rose-400"
            />
            <StatCard
              label="Credit Remaining"
              value={formatMoneyCompact({ amount: kpi?.creditRemainingMXN ?? 0, currency: 'MXN' })}
              subValue={`${100 - (kpi?.creditUsagePct ?? 0)}% free`}
              icon={ShieldCheck}
              iconColor="text-emerald-400"
            />
            <StatCard
              label="GTQ Balance"
              value={formatMoneyCompact({ amount: kpi?.gtqBalance ?? 0, currency: 'GTQ' })}
              subValue="BI Guatemala"
              icon={TrendingDown}
              iconColor="text-sky-400"
            />
            <StatCard
              label={period.mode === 'year' ? 'YTD Spend' : 'Month Spend'}
              value={formatMoneyCompact({ amount: currentSpend, currency: 'MXN' })}
              subValue={periodLabel(period)}
              icon={ArrowUpRight}
              iconColor={spendTrend <= 0 ? 'text-emerald-400' : 'text-rose-400'}
              trend={refSpend > 0 ? { value: spendTrend, label: periodLabel(period) } : undefined}
            />
          </>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — chart + transactions */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard>
            <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-semibold text-white">{chartTitle || '…'}</h2>
                <p className="text-xs text-white/40 mt-0.5">{chartSub}</p>
              </div>
              <div className="flex gap-3 text-[10px] text-white/40 flex-shrink-0">
                {primaryLabel && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{primaryLabel}
                  </span>
                )}
                {compareLabel && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block opacity-60" />{compareLabel}
                  </span>
                )}
              </div>
            </div>

            {refSpend > 0 && (
              <div className={cn(
                'flex items-center gap-2 mb-4 text-xs px-3 py-2 rounded-xl',
                spendTrend <= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              )}>
                <span className="font-semibold">
                  {spendTrend >= 0 ? '▲' : '▼'} {Math.abs(spendTrend)}%
                </span>
                <span className="text-white/50">{periodLabel(period)}</span>
                <span className="ml-auto text-white/30">
                  {formatMoneyCompact({ amount: currentSpend, currency: 'MXN' })} vs {formatMoneyCompact({ amount: refSpend, currency: 'MXN' })}
                </span>
              </div>
            )}

            {loading ? (
              <div className="h-48 animate-pulse rounded-xl bg-white/[0.04]" />
            ) : (
              <SpendingChart
                mode={period.mode}
                data={chartData}
                primaryLabel={primaryLabel}
                compareLabel={compareLabel}
              />
            )}
          </GlassCard>

          {/* Recent transactions */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Recent Transactions</h2>
              <a href="/transactions" className="text-[11px] text-amber-400/70 hover:text-amber-300 transition-colors">
                View all →
              </a>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : dashData?.recentTransactions.length === 0
                  ? <p className="text-sm text-white/30 py-8 text-center">No transactions yet — import your CSV to get started</p>
                  : dashData?.recentTransactions.map((tx) => (
                      <TransactionRow key={tx.id} transaction={tx} />
                    ))
              }
            </div>
          </GlassCard>
        </div>

        {/* Right col */}
        <div className="space-y-6">
          <GlassCard>
            <h2 className="text-sm font-semibold text-white mb-4">Spending by Category</h2>
            {loading
              ? <div className="h-28 animate-pulse rounded-xl bg-white/[0.04]" />
              : <CategoryDonut data={dashData?.spendingByCategory ?? []} currency="MXN" />
            }
          </GlassCard>

          {loading
            ? <SkeletonCard className="h-64" />
            : <AccountSummaryCard accounts={dashData?.accounts ?? []} />
          }
        </div>
      </div>
    </div>
  )
}
