import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@wallet/db'
import { NewTransactionForm } from './NewTransactionForm'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: {
    accountId?: string; type?: string
    amount?: string; category?: string; payee?: string; note?: string; date?: string
  }
}) {
  const accountId = searchParams.accountId
  const initialType = ['expense', 'income', 'transfer'].includes(searchParams.type ?? '')
    ? (searchParams.type as 'expense' | 'income' | 'transfer')
    : 'expense'
  if (!accountId) notFound()

  const [originAccount, allAccounts] = await Promise.all([
    prisma.account.findFirst({
      where: { id: accountId, tenantId: TENANT, isActive: true },
      select: { id: true, name: true, institution: true, color: true, colorEnd: true, currency: true, accountType: true, lastFour: true, logoUrl: true },
    }),
    prisma.account.findMany({
      where: { tenantId: TENANT, isActive: true },
      select: { id: true, name: true, institution: true, color: true, colorEnd: true, currency: true, accountType: true, lastFour: true, logoUrl: true },
      orderBy: [{ accountType: 'asc' }, { name: 'asc' }],
    }),
  ])

  if (!originAccount) notFound()

  // Serialize (currency enum → string)
  const serialize = (a: typeof originAccount) => ({
    id:          a.id,
    name:        a.name,
    institution: a.institution,
    color:       a.color,
    colorEnd:    a.colorEnd,
    currency:    a.currency as string,
    accountType: a.accountType as string,
    lastFour:    a.lastFour,
    logoUrl:     a.logoUrl ?? null,
  })

  const backHref = originAccount.accountType === 'credit_card'
    ? `/credit-cards/${originAccount.id}`
    : `/bank-accounts/${originAccount.id}`

  return (
    <div className="space-y-7 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        {/* Account context */}
        <div className="flex items-center gap-2 text-xs text-white/40 glass px-3 py-1.5 rounded-xl">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: `linear-gradient(135deg, ${originAccount.color}, ${originAccount.colorEnd})` }}
          />
          {originAccount.institution} · {originAccount.name}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">New Transaction</h1>
        <p className="text-sm text-white/40 mt-1">Add an expense, income, or transfer.</p>
      </div>

      <NewTransactionForm
        originAccount={serialize(originAccount)}
        allAccounts={allAccounts.map(serialize)}
        initialType={initialType}
        initialAmount={searchParams.amount}
        initialCategory={searchParams.category}
        initialPayee={searchParams.payee}
        initialNote={searchParams.note}
        initialDate={searchParams.date}
      />
    </div>
  )
}
