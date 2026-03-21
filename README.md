# finance.henrypye.xyz

Personal finance dashboard for tracking accounts, debts, crypto holdings, budgets, and more. Multi-user with per-user data isolation. Built with Next.js 16, TypeScript, and Supabase.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui + animate-ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Firebase Authentication (identity) + Supabase user profiles
- **State**: React Context + useReducer (optimistic updates)
- **Drag & Drop**: dnd-kit (sortable rows)
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
ANTHROPIC_API_KEY=<your-anthropic-key>           # AI report generation
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<firebase-auth-domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<firebase-project-id>
FIREBASE_ADMIN_PROJECT_ID=<firebase-admin-project-id>
FIREBASE_ADMIN_CLIENT_EMAIL=<firebase-admin-client-email>
FIREBASE_ADMIN_PRIVATE_KEY=<firebase-admin-private-key>
```

### Database Setup

Run the SQL migrations in order against your Supabase database:

```bash
psql <connection-string> -f migrations/001_initial_schema.sql
# ... through ...
psql <connection-string> -f migrations/019_firebase_auth.sql
```

On first login with the `AUTH_USERNAME`/`AUTH_PASSWORD` credentials, the app auto-creates an admin user and backfills any existing data. After that first login, run:

```bash
psql <connection-string> -f migrations/006_user_id_not_null.sql
```

For a fresh install with no pre-existing data, all 19 migrations can be run in sequence immediately.

## Features

| Tab | Description |
|-----|-------------|
| **Dashboard** | Net worth overview, asset/debt breakdown, visual bar chart |
| **Accounts** | Bank accounts and credit cards with balances |
| **Debts** | Personal debts with paid-off tracking |
| **Family** | Family loans tracking (excluded from total debt) |
| **Pet** | Pet expense tracking (excluded from dashboard totals) |
| **Owed** | Money owed to you by family/partner, with payment tracking |
| **Crypto** | ETH, USDC, and GBPe holdings with live price conversion |
| **Incoming** | Expected and received money with pending/received status |
| **Budget** | Monthly budget line items (income + expenses), recurring support |
| **Annual** | Annual subscriptions with renewal dates and account linking |
| **Tax** | Canadian federal + BC provincial tax calculator |
| **Reports** | AI-powered financial report generation (Anthropic Claude) |
| **Shared** | Shared expense categories with other users + receipt uploads |
| **Settings** | Wallet address management for on-chain balance lookups |

## Multi-User

Each user has isolated data — they can only see and modify their own financial records. The `AUTH_USERNAME`/`AUTH_PASSWORD` env vars define the initial admin account, which is auto-created on first login.

- Firebase Authentication handles identity (sign-in/sign-up)
- Supabase stores user profiles linked to Firebase UIDs
- User profiles include display name and avatar (stored in Supabase Storage)
- RLS policies enforce per-user data isolation across all tables
- Sessions are stored as httpOnly cookies (30-day TTL)

## Shared Expenses

Users can create shared expense categories (e.g. groceries, household) and invite other users. Shared items within a category support receipt image uploads with AI-powered date extraction.

## Multi-Currency Support

Supports CAD, USD, GBP, and EUR with live exchange rate conversion. Display currency is user-selectable via the currency toggle. Crypto prices fetched from CoinGecko.

## NFT & Wallet Support

Wallet addresses can be configured in Settings. The app fetches on-chain balances and NFT data from OpenSea for portfolio tracking.

## Supabase Tables

| Table | Description |
|-------|-------------|
| `finance_users` | User accounts (Firebase UID linked) |
| `finance_accounts` | Bank accounts and credit cards |
| `finance_debts` | Personal debts (with paid-off flag) |
| `finance_family_debts` | Family loans (excluded from totals) |
| `finance_crypto_holdings` | Crypto holdings (ETH, USDC, GBPe) |
| `finance_incomings` | Expected/received money |
| `finance_budget_line_items` | Monthly budget entries (with recurring flag) |
| `finance_annual_subscriptions` | Annual subscriptions (with account linking) |
| `finance_pet_expenses` | Pet expenses (excluded from totals) |
| `finance_family_owed` | Money owed to user (excluded from totals) |
| `finance_wallet_addresses` | Wallet addresses for on-chain lookups |
| `finance_shared_categories` | Shared expense categories |
| `finance_shared_category_members` | Category membership |
| `finance_shared_items` | Shared expense items with receipt support |

All data tables have a `user_id` FK to `finance_users` for per-user isolation. RLS is enabled on all tables. See `migrations/` for the full schema.
