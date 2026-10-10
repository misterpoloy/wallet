import { createLocalRegistry, readContracts, simulateDebtPayoff, type Registry } from '@mansamusa/core'
import { getCardStatusHandler, getOverviewHandler, listAccountsHandler } from './accounts'
import { getIncomeHandler } from './income'
import { getLoansHandler } from './loans'
import { simulateDebtPayoffHandler } from './payoff'
import { listRecurringHandler } from './recurring'
import { aggregateSpendingHandler, searchTransactionsHandler } from './transactions'

/**
 * Tools the wallet exposes today: the 8 read tools and the payoff simulator.
 * Propose tools join in P6 once AgentProposal exists.
 */
export const walletToolContracts = {
  ...readContracts,
  simulate_debt_payoff: simulateDebtPayoff,
} as const

export function walletRegistry(): Registry {
  return createLocalRegistry(
    walletToolContracts,
    {
      get_overview: getOverviewHandler,
      list_accounts: listAccountsHandler,
      search_transactions: searchTransactionsHandler,
      aggregate_spending: aggregateSpendingHandler,
      get_card_status: getCardStatusHandler,
      get_loans: getLoansHandler,
      get_income: getIncomeHandler,
      list_recurring: listRecurringHandler,
      simulate_debt_payoff: simulateDebtPayoffHandler,
    },
    { onHandlerError: (name, error) => console.error(`[mansa] tool ${name} failed`, error) },
  )
}
