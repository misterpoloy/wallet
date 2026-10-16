// Shared helpers for Mansa Musa tool handlers: timezone-aware day ranges and exact money strings.

import { Prisma } from '@wallet/db'
import { dayKeyInTz, wallClockToUTC } from '@/lib/timezone'

export type Dec = Prisma.Decimal
export const ZERO = new Prisma.Decimal(0)

export function dec(v: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal {
  if (v === null || v === undefined) return ZERO
  return v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v)
}

export function maxDec(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return a.gt(b) ? a : b
}

/** Decimal → "1234.50" (what the tool contracts expect). */
export function money(v: Prisma.Decimal | number | string | null | undefined): string {
  return dec(v).toFixed(2)
}

export function moneyOrNull(v: Prisma.Decimal | number | string | null | undefined): string | null {
  return v === null || v === undefined ? null : money(v)
}

/** Calendar day (YYYY-MM-DD) of a stored UTC instant, in the user's timezone. */
export function dayOf(d: Date, tz: string): string {
  return dayKeyInTz(d.toISOString(), tz)
}

export function todayIn(tz: string): string {
  return dayOf(new Date(), tz)
}

/** [start of `from`, end of `to`] in the user's timezone, as UTC instants for Prisma. */
export function dayRange(from: string | undefined, to: string | undefined, tz: string): { gte?: Date; lte?: Date } {
  const range: { gte?: Date; lte?: Date } = {}
  if (from) range.gte = new Date(wallClockToUTC(`${from}T00:00`, tz))
  if (to) range.lte = new Date(new Date(wallClockToUTC(`${to}T23:59`, tz)).getTime() + 59_999)
  return range
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate()
}

/** The day-of-month `dom` (clamped to the month length) for year/month. */
export function clampedDay(year: number, month1: number, dom: number): string {
  const d = Math.min(dom, lastDayOfMonth(year, month1))
  return `${year}-${String(month1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Next date on or after `from` that falls on day-of-month `dom`. */
export function nextMonthlyDate(from: string, dom: number): string {
  const [y, m] = from.split('-').map(Number) as [number, number]
  const thisMonth = clampedDay(y, m, dom)
  if (thisMonth >= from) return thisMonth
  return m === 12 ? clampedDay(y + 1, 1, dom) : clampedDay(y, m + 1, dom)
}

/** Monthly multiplier per recurring frequency (same table the Overview page uses). */
export const FREQ_PER_MONTH: Record<string, number> = {
  daily: 30.4167,
  weekly: 4.3333,
  twice_monthly: 2,
  monthly: 1,
  quarterly: 1 / 3,
  annual: 1 / 12,
}

export function sumBy<T>(items: T[], key: (t: T) => string, value: (t: T) => Prisma.Decimal): Map<string, Prisma.Decimal> {
  const out = new Map<string, Prisma.Decimal>()
  for (const item of items) {
    const k = key(item)
    out.set(k, (out.get(k) ?? ZERO).plus(value(item)))
  }
  return out
}
