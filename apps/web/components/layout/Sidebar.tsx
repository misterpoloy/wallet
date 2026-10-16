'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BarChart2,
  CreditCard,
  Building2,
  Repeat2,
  Users,
  UserCircle,
  Settings,
  ArrowLeftRight,
  TrendingUp,
  Landmark,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import type { ShellUser } from './types'
import { useNav } from './NavProvider'

type NavItem  = { href: string; icon: React.ElementType; label: string }
type NavGroup = { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
      { href: '/transactions', icon: ArrowLeftRight,  label: 'Transactions' },
      { href: '/overview',     icon: BarChart2,       label: 'Overview'     },
    ],
  },
  {
    label: 'Accounts',
    items: [
      { href: '/bank-accounts', icon: Building2,  label: 'Bank Accounts' },
      { href: '/credit-cards',  icon: CreditCard, label: 'Credit Cards'  },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/income',    icon: TrendingUp, label: 'Income'    },
      { href: '/loans',     icon: Landmark,   label: 'Loans'     },
      { href: '/recurring', icon: Repeat2,    label: 'Recurring' },
    ],
  },
]

const BOTTOM_ITEMS: NavItem[] = [
  { href: '/account',  icon: UserCircle, label: 'Account'  },
  { href: '/family',   icon: Users,      label: 'Family'   },
  { href: '/settings', icon: Settings,   label: 'Settings' },
]

// ── Building blocks ───────────────────────────────────────────────────────────

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { href, icon: Icon, label } = item
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        // Taller rows + larger text on touch screens; compact from md up
        'relative flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-[14px] md:text-[13px] font-medium transition-colors duration-150',
        active
          ? 'bg-amber-400/10 text-amber-300'
          : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04] active:bg-white/[0.06]'
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-400 rounded-r-full" />
      )}
      <Icon className={cn('w-4 h-4 md:w-[15px] md:h-[15px] flex-shrink-0', active && 'text-amber-400')} />
      <span className="tracking-tight">{label}</span>
    </Link>
  )
}

function NavSection({ label, items, isActive }: NavGroup & { isActive: (href: string) => boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em] px-3 mb-1.5">{label}</p>
      <div className="space-y-px">
        {items.map(item => <NavLink key={item.href} item={item} active={isActive(item.href)} />)}
      </div>
    </div>
  )
}

function UserPill({ user }: { user: ShellUser }) {
  return (
    <Link
      href="/account"
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
    >
      <div
        className="w-8 h-8 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
        style={{ background: user.avatarColor }}
      >
        {getInitials(user.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] md:text-[12px] font-semibold text-white/70 truncate leading-tight">{user.name}</p>
        <p className="text-[11px] md:text-[10px] text-white/30 truncate">{user.email}</p>
      </div>
    </Link>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
// md+  : fixed 220px column, always visible (unchanged desktop layout).
// < md : off-canvas drawer, hidden by default, opened from the TopBar menu
//        button; closes on backdrop tap, Escape or navigation (NavProvider).

export function Sidebar({ user }: { user: ShellUser }) {
  const pathname = usePathname()
  const { open, setOpen } = useNav()

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-x-0 top-11 bottom-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      />

      <aside
        id="app-sidebar"
        aria-label="Main navigation"
        className={cn(
          'fixed left-0 top-11 bottom-0 z-40 flex flex-col',
          'w-[min(280px,85vw)] md:w-[220px]',
          'bg-[#070a0f] md:bg-[#070a0f]/95 backdrop-blur-2xl border-r border-white/[0.06]',
          'transition-[transform,visibility] duration-200 ease-out',
          // invisible keeps off-screen links out of the tab order on mobile
          open ? 'translate-x-0 visible shadow-2xl shadow-black/60' : '-translate-x-full invisible',
          'md:translate-x-0 md:visible md:shadow-none'
        )}
      >
        <nav className="flex-1 overflow-y-auto overscroll-contain py-3 px-2 space-y-5">
          {NAV_GROUPS.map(group => <NavSection key={group.label} {...group} isActive={isActive} />)}
        </nav>

        <div className="border-t border-white/[0.05] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="space-y-px mb-3">
            {BOTTOM_ITEMS.map(item => <NavLink key={item.href} item={item} active={isActive(item.href)} />)}
          </div>
          <UserPill user={user} />
        </div>
      </aside>
    </>
  )
}
