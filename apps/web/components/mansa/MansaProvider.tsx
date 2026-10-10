'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ChatPanel } from './ChatPanel'

interface MansaContextValue {
  enabled: boolean
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

const MansaContext = createContext<MansaContextValue>({ enabled: false, open: false, setOpen: () => {}, toggle: () => {} })

export function useMansa() {
  return useContext(MansaContext)
}

export function MansaProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((v) => !v), [])

  // ⌘J / Ctrl+J opens the chat from anywhere
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, toggle])

  const value = useMemo(() => ({ enabled, open, setOpen, toggle }), [enabled, open, toggle])
  return (
    <MansaContext.Provider value={value}>
      {children}
      {enabled && <ChatPanel open={open} onClose={() => setOpen(false)} />}
    </MansaContext.Provider>
  )
}
