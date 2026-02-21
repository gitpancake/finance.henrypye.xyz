# finance.henrypye.xyz

Personal finance dashboard. Next.js 16 + TypeScript + Tailwind CSS 4 + Supabase.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
```

## Architecture

### Auth Flow

1. User submits username/password to `POST /api/auth`
2. Server looks up user in `finance_users`, compares bcrypt hash
3. On first-ever login (0 users), auto-creates admin from `AUTH_USERNAME`/`AUTH_PASSWORD` env vars and backfills all existing data with that admin's `user_id`
4. Cookie `finance-auth` set to `user:<uuid>` (httpOnly, 30-day TTL)
5. `GET /api/auth` reads cookie, looks up user, returns `{ authenticated, userId, username, isAdmin }`
6. `DELETE /api/auth` clears cookie (logout)

Key files: `lib/auth.ts` (session helpers), `app/api/auth/route.ts` (login/logout/check), `contexts/AuthContext.tsx` (client-side context), `components/AuthGate.tsx` (gate + provider nesting)

### Provider Nesting

`AuthGate` handles provider nesting when authenticated:

```
AuthGate (login gate)
  └─ AuthProvider (user info + logout)
       └─ FinanceProvider (userId prop → scoped data)
            └─ CurrencyProvider (exchange rates)
                 └─ Shell (sidebar nav)
                      └─ {children}
```

`layout.tsx` just renders `<AuthGate>{children}</AuthGate>`.

### Data Flow

All data uses optimistic updates via React Context:

1. Component dispatches an action (e.g. `ADD_DEBT`)
2. `FinanceContext` reducer updates state immediately
3. `persistAction(action, userId)` writes to Supabase in the background
4. On mount, `fetchAllData(userId)` loads everything from Supabase scoped to the user

All Supabase queries include `.eq("user_id", userId)` for data isolation.

### Key Directories

```
app/                  # Next.js App Router pages
  [section]/page.tsx  # Each tab is a client component page
  admin/page.tsx      # Admin user management (admin only)
  api/
    auth/route.ts     # Login, session check, logout
    admin/users/      # Admin CRUD for users
    report/route.ts   # AI report generation (auth-protected)
components/           # Reusable UI components
  EditableTable.tsx   # Generic CRUD table (used by most pages)
  Shell.tsx           # Sidebar nav + user info + logout
  AuthGate.tsx        # Auth gate + provider nesting
  SummaryCard.tsx     # Dashboard summary cards
  CurrencyToggle.tsx  # Currency selector
contexts/
  AuthContext.tsx      # User info + logout (useAuth hook)
  FinanceContext.tsx   # Main state (reducer + Supabase persistence, userId-scoped)
  CurrencyContext.tsx  # Exchange rates + conversion helpers
lib/
  auth.ts             # Server-side session helpers (getSession, setSession, clearSession)
  types.ts            # All TypeScript interfaces
  constants.ts        # Currencies, tax brackets, nav items, default state
  supabase.ts         # DB client, mapping helpers, CRUD functions (all userId-scoped)
  format.ts           # formatMoney, formatMoneyShort, formatCrypto
  tax.ts              # Canadian tax calculation logic
  currency.ts         # Exchange rate fetching
migrations/           # SQL migration files (run in order)
```

### Adding a New Data Section

Follow this pattern:

1. **Type** (`lib/types.ts`): Add interface, add to `FinanceState`
2. **Constants** (`lib/constants.ts`): Add to `DEFAULT_STATE`, add nav item to `NAV_ITEMS`
3. **Supabase** (`lib/supabase.ts`): Add `toX`/`fromX` mappers (include `user_id` in `fromX`), CRUD functions (all accept `userId`), update `fetchAllData`
4. **Context** (`contexts/FinanceContext.tsx`): Add action types, reducer cases, `persistAction` cases
5. **Page** (`app/[section]/page.tsx`): Create page using `EditableTable` component
6. **Migration** (`migrations/`): Add numbered SQL file for the new table (include `user_id UUID REFERENCES finance_users(id)`)

### Dashboard Calculations

The dashboard (`app/page.tsx`) calculates:
- **Total Assets** = bank accounts + crypto
- **Total Debts** = credit card balances + personal debts (NOT family debts)
- **Net Debt** = max(0, debts - pending incoming)
- **Net Worth** = assets - net debt

Family debts, pet expenses, and family owed are intentionally excluded from all dashboard totals.

### Supabase Tables

| Table | Maps to | Notes |
|-------|---------|-------|
| `finance_users` | — | Auth table (bcrypt hashed passwords) |
| `finance_accounts` | `Account` | Bank accounts + credit cards |
| `finance_debts` | `Debt` | Personal debts |
| `finance_family_debts` | `FamilyDebt` | Excluded from dashboard totals |
| `finance_crypto_holdings` | `CryptoHolding` | ETH, USDC |
| `finance_incomings` | `Incoming` | pending/received status |
| `finance_budget_line_items` | `BudgetLineItem` | Grouped by month in app |
| `finance_annual_subscriptions` | `AnnualSubscription` | With renewal dates |
| `finance_pet_expenses` | `PetExpense` | Excluded from dashboard totals |
| `finance_family_owed` | `FamilyOwed` | Tracks amount/paid/remaining |

DB uses snake_case, TypeScript uses camelCase. Mapping is handled by `toX`/`fromX` helpers in `supabase.ts`. All data tables have `user_id` FK for per-user isolation.

### Styling Conventions

- Cards: `rounded-lg border border-zinc-200 bg-white p-5`
- Labels: `text-xs font-semibold text-zinc-700`
- Financial numbers: `font-mono` with `text-positive` / `text-negative`
- Sidebar: `bg-zinc-900` with active state `bg-zinc-800 text-white`
- Tables use the `.sheet` CSS class from `globals.css`

### Currencies

Supported: CAD, USD, GBP, EUR. Crypto: ETH, USDC. Rates fetched on mount and cached in localStorage. Display currency toggleable by user.
