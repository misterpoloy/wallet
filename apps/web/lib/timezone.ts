export const DEFAULT_TIMEZONE = 'America/Mexico_City'

/**
 * Converts a wall-clock datetime string ("YYYY-MM-DDTHH:mm") interpreted as
 * being in `tz` to a UTC ISO string for storage.
 *
 * Strategy: treat the input as UTC to get an approximate Date, then compute
 * the real UTC offset via Intl, and apply it.
 */
export function wallClockToUTC(wallClock: string, tz: string): string {
  // 1. Parse as if UTC (gives us an approximate anchor)
  const approx = new Date(wallClock + ':00Z')

  // 2. Find what that UTC moment looks like in the target timezone
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(approx)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  const tzLocal = new Date(
    `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`
  )

  // 3. offset = how far apart approx and its tz representation are
  const offsetMs = approx.getTime() - tzLocal.getTime()

  // 4. Real UTC = approx + offset
  return new Date(approx.getTime() + offsetMs).toISOString()
}

/** Returns the current datetime as a local ISO string (YYYY-MM-DDTHH:mm) in the given timezone. */
export function localNow(tz: string = DEFAULT_TIMEZONE): string {
  const now = new Date()
  // Build YYYY-MM-DDTHH:mm in the target timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** Formats a UTC ISO date string for display using the given timezone. */
export function formatInTz(isoStr: string, tz: string = DEFAULT_TIMEZONE, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(isoStr).toLocaleString('en-US', { timeZone: tz, ...opts })
}

/** Returns the calendar day (YYYY-MM-DD) for a UTC ISO string in the given timezone. */
export function dayKeyInTz(isoStr: string, tz: string = DEFAULT_TIMEZONE): string {
  return new Date(isoStr).toLocaleDateString('en-CA', { timeZone: tz })
}
