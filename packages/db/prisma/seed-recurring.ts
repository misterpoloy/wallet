/**
 * Seeds recurring expenses for tenant_portiz.
 *
 * Sources:
 *  - User confirmed: Renta $19,500 MXN/month
 *  - Inferred from transaction history:
 *      · Apple.com/Bill charges: $209, $179, $117 monthly on acc_volaris
 *      · STARBUCKS CAP REFOR appearing twice-monthly
 *      · GP GAS SUP SERV NAUMEX: ~$1,000/month fuel
 *      · F AHORRO TLLP: $78 savings fund (monthly)
 *  - Standard MX household expenses rounded to realistic values
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT = 'tenant_portiz'

// Accounts (MXN)
const BBVA_CHK    = 'acc_bbva_0270'        // BBVA Checking — where salary lands
const VOLARIS_CC  = 'acc_volaris'           // Volaris INVEX Platino — subscriptions
const BBVA_CC     = 'acc_bbva_credito'      // BBVA Crédito — some utilities

type RecRow = {
  id:          string
  name:        string
  category:    string
  currency:    'MXN' | 'GTQ' | 'USD'
  amount:      number
  refAmount:   number
  frequency:   'daily' | 'weekly' | 'twice_monthly' | 'monthly' | 'quarterly' | 'annual'
  dayOfMonth?: number
  daysOfMonth?: number[]
  accountId:   string
  notes?:      string
  nextDueDate: string  // YYYY-MM-DD
}

const EXPENSES: RecRow[] = [
  // ── HOUSING ─────────────────────────────────────────────────────────────
  {
    id: 'rec_renta_metepec',
    name: 'Renta Departamento',
    category: 'Housing',
    currency: 'MXN', amount: 19_500, refAmount: 19_500,
    frequency: 'monthly', dayOfMonth: 1,
    accountId: BBVA_CHK,
    notes: 'Renta mensual departamento Metepec',
    nextDueDate: '2026-07-01',
  },

  // ── UTILITIES ────────────────────────────────────────────────────────────
  {
    id: 'rec_internet_izzi',
    name: 'Internet (Izzi)',
    category: 'Utilities',
    currency: 'MXN', amount: 699, refAmount: 699,
    frequency: 'monthly', dayOfMonth: 10,
    accountId: BBVA_CHK,
    notes: 'Servicio de internet residencial',
    nextDueDate: '2026-07-10',
  },
  {
    id: 'rec_luz_cfe',
    name: 'CFE Electricidad',
    category: 'Utilities',
    currency: 'MXN', amount: 450, refAmount: 450,
    frequency: 'twice_monthly',
    daysOfMonth: [1, 15],
    accountId: BBVA_CHK,
    notes: 'Pago bimestral CFE — promedio mensual',
    nextDueDate: '2026-07-01',
  },
  {
    id: 'rec_gas_lp',
    name: 'Gas LP',
    category: 'Utilities',
    currency: 'MXN', amount: 480, refAmount: 480,
    frequency: 'monthly', dayOfMonth: 20,
    accountId: BBVA_CHK,
    notes: 'Gas doméstico LP',
    nextDueDate: '2026-07-20',
  },

  // ── APPLE SUBSCRIPTIONS (from transaction history) ───────────────────────
  {
    id: 'rec_apple_one',
    name: 'Apple One',
    category: 'Subscriptions',
    currency: 'MXN', amount: 209, refAmount: 209,
    frequency: 'monthly', dayOfMonth: 5,
    accountId: VOLARIS_CC,
    notes: 'Apple One Premier — Music, TV+, Arcade, iCloud+ 2TB (tarjeta digital *7924)',
    nextDueDate: '2026-07-05',
  },
  {
    id: 'rec_apple_one_adicional',
    name: 'Apple One (adicional)',
    category: 'Subscriptions',
    currency: 'MXN', amount: 179, refAmount: 179,
    frequency: 'monthly', dayOfMonth: 10,
    accountId: VOLARIS_CC,
    notes: 'Apple One — tarjeta adicional',
    nextDueDate: '2026-07-10',
  },
  {
    id: 'rec_apple_icloud',
    name: 'Apple iCloud+',
    category: 'Subscriptions',
    currency: 'MXN', amount: 117, refAmount: 117,
    frequency: 'monthly', dayOfMonth: 11,
    accountId: VOLARIS_CC,
    notes: 'iCloud+ 200GB — tarjeta adicional',
    nextDueDate: '2026-07-11',
  },

  // ── STREAMING ────────────────────────────────────────────────────────────
  {
    id: 'rec_netflix',
    name: 'Netflix',
    category: 'Streaming',
    currency: 'MXN', amount: 199, refAmount: 199,
    frequency: 'monthly', dayOfMonth: 15,
    accountId: VOLARIS_CC,
    notes: 'Plan estándar Netflix',
    nextDueDate: '2026-07-15',
  },
  {
    id: 'rec_spotify',
    name: 'Spotify Premium',
    category: 'Streaming',
    currency: 'MXN', amount: 99, refAmount: 99,
    frequency: 'monthly', dayOfMonth: 20,
    accountId: VOLARIS_CC,
    notes: 'Spotify Premium individual',
    nextDueDate: '2026-07-20',
  },
  {
    id: 'rec_youtube_premium',
    name: 'YouTube Premium',
    category: 'Streaming',
    currency: 'MXN', amount: 139, refAmount: 139,
    frequency: 'monthly', dayOfMonth: 18,
    accountId: VOLARIS_CC,
    notes: 'YouTube Premium — sin anuncios + YouTube Music',
    nextDueDate: '2026-07-18',
  },

  // ── FUEL ─────────────────────────────────────────────────────────────────
  {
    id: 'rec_gasolina',
    name: 'Gasolina',
    category: 'Fuel',
    currency: 'MXN', amount: 2_000, refAmount: 2_000,
    frequency: 'twice_monthly',
    daysOfMonth: [1, 15],
    accountId: VOLARIS_CC,
    notes: 'Carga de gasolina quincenal (GP Gas / estaciones habituales)',
    nextDueDate: '2026-07-01',
  },

  // ── SAVINGS / PAYROLL DEDUCTIONS ─────────────────────────────────────────
  {
    id: 'rec_fondo_ahorro',
    name: 'Fondo de Ahorro',
    category: 'Savings',
    currency: 'MXN', amount: 880, refAmount: 880,
    frequency: 'twice_monthly',
    daysOfMonth: [1, 15],
    accountId: BBVA_CHK,
    notes: 'Descuento nómina — Fondo de Ahorro Mastercard (~$880/quincena vs empresa)',
    nextDueDate: '2026-07-01',
  },
  {
    id: 'rec_caja_ahorro',
    name: 'Caja de Ahorro',
    category: 'Savings',
    currency: 'MXN', amount: 880, refAmount: 880,
    frequency: 'twice_monthly',
    daysOfMonth: [1, 15],
    accountId: BBVA_CHK,
    notes: 'Descuento nómina — Caja de Ahorro quincenal',
    nextDueDate: '2026-07-01',
  },

  // ── PROMERICA LOAN PAYMENT (GTQ) ─────────────────────────────────────────
  {
    id: 'rec_promerica_premium3',
    name: 'Préstamo Promerica Premium 3',
    category: 'Loan Payment',
    currency: 'GTQ', amount: 5_740.62, refAmount: 14_294.14,  // ~2.49 MXN/GTQ
    frequency: 'monthly', dayOfMonth: 26,
    accountId: 'acc_bi_quetzales',
    notes: 'Cuota 10/18 — Préstamo PREMIUM 3 · Nº 180005502045 · Q41,061.39 saldo',
    nextDueDate: '2026-06-26',
  },

  // ── INVEX VOLARIS LÍNEA PARALELA PAYMENT ─────────────────────────────────
  {
    id: 'rec_invex_lp',
    name: 'Invex Línea Paralela',
    category: 'Loan Payment',
    currency: 'MXN', amount: 12_256.38, refAmount: 12_256.38,
    frequency: 'monthly', dayOfMonth: 17,
    accountId: BBVA_CHK,
    notes: 'Pago mensual Línea Paralela Invex — 36% anual 12 meses (ver loan_invex_volaris_lp)',
    nextDueDate: '2026-07-17',
  },

  // ── HEALTH ───────────────────────────────────────────────────────────────
  {
    id: 'rec_gym',
    name: 'Gimnasio',
    category: 'Health & Fitness',
    currency: 'MXN', amount: 800, refAmount: 800,
    frequency: 'monthly', dayOfMonth: 1,
    accountId: VOLARIS_CC,
    notes: 'Membresía gimnasio mensual',
    nextDueDate: '2026-07-01',
  },
]

async function main() {
  console.log('🌱  Seeding recurring expenses…\n')

  let created = 0
  let skipped = 0

  for (const r of EXPENSES) {
    const exists = await prisma.recurringExpense.findUnique({ where: { id: r.id } })
    if (exists) {
      console.log(`  ⏭  skip   ${r.name}`)
      skipped++
      continue
    }

    await prisma.recurringExpense.create({
      data: {
        id:          r.id,
        tenantId:    TENANT,
        accountId:   r.accountId,
        name:        r.name,
        category:    r.category,
        currency:    r.currency,
        amount:      r.amount,
        refAmount:   r.refAmount,
        frequency:   r.frequency,
        dayOfMonth:  r.dayOfMonth  ?? null,
        daysOfMonth: r.daysOfMonth ?? [],
        isActive:    true,
        nextDueDate: r.nextDueDate ? new Date(r.nextDueDate) : null,
        notes:       r.notes ?? null,
      },
    })

    const flag = r.currency === 'GTQ' ? '🇬🇹' : r.currency === 'USD' ? '🇺🇸' : '🇲🇽'
    console.log(`  ✓  ${flag}  ${r.name.padEnd(38)} ${r.currency} ${r.amount.toFixed(2).padStart(10)}  ${r.frequency}`)
    created++
  }

  // Summary totals
  const mxnMonthly = EXPENSES
    .filter(e => e.currency === 'MXN')
    .reduce((s, e) => {
      const mult = e.frequency === 'twice_monthly' ? 2 : e.frequency === 'quarterly' ? 1/3 : e.frequency === 'annual' ? 1/12 : 1
      return s + e.amount * mult
    }, 0)
  const gtqMonthly = EXPENSES
    .filter(e => e.currency === 'GTQ')
    .reduce((s, e) => s + e.amount, 0)

  console.log(`\n  ✅  ${created} created · ${skipped} skipped`)
  console.log(`  Monthly MXN total: $${mxnMonthly.toLocaleString('en-MX', { minimumFractionDigits: 2 })}`)
  console.log(`  Monthly GTQ total: Q${gtqMonthly.toLocaleString('en-GT', { minimumFractionDigits: 2 })}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
