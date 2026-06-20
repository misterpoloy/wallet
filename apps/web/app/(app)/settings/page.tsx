import { Bell, Globe, Shield, Palette, ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'

const SETTINGS_GROUPS = [
  {
    label: 'Preferences',
    items: [
      { icon: Globe, label: 'Default Currency', value: 'MXN', desc: 'Used for net worth calculations' },
      { icon: Palette, label: 'Theme', value: 'Dark (Glass)', desc: 'Isomorphic glassmorphism' },
    ],
  },
  {
    label: 'Notifications',
    items: [
      { icon: Bell, label: 'Payment Reminders', value: '3 days before', desc: 'Credit card due dates' },
      { icon: Bell, label: 'Recurring Alerts', value: 'Enabled', desc: 'Before recurring expenses execute' },
    ],
  },
  {
    label: 'Security',
    items: [
      { icon: Shield, label: 'Two-Factor Auth', value: 'Enabled', desc: 'TOTP via authenticator app' },
      { icon: Shield, label: 'Session Timeout', value: '30 minutes', desc: 'Auto-lock after inactivity' },
    ],
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <Header title="Settings" subtitle="Application preferences and security" />

      <div className="max-w-2xl space-y-6">
        {SETTINGS_GROUPS.map(({ label, items }) => (
          <GlassCard key={label}>
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">{label}</h2>
            <div className="space-y-1">
              {items.map(({ icon: Icon, label: itemLabel, value, desc }) => (
                <div
                  key={itemLabel}
                  className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-white/50" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{itemLabel}</p>
                      <p className="text-xs text-white/30">{desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">{value}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
