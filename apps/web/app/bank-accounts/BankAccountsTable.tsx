'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Trash2, TriangleAlert, X } from 'lucide-react'
import { CurrencyBadge } from '@/components/ui/CurrencyBadge'
import { formatMoney, cn } from '@/lib/utils'

export type AccountRow = {
  id: string
  name: string
  institution: string
  accountType: string
  currency: string
  color: string
  colorEnd: string
  logoUrl: string | null
  actionUrl: string | null
  lastFour: string | null
  balance: number
}

type SortKey = 'name' | 'institution' | 'accountType' | 'currency' | 'country' | 'balance'
type SortDir = 'asc' | 'desc'

const CURRENCY_COUNTRY: Record<string, { name: string; flag: string }> = {
  MXN: { name: 'Mexico',    flag: '🇲🇽' },
  GTQ: { name: 'Guatemala', flag: '🇬🇹' },
  USD: { name: 'USA',       flag: '🇺🇸' },
  COP: { name: 'Colombia',  flag: '🇨🇴' },
  TRY: { name: 'Turkey',    flag: '🇹🇷' },
  EGP: { name: 'Egypt',     flag: '🇪🇬' },
  EUR: { name: 'Europe',    flag: '🇪🇺' },
}

function countryOf(currency: string) {
  return CURRENCY_COUNTRY[currency] ?? { name: currency, flag: '🌐' }
}

function typeLabel(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 text-violet-400" />
    : <ArrowDown className="w-3.5 h-3.5 text-violet-400" />
}

// ─── Bulk Delete Modal ────────────────────────────────────────────────────────

function BulkDeleteModal({
  accounts,
  onConfirm,
  onCancel,
  loading,
}: {
  accounts: AccountRow[]
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const [input, setInput] = useState('')
  const ready = input.trim().toLowerCase() === 'confirm'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative w-full max-w-md glass rounded-2xl border border-rose-500/20 bg-[#0f0f1a] shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <TriangleAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-rose-400">Delete {accounts.length} accounts</p>
              <p className="text-xs text-white/40 mt-0.5">This action cannot be undone</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/30 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account list */}
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] divide-y divide-white/[0.06] max-h-48 overflow-y-auto">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-3 py-2.5">
              <div
                className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs ring-1 ring-white/10"
                style={{ background: `linear-gradient(135deg, ${a.color}, ${a.colorEnd})` }}
              >
                {a.accountType === 'cash' ? '💵' : '🏦'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{a.name}</p>
                <p className="text-xs text-white/40">{a.institution}</p>
              </div>
              <CurrencyBadge currency={a.currency as any} />
            </div>
          ))}
        </div>

        <p className="text-xs text-white/50 leading-relaxed">
          All transactions linked to these accounts will be <span className="text-rose-400 font-semibold">permanently deleted</span> and cannot be recovered.
        </p>

        {/* Confirm input */}
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">
            Type <span className="font-mono font-bold text-white/70">confirm</span> to proceed
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="confirm"
            autoFocus
            className={cn(
              'w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none transition-all font-mono',
              ready
                ? 'border-emerald-500/50 focus:border-emerald-500'
                : 'border-white/10 focus:border-rose-500/50'
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onConfirm}
            disabled={!ready || loading}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
              ready && !loading
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-rose-900/40 text-rose-500/40 cursor-not-allowed'
            )}
          >
            <Trash2 className="w-4 h-4" />
            {loading ? 'Deleting…' : `Delete ${accounts.length} accounts`}
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Table ───────────────────────────────────────────────────────────────

