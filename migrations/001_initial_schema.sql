-- 001: Core financial data tables
-- Run against a fresh Supabase project to set up the base schema.

CREATE TABLE finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('bank', 'credit_card')),
  currency TEXT NOT NULL CHECK (currency IN ('CAD', 'USD', 'GBP', 'EUR')),
  balance NUMERIC NOT NULL DEFAULT 0,
  is_outgoings_account BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE finance_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creditor TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL CHECK (currency IN ('CAD', 'USD', 'GBP', 'EUR')),
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE finance_crypto_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset TEXT NOT NULL CHECK (asset IN ('ETH', 'USDC')),
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE finance_incomings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL CHECK (currency IN ('CAD', 'USD', 'GBP', 'EUR')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE finance_budget_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL CHECK (currency IN ('CAD', 'USD', 'GBP', 'EUR')),
  category TEXT NOT NULL CHECK (category IN ('income', 'expense')),
  day_of_month SMALLINT CHECK (day_of_month >= 1 AND day_of_month <= 31),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE finance_annual_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL CHECK (currency IN ('CAD', 'USD', 'GBP', 'EUR')),
  next_renewal DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
