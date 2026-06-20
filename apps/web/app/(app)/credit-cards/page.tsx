import { Plus } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { prisma } from '@wallet/db'
import { formatMoney } from '@/lib/utils'
import { creditCardStats } from '@/lib/account-balance'
import { CreateCreditCardButton } from './CreateCreditCardButton'
import { CreditCardsView } from './CreditCardsView'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

// Approximate FX rates → MXN (update as needed)
const TO_MXN = { MXN: 1, USD: 17.5, GTQ: 2.27 }

async function getCards() {
  const cards = await prisma.account.findMany({
    where: { tenantId: TENANT, isActive: true, accountType: 'credit_card' },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
  if (cards.length === 0) return []
  return cards.map((c) => {
    const stats = creditCardStats(c.currentBalance as unknown as number, c.creditLimit as unknown as number)
    return { ...c, ...stats, creditLimit: stats.limit }
  })
}

function sumByCurrency(cards: Awaited<ReturnType<typeof getCards>>, cur: string) {
  const subset = cards.filter(c => c.currency === cur)
  return {
    used:      subset.reduce((s, c) => s + c.used, 0),
    available: subset.reduce((s, c) => s + c.available, 0),
    limit:     subset.reduce((s, c) => s + c.limit, 0),
    count:     subset.length,
  }
}

export default async function CreditCardsPage() {
  const cards = await getCards()

  const mxn = sumByCurrency(cards, 'MXN')
  const usd = sumByCurrency(cards, 'USD')
  const gtq = sumByCurrency(cards, 'GTQ')

  // Combined total in MXN equivalent
  const totalUsedMXN  = mxn.used      + usd.used      * TO_MXN.USD + gtq.used      * TO_MXN.GTQ
  const totalAvailMXN = mxn.available + usd.available  * TO_MXN.USD + gtq.available * TO_MXN.GTQ
  const totalLimitMXN = mxn.limit     + usd.limit      * TO_MXN.USD + gtq.limit     * TO_MXN.GTQ
  const totalPct      = totalLimitMXN > 0 ? Math.round((totalUsedMXN / totalLimitMXN) * 100) : 0

  const currencyPanels = [
    { cur: 'MXN', flag: '🇲🇽', label: 'Mexican Peso',    ...mxn },
    { cur: 'GTQ', flag: '🇬🇹', label: 'Guatemalan Quetzal', ...gtq },
    { cur: 'USD', flag: '🇺🇸', label: 'US Dollar',        ...usd },
  ].filter(p => p.count > 0)

  return (
    <div className="space-y-8">
      <Header title="Credit Cards" subtitle={`${cards.length} cards`} />

      {cards.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_1.4fr] gap-4">
          {/* Per-currency panels */}
          {currencyPanels.map(({ cur, flag, label, used, available, limit }) => {
            const pct = limit > 0 ? Math.round((used / limit) * 100) : 0
            const currency = cur as 'MXN' | 'GTQ' | 'USD'
            return (
              <div key={cur} className="glass rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{flag}</span>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider leading-none">{label}</p>
                    <p className="text-xs text-white/25 font-mono">{cur}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Owed</span>
                    <span className="text-rose-400 font-semibold">{formatMoney({ amount: used, currency })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Available</span>
                    <span className="text-emerald-400 font-semibold">{formatMoney({ amount: available, currency })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Limit</span>
                    <span className="text-white/60">{formatMoney({ amount: limit, currency })}</span>
                  </div>
                </div>
                {/* usage bar */}
                <div>
                  <div className="w-full h-1 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/25 mt-1 text-right">{pct}% used</p>
                </div>
              </div>
            )
          })}

          {/* Combined total card */}
          <div className="glass rounded-2xl p-5 flex flex-col gap-3 border border-white/[0.07] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 pointer-events-none" />
            <div className="relative">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Total Combined</p>
              <p className="text-[10px] text-white/25 font-mono">≈ MXN equivalent</p>
            </div>
            <div className="relative space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Owed</span>
                <span className="text-rose-400 font-semibold">{formatMoney({ amount: totalUsedMXN, currency: 'MXN' })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Available</span>
                <span className="text-emerald-400 font-semibold">{formatMoney({ amount: totalAvailMXN, currency: 'MXN' })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Limit</span>
                <span className="text-white/60">{formatMoney({ amount: totalLimitMXN, currency: 'MXN' })}</span>
              </div>
            </div>
            <div className="relative">
              <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${totalPct > 80 ? 'bg-rose-500' : totalPct > 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${totalPct}%` }}
                />
              </div>
              <p className="text-[10px] text-white/25 mt-1 text-right">{totalPct}% used</p>
            </div>
            <p className="text-[9px] text-white/20 relative">USD×{TO_MXN.USD} · GTQ×{TO_MXN.GTQ}</p>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-4xl mb-3">💳</p>
          <p className="text-white/50 text-sm">No credit cards yet — import your CSV to get started</p>
        </div>
      ) : (
        <CreditCardsView cards={cards} />
      )}

      <CreateCreditCardButton>
        <div className="glass rounded-2xl p-5 border-dashed border-white/10 flex items-center justify-center gap-3 h-20 glass-hover cursor-pointer">
          <Plus className="w-4 h-4 text-white/30" />
          <span className="text-sm text-white/30 font-medium">Add Credit Card</span>
        </div>
      </CreateCreditCardButton>
    </div>
  )
}
