# finance.henrypye.xyz

Personal finance dashboard. Next.js 16 + TypeScript + Tailwind CSS 4 + Supabase.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
```

## Architecture

### Data Flow

All data uses optimistic updates via React Context:

1. Component dispatches an action (e.g. `ADD_DEBT`)
2. `FinanceContext` reducer updates state immediately
3. `persistAction()` writes to Supabase in the background
4. On mount, `fetchAllData()` loads everything from Supabase

### Key Directories

```
app/                  # Next.js App Router pages
  [section]/page.tsx  # Each tab is a client component page
  api/                # Auth and report API routes
components/           # Reusable UI components
  EditableTable.tsx   # Generic CRUD table (used by most pages)
  Shell.tsx           # Sidebar navigation layout
  SummaryCard.tsx     # Dashboard summary cards
contexts/
  FinanceContext.tsx   # Main state (reducer + Supabase persistence)
  CurrencyContext.tsx  # Exchange rates + conversion helpers
lib/
  types.ts            # All TypeScript interfaces
  constants.ts        # Currencies, tax brackets, nav items, default state
  supabase.ts         # DB client, mapping helpers, CRUD functions
  format.ts           # formatMoney, formatMoneyShort, formatCrypto
  tax.ts              # Canadian tax calculation logic
  currency.ts         # Exchange rate fetching
```

### Adding a New Data Section

Follow this pattern (family debts is a recent example):

1. **Type** (`lib/types.ts`): Add interface, add to `FinanceState`
2. **Constants** (`lib/constants.ts`): Add to `DEFAULT_STATE`, add nav item to `NAV_ITEMS`
3. **Supabase** (`lib/supabase.ts`): Add `toX`/`fromX` mappers, CRUD functions, update `fetchAllData`
4. **Context** (`contexts/FinanceContext.tsx`): Add action types, reducer cases, `persistAction` cases, import new Supabase functions
5. **Page** (`app/[section]/page.tsx`): Create page using `EditableTable` component

### Dashboard Calculations

The dashboard (`app/page.tsx`) calculates:
- **Total Assets** = bank accounts + crypto
- **Total Debts** = credit card balances + personal debts (NOT family debts)
- **Net Debt** = max(0, debts - pending incoming)
- **Net Worth** = assets - net debt

Family debts are intentionally excluded from all dashboard totals.

### Supabase Tables

| Table | Maps to |
|-------|---------|
| `finance_accounts` | `Account` |
| `finance_debts` | `Debt` |
| `finance_family_debts` | `FamilyDebt` |
| `finance_crypto_holdings` | `CryptoHolding` |
| `finance_incomings` | `Incoming` |
| `finance_budget_line_items` | `BudgetLineItem` |
| `finance_annual_subscriptions` | `AnnualSubscription` |

DB uses snake_case, TypeScript uses camelCase. Mapping is handled by `toX`/`fromX` helpers in `supabase.ts`.

### Styling Conventions

- Cards: `rounded-lg border border-zinc-200 bg-white p-5`
- Labels: `text-xs font-semibold text-zinc-700`
- Financial numbers: `font-mono` with `text-positive` / `text-negative`
- Sidebar: `bg-zinc-900` with active state `bg-zinc-800 text-white`
- Tables use the `.sheet` CSS class from `globals.css`

### Currencies

Supported: CAD, USD, GBP, EUR. Crypto: ETH, USDC. Rates fetched on mount and cached in localStorage. Display currency toggleable by user.
