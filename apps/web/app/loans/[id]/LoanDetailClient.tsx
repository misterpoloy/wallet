'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, XCircle, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatMoney, cn } from '@/lib/utils'

type Payment = {
  id: string
  period: string
  status: string
  dueDate: string
  dueAmount: number
  paidAmount: number | null
  principalAmount: number | null
  interestAmount: number | null
  paidAt: string | null
  note: string | null
}

type Loan = {
  id: string
  currency: string
  monthlyPayment: number
  payments: Payment[]
}

const STATUS_ICON = {
  paid:      { Icon: CheckCircle2, color: 'text-emerald-400' },
  scheduled: { Icon: Clock,        color: 'text-white/25'    },
  partial:   { Icon: Clock,        color: 'text-amber-400'   },
  missed:    { Icon: XCircle,      color: 'text-rose-400'    },
  skipped:   { Icon: Circle,       color: 'text-white/15'    },
}

function fmt(amount: number, currency: string) {
  return formatMoney({ amount, currency: currency as any })
}

export function LoanDetailClient({ loan }: { loan: Loan }) {
  const router = useRouter()
  const [toggling, setToggling] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  async function togglePayment(payment: Payment) {
    setToggling(payment.period)
    const nextStatus = payment.status === 'paid' ? 'scheduled' : 'paid'
    await fetch(`/api/loans/${loan.id}/payments/${payment.period}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    router.refresh()
    setToggling(null)
  }

  const displayedPayments = showAll ? loan.payments : loan.payments.slice(0, 12)

  return (
    <GlassCard>
      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-5">
        Amortization Schedule · {loan.payments.length} payments
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className="text-left text-[10px] text-white/30 uppercase tracking-wider py-2.5 pr-4 font-semibold">#</th>
              <th className="text-left text-[10px] text-white/30 uppercase tracking-wider py-2.5 pr-4 font-semibold">Period</th>
              <th className="text-left text-[10px] text-white/30 uppercase tracking-wider py-2.5 pr-4 font-semibold">Due Date</th>
              <th className="text-right text-[10px] text-white/30 uppercase tracking-wider py-2.5 pr-4 font-semibold">Principal</th>
              <th className="text-right text-[10px] text-white/30 uppercase tracking-wider py-2.5 pr-4 font-semibold">Interest</th>
              <th className="text-right text-[10px] text-white/30 uppercase tracking-wider py-2.5 pr-4 font-semibold">Payment</th>
              <th className="text-center text-[10px] text-white/30 uppercase tracking-wider py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {displayedPayments.map((p, i) => {
              const isCurrent = p.period === currentPeriod
              const cfg = STATUS_ICON[p.status as keyof typeof STATUS_ICON] ?? STATUS_ICON.scheduled
              const { Icon } = cfg
              const isToggling = toggling === p.period

              // Calculate principal % of payment for mini bar
              const principalPct = p.principalAmount && p.dueAmount
                ? Math.round((p.principalAmount / p.dueAmount) * 100)
                : 0

              return (
                <tr
                  key={p.period}
                  className={cn(
                    'group transition-colors',
                    isCurrent ? 'bg-violet-500/[0.06]' : 'hover:bg-white/[0.02]'
                  )}
                >
                  <td className="py-3 pr-4">
                    <span className="text-xs text-white/30 tabular-nums font-mono">{String(i + 1).padStart(2, '0')}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-medium', isCurrent ? 'text-violet-300' : 'text-white/70')}>
                        {p.period}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wider">
                          Current
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs text-white/40">
                      {new Date(p.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <div>
                      <span className="text-sm font-medium text-emerald-400 tabular-nums">
                        {p.principalAmount ? fmt(p.principalAmount, loan.currency) : '—'}
                      </span>
                      {/* Mini principal/interest bar */}
                      <div className="h-0.5 rounded-full bg-white/[0.06] overflow-hidden mt-1 w-16 ml-auto">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${principalPct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-sm text-amber-400/80 tabular-nums">
                      {p.interestAmount ? fmt(p.interestAmount, loan.currency) : '—'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-sm font-semibold text-white tabular-nums">
                      {p.paidAmount ? fmt(p.paidAmount, loan.currency) : fmt(p.dueAmount, loan.currency)}
                    </span>
                    {p.paidAmount && Math.abs(p.paidAmount - p.dueAmount) > 0.01 && (
                      <p className="text-[10px] text-white/30">due {fmt(p.dueAmount, loan.currency)}</p>
                    )}
                  </td>
                  <td className="py-3 text-center">
                    <button
                      onClick={() => togglePayment(p)}
                      disabled={!!isToggling}
                      title={`Mark as ${p.status === 'paid' ? 'scheduled' : 'paid'}`}
                      className="inline-flex items-center gap-1.5 transition-all hover:scale-105 disabled:opacity-50"
                    >
                      <Icon className={cn('w-4 h-4 transition-all', cfg.color, isToggling && 'animate-pulse')} />
                      <span className={cn('text-[10px] font-medium hidden group-hover:inline', cfg.color)}>
                        {p.status === 'paid' ? 'undo' : 'mark paid'}
                      </span>
                    </button>
                    {p.paidAt && (
                      <p className="text-[9px] text-white/20 mt-0.5">
                        {new Date(p.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {loan.payments.length > 12 && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] text-center">
          <button
            onClick={() => setShowAll(v => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            {showAll ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> Show all {loan.payments.length} payments</>
            )}
          </button>
        </div>
      )}
    </GlassCard>
  )
}
