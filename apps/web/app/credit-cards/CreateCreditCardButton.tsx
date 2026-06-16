'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CARD_NETWORK_OPTIONS, type CardNetwork } from '@/lib/card-network'
import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
}

const PALETTES = [
  { from: '#2563eb', to: '#0891b2' },
  { from: '#7c3aed', to: '#6366f1' },
  { from: '#dc2626', to: '#ea580c' },
  { from: '#059669', to: '#0891b2' },
]

export function CreateCreditCardButton({ children }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [currency, setCurrency] = useState<'MXN' | 'GTQ' | 'USD'>('MXN')
  const [lastFour, setLastFour] = useState('')
  const [network, setNetwork] = useState<CardNetwork>('visa')
  const [creditLimit, setCreditLimit] = useState('')
  const [palette, setPalette] = useState(PALETTES[0])

  async function handleCreate() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          institution,
          accountType: 'credit_card',
          currency,
          lastFour: lastFour || undefined,
          network,
          creditLimit: creditLimit ? Number(creditLimit) : undefined,
          color: palette.from,
          colorEnd: palette.to,
        }),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Failed to create card')
      }

      const j = await res.json()
      const createdId = j.data?.id as string | undefined
      setOpen(false)
      router.refresh()
      if (createdId) router.push(`/credit-cards/${createdId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full text-left">
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <GlassCard className="w-full max-w-xl p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">Add Credit Card</h2>
                <p className="text-sm text-white/40 mt-1">Create a card with network, limit, and colors.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-white/40 hover:text-white/80 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <Field label="Card Name">
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputClassName} placeholder="BBVA Crédito" />
              </Field>
              <Field label="Institution">
                <input value={institution} onChange={(e) => setInstitution(e.target.value)} className={inputClassName} placeholder="BBVA" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Currency">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value as 'MXN' | 'GTQ' | 'USD')} className={inputClassName}>
                    <option value="MXN" className="bg-slate-950">MXN</option>
                    <option value="GTQ" className="bg-slate-950">GTQ</option>
                    <option value="USD" className="bg-slate-950">USD</option>
                  </select>
                </Field>
                <Field label="Last 4">
                  <input value={lastFour} onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))} className={inputClassName} placeholder="1234" />
                </Field>
                <Field label="Limit">
                  <input type="number" min="0" step="0.01" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} className={inputClassName} placeholder="80000" />
                </Field>
              </div>
              <Field label="Network">
                <select value={network} onChange={(e) => setNetwork(e.target.value as CardNetwork)} className={inputClassName}>
                  {CARD_NETWORK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-950">
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Card Palette">
                <div className="grid grid-cols-4 gap-3">
                  {PALETTES.map((option) => (
                    <button
                      key={`${option.from}-${option.to}`}
                      type="button"
                      onClick={() => setPalette(option)}
                      className={cn(
                        'h-12 rounded-2xl transition-all',
                        palette.from === option.from && palette.to === option.to
                          ? 'ring-2 ring-white/70 scale-105'
                          : 'opacity-70 hover:opacity-100'
                      )}
                      style={{ background: `linear-gradient(135deg, ${option.from}, ${option.to})` }}
                    />
                  ))}
                </div>
              </Field>
              {error && (
                <p className="text-sm text-rose-400 bg-rose-500/10 px-4 py-3 rounded-xl border border-rose-500/20">{error}</p>
              )}
            </div>

            <div className="px-6 py-5 border-t border-white/10 flex gap-3">
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !name.trim() || !institution.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-50 transition-all"
              >
                <Plus className="w-4 h-4" />
                {saving ? 'Creating…' : 'Create Card'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="px-5 py-3 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 glass transition-all"
              >
                Cancel
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </>
  )
}

const inputClassName =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}
