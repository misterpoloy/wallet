import { prisma } from '@wallet/db'

// Returns the signed delta to apply to currentBalance for a given transaction.
// Bank/debit/cash/savings: income = +, expense = -
// Credit card:             expense = + (owe more), income = - (payment reduces debt)
export function balanceDelta(
  accountType: string,
  txType: string,
  amount: number
): number {
  const isCreditCard = accountType === 'credit_card'
  if (isCreditCard) {
    return txType === 'expense' ? amount : -amount
  }
  return txType === 'income' ? amount : -amount
}

// Computes credit card display stats from stored fields.
// Convention: currentBalance > 0 = amount owed, 0 = paid off, < 0 = credit balance (overpayment).
export function creditCardStats(currentBalance: number | string, creditLimit: number | string | null) {
  const balance = Number(currentBalance)
  const limit   = Number(creditLimit ?? 0)
  const used      = Math.max(0, balance)
  const available = Math.max(0, limit - used)
  const usagePct  = limit > 0 ? Math.round((used / limit) * 100) : 0
  return { used, limit, available, usagePct }
}

// Recomputes currentBalance from scratch for an account (fallback / repair).
export async function recomputeBalance(accountId: string) {
  const account = await prisma.account.findUnique({ where: { id: accountId } })
  if (!account) return

  const [incAgg, expAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { accountId, type: 'income' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { accountId, type: 'expense' },
      _sum: { amount: true },
    }),
  ])

  const initial = Number(account.initialBalance ?? 0)
  const income  = Number(incAgg._sum.amount ?? 0)
  const expense = Number(expAgg._sum.amount ?? 0)

  const isCreditCard = account.accountType === 'credit_card'
  const currentBalance = isCreditCard
    ? initial + expense - income
    : initial + income - expense

  await prisma.account.update({ where: { id: accountId }, data: { currentBalance } })
  return currentBalance
}
