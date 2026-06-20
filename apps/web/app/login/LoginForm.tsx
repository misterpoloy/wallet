'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Login failed')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm text-white/60">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-white/25 px-4 py-3 text-sm outline-none focus:border-amber-400/50 focus:bg-white/[0.08] transition-all"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm text-white/60">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-white/25 px-4 py-3 text-sm outline-none focus:border-amber-400/50 focus:bg-white/[0.08] transition-all"
        />
      </div>

      {error && (
        <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold py-3 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
