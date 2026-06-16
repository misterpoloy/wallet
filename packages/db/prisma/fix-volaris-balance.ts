/**
 * Fixes acc_volaris balance to match the Invex app screenshot (Jun 14, 2026):
 *   Límite de crédito : $51,000.00
 *   Saldo al día      : $164,450.48 (INCLUDES Línea Paralela — tracked separately as loan)
 *   Disponible        : $2,042.58
 *   Real CC balance   : $51,000 − $2,042.58 = $48,957.42
 *
 * Problem: 72 null-payee noise transactions (from prior bad imports) were inflating
 * the txDelta by $79,551.66, causing the displayed balance to be wildly wrong.
 *
 * Fix:
 *   1. Delete all 72 null-payee transactions on acc_volaris
 *   2. Set creditLimit = $51,000  (was $173,000 which included Línea Paralela)
 *   3. Set initialBalance = $37,566.89
 *      → detail page shows: $37,566.89 + named txDelta ($11,390.53) = $48,957.42 ✓
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// From screenshot: $51,000 − $2,042.58 = $48,957.42 (pure CC balance, LP excluded)
const TARGET_BALANCE   = 51_000 - 2_042.58  // 48,957.42
const NAMED_TX_DELTA   = 11_390.53           // named expenses − payments (computed from DB)
const INITIAL_BALANCE  = TARGET_BALANCE - NAMED_TX_DELTA  // 37,566.89
const NEW_CREDIT_LIMIT = 51_000

async function main() {
  console.log('🔧  Fixing acc_volaris balance…\n')

  // ── 1. Delete null-payee noise transactions ──────────────────────────────
  const nullTxs = await prisma.transaction.findMany({
    where: { accountId: 'acc_volaris', payee: null },
    select: { id: true, date: true, amount: true, type: true },
  })
  console.log(`  Found ${nullTxs.length} null-payee noise transactions`)

  if (nullTxs.length > 0) {
    const { count } = await prisma.transaction.deleteMany({
      where: { accountId: 'acc_volaris', payee: null },
    })
    console.log(`  ✓  Deleted ${count} null-payee transactions`)
  }

  // ── 2. Update account: new creditLimit + new initialBalance ──────────────
  const updated = await prisma.account.update({
    where: { id: 'acc_volaris' },
    data: {
      creditLimit:    NEW_CREDIT_LIMIT,
      initialBalance: INITIAL_BALANCE,
      updatedBy:      'user',
    },
  })
  console.log(`\n  ✓  creditLimit    → $${Number(updated.creditLimit).toLocaleString('en-MX', { minimumFractionDigits: 2 })}`)
  console.log(`  ✓  initialBalance → $${Number(updated.initialBalance).toLocaleString('en-MX', { minimumFractionDigits: 2 })}`)

  // ── 3. Verify the math ────────────────────────────────────────────────────
  const expAgg = await prisma.transaction.aggregate({
    where: { accountId: 'acc_volaris', type: 'expense', isTransfer: false },
    _sum: { amount: true },
  })
  const incAgg = await prisma.transaction.aggregate({
    where: { accountId: 'acc_volaris', type: 'income', isTransfer: false },
    _sum: { amount: true },
  })

  const txDelta        = Number(expAgg._sum.amount ?? 0) - Number(incAgg._sum.amount ?? 0)
  const displayBalance = INITIAL_BALANCE + txDelta
  const available      = NEW_CREDIT_LIMIT - displayBalance

  console.log(`\n  ── Verification ──────────────────────────────────`)
  console.log(`  initialBalance : $${INITIAL_BALANCE.toFixed(2)}`)
  console.log(`  txDelta        : $${txDelta.toFixed(2)}`)
  console.log(`  Balance owed   : $${displayBalance.toFixed(2)}   ← should be $48,957.42`)
  console.log(`  Available      : $${available.toFixed(2)}   ← should be $2,042.58`)
  console.log(`  Credit limit   : $${NEW_CREDIT_LIMIT.toLocaleString()}   ← should be $51,000`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
