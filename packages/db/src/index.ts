import { PrismaClient } from '@prisma/client'

// Prevent multiple instances in Next.js dev (hot reload)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { Prisma } from '@prisma/client'
export type {
  Account,
  Transaction,
  RecurringExpense,
  ImportBatch,
  Tenant,
  User,
  TenantMember,
} from '@prisma/client'
export {
  Currency,
  AccountType,
  CardNetwork,
  TransactionType,
  PaymentType,
  RecurringFrequency,
  TenantPlan,
  MemberRole,
  ImportStatus,
  // Income
  IncomeType,
  PayFrequency,
  EntryStatus,
  // Loans
  LoanType,
  PaymentStatus,
} from '@prisma/client'
export type {
  IncomeSource,
  IncomeEntry,
  Loan,
  LoanPayment,
} from '@prisma/client'
