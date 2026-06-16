import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  subValue?: string
  icon?: LucideIcon
  iconColor?: string
  trend?: { value: number; label: string }
  className?: string
}

export function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  iconColor = 'text-violet-400',
  trend,
  className,
}: StatCardProps) {
  return (
    <div className={cn('glass rounded-2xl p-5 glass-hover', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/50 uppercase tracking-wider font-medium mb-1">{label}</p>
          <p className="text-lg font-semibold text-white truncate leading-tight">{value}</p>
          {subValue && <p className="text-xs text-white/40 mt-0.5">{subValue}</p>}
          {trend && (
            <p
              className={cn(
                'text-xs mt-1.5 font-medium',
                trend.value >= 0 ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className="ml-3 p-2.5 rounded-xl bg-white/5 flex-shrink-0">
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
        )}
      </div>
    </div>
  )
}
