import { compute, type ToolHandler, type simulateDebtPayoff } from '@mansamusa/core'
import { prisma, type Account } from '@wallet/db'
import { money } from '../util'

// Card APR arrives with the P4.02 migration (Account.aprPercent). Until then cards are listed
// in warnings and left out of the simulation rather than simulated with a made-up rate.
function cardApr(a: Account): number | null {
  const apr = (a as Account & { aprPercent?: unknown }).aprPercent
  return apr === null || apr === undefined ? null : Number(apr)
}

/** Minimum card payment heuristic until statement data exists: 5% of the balance, at least 200. */
function cardMinimum(balance: number): number {
  return Math.min(balance, Math.max(200, Math.round(balance * 0.05 * 100) / 100))
}

export const simulateDebtPayoffHandler: ToolHandler<typeof simulateDebtPayoff> = async (input, ctx) => {
  const [loans, cards] = await Promise.all([
    prisma.loan.findMany({ where: { tenantId: ctx.tenantId, isActive: true, currency: input.currency } }),
    prisma.account.findMany({ where: { tenantId: ctx.tenantId, isActive: true, accountType: 'credit_card', currency: input.currency } }),
  ])

  const warnings: string[] = []
  const debts: (compute.Debt & { kind: 'loan' | 'credit_card' })[] = []
  for (const l of loans) {
    if (Number(l.currentBalance) <= 0) continue
    debts.push({ id: l.id, name: l.name, kind: 'loan', balance: money(l.currentBalance), aprPct: Number(l.interestRate), minPayment: money(l.monthlyPayment) })
  }
  for (const c of cards) {
    const owed = Number(c.currentBalance)
    if (owed <= 0) continue
    const apr = cardApr(c)
    if (apr === null) {
      warnings.push(`${c.name}: card APR not configured, left out of the simulation (owes ${money(owed)} ${c.currency}).`)
      continue
    }
    debts.push({ id: c.id, name: c.name, kind: 'credit_card', balance: money(owed), aprPct: apr, minPayment: money(cardMinimum(owed)) })
  }

  if (debts.length === 0) {
    return {
      currency: input.currency,
      debts: [],
      monthlyBudget: '0.00',
      plans: [],
      savingsVsMinimum: { avalanche: null, snowball: null },
      warnings: [...warnings, `No debts with known rates in ${input.currency}.`],
    }
  }

  const result = compute.comparePayoff(debts, input.extraMonthly)
  return {
    currency: input.currency,
    debts: debts.map((d) => ({ id: d.id, name: d.name, kind: d.kind, balance: String(d.balance), aprPct: d.aprPct, minPayment: String(d.minPayment) })),
    monthlyBudget: result.monthlyBudget,
    plans: result.plans,
    savingsVsMinimum: result.savingsVsMinimum,
    warnings: [...warnings, ...result.warnings],
  }
}
