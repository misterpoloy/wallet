export type Currency = 'MXN' | 'GTQ' | 'USD' | 'COP' | 'TRY' | 'EGP' | 'EUR'

export interface Money {
  amount: number
  currency: Currency
}

export type CardNetwork = 'visa' | 'mastercard' | 'amex'
export type AccountPermission = 'view' | 'edit'
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'
export type FamilyRole = 'parent' | 'partner' | 'child'
export type TenantPlan = 'personal' | 'family'
export type TransactionType = 'debit' | 'credit'
export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly'
export type BankName = 'BBVA' | 'BI' | 'Banamex' | 'Santander' | 'other'
export type AccountType = 'checking' | 'savings' | 'investment'

export interface Tenant {
  id: string
  name: string
  plan: TenantPlan
  createdAt: string
}

export interface FamilyMember {
  userId: string
  familyRole: FamilyRole
  joinedAt: string
}

export interface User {
  id: string
  tenantId: string
  name: string
  email: string
  role: UserRole
  familyRole?: FamilyRole
  avatarColor: string
  createdAt: string
}

export interface SharedAccess {
  userId: string
  permission: AccountPermission
}

export interface CreditCard {
  id: string
  tenantId: string
  ownerId: string
  name: string
  lastFour: string
  network: CardNetwork
  creditLimit: Money
  usedCredit: Money
  statementDate: number
  dueDate: number
  isShared: boolean
  sharedWith: SharedAccess[]
  gradient: [string, string]
  color: string
}

export interface BankAccount {
  id: string
  tenantId: string
  ownerId: string
  bank: BankName
  country: 'MX' | 'GT' | 'US'
  name: string
  lastFour: string
  balance: Money
  type: AccountType
}

export interface RecurringExpense {
  id: string
  tenantId: string
  name: string
  amount: Money
  frequency: RecurringFrequency
  nextDate: string
  category: string
  recipient?: string
  linkedAccountId?: string
  icon: string
}

export interface Transaction {
  id: string
  accountId: string
  amount: Money
  description: string
  date: string
  category: string
  type: TransactionType
  merchant?: string
}
