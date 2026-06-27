'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Repeat2, X, ChevronDown, Loader2 } from 'lucide-react'
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
    id: string
    accountId: string
    payee: string | null
    note: string | null
    category: string
    currency: string
    amount: number
    date: string
  }
}

export function CreateRecurringButton({ transaction }: Props) {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const defaultName = transaction.payee || transaction.note || transaction.category

  const [name, setName]           = useState(defaultName)
  const [frequency, setFrequency] = useState('monthly')

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const date = new Date(transaction.date)
      // next due = same day next month (or next week / cycle)
      const next = new Date(date)
      if (frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') {
        next.setMonth(next.getMonth() + (frequency === 'quarterly' ? 3 : frequency === 'yearly' ? 12 : 1))
      } else if (frequency === 'weekly') {
        next.setDate(next.getDate() + 7)
      } else if (frequency === 'biweekly') {
        next.setDate(next.getDate() + 14)
      }

      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId:   transaction.accountId,
          name:        name.trim(),
          category:    transaction.category,
          currency:    transaction.currency,
          amount:      transaction.amount,
          frequency,
          dayOfMonth:  date.getDate(),
          nextDueDate: next.toISOString(),
        }),
      })
      if (!res.ok) throw new Error('Failed to create recurring expense')
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.10] bg-[#111116] shadow-2xl p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-white">Create recurring charge</h2>
                <p className="text-[12px] text-white/40 mt-0.5">
                  This will appear in your recurring expenses
                </p>
              </div>
              <button
                onClick={() => !loading && setOpen(false)}
                className="text-white/30 hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider block mb-1.5">Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-amber-400/40 transition-colors disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider block mb-1.5">Amount</label>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-[13px] text-white/60">
                    {transaction.currency} {transaction.amount.toFixed(2)}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider block mb-1.5">Category</label>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-[13px] text-white/60 truncate">
                    {transaction.category}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider block mb-1.5">Frequency</label>
                <div className="relative">
                  <select
                    value={frequency}
                    onChange={e => setFrequency(e.target.value)}
                    disabled={loading}
                    className="w-full appearance-none bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-amber-400/40 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {FREQUENCIES.map(f => (
                      <option key={f.value} value={f.value} className="bg-[#111116]">{f.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-[12px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => !loading && setOpen(false)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-white/50 hover:text-white/80 border border-white/[0.08] hover:bg-white/[0.04] transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !name.trim()}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2',
                  'bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-black disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Repeat2 className="w-3.5 h-3.5" />}
                {loading ? 'Creating…' : 'Create recurring'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
