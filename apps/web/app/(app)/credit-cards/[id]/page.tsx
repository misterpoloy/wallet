import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Pencil, History, UserRound, Bot } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CurrencyBadge } from '@/components/ui/CurrencyBadge'
import { TransactionRow } from '@/components/ui/TransactionRow'
import { BalanceChart } from '@/components/charts/BalanceChartWrapper'
import { MonthNav } from '@/app/(app)/bank-accounts/[id]/MonthNav'
import { AddTransactionFAB } from '@/components/ui/AddTransactionFAB'
import { prisma } from '@wallet/db'
import { formatMoney, cn } from '@/lib/utils'
import { creditCardStats } from '@/lib/account-balance'
import { getCardNetworkAsset, getCardNetworkLabel } from '@/lib/card-network'
import { dayKeyInTz, DEFAULT_TIMEZONE } from '@/lib/timezone'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

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
function usageColor(pct: number) {
  if (pct < 30) return 'from-emerald-400 to-green-500'
  if (pct < 60) return 'from-amber-400 to-yellow-500'
  if (pct < 85) return 'from-orange-400 to-orange-500'
  return 'from-red-400 to-rose-500'
}
function isoDay(d: Date, tz: string) { return dayKeyInTz(d.toISOString(), tz) }
function fmtDay(d: Date) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }

