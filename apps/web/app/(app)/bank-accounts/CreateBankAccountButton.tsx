'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

const PALETTES = [
  { from: '#1a3775', to: '#0891b2' },
  { from: '#7c3aed', to: '#6366f1' },
  { from: '#059669', to: '#0d9488' },
  { from: '#b45309', to: '#d97706' },
  { from: '#dc2626', to: '#ea580c' },
  { from: '#0f172a', to: '#1e3a5f' },
]

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings',  label: 'Savings'  },
  { value: 'debit',    label: 'Debit'    },
  { value: 'cash',     label: 'Cash'     },
]

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

export function CreateBankAccountButton() {
  const router = useRouter()
  const [open, setOpen]             = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [name, setName]             = useState('')
  const [institution, setInstitution] = useState('')
  const [accountType, setAccountType] = useState('checking')
  const [currency, setCurrency]     = useState<'MXN' | 'GTQ' | 'USD'>('MXN')
  const [lastFour, setLastFour]     = useState('')
  const [logoUrl, setLogoUrl]       = useState('')
  const [initialBalance, setInitialBalance] = useState('')
  const [palette, setPalette]       = useState(PALETTES[0])

  function reset() {
    setName(''); setInstitution(''); setAccountType('checking')
    setCurrency('MXN'); setLastFour(''); setLogoUrl('')
    setInitialBalance(''); setPalette(PALETTES[0]); setError('')
  }

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
          accountType,
          currency,
          lastFour: lastFour || undefined,
          logoUrl: logoUrl || undefined,
          initialBalance: initialBalance ? Number(initialBalance) : 0,
          color: palette.from,
          colorEnd: palette.to,
        }),
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Failed to create account')
      }

      const j = await res.json()
      const createdId = j.data?.id as string | undefined
      setOpen(false)
      reset()
      router.refresh()
      if (createdId) router.push(`/bank-accounts/${createdId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass rounded-2xl p-5 border border-dashed border-white/10 flex items-center justify-center gap-3 h-16 w-full hover:bg-white/[0.05] hover:border-white/20 transition-all duration-200 group"
      >
        <div className="w-7 h-7 rounded-xl bg-white/[0.06] flex items-center justify-center group-hover:bg-white/10 transition-colors">
          <Plus className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 transition-colors" />
        </div>
        <span className="text-sm text-white/30 font-medium group-hover:text-white/60 transition-colors">Add Bank Account</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <GlassCard className="w-full max-w-xl p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">Add Bank Account</h2>
                <p className="text-sm text-white/40 mt-1">Set up a new bank or cash account.</p>
              </div>
              <button type="button" onClick={() => { setOpen(false); reset() }} className="text-white/40 hover:text-white/80 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Account Name">
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClassName} placeholder="BBVA 0270" />
                </Field>
                <Field label="Institution">
                  <input value={institution} onChange={(e) => setInstitution(e.target.value)} className={inputClassName} placeholder="BBVA" />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Type">
                  <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className={inputClassName}>
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-slate-950">{t.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Currency">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value as 'MXN' | 'GTQ' | 'USD')} className={inputClassName}>
                    <option value="MXN" className="bg-slate-950">MXN</option>
                    <option value="GTQ" className="bg-slate-950">GTQ</option>
                    <option value="USD" className="bg-slate-950">USD</option>
                  </select>
                </Field>
                <Field label="Last 4 digits">
                  <input value={lastFour} onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))} className={inputClassName} placeholder="0270" />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Initial Balance">
                  <input type="number" step="0.01" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} className={inputClassName} placeholder="0.00" />
                </Field>
                <Field label="Logo Image URL (optional)">
                  <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className={inputClassName} placeholder="https://…" />
                </Field>
              </div>

              <Field label="Card Color">
                <div className="grid grid-cols-6 gap-2.5">
                  {PALETTES.map((p) => (
                    <button
                      key={`${p.from}-${p.to}`}
                      type="button"
                      onClick={() => setPalette(p)}
                      className={cn(
                        'h-10 rounded-xl transition-all',
                        palette.from === p.from ? 'ring-2 ring-white/70 scale-105' : 'opacity-60 hover:opacity-90'
                      )}
                      style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
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
                {saving ? 'Creating…' : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); reset() }}
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
