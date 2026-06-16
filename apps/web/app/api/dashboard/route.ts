import { NextRequest } from 'next/server'
import { prisma } from '@wallet/db'
import { ok, handleError, DEFAULT_TENANT_ID } from '@/lib/api/response'

// ─── GET /api/dashboard ───────────────────────────────────────────────────────
// Returns everything the dashboard needs in a single request:
//   - KPI stats (bank balance, credit used/remaining, spend this month)
//   - Recent transactions (last 8)
//   - Account summary list
//   - Spending by category (current month)
//   - Monthly spending series (last 12 months) for chart

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const now = new Date()
    const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()))
    const month = parseInt(searchParams.get('month') ?? String(now.getMonth())) // 0-indexed

    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)

    // ── Accounts with balances ────────────────────────────────────────────────
    const accounts = await prisma.account.findMany({
      where: { tenantId: DEFAULT_TENANT_ID, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
        const [income, expense] = await Promise.all([
          prisma.transaction.aggregate({
            where: { accountId: account.id, type: 'income', isTransfer: false },
            _sum: { amount: true },
          }),
          prisma.transaction.aggregate({
            where: { accountId: account.id, type: 'expense', isTransfer: false },
            _sum: { amount: true },
          }),
        ])
        const balance = Number(income._sum.amount ?? 0) - Number(expense._sum.amount ?? 0)
        return { ...account, balance, creditLimit: account.creditLimit ? Number(account.creditLimit) : null }
      })
    )

    // ── KPI: Bank balance (MXN checking/savings/debit/cash) ───────────────────
    const bankAccountIds = accountsWithBalance
      .filter((a) => ['checking', 'savings', 'debit', 'cash'].includes(a.accountType) && a.currency === 'MXN')
      .map((a) => a.id)

    const totalBankMXN = accountsWithBalance
      .filter((a) => bankAccountIds.includes(a.id))
      .reduce((s, a) => s + a.balance, 0)

    // ── KPI: Credit cards ─────────────────────────────────────────────────────
    const creditCardsMXN = accountsWithBalance.filter(
      (a) => a.accountType === 'credit_card' && a.currency === 'MXN'
    )
    // For credit cards: balance is negative (debt), so used = abs(balance)
    const totalCreditUsed = creditCardsMXN.reduce((s, a) => s + Math.abs(Math.min(a.balance, 0)), 0)
    const totalCreditLimit = creditCardsMXN.reduce((s, a) => s + (a.creditLimit ?? 0), 0)
    const totalCreditRemaining = Math.max(0, totalCreditLimit - totalCreditUsed)

    // ── KPI: GTQ balance ──────────────────────────────────────────────────────
    const totalGTQ = accountsWithBalance
      .filter((a) => a.currency === 'GTQ' && a.accountType !== 'credit_card')
      .reduce((s, a) => s + a.balance, 0)

    // ── KPI: Month spend (MXN expenses, current month, non-transfer) ──────────
    const monthSpend = await prisma.transaction.aggregate({
      where: {
        tenantId: DEFAULT_TENANT_ID,
        type: 'expense',
        isTransfer: false,
        refCurrency: 'MXN',
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { refAmount: true },
    })

    // ── Monthly series: last 13 months ────────────────────────────────────────
    const monthlyRows = await prisma.$queryRaw<
      { year: number; month: number; total: number }[]
    >`
      SELECT
        EXTRACT(YEAR  FROM date)::int AS year,
        EXTRACT(MONTH FROM date)::int AS month,
        SUM("refAmount")::float       AS total
      FROM "Transaction"
      WHERE "tenantId" = ${DEFAULT_TENANT_ID}
        AND type = 'expense'
        AND "isTransfer" = false
        AND "refCurrency" = 'MXN'
        AND date >= NOW() - INTERVAL '13 months'
      GROUP BY 1, 2
      ORDER BY 1 ASC, 2 ASC
    `

    // ── Spending by category (current month) ──────────────────────────────────
    const categoryRows = await prisma.$queryRaw<
      { category: string; total: number }[]
    >`
      SELECT category, SUM("refAmount")::float AS total
      FROM "Transaction"
      WHERE "tenantId" = ${DEFAULT_TENANT_ID}
        AND type = 'expense'
        AND "isTransfer" = false
        AND date >= ${monthStart}
        AND date <= ${monthEnd}
      GROUP BY category
      ORDER BY total DESC
      LIMIT 8
    `

    // ── Recent transactions ───────────────────────────────────────────────────
    const recentTransactions = await prisma.transaction.findMany({
      where: { tenantId: DEFAULT_TENANT_ID, isTransfer: false },
      include: {
        account: {
          select: { id: true, name: true, institution: true, color: true, colorEnd: true, currency: true, lastFour: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 8,
    })

    return ok({
      kpi: {
        bankBalanceMXN: totalBankMXN,
        creditUsedMXN: totalCreditUsed,
        creditLimitMXN: totalCreditLimit,
        creditRemainingMXN: totalCreditRemaining,
        creditUsagePct: totalCreditLimit > 0 ? Math.round((totalCreditUsed / totalCreditLimit) * 100) : 0,
        gtqBalance: totalGTQ,
        monthSpendMXN: Number(monthSpend._sum.refAmount ?? 0),
        month,
        year,
      },
      accounts: accountsWithBalance,
      recentTransactions,
      spendingByCategory: categoryRows,
      monthlySeries: monthlyRows,
    })
  } catch (e) {
    return handleError(e)
  }
}
