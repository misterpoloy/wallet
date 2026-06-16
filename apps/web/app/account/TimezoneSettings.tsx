'use client'

import { useState } from 'react'
import { Check, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIMEZONES = [
  { value: 'America/Mexico_City',    label: 'Mexico City',      offset: 'UTC−6' },
  { value: 'America/Monterrey',      label: 'Monterrey',        offset: 'UTC−6' },
  { value: 'America/Chicago',        label: 'Chicago (CT)',     offset: 'UTC−6' },
  { value: 'America/New_York',       label: 'New York (ET)',    offset: 'UTC−5' },
  { value: 'America/Los_Angeles',    label: 'Los Angeles (PT)', offset: 'UTC−8' },
  { value: 'America/Guatemala',      label: 'Guatemala City',   offset: 'UTC−6' },
  { value: 'America/Bogota',         label: 'Bogotá',           offset: 'UTC−5' },
  { value: 'Europe/Madrid',          label: 'Madrid',           offset: 'UTC+2' },
  { value: 'UTC',                    label: 'UTC',              offset: 'UTC+0' },
]

const INPUT = 'w-full bg-white/[0.06] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.09] transition-all'

export function TimezoneSettings({ currentTimezone }: { currentTimezone: string }) {
  const [tz, setTz] = useState(currentTimezone)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: tz }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save timezone')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-white/40 mb-2">
        <Globe className="w-3.5 h-3.5" />
        <span>All transaction dates and times will be shown in this timezone.</span>
      </div>
      <select
        value={tz}
        onChange={e => { setTz(e.target.value); setSaved(false) }}
        className={INPUT}
      >
        {TIMEZONES.map(t => (
          <option key={t.value} value={t.value} className="bg-slate-950">
            {t.label} ({t.offset})
          </option>
        ))}
        {/* If current tz isn't in the list, show it */}
        {!TIMEZONES.find(t => t.value === currentTimezone) && (
          <option value={currentTimezone} className="bg-slate-950">{currentTimezone}</option>
        )}
      </select>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || saved || tz === currentTimezone}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
          saved
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40'
        )}
      >
        {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : saving ? 'Saving…' : 'Save Timezone'}
      </button>
    </div>
  )
}
