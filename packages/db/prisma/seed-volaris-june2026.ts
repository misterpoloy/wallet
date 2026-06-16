/**
 * Seeds acc_volaris June-2026 transactions from "Mis movimientos por corte".
 *
 * Source: 5 screenshots from Invex app, period roughly 13-May → 12-Jun-2026.
 * All amounts in MXN. Charges only (no payments visible yet).
 * "Adicional" tag = secondary/additional card charges.
 *
 * Deduplication applied across screenshots:
 *   - 07-jun WAL MART $219 appeared in both screenshot 3 & 4 → counted once
 *   - Jun 9 STARBUCKS entries are NOT duplicates of Jun 2 (different dates, same amounts)
 *   - Two IVA SOBRE COMISIONES E IN on Jun 12 have DIFFERENT amounts ($565.80 vs $759.84)
 *     → both are real charges (likely one per credit line: regular + línea paralela)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT     = 'tenant_portiz'
const ACCOUNT_ID = 'acc_volaris'

type TxRow = {
  date:        string
  description: string
  amount:      number
  category:    string
  notes?:      string
}

const TRANSACTIONS: TxRow[] = [
  // ── 01 jun 2026 ───────────────────────────────────────────────────────────
  {
    date: '2026-06-01',
    description: 'SORIANA968 METEPEC METEPEC',
    amount: 2_299.03, category: 'Groceries',
    notes: 'Soriana Metepec — compra de despensa',
  },

  // ── 02 jun 2026 ───────────────────────────────────────────────────────────
  {
    date: '2026-06-02',
    description: 'MERPAGO*TURKISHFOODMEX',
    amount: 1_380.00, category: 'Food & Drink',
    notes: 'MercadoPago — Turkish Food Mex',
  },
  {
    date: '2026-06-02',
    description: 'CONTR MEXICO MARQUESA',
    amount: 116.00, category: 'Other',
    notes: 'Control / Contribución Mexico Marquesa',
  },
  {
    date: '2026-06-02',
    description: 'STARBUCKS CAP REFOR',
    amount: 82.00, category: 'Food & Drink',
    notes: 'Starbucks Capitolio Reforma — tarjeta adicional',
  },
  {
    date: '2026-06-02',
    description: 'STARBUCKS CAP REFOR ADICIONAL',
    amount: 54.00, category: 'Food & Drink',
    notes: 'Starbucks Capitolio Reforma — tarjeta adicional',
  },

  // ── 03 jun 2026 ───────────────────────────────────────────────────────────
  {
    date: '2026-06-03',
    description: 'HF',
    amount: 1_000.00, category: 'Other',
    notes: 'Cargo HF — referencia corta sin más detalle',
  },
  {
    date: '2026-06-03',
    description: 'STARBUCKS CAP REFOR JUN3',
    amount: 82.00, category: 'Food & Drink',
    notes: 'Starbucks Capitolio Reforma — tarjeta adicional',
  },

  // ── 05 jun 2026 ───────────────────────────────────────────────────────────
  {
    date: '2026-06-05',
    description: 'BK GALERIAS',
    amount: 204.00, category: 'Food & Drink',
    notes: 'Burger King Galerías',
  },
  {
    date: '2026-06-05',
    description: 'APPLE.COM/BILL CUPERTINO CA',
    amount: 209.00, category: 'Subscriptions',
    notes: 'Apple — cobro internacional',
  },
  {
    date: '2026-06-05',
    description: 'BARRIO CHICKEN',
    amount: 94.00, category: 'Food & Drink',
    notes: 'Barrio Chicken',
  },

  // ── 07 jun 2026 ───────────────────────────────────────────────────────────
  {
    date: '2026-06-07',
    description: 'WAL MART TOL METEPEC',
    amount: 219.00, category: 'Groceries',
    notes: 'Walmart Toluca Metepec — tarjeta adicional',
  },
  {
    date: '2026-06-07',
    description: 'WAL MART TOL METEPEC ADICIONAL',
    amount: 25.00, category: 'Groceries',
    notes: 'Walmart Toluca Metepec — tarjeta adicional',
  },
  {
    date: '2026-06-07',
    description: 'OXXOS R E TLC',
    amount: 37.00, category: 'Convenience Store',
    notes: 'OXXO R.E. Toluca — tarjeta adicional',
  },

  // ── 09 jun 2026 ───────────────────────────────────────────────────────────
  {
    date: '2026-06-09',
    description: 'GP GAS SUP SERV NAUMEX',
    amount: 1_000.00, category: 'Fuel',
    notes: 'Gasolinera / GP Gas Sup Serv Naumex',
  },
  {
    date: '2026-06-09',
    description: 'STARBUCKS CAP REFOR JUN9A',
    amount: 82.00, category: 'Food & Drink',
    notes: 'Starbucks Capitolio Reforma — tarjeta adicional (diferente al 02-jun)',
  },
  {
    date: '2026-06-09',
    description: 'STARBUCKS CAP REFOR JUN9B',
    amount: 54.00, category: 'Food & Drink',
    notes: 'Starbucks Capitolio Reforma — tarjeta adicional (diferente al 02-jun)',
  },

  // ── 10 jun 2026 ───────────────────────────────────────────────────────────
  {
    date: '2026-06-10',
    description: 'APPLE.COM/BILL CUPERTINO JUN10',
    amount: 179.00, category: 'Subscriptions',
    notes: 'Apple — cobro internacional',
  },

  // ── 11 jun 2026 ───────────────────────────────────────────────────────────
  {
    date: '2026-06-11',
    description: 'APPLE.COM/BILL CUPERTINO JUN11',
    amount: 117.00, category: 'Subscriptions',
    notes: 'Apple — cobro internacional',
  },
  {
    date: '2026-06-11',
    description: 'OXXO LEONA VICARIO TLC',
    amount: 130.50, category: 'Convenience Store',
    notes: 'OXXO Leona Vicario Toluca',
  },
  {
    date: '2026-06-11',
    description: 'PRODUCTOS OAXAQUENOS Z',
    amount: 40.00, category: 'Food & Drink',
    notes: 'Productos Oaxaqueños — tarjeta adicional',
  },

  // ── 12 jun 2026 — cierre de período ──────────────────────────────────────
  {
    date: '2026-06-12',
    description: 'INTERES SUJETOS A IVA JUN',
    amount: 3_536.24, category: 'Interest',
    notes: 'Intereses sujetos a IVA — período Jun 2026',
  },
  {
    date: '2026-06-12',
    description: 'IVA SOBRE COMISIONES E IN 565',
    amount: 565.80, category: 'Tax',
    notes: 'IVA sobre comisiones e intereses — línea regular',
  },
  {
    date: '2026-06-12',
    description: 'IVA SOBRE COMISIONES E IN 759',
    amount: 759.84, category: 'Tax',
    notes: 'IVA sobre comisiones e intereses — línea paralela',
  },
]

async function main() {
  console.log('🌱  Seeding acc_volaris June-2026 transactions…\n')

  let created = 0
  let skipped = 0

  for (const tx of TRANSACTIONS) {
    const slug = `${tx.date}-${tx.description.replace(/\s+/g, '_').toLowerCase().slice(0, 30)}-${tx.amount}`
    const id   = `txn_volaris_${Buffer.from(slug).toString('base64url').slice(0, 24)}`

    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (existing) {
      console.log(`  ⏭  skip  ${tx.date}  ${tx.description.padEnd(40)} $${tx.amount.toFixed(2)}`)
      skipped++
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

    console.log(`  ↑  add   ${tx.date}  ${tx.description.padEnd(40)} $${tx.amount.toFixed(2)}`)
    created++
  }

  const total = TRANSACTIONS.reduce((s, t) => s + t.amount, 0)
  console.log(`\n  ✅  ${created} created · ${skipped} skipped`)
  console.log(`  Total cargos Jun-2026: $${total.toFixed(2)} MXN`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
