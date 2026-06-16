import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, Currency, TransactionType, PaymentType } from '@wallet/db'
import { ok, created, badRequest, handleError, DEFAULT_TENANT_ID } from '@/lib/api/response'
import { balanceDelta } from '@/lib/account-balance'

// ─── Validation ───────────────────────────────────────────────────────────────

const CreateTransactionSchema = z.object({
  accountId: z.string().min(1),
  category: z.string().min(1),
  categoryRaw: z.string().optional(),
  currency: z.nativeEnum(Currency),
  amount: z.number().positive(),
  refAmount: z.number().optional(),
  refCurrency: z.nativeEnum(Currency).optional(),
  fxRate: z.number().positive().optional(),
  type: z.nativeEnum(TransactionType),
  paymentType: z.nativeEnum(PaymentType).default('debit'),
  note: z.string().optional(),
  payee: z.string().optional(),
  labels: z.array(z.string()).default([]),
  date: z.string().datetime(),
  isTransfer: z.boolean().default(false),
  transferGroupId: z.string().optional(),
  transferToId: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringId: z.string().optional(),
})

// ─── GET /api/transactions ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const accountId = searchParams.get('accountId')
    const type = searchParams.get('type') as TransactionType | null
    const category = searchParams.get('category')
    const currency = searchParams.get('currency') as Currency | null
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const search = searchParams.get('q')
    const isTransfer = searchParams.get('transfer')
    const isRecurring = searchParams.get('recurring')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))
    const skip = (page - 1) * limit
    const sortBy    = searchParams.get('sortBy')    ?? 'date'
    const sortOrder = (searchParams.get('sortOrder') ?? 'desc') === 'asc' ? 'asc' : 'desc'

    const where = {
      tenantId: DEFAULT_TENANT_ID,
      ...(accountId && { accountId }),
      ...(type && { type }),
      ...(category && { category }),
      ...(currency && { currency }),
      ...(isTransfer !== null && { isTransfer: isTransfer === 'true' }),
      ...(isRecurring !== null && { isRecurring: isRecurring === 'true' }),
      ...(from || to
        ? {
            date: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { id: search },
          { note: { contains: search, mode: 'insensitive' as const } },
          { payee: { contains: search, mode: 'insensitive' as const } },
          { category: { contains: search, mode: 'insensitive' as const } },
          { categoryRaw: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: {
            select: { id: true, name: true, institution: true, color: true, colorEnd: true, currency: true, accountType: true, lastFour: true, logoUrl: true },
          },
        },
        orderBy: sortBy === 'amount' ? { amount: sortOrder } : { date: sortOrder },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    return ok({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  } catch (e) {
    return handleError(e)
  }
}

// ─── POST /api/transactions ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = CreateTransactionSchema.parse(body)

    // Verify account belongs to tenant
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, tenantId: DEFAULT_TENANT_ID },
    })
    if (!account) return badRequest('Account not found or not accessible')

    // FX: use caller-supplied rate if provided; otherwise derive from refAmount vs amount
    const refAmount  = data.refAmount ?? data.amount
    const fxRate     = data.fxRate ?? (data.currency !== 'MXN' && data.amount > 0 ? refAmount / data.amount : null)
    const refCurrency = data.refCurrency ?? null

    const delta = balanceDelta(account.accountType, data.type, data.amount)

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          tenant:   { connect: { id: DEFAULT_TENANT_ID } },
          account:  { connect: { id: data.accountId } },
          category: data.category,
          categoryRaw: data.categoryRaw ?? data.category,
          currency: data.currency,
          amount: data.amount,
          refAmount,
          ...(refCurrency && { refCurrency }),
          ...(fxRate     && { fxRate }),
          type: data.type,
          paymentType: data.paymentType,
          note: data.note,
          payee: data.payee,
          labels: data.labels,
          date: new Date(data.date),
          isTransfer: data.isTransfer,
          ...(data.transferGroupId && { transferGroupId: data.transferGroupId }),
          ...(data.transferToId   && { transferTo: { connect: { id: data.transferToId } } }),
          isRecurring: data.isRecurring,
          ...(data.recurringId    && { recurringId: data.recurringId }),
        },
        include: {
          account: {
            select: { id: true, name: true, institution: true, color: true, colorEnd: true },
          },
        },
      }),
      prisma.account.update({
        where: { id: data.accountId },
        data: { currentBalance: { increment: delta } },
      }),
    ])

    return created(transaction)
  } catch (e) {
    return handleError(e)
  }
}
