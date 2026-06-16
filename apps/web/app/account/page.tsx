import { Mail, Shield, Calendar, Edit2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { prisma } from '@wallet/db'
import { getInitials, formatDate } from '@/lib/utils'
import { DEFAULT_TIMEZONE } from '@/lib/timezone'
import { LogOutButton } from './LogOutButton'
import { TimezoneSettings } from './TimezoneSettings'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

async function getAccountData() {
  const [member, userRow] = await Promise.all([
    prisma.tenantMember.findFirst({
      where: { tenantId: TENANT },
      include: { user: true, tenant: true },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.user.findFirst({ where: { email: 'jp@calaps.com' }, select: { timezone: true } }),
  ])
  return { member, timezone: userRow?.timezone ?? DEFAULT_TIMEZONE }
}

export default async function AccountPage() {
  const { member, timezone } = await getAccountData()

  const user = member?.user
  const tenant = member?.tenant

  const name = user?.name ?? 'Juan Portiz'
  const email = user?.email ?? 'jp@calaps.com'
  const role = member?.role ?? 'owner'
  const joinedAt = member?.joinedAt ?? new Date('2024-01-14')
  const tenantName = tenant?.name ?? 'Portiz Family'
  const tenantPlan = tenant?.plan ?? 'family'
  const tenantId = tenant?.id ?? TENANT

  return (
    <div className="space-y-8">
      <Header title="Account" subtitle="Your profile and preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <GlassCard className="lg:col-span-1 flex flex-col items-center text-center py-8">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-bold text-white mb-4"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}
          >
            {getInitials(name)}
          </div>
          <h2 className="text-lg font-bold text-white">{name}</h2>
          <p className="text-sm text-white/40 mt-0.5">{email}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] bg-amber-400/15 text-amber-400 px-2.5 py-1 rounded-full font-medium capitalize">
              {role}
            </span>
            <span className="text-[10px] bg-violet-400/15 text-violet-400 px-2.5 py-1 rounded-full font-medium capitalize">
              parent
            </span>
          </div>
          <button className="mt-6 flex items-center gap-2 text-xs text-white/50 hover:text-white/80 glass px-4 py-2 rounded-xl transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
            Edit Profile
          </button>

          {/* Logout */}
          <div className="mt-4 w-full px-2">
            <LogOutButton />
          </div>
        </GlassCard>

        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          <GlassCard>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Account Info</h3>
            <div className="space-y-4">
              {[
                { icon: Mail, label: 'Email', value: email },
                { icon: Shield, label: 'Role', value: `${role} · parent` },
                { icon: Calendar, label: 'Member since', value: formatDate(joinedAt instanceof Date ? joinedAt.toISOString() : joinedAt) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-0">
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Icon className="w-4 h-4" />
                    {label}
                  </div>
                  <span className="text-sm text-white font-medium">{value}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Tenant</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{tenantName}</p>
                <p className="text-xs text-white/40 mt-0.5 capitalize">{tenantPlan} plan · ID: {tenantId}</p>
              </div>
              <span className="text-xs bg-emerald-400/15 text-emerald-400 px-3 py-1 rounded-full font-medium capitalize">
                Active
              </span>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Timezone</h3>
            <TimezoneSettings currentTimezone={timezone} />
          </GlassCard>

          <GlassCard>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Danger Zone</h3>
            <p className="text-xs text-white/30 mb-4">
              Auth is coming in Stage 4 (Clerk). Once wired, sign-out will clear your session and redirect to the login page.
            </p>
            <LogOutButton variant="full" />
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
