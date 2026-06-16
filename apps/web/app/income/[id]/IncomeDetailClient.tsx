'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, XCircle, Circle, ChevronDown, ChevronUp, ExternalLink, Plus } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { ConfirmIncomePaymentModal } from '@/components/income/ConfirmIncomePaymentModal'
import { formatMoney, cn } from '@/lib/utils'

type Entry = {
  id: string
  period: string
  subPeriod: number
  status: string
  expectedAmount: number
  actualAmount: number | null
  receivedAt: string | null
  transactionId: string | null
  note: string | null
}

type Account = { id: string; name: string; institution: string }

type Source = {
  id: string
  name: string
  employer: string | null
  currency: string
  grossAmount: number
  netAmount: number | null
  frequency: string
  accountId: string | null
  account: Account | null
  entries: Entry[]
}

const STATUS_ICON = {
  received: { Icon: CheckCircle2, color: 'text-emerald-400', label: 'Received' },
  expected: { Icon: Clock,        color: 'text-white/25',    label: 'Expected' },
  partial:  { Icon: Clock,        color: 'text-amber-400',   label: 'Partial'  },
  missed:   { Icon: XCircle,      color: 'text-rose-400',    label: 'Missed'   },
  skipped:  { Icon: Circle,       color: 'text-white/15',    label: 'Skipped'  },
}

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

function fmt(amount: number, currency: string) {
  return formatMoney({ amount, currency: currency as any })
}

type PendingConfirm = { period: string; subPeriod: 1 | 2; amount: number }

