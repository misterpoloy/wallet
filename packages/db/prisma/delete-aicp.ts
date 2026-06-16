import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  await p.incomeEntry.deleteMany({ where: { incomeSourceId: 'income_mastercard_aicp' } })
  await p.incomeSource.delete({ where: { id: 'income_mastercard_aicp' } })
  console.log('✅ Deleted AICP bonus source + entries')
}
main().catch(console.error).finally(() => p.$disconnect())
