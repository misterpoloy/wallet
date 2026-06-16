import { cn } from '@/lib/utils'
import type { Currency } from '@wallet/types'

const CONFIG: Record<Currency, { label: string; bg: string; text: string }> = {
  MXN: { label: 'MXN', bg: 'bg-green-500/15',  text: 'text-green-400' },
  GTQ: { label: 'GTQ', bg: 'bg-sky-500/15',    text: 'text-sky-400' },
  USD: { label: 'USD', bg: 'bg-violet-500/15', text: 'text-violet-400' },
  COP: { label: 'COP', bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  TRY: { label: 'TRY', bg: 'bg-red-500/15',    text: 'text-red-400' },
  EGP: { label: 'EGP', bg: 'bg-amber-500/15',  text: 'text-amber-400' },
  EUR: { label: 'EUR', bg: 'bg-blue-500/15',   text: 'text-blue-400' },
}

export function CurrencyBadge({ currency, className }: { currency: Currency; className?: string }) {
  const { label, bg, text } = CONFIG[currency]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider',
        bg,
        text,
        className
      )}
    >
      {label}
    </span>
  )
}
