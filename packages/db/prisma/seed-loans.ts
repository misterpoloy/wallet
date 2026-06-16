/**
 * Seeds real loan data extracted from bank statements.
 * Safe to re-run — uses upsert on known IDs.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT = 'tenant_portiz'

async function main() {
  console.log('🌱  Seeding loan data…\n')

  // ─── Scotiabank Crediauto MAS ──────────────────────────────────────────────
  // Statement: Cut 007/036, cut date 18/MAY/2026, next payment 18/JUN/2026
  // Original: $347,627.06 | Current capital: $293,295.91 | Rate: 17.50% | Payment: $14,279.81

  const startDate = new Date('2025-11-18')  // 36-month loan, payment 1 due 18/DEC/2025
  const endDate   = new Date('2028-11-18')  // 36 months from start
  const monthlyPayment = 14279.81
  const originalAmount = 347627.06
  const annualRate     = 17.50
  const monthlyRate    = annualRate / 100 / 12

  const loan = await prisma.loan.upsert({
    where: { id: 'loan_scotiabank_crediauto' },
    create: {
      id:              'loan_scotiabank_crediauto',
      tenantId:        TENANT,
      name:            'Scotiabank Crediauto MAS *5114',
      type:            'auto',
      lender:          'Scotiabank',
      currency:        'MXN',
      originalAmount,
      currentBalance:  293295.91,   // capital insoluto as of May 2026 statement
      interestRate:    annualRate,
      monthlyPayment,
      termMonths:      36,
      startDate,
      endDate,
      notes:           'Crédito #702560955114. Corte 007/036 al 18/MAY/2026.',
      createdBy:       'agent:import',
      updatedBy:       'agent:import',
    },
    update: {
      currentBalance: 293295.91,
      updatedBy:      'agent:import',
    },
  })
  console.log(`  ✓  ${loan.id}  (${loan.name})`)

  // ─── Generate full 36-month amortization schedule ─────────────────────────
  // Then mark first 6 months as PAID with known actual amounts
  let balance = originalAmount

  const payments = []
  for (let i = 0; i < 36; i++) {
    const d = new Date(startDate)
    d.setMonth(d.getMonth() + i + 1)  // payment 1 due 1 month after start = 18/DEC/2025
    const year   = d.getFullYear()
    const month  = d.getMonth() + 1
    const period = `${year}-${String(month).padStart(2, '0')}`
    const dueDate = new Date(year, month - 1, 18)

    const interestPortion  = balance * monthlyRate
    const principalPortion = Math.min(monthlyPayment - interestPortion, balance)
    balance = Math.max(balance - principalPortion, 0)

    payments.push({
      period,
      dueDate,
      dueAmount:       monthlyPayment,
      principalAmount: Math.round(principalPortion * 100) / 100,
      interestAmount:  Math.round(interestPortion * 100) / 100,
      paymentNum:      i + 1,
    })
  }

  // Actual paid amounts from statement history (payments 1-6)
  // Last known: payment 6 on 18/MAY/2026 = $14,300.55
  const paidActuals: Record<string, { paidAmount: number; paidAt: Date }> = {
    '2025-12': { paidAmount: 14279.81, paidAt: new Date('2025-12-18') },
    '2026-01': { paidAmount: 14279.81, paidAt: new Date('2026-01-18') },
    '2026-02': { paidAmount: 14279.81, paidAt: new Date('2026-02-18') },
    '2026-03': { paidAmount: 14279.81, paidAt: new Date('2026-03-18') },
    '2026-04': { paidAmount: 14279.81, paidAt: new Date('2026-04-18') },
    '2026-05': { paidAmount: 14300.55, paidAt: new Date('2026-05-18') },
  }

  for (const p of payments) {
    const actual = paidActuals[p.period]
    await prisma.loanPayment.upsert({
      where: { loanId_period: { loanId: loan.id, period: p.period } },
      create: {
        loanId:          loan.id,
        period:          p.period,
        dueDate:         p.dueDate,
        dueAmount:       p.dueAmount,
        principalAmount: p.principalAmount,
        interestAmount:  p.interestAmount,
        status:          actual ? 'paid' : 'scheduled',
        paidAmount:      actual?.paidAmount ?? null,
        paidAt:          actual?.paidAt ?? null,
      },
      update: {
        principalAmount: p.principalAmount,
        interestAmount:  p.interestAmount,
        status:          actual ? 'paid' : 'scheduled',
        paidAmount:      actual?.paidAmount ?? null,
        paidAt:          actual?.paidAt ?? null,
      },
    })
  }

  console.log(`  ✓  36 payment schedule generated (6 marked paid, 30 scheduled)`)
  console.log('\n✅  Done!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
