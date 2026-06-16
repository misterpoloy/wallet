import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, Currency, IncomeType, PayFrequency } from '@wallet/db'
import { ok, notFound, noContent, handleError, DEFAULT_TENANT_ID } from '@/lib/api/response'

const PatchSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  type:        z.nativeEnum(IncomeType).optional(),
  employer:    z.string().nullable().optional(),
  currency:    z.nativeEnum(Currency).optional(),
  grossAmount: z.number().positive().optional(),
  netAmount:   z.number().positive().nullable().optional(),
  frequency:   z.nativeEnum(PayFrequency).optional(),
  startDate:   z.string().optional(),
  endDate:     z.string().nullable().optional(),
  isActive:    z.boolean().optional(),
  notes:       z.string().nullable().optional(),
  accountId:   z.string().nullable().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const source = await prisma.incomeSource.findFirst({
      where: { id: params.id, tenantId: DEFAULT_TENANT_ID },
      include: { entries: { orderBy: { period: 'asc' } } },
    })
    if (!source) return notFound()
    return ok(source)
  } catch (e) { return handleError(e) }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const source = await prisma.incomeSource.findFirst({ where: { id: params.id, tenantId: DEFAULT_TENANT_ID } })
    if (!source) return notFound()
    const body = await req.json()
    const data = PatchSchema.parse(body)
    const updated = await prisma.incomeSource.update({
      where: { id: params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate:   data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
        updatedBy: 'user',
      },
      include: { account: { select: { id: true, name: true, institution: true } } },
    })
    return ok(updated)
  } catch (e) { return handleError(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const source = await prisma.incomeSource.findFirst({ where: { id: params.id, tenantId: DEFAULT_TENANT_ID } })
    if (!source) return notFound()
    await prisma.incomeSource.delete({ where: { id: params.id } })
    return noContent()
  } catch (e) { return handleError(e) }
}
