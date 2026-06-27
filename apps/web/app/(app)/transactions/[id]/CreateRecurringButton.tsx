'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Repeat2, X, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const FREQUENCIES = [
  { value: 'monthly',   label: 'Monthly'   },
  { value: 'weekly',    label: 'Weekly'     },
  { value: 'biweekly',  label: 'Bi-weekly'  },
  { value: 'quarterly', label: 'Quarterly'  },
  { value: 'yearly',    label: 'Yearly'     },
]

interface Props {
  transaction: {
    accountId: string
    payee:     string | null
    note:      string | null
    category:  string
    currency:  string
    amount:    string   // always pass as serialized string to avoid Decimal issues
    date:      string
  }
}

export function CreateRecurringButton({ transaction }: Props) {
  const router  = useRouter()
  const amount  = parseFloat(transaction.amount)

  const [open, setOpen]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [name, setName]           = useState(transaction.payee || transaction.note || transaction.category)
  const [frequency, setFrequency] = useState('monthly')

  function close() {
    if (loading) return
    setOpen(false)
    setError(null)
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const date = new Date(transaction.date)
      const next = new Date(date)
      if      (frequency === 'weekly')    next.setDate(next.getDate() + 7)
      else if (frequency === 'biweekly')  next.setDate(next.getDate() + 14)
      else if (frequency === 'quarterly') next.setMonth(next.getMonth() + 3)
      else if (frequency === 'yearly')    next.setFullYear(next.getFullYear() + 1)
      else                                next.setMonth(next.getMonth() + 1)

      const res = await fetch('/api/recurring', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId:   transaction.accountId,
          name:        name.trim(),
          category:    transaction.category,
          currency:    transaction.currency,
          amount,
          frequency,
          dayOfMonth:  date.getDate(),
          nextDueDate: next.toISOString(),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message ?? 'Failed to create recurring expense')
      }
      router.push('/recurring')
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 glass px-3 py-1.5 rounded-xl transition-all"
      >
        <Repeat2 className="w-3.5 h-3.5" /> Make recurring
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={close}
          />

          {/* Modal card — glassmorphic */}
          <div
            className="relative w-full max-w-[400px] rounded-2xl border border-white/[0.10] overflow-hidden"
            style={{
              background: 'rgba(14,14,22,0.85)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
            {/* Subtle top accent line */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                    <Repeat2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-white leading-tight">Create recurring charge</h2>
                    <p className="text-[12px] text-white/40 mt-0.5">Will appear in your recurring expenses</p>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="text-white/25 hover:text-white/60 transition-colors p-1 -mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary pill */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 flex items-center justify-between">
                <div className="text-[12px] text-white/40">Amount</div>
                <div className="text-[15px] font-bold text-white tabular-nums">
                  {transaction.currency} {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-3.5">
                {/* Name */}
                <div>
                  <label className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.12em] block mb-1.5">
                    Name
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={loading}
                    placeholder="e.g. Netflix, Gym, Rent…"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-amber-400/40 focus:bg-amber-400/[0.03] transition-all disabled:opacity-50"
                  />
                </div>

                {/* Category (read-only) + Frequency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.12em] block mb-1.5">
                      Category
                    </label>
                    <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl px-3.5 py-2.5 text-[13px] text-white/45 truncate">
                      {transaction.category}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.12em] block mb-1.5">
                      Frequency
                    </label>
                    <div className="relative">
                      <select
                        value={frequency}
                        onChange={e => setFrequency(e.target.value)}
                        disabled={loading}
                        className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[13px] text-white focus:outline-none focus:border-amber-400/40 transition-all disabled:opacity-50 cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        {FREQUENCIES.map(f => (
                          <option key={f.value} value={f.value} style={{ background: '#0e0e16' }}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 text-[12px] text-rose-400">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={close}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-white/45 hover:text-white/70 border border-white/[0.07] hover:border-white/[0.12] hover:bg-white/[0.03] transition-all disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !name.trim()}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-black disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</>
                    : <><CheckCircle2 className="w-3.5 h-3.5" /> Confirm</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
