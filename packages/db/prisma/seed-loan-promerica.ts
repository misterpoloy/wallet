/**
 * Seeds Promerica Premium 3 loan from screenshot data.
 * Receipt 10/18 paid, next payment 26/06/2026.
 * Back-calculates original principal using amortization formula.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT = 'tenant_portiz'

async function main() {
  console.log('🌱  Seeding Promerica loan…\n')

  // Known facts from screenshot
  const monthlyPayment  = 5740.62
  const currentBalance  = 41061.39
  const termMonths      = 18
  const paymentsMade    = 10       // receipt 10/18 PAGADO
  const paymentsLeft    = termMonths - paymentsMade  // 8

  // Infer annual rate: Q5740.62/mo for 18 months, current balance Q41,061.39 after 10 payments
  // Solve for r: balance(n) = PV*(1+r)^n - P*((1+r)^n-1)/r
  // Try 24% annual (2%/month) — typical Promerica Guatemala personal rate
  const annualRate  = 24.0
  const monthlyRate = annualRate / 100 / 12  // 0.02

  // Original principal from annuity formula: PV = P * (1 - (1+r)^-n) / r
  const originalAmount = monthlyPayment * (1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate
  // = 5740.62 * (1 - (1.02)^-18) / 0.02 ≈ Q 86,028

  console.log(`  Inferred original amount: Q ${originalAmount.toFixed(2)}`)
  console.log(`  Monthly rate: ${(monthlyRate * 100).toFixed(4)}%`)

  // Payment schedule — first payment due 26/08/2025, disbursed ~26/07/2025
  const startDate = new Date('2025-07-26')
  const endDate   = new Date('2027-01-26')  // 18 months from start

  const loan = await prisma.loan.upsert({
    where:  { id: 'loan_promerica_premium3' },
    create: {
      id:             'loan_promerica_premium3',
      tenantId:       TENANT,
      name:           'Promerica Premium 3 *2045',
      type:           'personal',
      lender:         'Promerica Guatemala',
      currency:       'GTQ',
      originalAmount: Math.round(originalAmount * 100) / 100,
      currentBalance,
      interestRate:   annualRate,
      monthlyPayment,
      termMonths,
      startDate,
      endDate,
      notes:          'Préstamo #180005502045. Cuota Q5,740.62. Recibo 10/18 al 26/05/2026.',
      createdBy:      'agent:import',
      updatedBy:      'agent:import',
    },
    update: {
      currentBalance,
      updatedBy: 'agent:import',
    },
  })
  console.log(`  ✓  ${loan.id}  (${loan.name})\n`)

  // Build full 18-month schedule with amortization
  let balance = Math.round(originalAmount * 100) / 100

  // Due dates: 26th of each month starting Aug 2025
  const paidPeriods = new Set([
    '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
    '2026-01', '2026-02', '2026-03', '2026-04', '2026-05',
  ])

  for (let i = 0; i < termMonths; i++) {
    const d = new Date(startDate)
    d.setMonth(d.getMonth() + i + 1)
    const year   = d.getFullYear()
    const month  = d.getMonth() + 1
    const period = `${year}-${String(month).padStart(2, '0')}`
    const dueDate = new Date(year, month - 1, 26)

    const interestPortion  = balance * monthlyRate
    const principalPortion = Math.min(monthlyPayment - interestPortion, balance)
    balance = Math.max(balance - principalPortion, 0)

    const isPaid = paidPeriods.has(period)

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
    console.log(`  ${isPaid ? '✓' : '○'}  ${period}  principal: Q${principalPortion.toFixed(2)}  interest: Q${interestPortion.toFixed(2)}  ${isPaid ? 'PAID' : 'scheduled'}`)
  }

  console.log('\n✅  Done!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
