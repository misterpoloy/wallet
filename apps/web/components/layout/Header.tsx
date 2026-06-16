import { Bell, Search } from 'lucide-react'
import { currentUser } from '@/lib/mock-data'
import { getInitials } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-white/40 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="glass flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/40 w-44 cursor-pointer hover:bg-white/[0.09] transition-colors">
          <Search className="w-4 h-4" />
          <span className="text-xs">Search…</span>
          <kbd className="ml-auto text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </div>

        {/* Notifications */}
        <button className="glass w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/[0.09] transition-colors relative">
          <Bell className="w-4 h-4 text-white/60" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-400" />
        </button>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white cursor-pointer"
          style={{ background: currentUser.avatarColor }}
        >
          {getInitials(currentUser.name)}
        </div>
      </div>
    </div>
  )
}
