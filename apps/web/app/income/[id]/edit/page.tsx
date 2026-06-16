import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@wallet/db'
import { EditIncomePageClient } from './EditIncomePageClient'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

export default async function EditIncomePage({ params }: { params: { id: string } }) {
  const [source, accounts] = await Promise.all([
    prisma.incomeSource.findFirst({
      where: { id: params.id, tenantId: TENANT },
      include: { account: { select: { id: true, name: true, institution: true } } },
    }),
    prisma.account.findMany({
      where: { tenantId: TENANT, isActive: true },
      select: { id: true, name: true, institution: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!source) notFound()

  const serialized = {
    ...source,
    grossAmount: Number(source.grossAmount),
    netAmount:   source.netAmount ? Number(source.netAmount) : null,
    startDate:   source.startDate.toISOString(),
    endDate:     source.endDate?.toISOString() ?? null,
    createdAt:   source.createdAt.toISOString(),
    updatedAt:   source.updatedAt.toISOString(),
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/income/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-white">Edit Income Source</h1>
        <p className="text-sm text-white/40 mt-0.5">{source.name}</p>
      </div>

      <EditIncomePageClient source={serialized as any} accounts={accounts} />
    </div>
  )
}
