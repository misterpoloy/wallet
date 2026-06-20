'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CheckSquare, ChevronDown, Search, Bell, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { currentUser } from '@/lib/mock-data'

// ── Waffle icon (Microsoft-style 3×3 grid) ───────────────────────────────────
function WaffleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="currentColor" className={className}>
      <rect x="1"  y="1"  width="5" height="5" rx="1" />
      <rect x="7"  y="1"  width="5" height="5" rx="1" />
      <rect x="13" y="1"  width="5" height="5" rx="1" />
      <rect x="1"  y="7"  width="5" height="5" rx="1" />
      <rect x="7"  y="7"  width="5" height="5" rx="1" />
      <rect x="13" y="7"  width="5" height="5" rx="1" />
      <rect x="1"  y="13" width="5" height="5" rx="1" />
      <rect x="7"  y="13" width="5" height="5" rx="1" />
      <rect x="13" y="13" width="5" height="5" rx="1" />
    </svg>
  )
}

// ── App definitions ───────────────────────────────────────────────────────────
const APPS = [
  {
    id:          'wallet',
    name:        'Wallet',
    description: 'Family finances',
    href:        '/',
    external:    false,
    icon:        null,
    color:       '#1a1a0e',
    colorEnd:    '#2a2800',
    accentText:  '#d4af37',
  },
  {
    id:          'pixie',
    name:        'Pixie',
    description: 'Tasks & projects',
    href:        'http://localhost:34',
    external:    true,
    icon:        CheckSquare,
    color:       '#7B2FBE',   // Teams-like purple — tasks
    colorEnd:    '#5A1A9A',
    accentText:  '#C4A4F0',
  },
] as const

// ── Initials avatar ───────────────────────────────────────────────────────────
function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 select-none"
      style={{ background: color }}
    >
      {initials}
    </div>
  )
}

// ── App Launcher panel ────────────────────────────────────────────────────────
function AppLauncher({ activeAppId, onClose }: { activeAppId: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 w-72 rounded-xl border border-white/[0.10] overflow-hidden"
      style={{
        background: '#1f1f1f',
        boxShadow: '0 8px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-white/[0.07]">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.10em]">Apps</p>
      </div>

      {/* App tiles */}
      <div className="p-3 grid grid-cols-2 gap-2">
        {APPS.map(app => {
          const Icon    = app.icon
          const active  = app.id === activeAppId
          const content = (
            <div
              className={cn(
                'relative flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all cursor-pointer group',
                active
                  ? 'border-white/[0.12] bg-white/[0.06]'
                  : 'border-transparent hover:border-white/[0.08] hover:bg-white/[0.04]'
              )}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}

              {/* App icon tile — Microsoft Office style square */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg overflow-hidden"
                style={{ background: `linear-gradient(145deg, ${app.color}, ${app.colorEnd})` }}
              >
                {app.id === 'wallet' ? (
                  <Image src="/icon.png" alt="Wallet" width={48} height={48} className="w-12 h-12 object-cover" />
                ) : Icon ? (
                  <Icon className="w-6 h-6 text-white" />
                ) : null}
              </div>

              {/* Name + description */}
              <div className="text-center">
                <p className="text-[13px] font-semibold text-white leading-none">{app.name}</p>
                <p className="text-[10px] text-white/35 mt-0.5">{app.description}</p>
              </div>

              {/* External badge */}
              {app.external && (
                <ExternalLink className="absolute top-2 left-2 w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
              )}
            </div>
          )

          return app.external ? (
            <a key={app.id} href={app.href} target="_blank" rel="noopener noreferrer" onClick={onClose}>
              {content}
            </a>
          ) : (
            <Link key={app.id} href={app.href} onClick={onClose}>
              {content}
            </Link>
          )
        })}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2.5 border-t border-white/[0.06] text-center">
        <p className="text-[10px] text-white/20">More apps coming · Okta SSO soon</p>
      </div>
    </div>
  )
}

// ── Top Bar ───────────────────────────────────────────────────────────────────
export function TopBar() {
  const [launcherOpen, setLauncherOpen] = useState(false)
  const pathname = usePathname()

  // Determine active app (always wallet for now)
  const activeApp = APPS[0]

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-11 flex items-center border-b"
      style={{
        background: '#1f1f1f',
        borderColor: 'rgba(255,255,255,0.07)',
      }}
    >
      {/* ── Left: waffle + app identity ─────────────────────────────────────── */}
      <div className="flex items-center h-full relative">
        {/* Waffle button — Microsoft style */}
        <button
          onClick={() => setLauncherOpen(v => !v)}
          className={cn(
            'w-11 h-full flex items-center justify-center transition-colors flex-shrink-0',
            launcherOpen ? 'bg-white/[0.10]' : 'hover:bg-white/[0.06]'
          )}
          aria-label="App launcher"
        >
          <WaffleIcon className="w-[18px] h-[18px] text-white/70" />
        </button>

        {/* App launcher panel */}
        {launcherOpen && (
          <AppLauncher
            activeAppId={activeApp.id}
            onClose={() => setLauncherOpen(false)}
          />
        )}

        {/* Divider */}
        <div className="w-px h-5 bg-white/[0.08] mx-1 flex-shrink-0" />

        {/* Current app icon + name */}
        <div className="flex items-center gap-2 px-3 h-full select-none">
          <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
            <Image src="/icon.png" alt="Wallet" width={20} height={20} className="w-5 h-5 object-cover" />
          </div>
          <span className="text-[13px] font-semibold text-white/90 tracking-tight">
            {activeApp.name}
          </span>
        </div>
      </div>

      {/* ── Center: spacer ──────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Right: actions + user ───────────────────────────────────────────── */}
      <div className="flex items-center h-full pr-3 gap-1">
        {/* Search */}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
          <Search className="w-[15px] h-[15px]" />
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
          <Bell className="w-[15px] h-[15px]" />
          {/* Unread dot */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-yellow-400" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-white/[0.08] mx-1 flex-shrink-0" />

        {/* User avatar */}
        <Link href="/account" className="flex items-center gap-2 px-2 h-8 rounded-lg hover:bg-white/[0.06] transition-colors">
          <Avatar name={currentUser.name} color={currentUser.avatarColor} />
          <span className="text-[12px] text-white/50 leading-none hidden sm:block">
            {currentUser.name.split(' ')[0]}
          </span>
          <ChevronDown className="w-3 h-3 text-white/25 hidden sm:block" />
        </Link>
      </div>
    </header>
  )
}
