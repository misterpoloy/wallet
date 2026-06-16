'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  year: number
  month: number // 1-12
}

export function MonthNav({ year, month }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function navigate(delta: number) {
    const d = new Date(year, month - 1 + delta, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    router.push(`${pathname}?month=${y}-${m}`)
  }

  const label = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const isFutureMonth = new Date(year, month - 1) > new Date(now.getFullYear(), now.getMonth())

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => navigate(-1)}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-all"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <span className="text-sm font-semibold text-white min-w-[130px] text-center">
        {label}
        {isCurrentMonth && (
          <span className="ml-2 text-[10px] font-medium text-violet-400 bg-violet-500/15 px-1.5 py-0.5 rounded-full">
            Now
          </span>
        )}
      </span>

      <button
        onClick={() => navigate(+1)}
        disabled={isFutureMonth}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        aria-label="Next month"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
