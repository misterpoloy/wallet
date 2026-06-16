'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  accountId: string
  accountName: string
  redirectTo: string  // where to navigate after deletion
}

export function DeleteAccountSection({ accountId, accountName, redirectTo }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const normalize = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const nameMatch = normalize(confirmName) === normalize(accountName)
  const canDelete = nameMatch && acknowledged

  async function handleDelete() {
    if (!canDelete) return
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hard: true }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Failed to delete account')
      }
      router.push(redirectTo)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <TriangleAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-400">Danger Zone</p>
            <p className="text-xs text-white/40 mt-0.5">This action cannot be undone</p>
          </div>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-xl transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Account
          </button>
        )}
      </div>

      {/* Expanded confirmation */}
      {open && (
        <div className="border-t border-rose-500/15 px-5 py-5 space-y-5">
          {/* Type account name */}
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider block mb-2">
              Type <span className="font-mono font-bold text-white/80">{accountName}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={accountName}
              autoFocus
              className={cn(
                'w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none transition-all font-mono',
                nameMatch && confirmName.length > 0
                  ? 'border-emerald-500/50 focus:border-emerald-500'
                  : 'border-white/10 focus:border-rose-500/50'
              )}
            />
          </div>

          {/* Acknowledgement checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                acknowledged
                  ? 'bg-rose-500 border-rose-500'
                  : 'bg-white/5 border-white/20 group-hover:border-rose-500/50'
              )}>
                {acknowledged && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <p className="text-sm text-white/60 leading-snug group-hover:text-white/80 transition-colors">
              I understand that <span className="font-semibold text-rose-400">all transactions</span> linked to this account will be permanently deleted and cannot be recovered.
            </p>
          </label>

          {/* Error */}
          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 px-4 py-3 rounded-xl border border-rose-500/20">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleDelete}
              disabled={!canDelete || deleting}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                canDelete && !deleting
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-rose-900/40 text-rose-500/40 cursor-not-allowed'
              )}
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting…' : 'Permanently Delete'}
            </button>
            <button
              onClick={() => { setOpen(false); setConfirmName(''); setAcknowledged(false); setError('') }}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
