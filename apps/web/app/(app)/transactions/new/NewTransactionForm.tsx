'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useTimezone } from '@/components/providers/TimezoneProvider'
import { localNow, wallClockToUTC } from '@/lib/timezone'

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

const CATEGORIES = [
  'Groceries', 'Food & Drink', 'Dining', 'Shopping', 'Technology',
  'Subscriptions', 'Transportation', 'Fuel', 'Entertainment', 'Health',
  'Pharmacy', 'Education', 'Travel', 'Utilities', 'Housing', 'Insurance',
  'Rent', 'Savings', 'Loan Payment', 'Salary', 'Freelance', 'Fee', 'Interest',
  'Transfers', 'Other',
]

const CURRENCIES = ['MXN', 'GTQ', 'USD', 'EUR']

const PAYMENT_TYPES = [
  { value: 'debit',       label: 'Debit' },
  { value: 'credit_card', label: 'Credit' },
  { value: 'cash',        label: 'Cash'   },
]

type TxType = 'expense' | 'income' | 'transfer'

interface Account {
  id: string; name: string; institution: string
  color: string; colorEnd: string; currency: string
  accountType: string; lastFour: string | null
  logoUrl?: string | null
}

interface Props {
  originAccount: Account
  allAccounts: Account[]
  initialType?: TxType
  initialAmount?: string
  initialCategory?: string
  initialPayee?: string
  initialNote?: string
  initialDate?: string
}

