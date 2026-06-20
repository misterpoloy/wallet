'use client'

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, TrendingDown, TrendingUp, X, ExternalLink, Calendar, ArrowUpDown } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { TransactionRow } from '@/components/ui/TransactionRow'
import { SkeletonRow } from '@/components/ui/Skeleton'
import { api, toNum, type ApiTransaction, type ApiAccount } from '@/lib/api-client'
import { formatMoneyCompact, cn } from '@/lib/utils'
import { CATEGORY_ICONS } from '@/components/ui/TransactionRow'
import { AddTransactionFAB } from '@/components/ui/AddTransactionFAB'
import { useTimezone } from '@/components/providers/TimezoneProvider'
import { dayKeyInTz } from '@/lib/timezone'

function fmtDayLabel(isoDay: string) {
  const [y, m, d] = isoDay.split('-').map(Number)
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function groupByDate(txs: ApiTransaction[], tz: string) {
  const groups: Record<string, ApiTransaction[]> = {}
  txs.forEach((tx) => {
    const key = dayKeyInTz(tx.date, tz)
    ;(groups[key] ??= []).push(tx)
  })
  return Object.entries(groups).map(([key, txs]) => [fmtDayLabel(key), txs] as [string, ApiTransaction[]])
}

function currentMonthRange(tz: string) {
  const nowLocal = new Date().toLocaleDateString('en-CA', { timeZone: tz })
  const [y, m] = nowLocal.split('-').map(Number)
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to   = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function fmtDateRange(from: string, to: string) {
  const f = new Date(from + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const t = new Date(to   + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${f} – ${t}`
}

// ─── inner component (uses useSearchParams) ───────────────────────────────────

function TransactionsInner() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const tz           = useTimezone()

  // Boot from URL params (e.g. coming from recurring "See transactions" link)
  const initAccount  = searchParams.get('accountId')  ?? 'all'
  const initCategory = searchParams.get('category')   ?? 'all'
  const initQ        = searchParams.get('q')          ?? ''
  const initFrom     = searchParams.get('from')       ?? ''
  const initTo       = searchParams.get('to')         ?? ''
  const initType     = (searchParams.get('type') as 'all' | 'expense' | 'income') ?? 'all'

  const [transactions, setTransactions] = useState<ApiTransaction[]>([])
  const [accounts,     setAccounts]     = useState<ApiAccount[]>([])
  const [total,        setTotal]        = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [page,         setPage]         = useState(1)
  const [hasNext,      setHasNext]      = useState(false)

  const [search,         setSearch]         = useState(initQ)
  const [filterType,     setFilterType]     = useState<'all' | 'expense' | 'income'>(initType)
  const [filterCategory, setFilterCategory] = useState(initCategory)
  const [filterAccount,  setFilterAccount]  = useState(initAccount)
  const [filterFrom,     setFilterFrom]     = useState(initFrom)
  const [filterTo,       setFilterTo]       = useState(initTo)
  const [sortBy,         setSortBy]         = useState<'date' | 'amount'>('date')
  const [sortOrder,      setSortOrder]      = useState<'desc' | 'asc'>('desc')
  const [showFilters,    setShowFilters]    = useState(
    !!(initAccount !== 'all' || initCategory !== 'all' || initQ || initFrom)
  )

  // Whether this view was linked from an external context (recurring, etc.)
  const isLinked   = !!(initAccount !== 'all' || initCategory !== 'all' || initFrom)
  const linkedLabel = searchParams.get('label') ?? ''

  const fetchTxs = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params: Record<string, string | number | boolean> = { page: p, limit: 50, sortBy, sortOrder }
      if (search)               params.q         = search
      if (filterType !== 'all') params.type       = filterType
      if (filterCategory !== 'all') params.category = filterCategory
      if (filterAccount  !== 'all') params.accountId = filterAccount
      if (filterFrom)           params.from      = filterFrom + 'T00:00:00.000Z'
      if (filterTo)             params.to        = filterTo   + 'T23:59:59.999Z'

      const data = await api.transactions(params)
      if (p === 1) setTransactions(data.transactions)
      else         setTransactions((prev) => [...prev, ...data.transactions])
      setTotal(data.pagination.total)
      setHasNext(data.pagination.hasNext)
      setPage(p)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, filterType, filterCategory, filterAccount, filterFrom, filterTo, sortBy, sortOrder])

  useEffect(() => {
    api.accounts().then(setAccounts).catch(console.error)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchTxs(1), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchTxs])

  const totalExpenseMXN = transactions
    .filter((t) => t.type === 'expense' && t.currency === 'MXN')
    .reduce((s, t) => s + toNum(t.amount), 0)
  const totalIncomeMXN = transactions
    .filter((t) => t.type === 'income' && t.currency === 'MXN')
    .reduce((s, t) => s + toNum(t.amount), 0)

  const activeFilters = [
    filterType     !== 'all'  && filterType,
    filterCategory !== 'all'  && filterCategory,
    filterAccount  !== 'all'  && (accounts.find((a) => a.id === filterAccount)?.name.split(' ')[0] ?? ''),
    filterFrom                && (filterTo ? fmtDateRange(filterFrom, filterTo) : filterFrom),
  ].filter(Boolean) as string[]

  const allCategories = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.category))).sort(),
    [transactions]
  )

  const grouped = groupByDate(transactions, tz)

  function clearAll() {
    setSearch('')
    setFilterType('all')
    setFilterCategory('all')
    setFilterAccount('all')
    setFilterFrom('')
    setFilterTo('')
    setSortBy('date')
    setSortOrder('desc')
    router.replace('/transactions')
  }

  function applyCurrentMonth() {
    const { from, to } = currentMonthRange(tz)
    setFilterFrom(from)
    setFilterTo(to)
  }

  return (
    <div className="space-y-7">
      <Header
        title="Transactions"
        subtitle={`${total} total · showing ${transactions.length}`}
      />

      {/* Linked-from banner */}
      {isLinked && linkedLabel && (
        <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl px-4 py-3">
          <ExternalLink className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-violet-300 font-medium">Filtered from: <span className="text-white">{linkedLabel}</span></p>
            {filterFrom && filterTo && (
              <p className="text-xs text-violet-400/70 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {fmtDateRange(filterFrom, filterTo)}
              </p>
            )}
          </div>
          <button onClick={clearAll} className="text-xs text-violet-400 hover:text-violet-200 flex items-center gap-1 flex-shrink-0">
            <X className="w-3 h-3" /> Clear
          </button>
        </div>
      )}

      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-[11px] text-white/40 uppercase tracking-wider">Income (MXN)</p>
            <p className="text-lg font-bold text-emerald-400">
              {formatMoneyCompact({ amount: totalIncomeMXN, currency: 'MXN' })}
            </p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <p className="text-[11px] text-white/40 uppercase tracking-wider">Expenses (MXN)</p>
            <p className="text-lg font-bold text-rose-400">
              {formatMoneyCompact({ amount: totalExpenseMXN, currency: 'MXN' })}
            </p>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">📋</span>
          </div>
          <div>
            <p className="text-[11px] text-white/40 uppercase tracking-wider">Transactions</p>
            <p className="text-lg font-bold text-white">{total}</p>
          </div>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="glass flex items-center gap-2.5 px-4 py-2.5 rounded-xl flex-1">
            <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by description, merchant or category…"
              className="bg-transparent text-sm text-white placeholder:text-white/25 flex-1 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
            className="glass flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
            title={sortOrder === 'desc' ? 'Newest first — click to reverse' : 'Oldest first — click to reverse'}
          >
            <ArrowUpDown className="w-4 h-4" />
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'glass flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              showFilters || activeFilters.length > 0
                ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                : 'text-white/50 hover:text-white/80'
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilters.length > 0 && (
              <span className="bg-violet-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="glass rounded-2xl p-4 space-y-4">
            <div className="flex flex-wrap gap-4">
              {/* Type */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Type</p>
                <div className="flex gap-1.5">
                  {(['all', 'expense', 'income'] as const).map((t) => (
                    <button key={t} onClick={() => setFilterType(t)}
                      className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize',
                        filterType === t ? 'bg-violet-500/25 text-violet-300' : 'bg-white/5 text-white/40 hover:text-white/70'
                      )}>
                      {t === 'all' ? 'All' : t === 'income' ? '↑ Income' : '↓ Expense'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date range */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Date range</p>
                <div className="flex items-center gap-2">
                  <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
                  <span className="text-white/20 text-xs">→</span>
                  <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
                  <button onClick={applyCurrentMonth}
                    className="text-[10px] px-2 py-1.5 rounded-lg bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-colors whitespace-nowrap">
                    This month
                  </button>
                  {(filterFrom || filterTo) && (
                    <button onClick={() => { setFilterFrom(''); setFilterTo('') }}
                      className="text-white/30 hover:text-white/60">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sort */}
            <div className="flex flex-wrap gap-4 pt-1">
              <div className="space-y-1.5">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Sort by</p>
                <div className="flex gap-1.5">
                  {(['date', 'amount'] as const).map((s) => (
                    <button key={s} onClick={() => setSortBy(s)}
                      className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize',
                        sortBy === s ? 'bg-violet-500/25 text-violet-300' : 'bg-white/5 text-white/40 hover:text-white/70'
                      )}>
                      {s === 'date' ? '📅 Date' : '💰 Amount'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Order</p>
                <div className="flex gap-1.5">
                  {([['desc', 'Newest first'], ['asc', 'Oldest first']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setSortOrder(val)}
                      className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                        sortOrder === val ? 'bg-violet-500/25 text-violet-300' : 'bg-white/5 text-white/40 hover:text-white/70'
                      )}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              {/* Category */}
              {allCategories.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Category</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setFilterCategory('all')}
                      className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                        filterCategory === 'all' ? 'bg-violet-500/25 text-violet-300' : 'bg-white/5 text-white/40 hover:text-white/70'
                      )}>All</button>
                    {allCategories.map((cat) => (
                      <button key={cat} onClick={() => setFilterCategory(cat)}
                        className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1',
                          filterCategory === cat ? 'bg-violet-500/25 text-violet-300' : 'bg-white/5 text-white/40 hover:text-white/70'
                        )}>
                        <span>{CATEGORY_ICONS[cat] ?? '💳'}</span> {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Account */}
              {accounts.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Account</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setFilterAccount('all')}
                      className={cn('px-3 py-1 rounded-lg text-xs font-medium',
                        filterAccount === 'all' ? 'bg-violet-500/25 text-violet-300' : 'bg-white/5 text-white/40 hover:text-white/70'
                      )}>All</button>
                    {accounts.map((a) => (
                      <button key={a.id} onClick={() => setFilterAccount(a.id)}
                        className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                          filterAccount === a.id ? 'bg-violet-500/25 text-violet-300' : 'bg-white/5 text-white/40 hover:text-white/70'
                        )}>{a.name}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {activeFilters.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeFilters.map(f => (
                    <span key={f} className="text-[10px] bg-violet-500/15 text-violet-300 px-2 py-1 rounded-md">{f}</span>
                  ))}
                </div>
                <button onClick={clearAll} className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* List */}
      {loading && transactions.length === 0 ? (
        <GlassCard>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
        </GlassCard>
      ) : grouped.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-white/50 text-sm">
            {total === 0
              ? 'No transactions yet — import your CSV to get started'
              : 'No transactions match your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, txs]) => (
            <GlassCard key={date} padding="none">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <p className="text-xs font-semibold text-white/50">{date}</p>
                <p className="text-xs text-white/30">{txs.length} transaction{txs.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="px-3 divide-y divide-white/[0.04]">
                {txs.map((tx) => <TransactionRow key={tx.id} transaction={tx} />)}
              </div>
            </GlassCard>
          ))}

          {hasNext && (
            <button onClick={() => fetchTxs(page + 1)} disabled={loading}
              className="w-full glass rounded-2xl py-3 text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all">
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── page (wraps inner in Suspense for useSearchParams) ──────────────────────

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsInner />
      <AddTransactionFAB />
    </Suspense>
  )
}
