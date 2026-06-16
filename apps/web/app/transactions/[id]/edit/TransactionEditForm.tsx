'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Trash2, AlertTriangle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  'Groceries', 'Food & Drink', 'Dining', 'Shopping', 'Shopping - Installment',
  'Technology', 'Subscriptions', 'Transportation', 'Fuel', 'Entertainment',
  'Health', 'Pharmacy', 'Education', 'Travel', 'Hotels', 'Utilities',
  'Insurance', 'Rent', 'Savings Fund', 'Investments', 'Transfers',
  'Salary', 'Freelance', 'Payment', 'Fee', 'Fee Reversal', 'Tax',
  'Interest', 'Credit Line Disbursement', 'Convenience Store', 'Other',
]

const CURRENCIES = ['MXN', 'GTQ', 'USD', 'EUR', 'COP', 'TRY', 'EGP']
const TYPES = [
  { value: 'expense', label: '↓ Expense / Debit',  color: 'text-rose-400'    },
  { value: 'income',  label: '↑ Income / Credit',  color: 'text-emerald-400' },
  { value: 'transfer', label: '↔ Transfer',         color: 'text-sky-400'    },
]

interface TxData {
  id: string
  payee: string | null
  note: string | null
  amount: number
  currency: string
  category: string
  date: string
  type: string
}

interface Props {
  tx: TxData
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

const INPUT = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all'

export function TransactionEditForm({ tx }: Props) {
  const router = useRouter()

  const [payee,    setPayee]    = useState(tx.payee    ?? '')
  const [note,     setNote]     = useState(tx.note     ?? '')
  const [amount,   setAmount]   = useState(Number(tx.amount).toFixed(2))
  const [currency, setCurrency] = useState(tx.currency)
  const [category, setCategory] = useState(tx.category)
  const [type,     setType]     = useState(tx.type)
  // date input requires YYYY-MM-DD
  const [date,     setDate]     = useState(tx.date.slice(0, 10))

  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        payee:    payee   || null,
        note:     note    || null,
        amount:   parseFloat(amount),
        refAmount: parseFloat(amount),
        currency,
        category,
        categoryRaw: category,
        type,
        date: new Date(date).toISOString(),
      }

      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Failed to save')
      }
      setSaved(true)
      setTimeout(() => {
        router.push(`/transactions/${tx.id}`)
        router.refresh()
      }, 700)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Failed to delete')
      }
      router.push('/transactions')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setDeleting(false)
    }
  }

  const typeColor = TYPES.find(t => t.value === type)?.color ?? 'text-white'

  return (
    <div className="space-y-6">
      {/* Amount hero */}
      <div className="glass rounded-3xl p-8 text-center relative overflow-hidden">
        <div className={cn(
          'absolute inset-0 opacity-10 blur-3xl rounded-full w-64 h-64 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2',
          type === 'income' ? 'bg-emerald-500' : type === 'transfer' ? 'bg-sky-500' : 'bg-rose-500'
        )} />
        <div className="relative z-10 flex flex-col items-center gap-2">
          <p className="text-xs text-white/40 uppercase tracking-wider">Amount</p>
          <div className="flex items-center gap-2">
            <span className={cn('text-2xl font-bold', typeColor)}>
              {type === 'income' ? '+' : type === 'transfer' ? '' : '-'}
            </span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              step="0.01"
              min="0"
              className={cn(
                'bg-transparent text-5xl font-bold tracking-tight text-center focus:outline-none w-56',
                typeColor
              )}
              placeholder="0.00"
            />
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs text-white/70 font-mono focus:outline-none"
            >
              {CURRENCIES.map(c => (
                <option key={c} value={c} className="bg-slate-950">{c}</option>
              ))}
            </select>
          </div>
          {/* Type toggle */}
          <div className="flex gap-2 mt-2">
            {TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg border transition-all font-medium',
                  type === t.value
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-transparent border-white/5 text-white/30 hover:text-white/50'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Core fields */}
      <GlassCard>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-5">Transaction Details</h3>
        <div className="space-y-4">
          <Field label="Payee / Merchant">
            <input
              type="text"
              value={payee}
              onChange={e => setPayee(e.target.value)}
              className={INPUT}
              placeholder="Where was this?"
            />
          </Field>
          <Field label="Description / Note">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              className={cn(INPUT, 'resize-none h-20')}
              placeholder="Add a note…"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={INPUT}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c} className="bg-slate-950">{c}</option>
              ))}
            </select>
          </Field>
        </div>
      </GlassCard>

      {error && (
        <p className="text-sm text-rose-400 bg-rose-500/10 px-4 py-3 rounded-xl border border-rose-500/20">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || saved || deleting}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all',
            saved
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50'
          )}
        >
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          onClick={() => router.back()}
          disabled={saving || deleting}
          className="px-6 py-3 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 glass transition-all"
        >
          Cancel
        </button>
      </div>

      {/* Delete zone */}
      <GlassCard>
        <h3 className="text-xs font-semibold text-rose-400/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Danger Zone
        </h3>
        {!confirmDelete ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Delete this transaction</p>
              <p className="text-xs text-white/30 mt-0.5">This action cannot be undone.</p>
            </div>
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-50 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-rose-300 font-medium">Are you sure? This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 glass transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
