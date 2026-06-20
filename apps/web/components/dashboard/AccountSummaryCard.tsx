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
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0d14]/80 backdrop-blur-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.04]">
        <h2 className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.08em]">Accounts</h2>
        <Link href="/bank-accounts" className="text-[11px] text-amber-400/70 hover:text-amber-300 transition-colors">
          View all →
        </Link>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {sorted.map((account) => {
          const { value, cls, sub } = accountValue(account)
          return (
            <Link
              key={account.id}
              href={accountHref(account)}
              className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors group"
            >
              <AccountIcon account={account} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white/80 group-hover:text-amber-300 leading-none truncate transition-colors">{account.name}</p>
                <p className="text-[10px] text-white/25 mt-0.5 truncate">{sub}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`text-[13px] font-semibold tabular-nums ${cls}`}>{value}</span>
                <ChevronRight className="w-3 h-3 text-white/15 group-hover:text-amber-400/50 transition-colors" />
              </div>
            </Link>
          )
        })}
      </div>

      <div className="px-5 py-3 border-t border-white/[0.04]">
        <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] text-white/25 hover:text-amber-400/60 hover:bg-amber-400/[0.04] transition-all duration-150">
          <Plus className="w-3 h-3" />
          Add account
        </button>
      </div>
    </div>
  )
}
