'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BreakdownRow = {
  label: string
  native?: string      // e.g. "Q 5,740" or "$14,279"
  fx?: string          // e.g. "× 2.49 MXN/GTQ"
  mxn: string          // e.g. "MXN 14,293"
  sub?: string         // small grey note
  dim?: boolean        // muted row (e.g. paid / inactive)
}

export type BreakdownSection = {
  title: string
  rows: BreakdownRow[]
  total: string        // bold total line
  totalSub?: string
  accent?: string      // tailwind text color class e.g. "text-emerald-400"
}

export type BreakdownProps = {
  sections: BreakdownSection[]
  formula?: string     // e.g. "Income − Loans − Recurring = Cash Flow"
  children: React.ReactNode
}

export function MathBreakdown({ sections, formula, children }: BreakdownProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState({ top: 0, left: 0, alignRight: false })
  const triggerRef      = useRef<HTMLDivElement>(null)

  function handleEnter() {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const panelW = 320
    const spaceRight = window.innerWidth - r.left
    const alignRight = spaceRight < panelW + 16

    setPos({
      top:        r.bottom + window.scrollY + 8,
      left:       alignRight ? r.right + window.scrollX - panelW : r.left + window.scrollX,
      alignRight,
    })
    setOpen(true)
  }

  const panel = open && (
    <div
      className="fixed pointer-events-none"
      style={{ top: pos.top, left: pos.left, zIndex: 99999, width: 320 }}
    >
      <div
        className="rounded-2xl border border-white/[0.10] bg-[#0b0e17]/95 backdrop-blur-2xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_80px_rgba(0,0,0,0.85)]"
      >
        {/* top glow line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="p-4 space-y-4">
          {sections.map((sec, si) => (
            <div key={si}>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">{sec.title}</p>
              <div className="space-y-1.5">
                {sec.rows.map((row, ri) => (
                  <div key={ri} className={cn('flex items-start justify-between gap-2', row.dim && 'opacity-40')}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 truncate">{row.label}</p>
                      {row.sub && <p className="text-[10px] text-white/25">{row.sub}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {row.native && row.fx ? (
                        <p className="text-[10px] text-white/30 tabular-nums">{row.native} <span className="text-white/20">{row.fx}</span></p>
                      ) : row.native ? (
                        <p className="text-[10px] text-white/30 tabular-nums">{row.native}</p>
                      ) : null}
                      <p className="text-xs font-semibold text-white/80 tabular-nums">{row.mxn}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Section total */}
              <div className={cn('mt-2.5 pt-2.5 border-t border-white/[0.07] flex justify-between items-baseline')}>
                <span className="text-[10px] text-white/30 uppercase tracking-wider">Total</span>
                <div className="text-right">
                  <span className={cn('text-sm font-bold tabular-nums', sec.accent ?? 'text-white')}>{sec.total}</span>
                  {sec.totalSub && <p className="text-[10px] text-white/30">{sec.totalSub}</p>}
                </div>
              </div>
            </div>
          ))}

          {/* Formula line */}
          {formula && (
            <div className="pt-3 border-t border-white/[0.07]">
              <p className="text-[10px] text-white/25 text-center font-mono tracking-wide">{formula}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div
        ref={triggerRef}
        className="relative group"
        onMouseEnter={handleEnter}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
        {/* Info badge */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Info className="w-3 h-3 text-white/25" />
        </div>
      </div>
      {typeof document !== 'undefined' && panel && createPortal(panel, document.body)}
    </>
  )
}
