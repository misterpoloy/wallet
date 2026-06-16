import Link from 'next/link'
import Image from 'next/image'
import { cn, formatMoney, formatDateShort } from '@/lib/utils'
import type { ApiTransaction } from '@/lib/api-client'
import { toNum } from '@/lib/api-client'

export const CATEGORY_ICONS: Record<string, string> = {
  // CSV raw categories
  'Dining': '🍽️',
  'Shopping': '🛍️',
  'Income': '💰',
  'Groceries': '🛒',
  'Entertainment': '🎬',
  'Transport': '🚗',
  'Transfer': '↔️',
  'Technology': '💻',
  'Health': '🏥',
  'Housing': '🏠',
  'Family': '👨‍👩‍👧',
  'Utilities': '💡',
  'Pets': '🐾',
  'Finance': '📊',
  'Travel': '✈️',
  'Gifts': '🎁',

  // CSV raw category strings (kept for round-trip fidelity)
  'Software, apps, games': '💻',
  'Vehicle': '🚗',
  'Financial expenses': '📊',
  'Insurances': '🛡️',
  'Restaurant, fast-food': '🍽️',
  'Rent': '🏠',
  'Bar, cafe': '☕',
  'Active sport, fitness': '🏋️',
  'TV, Streaming': '📺',
  'Electronics, accessories': '📱',
  'Alcohol, tobacco': '🍺',
  'Pets, animals': '🐾',
  'Clothes & Footwear': '👟',
  'Food & Drinks': '🥤',
  'Health care, doctor': '🏥',
  'Fuel': '⛽',
  'Loans, interests': '💳',
  'Transportation': '🚌',
  'Jewels, accessories': '💎',
  'Taxi': '🚕',
  'Life & Entertainment': '🎉',
  'Taxes': '📋',
  'Internet': '🌐',
  'Energy, utilities': '💡',
  'Home, garden': '🌿',
  'Holiday, trips, hotels': '✈️',
  'Wage, invoices': '💰',
  'Charity, gifts': '🎁',
  'Communication, PC': '💻',
  'Mortgage': '🏡',
  'Transfer, withdraw': '↔️',
}

interface TransactionRowProps {
  transaction: ApiTransaction
  className?: string
  /** When false the row is a plain div (e.g. inside a detail page) */
  linkable?: boolean
}

export function TransactionRow({ transaction, className, linkable = true }: TransactionRowProps) {
  const icon = CATEGORY_ICONS[transaction.category] ?? CATEGORY_ICONS[transaction.categoryRaw] ?? '💳'
  const isIncome = transaction.type === 'income'
  const isTransfer = transaction.type === 'transfer'

  const label = transaction.payee || transaction.note || transaction.category
  const amount = toNum(transaction.amount)

  const formatted = formatMoney({ amount, currency: transaction.currency })

  const inner = (
    <>
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-base flex-shrink-0">
        {isTransfer ? '↔️' : icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{label}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {transaction.account.logoUrl ? (
            <Image
              src={transaction.account.logoUrl}
              alt={transaction.account.institution}
              width={12}
              height={12}
              className="w-3 h-3 rounded-sm object-cover flex-shrink-0"
              unoptimized
            />
          ) : (
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${transaction.account.color}, ${transaction.account.colorEnd})` }}
            />
          )}
          <p className="text-xs text-white/40 truncate">
            {transaction.account.name} · {transaction.category} · {formatDateShort(transaction.date)}
          </p>
        </div>
      </div>
      <div className={cn(
        'text-sm font-semibold flex-shrink-0',
        isIncome ? 'text-emerald-400' : isTransfer ? 'text-sky-400' : 'text-white/80'
      )}>
        {isIncome ? '+' : isTransfer ? '' : '-'}{formatted}
      </div>
    </>
  )

  const base = cn('flex items-center gap-3 py-3', className)

  if (!linkable) return <div className={base}>{inner}</div>

  return (
    <Link
      href={`/transactions/${transaction.id}`}
      className={cn(base, 'hover:bg-white/[0.03] rounded-xl px-2 -mx-2 transition-colors group')}
    >
      {inner}
    </Link>
  )
}
