import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Calendar, Tag, CreditCard, Building2, CheckCircle2, Clock, History, UserRound, Bot, Pencil, ArrowRightLeft, TrendingDown, TrendingUp, Store, FileText } from 'lucide-react'
import { DeleteTransactionButton } from './DeleteTransactionButton'
import { GlassCard } from '@/components/ui/GlassCard'
import { CurrencyBadge } from '@/components/ui/CurrencyBadge'
import { TransactionRow } from '@/components/ui/TransactionRow'
import { CATEGORY_ICONS } from '@/components/ui/TransactionRow'
import { getCardNetworkAsset, getCardNetworkLabel } from '@/lib/card-network'
import { prisma } from '@wallet/db'
import { formatMoney, formatDate, cn } from '@/lib/utils'
import { toNum } from '@/lib/api-client'

export const dynamic = 'force-dynamic'

const TENANT = 'tenant_portiz'

async function getTx(id: string) {
  const tx = await prisma.transaction.findFirst({
    where: { id, tenantId: TENANT },
    include: {
      account: true,
    },
  })
  return tx
}

async function getRelated(accountId: string, excludeId: string) {
  return prisma.transaction.findMany({
    where: { accountId, id: { not: excludeId }, isTransfer: false },
    include: { account: { select: { id: true, name: true, institution: true, color: true, colorEnd: true, currency: true, lastFour: true, accountType: true } } },
    orderBy: { date: 'desc' },
    take: 4,
  })
}

