import { prisma } from '@wallet/db'
import { Header } from '@/components/layout/Header'
import { BankAccountsTable } from './BankAccountsTable'
import { CreateBankAccountButton } from './CreateBankAccountButton'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

async function getAccounts() {
  const accounts = await prisma.account.findMany({
    where: {
      tenantId: TENANT,
      isActive: true,
      accountType: { in: ['checking', 'savings', 'debit', 'cash'] },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  return accounts.map((a) => ({
    id:          a.id,
    name:        a.name,
    institution: a.institution,
    accountType: a.accountType,
    currency:    a.currency,
    color:       a.color,
    colorEnd:    a.colorEnd,
    logoUrl:     a.logoUrl ?? null,
    actionUrl:   a.actionUrl ?? null,
    lastFour:    a.lastFour ?? null,
    balance:     Number(a.currentBalance),
  }))
}

export default async function BankAccountsPage() {
  const accounts = await getAccounts()

  return (
    <div className="space-y-6">
      <Header title="Bank Accounts" subtitle={`${accounts.length} accounts`} />
      <BankAccountsTable accounts={accounts} />
      <CreateBankAccountButton />
    </div>
  )
}
