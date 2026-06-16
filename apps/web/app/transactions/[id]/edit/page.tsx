import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@wallet/db'
import { TransactionEditForm } from './TransactionEditForm'
import { toNum } from '@/lib/api-client'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

export default async function TransactionEditPage({ params }: { params: { id: string } }) {
  const tx = await prisma.transaction.findFirst({
    where: { id: params.id, tenantId: TENANT },
    include: { account: { select: { name: true, institution: true, color: true, colorEnd: true } } },
  })
  if (!tx) notFound()

  const serialized = {
    id:       tx.id,
    payee:    tx.payee,
    note:     tx.note,
    amount:   toNum(tx.amount as unknown as string),
    currency: tx.currency as string,
    category: tx.category,
    date:     tx.date.toISOString(),
    type:     tx.type as string,
  }

  return (
    <div className="space-y-7 max-w-2xl">
      <div className="flex items-center justify-between">
        <Link
          href={`/transactions/${tx.id}`}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Transaction
        </Link>
        {/* Account context pill */}
        <div className="flex items-center gap-2 text-xs text-white/40 glass px-3 py-1.5 rounded-xl">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${tx.account.color}, ${tx.account.colorEnd})` }}
          />
          {tx.account.institution} · {tx.account.name}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">Edit Transaction</h1>
        <p className="text-sm text-white/40 mt-1">Update the fields below, then save.</p>
      </div>

      <TransactionEditForm tx={serialized} />
    </div>
  )
}
