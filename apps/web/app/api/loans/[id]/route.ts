import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, Currency, LoanType } from '@wallet/db'
import { ok, notFound, noContent, handleError, DEFAULT_TENANT_ID } from '@/lib/api/response'

const PatchSchema = z.object({
  name:            z.string().min(1).max(100).optional(),
  type:            z.nativeEnum(LoanType).optional(),
  lender:          z.string().optional(),
  currency:        z.nativeEnum(Currency).optional(),
  currentBalance:  z.number().optional(),
  interestRate:    z.number().min(0).optional(),
  monthlyPayment:  z.number().positive().optional(),
  linkedAccountId: z.string().nullable().optional(),
  isActive:        z.boolean().optional(),
  notes:           z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const loan = await prisma.loan.findFirst({
      where: { id: params.id, tenantId: DEFAULT_TENANT_ID },
      include: { payments: { orderBy: { period: 'asc' } } },
    })
    if (!loan) return notFound()
    return ok(loan)
  } catch (e) { return handleError(e) }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const loan = await prisma.loan.findFirst({ where: { id: params.id, tenantId: DEFAULT_TENANT_ID } })
    if (!loan) return notFound()
    const body = await req.json()
    const data = PatchSchema.parse(body)
    const updated = await prisma.loan.update({
      where: { id: params.id },
      data: { ...data, updatedBy: 'user' },
    })
    return ok(updated)
  } catch (e) { return handleError(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const loan = await prisma.loan.findFirst({ where: { id: params.id, tenantId: DEFAULT_TENANT_ID } })
    if (!loan) return notFound()
    await prisma.loan.delete({ where: { id: params.id } })
    return noContent()
  } catch (e) { return handleError(e) }
}
