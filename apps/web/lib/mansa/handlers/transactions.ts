import type { ToolHandler, aggregateSpending, searchTransactions } from '@mansamusa/core'
import { prisma, Prisma, type Currency } from '@wallet/db'
import { dayOf, dayRange, dec, money, ZERO, type Dec } from '../util'

export const searchTransactionsHandler: ToolHandler<typeof searchTransactions> = async (input, ctx) => {
  const date = dayRange(input.from, input.to, ctx.timezone)
  const where: Prisma.TransactionWhereInput = {
    tenantId: ctx.tenantId,
    ...(input.accountId && { accountId: input.accountId }),
    ...(input.type && { type: input.type }),
    ...(input.category && { category: input.category }),
    ...(input.currency && { currency: input.currency }),
    ...(!input.includeTransfers && { isTransfer: false }),
    ...((date.gte || date.lte) && { date }),
    ...((input.minAmount !== undefined || input.maxAmount !== undefined) && {
      amount: {
        ...(input.minAmount !== undefined && { gte: input.minAmount }),
        ...(input.maxAmount !== undefined && { lte: input.maxAmount }),
      },
    }),
    ...(input.text && {
      OR: [
        { payee: { contains: input.text, mode: 'insensitive' } },
        { note: { contains: input.text, mode: 'insensitive' } },
        { categoryRaw: { contains: input.text, mode: 'insensitive' } },
        { category: { contains: input.text, mode: 'insensitive' } },
      ],
    }),
  }
  const orderBy: Prisma.TransactionOrderByWithRelationInput =
    input.sort === 'amount_desc' ? { amount: 'desc' } : { date: input.sort === 'date_asc' ? 'asc' : 'desc' }

  const [total, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({ where, orderBy, take: input.limit, include: { account: { select: { name: true } } } }),
  ])

  return {
    total,
    returned: rows.length,
    transactions: rows.map((t) => ({
      id: t.id,
      date: dayOf(t.date, ctx.timezone),
      accountId: t.accountId,
      account: t.account.name,
      type: t.type,
      category: t.category,
      amount: money(t.amount),
      currency: t.currency,
      refAmountMXN: money(t.refAmount),
      payee: t.payee,
      note: t.note,
      isTransfer: t.isTransfer,
    })),
  }
}

type Row = { key: string | null; currency: Currency; total: Prisma.Decimal | string; count: bigint | number }

export const aggregateSpendingHandler: ToolHandler<typeof aggregateSpending> = async (input, ctx) => {
  const tz = ctx.timezone
  const { gte, lte } = dayRange(input.from, input.to, tz)

  const keyExpr = {
    category: Prisma.sql`t.category`,
    payee: Prisma.sql`COALESCE(NULLIF(TRIM(t.payee), ''), NULLIF(TRIM(t.note), ''), '(unknown)')`,
    month: Prisma.sql`to_char((t."date" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM')`,
    account: Prisma.sql`a.name`,
    currency: Prisma.sql`t.currency::text`,
  }[input.groupBy]

  // refMXN sums the MXN equivalent across currencies; native keeps each currency apart.
  const measure = input.measure === 'refMXN' ? Prisma.sql`t."refAmount"` : Prisma.sql`t.amount`
  const currencyExpr = input.measure === 'refMXN' ? Prisma.sql`'MXN'::"Currency"` : Prisma.sql`t.currency`

  const filters: Prisma.Sql[] = [
    Prisma.sql`t."tenantId" = ${ctx.tenantId}`,
    Prisma.sql`t.type = ${input.type}::"TransactionType"`,
    Prisma.sql`t."date" >= ${gte}`,
    Prisma.sql`t."date" <= ${lte}`,
  ]
  if (!input.includeTransfers) filters.push(Prisma.sql`t."isTransfer" = false`)
  if (input.measure === 'refMXN') filters.push(Prisma.sql`t."refCurrency" = 'MXN'::"Currency"`)
  if (input.currency) filters.push(Prisma.sql`t.currency = ${input.currency}::"Currency"`)
  if (input.accountId) filters.push(Prisma.sql`t."accountId" = ${input.accountId}`)
  if (input.category) filters.push(Prisma.sql`t.category = ${input.category}`)

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT ${keyExpr} AS key, ${currencyExpr} AS currency, SUM(${measure}) AS total, COUNT(*) AS count
    FROM "Transaction" t
    JOIN "Account" a ON a.id = t."accountId"
    WHERE ${Prisma.join(filters, ' AND ')}
    GROUP BY 1, 2
    ORDER BY ${input.groupBy === 'month' ? Prisma.sql`1 ASC` : Prisma.sql`3 DESC`}
  `

  const totals = new Map<string, { total: Dec; count: number }>()
  for (const r of rows) {
    const t = totals.get(r.currency) ?? { total: ZERO, count: 0 }
    t.total = t.total.plus(dec(r.total))
    t.count += Number(r.count)
    totals.set(r.currency, t)
  }

  return {
    from: input.from,
    to: input.to,
    type: input.type,
    measure: input.measure,
    groups: rows.slice(0, input.limit).map((r) => ({
      key: r.key ?? '(none)',
      currency: r.currency,
      total: money(r.total),
      count: Number(r.count),
    })),
    totals: [...totals].map(([currency, t]) => ({ currency: currency as Currency, total: money(t.total), count: t.count })),
  }
}
