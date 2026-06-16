'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_TIMEZONE } from '@/lib/timezone'

const TimezoneContext = createContext<string>(DEFAULT_TIMEZONE)

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [tz, setTz] = useState<string>(DEFAULT_TIMEZONE)

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(j => { if (j.data?.timezone) setTz(j.data.timezone) })
      .catch(() => {})
  }, [])

  return <TimezoneContext.Provider value={tz}>{children}</TimezoneContext.Provider>
}

export function useTimezone() {
  return useContext(TimezoneContext)
}
