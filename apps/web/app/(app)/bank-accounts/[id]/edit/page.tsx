import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@wallet/db'
import { AccountEditForm } from './AccountEditForm'
import { DeleteAccountSection } from '@/components/ui/DeleteAccountSection'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

export default async function BankAccountEditPage({ params }: { params: { id: string } }) {
  const account = await prisma.account.findFirst({
    where: { id: params.id, tenantId: TENANT },
  })
  if (!account) notFound()

  const [incAgg, expAgg] = await Promise.all([
    prisma.transaction.aggregate({ where: { accountId: account.id, type: 'income' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { accountId: account.id, type: 'expense' }, _sum: { amount: true } }),
  ])
  const balance = Number(incAgg._sum.amount ?? 0) - Number(expAgg._sum.amount ?? 0)

  return (
    <div className="space-y-8 max-w-2xl">
      <Link
        href={`/bank-accounts/${account.id}`}
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to {account.name}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">Edit Account</h1>
        <p className="text-sm text-white/40 mt-1">Update name, accent color, or set a current balance</p>
      </div>

      <AccountEditForm
        account={{
          id: account.id,
          name: account.name,
          institution: account.institution,
          color: account.color,
          colorEnd: account.colorEnd,
          currency: account.currency,
          lastFour: account.lastFour ?? '',
          accountType: account.accountType,
          creditLimit: account.creditLimit ? Number(account.creditLimit) : null,
          balance,
          logoUrl: account.logoUrl ?? null,
          actionUrl: account.actionUrl ?? null,
        }}
      />

      <DeleteAccountSection
        accountId={account.id}
        accountName={account.name}
        redirectTo="/bank-accounts"
      />
    </div>
  )
}
