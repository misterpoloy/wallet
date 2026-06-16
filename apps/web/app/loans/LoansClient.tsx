'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Clock, XCircle, Circle, ChevronLeft, ChevronRight, Plus, Landmark, TrendingDown, ArrowRight } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatMoney, cn } from '@/lib/utils'

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
  payments: Payment[]
}

const STATUS_CONFIG = {
  paid:      { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', label: 'Paid'      },
  scheduled: { icon: Clock,        color: 'text-white/30',    bg: 'bg-white/[0.04] border-white/10',         label: 'Scheduled' },
  partial:   { icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30',     label: 'Partial'   },
  missed:    { icon: XCircle,      color: 'text-rose-400',    bg: 'bg-rose-500/15 border-rose-500/30',       label: 'Missed'    },
  skipped:   { icon: Circle,       color: 'text-white/20',    bg: 'bg-white/[0.02] border-white/5',          label: 'Skipped'   },
}

function PaymentCell({
  loanId, year, monthIdx, payment, currency, onUpdate,
}: {
  loanId: string; year: number; monthIdx: number; payment?: Payment; currency: string; onUpdate: () => void
}) {
  const [loading, setLoading] = useState(false)
  const period = `${year}-${String(monthIdx + 1).padStart(2, '0')}`
  const now = new Date()
  const isCurrent = year === now.getFullYear() && monthIdx === now.getMonth()
  const status = payment?.status ?? 'scheduled'
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.scheduled
  const Icon = cfg.icon

  async function toggle() {
    if (loading) return
    setLoading(true)
    const nextStatus = status === 'paid' ? 'scheduled' : 'paid'
    await fetch(`/api/loans/${loanId}/payments/${period}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    onUpdate()
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={`${MONTHS[monthIdx]} ${year}: ${cfg.label} — click to toggle`}
      className={cn(
        'flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all hover:scale-105 active:scale-95',
        cfg.bg,
        isCurrent && 'ring-1 ring-violet-500/50'
      )}
    >
      <span className={cn('text-[10px] font-semibold uppercase', cfg.color)}>{MONTHS[monthIdx]}</span>
      <Icon className={cn('w-4 h-4', cfg.color, loading && 'animate-pulse')} />
    </button>
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
            <Link href={`/loans/${loan.id}`} className="text-sm font-semibold text-white hover:text-violet-300 transition-colors">
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
            loanId={loan.id}
            year={year}
            monthIdx={i}
            payment={yearPayments[i]}
            currency={loan.currency}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/[0.06]">
        <Link href={`/loans/${loan.id}`} className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-violet-300 transition-colors">
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
      <div className="relative w-full max-w-md glass rounded-2xl p-6 space-y-4 bg-[#0f0f1a] my-8">
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
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Currency</label>
            <select value={form.currency} onChange={(e) => set('currency', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
              {['MXN','GTQ','USD'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Type</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
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
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all disabled:opacity-40">
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
          <button onClick={() => setYear(y => y - 1)} className="p-2 rounded-xl glass hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-4 h-4 text-white/60" />
          </button>
          <span className="text-lg font-bold text-white w-16 text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} disabled={year >= new Date().getFullYear() + 5}
            className="p-2 rounded-xl glass hover:bg-white/10 transition-colors disabled:opacity-30">
            <ChevronRight className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all">
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
