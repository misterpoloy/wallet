import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Currency, Money } from '@wallet/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CURRENCY_FORMATS: Record<Currency, Intl.NumberFormat> = {
  MXN: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }),
  GTQ: new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
  COP: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }),
  TRY: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }),
  EGP: new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }),
  EUR: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }),
}

export function formatMoney({ amount, currency }: Money): string {
  return CURRENCY_FORMATS[currency].format(amount)
}

export function formatMoneyCompact({ amount, currency }: Money): string {
  const symbols: Record<Currency, string> = { MXN: 'MX$', GTQ: 'Q', USD: '$', COP: 'COP$', TRY: '₺', EGP: 'E£', EUR: '€' }
  if (amount >= 1_000_000) return `${symbols[currency]}${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${symbols[currency]}${(amount / 1_000).toFixed(1)}K`
  return `${symbols[currency]}${amount.toLocaleString()}`
}

export function creditUsagePercent(used: number, limit: number): number {
  return Math.min(Math.round((used / limit) * 100), 100)
}

export function creditUsageColor(percent: number): string {
  if (percent < 30) return 'from-emerald-400 to-green-500'
  if (percent < 60) return 'from-amber-400 to-yellow-500'
  if (percent < 85) return 'from-orange-400 to-orange-500'
  return 'from-red-400 to-rose-500'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const CURRENCY_COLORS: Record<Currency, string> = {
  MXN: 'text-green-400',
  GTQ: 'text-sky-400',
  USD: 'text-violet-400',
  COP: 'text-yellow-400',
  TRY: 'text-red-400',
  EGP: 'text-amber-400',
  EUR: 'text-blue-400',
}

export function getCurrencyColor(currency: Currency): string {
  return CURRENCY_COLORS[currency]
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
