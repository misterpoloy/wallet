'use client'

import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import { CurrencyBadge } from './CurrencyBadge'
import type { BankAccount } from '@wallet/types'

const BANK_CONFIG: Record<string, { color: string; bg: string; flag: string }> = {
  BBVA: { color: '#004481', bg: 'from-[#004481] to-[#1464a0]', flag: '🇲🇽' },
  BI: { color: '#003a8c', bg: 'from-[#003a8c] to-[#1a56c4]', flag: '🇬🇹' },
  Banamex: { color: '#c8102e', bg: 'from-[#c8102e] to-[#e63950]', flag: '🇲🇽' },
  Santander: { color: '#cc0000', bg: 'from-[#cc0000] to-[#e60000]', flag: '🇲🇽' },
  other: { color: '#374151', bg: 'from-[#374151] to-[#4b5563]', flag: '🏦' },
}

interface BankAccountWidgetProps {
  account: BankAccount
}

export function BankAccountWidget({ account }: BankAccountWidgetProps) {
  const config = BANK_CONFIG[account.bank] ?? BANK_CONFIG.other
  const typeLabel = account.type === 'checking' ? 'Checking' : account.type === 'savings' ? 'Savings' : 'Investment'

  return (
    <Link href={`/bank-accounts/${account.id}`} className="block group">
      <div className="glass rounded-2xl p-5 glass-hover transition-all duration-200 group-hover:scale-[1.01]">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.bg} flex items-center justify-center flex-shrink-0 shadow-lg`}
          >
            <span className="text-xl">{config.flag}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold text-white">{account.name}</p>
              <CurrencyBadge currency={account.balance.currency} />
            </div>
            <p className="text-xs text-white/40">
              {account.bank} · {typeLabel} · ••••{account.lastFour}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-lg font-semibold text-white">{formatMoney(account.balance)}</p>
            <p className="text-[10px] text-white/30 mt-0.5">Available</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
