import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, Briefcase, TrendingUp, DollarSign,
  Calendar, BarChart3, Wallet,
} from 'lucide-react'
import { prisma } from '@wallet/db'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatMoney, cn } from '@/lib/utils'
import { IncomeDetailClient } from './IncomeDetailClient'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

function fmt(amount: number, currency: string) {
  return formatMoney({ amount, currency: currency as any })
}

const FREQ_LABELS: Record<string, string> = {
  weekly: 'Weekly', biweekly: 'Biweekly', semimonthly: 'Quincenal', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual',
}
const TYPE_LABELS: Record<string, string> = {
  salary: 'Salary', freelance: 'Freelance', rental: 'Rental',
  dividend: 'Dividend', bonus: 'Bonus', other: 'Other',
}

export default async function IncomeDetailPage({ params }: { params: { id: string } }) {
  const source = await prisma.incomeSource.findFirst({
    where: { id: params.id, tenantId: TENANT },
    include: {
      entries: { orderBy: [{ period: 'asc' }, { subPeriod: 'asc' }] },
      account: { select: { id: true, name: true, institution: true } },
    },
  })
  if (!source) notFound()

  const gross    = Number(source.grossAmount)
  const net      = source.netAmount ? Number(source.netAmount) : null
  const currency = source.currency

  // ── Intelligence ────────────────────────────────────────────────────────────
  const now         = new Date()
  const currentYear = now.getFullYear()

  const thisYearEntries = source.entries.filter(e => e.period.startsWith(`${currentYear}-`))
  const receivedEntries = thisYearEntries.filter(e => e.status === 'received')
  const partialEntries  = thisYearEntries.filter(e => e.status === 'partial')

  const ytdGross = [...receivedEntries, ...partialEntries]
    .reduce((s, e) => s + Number(e.actualAmount ?? gross), 0)

  // Monthly and yearly projections
  const monthsActive = source.startDate
    ? Math.max(1, Math.ceil((now.getTime() - new Date(source.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 12
  const annualGross  = gross * 12
  const annualNet    = net ? net * 12 : null

  // Tax wedge (difference gross → net)
  const monthlyTax   = net ? gross - net : null
  const annualTax    = monthlyTax ? monthlyTax * 12 : null
  const effectiveTaxRate = net ? ((gross - net) / gross) * 100 : null

  // Per-quincena (semi-monthly) calculation
  const netPerQuincena = net ? net / 2 : null

  // Received count
  const receivedCount = receivedEntries.length
  const partialCount  = partialEntries.length

  // ── Serialise for client ────────────────────────────────────────────────────
  const serialized = {
    id:        source.id,
    name:      source.name,
    employer:  source.employer,
    currency,
    grossAmount: gross,
    netAmount:   net,
    frequency:   source.frequency,
    accountId:   source.accountId,
    account:     source.account ?? null,
    entries: source.entries.map(e => ({
      id:             e.id,
      period:         e.period,
      subPeriod:      e.subPeriod,
      status:         e.status,
      expectedAmount: Number(e.expectedAmount),
      actualAmount:   e.actualAmount ? Number(e.actualAmount) : null,
      receivedAt:     e.receivedAt?.toISOString() ?? null,
      transactionId:  e.transactionId ?? null,
      note:           e.note ?? null,
    })),
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Back + Edit */}
      <div className="flex items-center justify-between">
        <Link href="/income" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Income
        </Link>
        <Link
          href={`/income/${params.id}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass border border-white/10 text-sm text-white/60 hover:text-white hover:border-violet-500/40 transition-all"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Link>
      </div>

      {/* Hero */}
      <div className="relative rounded-3xl p-7 overflow-hidden bg-gradient-to-br from-violet-950/60 via-[#0f0a1a] to-[#0f0f1a] border border-violet-500/15">
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-emerald-500/5 blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="text-white/40 text-sm">
                  {source.employer ?? TYPE_LABELS[source.type]} · {FREQ_LABELS[source.frequency] ?? source.frequency}
                </p>
                <h1 className="text-xl font-bold text-white mt-0.5">{source.name}</h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Monthly net</p>
              <p className="text-3xl font-bold text-white">{net ? fmt(net, currency) : fmt(gross, currency)}</p>
              {netPerQuincena && (
                <p className="text-sm text-white/40 mt-1">
                  ≈ {fmt(netPerQuincena, currency)}
                  <span className="text-white/20 ml-1">/ quincena</span>
                </p>
              )}
              {net && (
                <p className="text-[11px] text-white/20 mt-1">Gross {fmt(gross, currency)}</p>
              )}
            </div>
          </div>

          {/* YTD progress bar */}
          <div>
            <div className="flex justify-between text-xs text-white/30 mb-2">
              <span>{receivedCount} months received · {partialCount > 0 ? `${partialCount} partial · ` : ''}{currentYear} YTD</span>
              <span>
                {fmt(ytdGross, currency)} received so far
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all"
                style={{ width: `${Math.min(100, (ytdGross / annualGross) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-white/20 mt-1.5 text-right">
              {((ytdGross / annualGross) * 100).toFixed(1)}% of annual gross target ({fmt(annualGross, currency)})
            </p>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: DollarSign, iconColor: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/15',
            label: 'Annual Gross',
            value: fmt(annualGross, currency),
            sub: `${fmt(gross, currency)}/mo · includes aguinaldo`,
          },
          {
            icon: Wallet, iconColor: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/15',
            label: 'Annual Net (take-home)',
            value: annualNet ? fmt(annualNet, currency) : '—',
            sub: annualNet ? `${fmt(net!, currency)}/mo after deductions` : 'No net amount set',
          },
          {
            icon: BarChart3, iconColor: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/15',
            label: 'Annual Tax & Deductions',
            value: annualTax ? fmt(annualTax, currency) : '—',
            sub: effectiveTaxRate
              ? `${effectiveTaxRate.toFixed(1)}% effective rate · ${fmt(monthlyTax!, currency)}/mo`
              : 'ISR + IMSS + Fondo Ahorro',
          },
          {
            icon: Calendar, iconColor: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/15',
            label: `${currentYear} YTD Received`,
            value: fmt(ytdGross, currency),
            sub: `${receivedCount} full · ${partialCount} partial month${partialCount !== 1 ? 's' : ''}`,
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

      {/* Gross vs Net breakdown */}
      {net && (
        <GlassCard>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-5 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Gross → Net Analysis
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Gross salary / mo</p>
              <p className="text-xl font-bold text-white">{fmt(gross, currency)}</p>
              <p className="text-xs text-white/30 mt-0.5">{fmt(gross / 2, currency)} / quincena</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Deductions / mo</p>
              <p className="text-xl font-bold text-amber-400">-{fmt(monthlyTax!, currency)}</p>
              <p className="text-xs text-white/30 mt-0.5">ISR · IMSS · Fondo Ahorro · Caja</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Net take-home / mo</p>
              <p className="text-xl font-bold text-emerald-400">{fmt(net, currency)}</p>
              <p className="text-xs text-white/30 mt-0.5">{fmt(netPerQuincena!, currency)} / quincena</p>
            </div>
          </div>

          {/* Visual gross/net bar */}
          <div className="mt-5">
            <div className="flex text-[10px] text-white/30 justify-between mb-1.5">
              <span>Net {((net / gross) * 100).toFixed(0)}%</span>
              <span>Deductions {effectiveTaxRate!.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full rounded-l-full" style={{ width: `${(net / gross) * 100}%` }} />
              <div className="bg-amber-500 h-full flex-1 rounded-r-full" />
            </div>
          </div>

          {/* Annual totals */}
          <div className="mt-5 pt-5 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Annual gross</p>
              <p className="text-base font-semibold text-white">{fmt(annualGross, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Annual deductions</p>
              <p className="text-base font-semibold text-amber-400">-{fmt(annualTax!, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Annual net</p>
              <p className="text-base font-semibold text-emerald-400">{fmt(annualNet!, currency)}</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Interactive monthly entry table */}
      <IncomeDetailClient source={serialized as any} />
    </div>
  )
}
