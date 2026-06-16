'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutGrid, Table2, Calendar, TrendingDown, ExternalLink } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CurrencyBadge } from '@/components/ui/CurrencyBadge'
import { formatMoney, cn } from '@/lib/utils'

function txLink(e: { account: { id: string }; category: string; name: string }) {
  const now  = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const p    = new URLSearchParams({
    accountId: e.account.id,
    category:  e.category,
    from,
    to,
    label:     e.name,
  })
  return `/transactions?${p.toString()}`
}

// ── Category metadata ────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  'Housing':         { icon: '🏠', color: 'from-violet-500 to-purple-600'  },
  'Utilities':       { icon: '⚡', color: 'from-amber-500 to-orange-500'   },
  'Subscriptions':   { icon: '📱', color: 'from-blue-500 to-cyan-500'      },
  'Streaming':       { icon: '🎬', color: 'from-rose-500 to-pink-500'      },
  'Fuel':            { icon: '⛽', color: 'from-emerald-500 to-green-600'  },
  'Savings':         { icon: '💰', color: 'from-yellow-500 to-amber-600'   },
  'Loan Payment':    { icon: '🏦', color: 'from-slate-500 to-slate-600'    },
  'Health & Fitness':{ icon: '💪', color: 'from-teal-500 to-cyan-600'      },
  'Food':            { icon: '🛒', color: 'from-orange-400 to-red-500'     },
  'Insurance':       { icon: '🛡️', color: 'from-indigo-500 to-blue-600'   },
}
const DEFAULT_META = { icon: '💳', color: 'from-white/20 to-white/10' }

const FREQ_LABELS: Record<string, string> = {
  daily:         'Daily',
  weekly:        'Weekly',
  twice_monthly: '2× Month',
  monthly:       'Monthly',
  quarterly:     'Quarterly',
  annual:        'Annual',
}

const FREQ_MULT: Record<string, number> = {
  daily: 30.4167, weekly: 4.3333, twice_monthly: 2,
  monthly: 1, quarterly: 1/3, annual: 1/12,
}

function freqBadgeColor(freq: string) {
  if (freq === 'monthly')       return 'bg-violet-500/20 text-violet-300'
  if (freq === 'twice_monthly') return 'bg-blue-500/20 text-blue-300'
  if (freq === 'weekly')        return 'bg-emerald-500/20 text-emerald-300'
  if (freq === 'quarterly')     return 'bg-amber-500/20 text-amber-300'
  if (freq === 'annual')        return 'bg-rose-500/20 text-rose-300'
  return 'bg-white/10 text-white/50'
}

function fmtNextDue(d: string | null) {
  if (!d) return null
  const date = new Date(d)
  const today = new Date()
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86_400_000)
  const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (diffDays < 0)  return { label, urgency: 'overdue'  }
  if (diffDays <= 3) return { label, urgency: 'soon'     }
  if (diffDays <= 7) return { label, urgency: 'upcoming' }
  return { label, urgency: 'ok' }
}

// ── Types ────────────────────────────────────────────────────────────────────
interface Expense {
  id:          string
  name:        string
  category:    string
  currency:    string
  amount:      number
  refAmount:   number | null
  frequency:   string
  dayOfMonth:  number | null
  daysOfMonth: number[]
  nextDueDate: string | null
  notes:       string | null
  account: {
    id:       string
    name:     string
    institution: string
    color:    string
    colorEnd: string
  }
}

