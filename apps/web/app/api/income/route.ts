import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, Currency, IncomeType, PayFrequency } from '@wallet/db'
import { ok, created, handleError, DEFAULT_TENANT_ID } from '@/lib/api/response'

const CreateSchema = z.object({
  name:        z.string().min(1).max(100),
  type:        z.nativeEnum(IncomeType).default('salary'),
  employer:    z.string().optional(),
  currency:    z.nativeEnum(Currency).default('MXN'),
  grossAmount: z.number().positive(),
  netAmount:   z.number().positive().optional(),
  frequency:   z.nativeEnum(PayFrequency).default('monthly'),
  startDate:   z.string(), // ISO date string
  endDate:     z.string().optional(),
  notes:       z.string().optional(),
})

export async function GET() {
  try {
    const sources = await prisma.incomeSource.findMany({
      where: { tenantId: DEFAULT_TENANT_ID },
      include: {
        entries: { orderBy: { period: 'desc' } },
        account: { select: { id: true, name: true, institution: true } },
      },
      orderBy: { startDate: 'desc' },
    })
    return ok(sources)
  } catch (e) { return handleError(e) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = CreateSchema.parse(body)
    const source = await prisma.incomeSource.create({
      data: {
        tenantId:    DEFAULT_TENANT_ID,
        name:        data.name,
        type:        data.type,
        employer:    data.employer,
        currency:    data.currency,
        grossAmount: data.grossAmount,
        netAmount:   data.netAmount,
        frequency:   data.frequency,
        startDate:   new Date(data.startDate),
        endDate:     data.endDate ? new Date(data.endDate) : null,
        notes:       data.notes,
        createdBy:   'user',
        updatedBy:   'user',
      },
    })
    return created(source)
  } catch (e) { return handleError(e) }
}
