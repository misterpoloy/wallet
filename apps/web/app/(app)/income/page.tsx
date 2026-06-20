import { prisma } from '@wallet/db'
import { Header } from '@/components/layout/Header'
import { IncomePageWrapper } from './IncomePageWrapper'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

export default async function IncomePage() {
  const sources = await prisma.incomeSource.findMany({
    where: { tenantId: TENANT },
    include: {
      entries: { orderBy: { period: 'asc' } },
      account: { select: { id: true, name: true, institution: true } },
    },
    orderBy: { startDate: 'desc' },
  })

  const serialized = sources.map((s) => ({
    ...s,
    grossAmount: Number(s.grossAmount),
    netAmount:   s.netAmount ? Number(s.netAmount) : null,
    startDate:   s.startDate.toISOString(),
    endDate:     s.endDate?.toISOString() ?? null,
    createdAt:   s.createdAt.toISOString(),
    updatedAt:   s.updatedAt.toISOString(),
    entries: s.entries.map((e) => ({
      ...e,
      expectedAmount: Number(e.expectedAmount),
      actualAmount:   e.actualAmount ? Number(e.actualAmount) : null,
      receivedAt:     e.receivedAt?.toISOString() ?? null,
      createdAt:      e.createdAt.toISOString(),
      updatedAt:      e.updatedAt.toISOString(),
    })),
  }))

  return (
    <div className="space-y-6">
      <Header title="Income" subtitle={`${sources.length} source${sources.length !== 1 ? 's' : ''}`} />
      <IncomePageWrapper sources={serialized as any} />
    </div>
  )
}
