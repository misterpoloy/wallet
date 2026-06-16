# Wallet CSV Import — Data Intelligence Report

> Generated from: `wallet_records_2026.csv`  
> Rows: 226 (225 transactions + header) · Jan 3 – Jun 10, 2026  
> Purpose: Inform API schema, seed strategy, and importer design

---

## 1. Accounts Discovered (11 raw → 10 real)

| CSV Name | Institution | Currency | Inferred Type | Txns | Notes |
|---|---|---|---|---|---|
| `BBVA 0270` | BBVA Mexico | MXN | `checking` | 63 | Main debit, primary MXN account |
| `BBVA Crédito` | BBVA Mexico | MXN | `credit_card` | 41 | Credit card, receives payment via transfer |
| `Volaris` | ? (likely debit) | MXN | `debit` | 36 | Daily MX expenses + receives BBVA transfers |
| `Promerica Platinum Dolares` | Promerica GT | USD | `credit_card` | 36 | Storage, subscriptions |
| `Promerica Black Dolares` | Promerica GT | USD | `credit_card` | 8 | Higher-tier, has late fees |
| `BI Dolares` | Banco Industrial GT | USD | `savings` | 10 | Main USD savings, large FX movements |
| `BI Quetzales` | Banco Industrial GT | GTQ | `savings` | 15 | Main GTQ savings |
| `Bi Queztales` | Banco Industrial GT | GTQ | `savings` | 6 | **TYPO** — same account as BI Quetzales |
| `Promerica Platinum Quetzales` | Promerica GT | GTQ | `credit_card` | 4 | Receives transfers, has insurance charge |
| `Promerica Black Quetzales` | Promerica GT | GTQ | `credit_card` | 4 | Small balance movements |
| `Cash Mexico` | — | MXN | `cash` | 3 | Physical cash, receives orphan transfers |

**⚠️ Data quality: `Bi Queztales` is a typo for `BI Quetzales`** — must be normalized during import.  
The importer must use a name-normalization map to merge them into one account.

### Account Type Classification Logic

```
BBVA Crédito, Promerica *, Promerica Black * → credit_card
BBVA 0270, BI Dolares, BI Quetzales          → checking/savings
Volaris                                        → debit (no credit card behavior)
Cash Mexico                                    → cash
```

---

## 2. Transaction Volume & Types

| Type | Count | % |
|---|---|---|
| Expense | 199 | 88% |
| Income | 27 | 12% |
| Transfer* | 43 rows (≈21 pairs + 2 orphans) | — |

*Transfers are flagged with `transfer: true`. They appear as paired rows (Expense + Income) within the same account list, sharing the same exact timestamp and `ref_currency_amount`.

### Currency Distribution (non-transfer)

| Currency | Transactions |
|---|---|
| MXN | 126 |
| USD | 41 |
| GTQ | 16 |

---

## 3. Transfer Pairs — Full Map

Transfers are linked by **exact timestamp + matching `ref_currency_amount`**.

