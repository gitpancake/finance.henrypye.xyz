# finance.henrypye.xyz

Personal finance dashboard for tracking accounts, debts, crypto holdings, budgets, and more. Built with Next.js 16, TypeScript, and Supabase.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
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
AUTH_PASSWORD=<dashboard-password>
```

## Features

| Tab | Description |
|-----|-------------|
| **Dashboard** | Net worth overview, asset/debt breakdown, visual bar chart |
| **Accounts** | Bank accounts and credit cards with balances |
| **Debts** | Personal debts (included in total debt calculations) |
| **Family** | Family loans tracking (excluded from total debt) |
| **Crypto** | ETH and USDC holdings with live price conversion |
| **Incoming** | Expected and received money with pending/received status |
| **Budget** | Monthly budget line items (income + expenses) |
| **Annual** | Annual subscriptions with renewal dates |
| **Tax** | Canadian federal + BC provincial tax calculator |
| **Reports** | Financial report generation |

## Multi-Currency Support

Supports CAD, USD, GBP, and EUR with live exchange rate conversion. Display currency is user-selectable via the currency toggle. Crypto prices fetched from CoinGecko.

## Supabase Tables

- `finance_accounts`
- `finance_debts`
- `finance_family_debts`
- `finance_crypto_holdings`
- `finance_incomings`
- `finance_budget_line_items`
- `finance_annual_subscriptions`
