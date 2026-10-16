'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

// Open/closed state of the sidebar drawer on small screens (below md).
// On md+ the sidebar is always visible and this state is ignored.

type NavContextValue = { open: boolean; setOpen: (open: boolean) => void; toggle: () => void }

const NavContext = createContext<NavContextValue>({ open: false, setOpen: () => {}, toggle: () => {} })

export function useNav() {
  return useContext(NavContext)
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close after navigating
  useEffect(() => { setOpen(false) }, [pathname])

  // Escape closes; lock page scroll behind the open drawer
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const value = useMemo(() => ({ open, setOpen, toggle: () => setOpen(v => !v) }), [open])
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}
