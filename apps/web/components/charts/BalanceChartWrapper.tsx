'use client'

import dynamic from 'next/dynamic'
import type { BalanceDataPoint } from './BalanceChart'

// Recharts needs the browser DOM for ResizeObserver — disable SSR entirely
const BalanceChart = dynamic(
  () => import('./BalanceChart').then((m) => m.BalanceChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[190px] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    ),
  }
)

export { BalanceChart }
export type { BalanceDataPoint }
