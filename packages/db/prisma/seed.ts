/**
 * Base seed — creates the Portiz tenant and owner user.
 * Safe to re-run (upsert). Does NOT insert transactions (that's the CSV importer).
 */
import { PrismaClient, TenantPlan, MemberRole } from '@prisma/client'
import crypto from 'node:crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 32, 'sha256').toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  console.log('🌱  Seeding base tenant + user...')

  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant_portiz' },
    update: {},
    create: {
      id: 'tenant_portiz',
      name: 'Portiz Family',
      plan: TenantPlan.family,
    },
  })
  console.log(`   ✔ Tenant: ${tenant.name} (${tenant.id})`)

  const user = await prisma.user.upsert({
    where: { email: 'jp@calaps.com' },
    update: { passwordHash: hashPassword('Calaps2115') },
    create: {
      id: 'user_juan',
      email: 'jp@calaps.com',
      name: 'Juan Portiz',
      passwordHash: hashPassword('Calaps2115'),
      avatarColor: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    },
  })
  console.log(`   ✔ User: ${user.name} (${user.email})`)

  await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: MemberRole.owner,
    },
  })
  console.log(`   ✔ Membership: ${user.name} → ${tenant.name} (owner)`)

  // ── Accounts (from CSV analysis) ──────────────────────────────────────────
  const accountDefs = [
    { id: 'acc_bbva_0270',            name: 'BBVA 0270',                    institution: 'BBVA',             accountType: 'checking',    currency: 'MXN', color: '#1d4ed8', colorEnd: '#3b82f6', sortOrder: 1 },
    { id: 'acc_bbva_credito',         name: 'BBVA Crédito',                 institution: 'BBVA',             accountType: 'credit_card', currency: 'MXN', color: '#1d4ed8', colorEnd: '#06b6d4', sortOrder: 2, creditLimit: 80000, network: 'visa' },
    { id: 'acc_volaris',              name: 'Volaris',                       institution: 'Volaris',          accountType: 'debit',       currency: 'MXN', color: '#f59e0b', colorEnd: '#ef4444', sortOrder: 3 },
    { id: 'acc_promerica_plat_usd',   name: 'Promerica Platinum Dolares',   institution: 'Promerica',        accountType: 'credit_card', currency: 'USD', color: '#7c3aed', colorEnd: '#a855f7', sortOrder: 4, creditLimit: 5000 },
    { id: 'acc_promerica_black_usd',  name: 'Promerica Black Dolares',      institution: 'Promerica',        accountType: 'credit_card', currency: 'USD', color: '#111827', colorEnd: '#374151', sortOrder: 5, creditLimit: 10000 },
    { id: 'acc_bi_dolares',           name: 'BI Dolares',                   institution: 'Banco Industrial', accountType: 'savings',     currency: 'USD', color: '#065f46', colorEnd: '#10b981', sortOrder: 6 },
    { id: 'acc_bi_quetzales',         name: 'BI Quetzales',                 institution: 'Banco Industrial', accountType: 'savings',     currency: 'GTQ', color: '#065f46', colorEnd: '#34d399', sortOrder: 7 },
    { id: 'acc_promerica_plat_gtq',   name: 'Promerica Platinum Quetzales', institution: 'Promerica',        accountType: 'credit_card', currency: 'GTQ', color: '#7c3aed', colorEnd: '#c084fc', sortOrder: 8, creditLimit: 20000 },
    { id: 'acc_promerica_black_gtq',  name: 'Promerica Black Quetzales',    institution: 'Promerica',        accountType: 'credit_card', currency: 'GTQ', color: '#111827', colorEnd: '#6b7280', sortOrder: 9, creditLimit: 30000 },
    { id: 'acc_cash_mx',              name: 'Cash Mexico',                  institution: 'Cash',             accountType: 'cash',        currency: 'MXN', color: '#92400e', colorEnd: '#d97706', sortOrder: 10 },
  ]

  for (const acc of accountDefs) {
    await prisma.account.upsert({
      where: { id: acc.id },
      update: {},
      create: {
        id: acc.id,
        tenantId: tenant.id,
        name: acc.name,
        institution: acc.institution,
        accountType: acc.accountType as any,
        currency: acc.currency as any,
        color: acc.color,
        colorEnd: acc.colorEnd,
        creditLimit: (acc as any).creditLimit ?? null,
        sortOrder: acc.sortOrder,
        isActive: true,
      },
    })
    console.log(`   ✔ Account: ${acc.name}`)
  }

  console.log('\n✅  Base seed complete. Run the CSV importer next:\n   yarn workspace @wallet/scripts import --file data/wallet_records_2026.csv\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
