/**
 * Syncs acc_volaris (Volaris INVEX Platino *2026) with Estado de Cuenta May-2026.
 *
 * Statement facts:
 *   Period:            14-Apr-2026 → 12-May-2026
 *   Corte:             12-May-2026
 *   Límite de crédito: $173,000 MXN  (main card)
 *   Línea Paralela:    $122,000 MXN  (separate credit line, separate loan entry)
 *   Saldo deudor total: $145,861.94  → stored as initialBalance
 *
 * initialBalance rationale:
 *   We don't have all historical transactions, so we set initialBalance to the
 *   statement's closing balance. The UI computes:
 *     displayBalance = initialBalance + sum(transactions since cutoff)
 *   This lets us hardcode a known balance and add new transactions going forward.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT = 'tenant_portiz'
const ACCOUNT_ID = 'acc_volaris'

// ── Statement closing balance (Saldo Deudor Total) ────────────────────────
const INITIAL_BALANCE = 145_861.94

// ── Transactions from DESGLOSE DE MOVIMIENTOS ─────────────────────────────
// sign: 'debit' = cargo (charge, increases balance owed)
//       'credit' = abono (payment/reversal, decreases balance owed)
// We map to TransactionType:
//   cargo  → 'expense'  (money going out / debt increasing)
//   abono  → 'income'   (payment reducing debt)

type TxRow = {
  date: string          // fecha de operación (YYYY-MM-DD)
  postedDate: string    // fecha de cargo (YYYY-MM-DD)
  description: string
  amount: number        // always positive
  type: 'expense' | 'income'  // expense=cargo, income=abono/payment
  category: string
  notes?: string
}

const TRANSACTIONS: TxRow[] = [
  // ── ABONOS / PAYMENTS (reduce balance) ────────────────────────────────
  {
    date: '2026-04-17', postedDate: '2026-04-17',
    description: 'SU PAGO POR SPEI_T 6985',
    amount: 9_300.00, type: 'income', category: 'Payment',
    notes: 'Pago con SPEI desde cuenta *6985',
  },
  {
    date: '2026-04-22', postedDate: '2026-04-22',
    description: 'REV COMISION POR DISP DE EFECTIVO',
    amount: 3_660.00, type: 'income', category: 'Fee Reversal',
    notes: 'Reverso de comisión por disposición de efectivo',
  },
  {
    date: '2026-04-22', postedDate: '2026-04-22',
    description: 'CREDITO DE IVA',
    amount: 585.60, type: 'income', category: 'Fee Reversal',
    notes: 'Crédito de IVA sobre comisión revertida',
  },

  // ── CARGOS REGULARES (increase balance) ───────────────────────────────
  {
    date: '2026-04-17', postedDate: '2026-04-17',
    description: 'DISPOSICION CREDITO EFECTIVO ATM COMISION',
    amount: 3_660.00, type: 'expense', category: 'Fee',
    notes: 'Comisión por disposición de efectivo (revertida el 22-Abr)',
  },
  {
    date: '2026-04-17', postedDate: '2026-04-17',
    description: 'IVA SOBRE COMISIONES E INTERESES',
    amount: 585.60, type: 'expense', category: 'Tax',
    notes: 'IVA sobre comisión disposición efectivo (revertido el 22-Abr)',
  },
  {
    date: '2026-04-17', postedDate: '2026-04-20',
    description: 'SORIANA968 METEPEC METEPEC',
    amount: 39.00, type: 'expense', category: 'Groceries',
  },
  {
    date: '2026-04-24', postedDate: '2026-04-27',
    description: 'SORIANA968 METEPEC METEPEC',
    amount: 39.00, type: 'expense', category: 'Groceries',
  },
  {
    date: '2026-04-24', postedDate: '2026-04-27',
    description: 'OXXO APOLONIA MEXICO DF',
    amount: 149.50, type: 'expense', category: 'Convenience Store',
  },
  {
    date: '2026-04-28', postedDate: '2026-04-29',
    description: 'SORIANA968 METEPEC METEPEC',
    amount: 39.00, type: 'expense', category: 'Groceries',
  },
  {
    date: '2026-04-28', postedDate: '2026-04-29',
    description: 'F AHORRO TLLP PURISIMA METEPEC',
    amount: 78.00, type: 'expense', category: 'Savings Fund',
  },
  {
    date: '2026-05-02', postedDate: '2026-05-04',
    description: 'NETPAY *FRANGUST METEPEC',
    amount: 110.00, type: 'expense', category: 'Food & Drink',
  },

  // ── CARGOS EN GUATEMALA (foreign currency) ────────────────────────────
  {
    date: '2026-05-10', postedDate: '2026-05-11',
    description: 'SUPER MARKET SHALOM CHIMALTENANGO',
    amount: 34.02, type: 'expense', category: 'Groceries',
    notes: 'GTQ 15.00 @ tipo de cambio 2.27 MXN/GTQ',
  },
  {
    date: '2026-05-10', postedDate: '2026-05-11',
    description: 'POLLO CAMPERO 134 AERO GUATEMALA',
    amount: 154.26, type: 'expense', category: 'Food & Drink',
    notes: 'GTQ 68.00 @ tipo de cambio 2.27 MXN/GTQ',
  },

  // ── INTERESES Y CARGOS DE CIERRE (12-May-2026) ────────────────────────
  {
    date: '2026-05-12', postedDate: '2026-05-12',
    description: 'IVA SOBRE COMISIONES E INTERESES',
    amount: 521.19, type: 'expense', category: 'Tax',
    notes: 'IVA sobre intereses del período 6539',
  },
  {
    date: '2026-05-12', postedDate: '2026-05-12',
    description: 'INTERES NO SUJETOS A IVA 6539',
    amount: 280.59, type: 'expense', category: 'Interest',
    notes: 'Intereses no sujetos a IVA — Línea Paralela',
  },
  {
    date: '2026-05-12', postedDate: '2026-05-12',
    description: 'INTERES SUJETOS A IVA 6539',
    amount: 3_257.41, type: 'expense', category: 'Interest',
    notes: 'Intereses sujetos a IVA — Línea Paralela',
  },

  // ── CARGOS MSI (meses sin intereses, posted al corte) ─────────────────
  {
    date: '2026-04-14', postedDate: '2026-05-12',
    description: 'TRAS MSI MAX PRADERA CONC 03 OF 06',
    amount: 2_750.38, type: 'expense', category: 'Shopping - Installment',
    notes: 'Cuota 3/6 — compra $16,502.27 en Max Pradera Concepción (Feb 2026)',
  },
  {
    date: '2026-04-14', postedDate: '2026-05-12',
    description: 'TRAS MSI LIVERPOOL TOLUCA 04 OF 06',
    amount: 2_333.17, type: 'expense', category: 'Shopping - Installment',
    notes: 'Cuota 4/6 — compra $13,999.00 en Liverpool Toluca (Ene 2026)',
  },
  {
    date: '2026-04-14', postedDate: '2026-05-12',
    description: 'TRAS MSI STR*HERAHAUS MX 06 OF 12',
    amount: 1_853.92, type: 'expense', category: 'Shopping - Installment',
    notes: 'Cuota 6/12 — compra a meses en STR*Herahaus',
  },

  // ── LÍNEA PARALELA DISPOSICIÓN ────────────────────────────────────────
  {
    date: '2026-04-17', postedDate: '2026-04-17',
    description: 'LINEA PARALELA 36%-12M MEXICO CITY',
    amount: 122_000.00, type: 'expense', category: 'Credit Line Disbursement',
    notes: 'Disposición Línea Paralela. 36% anual, 12 meses. Pago mensual $12,256.38. Ver loan_invex_volaris_lp.',
  },

  // ── TARJETA DIGITAL *7924 ─────────────────────────────────────────────
  {
    date: '2026-04-28', postedDate: '2026-04-29',
    description: 'APPLE.COM/BILL CUPERTINO CA',
    amount: 209.00, type: 'expense', category: 'Subscriptions',
    notes: 'Tarjeta digital *7924',
  },
  {
    date: '2026-05-10', postedDate: '2026-05-11',
    description: 'APPLE.COM/BILL CUPERTINO CA',
    amount: 209.00, type: 'expense', category: 'Subscriptions',
    notes: 'Tarjeta digital *7924',
  },
]

async function main() {
  console.log('🌱  Syncing acc_volaris with May-2026 estado de cuenta...\n')

  // ── 1. Update account metadata ─────────────────────────────────────────
  const account = await prisma.account.update({
    where: { id: ACCOUNT_ID },
    data: {
      name:           'Volaris INVEX Platino *2026',
      institution:    'Invex Banco',
      accountType:    'credit_card',
      currency:       'MXN',
      lastFour:       '2026',
      network:        'mastercard',
      creditLimit:    173_000.00,
      initialBalance: INITIAL_BALANCE,
      color:          '#6d28d9',
      colorEnd:       '#a855f7',
      updatedBy:      'agent:import',
    },
  })
  console.log(`  ✓  Updated account: ${account.name}`)
  console.log(`     Límite: $${account.creditLimit} | initialBalance: $${account.initialBalance}\n`)

  // ── 2. Seed transactions ───────────────────────────────────────────────
  let created = 0
  let skipped = 0

  for (const tx of TRANSACTIONS) {
    const date       = new Date(tx.date)
    const postedDate = new Date(tx.postedDate)

    // Deterministic ID: account + date + description + amount
    const slug = `${tx.date}-${tx.description.replace(/\s+/g, '_').toLowerCase().slice(0, 30)}-${tx.amount}`
    const id   = `txn_volaris_${Buffer.from(slug).toString('base64url').slice(0, 24)}`

    const existing = await prisma.transaction.findUnique({ where: { id } })
    if (existing) { skipped++; continue }

    await prisma.transaction.create({
      data: {
        id,
        tenantId:    TENANT,
        accountId:   ACCOUNT_ID,
        date,
        payee:       tx.description,
        amount:      tx.amount,
        refAmount:   tx.amount,     // MXN — already in MXN
        currency:    'MXN',
        refCurrency: 'MXN',
        type:        tx.type,
        paymentType: 'credit_card',
        category:    tx.category,
        categoryRaw: tx.description,
        note:        tx.notes ?? null,
      },
    })

    const sign = tx.type === 'income' ? '  ↓' : '  ↑'
    console.log(`${sign}  ${tx.date}  ${tx.description.padEnd(45)} $${tx.amount.toFixed(2)}`)
    created++
  }

  console.log(`\n  ✅  ${created} transactions created · ${skipped} already existed`)

  // ── 3. Summary ─────────────────────────────────────────────────────────
  const totalCargos  = TRANSACTIONS.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalAbonos  = TRANSACTIONS.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  console.log(`\n  Statement total cargos:  $${totalCargos.toFixed(2)}`)
  console.log(`  Statement total abonos:  $${totalAbonos.toFixed(2)}`)
  console.log(`  initialBalance set to:   $${INITIAL_BALANCE.toFixed(2)}  (Saldo Deudor Total al 12-May-2026)`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
