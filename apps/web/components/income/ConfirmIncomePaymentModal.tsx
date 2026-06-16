'use client'

import { useState } from 'react'
import { X, AlertCircle, CheckCircle2, Building2 } from 'lucide-react'
import { formatMoney, cn } from '@/lib/utils'

type Account = { id: string; name: string; institution: string }

export type ConfirmPaymentProps = {
  sourceId:     string
  sourceName:   string
  period:       string   // "2026-06"
  subPeriod:    1 | 2
  amount:       number
  currency:     string
  account:      Account
  frequency:    string
  onClose:      () => void
  onConfirmed:  (transactionId: string) => void
}

function periodLabel(period: string, subPeriod: 1 | 2, frequency: string) {
  const [year, month] = period.split('-')
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const monthName = months[parseInt(month) - 1]
  if (frequency === 'semimonthly') {
    return subPeriod === 1
      ? `1ra Quincena · ${monthName} ${year}`
      : `2da Quincena · ${monthName} ${year}`
  }
  return `${monthName} ${year}`
}

export function ConfirmIncomePaymentModal({
  sourceId, sourceName, period, subPeriod, amount, currency,
  account, frequency, onClose, onConfirmed,
}: ConfirmPaymentProps) {
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [editAmount, setEditAmount] = useState(String(amount))

  const label = periodLabel(period, subPeriod, frequency)

  async function confirm() {
    setSaving(true)
    const res = await fetch(`/api/income/${sourceId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period,
        subPeriod,
        amount:   parseFloat(editAmount) || amount,
        date,
        note:     note || undefined,
      }),
    })
    if (res.ok) {
      const { data } = await res.json()
      onConfirmed(data.transaction.id)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass rounded-2xl p-6 space-y-5 bg-[#0c0c1a] border border-white/[0.08]">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Confirmar Pago</h2>
            <p className="text-xs text-white/40 mt-0.5">{sourceName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Period badge */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
          <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-violet-200">{label}</span>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">
            Monto recibido ({currency})
          </label>
          <input
            type="number"
            value={editAmount}
            onChange={e => setEditAmount(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 tabular-nums"
          />
          <p className="text-[10px] text-white/25 mt-1">
            Ajusta si el monto real difiere del esperado {formatMoney({ amount, currency: currency as any })}
          </p>
        </div>

        {/* Date */}
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Fecha de depósito</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
          />
        </div>

        {/* Destination account */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <Building2 className="w-4 h-4 text-white/30 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Cuenta destino</p>
            <p className="text-sm text-white/70 font-medium">{account.institution} · {account.name}</p>
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="text-xs text-white/40 uppercase tracking-wider block mb-1.5">Nota (opcional)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={`${label} — ${sourceName}`}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/15 focus:outline-none focus:border-violet-500/50"
          />
        </div>

        {/* Irreversible warning */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/15">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-300/60 leading-relaxed">
            Esta acción creará una transacción de ingreso en tu cuenta. No se puede deshacer desde aquí.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={confirm}
            disabled={saving || !editAmount || !date}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-semibold transition-all',
              'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40'
            )}
          >
            {saving ? 'Registrando…' : 'Confirmar pago'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl glass text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
