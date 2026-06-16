'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Check, RefreshCw, Trash2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatMoney } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { CARD_NETWORK_OPTIONS, getCardNetworkAsset, getCardNetworkLabel, type CardNetwork } from '@/lib/card-network'

const PALETTES = [
  { label: 'Ocean',    from: '#2563eb', to: '#0891b2' },
  { label: 'Violet',  from: '#7c3aed', to: '#6366f1' },
  { label: 'Sunset',  from: '#dc2626', to: '#ea580c' },
  { label: 'Emerald', from: '#059669', to: '#0891b2' },
  { label: 'Rose',    from: '#be185d', to: '#9333ea' },
  { label: 'Amber',   from: '#d97706', to: '#dc2626' },
  { label: 'Slate',   from: '#475569', to: '#334155' },
  { label: 'Sky',     from: '#0284c7', to: '#7c3aed' },
  { label: 'Lime',    from: '#65a30d', to: '#0891b2' },
  { label: 'Pink',    from: '#db2777', to: '#f97316' },
  { label: 'Indigo',  from: '#4338ca', to: '#2563eb' },
  { label: 'Teal',    from: '#0f766e', to: '#059669' },
]

interface AccountData {
  id: string
  name: string
  institution: string
  color: string
  colorEnd: string
  currency: string
  lastFour: string
  network: CardNetwork | null
  accountType: string
  creditLimit: number | null
  balance: number
  used: number
  logoUrl: string | null
}

interface Props {
  account: AccountData
}