const INPUT = 'w-full bg-white/[0.06] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.09] transition-all'

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({
  account, selected, onClick, size = 'md'
}: {
  account: Account; selected?: boolean; onClick?: () => void; size?: 'sm' | 'md'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative rounded-2xl overflow-hidden text-left transition-all duration-200',
        size === 'sm' ? 'p-3' : 'p-4',
        selected
          ? 'ring-2 ring-white/50 scale-[1.02]'
          : onClick ? 'ring-1 ring-white/10 hover:ring-white/25 hover:scale-[1.01]' : 'ring-1 ring-white/10',
        'w-full'
      )}
      style={{ background: `linear-gradient(135deg, ${account.color}, ${account.colorEnd})` }}
    >
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10 blur-xl" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1.5">
          {account.logoUrl ? (
            <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center p-0.5 flex-shrink-0">
              <Image src={account.logoUrl} alt={account.institution} width={20} height={20} className="w-full h-full object-contain" unoptimized />
            </div>
          ) : null}
          <p className="text-white/60 text-[10px] uppercase tracking-widest">{account.institution}</p>
        </div>
        <p className={cn('text-white font-semibold leading-tight', size === 'sm' ? 'text-sm' : 'text-base')}>{account.name}</p>
        {account.lastFour && (
          <p className="text-white/40 font-mono text-[10px] mt-1">•••• {account.lastFour}</p>
        )}
        {selected && (
          <div className="absolute top-0 right-0 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Account Dropdown ─────────────────────────────────────────────────────────

function AccountDropdown({
  accounts, value, onChange,
}: {
  accounts: Account[]; value: string; onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = accounts.find(a => a.id === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full text-left"
      >
        {selected ? (
          <div className="relative">
            <AccountCard account={selected} size="sm" />
            <div className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
              <ChevronDown className={cn('w-3.5 h-3.5 text-white/70 transition-transform duration-200', open && 'rotate-180')} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition-all">
            <span className="text-sm text-white/30">Select destination account…</span>
            <ChevronDown className={cn('w-4 h-4 text-white/25 transition-transform duration-200', open && 'rotate-180')} />
          </div>
        )}
      </button>

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 right-0 rounded-2xl border border-white/10 bg-[#0d0d1a]/90 backdrop-blur-2xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
          <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto">
            {accounts.map(acc => (
              <button
                key={acc.id}
                type="button"
                onClick={() => { onChange(acc.id); setOpen(false) }}
                className="w-full text-left"
              >
                <div className={cn(
                  'relative rounded-xl overflow-hidden transition-all duration-150',
                  value === acc.id ? 'ring-2 ring-white/40' : 'hover:ring-1 hover:ring-white/20 opacity-80 hover:opacity-100'
                )}>
                  <AccountCard account={acc} size="sm" />
                  {value === acc.id && (
                    <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'rounded-3xl border border-white/[0.07] bg-white/[0.04] backdrop-blur-xl p-6 space-y-4',
      className
    )}>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider mb-2">{children}</p>
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function NewTransactionForm({
  originAccount, allAccounts, initialType = 'expense',
  initialAmount = '', initialCategory, initialPayee = '', initialNote = '', initialDate,
}: Props) {
  const router = useRouter()
  const tz = useTimezone()

  const [txType,       setTxType]       = useState<TxType>(initialType)
  const [amount,       setAmount]       = useState(initialAmount)
  const [currency,     setCurrency]     = useState(originAccount.currency)
  const [payee,        setPayee]        = useState(initialPayee)
  const [note,         setNote]         = useState(initialNote)
  const [category,     setCategory]     = useState(
    initialCategory ?? (initialType === 'transfer' ? 'Transfers' : 'Other')
  )
  // datetime-local value: YYYY-MM-DDTHH:mm in user's timezone; re-init when tz resolves
  const [datetime,     setDatetime]     = useState(() =>
    initialDate ? `${initialDate}T12:00` : localNow(tz)
  )
  // Once tz loads from API (may differ from default), reset to correct local time — but not if pre-filled
  useEffect(() => { if (!initialDate) setDatetime(localNow(tz)) }, [tz])
  const [paymentType,  setPaymentType]  = useState(
    originAccount.accountType === 'credit_card' ? 'credit_card' : 'debit'
  )
  const [destAccountId, setDestAccountId] = useState('')
  const [fxRate,        setFxRate]        = useState('')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  const destAccounts   = allAccounts.filter(a => a.id !== originAccount.id)
  const destAccount    = destAccounts.find(a => a.id === destAccountId)
  const isCrossCurrency = txType === 'transfer' && destAccount && destAccount.currency !== currency

  function handleTypeChange(t: TxType) {
    setTxType(t)
    if (t === 'transfer') setCategory('Transfers')
    else if (category === 'Transfers') setCategory('Other')
  }

  async function handleSubmit() {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.')
      return
    }
    if (txType === 'transfer' && !destAccountId) {
      setError('Please select a destination account.')
      return
    }

    setSaving(true)
    setError('')

    const amt = parseFloat(amount)
    // Convert wall-clock time in user's timezone to UTC for storage.
    const isoDate = wallClockToUTC(datetime, tz)
    const baseBody = {
      currency, amount: amt, refAmount: amt,
      payee: payee || null, note: note || null,
      category, categoryRaw: payee || category,
      date: isoDate, paymentType, labels: [],
    }

    try {
      if (txType === 'transfer') {
        const transferGroupId = uuid()
        const destAcc = destAccounts.find(a => a.id === destAccountId)
        const destCurrency = destAcc?.currency ?? currency
        const parsedFxRate = isCrossCurrency && fxRate ? parseFloat(fxRate) : null
        const destAmount = parsedFxRate ? Math.round(amt * parsedFxRate * 100) / 100 : amt

        const fromRes = await fetch('/api/transactions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...baseBody, accountId: originAccount.id,
            type: 'expense', isTransfer: true, transferGroupId,
            transferToId: destAccountId, category: 'Transfers', categoryRaw: 'Transfer Out',
            payee: payee || `Transfer → ${destAcc?.name ?? 'Account'}`,
            ...(parsedFxRate && { fxRate: parsedFxRate, refAmount: destAmount, refCurrency: destCurrency }),
          }),
        })
        if (!fromRes.ok) throw new Error((await fromRes.json()).error ?? 'Failed to create outgoing leg')

        const toRes = await fetch('/api/transactions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...baseBody, accountId: destAccountId, currency: destCurrency,
            amount: destAmount, refAmount: amt,
            type: 'income', isTransfer: true, transferGroupId,
            transferToId: originAccount.id, category: 'Transfers', categoryRaw: 'Transfer In',
            payee: payee || `Transfer ← ${originAccount.name}`,
            ...(parsedFxRate && { fxRate: 1 / parsedFxRate, refCurrency: currency }),
          }),
        })
        if (!toRes.ok) throw new Error((await toRes.json()).error ?? 'Failed to create incoming leg')
      } else {
        const res = await fetch('/api/transactions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...baseBody, accountId: originAccount.id, type: txType, isTransfer: false }),
        })
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create transaction')
      }

      setSaved(true)
      setTimeout(() => {
        const dest = originAccount.accountType === 'credit_card'
          ? `/credit-cards/${originAccount.id}`
          : `/bank-accounts/${originAccount.id}`
        router.push(dest)
        router.refresh()
      }, 800)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  // type pill config
  const TYPES: { key: TxType; label: string; Icon: React.ElementType; activeClass: string }[] = [
    { key: 'expense',  label: 'Expense',  Icon: ArrowUpRight,   activeClass: 'bg-rose-500/20 border-rose-500/30 text-rose-300'    },
    { key: 'income',   label: 'Income',   Icon: ArrowDownLeft,  activeClass: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' },
    { key: 'transfer', label: 'Transfer', Icon: ArrowLeftRight, activeClass: 'bg-sky-500/20 border-sky-500/30 text-sky-300'       },
  ]

  const amountColor =
    txType === 'expense'  ? 'text-rose-400' :
    txType === 'income'   ? 'text-emerald-400' : 'text-sky-400'

  const glowColor =
    txType === 'expense'  ? 'bg-rose-500' :
    txType === 'income'   ? 'bg-emerald-500' : 'bg-sky-500'

  return (
    <div className="space-y-4">

      {/* ── AMOUNT HERO ─────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden border border-white/[0.07] bg-white/[0.04] backdrop-blur-xl">
        {/* subtle bottom-edge glow only */}
        <div className={cn('absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-48 h-24 opacity-[0.12] blur-2xl rounded-full pointer-events-none', glowColor)} />

        <div className="relative z-10 px-8 pt-7 pb-6 text-center space-y-6">
          {/* Type selector */}
          <div className="flex gap-2 justify-center">
            {TYPES.map(({ key, label, Icon, activeClass }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleTypeChange(key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold border transition-all duration-150',
                  txType === key ? activeClass : 'border-white/8 text-white/30 hover:text-white/60 hover:border-white/15'
                )}
              >
                <Icon className="w-3 h-3" strokeWidth={2.5} />
                {label}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="flex items-center justify-center gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={e => {
                const v = e.target.value
                if (v === '' || /^\d*\.?\d*$/.test(v)) setAmount(v)
              }}
              placeholder="0.00"
              autoFocus
              className={cn(
                'bg-transparent text-6xl font-thin tracking-tight text-center focus:outline-none',
                'min-w-0 flex-1 max-w-xs',
                amount ? amountColor : 'text-white/20'
              )}
            />
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="bg-white/[0.08] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white/60 font-mono focus:outline-none focus:border-white/20 transition-all"
            >
              {CURRENCIES.map(c => <option key={c} value={c} className="bg-slate-950">{c}</option>)}
            </select>
          </div>

          {/* Transfer flow preview */}
          {txType === 'transfer' ? (
            <div className="flex items-center justify-center gap-3">
              <div className="text-center">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">From</p>
                <div
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-white"
                  style={{ background: `linear-gradient(135deg, ${originAccount.color}80, ${originAccount.colorEnd}80)` }}
                >
                  {originAccount.name}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 flex-shrink-0" />
              <div className="text-center">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">To</p>
                {destAccount ? (
                  <div
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-white"
                    style={{ background: `linear-gradient(135deg, ${destAccount.color}80, ${destAccount.colorEnd}80)` }}
                  >
                    {destAccount.name}
                  </div>
                ) : (
                  <div className="px-3 py-1.5 rounded-xl text-xs text-white/25 border border-dashed border-white/10">
                    Select below
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <p className="text-xs text-white/30">
                {txType === 'income' ? 'Into' : 'From'}
              </p>
              <div
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-white"
                style={{ background: `linear-gradient(135deg, ${originAccount.color}80, ${originAccount.colorEnd}80)` }}
              >
                {originAccount.name}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DESTINATION ACCOUNT (transfer) ──────────────────────────── */}
      {txType === 'transfer' && (
        <Section className="relative z-20">
          <Label>Destination Account</Label>
          <AccountDropdown
            accounts={destAccounts}
            value={destAccountId}
            onChange={(id) => { setDestAccountId(id); setFxRate('') }}
          />

          {isCrossCurrency && destAccount && (
            <div className="mt-2 rounded-2xl bg-amber-500/[0.07] border border-amber-500/15 p-4 space-y-3">
              <p className="text-xs text-amber-400/80 font-medium">
                Cross-currency · {currency} → {destAccount.currency}
              </p>
              <div>
                <Label>Exchange rate (1 {currency} = ? {destAccount.currency})</Label>
                <input
                  type="number"
                  value={fxRate}
                  onChange={e => setFxRate(e.target.value)}
                  placeholder="e.g. 0.052"
                  step="any"
                  min="0"
                  className={INPUT}
                />
              </div>
              {fxRate && parseFloat(fxRate) > 0 && amount && (
                <p className="text-xs text-amber-300/60">
                  {amount} {currency} → {(parseFloat(amount) * parseFloat(fxRate)).toFixed(2)} {destAccount.currency}
                </p>
              )}
            </div>
          )}
        </Section>
      )}

      {/* ── DETAILS ─────────────────────────────────────────────────── */}
      <Section>
        <Label>Details</Label>
        <div className="space-y-3">
          <input
            type="text"
            value={payee}
            onChange={e => setPayee(e.target.value)}
            placeholder={txType === 'transfer' ? 'Note (optional)' : 'Payee / Merchant'}
            className={INPUT}
          />
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note…"
            className={cn(INPUT, 'resize-none h-14')}
          />
        </div>
      </Section>

      {/* ── CATEGORY & DATE ─────────────────────────────────────────── */}
      <Section>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Category</Label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={INPUT}
            >
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-950">{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Date & Time ({tz})</Label>
            <input
              type="datetime-local"
              value={datetime}
              onChange={e => setDatetime(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>

        {txType !== 'transfer' && (
          <div>
            <Label>Payment Method</Label>
            <div className="flex gap-2">
              {PAYMENT_TYPES.map(pt => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setPaymentType(pt.value)}
                  className={cn(
                    'flex-1 py-2.5 rounded-2xl text-xs font-medium border transition-all duration-150',
                    paymentType === pt.value
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'border-white/[0.06] text-white/25 hover:text-white/50 hover:border-white/12'
                  )}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ── ERROR ───────────────────────────────────────────────────── */}
      {error && (
        <div className="px-4 py-3 rounded-2xl bg-rose-500/[0.08] border border-rose-500/15 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* ── SUBMIT ──────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || saved}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all duration-200',
            saved
              ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400'
              : 'bg-white/[0.12] hover:bg-white/[0.16] border border-white/10 hover:border-white/20 text-white disabled:opacity-40'
          )}
        >
          {saved ? (
            <><Check className="w-4 h-4" strokeWidth={2.5} /> Saved</>
          ) : saving ? (
            <span className="opacity-60">Saving…</span>
          ) : (
            <>
              {txType === 'transfer' ? <ArrowLeftRight className="w-4 h-4" /> :
               txType === 'income'   ? <ArrowDownLeft className="w-4 h-4" /> :
                                       <ArrowUpRight className="w-4 h-4" />}
              {txType === 'transfer' ? 'Create Transfer' :
               txType === 'income'   ? 'Add Income' : 'Add Expense'}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={saving}
          className="px-6 py-4 rounded-2xl text-sm font-medium text-white/35 hover:text-white/60 border border-white/[0.06] hover:border-white/12 transition-all duration-150"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
