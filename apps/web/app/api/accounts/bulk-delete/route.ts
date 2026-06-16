import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@wallet/db'
import { ok, badRequest, handleError, DEFAULT_TENANT_ID } from '@/lib/api/response'

const BulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(50),
})

// POST /api/accounts/bulk-delete
// Body: { ids: string[] }
// Hard-deletes all transactions then the accounts in a single Prisma transaction.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { ids } = BulkDeleteSchema.parse(body)

    // Verify all accounts belong to this tenant
    const accounts = await prisma.account.findMany({
      where: { id: { in: ids }, tenantId: DEFAULT_TENANT_ID },
      select: { id: true },
    })

    if (accounts.length !== ids.length) {
      return badRequest('One or more accounts not found')
    }

    const confirmedIds = accounts.map((a) => a.id)

    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { accountId: { in: confirmedIds } } }),
      prisma.account.deleteMany({ where: { id: { in: confirmedIds } } }),
    ])

    return ok({ deleted: confirmedIds.length })
  } catch (e) {
    return handleError(e)
  }
}
