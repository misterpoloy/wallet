/**
 * CSV Transaction Importer
 * ========================
 * Imports wallet_records_*.csv into Neon DB.
 * Safe to re-run — uses contentHash for idempotency.
 *
 * Usage:
 *   yarn db:import --file ../../data/wallet_records_2026.csv
 *   yarn db:import --file ../../data/wallet_records_2026.csv --dry-run
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { randomUUID } from 'crypto'
import { PrismaClient, ImportStatus } from '@prisma/client'

const prisma = new PrismaClient()

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const fileArg = args.find((a) => a.startsWith('--file='))?.split('=')[1]
  ?? args[args.indexOf('--file') + 1]
const DRY_RUN = args.includes('--dry-run')
const TENANT = 'tenant_portiz'

if (!fileArg) {
  console.error('❌  Usage: ts-node prisma/import.ts --file <path-to-csv> [--dry-run]')
  process.exit(1)
}

const csvPath = path.resolve(process.cwd(), fileArg)
if (!fs.existsSync(csvPath)) {
  console.error(`❌  File not found: ${csvPath}`)
  process.exit(1)
}

// Infer year from filename (e.g. wallet_records_2026.csv) or default to current year
const yearMatch = path.basename(csvPath).match(/(\d{4})/)
const FILE_YEAR = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear()

// ─── Account name → DB id map ─────────────────────────────────────────────────

const ACCOUNT_MAP: Record<string, string> = {
  // ── Core accounts (all years) ──────────────────────────────────────────────
  'BBVA 0270':                    'acc_bbva_0270',
  'BBVA Crédito':                 'acc_bbva_credito',
  'Volaris':                      'acc_volaris',
  'Promerica Platinum Dolares':   'acc_promerica_plat_usd',
  'Promerica Black Dolares':      'acc_promerica_black_usd',
  'BI Dolares':                   'acc_bi_dolares',
  'BI Quetzales':                 'acc_bi_quetzales',
  'Bi Queztales':                 'acc_bi_quetzales',       // typo variant
  'Promerica Platinum Quetzales': 'acc_promerica_plat_gtq',
  'Promerica Black Quetzales':    'acc_promerica_black_gtq',
  'Cash Mexico':                  'acc_cash_mx',
  // ── Historical accounts (pre-2025) ────────────────────────────────────────
  'BI Gold quetzales':            'acc_bi_gold_gtq',
  'Chash USD':                    'acc_cash_usd',           // typo of "Cash USD"
  'My Account':                   'acc_cash_cop',           // Colombia travel cash (COP)
  'Lira Turca':                   'acc_cash_try',           // Turkey travel cash (TRY)
  'Cash Egipto':                  'acc_cash_egp',           // Egypt travel cash (EGP)
  'Cash Euro':                    'acc_cash_eur',           // Euro travel cash (EUR)
  'Cash quetzales':               'acc_cash_gtq',           // GTQ cash (not a bank account)
}

// ─── Category normalisation ───────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  'Vehicle':                  'Transport',
  'Fuel':                     'Transport',
  'Transportation':           'Transport',
  'Taxi':                     'Transport',
  'Groceries':                'Groceries',
  'Restaurant, fast-food':    'Dining',
  'Bar, cafe':                'Dining',
  'Food & Drinks':            'Dining',
  'Dining':                   'Dining',
  'Software, apps, games':    'Technology',
  'Communication, PC':        'Technology',
  'Internet':                 'Utilities',
  'Energy, utilities':        'Utilities',
  'Utilities':                'Utilities',
  'TV, Streaming':            'Entertainment',
  'Life & Entertainment':     'Entertainment',
  'Active sport, fitness':    'Health',
  'Health care, doctor':      'Health',
  'Health':                   'Health',
  'Rent':                     'Housing',
  'Housing':                  'Housing',
  'Home, garden':             'Housing',
  'Mortgage':                 'Housing',
  'Shopping':                 'Shopping',
  'Electronics, accessories': 'Shopping',
  'Clothes & Footwear':       'Shopping',
  'Jewels, accessories':      'Shopping',
  'Pets, animals':            'Pets',
  'Pets':                     'Pets',
  'Financial expenses':       'Finance',
  'Insurances':               'Finance',
  'Loans, interests':         'Finance',
  'Taxes':                    'Finance',
  'Finance':                  'Finance',
  'Charity, gifts':           'Gifts',
  'Gifts':                    'Gifts',
  'Holiday, trips, hotels':   'Travel',
  'Travel':                   'Travel',
  'Income':                   'Income',
  'Wage, invoices':           'Income',
  'Transfer, withdraw':       'Transfer',
  'Transfer':                 'Transfer',
  'Alcohol, tobacco':         'Entertainment',
}

function normalizeCategory(raw: string): string {
  return CATEGORY_MAP[raw] ?? raw
}

// ─── Payment type normalisation ───────────────────────────────────────────────

function normalizePaymentType(raw: string): 'cash' | 'credit_card' | 'debit' {
  const lower = raw.toLowerCase()
  if (lower === 'credit card' || lower === 'credit_card') return 'credit_card'
  if (lower === 'debit') return 'debit'
  return 'cash'
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────

interface CsvRow {
  account: string
  category: string
  currency: string
  amount: number
  refAmount: number
  type: 'Expense' | 'Income'
  paymentType: string
  note: string
  date: string
  transfer: boolean
  payee: string
  labels: string
  // computed
  contentHash: string
  lineNum: number
}

function parseCSV(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter((l) => l.trim())
  const rows: CsvRow[] = []
  const header = lines[0]

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].trim()
    if (!raw) continue

    const parts = raw.split(';')
    if (parts.length < 11) {
      console.warn(`  ⚠  Line ${i + 1}: too few columns (${parts.length}), skipping`)
      continue
    }

    const [account, category, currency, amountStr, refAmountStr, type, paymentType, note, date, transferStr, payee, labels = ''] = parts

    const contentHash = crypto.createHash('sha256')
      .update(`${account}|${category}|${currency}|${amountStr}|${refAmountStr}|${type}|${date}|${note}|${payee}`)
      .digest('hex')

    rows.push({
      account: account.trim(),
      category: category.trim(),
      currency: currency.trim(),
      amount: parseFloat(amountStr),
      refAmount: parseFloat(refAmountStr),
      type: type.trim() as 'Expense' | 'Income',
      paymentType: paymentType.trim(),
      note: note.trim(),
      date: date.trim(),
      transfer: transferStr.trim().toLowerCase() === 'true',
      payee: payee.trim(),
      labels: labels.trim(),
      contentHash,
      lineNum: i + 1,
    })
  }

  return rows
}

// ─── Transfer pair matching ───────────────────────────────────────────────────
// Two rows form a pair when they share: exact date + ref_currency_amount + transfer=true
// One must be Income (destination), one Expense (source).
// Unmatched transfers are imported as orphans (no transferGroupId).

function buildTransferGroups(rows: CsvRow[]): Map<string, string> {
  // hash → transferGroupId
  const groupMap = new Map<string, string>()

  const transfers = rows.filter((r) => r.transfer)

  // Key: date + '|' + refAmount
  const byKey = new Map<string, CsvRow[]>()
  for (const row of transfers) {
    const key = `${row.date}|${row.refAmount}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(row)
  }

  let paired = 0
  let orphaned = 0

  for (const [, group] of byKey) {
    const incomes  = group.filter((r) => r.type === 'Income')
    const expenses = group.filter((r) => r.type === 'Expense')

    if (incomes.length >= 1 && expenses.length >= 1) {
      // Pair them up 1-to-1; any extras are matched greedily
      const count = Math.min(incomes.length, expenses.length)
      for (let i = 0; i < count; i++) {
        const gid = randomUUID()
        groupMap.set(incomes[i].contentHash, gid)
        groupMap.set(expenses[i].contentHash, gid)
        paired += 2
      }
      // Remaining unmatched in the group → orphans
      const leftover = [...incomes.slice(count), ...expenses.slice(count)]
      for (const r of leftover) {
        orphaned++
        console.warn(`  ⚠  Orphan transfer line ${r.lineNum}: ${r.account} ${r.type} ${r.amount} ${r.currency}`)
      }
    } else {
      // All orphans
      for (const r of group) {
        orphaned++
        console.warn(`  ⚠  Orphan transfer line ${r.lineNum}: ${r.account} ${r.type} ${r.amount} ${r.currency}`)
      }
    }
  }

  console.log(`\n📦  Transfer pairs: ${paired / 2} pairs matched, ${orphaned} orphans`)
  return groupMap
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📂  Importing: ${path.basename(csvPath)}`)
  console.log(`    Tenant:  ${TENANT}`)
  console.log(`    Dry run: ${DRY_RUN}\n`)

  const rows = parseCSV(csvPath)
  console.log(`📄  Parsed ${rows.length} rows from CSV`)

  // Validate all accounts are known
  const unknownAccounts = new Set<string>()
  for (const row of rows) {
    if (!ACCOUNT_MAP[row.account]) unknownAccounts.add(row.account)
  }
  if (unknownAccounts.size > 0) {
    console.error(`\n❌  Unknown account names — add them to ACCOUNT_MAP:`)
    for (const a of unknownAccounts) console.error(`     "${a}"`)
    process.exit(1)
  }

  // Fetch existing content hashes (idempotency)
  const existingHashes = new Set(
    (await prisma.transaction.findMany({
      where: { tenantId: TENANT, contentHash: { not: null } },
      select: { contentHash: true },
    })).map((r) => r.contentHash!)
  )
  console.log(`🗄   Already in DB: ${existingHashes.size} transactions with content hashes`)

  const newRows = rows.filter((r) => !existingHashes.has(r.contentHash))
  const skipped = rows.length - newRows.length
  console.log(`✅   New to import: ${newRows.length}  (${skipped} already imported, skipped)`)

  if (newRows.length === 0) {
    console.log('\n🎉  Nothing to do — all records already in DB.')
    return
  }

  // Build transfer group IDs (only for new rows — orphan detection still reads all)
  const groupMap = buildTransferGroups(rows) // pass all so pairs across batches work

  // Create an import batch record
  const batchId = DRY_RUN ? 'dry-run' : (await prisma.importBatch.create({
    data: {
      tenantId: TENANT,
      filename: path.basename(csvPath),
      year: FILE_YEAR,
      rowCount: newRows.length,
      status: ImportStatus.processing,
    },
  })).id

  console.log(`\n🚀  Starting import batch ${batchId}...\n`)

  // Stats
  let imported = 0
  let errored = 0
  const statsByAccount: Record<string, number> = {}
  const statsByType = { expense: 0, income: 0, transfer: 0 }

  for (const row of newRows) {
    const accountId = ACCOUNT_MAP[row.account]
    const categoryRaw = row.category
    const category = normalizeCategory(categoryRaw)
    const paymentType = normalizePaymentType(row.paymentType)
    const transferGroupId = groupMap.get(row.contentHash) ?? null

    // Determine transaction type
    let type: 'expense' | 'income' | 'transfer'
    if (row.transfer) {
      type = 'transfer'
    } else if (row.type === 'Expense') {
      type = 'expense'
    } else {
      type = 'income'
    }

    // FX rate (amount → refAmount)
    const fxRate = row.currency !== 'MXN' && row.amount > 0
      ? row.refAmount / row.amount
      : null

    // Labels: from the `labels` column (e.g. "Disney")
    const labels = row.labels ? row.labels.split(',').map((l) => l.trim()).filter(Boolean) : []

    if (DRY_RUN) {
      console.log(`  [DRY] line ${row.lineNum.toString().padStart(3)}: ${type.padEnd(8)} ${row.currency} ${row.amount.toFixed(2).padStart(10)} | ${row.account.padEnd(30)} | ${categoryRaw} → ${category}${transferGroupId ? ' [PAIRED]' : row.transfer ? ' [ORPHAN]' : ''}`)
      imported++
    } else {
      try {
        await prisma.transaction.create({
          data: {
            tenantId: TENANT,
            accountId,
            type,
            paymentType,
            currency: row.currency as any,
            amount: row.amount,
            refAmount: row.refAmount,
            refCurrency: 'MXN',
            fxRate: fxRate ?? undefined,
            category,
            categoryRaw,
            note: row.note || null,
            payee: row.payee || null,
            labels,
            date: new Date(row.date),
            isTransfer: row.transfer,
            transferGroupId,
            isRecurring: false,
            importBatchId: batchId,
            contentHash: row.contentHash,
            createdBy: 'agent:import',
            updatedBy: 'agent:import',
          },
        })
        imported++
      } catch (e: any) {
        errored++
        console.error(`  ❌  line ${row.lineNum}: ${e.message}`)
      }
    }

    statsByAccount[row.account] = (statsByAccount[row.account] ?? 0) + 1
    statsByType[type]++
  }

  // Finalise batch
  if (!DRY_RUN && batchId !== 'dry-run') {
    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: errored > 0 ? ImportStatus.error : ImportStatus.done,
        importedRows: imported,
        skippedRows: skipped,
      },
    })
  }

  // ── Summary ──────────────────────────────────────────────────────────────────

  console.log('\n' + '─'.repeat(60))
  console.log(`\n📊  IMPORT SUMMARY${DRY_RUN ? ' (DRY RUN — nothing written)' : ''}`)
  console.log(`\n   Total in CSV:    ${rows.length}`)
  console.log(`   Already in DB:   ${skipped}`)
  console.log(`   Imported:        ${imported}`)
  if (errored > 0) console.log(`   Errors:          ${errored}  ← check logs above`)

  console.log('\n   By type:')
  console.log(`     expenses   ${statsByType.expense}`)
  console.log(`     incomes    ${statsByType.income}`)
  console.log(`     transfers  ${statsByType.transfer}`)

  console.log('\n   By account:')
  for (const [acc, count] of Object.entries(statsByAccount).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${acc.padEnd(35)} ${count}`)
  }

  console.log('\n' + '─'.repeat(60))
  if (errored === 0) {
    console.log('\n✅  Import complete!\n')
  } else {
    console.log(`\n⚠️   Import finished with ${errored} error(s). Re-run to retry.\n`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
