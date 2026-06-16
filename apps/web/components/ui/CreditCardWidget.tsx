'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Users, Eye, Edit3 } from 'lucide-react'
import { formatMoney } from '@/lib/utils'
import { ProgressBar } from './ProgressBar'
import type { CreditCard, User } from '@wallet/types'
import { getCardNetworkAsset, getCardNetworkLabel } from '@/lib/card-network'

interface CreditCardWidgetProps {
  card: CreditCard
  users?: User[]
  compact?: boolean
}

export function CreditCardWidget({ card, users = [], compact = false }: CreditCardWidgetProps) {
  const available = card.creditLimit.amount - card.usedCredit.amount
  const sharedUsers = card.sharedWith.map((s) => ({
    ...s,
    user: users.find((u) => u.id === s.userId),
  }))

  return (
    <Link href={`/credit-cards/${card.id}`} className="block group">
      {/* Card face */}
      <div
        className="relative rounded-2xl p-5 overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${card.gradient[0]}, ${card.gradient[1]})`,
          boxShadow: `0 16px 48px ${card.gradient[0]}40`,
          minHeight: compact ? 120 : 160,
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
          style={{ background: card.gradient[1] }}
        />
        <div
          className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full opacity-15"
          style={{ background: card.gradient[0] }}
        />

        <div className="relative z-10 flex justify-between items-start">
          <div>
            <p className="text-white/60 text-xs font-medium tracking-wider uppercase">{card.name}</p>
            {!compact && (
              <p className="text-white/80 font-mono text-sm mt-3 tracking-widest">
                •••• •••• •••• {card.lastFour}
              </p>
            )}
          </div>
          <div className="opacity-90 rounded-xl bg-white/14 px-2.5 py-1.5 backdrop-blur-sm">
            <Image
              src={getCardNetworkAsset(card.network)}
              alt={getCardNetworkLabel(card.network)}
              width={56}
              height={22}
              className="h-[22px] w-auto object-contain"
            />
          </div>
        </div>

        {!compact && (
          <div className="relative z-10 mt-4 flex items-end justify-between">
            <div>
              <p className="text-white/50 text-[10px] uppercase tracking-wider">Available</p>
              <p className="text-white font-semibold text-lg leading-none mt-0.5">
                {formatMoney({ amount: available, currency: card.creditLimit.currency })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-[10px] uppercase tracking-wider">Limit</p>
              <p className="text-white/80 text-sm font-medium">
                {formatMoney(card.creditLimit)}
              </p>
            </div>
          </div>
        )}

        {card.isShared && (
          <div className="absolute top-3 right-3 z-20 bg-white/15 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
            <Users className="w-3 h-3 text-white" />
            <span className="text-[10px] text-white font-medium">Shared</span>
          </div>
        )}
      </div>

      {/* Usage info below card */}
      {!compact && (
        <div className="mt-3 space-y-2">
          <ProgressBar value={card.usedCredit.amount} max={card.creditLimit.amount} />
          <div className="flex justify-between text-xs text-white/40">
            <span>
              Used: <span className="text-white/60">{formatMoney(card.usedCredit)}</span>
            </span>
            <span>
              Statement day: <span className="text-white/60">{card.statementDate}</span>
            </span>
          </div>

          {card.isShared && sharedUsers.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              {sharedUsers.map(({ user, permission }) => (
                <div key={user?.id} className="flex items-center gap-1 text-[10px] text-white/40">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ background: user?.avatarColor ?? '#666' }}
                  >
                    {user?.name[0]}
                  </div>
                  {permission === 'edit' ? (
                    <Edit3 className="w-2.5 h-2.5 text-cyan-400" />
                  ) : (
                    <Eye className="w-2.5 h-2.5 text-white/30" />
                  )}
                </div>
              ))}
              <span className="text-[10px] text-white/30 ml-1">shared</span>
            </div>
          )}
        </div>
      )}
    </Link>
  )
}
