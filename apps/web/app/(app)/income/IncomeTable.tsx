'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpDown, ArrowUp, ArrowDown, Briefcase, CheckCircle2, Clock, XCircle, Circle } from 'lucide-react'
import { formatMoney, cn } from '@/lib/utils'

type Entry = {
  id: string; period: string; status: string
  expectedAmount: number; actualAmount: number | null; receivedAt: string | null
}
type Source = {
  id: string; name: string; employer: string | null; type: string
  currency: string; grossAmount: number; netAmount: number | null
  frequency: string; isActive: boolean; entries: Entry[]
}

const FX_TO_USD: Record<string, number> = {
  MXN: 1 / 19.2, GTQ: 1 / 7.7, USD: 1, EUR: 1.09, COP: 1 / 4100,
}
const FREQ_MULT: Record<string, number> = {
  weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, monthly: 1, quarterly: 1 / 3, annual: 1 / 12,
}

type SortKey = 'name' | 'employer' | 'grossAmount' | 'ytdReceived' | 'receivedMonths' | 'frequency' | 'yearlyNet' | 'usdMonthly'
type SortDir = 'asc' | 'desc'

const STATUS_CONFIG = {
  received: { icon: CheckCircle2, color: 'text-emerald-400' },
  expected: { icon: Clock,        color: 'text-white/30'    },
  partial:  { icon: Clock,        color: 'text-amber-400'   },
  missed:   { icon: XCircle,      color: 'text-rose-400'    },
  skipped:  { icon: Circle,       color: 'text-white/15'    },
}

const FREQ_LABELS: Record<string, string> = {
  weekly: 'Weekly', biweekly: 'Biweekly', semimonthly: 'Quincenal', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual',
}
const TYPE_LABELS: Record<string, string> = {
  salary: 'Salary', freelance: 'Freelance', rental: 'Rental',
  dividend: 'Dividend', bonus: 'Bonus', other: 'Other',
}
const TYPE_COLORS: Record<string, string> = {
  salary: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  bonus:  'bg-amber-500/15 text-amber-300 border-amber-500/25',
  freelance: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  rental: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
  dividend: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
  other: 'bg-white/5 text-white/50 border-white/10',
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3 h-3 opacity-30" />
  return sortDir === 'asc'
    ? <ArrowUp className="w-3 h-3 text-violet-400" />
    : <ArrowDown className="w-3 h-3 text-violet-400" />
}

function MonthDots({ source, year }: { source: Source; year: number }) {
  const now = new Date()
  const entryMap = Object.fromEntries(source.entries.map(e => [e.period, e]))

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 12 }, (_, i) => {
        const period = `${year}-${String(i + 1).padStart(2, '0')}`
        const entry  = entryMap[period]
        const isPast = new Date(year, i, 28) < now
        const isCurrent = year === now.getFullYear() && i === now.getMonth()
        const status = entry?.status ?? (isPast || isCurrent ? 'expected' : null)

        if (!status) return (
          <div key={i} title={MONTHS[i]} className="w-3.5 h-3.5 rounded-sm bg-white/[0.04]" />
        )

        const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
        const bg =
          status === 'received' ? 'bg-emerald-500/60' :
          status === 'partial'  ? 'bg-amber-500/60'   :
          status === 'missed'   ? 'bg-rose-500/60'    :
          status === 'skipped'  ? 'bg-white/5'        :
          'bg-white/10'

        return (
          <div
            key={i}
            title={`${MONTHS[i]}: ${status}`}
            className={cn(
              'w-3.5 h-3.5 rounded-sm transition-all',
              bg,
              isCurrent && 'ring-1 ring-violet-400'
            )}
          />
        )
      })}
    </div>
  )
}

