import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, AccountType, Currency, CardNetwork } from '@wallet/db'
import { ok, created, badRequest, handleError, DEFAULT_TENANT_ID } from '@/lib/api/response'

// ─── Validation ───────────────────────────────────────────────────────────────

const CreateAccountSchema = z.object({
  name: z.string().min(1).max(100),
  institution: z.string().min(1).max(100),
  accountType: z.nativeEnum(AccountType),
  currency: z.nativeEnum(Currency),
  lastFour: z.string().length(4).optional(),
  network: z.nativeEnum(CardNetwork).nullable().optional(),
  creditLimit: z.number().positive().optional(),
  logoUrl: z.string().url().optional(),
  initialBalance: z.number().optional(),
  color: z.string().optional(),
  colorEnd: z.string().optional(),
  sortOrder: z.number().int().optional(),
})

// ─── GET /api/accounts ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') as AccountType | null
    const currency = searchParams.get('currency') as Currency | null
    const activeOnly = searchParams.get('active') !== 'false'

    const accounts = await prisma.account.findMany({
      where: {
        tenantId: DEFAULT_TENANT_ID,
        ...(activeOnly && { isActive: true }),
        ...(type && { accountType: type }),
        ...(currency && { currency }),
      },
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    // Compute running balance per account from transactions
    const withBalances = await Promise.all(
      accounts.map(async (account) => {
        const agg = await prisma.transaction.aggregate({
          where: { accountId: account.id, isTransfer: false },
          _sum: {
            amount: true,
            refAmount: true,
          },
        })

        // income adds, expense subtracts (already signed in DB via type)
        const incomeSum = await prisma.transaction.aggregate({
          where: { accountId: account.id, type: 'income' },
          _sum: { amount: true },
        })
        const expenseSum = await prisma.transaction.aggregate({
          where: { accountId: account.id, type: 'expense' },
          _sum: { amount: true },
        })

        const balance =
          Number(incomeSum._sum.amount ?? 0) - Number(expenseSum._sum.amount ?? 0)

        return { ...account, balance }
      })
    )

    return ok(withBalances)
  } catch (e) {
    return handleError(e)
  }
}

// ─── POST /api/accounts ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = CreateAccountSchema.parse(body)

    const initialBalance = data.initialBalance ?? 0

    const account = await prisma.account.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        name: data.name,
        institution: data.institution,
        accountType: data.accountType,
        currency: data.currency,
        lastFour: data.lastFour,
        network: data.network ?? null,
        creditLimit: data.creditLimit,
        logoUrl: data.logoUrl ?? null,
        currentBalance: initialBalance,
        color: data.color ?? '#7c3aed',
        colorEnd: data.colorEnd ?? '#06b6d4',
        sortOrder: data.sortOrder ?? 0,
      },
    })

    return created(account)
  } catch (e) {
    return handleError(e)
  }
}
