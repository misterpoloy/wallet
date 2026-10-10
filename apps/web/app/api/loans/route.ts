import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma, Currency, LoanType } from '@wallet/db'
import { ok, created, handleError } from '@/lib/api/response'
import { requireCtx, requireWriter } from '@/lib/auth/ctx'
import { assertOwned } from '@/lib/auth/ownership'

const CreateSchema = z.object({
  name:            z.string().min(1).max(100),
  type:            z.nativeEnum(LoanType).default('personal'),
  lender:          z.string().min(1),
  currency:        z.nativeEnum(Currency).default('MXN'),
  originalAmount:  z.number().positive(),
  currentBalance:  z.number(),
  interestRate:    z.number().min(0),
  monthlyPayment:  z.number().positive(),
  termMonths:      z.number().int().positive(),
  startDate:       z.string(),
  endDate:         z.string(),
  linkedAccountId: z.string().optional(),
  notes:           z.string().optional(),
})

export async function GET() {
  try {
    const ctx = await requireCtx()
    const loans = await prisma.loan.findMany({
      where: { tenantId: ctx.tenantId },
      include: { payments: { orderBy: { period: 'asc' } } },
      orderBy: { startDate: 'desc' },
    })
    return ok(loans)
  } catch (e) { return handleError(e) }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireCtx()
    requireWriter(ctx)
    const body = await req.json()
    const data = CreateSchema.parse(body)
    await assertOwned(ctx, { accounts: [data.linkedAccountId] })

    const loan = await prisma.loan.create({
      data: {
        tenantId:        ctx.tenantId,
        name:            data.name,
        type:            data.type,
        lender:          data.lender,
        currency:        data.currency,
        originalAmount:  data.originalAmount,
        currentBalance:  data.currentBalance,
        interestRate:    data.interestRate,
        monthlyPayment:  data.monthlyPayment,
        termMonths:      data.termMonths,
        startDate:       new Date(data.startDate),
        endDate:         new Date(data.endDate),
        linkedAccountId: data.linkedAccountId,
        notes:           data.notes,
        createdBy:       'user',
        updatedBy:       'user',
      },
    })

    // Auto-generate full payment schedule
    await generateSchedule(loan.id, new Date(data.startDate), data.termMonths, data.monthlyPayment, data.interestRate, data.originalAmount)

    const full = await prisma.loan.findUnique({
      where: { id: loan.id },
      include: { payments: { orderBy: { period: 'asc' } } },
    })
    return created(full)
  } catch (e) { return handleError(e) }
}

// Generate amortization schedule rows
async function generateSchedule(
  loanId: string,
  startDate: Date,
  termMonths: number,
  monthlyPayment: number,
  annualRate: number,
  originalAmount: number,
) {
  const monthlyRate = annualRate / 100 / 12
  let balance = originalAmount

  const rows = []
  for (let i = 0; i < termMonths; i++) {
    const d = new Date(startDate)
    d.setMonth(d.getMonth() + i)
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const dueDate = new Date(d.getFullYear(), d.getMonth(), startDate.getDate())

    const interestPortion = monthlyRate > 0 ? balance * monthlyRate : 0
    const principalPortion = Math.min(monthlyPayment - interestPortion, balance)
    balance = Math.max(balance - principalPortion, 0)

    rows.push({
      loanId,
      period,
      dueDate,
      dueAmount:       monthlyPayment,
      principalAmount: Math.round(principalPortion * 100) / 100,
      interestAmount:  Math.round(interestPortion * 100) / 100,
      status:          'scheduled' as const,
    })
  }

  await prisma.loanPayment.createMany({ data: rows, skipDuplicates: true })
}