| Date | From Account | → | To Account | Amount | MXN Equiv |
|---|---|---|---|---|---|
| 2026-06-01 | BI Dolares | → | Promerica Platinum Dolares | 2,146 USD | 42,868 MXN |
| 2026-05-28 | BBVA 0270 | → | BI Dolares | 20,000 MXN | 20,000 MXN (FX) |
| 2026-05-28 | BBVA 0270 | → | BI Dolares | 20,000 MXN | 20,000 MXN (FX) |
| 2026-05-16 | BBVA 0270 | → | Volaris | 20,776 MXN | 20,776 MXN |
| 2026-05-16 | BBVA 0270 | → | BBVA Crédito | 11,211.22 MXN | "Pago mínimo" |
| 2026-05-16 | BI Quetzales | → | Promerica Platinum Dolares | 7,560 GTQ | 19,402 MXN (FX) |
| 2026-03-25 | BI Quetzales | → | Promerica Platinum Quetzales | 76 GTQ | 195 MXN |
| 2026-03-25 | BI Dolares | → | BI Quetzales | 1,091 USD | 21,800 MXN (FX) |
| 2026-03-19 | BBVA 0270 | → | Volaris | 9,450 MXN | 9,450 MXN |
| 2026-02-27 | BBVA 0270 | → | BI Dolares | 21,000 MXN | 21,000 MXN (FX) |
| 2026-02-18 | BBVA 0270 | → | Volaris | 10,000 MXN | 10,000 MXN |
| 2026-02-03 | BI Quetzales | → | Promerica Platinum Quetzales | 69 GTQ | 177 MXN |
| 2026-02-03 | BI Quetzales | → | Promerica Black Quetzales | 63 GTQ | 162 MXN |
| 2026-02-03 | BI Dolares | → | BI Quetzales | 2,008 GTQ | 5,154 MXN (FX) |
| 2026-02-03 | BI Dolares | → | Promerica Platinum Dolares | 560 USD | 11,187 MXN |
| 2026-02-03 | BI Quetzales | → | BI Dolares | 1,002 USD | 20,018 MXN (FX) |
| 2026-02-02 | BBVA 0270 | → | BI Quetzales | 7,793 GTQ | 20,000 MXN (FX) |
| 2026-02-02 | BI Dolares | → | BI Quetzales | 9,807 GTQ | 25,170 MXN (FX) |
| 2026-02-02 | BBVA 0270 | → | BI Dolares | 1,251 USD | 25,000 MXN (FX) |
| 2026-01-18 | BBVA 0270 | → | Volaris | 6,700 MXN | 6,700 MXN |

**Orphaned transfers** (no matching pair in CSV — external account not tracked):
- `2026-06-01`: Promerica Black Quetzales +65.26 GTQ (source unknown)
- `2026-02-03`: Cash Mexico +1,000 MXN and +497 MXN (source unknown)

---

## 4. Recurring Transactions (11 Confirmed)

Detected by: same `account + category + amount + currency` appearing ≥3× with consistent day-of-month.

| # | Account | Category | Amt | Currency | Frequency | Day | Identified Service |
|---|---|---|---|---|---|---|---|
| 1 | BBVA 0270 | Insurances | 70 | MXN | **Twice/month** | 9th & 13th | Unknown insurance |
| 2 | Promerica Platinum Dolares | Rent | 33.50 | USD | Monthly | 8th | Bodega (storage unit) |
| 3 | Promerica Platinum Dolares | Software, apps, games | 4.84 | USD | Monthly | 6th | Unknown subscription |
| 4 | Bi Queztales / BI Quetzales | Financial expenses | 30 | GTQ | Monthly | 5th | BI bank charge |
| 5 | Promerica Platinum Dolares | Software, apps, games | 4.11 | USD | Monthly | 3rd | Unknown subscription |
| 6 | Promerica Platinum Dolares | Software, apps, games | 4.29 | USD | Monthly | 23rd | Unknown subscription |
| 7 | BBVA 0270 | Software, apps, games | 150 | MXN | Monthly | 22nd | Unknown subscription |
| 8 | BBVA 0270 | Active sport, fitness | 583.50 | MXN | Monthly | 21st | Gym membership |
| 9 | Promerica Platinum Dolares | TV, Streaming | 5.99 | USD | Monthly | 20th | Disney+ |
| 10 | BBVA 0270 | Vehicle | 15,000 | MXN | Monthly (~16-20th) | Varies ±4d | Car payment (L200) |
| 11 | Volaris | Jewels, accessories | 2,916 | MXN | Monthly (installment) | ~12th | Hera House (noted as "cuota") |

**Detection strategy for importer:**
```
recurring = (occurrences >= 3) AND (same account + category + amount + currency)
           AND (day_of_month variance <= 4 days)
```

---

## 5. Category Taxonomy (34 raw → normalized)

