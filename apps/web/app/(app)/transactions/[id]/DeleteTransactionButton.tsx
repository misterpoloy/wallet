'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DeleteTransactionButton({ id }: { id: string }) {
  const router = useRouter()
  const [confirm, setConfirm]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState('')

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Failed to delete')
      }
      router.push('/transactions')
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setDeleting(false)
    }
  }

  if (error) {
    return (
      <span className="text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
        {error}
      </span>
    )
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="inline-flex items-center gap-1.5 text-xs text-rose-300/70 hover:text-rose-300 glass px-3 py-1.5 rounded-xl transition-all border border-rose-500/0 hover:border-rose-500/20 hover:bg-rose-500/10"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-rose-300/70">Sure?</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all',
          'bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50'
        )}
      >
        <Trash2 className="w-3.5 h-3.5" />
        {deleting ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button
        onClick={() => setConfirm(false)}
        disabled={deleting}
        className="text-xs text-white/40 hover:text-white/70 glass px-3 py-1.5 rounded-xl transition-all"
      >
        Cancel
      </button>
    </div>
  )
}