export function CreditCardEditForm({ account }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState(account.name)
  const [institution, setInstitution] = useState(account.institution)
  const [color, setColor] = useState(account.color)
  const [colorEnd, setColorEnd] = useState(account.colorEnd)
  const [lastFour, setLastFour] = useState(account.lastFour)
  const [network, setNetwork] = useState<CardNetwork>(account.network ?? 'visa')
  const [creditLimit, setCreditLimit] = useState(account.creditLimit?.toFixed(2) ?? '')
  const [logoUrl, setLogoUrl] = useState(account.logoUrl ?? '')
  const [logoError, setLogoError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [adjustBalance, setAdjustBalance] = useState(false)
  const [targetUsed, setTargetUsed] = useState(account.used.toFixed(2))
  const [balanceNote, setBalanceNote] = useState('Manual balance adjustment')

  const currency = account.currency as 'MXN' | 'GTQ' | 'USD'
  const limit = Number(creditLimit) || account.creditLimit || 0
  const usedPreview = adjustBalance ? Number(targetUsed) || 0 : account.used
  const available = Math.max(0, limit - usedPreview)
  const usagePct = limit > 0 ? Math.min(100, Math.round((usedPreview / limit) * 100)) : 0

  // diff: we store credit card balance as negative (expense > income)
  // targetUsed means we want balance = -targetUsed
  const targetBalance = adjustBalance ? -Number(targetUsed) : account.balance
  const diff = targetBalance - account.balance

  function isValidUrl(url: string) {
    try { return Boolean(new URL(url)) } catch { return false }
  }

  async function handleSave() {
    const logoErr = logoUrl && !isValidUrl(logoUrl) ? 'Must be a valid URL (https://…)' : ''
    setLogoError(logoErr)
    if (logoErr) return

    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        name,
        institution,
        color,
        colorEnd,
        network,
        logoUrl: logoUrl || null,
      }
      if (lastFour) body.lastFour = lastFour
      if (creditLimit) body.creditLimit = Number(creditLimit)
      if (adjustBalance && Math.abs(diff) > 0.001) {
        body.targetBalance = targetBalance
        body.targetBalanceNote = balanceNote
      }

      const res = await fetch(`/api/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? 'Failed to save')
      }

      setSaved(true)
      setTimeout(() => {
        router.push(`/credit-cards/${account.id}`)
        router.refresh()
      }, 800)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${account.name}? This only archives the card from the app.`)) return

    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/accounts/${account.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Failed to delete')
      }
      router.push('/credit-cards')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Live card preview */}
      <div
        className="relative rounded-3xl p-8 overflow-hidden transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, ${color}, ${colorEnd})`,
          boxShadow: `0 20px 60px ${color}50`,
        }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {logoUrl && isValidUrl(logoUrl) ? (
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 flex-shrink-0 ring-2 ring-white/20">
                  <Image src={logoUrl} alt={institution} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                </div>
              ) : null}
              <div>
                <p className="text-white/60 text-xs uppercase tracking-widest mb-1">{institution}</p>
                <p className="text-white text-2xl font-bold">{name || 'Card Name'}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/14 px-3 py-2 backdrop-blur-sm">
              <Image
                src={getCardNetworkAsset(network)}
                alt={getCardNetworkLabel(network)}
                width={60}
                height={24}
                className="h-6 w-auto object-contain"
              />
            </div>
          </div>
          <p className="text-white/50 font-mono text-sm mt-1 tracking-widest">
            •••• •••• •••• {lastFour || '••••'}
          </p>
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider">Used</p>
              <p className="text-white text-2xl font-bold mt-1">{formatMoney({ amount: usedPreview, currency })}</p>
            </div>
            {limit > 0 && (
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider">Available</p>
                <p className="text-emerald-300 text-2xl font-bold mt-1">{formatMoney({ amount: available, currency })}</p>
              </div>
            )}
          </div>
          {limit > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-white/50 mb-1.5">
                <span>{usagePct}% used</span>
                <span>Limit: {formatMoney({ amount: limit, currency })}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/60 transition-all duration-300"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fields */}
      <GlassCard>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-5">Card Details</h3>
        <div className="space-y-4">
          <Field label="Card Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all"
            />
          </Field>
          <Field label="Institution">
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all"
            />
          </Field>
          <Field label="Last 4 digits">
            <input
              type="text"
              value={lastFour}
              onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all font-mono tracking-widest"
              placeholder="0000"
            />
          </Field>
          <Field label="Network">
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as CardNetwork)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all"
            >
              {CARD_NETWORK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-950">
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Credit Limit">
            <input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </Field>
          <Field label="Logo Image URL" error={logoError}>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => { setLogoUrl(e.target.value); setLogoError('') }}
              className={cn(
                'w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:bg-white/[0.07] transition-all',
                logoError ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-violet-500/50'
              )}
              placeholder="https://example.com/logo.png"
            />
          </Field>
        </div>
      </GlassCard>

      {/* Color picker */}
      <GlassCard>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-5">Accent Color</h3>
        <div className="grid grid-cols-6 gap-3 mb-5">
          {PALETTES.map((p) => (
            <button
              key={p.label}
              onClick={() => { setColor(p.from); setColorEnd(p.to) }}
              title={p.label}
              className={cn(
                'relative h-10 rounded-xl transition-all duration-200',
                color === p.from && colorEnd === p.to
                  ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-transparent scale-105'
                  : 'opacity-70 hover:opacity-100 hover:scale-105'
              )}
              style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
            >
              {color === p.from && colorEnd === p.to && (
                <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" />
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Start color</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="w-10 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer p-0.5" />
              <input type="text" value={color} onChange={(e) => setColor(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500/50" />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">End color</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={colorEnd} onChange={(e) => setColorEnd(e.target.value)}
                className="w-10 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer p-0.5" />
              <input type="text" value={colorEnd} onChange={(e) => setColorEnd(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500/50" />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Balance adjustment */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Balance Adjustment</h3>
            <p className="text-xs text-white/30 mt-1">
              Current used: {formatMoney({ amount: account.used, currency })}
            </p>
          </div>
          <button
            onClick={() => setAdjustBalance((v) => !v)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-lg border transition-all font-medium',
              adjustBalance
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'
            )}
          >
            {adjustBalance ? 'Enabled' : 'Set balance'}
          </button>
        </div>
        {adjustBalance && (
          <div className="space-y-4 pt-2 border-t border-white/[0.06]">
            <Field label="Amount currently spent (used)">
              <input
                type="number"
                value={targetUsed}
                onChange={(e) => setTargetUsed(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </Field>
            <Field label="Note (shown in transactions)">
              <input
                type="text"
                value={balanceNote}
                onChange={(e) => setBalanceNote(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all"
                placeholder="Initial deposit / Reconciliation..."
              />
            </Field>
            {Math.abs(diff) > 0.001 && (
              <div className={cn(
                'flex items-center gap-2 text-sm rounded-xl px-4 py-2.5',
                diff > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              )}>
                <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                Will create {diff > 0 ? 'income' : 'expense'} of{' '}
                <strong>{formatMoney({ amount: Math.abs(diff), currency })}</strong>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {error && (
        <p className="text-sm text-rose-400 bg-rose-500/10 px-4 py-3 rounded-xl border border-rose-500/20">{error}</p>
      )}

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
        <button
          onClick={handleDelete}
          disabled={saving || deleting}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 disabled:opacity-50 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  )
}