| CSV Raw | Suggested App Category | Count |
|---|---|---|
| Software, apps, games | `Technology` | 38 |
| Vehicle | `Transport` | 15 |
| Financial expenses | `Finance` | 15 |
| Insurances | `Finance` | 13 |
| Restaurant, fast-food | `Dining` | 10 |
| Groceries | `Groceries` | 9 |
| Rent / Housing / Mortgage | `Housing` | 11 |
| Bar, cafe | `Dining` | 6 |
| Active sport, fitness | `Health` | 5 |
| TV, Streaming | `Entertainment` | 5 |
| Electronics, accessories | `Technology` | 5 |
| Alcohol, tobacco | `Dining` | 4 |
| Pets, animals | `Pets` | 4 |
| Clothes & Footwear | `Shopping` | 4 |
| Food & Drinks | `Dining` | 4 |
| Health care, doctor | `Health` | 4 |
| Fuel | `Transport` | 3 |
| Loans, interests | `Finance` | 3 |
| Transportation | `Transport` | 3 |
| Jewels, accessories | `Shopping` | 3 |
| Shopping | `Shopping` | 3 |
| Taxi | `Transport` | 3 |
| Life & Entertainment | `Entertainment` | 2 |
| Taxes | `Finance` | 2 |
| Internet | `Utilities` | 2 |
| Energy, utilities | `Utilities` | 1 |
| Home, garden | `Home` | 1 |
| Holiday, trips, hotels | `Travel` | 1 |
| Wage, invoices | `Income` | 1 |
| Income | `Income` | 1 |
| Charity, gifts | `Gifts` | 1 |
| Communication, PC | `Technology` | 1 |

**Keep `categoryRaw` as a separate column** for lossless round-trip to the original app.

---

## 6. FX Rates (Stable throughout 2026)

The Wallet iOS app appears to use **fixed reference rates**, not daily market rates:

| Pair | Rate | Consistency |
|---|---|---|
| USD → MXN | **19.9762** | Identical across all 2026 transactions |
| GTQ → MXN | **2.5663–2.5664** | ~0.001% variance (rounding only) |
| USD → GTQ | ~7.785 | Implied |

**Implication for API**: Store `ref_currency_amount` as-is from CSV. Optionally store the rate used. Do NOT re-fetch live rates on import (would break idempotency and historical accuracy).

---

## 7. Data Quality Issues & Importer Requirements

| Issue | Severity | Fix |
|---|---|---|
| `Bi Queztales` ≠ `BI Quetzales` (typo) | High | Name normalization map at import time |
| 3 orphaned transfer rows | Medium | Import as `transfer: true, transferPairId: null` |
| Housing category inconsistency (Rent/Housing/Mortgage all = 19,500 MXN) | Medium | `categoryRaw` preserved; normalized to `Housing` |
| `ref_currency_amount` = fixed app rate | Low | Store as-is, document as "app snapshot rate" |
| `payment_type: "Cash"` used for debit card | Low | Means "not credit card"; map to `debit` |
| No account balance in CSV | Medium | Must seed balances separately (manual input or derive) |
| Missing `payee` field (mostly empty) | Low | Use `note` as merchant/description |
| Duplicate AWS charge on 2026-06-03 (same timestamp ±0.2s) | Medium | Dedup on `(account, amount, date-truncated-to-minute)` |

---

## 8. API Schema Recommendations

### Unified Account Model
```typescript
Account {
  id          : uuid
  tenantId    : uuid
  userId      : uuid
  name        : string          // "BBVA 0270", "BI Quetzales"
  nameRaw     : string          // original CSV value before normalization
  institution : string          // "BBVA", "Banco Industrial", "Promerica", "Cash"
  accountType : enum            // checking | savings | credit_card | debit | cash
  currency    : enum            // MXN | GTQ | USD
  creditLimit : decimal?        // credit cards only
  lastFour    : string?         // manually added, not in CSV
  color       : string          // gradient for UI
  isActive    : boolean
  createdAt   : timestamp
}
```

