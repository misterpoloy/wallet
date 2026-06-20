'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Account = { id: string; name: string; institution: string }
type Source = {
  id: string; name: string; employer: string | null; type: string
  currency: string; grossAmount: number; netAmount: number | null
  frequency: string; isActive: boolean; notes: string | null
  accountId: string | null
  account: Account | null
}

const CURRENCIES = ['MXN', 'GTQ', 'USD', 'EUR', 'COP']
const INCOME_TYPES = [
  { value: 'salary',    label: 'Salary'    },
  { value: 'freelance', label: 'Freelance' },
  { value: 'rental',    label: 'Rental'    },
  { value: 'dividend',  label: 'Dividend'  },
  { value: 'bonus',     label: 'Bonus'     },
  { value: 'other',     label: 'Other'     },
]

export function EditIncomePageClient({ source, accounts }: { source: Source; accounts: Account[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name:        source.name,
    employer:    source.employer ?? '',
    type:        source.type,
    currency:    source.currency,
    grossAmount: String(source.grossAmount),
    netAmount:   source.netAmount != null ? String(source.netAmount) : '',
    frequency:   source.frequency === 'biweekly' ? 'semimonthly' : source.frequency,
    isActive:    source.isActive,
    notes:       source.notes ?? '',
    accountId:   source.accountId ?? '',
  })

  function set(k: string, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/income/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:        form.name,
        employer:    form.employer || null,
        type:        form.type,
        currency:    form.currency,
        grossAmount: parseFloat(form.grossAmount),
        netAmount:   form.netAmount ? parseFloat(form.netAmount) : null,
        frequency:   form.frequency,
        isActive:    form.isActive,
        notes:       form.notes || null,
        accountId:   form.accountId || null,
      }),
    })
    setSaving(false)
    if (res.ok) router.push(`/income/${source.id}`)
  }

  const isQuincenal = form.frequency === 'semimonthly'
  const isMensual   = form.frequency === 'monthly'

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      {/* Name */}
      <div>
        <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Name</label>
        <input
          type="text" value={form.name} onChange={e => set('name', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50"
        />
      </div>

      {/* Employer */}
      <div>
        <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Employer / Payer</label>
        <input
          type="text" value={form.employer} onChange={e => set('employer', e.target.value)}
          placeholder="Optional"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50"
        />
      </div>

      {/* Type + Currency */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
            {INCOME_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Currency</label>
          <select value={form.currency} onChange={e => set('currency', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none">
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Gross + Net */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Gross Amount</label>
          <input type="number" value={form.grossAmount} onChange={e => set('grossAmount', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50" />
        </div>
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Net (take-home)</label>
          <input type="number" value={form.netAmount} onChange={e => set('netAmount', e.target.value)}
            placeholder="Optional"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50" />
        </div>
      </div>

      {/* ── Payment frequency toggle ──────────────────────────── */}
      <div>
        <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">Pago</label>
        <div className="flex rounded-xl overflow-hidden border border-white/10 bg-white/[0.03]">
          <button
            type="button"
            onClick={() => set('frequency', 'semimonthly')}
            className={cn(
              'flex-1 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2',
              isQuincenal ? 'bg-violet-600 text-white' : 'text-white/40 hover:text-white/70'
            )}
          >
            <Banknote className="w-4 h-4" />
            Quincenal
            <span className={cn('text-[10px] font-normal', isQuincenal ? 'text-violet-200' : 'text-white/20')}>
              2× / mes
            </span>
          </button>
          <div className="w-px bg-white/10" />
          <button
            type="button"
            onClick={() => set('frequency', 'monthly')}
            className={cn(
              'flex-1 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2',
              isMensual ? 'bg-violet-600 text-white' : 'text-white/40 hover:text-white/70'
            )}
          >
            <Banknote className="w-4 h-4" />
            Mensual
            <span className={cn('text-[10px] font-normal', isMensual ? 'text-violet-200' : 'text-white/20')}>
              1× / mes
            </span>
          </button>
        </div>
        {!isQuincenal && !isMensual && (
          <p className="text-[10px] text-white/30 mt-1.5">
            Current: <span className="capitalize">{form.frequency}</span> — use the toggle to switch to Quincenal or Mensual
          </p>
        )}
      </div>

      {/* ── Linked bank account ───────────────────────────────── */}
      <div>
        <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3" />
            Linked Bank Account
            <span className="text-white/20 normal-case font-normal">(optional)</span>
          </span>
        </label>
        <select
          value={form.accountId}
          onChange={e => set('accountId', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
        >
          <option value="">— No account linked —</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.institution} · {a.name}
            </option>
          ))}
        </select>
        {form.accountId && (
          <p className="text-[10px] text-white/30 mt-1">
            Income entries will be associated with this account for transaction matching.
          </p>
        )}
      </div>

      {/* Active toggle */}
      <div className="flex items-center justify-between py-1">
        <div>
          <p className="text-sm text-white/60">Active source</p>
          <p className="text-[10px] text-white/25 mt-0.5">Inactive sources are hidden from summaries</p>
        </div>
        <button
          type="button"
          onClick={() => set('isActive', !form.isActive)}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
            form.isActive ? 'bg-violet-600' : 'bg-white/10'
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
            form.isActive ? 'translate-x-5' : 'translate-x-0.5'
          )} />
        </button>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Notes</label>
        <textarea
          value={form.notes} onChange={e => set('notes', e.target.value)}
          rows={3} placeholder="Optional"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving || !form.name || !form.grossAmount}
          className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 rounded-xl glass text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
