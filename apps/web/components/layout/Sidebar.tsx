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
import { currentUser } from '@/lib/mock-data'

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

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <aside className="fixed left-0 top-11 h-[calc(100vh-44px)] w-[220px] z-40 flex flex-col bg-[#070a0f]/95 backdrop-blur-2xl border-r border-white/[0.06]">

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
            <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em] px-3 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-px">
              {group.items.map(({ href, icon: Icon, label }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                      active
                        ? 'bg-amber-400/10 text-amber-300'
                        : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                    )}
                  >
                    {/* Active left bar */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-400 rounded-r-full" />
                    )}
                    <Icon className={cn('w-[15px] h-[15px] flex-shrink-0', active ? 'text-amber-400' : '')} />
                    <span className="tracking-tight">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/[0.05] px-2 py-3">
        <div className="space-y-px mb-3">
          {BOTTOM_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                  active
                    ? 'bg-amber-400/10 text-amber-300'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-400 rounded-r-full" />
                )}
                <Icon className={cn('w-[15px] h-[15px] flex-shrink-0', active ? 'text-amber-400' : '')} />
                <span className="tracking-tight">{label}</span>
              </Link>
            )
          })}
        </div>

        {/* User pill */}
        <Link
          href="/account"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
            style={{ background: currentUser.avatarColor }}
          >
            {getInitials(currentUser.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white/70 truncate leading-tight">{currentUser.name}</p>
            <p className="text-[10px] text-white/30 truncate">{currentUser.email}</p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
        </Link>
      </div>
    </aside>
  )
}