### Transaction Model
```typescript
Transaction {
  id                : uuid
  tenantId          : uuid
  accountId         : uuid       // FK → Account
  category          : enum       // normalized (Technology, Dining, Housing…)
  categoryRaw       : string     // original CSV value
  currency          : enum       // MXN | GTQ | USD
  amount            : decimal    // in original currency
  refAmount         : decimal    // MXN equivalent (from CSV ref_currency_amount)
  refCurrency       : enum       // always MXN for this dataset
  fxRate            : decimal?   // amount → refAmount conversion rate
  type              : enum       // expense | income | transfer
  paymentType       : enum       // debit | credit_card | cash
  note              : string?    // free text from CSV
  payee             : string?    // from labels or manual
  date              : timestamp
  isTransfer        : boolean
  transferGroupId   : uuid?      // links the 2 sides of a transfer pair
  isRecurring       : boolean
  recurringId       : uuid?      // FK → RecurringExpense
  importBatchId     : uuid?      // which CSV import created this
  importedAt        : timestamp
  contentHash       : string     // SHA of (account+date+amount+category) for dedup
}
```

### RecurringExpense Model
```typescript
RecurringExpense {
  id           : uuid
  tenantId     : uuid
  accountId    : uuid
  name         : string          // "Disney+", "Gym", "Bodega Storage"
  category     : enum
  currency     : enum
  amount       : decimal
  frequency    : enum            // monthly | twice_monthly | weekly | annual
  dayOfMonth   : int?            // for monthly (null for twice-monthly)
  daysOfMonth  : int[]?          // for twice-monthly [9, 13]
  isActive     : boolean
  nextDueDate  : date
  detectedFrom : string?         // "csv_import_2026"
}
```

### Import Batch Model
```typescript
ImportBatch {
  id         : uuid
  tenantId   : uuid
  filename   : string
  year       : int
  rowCount   : int
  status     : enum    // pending | processing | done | error
  importedAt : timestamp
  notes      : string?
}
```

---

## 9. Import Pipeline Design

```
CSV File
  │
  ▼
1. Parse & Validate
   - Detect delimiter (semicolon)
   - Validate required columns
   - Parse dates (ISO 8601)
   
  ▼
2. Normalize Accounts
   - Apply name map: "Bi Queztales" → "BI Quetzales"
   - Classify account type from name patterns
   - Create Account records if not exists (upsert by name+currency+tenantId)

  ▼
3. Classify Transactions
   - type: if transfer=true → "transfer" else lowercase CSV type
   - paymentType: "Credit card" → credit_card, "Cash" → debit (if non-cash account)
   - Normalize category (raw → enum)
   - Compute fxRate = refAmount / amount (if currencies differ)

  ▼
4. Link Transfer Pairs
   - Group transfer rows by (exact_timestamp + ref_currency_amount)
   - Assign shared transferGroupId UUID to matched pairs
   - Flag unmatched as orphans (transferGroupId = null)

  ▼
5. Detect Recurring
   - After inserting all transactions, run pattern query:
     GROUP BY (accountId, category, amount, currency)
     HAVING COUNT(*) >= 3 AND stddev(day_of_month) < 5
   - Create RecurringExpense records and backfill recurringId

  ▼
6. Dedup Guard
   - Hash: SHA256(accountId + date.toISO() + amount + category)
   - Skip or flag if contentHash already exists (for re-imports)

  ▼
7. Write ImportBatch record
```

---

## 10. Multi-Year Strategy

For 2025 import (when available), the pipeline must be:
- **Idempotent**: re-running same file produces no duplicates (contentHash guard)
- **Incremental**: new year file upserts new transactions, doesn't touch existing
- **Account continuity**: same account names across years → same Account record (upsert by name+currency+tenantId)
- **Recurring continuity**: re-run recurring detection after each year import; merge with existing RecurringExpense records

Year-over-year FX rates may differ — store `fxRate` per transaction, not globally.

---

## 11. Key Numbers for Seed Data

| Metric | Value |
|---|---|
| Real accounts | 10 (11 raw - 1 typo) |
| Total transactions (2026 YTD) | 226 |
| Transfer pairs | ~21 pairs + 3 orphans |
| Confirmed recurring subscriptions | 11 |
| Date range | Jan 3 – Jun 10, 2026 |
| Currencies | MXN, GTQ, USD |
| USD/MXN rate (app) | 19.9762 |
| GTQ/MXN rate (app) | 2.5663 |
| Largest single transaction | MXN 122,000 (Préstamo INVEX, income) |
| Most active account | BBVA 0270 (63 txns) |