async function getTransferPair(transferGroupId: string, excludeId: string) {
  return prisma.transaction.findFirst({
    where: { transferGroupId, id: { not: excludeId } },
    include: { account: { select: { id: true, name: true, institution: true, color: true, colorEnd: true, currency: true, lastFour: true, accountType: true } } },
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authorLabel(by: string | null | undefined): { label: string; isAgent: boolean } {
  if (!by) return { label: 'System', isAgent: true }
  if (by === 'user') return { label: 'You', isAgent: false }
  if (by === 'agent:import') return { label: 'CSV Import', isAgent: true }
  if (by === 'agent:adjustment') return { label: 'Balance Adjustment', isAgent: true }
  if (by.startsWith('agent:')) return { label: by.replace('agent:', ''), isAgent: true }
  return { label: by, isAgent: false }
}

function fmtTs(d: Date) {
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function HistoryCard({
  createdAt, updatedAt, createdBy, updatedBy,
}: {
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
  updatedBy: string | null
}) {
  const created = authorLabel(createdBy)
  const updated = authorLabel(updatedBy)
  const wasEdited = updatedAt.getTime() - createdAt.getTime() > 2000

  return (
    <GlassCard>
      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" /> History
      </h3>
      <div className="space-y-0 divide-y divide-white/[0.06]">
        {/* Created */}
        <div className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-2 text-sm text-white/40">
            {created.isAgent
              ? <Bot className="w-4 h-4 flex-shrink-0" />
              : <UserRound className="w-4 h-4 flex-shrink-0" />
            }
            <span>Created by</span>
            <span className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded-md',
              created.isAgent ? 'bg-violet-500/15 text-violet-400' : 'bg-sky-500/15 text-sky-400'
            )}>
              {created.label}
            </span>
          </div>
          <span className="text-sm text-white/60 font-medium">{fmtTs(createdAt)}</span>
        </div>
        {/* Last modified */}
        <div className="flex items-center justify-between py-3.5">
          <div className="flex items-center gap-2 text-sm text-white/40">
            {updated.isAgent
              ? <Bot className="w-4 h-4 flex-shrink-0" />
              : <UserRound className="w-4 h-4 flex-shrink-0" />
            }
            <span>Last modified by</span>
            <span className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded-md',
              updated.isAgent ? 'bg-violet-500/15 text-violet-400' : 'bg-sky-500/15 text-sky-400'
            )}>
              {updated.label}
            </span>
          </div>
          <span className={cn('text-sm font-medium', wasEdited ? 'text-amber-400' : 'text-white/40')}>
            {fmtTs(updatedAt)}
          </span>
        </div>
      </div>
    </GlassCard>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function TransactionDetailPage({ params }: { params: { id: string } }) {
  const tx = await getTx(params.id)
  if (!tx) notFound()

  const [related, transferPair] = await Promise.all([
    getRelated(tx.accountId, tx.id),
    tx.isTransfer && tx.transferGroupId
      ? getTransferPair(tx.transferGroupId, tx.id)
      : Promise.resolve(null),
  ])

  const isIncome   = tx.type === 'income'
  const isTransfer = tx.isTransfer  // boolean field; type is 'expense' or 'income' for each leg
  const icon = CATEGORY_ICONS[tx.category] ?? CATEGORY_ICONS[tx.categoryRaw] ?? '💳'
  const amount = toNum(tx.amount as unknown as string)
  const currency = tx.currency as 'MXN' | 'GTQ' | 'USD'
  const hasFx = tx.fxRate != null && tx.fxRate !== 1

  const date = new Date(tx.date)
  const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const label = tx.payee || tx.note || tx.category

  const isCreditCard = tx.account.accountType === 'credit_card'
  const acct = tx.account as typeof tx.account & { logoUrl?: string | null; network?: string | null; currentBalance?: string | null; creditLimit?: string | null }
  const acctUsed  = Math.abs(Number(acct.currentBalance ?? 0))
  const acctLimit = Number(acct.creditLimit ?? 0)
  const acctPct   = acctLimit > 0 ? Math.min(100, Math.round((acctUsed / acctLimit) * 100)) : 0
  const showUsageBar = isCreditCard && acctLimit > 0

  return (
    <div className="max-w-5xl">
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
    {/* ── LEFT: existing content ─────────────────────────────────── */}
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <Link href="/transactions" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Transactions
        </Link>
        <div className="flex items-center gap-2">
          <DeleteTransactionButton id={tx.id} />
          <Link
            href={`/transactions/${tx.id}/edit`}
            className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 glass px-3 py-1.5 rounded-xl transition-all"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="glass rounded-3xl p-8 text-center relative overflow-hidden">
        <div className={cn(
          'absolute inset-0 opacity-10 blur-3xl rounded-full w-64 h-64 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2',
          isTransfer ? 'bg-sky-500' : isIncome ? 'bg-emerald-500' : 'bg-rose-500'
        )} />
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/8 flex items-center justify-center text-3xl mx-auto mb-5">
            {isTransfer ? '↔️' : icon}
          </div>
          <p className={cn('text-5xl font-bold tracking-tight mb-1',
            isTransfer ? 'text-sky-400' : isIncome ? 'text-emerald-400' : 'text-white'
          )}>
            {isTransfer ? '' : isIncome ? '+' : '-'}{formatMoney({ amount, currency })}
          </p>
          <CurrencyBadge currency={currency} className="mx-auto mt-1" />
          <p className="text-lg font-semibold text-white mt-4">{label}</p>
          {tx.note && tx.note !== tx.payee && (
            <p className="text-sm text-white/40 mt-0.5">{tx.note}</p>
          )}
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Completed</span>
            </div>
            {isTransfer && (
              <div className="flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs text-sky-400 font-medium">
                  {isIncome ? 'Incoming transfer' : 'Outgoing transfer'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <GlassCard>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Details</h3>
        <div className="space-y-0 divide-y divide-white/[0.06]">
          {[
            {
              icon: Calendar,
              label: 'Date & Time',
              value: (
                <span className="text-right">
                  <span className="text-white font-medium">{formatDate(tx.date.toISOString())}</span>
                  <span className="text-white/40 ml-2 text-xs">{formattedTime}</span>
                </span>
              ),
            },
            {
              icon: Tag,
              label: 'Category',
              value: (
                <span className="flex items-center gap-1.5">
                  <span>{icon}</span>
                  <span className="text-white font-medium">{tx.category}</span>
                </span>
              ),
            },
            {
              icon: isIncome ? Building2 : CreditCard,
              label: 'Account',
              value: (
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${tx.account.color}, ${tx.account.colorEnd})` }}
                  />
                  <span className="text-white font-medium">{tx.account.name}</span>
                  {tx.account.lastFour && (
                    <span className="text-white/40 text-xs">••••{tx.account.lastFour}</span>
                  )}
                </div>
              ),
            },
            {
              icon: Clock,
              label: 'Type',
              value: (
                <span className={cn('font-medium capitalize', isIncome ? 'text-emerald-400' : isTransfer ? 'text-sky-400' : 'text-rose-400')}>
                  {isIncome ? '↑ Income / Credit' : isTransfer ? '↔ Transfer' : '↓ Expense / Debit'}
                </span>
              ),
            },
            ...(tx.payee ? [{
              icon: Store,
              label: 'Payee / Merchant',
              value: <span className="text-white font-medium">{tx.payee}</span>,
            }] : []),
            ...(tx.note ? [{
              icon: FileText,
              label: 'Description / Note',
              value: <span className="text-white/70 text-right max-w-[200px] break-words">{tx.note}</span>,
            }] : []),
          ].map(({ icon: Icon, label: lbl, value }) => (
            <div key={lbl} className="flex items-center justify-between py-3.5">
              <div className="flex items-center gap-2 text-sm text-white/40">
                <Icon className="w-4 h-4 flex-shrink-0" />
                {lbl}
              </div>
              <div className="text-sm">{value}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* History */}
      <HistoryCard
        createdAt={tx.createdAt}
        updatedAt={tx.updatedAt}
        createdBy={tx.createdBy}
        updatedBy={tx.updatedBy}
      />

      {/* Transfer details */}
      {isTransfer && transferPair && (
        <GlassCard>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
          </h3>
          {/* Flow: from → to */}
          <div className="flex items-center gap-3 mb-4">
            {/* Origin */}
            <div className={cn(
              'flex-1 rounded-xl p-3 border',
              !isIncome ? 'bg-sky-500/10 border-sky-500/30' : 'bg-white/[0.03] border-white/8'
            )}>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">From</p>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded flex-shrink-0" style={{ background: `linear-gradient(135deg, ${(!isIncome ? tx : transferPair).account.color}, ${(!isIncome ? tx : transferPair).account.colorEnd})` }} />
                <p className="text-sm font-medium text-white truncate">{(!isIncome ? tx : transferPair).account.name}</p>
              </div>
              <p className="text-xs text-white/40 mt-0.5 ml-6">{(!isIncome ? tx : transferPair).account.institution}</p>
            </div>

            <ArrowRightLeft className="w-4 h-4 text-sky-400 flex-shrink-0" />

            {/* Destination */}
            <div className={cn(
              'flex-1 rounded-xl p-3 border',
              isIncome ? 'bg-sky-500/10 border-sky-500/30' : 'bg-white/[0.03] border-white/8'
            )}>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">To</p>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded flex-shrink-0" style={{ background: `linear-gradient(135deg, ${(isIncome ? tx : transferPair).account.color}, ${(isIncome ? tx : transferPair).account.colorEnd})` }} />
                <p className="text-sm font-medium text-white truncate">{(isIncome ? tx : transferPair).account.name}</p>
              </div>
              <p className="text-xs text-white/40 mt-0.5 ml-6">{(isIncome ? tx : transferPair).account.institution}</p>
            </div>
          </div>

          {/* FX rate stamp */}
          {hasFx && (
            <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 mb-3">
              <p className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-1.5">Exchange Rate (at time of transfer)</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-300">
                    1 {tx.currency} = {Number(tx.fxRate).toFixed(6)} {tx.refCurrency ?? 'MXN'}
                  </span>
                </div>
                <span className="text-xs text-amber-400/50">
                  Ref: {formatMoney({ amount: toNum(tx.refAmount as unknown as string), currency: (tx.refCurrency ?? 'MXN') as 'MXN' | 'GTQ' | 'USD' })}
                </span>
              </div>
            </div>
          )}

          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Counterpart transaction</p>
          <TransactionRow transaction={transferPair as any} linkable />
        </GlassCard>
      )}

    </div>

    {/* ── RIGHT: account card ────────────────────────────────────── */}
    <div className="lg:sticky lg:top-8 mt-16">
      <Link href={isCreditCard ? `/credit-cards/${tx.account.id}` : `/bank-accounts/${tx.account.id}`} className="block group">
        <div
          className="relative rounded-3xl overflow-hidden transition-all duration-300 group-hover:scale-[1.02]"
          style={{
            background: `linear-gradient(135deg, ${tx.account.color}, ${tx.account.colorEnd})`,
            boxShadow: `0 20px 60px ${tx.account.color}55`,
            aspectRatio: '16/10',
          }}
        >
          {/* decorative blobs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-black/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 h-full flex flex-col justify-between p-6">
            {/* Top: logo + name */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                {acct.logoUrl ? (
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center p-1.5 flex-shrink-0">
                    <Image src={acct.logoUrl} alt={tx.account.institution} width={32} height={32} className="w-full h-full object-contain" unoptimized />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-lg flex-shrink-0">
                    🏦
                  </div>
                )}
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">{tx.account.name}</p>
                  <p className="text-white/50 text-[11px] uppercase tracking-wider mt-0.5">{tx.account.institution}</p>
                </div>
              </div>
            </div>

            {/* Middle: card number */}
            <p className="text-white/40 font-mono text-xs tracking-[0.3em]">
              •••• &nbsp;•••• &nbsp;•••• &nbsp;{tx.account.lastFour ?? '••••'}
            </p>

            {/* Bottom: network logo right */}
            <div className="flex items-end justify-end">
              {isCreditCard && acct.network && (
                <div className="rounded-xl bg-black/20 backdrop-blur-sm px-3 py-2">
                  <Image
                    src={getCardNetworkAsset(acct.network as any)}
                    alt={getCardNetworkLabel(acct.network as any)}
                    width={52}
                    height={20}
                    className="h-5 w-auto object-contain"
                    unoptimized
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>

    </div>
    </div>
  )
}
