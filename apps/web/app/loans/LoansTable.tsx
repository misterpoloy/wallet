'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowUpDown, ArrowUp, ArrowDown, Landmark } from 'lucide-react'
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

type SortKey = 'name' | 'lender' | 'originalAmount' | 'currentBalance' | 'monthlyPayment' | 'interestRate' | 'pctPaid' | 'paymentsLeft'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 text-violet-400" />
    : <ArrowDown className="w-3.5 h-3.5 text-violet-400" />
}

export function LoansTable({ loans }: { loans: Loan[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('pctPaid')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
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

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.07]">
            {headers.map(({ key, label, tooltip, align }) => (
              <th
                key={key}
                onClick={() => toggleSort(key)}
                title={tooltip}
                className={cn(
                  'px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider cursor-pointer select-none hover:text-white/70 transition-colors group/th relative',
                  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {label} <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                </span>
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 hidden group-hover/th:block pointer-events-none">
                  <div className="bg-[#1a1a2e] border border-white/10 text-white/70 text-[11px] leading-relaxed rounded-xl px-3 py-2 w-56 shadow-xl">
                    {tooltip}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {sorted.map(loan => (
            <tr key={loan.id} className="group hover:bg-white/[0.03] transition-colors cursor-pointer">
              <td className="px-4 py-3.5">
                <Link href={`/loans/${loan.id}`} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                    <Landmark className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <span className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors">
                    {loan.name}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3.5 text-sm text-white/60">{loan.lender}</td>
              <td className="px-4 py-3.5 text-right text-sm text-white/60 tabular-nums">
                {formatMoney({ amount: loan.originalAmount, currency: loan.currency as any })}
              </td>
              <td className="px-4 py-3.5 text-right">
                <span className="text-sm font-semibold text-rose-400 tabular-nums">
                  {formatMoney({ amount: loan.currentBalance, currency: loan.currency as any })}
                </span>
              </td>
              <td className="px-4 py-3.5 text-right">
                <span className="text-sm font-bold text-white tabular-nums">
                  {formatMoney({ amount: loan.monthlyPayment, currency: loan.currency as any })}
                </span>
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
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-emerald-400"
                      style={{ width: `${loan.pctPaid}%` }}
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
          ))}
        </tbody>
      </table>

      {loans.length === 0 && (
        <div className="py-16 text-center text-white/30 text-sm">No loans found</div>
      )}
    </div>
  )
}
