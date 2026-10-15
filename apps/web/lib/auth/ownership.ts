// Every id that arrives in a request body is untrusted: it must belong to the caller's tenant
// before it is connected or stored. Missing and foreign ids look the same (404), so callers
// cannot probe other tenants.

import { prisma } from '@wallet/db'
import type { Ctx } from './ctx'

export class NotFoundError extends Error {
  readonly status = 404
}

type Ids = (string | null | undefined)[]

function present(ids: Ids = []): string[] {
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))]
}

export async function assertOwned(
  ctx: Ctx,
  refs: { accounts?: Ids; recurring?: Ids; transactions?: Ids; loans?: Ids; incomeSources?: Ids },
): Promise<void> {
  const tenantId = ctx.tenantId
  const checks: [string, string[], (ids: string[]) => Promise<number>][] = [
    ['Account', present(refs.accounts), (ids) => prisma.account.count({ where: { id: { in: ids }, tenantId } })],
    ['Recurring expense', present(refs.recurring), (ids) => prisma.recurringExpense.count({ where: { id: { in: ids }, tenantId } })],
    ['Transaction', present(refs.transactions), (ids) => prisma.transaction.count({ where: { id: { in: ids }, tenantId } })],
    ['Loan', present(refs.loans), (ids) => prisma.loan.count({ where: { id: { in: ids }, tenantId } })],
    ['Income source', present(refs.incomeSources), (ids) => prisma.incomeSource.count({ where: { id: { in: ids }, tenantId } })],
  ]
  for (const [label, ids, count] of checks) {
    if (ids.length > 0 && (await count(ids)) !== ids.length) throw new NotFoundError(`${label} not found`)
  }
}
