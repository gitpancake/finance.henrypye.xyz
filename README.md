# finance.henrypye.xyz

Personal finance dashboard for tracking accounts, debts, crypto holdings, budgets, and more. Multi-user with per-user data isolation. Built with Next.js 16, TypeScript, and Supabase.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Auth**: bcryptjs password hashing, cookie-based sessions
- **State**: React Context + useReducer (optimistic updates)
- **Fonts**: Geist Sans / Geist Mono

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
AUTH_USERNAME=<admin-username>
AUTH_PASSWORD=<admin-password>
ANTHROPIC_API_KEY=<your-anthropic-key>  # for AI report generation
```

### Database Setup

Run the SQL migrations in order against your Supabase database:

```bash
psql <connection-string> -f migrations/001_initial_schema.sql
psql <connection-string> -f migrations/002_family_debts.sql
psql <connection-string> -f migrations/003_pet_expenses.sql
psql <connection-string> -f migrations/004_family_owed.sql
psql <connection-string> -f migrations/005_multi_user.sql
```

On first login with the `AUTH_USERNAME`/`AUTH_PASSWORD` credentials, the app auto-creates an admin user and backfills any existing data. After that first login, run:

```bash
psql <connection-string> -f migrations/006_user_id_not_null.sql
```

For a fresh install with no pre-existing data, all 6 migrations can be run in sequence immediately.

## Features

| Tab | Description |
|-----|-------------|
| **Dashboard** | Net worth overview, asset/debt breakdown, visual bar chart |
| **Accounts** | Bank accounts and credit cards with balances |
| **Debts** | Personal debts (included in total debt calculations) |
| **Family** | Family loans tracking (excluded from total debt) |
| **Pet** | Pet expense tracking (excluded from dashboard totals) |
| **Owed** | Money owed to you by family/partner, with payment tracking |
| **Crypto** | ETH and USDC holdings with live price conversion |
| **Incoming** | Expected and received money with pending/received status |
| **Budget** | Monthly budget line items (income + expenses) |
| **Annual** | Annual subscriptions with renewal dates |
| **Tax** | Canadian federal + BC provincial tax calculator |
| **Reports** | AI-powered financial report generation (Anthropic Claude) |
| **Admin** | User management (admin only) |

## Multi-User

Each user has isolated data — they can only see and modify their own financial records. The `AUTH_USERNAME`/`AUTH_PASSWORD` env vars define the initial admin account, which is auto-created on first login.

- Admin users see an "Admin" link in the sidebar to manage users
- Non-admin users are created by admins from the `/admin` page
- Sessions are stored as httpOnly cookies (30-day TTL)

## Multi-Currency Support

Supports CAD, USD, GBP, and EUR with live exchange rate conversion. Display currency is user-selectable via the currency toggle. Crypto prices fetched from CoinGecko.

## Supabase Tables

| Table | Description |
|-------|-------------|
| `finance_users` | User accounts (bcrypt hashed passwords) |
| `finance_accounts` | Bank accounts and credit cards |
| `finance_debts` | Personal debts |
| `finance_family_debts` | Family loans (excluded from totals) |
| `finance_crypto_holdings` | Crypto holdings |
| `finance_incomings` | Expected/received money |
| `finance_budget_line_items` | Monthly budget entries |
| `finance_annual_subscriptions` | Annual subscriptions |
| `finance_pet_expenses` | Pet expenses (excluded from totals) |
| `finance_family_owed` | Money owed to user (excluded from totals) |

All data tables have a `user_id` FK to `finance_users` for per-user isolation. See `migrations/` for the full schema.
