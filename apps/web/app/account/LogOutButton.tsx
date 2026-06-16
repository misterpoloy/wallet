'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LogOutButtonProps {
  /** 'icon' = small ghost button (in profile card), 'full' = full-width danger button */
  variant?: 'icon' | 'full'
}

export function LogOutButton({ variant = 'icon' }: LogOutButtonProps) {
  const router = useRouter()

  function handleLogout() {
    // Stage 4: replace with Clerk's signOut() — e.g. signOut({ callbackUrl: '/login' })
    // For now, clear any stored state and redirect to dashboard root
    router.push('/')
  }

  if (variant === 'full') {
    return (
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300 border border-rose-500/30 hover:border-rose-400/50 bg-rose-500/5 hover:bg-rose-500/10 px-4 py-2.5 rounded-xl transition-all w-full justify-center font-medium"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 text-xs text-rose-400/70 hover:text-rose-400 transition-colors w-full justify-center py-2"
    >
      <LogOut className="w-3.5 h-3.5" />
      Sign Out
    </button>
  )
}
