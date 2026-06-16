'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMoney } from '@/lib/utils'

const PALETTE = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#0ea5e9', '#f97316', '#22c55e', '#ec4899',
]

interface CategoryDonutProps {
  data: { category: string; total: number }[]
  currency?: 'MXN' | 'GTQ' | 'USD'
  empty?: string
}

const CustomTooltip = ({ active, payload, currency = 'MXN' }: any) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="glass rounded-xl p-3 text-xs">
      <p className="text-white/70">{name}</p>
      <p className="text-white font-semibold">
        {formatMoney({ amount: value, currency })}
      </p>
    </div>
  )
}

export function CategoryDonut({ data, currency = 'MXN', empty }: CategoryDonutProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-white/30">
        {empty ?? 'No spending data yet'}
      </div>
    )
  }

  const chartData = data.map((d, i) => ({
    name: d.category,
    value: Math.round(d.total),
    color: PALETTE[i % PALETTE.length],
  }))

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={32}
            outerRadius={52}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip currency={currency} />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex-1 space-y-1.5 min-w-0">
        {chartData.slice(0, 5).map((cat) => (
          <div key={cat.name} className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
              <span className="text-white/60 truncate">{cat.name}</span>
            </div>
            <span className="text-white/80 font-medium flex-shrink-0">
              {formatMoney({ amount: cat.value, currency })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
