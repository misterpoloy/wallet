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
    <div className={cn('rounded-xl border border-white/[0.06] bg-[#0a0d14]/80 backdrop-blur-xl p-5 hover:border-white/[0.10] transition-colors', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/30 uppercase tracking-[0.08em] font-semibold mb-1.5">{label}</p>
          <p className="text-xl font-bold text-white truncate leading-tight">{value}</p>
          {subValue && <p className="text-[11px] text-white/35 mt-0.5">{subValue}</p>}
          {trend && (
            <p
              className={cn(
                'text-[11px] mt-1.5 font-semibold',
                trend.value <= 0 ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {trend.value <= 0 ? '↓' : '↑'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="ml-3 p-2 rounded-lg bg-white/[0.05] flex-shrink-0">
            <Icon className={cn('w-4 h-4', iconColor)} />
          </div>
        )}
      </div>
    </div>
  )
}