// ── Card View ────────────────────────────────────────────────────────────────
function ExpenseCard({ e }: { e: Expense }) {
  const meta     = CATEGORY_META[e.category] ?? DEFAULT_META
  const currency = e.currency as 'MXN' | 'GTQ' | 'USD'
  const due      = fmtNextDue(e.nextDueDate)
  const monthly  = e.amount * (FREQ_MULT[e.frequency] ?? 1)

  const dayInfo = e.frequency === 'twice_monthly' && e.daysOfMonth.length > 0
    ? `Days ${e.daysOfMonth.join(' & ')}`
    : e.dayOfMonth ? `Day ${e.dayOfMonth}` : null

  return (
    <Link href={`/recurring/${e.id}`} className="block glass rounded-2xl p-5 flex flex-col gap-4 hover:bg-white/[0.06] transition-colors cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br flex-shrink-0', meta.color)}>
            {meta.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-snug">{e.name}</p>
            <p className="text-[11px] text-white/40 mt-0.5">{e.category}</p>
          </div>
        </div>
        <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-lg flex-shrink-0', freqBadgeColor(e.frequency))}>
          {FREQ_LABELS[e.frequency] ?? e.frequency}
        </span>
      </div>

      {/* Amount */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-white">
            {formatMoney({ amount: e.amount, currency })}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <CurrencyBadge currency={currency} />
            {e.frequency !== 'monthly' && (
              <span className="text-[10px] text-white/30">
                ≈ {formatMoney({ amount: monthly, currency })}/mo
              </span>
            )}
          </div>
        </div>
        {/* Account chip */}
        <div className="flex items-center gap-1.5 text-[10px] text-white/40 max-w-[110px] text-right">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${e.account.color}, ${e.account.colorEnd})` }}
          />
          <span className="truncate">{e.account.name}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        {due ? (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-white/30" />
            <span className={cn('text-[11px] font-medium',
              due.urgency === 'overdue' ? 'text-rose-400' :
              due.urgency === 'soon'    ? 'text-amber-400' :
              due.urgency === 'upcoming'? 'text-yellow-400' : 'text-white/40'
            )}>
              {due.urgency === 'overdue' ? 'Overdue · ' : 'Next · '}{due.label}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-white/20">No due date</span>
        )}
        <div className="flex items-center gap-3">
          {dayInfo && (
            <span className="text-[10px] text-white/25">{dayInfo}</span>
          )}
          <Link
            href={txLink(e)}
            className="flex items-center gap-1 text-[10px] font-medium text-violet-400/70 hover:text-violet-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> See transactions
          </Link>
        </div>
      </div>
    </Link>
  )
}

// ── Table View ───────────────────────────────────────────────────────────────
type SortKey = 'name' | 'category' | 'amount' | 'frequency' | 'nextDueDate'

function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  const [sort, setSort]   = useState<SortKey>('amount')
  const [asc,  setAsc]    = useState(false)

  function toggle(key: SortKey) {
    if (sort === key) setAsc(v => !v)
    else { setSort(key); setAsc(false) }
  }

  const sorted = [...expenses].sort((a, b) => {
    let cmp = 0
    if (sort === 'name')        cmp = a.name.localeCompare(b.name)
    else if (sort === 'category')    cmp = a.category.localeCompare(b.category)
    else if (sort === 'frequency')   cmp = a.frequency.localeCompare(b.frequency)
    else if (sort === 'nextDueDate') cmp = (a.nextDueDate ?? '').localeCompare(b.nextDueDate ?? '')
    else { // amount — normalize to monthly
      const am = a.amount * (FREQ_MULT[a.frequency] ?? 1)
      const bm = b.amount * (FREQ_MULT[b.frequency] ?? 1)
      cmp = am - bm
    }
    return asc ? cmp : -cmp
  })

  function Th({ label, k }: { label: string; k: SortKey }) {
    const active = sort === k
    return (
      <th
        onClick={() => toggle(k)}
        className={cn('px-4 py-3 text-left text-[10px] uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors',
          active ? 'text-violet-400' : 'text-white/30 hover:text-white/60'
        )}
      >
        {label} {active ? (asc ? '↑' : '↓') : ''}
      </th>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-white/[0.07]">
          <tr>
            <Th label="Name"      k="name"        />
            <Th label="Category"  k="category"    />
            <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/30">Account</th>
            <Th label="Frequency" k="frequency"   />
            <Th label="Amount"    k="amount"       />
            <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-white/30">Monthly ≈</th>
            <Th label="Next Due"  k="nextDueDate" />
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {sorted.map(e => {
            const meta     = CATEGORY_META[e.category] ?? DEFAULT_META
            const currency = e.currency as 'MXN' | 'GTQ' | 'USD'
            const monthly  = e.amount * (FREQ_MULT[e.frequency] ?? 1)
            const due      = fmtNextDue(e.nextDueDate)
            return (
              <tr key={e.id} className="hover:bg-white/[0.025] transition-colors">
                {/* Name */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="text-base">{meta.icon}</span>
                    <span className="font-medium text-white">{e.name}</span>
                  </div>
                </td>
                {/* Category */}
                <td className="px-4 py-3.5 text-white/50 text-xs">{e.category}</td>
                {/* Account */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: `linear-gradient(135deg, ${e.account.color}, ${e.account.colorEnd})` }} />
                    <span className="text-xs text-white/40 truncate max-w-[120px]">{e.account.name}</span>
                  </div>
                </td>
                {/* Frequency */}
                <td className="px-4 py-3.5">
                  <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-lg', freqBadgeColor(e.frequency))}>
                    {FREQ_LABELS[e.frequency] ?? e.frequency}
                  </span>
                </td>
                {/* Amount */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white">{formatMoney({ amount: e.amount, currency })}</span>
                    <CurrencyBadge currency={currency} />
                  </div>
                </td>
                {/* Monthly equiv */}
                <td className="px-4 py-3.5 text-white/40 text-xs">
                  {e.frequency === 'monthly'
                    ? <span className="text-white/20">—</span>
                    : formatMoney({ amount: monthly, currency })}
                </td>
                {/* Next due */}
                <td className="px-4 py-3.5">
                  {due ? (
                    <span className={cn('text-xs font-medium',
                      due.urgency === 'overdue' ? 'text-rose-400' :
                      due.urgency === 'soon'    ? 'text-amber-400' :
                      due.urgency === 'upcoming'? 'text-yellow-300' : 'text-white/40'
                    )}>
                      {due.label}
                    </span>
                  ) : (
                    <span className="text-white/20 text-xs">—</span>
                  )}
                </td>
                {/* See transactions */}
                <td className="px-4 py-3.5 text-right">
                  <Link
                    href={txLink(e)}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-400/60 hover:text-violet-300 transition-colors whitespace-nowrap"
                  >
                    <ExternalLink className="w-3 h-3" /> See
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Root ─────────────────────────────────────────────────────────────────────
interface Props {
  expenses: Expense[]
  summaryMXN: number
  summaryGTQ: number
  summaryUSD: number
  totalCount: number
}

export function RecurringClient({ expenses, summaryMXN, summaryGTQ, summaryUSD, totalCount }: Props) {
  const [view, setView] = useState<'cards' | 'table'>('cards')

  const groupedByCategory = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    ;(acc[e.category] ??= []).push(e)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Monthly MXN</p>
          <p className="text-xl font-bold text-white">{formatMoney({ amount: summaryMXN, currency: 'MXN' })}</p>
          <p className="text-[10px] text-white/30 mt-0.5">≈ {formatMoney({ amount: summaryMXN / 2, currency: 'MXN' })} / quincena</p>
        </div>
        {summaryGTQ > 0 && (
          <div className="glass rounded-2xl p-5">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Monthly GTQ</p>
            <p className="text-xl font-bold text-white">{formatMoney({ amount: summaryGTQ, currency: 'GTQ' })}</p>
          </div>
        )}
        {summaryUSD > 0 && (
          <div className="glass rounded-2xl p-5">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Monthly USD</p>
            <p className="text-xl font-bold text-white">{formatMoney({ amount: summaryUSD, currency: 'USD' })}</p>
          </div>
        )}
        <div className="glass rounded-2xl p-5">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Commitments</p>
          <p className="text-xl font-bold text-white">{totalCount}</p>
          <p className="text-[10px] text-white/30 mt-0.5">active recurring</p>
        </div>
        <div className="glass rounded-2xl p-5 flex items-center gap-3">
          <TrendingDown className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Yearly MXN</p>
            <p className="text-base font-bold text-white">{formatMoney({ amount: summaryMXN * 12, currency: 'MXN' })}</p>
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1 glass rounded-xl p-1">
          <button
            onClick={() => setView('cards')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              view === 'cards' ? 'bg-violet-600 text-white' : 'text-white/40 hover:text-white/70'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Cards
          </button>
          <button
            onClick={() => setView('table')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              view === 'table' ? 'bg-violet-600 text-white' : 'text-white/40 hover:text-white/70'
            )}
          >
            <Table2 className="w-3.5 h-3.5" /> Table
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'cards' ? (
        <div className="space-y-8">
          {Object.entries(groupedByCategory).map(([cat, items]) => {
            const meta = CATEGORY_META[cat] ?? DEFAULT_META
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{meta.icon}</span>
                  <h3 className="text-sm font-semibold text-white">{cat}</h3>
                  <span className="text-xs text-white/30">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {items.map(e => <ExpenseCard key={e.id} e={e} />)}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <GlassCard>
          <ExpenseTable expenses={expenses} />
        </GlassCard>
      )}
    </div>
  )
}
