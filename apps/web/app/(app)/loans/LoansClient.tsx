'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Clock, XCircle, Circle, ChevronLeft, ChevronRight, Plus, Landmark, TrendingDown, ArrowRight, CreditCard, Tag, ArrowUpRight } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatMoney, cn } from '@/lib/utils'
import { useGlobalLoader } from '@/components/ui/GlobalLoader'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type Payment = {
  id: string
  period: string
  status: string
  dueAmount: number
  paidAmount: number | null
  principalAmount: number | null
  interestAmount: number | null
  dueDate: string
}

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
  isActive: boolean
  notes: string | null
  linkedAccountId: string | null
  payments: Payment[]
}

const STATUS_CONFIG = {
  paid:      { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', label: 'Paid'      },
  scheduled: { icon: Clock,        color: 'text-white/30',    bg: 'bg-white/[0.04] border-white/10',         label: 'Scheduled' },
  partial:   { icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30',     label: 'Partial'   },
  missed:    { icon: XCircle,      color: 'text-rose-400',    bg: 'bg-rose-500/15 border-rose-500/30',       label: 'Missed'    },
  skipped:   { icon: Circle,       color: 'text-white/20',    bg: 'bg-white/[0.02] border-white/5',          label: 'Skipped'   },
}

// ── Payment confirmation modal ────────────────────────────────────────────────

function PaymentConfirmModal({
  loan,
  period,
  monthLabel,
  onMarkOnly,
  onClose,
}: {
  loan: Loan
  period: string
  monthLabel: string
  onMarkOnly: () => void
  onClose: () => void
}) {
  const router = useRouter()
  const amount = Number(loan.monthlyPayment)
  const currency = loan.currency

  function handleCreateTransaction() {
    const params = new URLSearchParams({
      type:     'expense',
      amount:   amount.toString(),
      currency,
      category: 'Loan Payment',
      payee:    loan.lender,
      note:     `${loan.name} — ${monthLabel}`,
      date:     `${period}-01`,
      ...(loan.linkedAccountId ? { accountId: loan.linkedAccountId } : {}),
    })
    router.push(`/transactions/new?${params.toString()}`)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
      {/* Full-page backdrop — covers sidebar + main */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(4,6,10,0.82)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        onClick={onClose}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/[0.10] bg-[#0b0e17] overflow-hidden"
        style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 40px 100px rgba(0,0,0,0.9)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Amber top glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Mark payment as paid</p>
              <p className="text-xs text-white/35 mt-0.5">{loan.name} · {monthLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-white/25 hover:text-white/60 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-[-90deg]" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Summary rows */}
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] divide-y divide-white/[0.06]">
            {[
              { label: 'Amount', value: formatMoney({ amount, currency: currency as any }), bold: true },
              { label: 'Lender', value: loan.lender },
              { label: 'Period', value: period },
            ].map(({ label, value, bold }) => (
              <div key={label} className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-white/40">{label}</span>
                <span className={`text-sm tabular-nums ${bold ? 'font-semibold text-white' : 'text-white/60'}`}>{value}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-white/30 leading-relaxed">
            Do you want to also log a transaction record, or just mark this payment as paid?
          </p>

          {/* Action buttons */}
          <div className="space-y-2.5">
            <button
              onClick={onMarkOnly}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/35 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Tag className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-emerald-300">Just mark as paid</p>
                <p className="text-xs text-white/30 mt-0.5">Update status only — no transaction created</p>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-500/40 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={handleCreateTransaction}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-white/[0.04] border border-white/[0.09] hover:bg-white/[0.07] hover:border-white/[0.14] transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-4 h-4 text-white/60" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-white/80">Create transaction</p>
                <p className="text-xs text-white/30 mt-0.5">Log this payment to your account + mark as paid</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-all" />
            </button>
          </div>

          <button onClick={onClose} className="w-full text-xs text-white/20 hover:text-white/50 transition-colors py-1">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Payment cell ──────────────────────────────────────────────────────────────

function PaymentCell({
  loan, year, monthIdx, payment, onUpdate,
}: {
  loan: Loan; year: number; monthIdx: number; payment?: Payment; onUpdate: () => void
}) {
  const { show, hide } = useGlobalLoader()
  const [confirming, setConfirming] = useState(false)
  const period = `${year}-${String(monthIdx + 1).padStart(2, '0')}`
  const now = new Date()
  const isCurrent = year === now.getFullYear() && monthIdx === now.getMonth()
  const status = payment?.status ?? 'scheduled'
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.scheduled
  const Icon = cfg.icon

  function handleClick() {
    if (status === 'paid') {
      // Unpaying doesn't need confirmation
      markAs('scheduled')
    } else {
      setConfirming(true)
    }
  }

  async function markAs(nextStatus: string) {
    setConfirming(false)
    show()
    await fetch(`/api/loans/${loan.id}/payments/${period}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    onUpdate()
    hide()
  }

  return (
    <>
      <button
        onClick={handleClick}
        title={`${MONTHS[monthIdx]} ${year}: ${cfg.label} — click to toggle`}
        className={cn(
          'flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all hover:scale-105 active:scale-95',
          cfg.bg,
          isCurrent && 'ring-1 ring-amber-400/40'
        )}
      >
        <span className={cn('text-[10px] font-semibold uppercase', cfg.color)}>{MONTHS[monthIdx]}</span>
        <Icon className={cn('w-4 h-4', cfg.color)} />
      </button>

      {confirming && (
        <PaymentConfirmModal
          loan={loan}
          period={period}
          monthLabel={`${MONTHS[monthIdx]} ${year}`}
          onMarkOnly={() => markAs('paid')}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  )
}

function LoanCard({ loan, year, onUpdate }: { loan: Loan; year: number; onUpdate: () => void }) {
  const paymentMap = Object.fromEntries(loan.payments.map((p) => [p.period, p]))
  const yearPayments = Array.from({ length: 12 }, (_, i) => {
    const period = `${year}-${String(i + 1).padStart(2, '0')}`
    return paymentMap[period]
  })

  const paid   = yearPayments.filter((p) => p?.status === 'paid').length
  const missed = yearPayments.filter((p) => p?.status === 'missed').length
  const progress = Math.round(((Number(loan.originalAmount) - Number(loan.currentBalance)) / Number(loan.originalAmount)) * 100)

  const totalPaidThisYear = yearPayments
    .filter((p) => p?.status === 'paid')
    .reduce((s, p) => s + (p?.paidAmount ?? Number(loan.monthlyPayment)), 0)

  return (
    <GlassCard>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <Link href={`/loans/${loan.id}`} className="text-sm font-semibold text-white hover:text-amber-300 transition-colors">
              {loan.name}
            </Link>
            <p className="text-xs text-white/40 mt-0.5">{loan.lender} · {loan.type.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40 uppercase tracking-wider">Remaining</p>
          <p className="text-base font-bold text-rose-400 mt-0.5">
            {formatMoney({ amount: Number(loan.currentBalance), currency: loan.currency as any })}
          </p>
          <p className="text-xs text-white/30 mt-0.5">
            of {formatMoney({ amount: Number(loan.originalAmount), currency: loan.currency as any })}
          </p>
        </div>
      </div>

      {/* Monthly payment + progress */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Monthly Payment</p>
            <p className="text-2xl font-bold text-white">
              {formatMoney({ amount: Number(loan.monthlyPayment), currency: loan.currency as any })}
              <span className="text-sm font-medium text-white/40 ml-1">/mo</span>
            </p>
          </div>
          <p className="text-xs text-white/30 mb-1">{loan.interestRate}% APR</p>
        </div>
        <div className="flex justify-between text-[10px] text-white/30 mb-1.5">
          <span>{progress}% paid off · {paid} of {loan.termMonths} payments</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-6 py-3 mb-4 border-y border-white/[0.06]">
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Paid this year</p>
          <p className="text-sm font-bold text-emerald-400 mt-0.5">{paid} payments</p>
        </div>
        {missed > 0 && (
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Missed</p>
            <p className="text-sm font-bold text-rose-400 mt-0.5">{missed}</p>
          </div>
        )}
        <div className="ml-auto text-right">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Total paid {year}</p>
          <p className="text-sm font-bold text-white mt-0.5">
            {formatMoney({ amount: totalPaidThisYear, currency: loan.currency as any })}
          </p>
        </div>
      </div>

      {/* Year calendar */}
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
        {Array.from({ length: 12 }, (_, i) => (
          <PaymentCell
            key={i}
            loan={loan}
            year={year}
            monthIdx={i}
            payment={yearPayments[i]}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/[0.06]">
        <Link href={`/loans/${loan.id}`} className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-amber-300 transition-colors">
          View full details & amortization <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </GlassCard>
  )
}

// ── Add Loan Modal ─────────────────────────────────────────────────────────────

function AddLoanModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', lender: '', type: 'personal', currency: 'MXN',
    originalAmount: '', currentBalance: '', interestRate: '',
    monthlyPayment: '', termMonths: '', startDate: '', notes: '',
  })

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  function calcEndDate() {
    if (!form.startDate || !form.termMonths) return ''
    const d = new Date(form.startDate)
    d.setMonth(d.getMonth() + parseInt(form.termMonths))
    return d.toISOString().slice(0, 10)
  }

  async function save() {
    setSaving(true)
    const endDate = calcEndDate()
    await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name, lender: form.lender, type: form.type, currency: form.currency,
        originalAmount:  parseFloat(form.originalAmount),
        currentBalance:  parseFloat(form.currentBalance || form.originalAmount),
        interestRate:    parseFloat(form.interestRate),
        monthlyPayment:  parseFloat(form.monthlyPayment),
        termMonths:      parseInt(form.termMonths),
        startDate:       form.startDate,
        endDate,
        notes: form.notes || undefined,
      }),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  const valid = form.name && form.lender && form.originalAmount && form.monthlyPayment && form.termMonths && form.startDate

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-white/[0.08] bg-[#0a0d14] backdrop-blur-2xl p-6 space-y-4 my-8">
        <h2 className="text-base font-semibold text-white">Add Loan / Credit</h2>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Loan Name', key: 'name', placeholder: 'Invex Volaris', col: 2 },
            { label: 'Lender',    key: 'lender', placeholder: 'Invex', col: 2 },
            { label: 'Original Amount', key: 'originalAmount', placeholder: '0.00', type: 'number' },
            { label: 'Current Balance', key: 'currentBalance', placeholder: 'Leave blank if new', type: 'number' },
            { label: 'Interest Rate (APR %)', key: 'interestRate', placeholder: '18.5', type: 'number' },
            { label: 'Monthly Payment', key: 'monthlyPayment', placeholder: '0.00', type: 'number' },
            { label: 'Term (months)', key: 'termMonths', placeholder: '36', type: 'number' },
            { label: 'Start Date', key: 'startDate', type: 'date' },
          ].map(({ label, key, placeholder, type, col }) => (
            <div key={key} className={col === 2 ? 'col-span-2' : ''}>
              <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">{label}</label>
              <input type={type ?? 'text'} value={(form as any)[key]} onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/40 transition-colors" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Currency</label>
            <select value={form.currency} onChange={(e) => set('currency', e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/40 transition-colors">
              {['MXN','GTQ','USD'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Type</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/40 transition-colors">
              <option value="personal">Personal</option>
              <option value="auto">Auto</option>
              <option value="mortgage">Mortgage</option>
              <option value="student">Student</option>
              <option value="credit_line">Credit Line</option>
            </select>
          </div>
        </div>

        {form.startDate && form.termMonths && (
          <p className="text-xs text-white/30">
            Payoff date: <span className="text-white/60 font-medium">{calcEndDate()}</span>
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={save} disabled={saving || !valid}
            className="flex-1 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-sm font-semibold transition-all disabled:opacity-40">
            {saving ? 'Saving…' : 'Add Loan'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function LoansClient({ initialLoans }: { initialLoans: Loan[] }) {
  const router = useRouter()
  const [year, setYear] = useState(new Date().getFullYear())
  const [showAdd, setShowAdd] = useState(false)

  function refresh() { router.refresh() }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y - 1)} className="p-2 rounded-lg border border-white/[0.06] bg-[#0a0d14]/60 hover:border-white/[0.12] transition-colors">
            <ChevronLeft className="w-4 h-4 text-white/50" />
          </button>
          <span className="text-lg font-bold text-white w-16 text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} disabled={year >= new Date().getFullYear() + 5}
            className="p-2 rounded-lg border border-white/[0.06] bg-[#0a0d14]/60 hover:border-white/[0.12] transition-colors disabled:opacity-30">
            <ChevronRight className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-sm font-semibold transition-all">
          <Plus className="w-4 h-4" /> Add Loan
        </button>
      </div>

      {initialLoans.length === 0 ? (
        <GlassCard>
          <div className="py-12 text-center">
            <TrendingDown className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No loans tracked yet</p>
            <p className="text-white/20 text-xs mt-1">Click "Add Loan" to track your credits</p>
          </div>
        </GlassCard>
      ) : (
        initialLoans.map((loan) => (
          <LoanCard key={loan.id} loan={loan} year={year} onUpdate={refresh} />
        ))
      )}

      {showAdd && <AddLoanModal onClose={() => setShowAdd(false)} onSaved={refresh} />}
    </div>
  )
}
