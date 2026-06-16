'use client'

import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { PeriodMode } from '@/components/dashboard/PeriodSelector'

interface SpendingChartProps {
  mode: PeriodMode
  data: Record<string, string | number>[]
  primaryLabel: string
  compareLabel?: string
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 text-xs space-y-1.5 min-w-[140px]">
      <p className="text-white/60 font-medium border-b border-white/10 pb-1 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-3 items-center">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="text-white font-semibold">
            MX${Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

const axisProps = {
  tick: { fill: 'rgba(255,255,255,0.35)', fontSize: 11 },
  axisLine: false as const,
  tickLine: false as const,
}

export function SpendingChart({ mode, data, primaryLabel, compareLabel }: SpendingChartProps) {
  // Month comparisons → grouped bar chart
  if (mode === 'prev-month' || mode === 'custom-month') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barGap={4} barCategoryGap="30%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="category" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey={compareLabel ?? 'prev'} name={compareLabel ?? 'Prev'} fill="rgba(99,102,241,0.35)" radius={[4,4,0,0]} />
          <Bar dataKey={primaryLabel} name={primaryLabel} fill="#7c3aed" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Year view → dual-area chart
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradCompare" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0891b2" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip content={<CustomTooltip />} />
        {compareLabel && (
          <Area
            type="monotone"
            dataKey={compareLabel}
            name={compareLabel}
            stroke="#0891b2"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            fill="url(#gradCompare)"
          />
        )}
        <Area
          type="monotone"
          dataKey={primaryLabel}
          name={primaryLabel}
          stroke="#7c3aed"
          strokeWidth={2}
          fill="url(#gradPrimary)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
