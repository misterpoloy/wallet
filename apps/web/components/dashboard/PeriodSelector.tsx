'use client'

import { ChevronDown, ArrowLeftRight, CalendarDays, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MONTH_NAMES, CURRENT_YEAR, CURRENT_MONTH } from '@/lib/mock-data'

export type PeriodMode = 'prev-month' | 'custom-month' | 'year'

export interface PeriodState {
  mode: PeriodMode
  // custom-month: which month/year to compare current against
  customYear: number
  customMonth: number // 0-indexed
  // year view: which years to display
  viewYear: number
  compareYear: number
}

interface PeriodSelectorProps {
  state: PeriodState
  onChange: (s: PeriodState) => void
}

const AVAILABLE_YEARS = [2024, 2025, 2026]

export function PeriodSelector({ state, onChange }: PeriodSelectorProps) {
  const set = (patch: Partial<PeriodState>) => onChange({ ...state, ...patch })

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Mode tabs */}
      <div className="border border-white/[0.06] bg-[#0a0d14]/60 backdrop-blur-xl flex items-center gap-0.5 p-1 rounded-lg">
        {(
          [
            { mode: 'prev-month' as PeriodMode, icon: ArrowLeftRight, label: 'Prev Month' },
            { mode: 'custom-month' as PeriodMode, icon: CalendarDays, label: 'Custom' },
            { mode: 'year' as PeriodMode, icon: BarChart3, label: 'Year View' },
          ] as const
        ).map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => set({ mode })}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
              state.mode === mode
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/25'
                : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Contextual pickers */}
      {state.mode === 'custom-month' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30">vs</span>
          {/* Month picker */}
          <div className="relative">
            <select
              value={state.customMonth}
              onChange={(e) => set({ customMonth: Number(e.target.value) })}
              className="appearance-none border border-white/[0.06] bg-[#0a0d14]/60 rounded-lg px-3 py-1.5 pr-7 text-xs text-white/70 font-medium cursor-pointer focus:outline-none hover:bg-white/[0.04] transition-colors"
            >
              {MONTH_NAMES.map((m, i) => {
                // Disable future months in current year, or all months if future year
                const isFuture =
                  state.customYear === CURRENT_YEAR
                    ? i >= CURRENT_MONTH
                    : state.customYear > CURRENT_YEAR
                return (
                  <option key={m} value={i} disabled={isFuture} className="bg-[#0d0d24]">
                    {m}
                  </option>
                )
              })}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
          </div>

          {/* Year picker */}
          <div className="relative">
            <select
              value={state.customYear}
              onChange={(e) => {
                const y = Number(e.target.value)
                // Clamp month if switching to current year and month is in the future
                const clampedMonth =
                  y === CURRENT_YEAR
                    ? Math.min(state.customMonth, CURRENT_MONTH - 1)
                    : state.customMonth
                set({ customYear: y, customMonth: Math.max(0, clampedMonth) })
              }}
              className="appearance-none glass rounded-lg px-3 py-1.5 pr-7 text-xs text-white/80 font-medium cursor-pointer focus:outline-none hover:bg-white/[0.09] transition-colors"
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y} className="bg-[#0d0d24]">
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
          </div>
        </div>
      )}

      {state.mode === 'year' && (
        <div className="flex items-center gap-2">
          {/* Primary year */}
          <div className="relative">
            <select
              value={state.viewYear}
              onChange={(e) => set({ viewYear: Number(e.target.value) })}
              className="appearance-none border border-white/[0.06] bg-[#0a0d14]/60 rounded-lg px-3 py-1.5 pr-7 text-xs text-amber-300 font-semibold cursor-pointer focus:outline-none hover:bg-white/[0.04] transition-colors"
            >
              {AVAILABLE_YEARS.map((y) => (
                <option key={y} value={y} className="bg-[#0d0d24] text-white">
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-amber-400/50 pointer-events-none" />
          </div>

          <span className="text-xs text-white/30">vs</span>

          {/* Comparison year */}
          <div className="relative">
            <select
              value={state.compareYear}
              onChange={(e) => set({ compareYear: Number(e.target.value) })}
              className="appearance-none glass rounded-lg px-3 py-1.5 pr-7 text-xs text-cyan-300 font-semibold cursor-pointer focus:outline-none hover:bg-white/[0.09] transition-colors"
            >
              {AVAILABLE_YEARS.filter((y) => y !== state.viewYear).map((y) => (
                <option key={y} value={y} className="bg-[#0d0d24] text-white">
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-cyan-400/60 pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  )
}
