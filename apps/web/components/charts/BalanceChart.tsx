'use client'

import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

export interface BalanceDataPoint {
  date: string   // "Jun 1"
  balance: number
}

interface BalanceChartProps {
  data: BalanceDataPoint[]
  currency?: string
  accentColor?: string  // used for gradient tint only
}

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload?.length) return null
  const val: number = payload[0]?.value ?? 0
  const symbol = currency === 'USD' ? '$' : currency === 'GTQ' ? 'Q' : 'MX$'
  const neg = val < 0
  return (
    <div className="glass rounded-xl px-3 py-2.5 text-xs min-w-[140px] border border-white/10">
      <p className="text-white/40 mb-1 font-medium">{label}</p>
      <p className={`font-bold text-base ${neg ? 'text-rose-400' : 'text-emerald-400'}`}>
        {neg ? '-' : '+'}{symbol}{Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}

export function BalanceChart({ data, currency = 'MXN', accentColor = '#7c3aed' }: BalanceChartProps) {
  if (!data.length) return null

  const values = data.map((d) => d.balance)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const hasNegative = minVal < 0
  const padding = Math.abs(maxVal - minVal) * 0.15 || 1000

  // Line is white so it's always visible on dark glass background
  const lineColor = '#ffffff'
  const gradientColor = hasNegative ? '#f43f5e' : accentColor

  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`balGrad-${currency}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={gradientColor} stopOpacity={0.45} />
            <stop offset="95%" stopColor={gradientColor} stopOpacity={0.05} />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />

        {/* Zero reference line when there are negative values */}
        {hasNegative && (
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3" />
        )}

        <XAxis
          dataKey="date"
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minVal - padding, maxVal + padding]}
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={58}
          tickFormatter={(v: number) => {
            const abs = Math.abs(v)
            const sign = v < 0 ? '-' : ''
            if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
            if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(0)}k`
            return `${sign}${abs.toFixed(0)}`
          }}
        />

        <Tooltip content={<CustomTooltip currency={currency} />} />

        <Area
          type="monotone"
          dataKey="balance"
          stroke={lineColor}
          strokeWidth={2.5}
          fill={`url(#balGrad-${currency})`}
          dot={false}
          isAnimationActive={false}
          activeDot={{ r: 5, fill: lineColor, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
