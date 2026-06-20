import { Header } from '@/components/layout/Header'
import { prisma } from '@wallet/db'
import { RecurringClient } from './RecurringClient'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

const FREQ_MULT: Record<string, number> = {
  daily: 30.4167, weekly: 4.3333, twice_monthly: 2,
  monthly: 1, quarterly: 1 / 3, annual: 1 / 12,
}

async function getRecurring() {
  return prisma.recurringExpense.findMany({
    where: { tenantId: TENANT, isActive: true },
    include: {
      account: { select: { id: true, name: true, institution: true, color: true, colorEnd: true } },
    },
    orderBy: [{ category: 'asc' }, { amount: 'desc' }],
  })
}

export default async function RecurringPage() {
  const raw = await getRecurring()

  // Serialize (Decimal → number, Date → string)
  const expenses = raw.map((e) => ({
    id:          e.id,
    name:        e.name,
    category:    e.category,
    currency:    e.currency as string,
    amount:      Number(e.amount),
    refAmount:   e.refAmount ? Number(e.refAmount) : null,
    frequency:   e.frequency as string,
    dayOfMonth:  e.dayOfMonth,
    daysOfMonth: e.daysOfMonth,
    nextDueDate: e.nextDueDate ? e.nextDueDate.toISOString().slice(0, 10) : null,
    notes:       e.notes,
    account:     e.account,
  }))

  // Monthly equivalents per currency
  let summaryMXN = 0
  let summaryGTQ = 0
  let summaryUSD = 0

  for (const e of expenses) {
    const mult = FREQ_MULT[e.frequency] ?? 1
    const monthly = e.amount * mult
    if (e.currency === 'MXN') summaryMXN += monthly
    else if (e.currency === 'GTQ') summaryGTQ += monthly
    else if (e.currency === 'USD') summaryUSD += monthly
  }

  return (
    <div className="space-y-8">
      <Header title="Recurring Expenses" subtitle="Subscriptions, commitments & regular transfers" />
      <RecurringClient
        expenses={expenses}
        summaryMXN={Math.round(summaryMXN * 100) / 100}
        summaryGTQ={Math.round(summaryGTQ * 100) / 100}
        summaryUSD={Math.round(summaryUSD * 100) / 100}
        totalCount={expenses.length}
      />
    </div>
  )
}
