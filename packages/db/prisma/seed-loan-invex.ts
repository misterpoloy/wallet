/**
 * Seeds Invex Volaris "Línea Paralela" credit line.
 * 36%-12m, disbursed 17/Apr/2026, payment 1/12 paid (17/May/2026).
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT = 'tenant_portiz'

async function main() {
  console.log('🌱  Seeding Invex Volaris loan…\n')

  const monthlyPayment = 12256.38
  const originalAmount = 122000.00   // exact — verified: P*(1-(1.03)^-12)/0.03 = 122,000
  const annualRate     = 36.0
  const monthlyRate    = annualRate / 100 / 12  // 0.03 = 3% monthly
  const termMonths     = 12

  // Disbursed 17/Apr/2026 → payment 1 due 17/May/2026 (PAID)
  const startDate = new Date('2026-04-17')
  const endDate   = new Date('2027-04-17')

  const loan = await prisma.loan.upsert({
    where:  { id: 'loan_invex_volaris_lp' },
    create: {
      id:             'loan_invex_volaris_lp',
      tenantId:       TENANT,
      name:           'Invex Volaris Línea Paralela',
      type:           'credit_line',
      lender:         'Invex Volaris',
      currency:       'MXN',
      originalAmount,
      currentBalance: 113281.62,   // monto pendiente from screenshot
      interestRate:   annualRate,
      monthlyPayment,
      termMonths,
      startDate,
      endDate,
      notes:          'Compra diferida. Concepto: Línea Paralela 36%-12m. Fecha: 17/Abr/2026.',
      createdBy:      'agent:import',
      updatedBy:      'agent:import',
    },
    update: {
      currentBalance: 113281.62,
      updatedBy:      'agent:import',
    },
  })
  console.log(`  ✓  ${loan.id}  (${loan.name})\n`)

  // Generate 12-month amortization schedule
  // Payment 1: 2026-05 → PAID
  let balance = originalAmount

  for (let i = 0; i < termMonths; i++) {
    const d = new Date(startDate)
    d.setMonth(d.getMonth() + i + 1)
    const year    = d.getFullYear()
    const month   = d.getMonth() + 1
    const period  = `${year}-${String(month).padStart(2, '0')}`
    const dueDate = new Date(year, month - 1, 17)

    const interestPortion  = balance * monthlyRate
    const principalPortion = Math.min(monthlyPayment - interestPortion, balance)
    balance = Math.max(balance - principalPortion, 0)

    const isPaid = period === '2026-05'  // only first payment made

    await prisma.loanPayment.upsert({
      where:  { loanId_period: { loanId: loan.id, period } },
      create: {
        loanId:          loan.id,
        period,
        dueDate,
        dueAmount:       monthlyPayment,
        principalAmount: Math.round(principalPortion * 100) / 100,
        interestAmount:  Math.round(interestPortion * 100) / 100,
        status:          isPaid ? 'paid' : 'scheduled',
        paidAmount:      isPaid ? monthlyPayment : null,
        paidAt:          isPaid ? dueDate : null,
      },
      update: {
        principalAmount: Math.round(principalPortion * 100) / 100,
        interestAmount:  Math.round(interestPortion * 100) / 100,
        status:          isPaid ? 'paid' : 'scheduled',
        paidAmount:      isPaid ? monthlyPayment : null,
        paidAt:          isPaid ? dueDate : null,
      },
    })
    console.log(`  ${isPaid ? '✓' : '○'}  ${period}  principal: $${principalPortion.toFixed(2)}  interest: $${interestPortion.toFixed(2)}  ${isPaid ? 'PAID' : 'scheduled'}`)
  }

  console.log('\n✅  Done!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
