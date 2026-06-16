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
  ChevronRight,
  Sparkles,
  ArrowLeftRight,
  TrendingUp,
  Landmark,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { currentUser, tenant } from '@/lib/mock-data'

type NavItem = { href: string; icon: React.ElementType; label: string }
type NavGroup = { items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
      { href: '/transactions', icon: ArrowLeftRight,  label: 'Transactions' },
    ],
  },
  {
    items: [
      { href: '/bank-accounts', icon: Building2,  label: 'Bank Accounts' },
      { href: '/credit-cards',  icon: CreditCard, label: 'Credit Cards'  },
    ],
  },
  {
    items: [
      { href: '/income',    icon: TrendingUp,    label: 'Income'    },
      { href: '/loans',     icon: Landmark,      label: 'Loans'     },
      { href: '/recurring', icon: Repeat2,       label: 'Recurring' },
    ],
  },
  {
    items: [
      { href: '/overview', icon: BarChart2, label: 'Overview' },
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
    <aside className="fixed left-0 top-0 h-full w-[240px] z-40 flex flex-col py-5 px-3 glass border-r border-white/[0.07]">
      {/* Logo */}
      <div className="px-3 mb-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">{tenant.name}</p>
          <p className="text-[10px] text-white/40 mt-0.5 capitalize">{tenant.plan} plan</p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div className="h-px bg-white/[0.07] my-2 mx-1" />}
            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive(href)
                      ? 'bg-white/[0.1] text-white border border-white/[0.12]'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
                  )}
                >
                  <Icon className={cn('w-4 h-4 flex-shrink-0', isActive(href) ? 'text-violet-400' : '')} />
                  <span>{label}</span>
                  {isActive(href) && <ChevronRight className="w-3 h-3 ml-auto text-white/30" />}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="h-px bg-white/[0.07] my-3 mx-1" />

      {/* Bottom nav */}
      <nav className="space-y-0.5 mb-4">
        {BOTTOM_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive(href)
                ? 'bg-white/[0.1] text-white border border-white/[0.12]'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
            )}
          >
            <Icon className={cn('w-4 h-4 flex-shrink-0', isActive(href) ? 'text-violet-400' : '')} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* User pill */}
      <Link
        href="/account"
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors duration-150 group"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: currentUser.avatarColor }}
        >
          {getInitials(currentUser.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/80 truncate">{currentUser.name}</p>
          <p className="text-[10px] text-white/40 truncate">{currentUser.email}</p>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
      </Link>
    </aside>
  )
}
