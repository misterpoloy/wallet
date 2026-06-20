import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@wallet/db'
import { CreditCardEditForm } from './CreditCardEditForm'
import { DeleteAccountSection } from '@/components/ui/DeleteAccountSection'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

export default async function CreditCardEditPage({ params }: { params: { id: string } }) {
  const card = await prisma.account.findFirst({
    where: { id: params.id, tenantId: TENANT, accountType: 'credit_card' },
  })
  if (!card) notFound()

  const [incAgg, expAgg] = await Promise.all([
    prisma.transaction.aggregate({ where: { accountId: card.id, type: 'income' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { accountId: card.id, type: 'expense' }, _sum: { amount: true } }),
  ])
  const balance = Number(incAgg._sum.amount ?? 0) - Number(expAgg._sum.amount ?? 0)
  const used = Math.abs(Math.min(balance, 0))
  const limit = card.creditLimit ? Number(card.creditLimit) : null

  return (
    <div className="space-y-8 max-w-2xl">
      <Link
        href={`/credit-cards/${card.id}`}
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to {card.name}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">Edit Credit Card</h1>
        <p className="text-sm text-white/40 mt-1">Update name, accent color, credit limit, or adjust balance</p>
      </div>

      <CreditCardEditForm
        account={{
          id: card.id,
          name: card.name,
          institution: card.institution,
          color: card.color,
          colorEnd: card.colorEnd,
          currency: card.currency,
          lastFour: card.lastFour ?? '',
          network: card.network,
          accountType: card.accountType,
          creditLimit: limit,
          balance,
          used,
          logoUrl: card.logoUrl ?? null,
        }}
      />

      <DeleteAccountSection
        accountId={card.id}
        accountName={card.name}
        redirectTo="/credit-cards"
      />
    </div>
  )
}