export function IncomeDetailClient({ source }: { source: Source }) {
  const router = useRouter()
  const [toggling, setToggling] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)

  const isSemimonthly = source.frequency === 'semimonthly'
  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Amount per payment slot
  const netPerPayment = isSemimonthly
    ? (source.netAmount ?? source.grossAmount) / 2
    : (source.netAmount ?? source.grossAmount)

  // Build entry lookup: key = "period-subPeriod"
  const entryMap = Object.fromEntries(
    source.entries.map(e => [`${e.period}-${e.subPeriod}`, e])
  )

  // Unique periods
  const periods = [...new Set(source.entries.map(e => e.period))].sort()

  // Toggle existing entry (for non-semimonthly, simple toggle)
  async function toggleEntry(entry: Entry) {
    const key = `${entry.period}-${entry.subPeriod}`
    setToggling(key)
    const nextStatus = entry.status === 'received' ? 'expected' : 'received'
    await fetch(`/api/income/${source.id}/entries/${entry.period}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus, subPeriod: entry.subPeriod }),
    })
    router.refresh()
    setToggling(null)
  }

  const displayed = showAll ? periods : periods.slice(0, 12)

  // Renders a single payment slot (either 1 per month or 2 for quincenal)
  function PaySlot({ period, subPeriod, isCurrent }: { period: string; subPeriod: 1 | 2; isCurrent: boolean }) {
    const key = `${period}-${subPeriod}`
    const entry = entryMap[key]
    const isLoading = toggling === key

    const received = entry?.status === 'received'
    const hasTransaction = !!entry?.transactionId

    const slotLabel = isSemimonthly
      ? (subPeriod === 1 ? '1ra Quincena' : '2da Quincena')
      : 'Pago mensual'

    const expected = netPerPayment
    const actual   = entry?.actualAmount

    // Open confirm modal for semimonthly (which creates a transaction)
    // For monthly with account linked, also use confirm modal
    function handleMarkPaid() {
      if (source.account) {
        setPendingConfirm({ period, subPeriod, amount: expected })
      } else {
        // No linked account — simple toggle
        if (entry) {
          toggleEntry(entry)
        } else {
          // Create entry via PATCH
          setToggling(key)
          fetch(`/api/income/${source.id}/entries/${period}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'received', subPeriod }),
          }).then(() => { router.refresh(); setToggling(null) })
        }
      }
    }

    return (
      <div className={cn(
        'flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors',
        received ? 'bg-emerald-500/[0.06] border border-emerald-500/15' : 'bg-white/[0.02] border border-white/[0.05]',
        isCurrent && !received && 'border-violet-500/25 bg-violet-500/[0.04]'
      )}>
        <div className="flex items-center gap-2.5 min-w-0">
          {received
            ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            : <Clock className={cn('w-4 h-4 flex-shrink-0', isCurrent ? 'text-violet-400/60' : 'text-white/20')} />
          }
          <div className="min-w-0">
            <p className={cn('text-xs font-semibold', received ? 'text-emerald-300' : isCurrent ? 'text-violet-300' : 'text-white/50')}>
              {slotLabel}
            </p>
            {actual != null && (
              <p className="text-[10px] text-white/30 tabular-nums">
                {fmt(actual, source.currency)}
                {entry?.receivedAt && (
                  <> · {new Date(entry.receivedAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}</>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Expected amount */}
          <span className="text-xs text-white/30 tabular-nums hidden sm:inline">
            {fmt(expected, source.currency)}
          </span>

          {/* See transaction button */}
          {hasTransaction && (
            <a
              href={`/transactions?q=${entry!.transactionId}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              Ver <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}

          {/* Mark paid / toggle */}
          {!received && (
            <button
              onClick={handleMarkPaid}
              disabled={isLoading}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all',
                'bg-white/5 border border-white/10 text-white/50 hover:bg-violet-500/15 hover:border-violet-500/30 hover:text-violet-300',
                isLoading && 'opacity-50'
              )}
            >
              <Plus className="w-2.5 h-2.5" />
              {isLoading ? '…' : 'Marcar pagado'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <GlassCard>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-5">
          Historial de Pagos · {periods.length} {isSemimonthly ? 'meses' : 'pagos'}
          {isSemimonthly && <span className="ml-2 text-violet-400/60">· Quincenal</span>}
        </h3>

        <div className="space-y-3">
          {displayed.map((period) => {
            const [year, month] = period.split('-').map(Number)
            const monthName = MONTH_NAMES[month - 1]
            const isCurrent = period === currentPeriod

            return (
              <div key={period} className={cn(
                'rounded-2xl overflow-hidden border',
                isCurrent ? 'border-violet-500/20' : 'border-white/[0.06]'
              )}>
                {/* Month header */}
                <div className={cn(
                  'px-4 py-2.5 flex items-center justify-between',
                  isCurrent ? 'bg-violet-500/[0.08]' : 'bg-white/[0.02]'
                )}>
                  <span className={cn(
                    'text-sm font-semibold',
                    isCurrent ? 'text-violet-300' : 'text-white/60'
                  )}>
                    {monthName} {year}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wider">
                      Actual
                    </span>
                  )}
                </div>

                {/* Payment slots */}
                <div className="p-2 space-y-1.5">
                  {isSemimonthly ? (
                    <>
                      <PaySlot period={period} subPeriod={1} isCurrent={isCurrent} />
                      <PaySlot period={period} subPeriod={2} isCurrent={isCurrent} />
                    </>
                  ) : (
                    <PaySlot period={period} subPeriod={1} isCurrent={isCurrent} />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {periods.length > 12 && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] text-center">
            <button
              onClick={() => setShowAll(v => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              {showAll
                ? <><ChevronUp className="w-3.5 h-3.5" /> Ver menos</>
                : <><ChevronDown className="w-3.5 h-3.5" /> Ver todos los {periods.length} meses</>
              }
            </button>
          </div>
        )}
      </GlassCard>

      {pendingConfirm && source.account && (
        <ConfirmIncomePaymentModal
          sourceId={source.id}
          sourceName={source.name}
          period={pendingConfirm.period}
          subPeriod={pendingConfirm.subPeriod}
          amount={pendingConfirm.amount}
          currency={source.currency}
          account={source.account}
          frequency={source.frequency}
          onClose={() => setPendingConfirm(null)}
          onConfirmed={() => {
            setPendingConfirm(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
