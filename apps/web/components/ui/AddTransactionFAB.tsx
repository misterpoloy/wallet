'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ChevronLeft } from 'lucide-react'

interface Props {
  accountId?: string
}

const ACTIONS = [
  { label: 'Expense',  type: 'expense',  icon: ArrowUpRight,    color: 'text-rose-400',    bg: 'bg-rose-500/15',    ring: 'ring-rose-500/20' },
  { label: 'Income',   type: 'income',   icon: ArrowDownLeft,   color: 'text-emerald-400', bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/20' },
  { label: 'Transfer', type: 'transfer', icon: ArrowLeftRight,  color: 'text-sky-400',     bg: 'bg-sky-500/15',     ring: 'ring-sky-500/20' },
]

type Account = { id: string; name: string; institution: string; color: string; colorEnd: string }

export function AddTransactionFAB({ accountId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pendingType, setPendingType] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // fetch accounts lazily when no accountId and menu opens
  useEffect(() => {
    if (!open || accountId || accounts.length > 0) return
    setLoadingAccounts(true)
    fetch('/api/accounts')
      .then(r => r.json())
      .then(d => setAccounts((d.data ?? []).filter((a: any) => a.isActive !== false)))
      .finally(() => setLoadingAccounts(false))
  }, [open, accountId, accounts.length])

  const close = () => { setOpen(false); setPendingType(null) }

  const go = (type: string, accId: string) => {
    close()
    router.push(`/transactions/new?accountId=${accId}&type=${type}`)
  }

  const handleType = (type: string) => {
    if (accountId) {
      go(type, accountId)
    } else {
      setPendingType(type)
    }
  }

  const showAccountPicker = !!pendingType

  return (
    <div ref={ref} className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">

      {/* Type picker */}
      {!showAccountPicker && (
        <div
          className="flex flex-col items-end gap-2 transition-all duration-300"
          style={{ opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(12px)', pointerEvents: open ? 'auto' : 'none' }}
        >
          {ACTIONS.map(({ label, type, icon: Icon, color, bg, ring }, i) => (
            <button
              key={type}
              onClick={() => handleType(type)}
              className={`flex items-center gap-3 pl-4 pr-5 py-3 rounded-2xl backdrop-blur-xl border border-white/10 ${bg} ring-1 ${ring} hover:border-white/20 hover:scale-[1.03] active:scale-95 transition-all duration-200 shadow-[0_8px_32px_rgba(0,0,0,0.35)]`}
              style={{ transitionDelay: open ? `${i * 40}ms` : '0ms' }}
            >
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${bg} ring-1 ${ring}`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} strokeWidth={2} />
              </div>
              <span className="text-sm font-medium text-white/90 tracking-wide">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Account picker (when no accountId) */}
      {showAccountPicker && (
        <div className="flex flex-col items-end gap-2 max-h-72 overflow-y-auto pr-0.5">
          {/* back button */}
          <button
            onClick={() => setPendingType(null)}
            className="flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-2xl backdrop-blur-xl border border-white/10 bg-white/8 ring-1 ring-white/10 hover:border-white/20 active:scale-95 transition-all duration-200 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-white/50" strokeWidth={2} />
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Choose account</span>
          </button>

          {loadingAccounts && (
            <div className="px-5 py-3 text-xs text-white/40">Loading…</div>
          )}

          {accounts.map((acc, i) => (
            <button
              key={acc.id}
              onClick={() => go(pendingType!, acc.id)}
              className="flex items-center gap-3 pl-4 pr-5 py-3 rounded-2xl backdrop-blur-xl border border-white/10 bg-white/8 ring-1 ring-white/10 hover:border-white/20 hover:scale-[1.03] active:scale-95 transition-all duration-200 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div
                className="w-7 h-7 rounded-xl flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${acc.color}, ${acc.colorEnd})` }}
              />
              <div className="text-left">
                <p className="text-sm font-medium text-white/90 leading-tight">{acc.name}</p>
                <p className="text-[11px] text-white/40">{acc.institution}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => { if (open) close(); else setOpen(true) }}
        aria-label={open ? 'Close' : 'Add transaction'}
        className="w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/15 bg-white/10 hover:bg-white/15 ring-1 ring-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.45)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.55)] active:scale-95 transition-all duration-200"
      >
        <div className="transition-transform duration-200" style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>
          {open
            ? <X className="w-5 h-5 text-white/80" strokeWidth={2} />
            : <Plus className="w-5 h-5 text-white/80" strokeWidth={2} />
          }
        </div>
      </button>
    </div>
  )
}
