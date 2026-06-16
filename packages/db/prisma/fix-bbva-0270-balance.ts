/**
 * Fixes acc_bbva_0270 balance after seeding the Apr 17 – May 16, 2026 statement.
 *
 * Problem: 14 null-payee CSV transactions exist in the same period as our 16
 * freshly-seeded named ones → double-counting.
 *
 * Fix:
 *   1. Delete the 14 null-payee overlapping transactions
 *   2. Re-compute income/expense through May 16 (truth point from the statement)
 *   3. Set initialBalance = 214,327.44 − (income_thru_may16 − expense_thru_may16)
 *      so the balance on the statement closing date is exact.
 *
 * Truth anchor (from BBVA statement, closing date 16/05/2026):
 *   Saldo Final = $214,327.44
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const ACCOUNT_ID    = 'acc_bbva_0270'
const CLOSING_DATE  = new Date('2026-05-16T23:59:59Z')
const CLOSING_BAL   = 214_327.44

// IDs of null-payee CSV noise in the statement period — to be deleted
const TO_DELETE = [
  'cmqadzre4003puj0aiju727r0',
  'cmqadzr4h003juj0ae5bbyjo4',
  'cmqadzr13003huj0a0m2fiiox',
  'cmqadzqj70035uj0ay3o32vr1',
  'cmqadzq8o002xuj0a1309n1ox',
  'cmqadzq2l002tuj0a2bdfepsa',
  'cmqadzpxr002ruj0ao1qpu591',
  'cmqadzpvh002puj0aom0wm6sa',
  'cmqadzpqb002nuj0axypz98d6',
  'cmqadzpj9002huj0aqp0l7dph',
  'cmqadzp2q0029uj0aag55myjx',
  'cmqadzow50025uj0akd87k6tg',
  'cmqadzor80023uj0arc5ddli3',
  'cmqadzooz0021uj0ajy79s57s',
]

async function main() {
  console.log('── Step 1: Delete 14 null-payee CSV duplicates ────────────────')
  const del = await prisma.transaction.deleteMany({
    where: { id: { in: TO_DELETE } },
  })
  console.log(`Deleted: ${del.count} transactions`)

  console.log('\n── Step 2: Compute totals through closing date ─────────────────')
  const [incAgg, expAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        accountId: ACCOUNT_ID,
        type: 'income',
        isTransfer: false,
        date: { lte: CLOSING_DATE },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        accountId: ACCOUNT_ID,
        type: 'expense',
        isTransfer: false,
        date: { lte: CLOSING_DATE },
      },
      _sum: { amount: true },
    }),
  ])

  const incomeThruMay16  = Number(incAgg._sum.amount ?? 0)
  const expenseThruMay16 = Number(expAgg._sum.amount ?? 0)
  const netThruMay16     = incomeThruMay16 - expenseThruMay16

  console.log(`Income  through May 16 : +$${incomeThruMay16.toFixed(2)}`)
  console.log(`Expense through May 16 : -$${expenseThruMay16.toFixed(2)}`)
  console.log(`Net through May 16     :  $${netThruMay16.toFixed(2)}`)

  // initialBalance + netThruMay16 = CLOSING_BAL
  const initialBalance = CLOSING_BAL - netThruMay16

  console.log(`\ninitialBalance = $${CLOSING_BAL} − $${netThruMay16.toFixed(2)} = $${initialBalance.toFixed(2)}`)

  console.log('\n── Step 3: Update initialBalance ───────────────────────────────')
  await prisma.account.update({
    where: { id: ACCOUNT_ID },
    data:  { initialBalance, updatedBy: 'agent:import' },
  })
  console.log(`Set initialBalance → $${initialBalance.toFixed(2)}`)

  // ── Verify: balance as of closing date should = $214,327.44 ─────────────
  const verify = initialBalance + netThruMay16
  console.log(`\n── Verification ────────────────────────────────────────────────`)
  console.log(`$${initialBalance.toFixed(2)} + $${netThruMay16.toFixed(2)} = $${verify.toFixed(2)}`)
  console.log(`Expected : $${CLOSING_BAL.toFixed(2)}`)
  console.log(Math.abs(verify - CLOSING_BAL) < 0.01 ? '✅ MATCH' : `❌ DIFF: $${(verify - CLOSING_BAL).toFixed(2)}`)

  // ── Also show what the current balance (all transactions) will be ────────
  const [incAll, expAll] = await Promise.all([
    prisma.transaction.aggregate({
      where: { accountId: ACCOUNT_ID, type: 'income',  isTransfer: false },
      _sum:  { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { accountId: ACCOUNT_ID, type: 'expense', isTransfer: false },
      _sum:  { amount: true },
    }),
  ])
  const currentBalance = initialBalance + Number(incAll._sum.amount ?? 0) - Number(expAll._sum.amount ?? 0)
  console.log(`\nCurrent computed balance (all-time) : $${currentBalance.toFixed(2)}`)
  console.log(`(includes transactions after May 16)`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
