'use client'

import Link from 'next/link'
import { Crown, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ShellUser } from './types'
import { useMansa } from '@/components/mansa/MansaProvider'
import { useNav } from './NavProvider'

// ── Initials avatar ───────────────────────────────────────────────────────────
function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 select-none ring-1 ring-white/10"
      style={{ background: color }}
    >
      {initials}
    </div>
  )
}

// ── Top Bar ───────────────────────────────────────────────────────────────────
// Mobile first: menu button (opens the sidebar drawer) + brand on the left,
// Mansa Musa + avatar on the right. Labels appear from sm up; the menu button
// hides from md up, where the sidebar is always visible.
// Height stays h-11 — the sidebar and the Mansa chat panel hang from top-11.
export function TopBar({ user }: { user: ShellUser }) {
  const mansa = useMansa()
  const nav = useNav()
  const firstName = user.name.split(' ')[0]

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-11 flex items-center gap-1 px-1.5 sm:px-3 border-b border-white/[0.06] bg-[#070a0f]/90 backdrop-blur-xl">
      {/* ── Left: menu (mobile) + brand ─────────────────────────────────────── */}
      <button
        onClick={nav.toggle}
        aria-label={nav.open ? 'Close menu' : 'Open menu'}
        aria-expanded={nav.open}
        aria-controls="app-sidebar"
        className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.10] transition-colors"
      >
        {nav.open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <Link
        href="/dashboard"
        className="flex items-center gap-2 h-10 px-1.5 md:px-2 rounded-lg hover:bg-white/[0.04] transition-colors select-none"
      >
        <img src="/icon.png" alt="" className="w-6 h-6 rounded-md object-cover" />
        <span className="text-[14px] font-semibold text-white/90 tracking-tight">Wallet</span>
      </Link>

      <div className="flex-1" />

      {/* ── Right: Mansa Musa + user ────────────────────────────────────────── */}
      {mansa.enabled && (
        <button
          onClick={mansa.toggle}
          title="Mansa Musa (⌘J)"
          aria-label="Mansa Musa"
          aria-pressed={mansa.open}
          className={cn(
            'flex items-center justify-center gap-1.5 h-10 min-w-10 px-2.5 rounded-lg text-[12px] font-medium transition-colors',
            mansa.open
              ? 'bg-amber-400/15 text-amber-300'
              : 'text-amber-300/80 hover:bg-white/[0.06] active:bg-white/[0.10]'
          )}
        >
          <Crown className="w-4 h-4" />
          <span className="hidden sm:inline">Mansa Musa</span>
        </button>
      )}

      <Link
        href="/account"
        aria-label="Account"
        className="flex items-center gap-2 h-10 pl-1 pr-1 sm:pr-2.5 rounded-full sm:rounded-lg hover:bg-white/[0.06] transition-colors"
      >
        <Avatar name={user.name} color={user.avatarColor} />
        <span className="hidden sm:block max-w-[120px] truncate text-[12px] text-white/60 leading-none">
          {firstName}
        </span>
      </Link>
    </header>
  )
}
