import { prisma } from '@wallet/db'
import { Header } from '@/components/layout/Header'
import { LoansPageWrapper } from './LoansPageWrapper'

export const dynamic = 'force-dynamic'
const TENANT = 'tenant_portiz'

export default async function LoansPage() {
  const loans = await prisma.loan.findMany({
    where: { tenantId: TENANT },
    include: { payments: { orderBy: { period: 'asc' } } },
    orderBy: { startDate: 'desc' },
  })

  const serialized = loans.map((l) => ({
    ...l,
    originalAmount: Number(l.originalAmount),
    currentBalance: Number(l.currentBalance),
    interestRate:   Number(l.interestRate),
    monthlyPayment: Number(l.monthlyPayment),
    startDate:      l.startDate.toISOString(),
    endDate:        l.endDate.toISOString(),
    createdAt:      l.createdAt.toISOString(),
    updatedAt:      l.updatedAt.toISOString(),
    payments: l.payments.map((p) => ({
      ...p,
      dueAmount:       Number(p.dueAmount),
      paidAmount:      p.paidAmount ? Number(p.paidAmount) : null,
      principalAmount: p.principalAmount ? Number(p.principalAmount) : null,
      interestAmount:  p.interestAmount ? Number(p.interestAmount) : null,
      dueDate:         p.dueDate.toISOString(),
      paidAt:          p.paidAt?.toISOString() ?? null,
      createdAt:       p.createdAt.toISOString(),
      updatedAt:       p.updatedAt.toISOString(),
    })),
  }))

  return (
    <div className="space-y-6">
      <Header title="Loans & Credits" subtitle={`${loans.length} active loan${loans.length !== 1 ? 's' : ''}`} />
      <LoansPageWrapper loans={serialized as any} />
    </div>
  )
}
