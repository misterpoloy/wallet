import { cn, creditUsageColor } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max: number
  showLabel?: boolean
  className?: string
}

export function ProgressBar({ value, max, showLabel = true, className }: ProgressBarProps) {
  const pct = Math.min(Math.round((value / max) * 100), 100)
  const colorClass = creditUsageColor(pct)

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-white/50">
          <span>Used {pct}%</span>
          <span>{100 - pct}% free</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
