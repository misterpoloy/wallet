import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Tag, Repeat2, Hash, FileText, Building2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CurrencyBadge } from '@/components/ui/CurrencyBadge'
import { TransactionRow } from '@/components/ui/TransactionRow'
import { prisma } from '@wallet/db'
import { formatMoney } from '@/lib/utils'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', twice_monthly: '2× per Month',
  monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual',
}

const FREQ_MULT: Record<string, number> = {
  daily: 30.4167, weekly: 4.3333, twice_monthly: 2,
  monthly: 1, quarterly: 1/3, annual: 1/12,
}

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  'Housing':          { icon: '🏠', color: 'from-violet-500 to-purple-600' },
  'Utilities':        { icon: '⚡', color: 'from-amber-500 to-orange-500' },
  'Subscriptions':    { icon: '📱', color: 'from-blue-500 to-cyan-500' },
  'Streaming':        { icon: '🎬', color: 'from-rose-500 to-pink-500' },
  'Fuel':             { icon: '⛽', color: 'from-emerald-500 to-green-600' },
  'Savings':          { icon: '💰', color: 'from-yellow-500 to-amber-600' },
  'Loan Payment':     { icon: '🏦', color: 'from-slate-500 to-slate-600' },
  'Health & Fitness': { icon: '💪', color: 'from-teal-500 to-cyan-600' },
}
const DEFAULT_META = { icon: '💳', color: 'from-white/20 to-white/10' }

export default async function RecurringDetailPage({ params }: { params: { id: string } }) {
  const item = await prisma.recurringExpense.findFirst({
    where: { id: params.id, tenantId: TENANT },
    include: {
      account: { select: { id: true, name: true, institution: true, color: true, colorEnd: true, currency: true, lastFour: true } },
      transactions: {
        orderBy: { date: 'desc' },
        take: 10,
        include: { account: { select: { id: true, name: true, institution: true, color: true, colorEnd: true, currency: true, accountType: true, lastFour: true } } },
      },
      _count: { select: { transactions: true } },
    },
  })
  if (!item) notFound()

  const currency = item.currency as 'MXN' | 'GTQ' | 'USD'
  const amount   = Number(item.amount)
  const monthly  = amount * (FREQ_MULT[item.frequency] ?? 1)
  const yearly   = monthly * 12
  const meta     = CATEGORY_META[item.category] ?? DEFAULT_META

  const dayInfo = item.frequency === 'twice_monthly' && item.daysOfMonth.length > 0
    ? `Days ${item.daysOfMonth.join(' & ')} of each month`
    : item.dayOfMonth ? `Day ${item.dayOfMonth} of each month` : null

  const rows = [
    { icon: Tag,       label: 'Category',   value: item.category },
    { icon: Repeat2,   label: 'Frequency',  value: FREQ_LABELS[item.frequency] ?? item.frequency },
    { icon: Building2, label: 'Account',    value: `${item.account.institution} · ${item.account.name}${item.account.lastFour ? ` ••••${item.account.lastFour}` : ''}` },
    ...(dayInfo ? [{ icon: Hash, label: 'Billing Day', value: dayInfo }] : []),
    ...(item.nextDueDate ? [{ icon: Calendar, label: 'Next Due', value: new Date(item.nextDueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }] : []),
    ...(item.notes ? [{ icon: FileText, label: 'Notes', value: item.notes }] : []),
  ]

  return (
    <div className="max-w-2xl space-y-7">
      <div className="flex items-center justify-between">
        <Link href="/recurring" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Recurring
        </Link>
        <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${item.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/8 text-white/30'}`}>
          {item.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Hero */}
      <div className="glass rounded-3xl p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 blur-3xl rounded-full w-64 h-64 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 bg-violet-500" />
        <div className="relative z-10">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-3xl mx-auto mb-5`}>
            {meta.icon}
          </div>
          <p className="text-4xl font-bold text-white tracking-tight mb-1">
            {formatMoney({ amount, currency })}
          </p>
          <CurrencyBadge currency={currency} className="mx-auto mt-1" />
          <p className="text-lg font-semibold text-white mt-4">{item.name}</p>
          <p className="text-sm text-white/40 mt-0.5">{FREQ_LABELS[item.frequency] ?? item.frequency}</p>
        </div>
      </div>

      {/* Monthly / Yearly equivalents */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 text-center">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Per Month</p>
          <p className="text-xl font-bold text-white">{formatMoney({ amount: Math.round(monthly * 100) / 100, currency })}</p>
        </div>
        <div className="glass rounded-2xl p-5 text-center">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Per Year</p>
          <p className="text-xl font-bold text-violet-300">{formatMoney({ amount: Math.round(yearly * 100) / 100, currency })}</p>
        </div>
      </div>

      {/* Details */}
      <GlassCard>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Details</h3>
        <div className="space-y-0 divide-y divide-white/[0.06]">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between py-3.5">
              <div className="flex items-center gap-2 text-sm text-white/40">
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </div>
              <span className="text-sm text-white font-medium text-right max-w-[220px]">{value}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Recent transactions */}
      {item.transactions.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Recent Transactions
            </h3>
            <span className="text-xs text-white/30">{item._count.transactions} total</span>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {item.transactions.map(tx => (
              <TransactionRow key={tx.id} transaction={tx as any} linkable />
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
