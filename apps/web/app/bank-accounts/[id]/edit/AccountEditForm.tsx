'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, RefreshCw, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatMoney } from '@/lib/utils'
import { cn } from '@/lib/utils'

// Preset gradient palettes
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
  accountType: string
  creditLimit: number | null
  balance: number
  logoUrl: string | null
  actionUrl: string | null
}

interface Props {
  account: AccountData
}

export function AccountEditForm({ account }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Editable fields
  const [name, setName] = useState(account.name)
  const [institution, setInstitution] = useState(account.institution)
  const [color, setColor] = useState(account.color)
  const [colorEnd, setColorEnd] = useState(account.colorEnd)
  const [lastFour, setLastFour] = useState(account.lastFour)
  const [logoUrl, setLogoUrl] = useState(account.logoUrl ?? '')
  const [actionUrl, setActionUrl] = useState(account.actionUrl ?? '')
  const [logoError, setLogoError] = useState('')
  const [actionError, setActionError] = useState('')

  // Balance adjustment
  const [adjustBalance, setAdjustBalance] = useState(false)
  const [targetBalance, setTargetBalance] = useState(account.balance.toFixed(2))
  const [balanceNote, setBalanceNote] = useState('Manual balance adjustment')

  // Credit limit (for credit cards)
  const isCreditCard = account.accountType === 'credit_card'
  const [creditLimit, setCreditLimit] = useState(account.creditLimit?.toFixed(2) ?? '')

  const selectedPalette = PALETTES.find((p) => p.from === color && p.to === colorEnd)

  const diff = adjustBalance ? Number(targetBalance) - account.balance : 0
  const currency = account.currency as 'MXN' | 'GTQ' | 'USD'

  function isValidUrl(val: string) {
    if (!val) return true
    try { new URL(val); return true } catch { return false }
  }

  async function handleSave() {
    // Validate URLs before submitting
    const logoErr = logoUrl && !isValidUrl(logoUrl) ? 'Must be a valid URL (https://…)' : ''
    const actionErr = actionUrl && !isValidUrl(actionUrl) ? 'Must be a valid URL (https://…)' : ''
    setLogoError(logoErr)
    setActionError(actionErr)
    if (logoErr || actionErr) return

    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = { name, institution, color, colorEnd }
      if (lastFour) body.lastFour = lastFour
      if (isCreditCard && creditLimit) body.creditLimit = Number(creditLimit)
      body.logoUrl = logoUrl || null
      body.actionUrl = actionUrl || null
      if (adjustBalance) {
        body.targetBalance = Number(targetBalance)
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
        router.push(`/bank-accounts/${account.id}`)
        router.refresh()
      }, 800)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Live preview */}
      <div
        className="relative rounded-3xl p-8 overflow-hidden transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, ${color}, ${colorEnd})`,
          boxShadow: `0 20px 60px ${color}50`,
        }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            {logoUrl && isValidUrl(logoUrl) ? (
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/10 ring-2 ring-white/20 flex-shrink-0">
                <Image src={logoUrl} alt={institution} width={48} height={48} className="w-full h-full object-cover" unoptimized />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-xl flex-shrink-0 ring-2 ring-white/20">🏦</div>
            )}
            <div>
              <p className="text-white/60 text-xs uppercase tracking-widest">{institution}</p>
              <p className="text-white text-2xl font-bold">{name || 'Account Name'}</p>
              {lastFour && (
                <p className="text-white/50 font-mono text-sm tracking-widest">••••••••{lastFour}</p>
              )}
            </div>
          </div>
          <div className="flex items-end justify-between mt-4">
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider">Current Balance</p>
              <p className="text-white text-3xl font-bold mt-1">
                {formatMoney({ amount: Math.abs(adjustBalance ? Number(targetBalance) || 0 : account.balance), currency })}
              </p>
            </div>
            {actionUrl && isValidUrl(actionUrl) && (
              <div className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-medium px-3 py-2 rounded-xl ring-1 ring-white/20">
                <ExternalLink className="w-3.5 h-3.5" /> Open account
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fields */}
      <GlassCard>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-5">Account Details</h3>
        <div className="space-y-4">
          <Field label="Account Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all"
              placeholder="e.g. BBVA 0270"
            />
          </Field>

          <Field label="Institution">
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all"
              placeholder="e.g. BBVA"
            />
          </Field>

          <Field label="Last 4 digits">
            <input
              type="text"
              value={lastFour}
              onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all font-mono tracking-widest"
              placeholder="0270"
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

          <Field label="Online Banking URL" error={actionError}>
            <input
              type="url"
              value={actionUrl}
              onChange={(e) => { setActionUrl(e.target.value); setActionError('') }}
              className={cn(
                'w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:bg-white/[0.07] transition-all',
                actionError ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-violet-500/50'
              )}
              placeholder="https://bancomer.com.mx"
            />
          </Field>

          {isCreditCard && (
            <Field label="Credit Limit">
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </Field>
          )}
        </div>
      </GlassCard>

      {/* Color picker */}
      <GlassCard>
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-5">Accent Color</h3>

        {/* Presets */}
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

        {/* Custom hex inputs */}
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Start color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500/50"
                placeholder="#7c3aed"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">End color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={colorEnd}
                onChange={(e) => setColorEnd(e.target.value)}
                className="w-10 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={colorEnd}
                onChange={(e) => setColorEnd(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-violet-500/50"
                placeholder="#0891b2"
              />
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
              Current: {formatMoney({ amount: Math.abs(account.balance), currency })}
              {account.balance < 0 ? ' (negative)' : ''}
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
            <Field label="Target balance">
              <input
                type="number"
                value={targetBalance}
                onChange={(e) => setTargetBalance(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all"
                step="0.01"
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
                {' '}to reach target
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Actions */}
      {error && (
        <p className="text-sm text-rose-400 bg-rose-500/10 px-4 py-3 rounded-xl border border-rose-500/20">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all',
            saved
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50'
          )}
        >
          {saved ? (
            <><Check className="w-4 h-4" /> Saved!</>
          ) : saving ? (
            'Saving…'
          ) : (
            'Save Changes'
          )}
        </button>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 glass transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-400 mt-1.5">{error}</p>}
    </div>
  )
}
