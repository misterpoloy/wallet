/**
 * Patch: inserts the 4 transactions that were skipped in seed-volaris-june2026.ts
 * due to ID collisions. Uses a longer description suffix to guarantee unique IDs.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT     = 'tenant_portiz'
const ACCOUNT_ID = 'acc_volaris'

const MISSING = [
  { date: '2026-06-02', description: 'STARBUCKS CAP REFOR 02-JUN-54',   amount: 54.00,   category: 'Food & Drink',     notes: 'Starbucks Capitolio Reforma $54 — tarjeta adicional' },
  { date: '2026-06-07', description: 'WAL MART TOL METEPEC 07-JUN-25',  amount: 25.00,   category: 'Groceries',        notes: 'Walmart Toluca Metepec $25 — tarjeta adicional' },
  { date: '2026-06-09', description: 'STARBUCKS CAP REFOR 09-JUN-54',   amount: 54.00,   category: 'Food & Drink',     notes: 'Starbucks Capitolio Reforma $54 — tarjeta adicional (jun 9)' },
  { date: '2026-06-12', description: 'IVA COMISIONES E INT 759 JUN',    amount: 759.84,  category: 'Tax',              notes: 'IVA sobre comisiones e intereses — línea paralela jun 2026' },
]

async function main() {
  console.log('🔧  Patching 4 missing June-2026 transactions…\n')

  for (const tx of MISSING) {
    const slug = `${tx.date}-${tx.description.replace(/\s+/g, '_').toLowerCase().slice(0, 40)}-${tx.amount}`
    const id   = `txn_volaris_${Buffer.from(slug).toString('base64url').slice(0, 24)}`

    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (existing) {
      console.log(`  ⏭  still exists: ${tx.date}  ${tx.description}  $${tx.amount}`)
      continue
    }

    await prisma.transaction.create({
      data: {
        id,
        tenantId:    TENANT,
        accountId:   ACCOUNT_ID,
        date:        new Date(tx.date),
        payee:       tx.description,
        amount:      tx.amount,
        refAmount:   tx.amount,
        currency:    'MXN',
        refCurrency: 'MXN',
        type:        'expense',
        paymentType: 'credit_card',
        category:    tx.category,
        categoryRaw: tx.description,
        note:        tx.notes ?? null,
        createdBy:   'agent:import',
      },
    })
    console.log(`  ✓  added  ${tx.date}  ${tx.description.padEnd(40)} $${tx.amount.toFixed(2)}`)
  }

  console.log('\n  ✅  patch complete')
}

main().catch(console.error).finally(() => prisma.$disconnect())
