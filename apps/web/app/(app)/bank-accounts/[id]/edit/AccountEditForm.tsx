'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
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
  currentBalance: number
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
  const [adjustMode, setAdjustMode] = useState<'target' | 'delta'>('target')
  const [targetInput, setTargetInput] = useState(account.currentBalance.toFixed(2))
  const [deltaInput, setDeltaInput] = useState('')
  const [deltaType, setDeltaType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [balanceNote, setBalanceNote] = useState('Manual balance adjustment')

  const isCreditCard = account.accountType === 'credit_card'
  const [creditLimit, setCreditLimit] = useState(account.creditLimit?.toFixed(2) ?? '')

  const selectedPalette = PALETTES.find((p) => p.from === color && p.to === colorEnd)
  const currency = account.currency as 'MXN' | 'GTQ' | 'USD'

  const computedTarget: number = (() => {
    if (!adjustBalance) return account.currentBalance
    if (adjustMode === 'target') return Number(targetInput) || 0
    const delta = Math.max(0, Number(deltaInput) || 0)
    return deltaType === 'deposit'
      ? account.currentBalance + delta
      : account.currentBalance - delta
  })()

  const diff = computedTarget - account.currentBalance

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
      if (adjustBalance && Math.abs(diff) > 0.001) {
        body.targetBalance = computedTarget
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
              <p className={`text-3xl font-bold mt-1 ${computedTarget < 0 ? 'text-rose-300' : 'text-white'}`}>
                {computedTarget < 0 ? '-' : ''}{formatMoney({ amount: Math.abs(computedTarget), currency })}
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
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Current Balance</h3>
            <p className="text-xs text-white/30 mt-1">
              Current: {account.currentBalance < 0 ? '-' : ''}{formatMoney({ amount: Math.abs(account.currentBalance), currency })}
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
            {adjustBalance ? 'Adjusting' : 'Adjust balance'}
          </button>
        </div>

        {adjustBalance && (
          <div className="space-y-4 pt-2 border-t border-white/[0.06]">
            {/* Mode tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
              <button
                onClick={() => setAdjustMode('target')}
                className={cn(
                  'flex-1 text-xs py-2 rounded-lg font-medium transition-all',
                  adjustMode === 'target'
                    ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40'
                    : 'text-white/40 hover:text-white/60'
                )}
              >
                Set new balance
              </button>
              <button
                onClick={() => setAdjustMode('delta')}
                className={cn(
                  'flex-1 text-xs py-2 rounded-lg font-medium transition-all',
                  adjustMode === 'delta'
                    ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40'
                    : 'text-white/40 hover:text-white/60'
                )}
              >
                Add deposit / withdrawal
              </button>
            </div>

            {adjustMode === 'target' ? (
              <Field label="What should the balance be?">
                <input
                  type="number"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all"
                  step="0.01"
                  placeholder="0.00"
                />
              </Field>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeltaType('deposit')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl font-medium border transition-all',
                      deltaType === 'deposit'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                    )}
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> Deposit
                  </button>
                  <button
                    onClick={() => setDeltaType('withdrawal')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-xl font-medium border transition-all',
                      deltaType === 'withdrawal'
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
                    )}
                  >
                    <TrendingDown className="w-3.5 h-3.5" /> Withdrawal
                  </button>
                </div>
                <Field label="Amount">
                  <input
                    type="number"
                    value={deltaInput}
                    onChange={(e) => setDeltaInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </Field>
              </div>
            )}

            <Field label="Note (shown in transactions)">
              <input
                type="text"
                value={balanceNote}
                onChange={(e) => setBalanceNote(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.07] transition-all"
                placeholder="Manual balance adjustment"
              />
            </Field>

            {Math.abs(diff) > 0.001 && (
              <div className={cn(
                'flex items-center gap-2 text-sm rounded-xl px-4 py-2.5',
                diff > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              )}>
                {diff > 0
                  ? <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                  : <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
                }
                Will record a{' '}
                <strong>{formatMoney({ amount: Math.abs(diff), currency })}</strong>
                {diff > 0 ? ' deposit' : ' withdrawal'}.
                {' '}New balance:{' '}
                <strong>{computedTarget < 0 ? '-' : ''}{formatMoney({ amount: Math.abs(computedTarget), currency })}</strong>
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