export function BankAccountsTable({ accounts }: { accounts: AccountRow[] }) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    return [...accounts].sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      switch (sortKey) {
        case 'name':        av = a.name.toLowerCase();           bv = b.name.toLowerCase();           break
        case 'institution': av = a.institution.toLowerCase();    bv = b.institution.toLowerCase();    break
        case 'accountType': av = a.accountType.toLowerCase();    bv = b.accountType.toLowerCase();    break
        case 'currency':    av = a.currency;                     bv = b.currency;                     break
        case 'country':     av = countryOf(a.currency).name;     bv = countryOf(b.currency).name;     break
        case 'balance':     av = a.balance;                      bv = b.balance;                      break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [accounts, sortKey, sortDir])

  const allSelected = sorted.length > 0 && sorted.every((a) => selected.has(a.id))
  const someSelected = selected.size > 0

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(sorted.map((a) => a.id)))
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleBulkDelete() {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch('/api/accounts/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected] }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Failed to delete accounts')
      }
      setShowModal(false)
      setSelected(new Set())
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setDeleting(false)
    }
  }

  const selectedAccounts = accounts.filter((a) => selected.has(a.id))

  const headers: { key: SortKey; label: string; align?: 'right' }[] = [
    { key: 'name',        label: 'Account' },
    { key: 'institution', label: 'Institution' },
    { key: 'accountType', label: 'Type' },
    { key: 'currency',    label: 'Currency' },
    { key: 'country',     label: 'Country' },
    { key: 'balance',     label: 'Balance', align: 'right' },
  ]

  return (
    <>
      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-violet-300">
              {selected.size} account{selected.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Clear
            </button>
          </div>
          <button
            onClick={() => { setError(''); setShowModal(true) }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Delete {selected.size > 1 ? `${selected.size} accounts` : 'account'}
          </button>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400 mb-2">
          {error}
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07]">
              {/* Select-all checkbox */}
              <th className="pl-4 pr-2 py-3 w-10">
                <button
                  onClick={toggleAll}
                  className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                    allSelected
                      ? 'bg-violet-500 border-violet-500'
                      : someSelected
                      ? 'bg-violet-500/30 border-violet-500/50'
                      : 'bg-white/5 border-white/20 hover:border-violet-500/50'
                  )}
                >
                  {allSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {!allSelected && someSelected && (
                    <div className="w-2 h-0.5 bg-violet-300 rounded-full" />
                  )}
                </button>
              </th>

              {headers.map(({ key, label, align }) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider cursor-pointer select-none hover:text-white/70 transition-colors',
                    align === 'right' ? 'text-right' : 'text-left'
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {align === 'right' && <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />}
                    {label}
                    {align !== 'right' && <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.05]">
            {sorted.map((account) => {
              const country = countryOf(account.currency)
              const isSelected = selected.has(account.id)
              return (
                <tr
                  key={account.id}
                  className={cn(
                    'group transition-colors',
                    isSelected ? 'bg-violet-500/[0.07]' : 'hover:bg-white/[0.03]'
                  )}
                >
                  {/* Row checkbox */}
                  <td className="pl-4 pr-2 py-3.5">
                    <button
                      onClick={() => toggleOne(account.id)}
                      className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                        isSelected
                          ? 'bg-violet-500 border-violet-500'
                          : 'bg-white/5 border-white/20 hover:border-violet-500/50'
                      )}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </td>

                  {/* Account */}
                  <td className="px-4 py-3.5">
                    <Link href={`/bank-accounts/${account.id}`} className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-base ring-1 ring-white/10"
                        style={{ background: `linear-gradient(135deg, ${account.color}, ${account.colorEnd})` }}
                      >
                        {account.logoUrl ? (
                          <Image src={account.logoUrl} alt={account.institution} width={36} height={36} className="w-full h-full object-cover" unoptimized />
                        ) : (
                          account.accountType === 'cash' ? '💵' : '🏦'
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors">{account.name}</p>
                        {account.lastFour && (
                          <p className="text-xs text-white/30 font-mono">••••{account.lastFour}</p>
                        )}
                      </div>
                    </Link>
                  </td>

                  {/* Institution */}
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-white/70">{account.institution}</span>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-white/50 bg-white/[0.06] px-2.5 py-1 rounded-lg">
                      {typeLabel(account.accountType)}
                    </span>
                  </td>

                  {/* Currency */}
                  <td className="px-4 py-3.5">
                    <CurrencyBadge currency={account.currency as any} />
                  </td>

                  {/* Country */}
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-2 text-sm text-white/60">
                      <span className="text-base leading-none">{country.flag}</span>
                      {country.name}
                    </span>
                  </td>

                  {/* Balance */}
                  <td className="px-4 py-3.5 text-right">
                    <span className={cn('text-sm font-semibold tabular-nums', account.balance < 0 ? 'text-rose-400' : 'text-white')}>
                      {account.balance < 0 ? '-' : ''}
                      {formatMoney({ amount: Math.abs(account.balance), currency: account.currency as any })}
                    </span>
                  </td>

                  {/* Quick actions */}
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {account.actionUrl && (
                        <a
                          href={account.actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-all"
                          title="Open online banking"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {accounts.length === 0 && (
          <div className="py-16 text-center text-white/30 text-sm">No bank accounts found</div>
        )}
      </div>

      {/* Bulk delete confirmation modal */}
      {showModal && (
        <BulkDeleteModal
          accounts={selectedAccounts}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowModal(false)}
          loading={deleting}
        />
      )}
    </>
  )
}
