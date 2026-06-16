'use client'

import Link from 'next/link'
import { Plus, CreditCard, ChevronRight } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import { toNum } from '@/lib/api-client'
import type { ApiAccount } from '@/lib/api-client'

function AccountIcon({ account }: { account: ApiAccount }) {
  if (account.accountType === 'cash') {
    return (
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-sm flex-shrink-0">
        💵
      </div>
    )
  }
  if (account.accountType === 'credit_card') {
    return (
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${account.color}, ${account.colorEnd})` }}
      >
        <CreditCard className="w-3.5 h-3.5 text-white/80" />
      </div>
    )
  }
  return (
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
      style={{ background: `linear-gradient(135deg, ${account.color}, ${account.colorEnd})` }}
    >
      🏦
    </div>
  )
}

function accountHref(account: ApiAccount) {
  if (account.accountType === 'credit_card') return `/credit-cards/${account.id}`
  return `/bank-accounts/${account.id}`
}

function accountValue(account: ApiAccount) {
  if (account.accountType === 'credit_card') {
    const limit = toNum(account.creditLimit)
    const used = Math.abs(Math.min(account.balance, 0))
    const available = Math.max(0, limit - used)
    return {
      value: formatMoney({ amount: available, currency: account.currency }),
      cls: 'text-emerald-400',
      sub: `Available · ${account.lastFour ? `••••${account.lastFour}` : 'credit'}`,
    }
  }
  return {
    value: formatMoney({ amount: Math.abs(account.balance), currency: account.currency }),
    cls: account.balance >= 0 ? 'text-white' : 'text-rose-400',
    sub: account.accountType === 'cash'
      ? 'Cash on hand'
      : `${account.institution}${account.lastFour ? ` · ••••${account.lastFour}` : ''}`,
  }
}

interface AccountSummaryCardProps {
  accounts: ApiAccount[]
}

export function AccountSummaryCard({ accounts }: AccountSummaryCardProps) {
  // Show all accounts, sorted by sortOrder
  const sorted = [...accounts].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-sm font-semibold text-white">Account Summary</h2>
        <Link href="/wallet" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
          All accounts →
        </Link>
      </div>

      <div className="divide-y divide-white/[0.05]">
        {sorted.map((account) => {
          const { value, cls, sub } = accountValue(account)
          return (
            <Link
              key={account.id}
              href={accountHref(account)}
              className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.04] transition-colors group"
            >
              <AccountIcon account={account} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white leading-none truncate">{account.name}</p>
                <p className="text-[11px] text-white/35 mt-0.5 truncate">{sub}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`text-sm font-semibold tabular-nums ${cls}`}>{value}</span>
                <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
              </div>
            </Link>
          )
        })}
      </div>

      <div className="px-5 py-3 border-t border-white/[0.05]">
        <button className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all duration-150">
          <Plus className="w-3.5 h-3.5" />
          Add account
        </button>
      </div>
    </div>
  )
}
