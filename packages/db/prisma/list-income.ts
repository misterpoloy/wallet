import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
p.incomeSource.findMany({ where: { tenantId: process.env.TENANT_ID ?? 'tenant_portiz' } })
  .then((r: any[]) => {
    console.log(JSON.stringify(r.map(s => ({ id: s.id, name: s.name, gross: s.grossAmount?.toString(), net: s.netAmount?.toString() })), null, 2))
  })
  .finally(() => p.$disconnect())
