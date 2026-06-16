/**
 * Seeds historical accounts that appear in pre-2025 CSV files.
 * Safe to re-run — uses upsert on known IDs.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT = 'tenant_portiz'

const accounts = [
  {
    id: 'acc_bi_gold_gtq',
    name: 'BI Gold Quetzales',
    institution: 'Banco Industrial',
    accountType: 'checking' as const,
    currency: 'GTQ' as const,
    color: '#065f46',
    colorEnd: '#10b981',
  },
  {
    id: 'acc_cash_usd',
    name: 'Cash USD',
    institution: 'Cash',
    accountType: 'cash' as const,
    currency: 'USD' as const,
    color: '#14532d',
    colorEnd: '#22c55e',
  },
  {
    id: 'acc_cash_cop',
    name: 'Cash Colombia',
    institution: 'Cash',
    accountType: 'cash' as const,
    currency: 'COP' as const,
    color: '#7c2d12',
    colorEnd: '#f97316',
  },
  {
    id: 'acc_cash_try',
    name: 'Cash Turquía',
    institution: 'Cash',
    accountType: 'cash' as const,
    currency: 'TRY' as const,
    color: '#991b1b',
    colorEnd: '#ef4444',
  },
  {
    id: 'acc_cash_egp',
    name: 'Cash Egipto',
    institution: 'Cash',
    accountType: 'cash' as const,
    currency: 'EGP' as const,
    color: '#78350f',
    colorEnd: '#f59e0b',
  },
  {
    id: 'acc_cash_eur',
    name: 'Cash Euro',
    institution: 'Cash',
    accountType: 'cash' as const,
    currency: 'EUR' as const,
    color: '#1e3a5f',
    colorEnd: '#3b82f6',
  },
  {
    id: 'acc_cash_gtq',
    name: 'Cash Quetzales',
    institution: 'Cash',
    accountType: 'cash' as const,
    currency: 'GTQ' as const,
    color: '#064e3b',
    colorEnd: '#34d399',
  },
]

async function main() {
  console.log('🌱  Seeding historical accounts…\n')
  for (const acc of accounts) {
    await prisma.account.upsert({
      where: { id: acc.id },
      create: { ...acc, tenantId: TENANT, createdBy: 'agent:import' },
      update: {},  // never overwrite existing data
    })
    console.log(`  ✓  ${acc.id}  (${acc.name} · ${acc.currency})`)
  }
  console.log('\n✅  Done!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
