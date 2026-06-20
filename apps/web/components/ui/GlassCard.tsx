'use client'

import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export function GlassCard({
  children,
  className,
  hover = false,
  onClick,
  padding = 'md',
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border border-white/[0.06] bg-[#0a0d14]/80 backdrop-blur-xl',
        paddingMap[padding],
        hover && 'hover:border-white/[0.10] cursor-pointer transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}
