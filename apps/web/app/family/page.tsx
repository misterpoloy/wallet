import { UserPlus, Eye, Edit3, Crown, Shield, User } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { CreditCardWidget } from '@/components/ui/CreditCardWidget'
import { users, creditCards, tenant } from '@/lib/mock-data'
import { getInitials } from '@/lib/utils'

const ROLE_CONFIG = {
  owner: { label: 'Owner', icon: Crown, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  admin: { label: 'Admin', icon: Shield, color: 'text-violet-400', bg: 'bg-violet-400/10' },
  member: { label: 'Member', icon: User, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-white/40', bg: 'bg-white/5' },
}

const FAMILY_ROLE_LABELS: Record<string, string> = {
  parent: 'Parent',
  partner: 'Partner',
  child: 'Child',
}

export default function FamilyPage() {
  const sharedCards = creditCards.filter((c) => c.isShared)

  return (
    <div className="space-y-8">
      <Header title="Family" subtitle={`${tenant.name} · ${tenant.plan} plan · ${users.length} members`} />

      {/* Members */}
      <GlassCard>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-white">Members</h2>
          <button className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors glass px-3 py-1.5 rounded-xl">
            <UserPlus className="w-3.5 h-3.5" />
            Invite
          </button>
        </div>

        <div className="space-y-3">
          {users.map((user) => {
            const roleConf = ROLE_CONFIG[user.role]
            const RoleIcon = roleConf.icon
            const sharedWithUser = sharedCards.filter((c) =>
              c.sharedWith.some((s) => s.userId === user.id)
            )

            return (
              <div
                key={user.id}
                className="glass rounded-xl p-4 flex items-center gap-4 glass-hover"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                  style={{ background: user.avatarColor }}
                >
                  {getInitials(user.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <span className="text-[10px] text-white/30">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {user.familyRole && (
                      <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                        {FAMILY_ROLE_LABELS[user.familyRole]}
                      </span>
                    )}
                    {sharedWithUser.length > 0 && (
                      <span className="text-[10px] text-cyan-400/70">
                        Access to {sharedWithUser.length} shared card{sharedWithUser.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium ${roleConf.bg} ${roleConf.color}`}>
                  <RoleIcon className="w-3 h-3" />
                  {roleConf.label}
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>

      {/* Shared wallets */}
      <GlassCard>
        <h2 className="text-sm font-semibold text-white mb-5">Shared Credit Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sharedCards.map((card) => (
            <div key={card.id} className="space-y-3">
              <CreditCardWidget card={card} users={users} />
              {/* Permissions table */}
              <div className="glass rounded-xl p-3 space-y-2">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Access</p>
                {card.sharedWith.map((share) => {
                  const u = users.find((x) => x.id === share.userId)
                  if (!u) return null
                  return (
                    <div key={u.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                          style={{ background: u.avatarColor }}
                        >
                          {u.name[0]}
                        </div>
                        <span className="text-white/70">{u.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {share.permission === 'edit' ? (
                          <>
                            <Edit3 className="w-3 h-3 text-cyan-400" />
                            <span className="text-cyan-400">Edit</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 text-white/30" />
                            <span className="text-white/30">View only</span>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
