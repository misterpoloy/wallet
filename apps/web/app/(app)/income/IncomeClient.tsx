'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Circle, Clock, XCircle, ChevronLeft, ChevronRight, Plus, Briefcase, TrendingUp, Pencil } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatMoney, cn } from '@/lib/utils'
import { EditIncomeModal } from './EditIncomeModal'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type Entry = {
  id: string
  period: string
  status: string
  expectedAmount: number
  actualAmount: number | null
  receivedAt: string | null
  note: string | null
}

type Source = {
  id: string
  name: string
  employer: string | null
  type: string
  currency: string
  grossAmount: number
  netAmount: number | null
  frequency: string
  isActive: boolean
  notes: string | null
  accountId: string | null
  account: { id: string; name: string; institution: string } | null
  entries: Entry[]
}

const STATUS_CONFIG = {
  received: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', label: 'Received' },
  expected: { icon: Clock,        color: 'text-white/30',    bg: 'bg-white/[0.04] border-white/10',        label: 'Expected' },
  partial:  { icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30',    label: 'Partial'  },
  missed:   { icon: XCircle,      color: 'text-rose-400',    bg: 'bg-rose-500/15 border-rose-500/30',      label: 'Missed'   },
  skipped:  { icon: Circle,       color: 'text-white/20',    bg: 'bg-white/[0.02] border-white/5',         label: 'Skipped'  },
}

function MonthCell({
  sourceId, year, monthIdx, entry, currency, expectedAmount, onUpdate,
}: {
  sourceId: string
  year: number
  monthIdx: number
  entry?: Entry
  currency: string
  expectedAmount: number
  onUpdate: () => void
}) {
  const [loading, setLoading] = useState(false)
  const period = `${year}-${String(monthIdx + 1).padStart(2, '0')}`
  const now = new Date()
  const isPast = new Date(year, monthIdx, 28) < now
  const isCurrent = year === now.getFullYear() && monthIdx === now.getMonth()
  const status = entry?.status ?? (isPast || isCurrent ? 'expected' : null)
  const cfg = status ? STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] : null
  const Icon = cfg?.icon ?? Circle

  async function toggle() {
    if (loading || !status) return
    setLoading(true)
    const nextStatus = status === 'received' ? 'expected' : 'received'
    await fetch(`/api/income/${sourceId}/entries/${period}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    onUpdate()
    setLoading(false)
  }

  if (!status) {
    return (
      <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl border border-white/5 opacity-20">
        <span className="text-[10px] text-white/40 font-medium uppercase">{MONTHS[monthIdx]}</span>
        <Circle className="w-4 h-4 text-white/10" />
      </div>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={`${MONTHS[monthIdx]}: ${cfg?.label} — click to toggle`}
      className={cn(
        'flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all hover:scale-105 active:scale-95',
        cfg?.bg,
        isCurrent && 'ring-1 ring-violet-500/50'
      )}
    >
      <span className={cn('text-[10px] font-semibold uppercase', cfg?.color)}>{MONTHS[monthIdx]}</span>
      <Icon className={cn('w-4 h-4', cfg?.color, loading && 'animate-pulse')} />
      {entry?.actualAmount && (
        <span className="text-[9px] text-white/40 tabular-nums">
          {formatMoney({ amount: entry.actualAmount, currency: currency as any })}
        </span>
      )}
    </button>
  )
}

function IncomeSourceCard({ source, year, onUpdate, onEdit }: { source: Source; year: number; onUpdate: () => void; onEdit: () => void }) {
  const entryMap = Object.fromEntries(source.entries.map((e) => [e.period, e]))
  const yearEntries = Array.from({ length: 12 }, (_, i) => {
    const period = `${year}-${String(i + 1).padStart(2, '0')}`
    return entryMap[period]
  })

  const received = yearEntries.filter((e) => e?.status === 'received').length
  const missed   = yearEntries.filter((e) => e?.status === 'missed').length
  const totalReceived = yearEntries
    .filter((e) => e?.status === 'received')
    .reduce((s, e) => s + (e?.actualAmount ?? Number(source.grossAmount)), 0)

  return (
    <GlassCard>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link href={`/income/${source.id}`} className="text-sm font-semibold text-white hover:text-violet-300 transition-colors">
                {source.name}
              </Link>
              <button
                onClick={onEdit}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/30 hover:text-violet-300"
                title="Edit income source"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
            {source.employer && <p className="text-xs text-white/40 mt-0.5">{source.employer}</p>}
            {source.account && (
              <p className="text-[10px] text-emerald-400/60 mt-0.5">→ {source.account.institution} · {source.account.name}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          {source.netAmount ? (
            <>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Monthly net</p>
              <p className="text-2xl font-bold text-white">
                {formatMoney({ amount: Number(source.netAmount), currency: source.currency as any })}
              </p>
              <p className="text-[11px] text-white/30 mt-1">
                ≈ {formatMoney({ amount: Number(source.netAmount) / 2, currency: source.currency as any })}
                <span className="ml-1 text-white/20">/ quincena</span>
              </p>
              <p className="text-[10px] text-white/20 mt-0.5">
                Gross {formatMoney({ amount: Number(source.grossAmount), currency: source.currency as any })}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-white/40 uppercase tracking-wider">Monthly</p>
              <p className="text-2xl font-bold text-white mt-0.5">
                {formatMoney({ amount: Number(source.grossAmount), currency: source.currency as any })}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-6 py-3 mb-4 border-y border-white/[0.06]">
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Received</p>
          <p className="text-sm font-bold text-emerald-400 mt-0.5">{received}/12 months</p>
        </div>
        {missed > 0 && (
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Missed</p>
            <p className="text-sm font-bold text-rose-400 mt-0.5">{missed}</p>
          </div>
        )}
        <div className="ml-auto text-right">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">YTD Received</p>
          <p className="text-sm font-bold text-white mt-0.5">
            {formatMoney({ amount: totalReceived, currency: source.currency as any })}
          </p>
        </div>
      </div>

      {/* Year calendar grid */}
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
        {Array.from({ length: 12 }, (_, i) => (
          <MonthCell
            key={i}
            sourceId={source.id}
            year={year}
            monthIdx={i}
            entry={yearEntries[i]}
            currency={source.currency}
            expectedAmount={Number(source.grossAmount)}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-white/[0.06] text-center">
        <Link
          href={`/income/${source.id}`}
          className="text-xs text-white/30 hover:text-violet-300 transition-colors"
        >
          View full details & payment history →
        </Link>
      </div>
    </GlassCard>
  )
}

// ── Add Income Modal ───────────────────────────────────────────────────────────

function AddIncomeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', employer: '', currency: 'MXN', grossAmount: '', netAmount: '',
    frequency: 'monthly', startDate: new Date().toISOString().slice(0, 10), notes: '',
  })

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function save() {
    setSaving(true)
    await fetch('/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name, employer: form.employer || undefined,
        currency: form.currency, grossAmount: parseFloat(form.grossAmount),
        netAmount: form.netAmount ? parseFloat(form.netAmount) : undefined,
        frequency: form.frequency, startDate: form.startDate, notes: form.notes || undefined,
      }),
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass rounded-2xl p-6 space-y-4 bg-[#0f0f1a]">
        <h2 className="text-base font-semibold text-white">Add Income Source</h2>
        {[
          { label: 'Name', key: 'name', placeholder: 'Salary · Calaps' },
          { label: 'Employer', key: 'employer', placeholder: 'Calaps (optional)' },
          { label: 'Gross Amount', key: 'grossAmount', placeholder: '0.00', type: 'number' },
          { label: 'Net Amount (take-home)', key: 'netAmount', placeholder: '0.00 (optional)', type: 'number' },
          { label: 'Start Date', key: 'startDate', type: 'date' },
        ].map(({ label, key, placeholder, type }) => (
          <div key={key}>
            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">{label}</label>
            <input type={type ?? 'text'} value={(form as any)[key]} onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50" />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Currency</label>
            <select value={form.currency} onChange={(e) => set('currency', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
              {['MXN','GTQ','USD','COP','EUR'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Frequency</label>
            <select value={form.frequency} onChange={(e) => set('frequency', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
              <option value="monthly">Monthly</option>
              <option value="biweekly">Biweekly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={save} disabled={saving || !form.name || !form.grossAmount}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all disabled:opacity-40">
            {saving ? 'Saving…' : 'Add Income Source'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function IncomeClient({ initialSources }: { initialSources: Source[] }) {
  const router = useRouter()
  const [year, setYear] = useState(new Date().getFullYear())
  const [showAdd, setShowAdd] = useState(false)
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [sources] = useState(initialSources)

  function refresh() { router.refresh() }

  return (
    <div className="space-y-6">
      {/* Year nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y - 1)} className="p-2 rounded-xl glass hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-4 h-4 text-white/60" />
          </button>
          <span className="text-lg font-bold text-white w-16 text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} disabled={year >= new Date().getFullYear()}
            className="p-2 rounded-xl glass hover:bg-white/10 transition-colors disabled:opacity-30">
            <ChevronRight className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all">
          <Plus className="w-4 h-4" /> Add Income
        </button>
      </div>

      {sources.length === 0 ? (
        <GlassCard>
          <div className="py-12 text-center">
            <TrendingUp className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No income sources yet</p>
            <p className="text-white/20 text-xs mt-1">Click "Add Income" to get started</p>
          </div>
        </GlassCard>
      ) : (
        sources.map((s) => (
          <IncomeSourceCard key={s.id} source={s} year={year} onUpdate={refresh} onEdit={() => setEditingSource(s)} />
        ))
      )}

      {showAdd && <AddIncomeModal onClose={() => setShowAdd(false)} onSaved={refresh} />}
      {editingSource && (
        <EditIncomeModal
          source={editingSource}
          onClose={() => setEditingSource(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
