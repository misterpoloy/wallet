'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function NavigationLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hide when navigation completes (pathname or searchParams changed)
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    // Slight delay so fast navigations don't flash
    timeoutRef.current = setTimeout(() => {
      setLoading(false)
      setVisible(false)
    }, 100)
  }, [pathname, searchParams])

  // Show on any internal link click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href) return
      // Skip external, hash-only, and new-tab links
      if (href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || anchor.getAttribute('target') === '_blank') return
      // Skip download links
      if (anchor.hasAttribute('download')) return
      setLoading(true)
      setVisible(true)
    }

    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-200 ${loading ? 'opacity-100' : 'opacity-0'}`}
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(3, 3, 18, 0.6)' }}
    >
      {/* Spinner ring */}
      <div className="relative flex items-center justify-center">
        {/* Outer glow */}
        <div className="absolute w-20 h-20 rounded-full bg-violet-500/20 blur-xl" />
        {/* Glass card */}
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <svg
            className="w-7 h-7 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12" cy="12" r="10"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="2.5"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="url(#spinner-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  )
}
