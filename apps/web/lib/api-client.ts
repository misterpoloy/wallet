// =============================================================================
// API Client — shared types + fetch helpers for client components
// Server components should import prisma directly instead
// =============================================================================

export type ApiCurrency = 'MXN' | 'GTQ' | 'USD'
export type ApiAccountType = 'checking' | 'savings' | 'credit_card' | 'debit' | 'cash'
export type ApiCardNetwork = 'visa' | 'mastercard' | 'amex'
export type ApiTransactionType = 'expense' | 'income' | 'transfer'

// ─── Account ─────────────────────────────────────────────────────────────────

export type ApiAccount = {
  id: string
  tenantId: string
  name: string
  nameRaw: string | null
  institution: string
  accountType: ApiAccountType
  currency: ApiCurrency
  lastFour: string | null
  network: ApiCardNetwork | null
  color: string
  colorEnd: string
  creditLimit: string | null   // Prisma Decimal → string in JSON
  isActive: boolean
  sortOrder: number
  balance: number              // computed by API
  _count?: { transactions: number }
}

// ─── Transaction ─────────────────────────────────────────────────────────────

export type ApiTransaction = {
  id: string
  tenantId: string
  accountId: string
  category: string
  categoryRaw: string
  currency: ApiCurrency
  amount: string    // Prisma Decimal → string
  refAmount: string
  refCurrency: ApiCurrency
  fxRate: string | null
  type: ApiTransactionType
  paymentType: 'debit' | 'credit_card' | 'cash'
  note: string | null
  payee: string | null
  labels: string[]
  date: string
  isTransfer: boolean
  transferGroupId: string | null
  isRecurring: boolean
  recurringId: string | null
  account: {
    id: string
    name: string
    institution: string
    color: string
    colorEnd: string
    currency: ApiCurrency
    lastFour: string | null
    accountType: ApiAccountType
    logoUrl: string | null
  }
}

// ─── Recurring ───────────────────────────────────────────────────────────────

export type ApiRecurring = {
  id: string
  tenantId: string
  accountId: string
  name: string
  category: string
  categoryRaw: string | null
  currency: ApiCurrency
  amount: string
  refAmount: string | null
  frequency: 'daily' | 'weekly' | 'twice_monthly' | 'monthly' | 'quarterly' | 'annual'
  dayOfMonth: number | null
  daysOfMonth: number[]
  isActive: boolean
  nextDueDate: string | null
  notes: string | null
  account: {
    id: string
    name: string
    institution: string
    color: string
    colorEnd: string
    currency: ApiCurrency
  }
  _count: { transactions: number }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type DashboardKpi = {
  bankBalanceMXN: number
  creditUsedMXN: number
  creditLimitMXN: number
  creditRemainingMXN: number
  creditUsagePct: number
  gtqBalance: number
  monthSpendMXN: number
  month: number  // 0-indexed
  year: number
}

export type DashboardData = {
  kpi: DashboardKpi
  accounts: ApiAccount[]
  recentTransactions: ApiTransaction[]
  spendingByCategory: { category: string; total: number }[]
  monthlySeries: { year: number; month: number; total: number }[]
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export type TransactionsPage = {
  transactions: ApiTransaction[]
  pagination: Pagination
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Safely parse a Prisma Decimal (arrives as string) to number */
export function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0
  return typeof v === 'string' ? parseFloat(v) : v
}

/** Base fetch — always hits the same Next.js origin */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: 'no-store', ...init })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err?.error ?? `API ${res.status}`)
  }
  const json = await res.json()
  return json.data as T
}

// ─── API functions (client components) ───────────────────────────────────────

export const api = {
  dashboard: (params: { year?: number; month?: number } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString()
    return apiFetch<DashboardData>(`/api/dashboard${qs ? `?${qs}` : ''}`)
  },

  accounts: (params: { type?: string; currency?: string } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v).map(([k, v]) => [k, v!])
    ).toString()
    return apiFetch<ApiAccount[]>(`/api/accounts${qs ? `?${qs}` : ''}`)
  },

  account: (id: string) => apiFetch<ApiAccount>(`/api/accounts/${id}`),

  transactions: (params: Record<string, string | number | boolean> = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])
    ).toString()
    return apiFetch<TransactionsPage>(`/api/transactions${qs ? `?${qs}` : ''}`)
  },

  transaction: (id: string) =>
    apiFetch<ApiTransaction & { transferPair: ApiTransaction | null; related: ApiTransaction[] }>(
      `/api/transactions/${id}`
    ),

  recurring: (params: { active?: boolean; accountId?: string } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    ).toString()
    return apiFetch<{ recurring: ApiRecurring[]; upcoming: ApiRecurring[]; totalActive: number }>(
      `/api/recurring${qs ? `?${qs}` : ''}`
    )
  },
}
