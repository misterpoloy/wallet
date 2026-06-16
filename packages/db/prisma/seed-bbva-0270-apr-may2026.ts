/**
 * Seeds BBVA Libreton Básico (acc_bbva_0270) transactions from the official statement:
 *   Period  : 17/04/2026 – 16/05/2026
 *   Account : No. 1595165698
 *   Opening : $84,753.05
 *   Closing : $214,327.44
 *   Debits  : $94,097.37 (12 transactions)
 *   Credits : $223,671.76 (4 transactions)
 *
 * Strategy:
 *   - Sets initialBalance = 84,753.05 (balance BEFORE this statement's transactions)
 *   - Upserts all 16 transactions (skips if already exists by ID)
 *   - Verifies computed balance matches $214,327.44 after seeding
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const ACCOUNT_ID = 'acc_bbva_0270'
const TENANT_ID  = 'tenant_portiz'

// ── Transaction list parsed from the PDF ─────────────────────────────────────
const TRANSACTIONS = [
  // ── 17 ABR ───────────────────────────────────────────────────────────────
  {
    id:          'txn_bbva0270_20260417_1',
    date:        new Date('2026-04-17T10:00:00Z'),
    type:        'expense' as const,
    amount:      15_000.00,
    payee:       'Scotiabank – Pago carro',
    category:    'Loan Payment',
    categoryRaw: 'SPEI ENVIADO SCOTIABANK',
    note:        'SPEI enviado – pago de carro. Ref 0066965625 · Juan Ortiz',
    paymentType: 'debit' as const,
  },
  {
    id:          'txn_bbva0270_20260417_2',
    date:        new Date('2026-04-17T10:05:00Z'),
    type:        'expense' as const,
    amount:      8_817.15,
    payee:       'BBVA Tarjeta de Crédito',
    category:    'Payment',
    categoryRaw: 'PAGO TARJETA DE CREDITO',
    note:        'Pago TDC BMOV. Ref 5426079713',
    paymentType: 'credit_card' as const,
  },
  {
    id:          'txn_bbva0270_20260417_3',
    date:        new Date('2026-04-17T10:10:00Z'),
    type:        'expense' as const,
    amount:      9_300.00,
    payee:       'Invex – Pago mínimo tarjeta',
    category:    'Loan Payment',
    categoryRaw: 'SPEI ENVIADO INVEX',
    note:        'SPEI enviado – pago mínimo de tarjeta. Ref 0066981141 · Juan Orti',
    paymentType: 'debit' as const,
  },
  {
    id:          'txn_bbva0270_20260417_4',
    date:        new Date('2026-04-17T10:15:00Z'),
    type:        'expense' as const,
    amount:      3_000.00,
    payee:       'ERDSON RA',
    category:    'Transfers',
    categoryRaw: 'PAGO CUENTA DE TERCERO',
    note:        'Pago cuenta de tercero BNET. Ref 0098430063',
    paymentType: 'debit' as const,
  },
  // ── 20 ABR ───────────────────────────────────────────────────────────────
  {
    id:          'txn_bbva0270_20260420_1',
    date:        new Date('2026-04-20T10:00:00Z'),
    type:        'income' as const,
    amount:      1.00,
    payee:       'Banco Invex – Prueba transferencia',
    category:    'Transfers',
    categoryRaw: 'SPEI RECIBIDO INVEX',
    note:        'SPEI recibido – disposición efectivo por transferencia. Ref 0132665314',
    paymentType: 'debit' as const,
  },
  {
    id:          'txn_bbva0270_20260420_2',
    date:        new Date('2026-04-20T10:05:00Z'),
    type:        'expense' as const,
    amount:      599.00,
    payee:       'Smart Fit',
    category:    'Health',
    categoryRaw: 'LATAMGYM SAPI DE CV',
    note:        'Smart Fit domiciliación. Ref LAT110824BJ4',
    paymentType: 'debit' as const,
  },
  // ── 22 ABR ───────────────────────────────────────────────────────────────
  {
    id:          'txn_bbva0270_20260422_1',
    date:        new Date('2026-04-22T10:00:00Z'),
    type:        'income' as const,
    amount:      122_000.00,
    payee:       'Banco Invex – Disposición crédito',
    category:    'Transfers',
    categoryRaw: 'SPEI RECIBIDO INVEX',
    note:        'Disposición de efectivo por transferencia (crédito Invex). Ref 0143795038',
    paymentType: 'debit' as const,
  },
  {
    id:          'txn_bbva0270_20260422_2',
    date:        new Date('2026-04-22T10:05:00Z'),
    type:        'income' as const,
    amount:      50_000.00,
    payee:       'albo',
    category:    'Transfers',
    categoryRaw: 'SPEI RECIBIDO albo',
    note:        'Transferencia de fondos desde albo. Ref 0145583249',
    paymentType: 'debit' as const,
  },
  // ── 24 ABR ───────────────────────────────────────────────────────────────
  {
    id:          'txn_bbva0270_20260424_1',
    date:        new Date('2026-04-24T10:00:00Z'),
    type:        'expense' as const,
    amount:      20_000.00,
    payee:       'Victor Villarreal Cortés',
    category:    'Transfers',
    categoryRaw: 'SPEI ENVIADO TRANSFER',
    note:        'SPEI enviado. Ref 0053210579',
    paymentType: 'debit' as const,
  },
  // ── 30 ABR ───────────────────────────────────────────────────────────────
  {
    id:          'txn_bbva0270_20260430_1',
    date:        new Date('2026-04-30T10:00:00Z'),
    type:        'income' as const,
    amount:      51_670.76,
    payee:       'Depósito nómina – BMRCASH',
    category:    'Salary',
    categoryRaw: 'DEPOSITO DE TERCERO BMRCASH',
    note:        'Depósito de tercero BMRCASH. Ref REFBNTC00335487',
    paymentType: 'debit' as const,
  },
  {
    id:          'txn_bbva0270_20260430_2',
    date:        new Date('2026-04-30T10:05:00Z'),
    type:        'expense' as const,
    amount:      800.00,
    payee:       'Azteca – Boletos',
    category:    'Entertainment',
    categoryRaw: 'SPEI ENVIADO AZTECA',
    note:        'SPEI enviado boletos a Mario. Ref 0089995780',
    paymentType: 'debit' as const,
  },
  {
    id:          'txn_bbva0270_20260430_3',
    date:        new Date('2026-04-30T10:10:00Z'),
    type:        'expense' as const,
    amount:      800.00,
    payee:       'Retiro sin tarjeta QR',
    category:    'Other',
    categoryRaw: 'RETIRO SIN TARJETA QR',
    note:        'Retiro sin tarjeta QR. Ref ******8185',
    paymentType: 'cash' as const,
  },
  // ── 01 MAY ───────────────────────────────────────────────────────────────
  {
    id:          'txn_bbva0270_20260501_1',
    date:        new Date('2026-05-01T10:00:00Z'),
    type:        'expense' as const,
    amount:      19_500.00,
    payee:       'Gerardo Hernández – Renta Metepec',
    category:    'Rent',
    categoryRaw: 'SPEI ENVIADO AZTECA',
    note:        'SPEI enviado – casa (renta). Ref 0092670184',
    paymentType: 'debit' as const,
  },
  // ── 09 MAY ───────────────────────────────────────────────────────────────
  {
    id:          'txn_bbva0270_20260509_1',
    date:        new Date('2026-05-09T10:00:00Z'),
    type:        'expense' as const,
    amount:      5_000.00,
    payee:       'Compra tableta',
    category:    'Technology',
    categoryRaw: 'PAGO CUENTA DE TERCERO',
    note:        'Pago cuenta de tercero – tableta. Ref 0005508553',
    paymentType: 'debit' as const,
  },
  // ── 11 MAY ───────────────────────────────────────────────────────────────
  {
    id:          'txn_bbva0270_20260511_1',
    date:        new Date('2026-05-11T10:00:00Z'),
    type:        'expense' as const,
    amount:      70.00,
    payee:       'Seguro',
    category:    'Insurance',
    categoryRaw: 'PAGO SEGURO',
    note:        'Pago de seguro. Ref P0141E6A06B8',
    paymentType: 'debit' as const,
  },
  // ── 15 MAY ───────────────────────────────────────────────────────────────
  {
    id:          'txn_bbva0270_20260515_1',
    date:        new Date('2026-05-15T10:00:00Z'),
    type:        'expense' as const,
    amount:      11_211.22,
    payee:       'BBVA Tarjeta de Crédito',
    category:    'Payment',
    categoryRaw: 'PAGO TARJETA DE CREDITO',
    note:        'Pago TDC BMOV. Ref 7870711664',
    paymentType: 'credit_card' as const,
  },
]

async function main() {
  // ── Check current account ─────────────────────────────────────────────────
  const account = await prisma.account.findUnique({
    where: { id: ACCOUNT_ID },
    select: { name: true, currency: true, initialBalance: true },
  })
  if (!account) throw new Error(`Account ${ACCOUNT_ID} not found`)
  console.log(`Account : ${account.name} (${account.currency})`)
  console.log(`Current initialBalance : ${account.initialBalance}`)

  const existing = await prisma.transaction.count({ where: { accountId: ACCOUNT_ID } })
  console.log(`Existing transactions  : ${existing}`)

  // ── Set initialBalance to statement opening balance ───────────────────────
  // $84,753.05 = balance on 17/04/2026 BEFORE the statement's transactions
  await prisma.account.update({
    where: { id: ACCOUNT_ID },
    data: {
      initialBalance: 84_753.05,
      updatedBy: 'agent:import',
    },
  })
  console.log('\nSet initialBalance → $84,753.05 (statement opening balance)\n')

  // ── Upsert transactions ───────────────────────────────────────────────────
  let created = 0
  let skipped = 0

  for (const tx of TRANSACTIONS) {
    const exists = await prisma.transaction.findUnique({ where: { id: tx.id } })
    if (exists) {
      console.log(`SKIP  ${tx.id}  ${tx.payee}`)
      skipped++
      continue
    }
    await prisma.transaction.create({
      data: {
        id:          tx.id,
        tenantId:    TENANT_ID,
        accountId:   ACCOUNT_ID,
        type:        tx.type,
        amount:      tx.amount,
        refAmount:   tx.amount,
        currency:    'MXN',
        payee:       tx.payee,
        category:    tx.category,
        categoryRaw: tx.categoryRaw,
        note:        tx.note,
        date:        tx.date,
        paymentType: tx.paymentType,
        isTransfer:  false,
        labels:      [],
        createdBy:   'agent:import',
        updatedBy:   'agent:import',
      },
    })
    console.log(`CREATE ${tx.id}  ${tx.type === 'income' ? '+ ' : '- '}$${tx.amount.toFixed(2).padStart(12)}  ${tx.payee}`)
    created++
  }

  console.log(`\n── Result ─────────────────────────────────────────`)
  console.log(`Created : ${created}`)
  console.log(`Skipped : ${skipped}`)

  // ── Verify computed balance matches statement closing ─────────────────────
  const [incAgg, expAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { accountId: ACCOUNT_ID, type: 'income',  isTransfer: false },
      _sum:  { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { accountId: ACCOUNT_ID, type: 'expense', isTransfer: false },
      _sum:  { amount: true },
    }),
  ])

  const totalIncome  = Number(incAgg._sum.amount ?? 0)
  const totalExpense = Number(expAgg._sum.amount ?? 0)
  const computed     = 84_753.05 + totalIncome - totalExpense

  console.log(`\n── Balance verification ────────────────────────────`)
  console.log(`initialBalance   : $84,753.05`)
  console.log(`Total income     : +$${totalIncome.toFixed(2)}`)
  console.log(`Total expense    : -$${totalExpense.toFixed(2)}`)
  console.log(`Computed balance :  $${computed.toFixed(2)}`)
  console.log(`Expected (stmt)  :  $214,327.44`)
  const diff = Math.abs(computed - 214_327.44)
  console.log(diff < 0.01 ? '✅ MATCH' : `❌ DIFF: $${diff.toFixed(2)}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
