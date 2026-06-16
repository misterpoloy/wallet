'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react'
import { CurrencyBadge } from '@/components/ui/CurrencyBadge'
import { formatMoney } from '@/lib/utils'
import { getCardNetworkAsset, getCardNetworkLabel } from '@/lib/card-network'

type Card = {
  id: string
  name: string
  institution: string
  currency: string
  color: string
  colorEnd: string
  logoUrl: string | null
  network: string | null
  lastFour: string | null
  used: number
  limit: number
  available: number
  usagePct: number
}

type SortKey = 'name' | 'institution' | 'used' | 'limit' | 'available' | 'usagePct'
type SortDir = 'asc' | 'desc'

function usageColor(pct: number) {
  if (pct < 30) return 'from-emerald-400 to-green-500'
  if (pct < 60) return 'from-amber-400 to-yellow-500'
  if (pct < 85) return 'from-orange-400 to-orange-500'
  return 'from-red-400 to-rose-500'
}

function usageTextColor(pct: number) {
  if (pct < 30) return 'text-emerald-400'
  if (pct < 60) return 'text-amber-400'
  if (pct < 85) return 'text-orange-400'
  return 'text-rose-400'
}

const COLUMNS: { key: SortKey; label: string; align?: string }[] = [
  { key: 'name',        label: 'Card' },
  { key: 'institution', label: 'Bank' },
  { key: 'used',        label: 'Balance Owed',  align: 'right' },
  { key: 'limit',       label: 'Limit',          align: 'right' },
  { key: 'available',   label: 'Available',      align: 'right' },
  { key: 'usagePct',    label: 'Usage',          align: 'right' },
]

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3 h-3 opacity-30" />
  return sortDir === 'asc'
    ? <ArrowUp className="w-3 h-3 text-violet-400" />
    : <ArrowDown className="w-3 h-3 text-violet-400" />
}

export function CreditCardsView({ cards }: { cards: Card[] }) {
  const [view, setView] = useState<'card' | 'table'>('card')
  const [sortKey, setSortKey] = useState<SortKey>('usagePct')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    return [...cards].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      const cmp = typeof av === 'string'
        ? av.localeCompare(bv as string)
        : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [cards, sortKey, sortDir])

  return (
    <div className="space-y-6">
      {/* View toggle */}
      <div className="flex justify-end">
        <div className="flex items-center gap-1 glass rounded-xl p-1">
          <button
            onClick={() => setView('card')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              view === 'card' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards
          </button>
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              view === 'table' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Table
          </button>
        </div>
      </div>

      {/* Card grid view */}
      {view === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cards.map((card) => {
            const cur = card.currency as 'MXN' | 'GTQ' | 'USD'
            return (
              <Link key={card.id} href={`/credit-cards/${card.id}`} className="block group">
                <div
                  className="relative rounded-3xl overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl"
                  style={{ background: `linear-gradient(135deg, ${card.color} 0%, ${card.colorEnd} 100%)`, boxShadow: `0 20px 60px ${card.color}50`, aspectRatio: '16/10' }}
                >
                  <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                  <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-black/20 blur-2xl" />
                  <div className="relative z-10 h-full flex flex-col justify-between p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        {card.logoUrl ? (
                          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center p-1.5 flex-shrink-0">
                            <Image src={card.logoUrl} alt={card.institution} width={32} height={32} className="w-full h-full object-contain" unoptimized />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                            {card.institution[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-semibold text-sm leading-tight">{card.name}</p>
                          <p className="text-white/50 text-[11px] uppercase tracking-wider mt-0.5">{card.institution}</p>
                        </div>
                      </div>
                      <CurrencyBadge currency={cur} />
                    </div>
                    <p className="text-white/40 font-mono text-xs tracking-[0.3em]">
                      •••• &nbsp;•••• &nbsp;•••• &nbsp;{card.lastFour ?? '••••'}
                    </p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Balance Owed</p>
                        <p className="text-white font-bold text-xl leading-none">{formatMoney({ amount: card.used, currency: cur })}</p>
                        {card.limit > 0 && (
                          <div className="mt-2 w-28">
                            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full bg-gradient-to-r ${usageColor(card.usagePct)}`} style={{ width: `${card.usagePct}%` }} />
                            </div>
                            <p className="text-white/30 text-[10px] mt-0.5">{card.usagePct}% of {formatMoney({ amount: card.limit, currency: cur })}</p>
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl bg-black/20 backdrop-blur-sm px-3 py-2">
                        <Image src={getCardNetworkAsset(card.network)} alt={getCardNetworkLabel(card.network)} width={56} height={22} className="h-[22px] w-auto object-contain" unoptimized />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Table view */}
      {view === 'table' && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className={`px-5 py-3.5 text-xs font-semibold text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/70 transition-colors select-none ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.align === 'right' && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                      {col.label}
                      {col.align !== 'right' && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                    </span>
                  </th>
                ))}
                <th className="px-5 py-3.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sorted.map((card) => {
                const cur = card.currency as 'MXN' | 'GTQ' | 'USD'
                return (
                  <tr key={card.id} className="group hover:bg-white/[0.03] transition-colors">
                    {/* Card */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                          style={{ background: `linear-gradient(135deg, ${card.color}, ${card.colorEnd})` }}
                        >
                          {card.logoUrl ? (
                            <Image src={card.logoUrl} alt={card.institution} width={24} height={24} className="w-5 h-5 object-contain" unoptimized />
                          ) : (
                            <span className="text-white text-xs font-bold">{card.institution[0]}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{card.name}</p>
                          <p className="text-[11px] text-white/40 font-mono">•••• {card.lastFour ?? '••••'}</p>
                        </div>
                      </div>
                    </td>
                    {/* Bank */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Image src={getCardNetworkAsset(card.network)} alt={getCardNetworkLabel(card.network)} width={32} height={12} className="h-3 w-auto object-contain opacity-60" unoptimized />
                        <span className="text-sm text-white/60">{card.institution}</span>
                      </div>
                    </td>
                    {/* Balance owed */}
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-semibold text-white">{formatMoney({ amount: card.used, currency: cur })}</span>
                    </td>
                    {/* Limit */}
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm text-white/60">{card.limit > 0 ? formatMoney({ amount: card.limit, currency: cur }) : '—'}</span>
                    </td>
                    {/* Available */}
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm text-emerald-400">{card.limit > 0 ? formatMoney({ amount: card.available, currency: cur }) : '—'}</span>
                    </td>
                    {/* Usage */}
                    <td className="px-5 py-4 text-right">
                      {card.limit > 0 ? (
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full bg-gradient-to-r ${usageColor(card.usagePct)}`} style={{ width: `${card.usagePct}%` }} />
                          </div>
                          <span className={`text-xs font-semibold tabular-nums w-9 text-right ${usageTextColor(card.usagePct)}`}>{card.usagePct}%</span>
                        </div>
                      ) : <span className="text-white/30 text-sm">—</span>}
                    </td>
                    {/* Link arrow */}
                    <td className="px-4 py-4">
                      <Link href={`/credit-cards/${card.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-4 h-4 text-white/40" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
