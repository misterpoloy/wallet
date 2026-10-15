'use client'

import { useEffect, useRef, useState } from 'react'
import { Crown, Loader2, RotateCcw, Send, Square, X, Check, AlertTriangle, Wrench } from 'lucide-react'
import { parseSSE } from '@mansamusa/core/sse'
import { cn } from '@/lib/utils'
import { Markdown } from './Markdown'

type Runtime = 'raw' | 'core'
type ToolChip = { id: string; name: string; ok?: boolean; ms?: number }
type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number; ms: number }
type Item =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; tools: ToolChip[]; error?: string; streaming: boolean; usage?: Usage; runtime: Runtime }

const SUGGESTIONS = [
  '¿Cómo voy este mes?',
  '¿Cuánto gasté en comida el mes pasado?',
  'How much do I still owe on my loans, and when are they paid off?',
  '¿Ya me cayó la segunda quincena de septiembre?',
]

const uid = () => Math.random().toString(36).slice(2)

function fmtTokens(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [history, setHistory] = useState<unknown[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [runtime, setRuntime] = useState<Runtime>('raw')
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [items])

  const patchAssistant = (id: string, fn: (a: Extract<Item, { role: 'assistant' }>) => Extract<Item, { role: 'assistant' }>) =>
    setItems((prev) => prev.map((it) => (it.id === id && it.role === 'assistant' ? fn(it) : it)))

  async function send(text: string) {
    const message = text.trim()
    if (!message || busy) return
    setInput('')
    setBusy(true)
    const assistantId = uid()
    setItems((prev) => [
      ...prev,
      { id: uid(), role: 'user', text: message },
      { id: assistantId, role: 'assistant', text: '', tools: [], streaming: true, runtime },
    ])

    const controller = new AbortController()
    abortRef.current = controller
    const started = performance.now()
    const usage: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, ms: 0 }

    try {
      const res = await fetch(`/api/agent/${runtime}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err?.error ?? `Request failed (${res.status})`)
      }
      for await (const e of parseSSE(res.body)) {
        if (e.type === 'text') patchAssistant(assistantId, (a) => ({ ...a, text: a.text + e.text }))
        else if (e.type === 'tool_call') patchAssistant(assistantId, (a) => ({ ...a, tools: [...a.tools, { id: e.id, name: e.name }] }))
        else if (e.type === 'tool_result') patchAssistant(assistantId, (a) => ({ ...a, tools: a.tools.map((t) => (t.id === e.id ? { ...t, ok: e.ok, ms: e.ms } : t)) }))
        else if (e.type === 'usage') {
          usage.input += e.inputTokens; usage.output += e.outputTokens
          usage.cacheRead += e.cacheReadTokens; usage.cacheWrite += e.cacheWriteTokens
        } else if (e.type === 'error') patchAssistant(assistantId, (a) => ({ ...a, error: e.message }))
        else if (e.type === 'done' && e.stopReason !== 'error') setHistory(e.messages)
      }
    } catch (err) {
      if (!controller.signal.aborted) patchAssistant(assistantId, (a) => ({ ...a, error: (err as Error).message }))
    } finally {
      usage.ms = Math.round(performance.now() - started)
      patchAssistant(assistantId, (a) => ({ ...a, streaming: false, usage }))
      setBusy(false)
      abortRef.current = null
    }
  }

  function reset() {
    abortRef.current?.abort()
    setItems([])
    setHistory([])
  }

  return (
    <aside
      aria-label="Mansa Musa"
      aria-hidden={!open}
      className={cn(
        'fixed top-11 right-0 bottom-0 z-40 w-full sm:w-[440px] flex flex-col border-l transition-transform duration-200',
        open ? 'translate-x-0' : 'translate-x-full pointer-events-none',
      )}
      style={{ background: 'rgba(20,20,20,0.97)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-12 border-b border-white/[0.07] flex-shrink-0">
        <Crown className="w-4 h-4 text-amber-400" />
        <span className="text-[13px] font-semibold text-white/90">Mansa Musa</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="flex rounded-lg bg-white/[0.05] p-0.5 text-[11px]" role="radiogroup" aria-label="Runtime">
            {(['raw', 'core'] as const).map((r) => (
              <button
                key={r}
                role="radio"
                aria-checked={runtime === r}
                disabled={r === 'core' || busy}
                title={r === 'core' ? 'AgentCore Runtime — coming in P7' : 'Agent loop runs in this app (ConverseStream)'}
                onClick={() => setRuntime(r)}
                className={cn(
                  'px-2 py-1 rounded-md transition-colors',
                  runtime === r ? 'bg-white/[0.12] text-white' : 'text-white/40',
                  r === 'core' && 'opacity-40 cursor-not-allowed',
                )}
              >
                {r === 'raw' ? 'Raw' : 'AgentCore'}
              </button>
            ))}
          </div>
          <button onClick={reset} title="New chat" className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06]">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} title="Close (⌘J)" className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06]">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-[13px] leading-relaxed text-white/80">
        {items.length === 0 && (
          <div className="pt-6">
            <p className="text-white/90 font-semibold">Pregúntame por tu dinero.</p>
            <p className="text-white/40 text-[12px] mt-1">I read your real ledger and answer with your numbers. I can't move money.</p>
            <div className="mt-5 space-y-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="block w-full text-left px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 text-[12.5px] transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {items.map((it) =>
          it.role === 'user' ? (
            <div key={it.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 bg-amber-400/15 text-white/90 whitespace-pre-wrap">{it.text}</div>
            </div>
          ) : (
            <div key={it.id} className="space-y-1.5">
              {it.tools.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {it.tools.map((t) => (
                    <span key={t.id} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono border',
                      t.ok === undefined ? 'border-white/10 text-white/40' : t.ok ? 'border-emerald-400/30 text-emerald-300/80' : 'border-red-400/30 text-red-300/80')}>
                      {t.ok === undefined ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : t.ok ? <Check className="w-2.5 h-2.5" /> : <Wrench className="w-2.5 h-2.5" />}
                      {t.name}{t.ms !== undefined && <span className="text-white/25">{t.ms}ms</span>}
                    </span>
                  ))}
                </div>
              )}
              {it.text && <div className="text-white/85"><Markdown text={it.text} /></div>}
              {it.streaming && !it.text && <Loader2 className="w-3.5 h-3.5 animate-spin text-white/30" />}
              {it.error && (
                <div className="flex gap-2 items-start rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-[12px] text-red-200/80">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span className="break-words">{it.error}</span>
                </div>
              )}
              {!it.streaming && it.usage && (it.usage.input > 0 || it.usage.output > 0) && (
                <p className="text-[10.5px] font-mono text-white/25">
                  {it.runtime} · in {fmtTokens(it.usage.input)} · out {fmtTokens(it.usage.output)} · cache read {fmtTokens(it.usage.cacheRead)} · {(it.usage.ms / 1000).toFixed(1)}s
                </p>
              )}
            </div>
          ),
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input) }}
        className="flex items-end gap-2 p-3 border-t border-white/[0.07] flex-shrink-0"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
          rows={1}
          placeholder="Escribe a Mansa Musa…"
          className="flex-1 resize-none max-h-32 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-[13px] text-white/90 placeholder:text-white/25 outline-none focus:border-amber-400/40"
        />
        {busy ? (
          <button type="button" onClick={() => abortRef.current?.abort()} title="Stop" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.08] text-white/70">
            <Square className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()} title="Send" className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-400/90 text-black disabled:opacity-30">
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
      </form>
    </aside>
  )
}
