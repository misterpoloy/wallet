import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, History, UserRound, Bot, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import { GlassCard } from '@/components/ui/GlassCard'
import { TransactionRow } from '@/components/ui/TransactionRow'
import { CurrencyBadge } from '@/components/ui/CurrencyBadge'
import { BalanceChart } from '@/components/charts/BalanceChartWrapper'
import { MonthNav } from './MonthNav'
import { AddTransactionFAB } from '@/components/ui/AddTransactionFAB'
import { prisma } from '@wallet/db'
import { formatMoney, cn } from '@/lib/utils'
import { dayKeyInTz, DEFAULT_TIMEZONE } from '@/lib/timezone'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

function fmtDay(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function isoDay(d: Date, tz: string) {
  return dayKeyInTz(d.toISOString(), tz)
}
function authorLabel(by: string | null | undefined) {
  if (!by) return { label: 'System', isAgent: true }
  if (by === 'user') return { label: 'You', isAgent: false }
  if (by === 'agent:import') return { label: 'CSV Import', isAgent: true }
  if (by === 'agent:adjustment') return { label: 'Balance Adjustment', isAgent: true }
  if (by.startsWith('agent:')) return { label: by.replace('agent:', ''), isAgent: true }
  return { label: by, isAgent: false }
}
function fmtTs(d: Date) {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function BankAccountDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { month?: string }
}) {
  const [account, userRow] = await Promise.all([
    prisma.account.findFirst({ where: { id: params.id, tenantId: TENANT } }),
    prisma.user.findFirst({ where: { email: 'jp@calaps.com' }, select: { timezone: true } }),
  ])
  if (!account) notFound()
  const tz = userRow?.timezone ?? DEFAULT_TIMEZONE

  // ── Resolve selected month from ?month=YYYY-MM, default = current month ──────
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() + 1 // 1-12

  const monthParam = searchParams.month
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-').map(Number)
    if (y >= 2000 && m >= 1 && m <= 12) {
      year = y
      month = m
    }
  }

  // First and last moment of the selected month
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const monthEnd   = new Date(year, month,     0, 23, 59, 59, 999) // last day of month

  // ── Fetch transactions for chart + month list ────────────────────────────────
  const [allTxForBalance, monthTxs] = await Promise.all([
    // ALL txs ASC (including transfers) — used for chart series
    prisma.transaction.findMany({
      where: { accountId: account.id },
      select: { date: true, type: true, amount: true },
      orderBy: { date: 'asc' },
    }),
    // Selected month txs for the list
    prisma.transaction.findMany({
      where: {
        accountId: account.id,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: {
        account: {
          select: { id: true, name: true, institution: true, color: true, colorEnd: true, currency: true, lastFour: true, accountType: true },
        },
      },
      orderBy: { date: 'desc' },
    }),
  ])

  const initialBalance = account.initialBalance ? Number(account.initialBalance) : 0
  const isCreditCard   = account.accountType === 'credit_card'
  // Use pre-computed O(1) authoritative balance (updated atomically on every tx write, incl. transfers)
  const currentBalance = Number(account.currentBalance)
  const currency = account.currency as 'MXN' | 'GTQ' | 'USD'

  const typeLabel = account.accountType === 'checking' ? 'Checking Account'
    : account.accountType === 'savings' ? 'Savings Account'
    : account.accountType === 'debit' ? 'Debit Account'
    : 'Cash'

  // ── Build daily balance chart for the selected month ─────────────────────────
  // Start from initialBalance + all transactions before this month
  const balanceBeforeMonth = allTxForBalance
    .filter((tx) => new Date(tx.date) < monthStart)
    .reduce((sum, tx) => {
      const amt = Number(tx.amount)
      if (isCreditCard) return tx.type === 'expense' ? sum + amt : sum - amt
      return tx.type === 'income' ? sum + amt : sum - amt
    }, initialBalance)

  // Build dailyNet map for the month
  const txsInMonth = allTxForBalance.filter(
    (tx) => new Date(tx.date) >= monthStart && new Date(tx.date) <= monthEnd
  )
  const dailyNet: Record<string, number> = {}
  for (const tx of txsInMonth) {
    const day = isoDay(new Date(tx.date), tz)
    const amt = Number(tx.amount)
    // credit card: expenses increase owed balance, payments decrease it
    const delta = isCreditCard
      ? (tx.type === 'expense' ? amt : -amt)
      : (tx.type === 'income'  ? amt : -amt)
    dailyNet[day] = (dailyNet[day] ?? 0) + delta
  }

  // One data point per day of the month
  const daysInMonth = monthEnd.getDate()
  const chartData: { date: string; balance: number }[] = []
  let running = balanceBeforeMonth
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const dayKey = isoDay(date, tz)
    running += dailyNet[dayKey] ?? 0
    chartData.push({ date: fmtDay(date), balance: Math.round(running * 100) / 100 })
  }

  // ── Month summary totals ──────────────────────────────────────────────────────
  const monthIncome  = monthTxs.filter((tx) => tx.type === 'income'  && !tx.isTransfer).reduce((s, tx) => s + Number(tx.amount), 0)
  const monthExpense = monthTxs.filter((tx) => tx.type === 'expense' && !tx.isTransfer).reduce((s, tx) => s + Number(tx.amount), 0)
  const monthNet     = monthIncome - monthExpense

  // ── Group by calendar day ─────────────────────────────────────────────────────
  const grouped: { dayLabel: string; dayTotal: number; txs: typeof monthTxs }[] = []
  const dayMap = new Map<string, typeof monthTxs>()

  for (const tx of monthTxs) {
    const key = isoDay(new Date(tx.date), tz)
    if (!dayMap.has(key)) dayMap.set(key, [])
    dayMap.get(key)!.push(tx)
  }

  for (const [key, txs] of [...dayMap.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
    const d = new Date(key + 'T12:00:00Z')
    const dayTotal = txs.reduce((sum, tx) => {
      const amt = Number(tx.amount)
      if (tx.isTransfer) return sum
      return tx.type === 'income' ? sum + amt : sum - amt
    }, 0)
    grouped.push({ dayLabel: fmtDay(d), dayTotal, txs })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/bank-accounts" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Bank Accounts
        </Link>
        <Link
          href={`/bank-accounts/${account.id}/edit`}
          className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 glass px-3 py-1.5 rounded-xl transition-all"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Link>
      </div>

      {/* Hero */}
      <div
        className="relative rounded-3xl p-8 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${account.color}, ${account.colorEnd})`,
          boxShadow: `0 24px 80px ${account.color}60`,
        }}
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              {account.logoUrl ? (
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/10 flex-shrink-0 ring-2 ring-white/20">
                  <Image src={account.logoUrl} alt={account.institution} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-2xl flex-shrink-0 ring-2 ring-white/20">🏦</div>
              )}
              <div>
                <p className="text-white/60 text-sm uppercase tracking-wider">{account.institution} · {typeLabel}</p>
                <p className="text-white text-2xl font-bold mt-1">{account.name}</p>
                {account.lastFour && (
                  <p className="text-white/50 font-mono text-sm mt-1 tracking-widest">••••••••{account.lastFour}</p>
                )}
              </div>
            </div>
            <span className="text-lg font-bold text-white/80 tracking-widest uppercase">{currency}</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider">Current Balance</p>
              <p className={`text-4xl font-bold mt-1 ${currentBalance < 0 ? 'text-rose-300' : 'text-white'}`}>
                {currentBalance < 0 ? '-' : ''}{formatMoney({ amount: Math.abs(currentBalance), currency })}
              </p>
            </div>
            {account.actionUrl && (
              <a
                href={account.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-sm font-medium px-4 py-2.5 rounded-2xl transition-all ring-1 ring-white/20"
              >
                <ExternalLink className="w-4 h-4" />
                Open account
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Monthly balance chart */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Balance</h3>
          <span className="text-xs text-white/30">{currency}</span>
        </div>
        <BalanceChart data={chartData} currency={currency} accentColor={account.color} />
      </GlassCard>

      {/* Transactions — monthly view */}
      <GlassCard>
        {/* Header with month nav */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">Transactions</h3>
          <MonthNav year={year} month={month} />
        </div>

        {/* Month summary bar */}
        <div className="flex items-center gap-6 py-3 mb-4 border-b border-white/[0.06]">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Income</p>
            <p className="text-sm font-semibold text-emerald-400 mt-0.5">
              +{formatMoney({ amount: monthIncome, currency })}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Expenses</p>
            <p className="text-sm font-semibold text-rose-400 mt-0.5">
              -{formatMoney({ amount: monthExpense, currency })}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Net · {monthTxs.length} txs</p>
            <p className={`text-sm font-bold mt-0.5 ${monthNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {monthNet >= 0 ? '+' : ''}{formatMoney({ amount: monthNet, currency })}
            </p>
          </div>
        </div>

        {grouped.length === 0 ? (
          <p className="text-sm text-white/30 py-8 text-center">No transactions this month</p>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ dayLabel, dayTotal, txs }) => (
              <div key={dayLabel}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">{dayLabel}</p>
                  <p className={`text-xs font-semibold ${dayTotal >= 0 ? 'text-emerald-400' : 'text-white/40'}`}>
                    {dayTotal >= 0 ? '+' : ''}{formatMoney({ amount: dayTotal, currency })}
                  </p>
                </div>
                <div className="divide-y divide-white/[0.05] rounded-xl overflow-hidden bg-white/[0.02]">
                  {txs.map((tx) => (
                    <TransactionRow key={tx.id} transaction={tx as any} className="px-3" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Account history */}
      <GlassCard>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" /> Account History
        </h3>
        <div className="space-y-0 divide-y divide-white/[0.06]">
          {[
            { role: 'Created by', by: account.createdBy, ts: account.createdAt },
            { role: 'Last modified by', by: account.updatedBy, ts: account.updatedAt },
          ].map(({ role, by, ts }) => {
            const author = authorLabel(by)
            return (
              <div key={role} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-2 text-sm text-white/40">
                  {author.isAgent ? <Bot className="w-4 h-4 flex-shrink-0" /> : <UserRound className="w-4 h-4 flex-shrink-0" />}
                  <span>{role}</span>
                  <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-md', author.isAgent ? 'bg-violet-500/15 text-violet-400' : 'bg-sky-500/15 text-sky-400')}>
                    {author.label}
                  </span>
                </div>
                <span className="text-sm text-white/60 font-medium">{fmtTs(ts)}</span>
              </div>
            )
          })}
        </div>
      </GlassCard>
      <AddTransactionFAB accountId={account.id} />
    </div>
  )
}
