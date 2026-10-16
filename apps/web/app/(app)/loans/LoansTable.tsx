'use client'

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowUpDown, ArrowUp, ArrowDown, Landmark, EyeOff, X } from 'lucide-react'
import { formatMoney, cn } from '@/lib/utils'

type Payment = { status: string; principalAmount: number | null }

type Loan = {
  id: string
  name: string
  lender: string
  type: string
  currency: string
  originalAmount: number
  currentBalance: number
  interestRate: number
  monthlyPayment: number
  termMonths: number
  startDate: string
  endDate: string
  payments: Payment[]
}

function progressGradient(pct: number): string {
  const startHue = Math.round(Math.min(pct, 100) * 1.42)
  return `linear-gradient(to right, hsl(${startHue}, 80%, 50%), hsl(142, 76%, 48%))`
}

type SortKey = 'name' | 'lender' | 'originalAmount' | 'currentBalance' | 'monthlyPayment' | 'interestRate' | 'pctPaid' | 'paymentsLeft'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
    : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
}

function HideConfirmModal({
  count,
  onConfirm,
  onClose,
}: {
  count: number
  onConfirm: () => void
  onClose: () => void
}) {
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(4,6,10,0.82)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/[0.10] bg-[#0b0e17] overflow-hidden"
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 40px 100px rgba(0,0,0,0.9)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/40 to-transparent" />
        <div className="px-6 pt-6 pb-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <EyeOff className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Hide {count} loan{count !== 1 ? 's' : ''}?</p>
              <p className="text-xs text-white/35 mt-0.5">They won't appear in the list anymore</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-white/40 leading-relaxed">
            Hidden loans are deactivated and won't show in your loans page or payment summary. This can be undone from the database.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold transition-all"
            >
              Hide {count === 1 ? 'loan' : `${count} loans`}
            </button>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function LoansTable({ loans }: { loans: Loan[] }) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('pctPaid')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [hiding, setHiding] = useState(false)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === loans.length) setSelected(new Set())
    else setSelected(new Set(loans.map(l => l.id)))
  }

  async function hideSelected() {
    setHiding(true)
    await Promise.all(
      Array.from(selected).map(id =>
        fetch(`/api/loans/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false }),
        })
      )
    )
    setSelected(new Set())
    setConfirming(false)
    setHiding(false)
    router.refresh()
  }

  const enriched = useMemo(() => loans.map(loan => {
    const paidPayments = loan.payments.filter(p => p.status === 'paid')
    const totalPrincipalPaid = paidPayments.reduce((s, p) => s + Number(p.principalAmount ?? 0), 0)
    const pctPaid = loan.originalAmount > 0 ? (totalPrincipalPaid / loan.originalAmount) * 100 : 0
    const paymentsLeft = loan.payments.filter(p => p.status === 'scheduled' || p.status === 'partial').length
    const totalInterest = loan.payments.reduce((s, p: any) => s + Number(p.interestAmount ?? 0), 0)
    return { ...loan, pctPaid, paymentsLeft, paidCount: paidPayments.length, totalInterest }
  }), [loans])

  const sorted = useMemo(() => [...enriched].sort((a, b) => {
    let av: string | number = 0
    let bv: string | number = 0
    switch (sortKey) {
      case 'name':           av = a.name.toLowerCase();    bv = b.name.toLowerCase();    break
      case 'lender':         av = a.lender.toLowerCase();  bv = b.lender.toLowerCase();  break
      case 'originalAmount': av = a.originalAmount;        bv = b.originalAmount;        break
      case 'currentBalance': av = a.currentBalance;        bv = b.currentBalance;        break
      case 'monthlyPayment': av = a.monthlyPayment;        bv = b.monthlyPayment;        break
      case 'interestRate':   av = a.interestRate;          bv = b.interestRate;          break
      case 'pctPaid':        av = a.pctPaid;               bv = b.pctPaid;               break
      case 'paymentsLeft':   av = a.paymentsLeft;          bv = b.paymentsLeft;          break
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  }), [enriched, sortKey, sortDir])

  const headers: { key: SortKey; label: string; tooltip: string; align?: 'right' | 'center' }[] = [
    { key: 'name',           label: 'Loan',      tooltip: 'The name and institution of the loan'                                                                         },
    { key: 'lender',         label: 'Lender',    tooltip: 'The bank or institution that issued the loan'                                                                 },
    { key: 'originalAmount', label: 'Original',  tooltip: 'The principal amount borrowed at the start of the loan',                                        align: 'right' },
    { key: 'currentBalance', label: 'Balance',   tooltip: 'The outstanding capital still owed — does not include upcoming interest',                        align: 'right' },
    { key: 'monthlyPayment', label: 'Monthly',   tooltip: 'Fixed payment due each month, covering both principal and interest',                             align: 'right' },
    { key: 'interestRate',   label: 'APR',       tooltip: 'Annual Percentage Rate — the yearly interest rate charged on the outstanding balance. Higher = more expensive.', align: 'right' },
    { key: 'pctPaid',        label: '% Paid',    tooltip: 'How much of the original principal has been paid off so far',                                   align: 'center' },
    { key: 'paymentsLeft',   label: 'Remaining', tooltip: 'Number of monthly payments left until the loan is fully paid off',                              align: 'center' },
  ]

  const allChecked = loans.length > 0 && selected.size === loans.length
  const someChecked = selected.size > 0 && selected.size < loans.length

  return (
    <div className="space-y-3">
      {/* Action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-2.5">
          <span className="text-xs text-white/50">{selected.size} selected</span>
          <button
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/25 text-rose-400 text-xs font-semibold hover:bg-rose-500/25 transition-all"
          >
            <EyeOff className="w-3.5 h-3.5" />
            Hide
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto inline-flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        </div>
      )}

      <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14]/80 backdrop-blur-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white/[0.03] border-b border-white/[0.06]">
              <th className="w-10 px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked }}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded border-white/20 bg-white/[0.04] accent-amber-400 cursor-pointer"
                />
              </th>
              {headers.map(({ key, label, tooltip, align }) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  title={tooltip}
                  className={cn(
                    'px-4 py-3.5 text-[11px] font-semibold text-white/30 uppercase tracking-[0.08em] cursor-pointer select-none hover:text-white/60 transition-colors group/th relative',
                    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {label} <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                  </span>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 hidden group-hover/th:block pointer-events-none">
                    <div className="bg-[#0d1017] border border-white/[0.08] text-white/60 text-[11px] leading-relaxed rounded-lg px-3 py-2 w-56 shadow-xl">
                      {tooltip}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {sorted.map(loan => {
              const isSelected = selected.has(loan.id)
              return (
                <tr key={loan.id} className={cn('group hover:bg-white/[0.03] transition-colors', isSelected && 'bg-amber-400/[0.04]')}>
                  <td className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(loan.id)}
                      className="w-3.5 h-3.5 rounded border-white/20 bg-white/[0.04] accent-amber-400 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <Link href={`/loans/${loan.id}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                        <Landmark className="w-3.5 h-3.5 text-rose-400" />
                      </div>
                      <span className="text-sm font-medium text-white/90 group-hover:text-amber-300 transition-colors">
                        {loan.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-white/60">{loan.lender}</td>
                  <td className="px-4 py-3.5 text-right text-sm tabular-nums">
                    <span className="text-white/60">{formatMoney({ amount: loan.originalAmount, currency: loan.currency as any })}</span>
                    <span className="text-white/25 text-[10px] ml-1">{loan.currency}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-sm font-semibold text-rose-400 tabular-nums">
                      {formatMoney({ amount: loan.currentBalance, currency: loan.currency as any })}
                    </span>
                    <span className="text-white/25 text-[10px] ml-1">{loan.currency}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-sm font-bold text-white tabular-nums">
                      {formatMoney({ amount: loan.monthlyPayment, currency: loan.currency as any })}
                    </span>
                    <span className="text-white/25 text-[10px] ml-1">{loan.currency}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={cn(
                      'text-sm font-semibold tabular-nums',
                      loan.interestRate >= 30 ? 'text-rose-400' : loan.interestRate >= 20 ? 'text-amber-400' : 'text-emerald-400'
                    )}>
                      {loan.interestRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-sm font-bold text-white tabular-nums">
                        {loan.pctPaid.toFixed(1)}%
                      </span>
                      <div className="w-20 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${loan.pctPaid}%`, background: progressGradient(loan.pctPaid) }}
                        />
                      </div>
                      <span className="text-[10px] text-white/30">
                        {loan.paidCount}/{loan.termMonths} paid
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div>
                      <span className="text-sm font-semibold text-white">{loan.paymentsLeft}</span>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {new Date(loan.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {loans.length === 0 && (
          <div className="py-16 text-center text-white/30 text-sm">No loans found</div>
        )}
      </div>

      {confirming && (
        <HideConfirmModal
          count={selected.size}
          onConfirm={hideSelected}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
