import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, PaymentType } from '@wallet/db'
import { ok, badRequest, notFound, handleError, DEFAULT_TENANT_ID } from '@/lib/api/response'

const ConfirmSchema = z.object({
  period:       z.string().regex(/^\d{4}-\d{2}$/),
  subPeriod:    z.number().int().min(1).max(2).default(1),
  amount:       z.number().positive(),
  date:         z.string(),
  note:         z.string().optional(),
  paymentType:  z.nativeEnum(PaymentType).default('debit'),
})

// POST /api/income/[id]/confirm
// Atomically: creates income Transaction + upserts IncomeEntry with transactionId
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const source = await prisma.incomeSource.findFirst({
      where: { id: params.id, tenantId: DEFAULT_TENANT_ID },
      include: { account: { select: { id: true, currency: true } } },
    })
    if (!source) return notFound()
    if (!source.accountId) return badRequest('Income source has no linked bank account')

    const body = await req.json()
    const data = ConfirmSchema.parse(body)

    const labelParts = source.frequency === 'semimonthly'
      ? [`${data.subPeriod === 1 ? '1ra' : '2da'} Quincena`, data.period]
      : ['Pago mensual', data.period]
    const autoNote = data.note ?? labelParts.join(' · ')

    // Use a transaction to ensure atomicity
    const [transaction, entry] = await prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: {
          tenantId:    DEFAULT_TENANT_ID,
          accountId:   source.accountId!,
          type:        'income',
          amount:      data.amount,
          refAmount:   data.amount,
          currency:    source.currency,
          payee:       source.employer ?? source.name,
          category:    source.type === 'salary' ? 'Salary' : 'Income',
          categoryRaw: source.name,
          note:        autoNote,
          date:        new Date(data.date),
          paymentType: data.paymentType,
          isTransfer:  false,
          labels:      [],
          createdBy:   'user',
          updatedBy:   'user',
        },
      })

      const ent = await tx.incomeEntry.upsert({
        where: {
          incomeSourceId_period_subPeriod: {
            incomeSourceId: params.id,
            period:         data.period,
            subPeriod:      data.subPeriod,
          },
        },
        create: {
          incomeSourceId: params.id,
          period:         data.period,
          subPeriod:      data.subPeriod,
          expectedAmount: data.amount,
          actualAmount:   data.amount,
          status:         'received',
          receivedAt:     new Date(data.date),
          accountId:      source.accountId,
          transactionId:  txn.id,
          note:           autoNote,
        },
        update: {
          actualAmount:  data.amount,
          status:        'received',
          receivedAt:    new Date(data.date),
          accountId:     source.accountId,
          transactionId: txn.id,
          note:          autoNote,
        },
      })

      return [txn, ent]
    })

    return ok({ transaction, entry })
  } catch (e) { return handleError(e) }
}
