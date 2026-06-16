import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Landmark, CheckCircle2, Clock, XCircle, TrendingDown, Calendar, Percent, DollarSign, BarChart3 } from 'lucide-react'
import { prisma } from '@wallet/db'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatMoney, cn } from '@/lib/utils'
import { LoanDetailClient } from './LoanDetailClient'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmt(amount: number, currency: string) {
  return formatMoney({ amount, currency: currency as any })
}

const STATUS_CONFIG = {
  paid:      { label: 'Paid',      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  scheduled: { label: 'Scheduled', color: 'text-white/30',    bg: 'bg-white/[0.03] border-white/[0.06]'     },
  partial:   { label: 'Partial',   color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20'     },
  missed:    { label: 'Missed',    color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/20'       },
  skipped:   { label: 'Skipped',   color: 'text-white/20',    bg: 'bg-white/[0.02] border-white/5'          },
}

export default async function LoanDetailPage({ params }: { params: { id: string } }) {
  const loan = await prisma.loan.findFirst({
    where: { id: params.id, tenantId: TENANT },
    include: { payments: { orderBy: { period: 'asc' } } },
  })
  if (!loan) notFound()

  const original       = Number(loan.originalAmount)
  const currentBalance = Number(loan.currentBalance)
  const monthly        = Number(loan.monthlyPayment)
  const annualRate     = Number(loan.interestRate)
  const monthlyRate    = annualRate / 100 / 12

  // ── Intelligence calculations ──────────────────────────────────────────────

  const paidPayments     = loan.payments.filter(p => p.status === 'paid')
  const remainingPayments = loan.payments.filter(p => p.status === 'scheduled' || p.status === 'partial')

  const totalPaid        = paidPayments.reduce((s, p) => s + Number(p.paidAmount ?? p.dueAmount), 0)
  const totalPrincipalPaid = paidPayments.reduce((s, p) => s + Number(p.principalAmount ?? 0), 0)
  const totalInterestPaid  = paidPayments.reduce((s, p) => s + Number(p.interestAmount ?? 0), 0)

  const totalScheduledInterest = loan.payments.reduce((s, p) => s + Number(p.interestAmount ?? 0), 0)
  const totalRemainingInterest = remainingPayments.reduce((s, p) => s + Number(p.interestAmount ?? 0), 0)
  const totalCostOfCredit      = original + totalScheduledInterest

  const annualInterest   = original * (annualRate / 100)
  const currentMonthInterest = currentBalance * monthlyRate
  const currentMonthPrincipal = monthly - currentMonthInterest

  const progressPct = Math.round((totalPrincipalPaid / original) * 100)
  const paymentsLeft = remainingPayments.length
  const monthsElapsed = paidPayments.length

  // Payoff date
  const endDate = new Date(loan.endDate)

  // ── Serialise for client ───────────────────────────────────────────────────
  const serialized = {
    ...loan,
    originalAmount:  original,
    currentBalance,
    interestRate:    annualRate,
    monthlyPayment:  monthly,
    startDate:       loan.startDate.toISOString(),
    endDate:         loan.endDate.toISOString(),
    createdAt:       loan.createdAt.toISOString(),
    updatedAt:       loan.updatedAt.toISOString(),
    payments: loan.payments.map(p => ({
      ...p,
      dueAmount:       Number(p.dueAmount),
      paidAmount:      p.paidAmount ? Number(p.paidAmount) : null,
      principalAmount: p.principalAmount ? Number(p.principalAmount) : null,
      interestAmount:  p.interestAmount ? Number(p.interestAmount) : null,
      dueDate:         p.dueDate.toISOString(),
      paidAt:          p.paidAt?.toISOString() ?? null,
      createdAt:       p.createdAt.toISOString(),
      updatedAt:       p.updatedAt.toISOString(),
    })),
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Back */}
      <Link href="/loans" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Loans
      </Link>

      {/* Hero */}
      <div className="relative rounded-3xl p-7 overflow-hidden bg-gradient-to-br from-rose-950/60 via-[#1a0a0a] to-[#0f0f1a] border border-rose-500/15">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-rose-500/5 blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Landmark className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <p className="text-white/50 text-sm">{loan.lender} · {loan.type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                <h1 className="text-xl font-bold text-white mt-0.5">{loan.name}</h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-xs uppercase tracking-wider">Remaining Balance</p>
              <p className="text-3xl font-bold text-rose-300 mt-1">{fmt(currentBalance, loan.currency)}</p>
              <p className="text-xs text-white/30 mt-0.5">of {fmt(original, loan.currency)} original</p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-white/30 mb-2">
              <span>{progressPct}% paid off · {monthsElapsed} of {loan.termMonths} payments</span>
              <span>Payoff {endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-emerald-400 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: DollarSign, iconColor: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/15',
            label: 'Monthly Payment',
            value: fmt(monthly, loan.currency),
            sub: `≈ ${fmt(currentMonthInterest, loan.currency)} interest · ${fmt(currentMonthPrincipal, loan.currency)} principal`,
          },
          {
            icon: Percent, iconColor: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/15',
            label: 'Annual Interest Rate',
            value: `${annualRate.toFixed(2)}%`,
            sub: `${(monthlyRate * 100).toFixed(4)}% monthly effective`,
          },
          {
            icon: BarChart3, iconColor: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/15',
            label: 'Annual Interest Cost',
            value: fmt(annualInterest, loan.currency),
            sub: `${fmt(currentMonthInterest, loan.currency)} this month at current balance`,
          },
          {
            icon: Calendar, iconColor: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/15',
            label: 'Payments Remaining',
            value: `${paymentsLeft} months`,
            sub: `${fmt(paymentsLeft * monthly, loan.currency)} total left to pay`,
          },
        ].map(({ icon: Icon, iconColor, bg, label, value, sub }) => (
          <GlassCard key={label} className="!p-4">
            <div className={cn('w-8 h-8 rounded-xl border flex items-center justify-center mb-3', bg)}>
              <Icon className={cn('w-4 h-4', iconColor)} />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
            <p className="text-lg font-bold text-white mt-1">{value}</p>
            <p className="text-[10px] text-white/30 mt-1 leading-relaxed">{sub}</p>
          </GlassCard>
        ))}
      </div>

      {/* Cost of Credit breakdown */}
      <GlassCard>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-5 flex items-center gap-1.5">
          <TrendingDown className="w-3.5 h-3.5" /> Cost of Credit Analysis
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Principal Borrowed</p>
            <p className="text-xl font-bold text-white">{fmt(original, loan.currency)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Total Interest (life of loan)</p>
            <p className="text-xl font-bold text-amber-400">{fmt(totalScheduledInterest, loan.currency)}</p>
            <p className="text-xs text-white/30 mt-0.5">{((totalScheduledInterest / original) * 100).toFixed(1)}% of principal</p>
          </div>
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Total Cost of Credit</p>
            <p className="text-xl font-bold text-rose-300">{fmt(totalCostOfCredit, loan.currency)}</p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Interest Paid to Date</p>
            <p className="text-base font-semibold text-white">{fmt(totalInterestPaid, loan.currency)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Interest Remaining</p>
            <p className="text-base font-semibold text-white">{fmt(totalRemainingInterest, loan.currency)}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Principal Paid</p>
            <p className="text-base font-semibold text-emerald-400">{fmt(totalPrincipalPaid, loan.currency)}</p>
            <p className="text-xs text-white/30 mt-0.5">{progressPct}% of original</p>
          </div>
        </div>

        {/* Visual split bar */}
        <div className="mt-5">
          <div className="flex text-[10px] text-white/30 justify-between mb-1.5">
            <span>Principal {((original / totalCostOfCredit) * 100).toFixed(0)}%</span>
            <span>Interest {((totalScheduledInterest / totalCostOfCredit) * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex">
            <div className="bg-violet-500 h-full" style={{ width: `${(original / totalCostOfCredit) * 100}%` }} />
            <div className="bg-amber-500 h-full flex-1" />
          </div>
        </div>
      </GlassCard>

      {/* Full amortization table — interactive (client) */}
      <LoanDetailClient loan={serialized as any} />
    </div>
  )
}
