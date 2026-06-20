'use client'

import { createContext, useContext, useState, useCallback } from 'react'

type Ctx = { show: () => void; hide: () => void }
const LoaderCtx = createContext<Ctx>({ show: () => {}, hide: () => {} })

export function GlobalLoaderProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0)
  const show = useCallback(() => setCount(n => n + 1), [])
  const hide = useCallback(() => setCount(n => Math.max(0, n - 1)), [])

  return (
    <LoaderCtx.Provider value={{ show, hide }}>
      {children}
      {count > 0 && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(7,10,15,0.55)' }}
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute w-16 h-16 rounded-full bg-amber-400/10 blur-2xl" />
            <div
              className="relative w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                <path
                  d="M12 2a10 10 0 0 1 10 10"
                  stroke="url(#gl-spinner)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gl-spinner" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      )}
    </LoaderCtx.Provider>
  )
}

export function useGlobalLoader() {
  return useContext(LoaderCtx)
}