export function IncomeTable({ sources, year }: { sources: Source[]; year: number }) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('grossAmount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const enriched = useMemo(() => sources.map(s => {
    const yearEntries = s.entries.filter(e => e.period.startsWith(`${year}-`))
    const receivedEntries = yearEntries.filter(e => e.status === 'received' || e.status === 'partial')
    const ytdReceived = receivedEntries.reduce((sum, e) => sum + (e.actualAmount ?? s.grossAmount), 0)
    const receivedMonths = yearEntries.filter(e => e.status === 'received').length
    const mult = FREQ_MULT[s.frequency] ?? 1
    const monthlyNet = (s.netAmount ?? s.grossAmount) * mult
    const yearlyNet  = monthlyNet * 12
    const usdMonthly = monthlyNet * (FX_TO_USD[s.currency] ?? 0)
    return { ...s, ytdReceived, receivedMonths, monthlyNet, yearlyNet, usdMonthly }
  }), [sources, year])

  const sorted = useMemo(() => [...enriched].sort((a, b) => {
    let av: string | number = 0, bv: string | number = 0
    switch (sortKey) {
      case 'name':           av = a.name.toLowerCase();    bv = b.name.toLowerCase();    break
      case 'employer':       av = (a.employer ?? '').toLowerCase(); bv = (b.employer ?? '').toLowerCase(); break
      case 'grossAmount':    av = a.grossAmount;           bv = b.grossAmount;           break
      case 'ytdReceived':    av = a.ytdReceived;           bv = b.ytdReceived;           break
      case 'receivedMonths': av = a.receivedMonths;        bv = b.receivedMonths;        break
      case 'frequency':      av = a.frequency;             bv = b.frequency;             break
      case 'yearlyNet':      av = a.yearlyNet;             bv = b.yearlyNet;             break
      case 'usdMonthly':     av = a.usdMonthly;            bv = b.usdMonthly;            break
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  }), [enriched, sortKey, sortDir])

  const headers: { key: SortKey; label: string; tooltip: string; align?: 'right' | 'center' }[] = [
    { key: 'name',           label: 'Source',    tooltip: 'Income source name and type'                                              },
    { key: 'employer',       label: 'Employer',  tooltip: 'Company or entity paying this income'                                     },
    { key: 'frequency',      label: 'Frequency', tooltip: 'How often this income is paid'                                            },
    { key: 'grossAmount',    label: 'Monthly',   tooltip: 'Monthly net take-home (net if set, otherwise gross)', align: 'right'      },
    { key: 'yearlyNet',      label: 'Yearly',    tooltip: 'Annual take-home (monthly × 12)',                     align: 'right'      },
    { key: 'usdMonthly',     label: '≈ USD/mo',  tooltip: 'Approximate monthly value in USD at current FX rates', align: 'right'    },
    { key: 'ytdReceived',    label: 'YTD',       tooltip: `Total actually received so far in ${year}`,           align: 'right'      },
    { key: 'receivedMonths', label: `${year}`,   tooltip: 'Monthly status for the selected year — green = received', align: 'center' },
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
                className={cn(
                  'px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider cursor-pointer select-none hover:text-white/70 transition-colors group/th relative',
                  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {label} <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                </span>
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 hidden group-hover/th:block pointer-events-none">
                  <div className="bg-[#1a1a2e] border border-white/10 text-white/70 text-[11px] leading-relaxed rounded-xl px-3 py-2 w-52 shadow-xl">
                    {tooltip}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {sorted.map(source => (
            <tr key={source.id} className="hover:bg-white/[0.03] transition-colors">
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{source.name}</p>
                    <span className={cn(
                      'inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border',
                      TYPE_COLORS[source.type] ?? TYPE_COLORS.other
                    )}>
                      {TYPE_LABELS[source.type] ?? source.type}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 text-sm text-white/60">
                {source.employer ?? '—'}
              </td>
              <td className="px-4 py-4">
                <span className="text-xs text-white/50 bg-white/[0.05] px-2 py-0.5 rounded-lg">
                  {FREQ_LABELS[source.frequency] ?? source.frequency}
                </span>
              </td>
              {/* Monthly net */}
              <td className="px-4 py-4 text-right">
                <span className="text-sm font-bold text-white tabular-nums">
                  {formatMoney({ amount: source.monthlyNet, currency: source.currency as any })}
                </span>
                {source.netAmount && source.frequency === 'monthly' && (
                  <p className="text-[10px] text-white/30 tabular-nums mt-0.5">
                    Gross {formatMoney({ amount: source.grossAmount, currency: source.currency as any })}
                  </p>
                )}
              </td>
              {/* Yearly */}
              <td className="px-4 py-4 text-right">
                <span className="text-sm font-semibold text-white/60 tabular-nums">
                  {formatMoney({ amount: source.yearlyNet, currency: source.currency as any })}
                </span>
              </td>
              {/* ≈ USD/mo */}
              <td className="px-4 py-4 text-right">
                <span className={cn(
                  'text-xs font-semibold tabular-nums',
                  source.currency === 'USD' ? 'text-white/40' : 'text-emerald-400/80'
                )}>
                  ${source.usdMonthly.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </td>
              {/* YTD */}
              <td className="px-4 py-4 text-right">
                <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                  {formatMoney({ amount: source.ytdReceived, currency: source.currency as any })}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-center">
                  <MonthDots source={source} year={year} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sources.length === 0 && (
        <div className="py-16 text-center text-white/30 text-sm">No income sources found</div>
      )}
    </div>
  )
}
