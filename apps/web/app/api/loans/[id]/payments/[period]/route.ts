import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, PaymentStatus } from '@wallet/db'
import { ok, notFound, handleError, DEFAULT_TENANT_ID } from '@/lib/api/response'

const PatchSchema = z.object({
  status:       z.nativeEnum(PaymentStatus),
  paidAmount:   z.number().positive().optional(),
  paidAt:       z.string().optional(),
  note:         z.string().optional(),
  transactionId: z.string().optional(),
})

// PATCH /api/loans/[id]/payments/[period]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; period: string } }
) {
  try {
    const loan = await prisma.loan.findFirst({ where: { id: params.id, tenantId: DEFAULT_TENANT_ID } })
    if (!loan) return notFound()

    const body = await req.json()
    const data = PatchSchema.parse(body)

    const payment = await prisma.loanPayment.upsert({
      where: { loanId_period: { loanId: params.id, period: params.period } },
      create: {
        loanId:    params.id,
        period:    params.period,
        dueDate:   new Date(),
        dueAmount: loan.monthlyPayment,
        status:    data.status,
        paidAmount: data.paidAmount ?? (data.status === 'paid' ? Number(loan.monthlyPayment) : undefined),
        paidAt:    data.paidAt ? new Date(data.paidAt) : (data.status === 'paid' ? new Date() : null),
        note:      data.note,
        transactionId: data.transactionId,
      },
      update: {
        status:    data.status,
        paidAmount: data.paidAmount,
        paidAt:    data.paidAt ? new Date(data.paidAt) : (data.status === 'paid' ? new Date() : null),
        note:      data.note,
        transactionId: data.transactionId,
      },
    })

    // Update loan balance if paid
    if (data.status === 'paid') {
      const paidPayments = await prisma.loanPayment.findMany({
        where: { loanId: params.id, status: { in: ['paid', 'partial'] } },
      })
      const totalPrincipalPaid = paidPayments.reduce((s, p) => s + Number(p.principalAmount ?? 0), 0)
      const newBalance = Math.max(Number(loan.originalAmount) - totalPrincipalPaid, 0)
      await prisma.loan.update({ where: { id: params.id }, data: { currentBalance: newBalance } })
    }

    return ok(payment)
  } catch (e) { return handleError(e) }
}
