/**
 * Seeds Mastercard México income source from offer letter.
 * - Annual base: MXN 1,056,000 (includes 13th month/aguinaldo)
 * - Monthly gross: MXN 88,000 (paid twice a month = $44,000 per payment)
 * - Start date: May 18, 2026
 * - AICP bonus: 10% of base = MXN 105,600/year (targeted, discretionary)
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT = 'tenant_portiz'

async function main() {
  console.log('🌱  Seeding Mastercard income sources…\n')

  // ── 1. Main Salary ──────────────────────────────────────────────────────────
  // 1,056,000 / 12 = 88,000/month (includes aguinaldo amortized monthly)
  // Paid semi-monthly: $44,000 on the 15th and last day of each month.
  const monthlyGross = 88_000      // MXN per month
  const startDate    = new Date('2026-05-18')

  const salary = await prisma.incomeSource.upsert({
    where:  { id: 'income_mastercard_salary' },
    create: {
      id:          'income_mastercard_salary',
      tenantId:    TENANT,
      name:        'Mastercard · Salary',
      type:        'salary',
      employer:    'Mastercard México S. de R.L. de C.V.',
      currency:    'MXN',
      grossAmount: monthlyGross,
      frequency:   'monthly',
      startDate,
      notes:       'Senior Software Engineer. Annual MXN 1,056,000 (incl. aguinaldo). Paid twice a month. Start: May 18, 2026.',
      createdBy:   'agent:import',
      updatedBy:   'agent:import',
    },
    update: {
      grossAmount: monthlyGross,
      updatedBy:   'agent:import',
    },
  })
  console.log(`  ✓  ${salary.id}  (${salary.name})`)

  // Seed entries
  // 2026-05: Started May 18 → only one payment (May 31, prorated ~14 days).
  //          Treating as partial: received $44,000 (half month)
  await prisma.incomeEntry.upsert({
    where:  { incomeSourceId_period: { incomeSourceId: salary.id, period: '2026-05' } },
    create: {
      incomeSourceId: salary.id,
      period:         '2026-05',
      expectedAmount: monthlyGross,
      actualAmount:   44_000,   // one semi-monthly payment (prorated start)
      status:         'partial',
      receivedAt:     new Date('2026-05-31'),
      note:           'Prorated — started May 18. First payment May 31.',
    },
    update: {
      actualAmount: 44_000,
      status:       'partial',
      receivedAt:   new Date('2026-05-31'),
      note:         'Prorated — started May 18. First payment May 31.',
    },
  })
  console.log('  ✓  2026-05  partial ($44,000 received — prorated start)')

  // 2026-06: Current month — first payment June 15 hasn't occurred yet (seeding Jun 14)
  await prisma.incomeEntry.upsert({
    where:  { incomeSourceId_period: { incomeSourceId: salary.id, period: '2026-06' } },
    create: {
      incomeSourceId: salary.id,
      period:         '2026-06',
      expectedAmount: monthlyGross,
      status:         'expected',
    },
    update: { status: 'expected' },
  })
  console.log('  ○  2026-06  expected ($88,000 — 2 payments: Jun 15 + Jun 30)')

  // 2026-07 through 2026-12: upcoming months — expected
  for (let m = 7; m <= 12; m++) {
    const period = `2026-${String(m).padStart(2, '0')}`
    await prisma.incomeEntry.upsert({
      where:  { incomeSourceId_period: { incomeSourceId: salary.id, period } },
      create: { incomeSourceId: salary.id, period, expectedAmount: monthlyGross, status: 'expected' },
      update: { status: 'expected' },
    })
    console.log(`  ○  ${period}  expected`)
  }

  // ── 2. AICP Annual Bonus ─────────────────────────────────────────────────────
  // 10% of MXN 1,056,000 = MXN 105,600 targeted (discretionary, paid ~Q1 next year)
  const bonus = await prisma.incomeSource.upsert({
    where:  { id: 'income_mastercard_aicp' },
    create: {
      id:          'income_mastercard_aicp',
      tenantId:    TENANT,
      name:        'Mastercard · AICP Bonus',
      type:        'bonus',
      employer:    'Mastercard México S. de R.L. de C.V.',
      currency:    'MXN',
      grossAmount: 105_600,   // 10% of 1,056,000 — targeted, not guaranteed
      frequency:   'annual',
      startDate,
      notes:       'Worldwide Annual Incentive Compensation Program. Target: 10% of base ($105,600). Paid ~Q1 of following year. Pro-rated for 2026 (started May 18). Discretionary.',
      createdBy:   'agent:import',
      updatedBy:   'agent:import',
    },
    update: {
      grossAmount: 105_600,
      updatedBy:   'agent:import',
    },
  })
  console.log(`\n  ✓  ${bonus.id}  (${bonus.name})`)

  // Expected for 2026 cycle (paid in 2027, but track by year earned)
  await prisma.incomeEntry.upsert({
    where:  { incomeSourceId_period: { incomeSourceId: bonus.id, period: '2026-12' } },
    create: {
      incomeSourceId: bonus.id,
      period:         '2026-12',
      expectedAmount: 105_600,
      status:         'expected',
      note:           '2026 AICP — pro-rated from May 18. Expected payout Q1 2027.',
    },
    update: { status: 'expected' },
  })
  console.log('  ○  2026-12  expected (AICP 2026 — paid ~Q1 2027)')

  console.log('\n✅  Done!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