export default async function CreditCardDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { month?: string }
}) {
  const [card, userRow] = await Promise.all([
    prisma.account.findFirst({ where: { id: params.id, tenantId: TENANT, accountType: 'credit_card' } }),
    prisma.user.findFirst({ where: { email: 'jp@calaps.com' }, select: { timezone: true } }),
  ])
  if (!card) notFound()
  const tz = userRow?.timezone ?? DEFAULT_TIMEZONE

  // ── Resolve selected month from ?month=YYYY-MM, default = current month ──
  const now = new Date()
  let year  = now.getFullYear()
  let month = now.getMonth() + 1 // 1-12

  const monthParam = searchParams.month
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-').map(Number)
    if (y >= 2000 && m >= 1 && m <= 12) { year = y; month = m }
  }

  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const monthEnd   = new Date(year, month,     0, 23, 59, 59, 999)

  // ── Fetch transactions ───────────────────────────────────────────────────
  const [allTxForBalance, monthTxs] = await Promise.all([
    // ALL txs ASC (including transfers) — used for chart series
    prisma.transaction.findMany({
      where: { accountId: card.id },
      select: { date: true, type: true, amount: true },
      orderBy: { date: 'asc' },
    }),
    // Selected month transactions for the list
    prisma.transaction.findMany({
      where: {
        accountId: card.id,
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

  // ── Balance calculation ──────────────────────────────────────────────────
  const initialBalance = card.initialBalance ? Number(card.initialBalance) : 0
  // Use pre-computed O(1) authoritative balance (updated atomically on every tx write, incl. transfers)
  const currentBalance = Number(card.currentBalance)

  const { used, limit, available, usagePct } = creditCardStats(currentBalance, card.creditLimit as unknown as number)
  const currency  = card.currency as 'MXN' | 'GTQ' | 'USD'

  // ── Build daily balance chart for the selected month ─────────────────────
  const balanceBeforeMonth = allTxForBalance
    .filter((tx) => new Date(tx.date) < monthStart)
    .reduce((sum, tx) => {
      const amt = Number(tx.amount)
      return tx.type === 'expense' ? sum + amt : sum - amt
    }, initialBalance)

  const dailyNet: Record<string, number> = {}
  for (const tx of allTxForBalance.filter(
    (tx) => new Date(tx.date) >= monthStart && new Date(tx.date) <= monthEnd
  )) {
    const day = isoDay(new Date(tx.date), tz)
    const amt = Number(tx.amount)
    const delta = tx.type === 'expense' ? amt : -amt
    dailyNet[day] = (dailyNet[day] ?? 0) + delta
  }

  const daysInMonth = monthEnd.getDate()
  const chartData: { date: string; balance: number }[] = []
  let running = balanceBeforeMonth
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    running += dailyNet[isoDay(date, tz)] ?? 0
    chartData.push({ date: fmtDay(date), balance: Math.round(running * 100) / 100 })
  }

  // ── Month summary (charges vs payments) ──────────────────────────────────
  const monthCharges  = monthTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0)
  const monthPayments = monthTxs.filter(tx => tx.type === 'income').reduce((s, tx)  => s + Number(tx.amount), 0)
  const monthNet      = monthPayments - monthCharges  // positive = paid more than charged

  // ── Group by calendar day ─────────────────────────────────────────────────
  const dayMap = new Map<string, typeof monthTxs>()
  for (const tx of monthTxs) {
    const key = isoDay(new Date(tx.date), tz)
    if (!dayMap.has(key)) dayMap.set(key, [])
    dayMap.get(key)!.push(tx)
  }
  const grouped = [...dayMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, txs]) => {
      const d = new Date(key + 'T12:00:00Z')
      // credit card: payments are positive, charges negative
      const dayTotal = txs.reduce((sum, tx) => {
        const amt = Number(tx.amount)
        return tx.type === 'income' ? sum + amt : sum - amt
      }, 0)
      return { dayLabel: fmtDay(d), dayTotal, txs }
    })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/credit-cards" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Credit Cards
        </Link>
        <Link
          href={`/credit-cards/${card.id}/edit`}
          className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 glass px-3 py-1.5 rounded-xl transition-all"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Link>
      </div>

      {/* Card hero */}
      <div
        className="relative rounded-3xl p-8 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${card.color}, ${card.colorEnd})`,
          boxShadow: `0 24px 80px ${card.color}60`,
        }}
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
              {card.logoUrl && (
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center p-2 flex-shrink-0">
                  <Image
                    src={card.logoUrl}
                    alt={card.institution}
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                </div>
              )}
              <div>
                <p className="text-white/60 text-sm uppercase tracking-wider">{card.institution}</p>
                <p className="text-white text-2xl font-bold mt-1">{card.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/14 px-3 py-2 backdrop-blur-sm">
                <Image
                  src={getCardNetworkAsset(card.network)}
                  alt={getCardNetworkLabel(card.network)}
                  width={60}
                  height={24}
                  className="h-6 w-auto object-contain"
                />
              </div>
              <CurrencyBadge currency={currency} />
            </div>
          </div>
          <p className="text-white/50 font-mono text-lg tracking-[0.3em] mb-8">
            •••• •••• •••• {card.lastFour ?? '••••'}
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider">Balance Owed</p>
              <p className="text-white text-2xl font-bold mt-1">{formatMoney({ amount: used, currency })}</p>
            </div>
            {limit > 0 && (
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider">Available</p>
                <p className="text-emerald-300 text-2xl font-bold mt-1">{formatMoney({ amount: available, currency })}</p>
              </div>
            )}
          </div>
          {limit > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/50 mb-1.5">
                <span>{usagePct}% used</span>
                <span>Limit: {formatMoney({ amount: limit, currency })}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full bg-gradient-to-r', usageColor(usagePct))}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Monthly balance chart */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Balance Owed</h3>
          <span className="text-xs text-white/30">{currency}</span>
        </div>
        <BalanceChart data={chartData} currency={currency} accentColor={card.color} />
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
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Charges</p>
            <p className="text-sm font-semibold text-rose-400 mt-0.5">
              -{formatMoney({ amount: monthCharges, currency })}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Payments</p>
            <p className="text-sm font-semibold text-emerald-400 mt-0.5">
              +{formatMoney({ amount: monthPayments, currency })}
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

      <AddTransactionFAB accountId={card.id} />

      {/* Account history */}
      <GlassCard>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" /> Account History
        </h3>
        <div className="space-y-0 divide-y divide-white/[0.06]">
          {[
            { role: 'Created by', by: card.createdBy, ts: card.createdAt },
            { role: 'Last modified by', by: card.updatedBy, ts: card.updatedAt },
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
    </div>
  )
}
