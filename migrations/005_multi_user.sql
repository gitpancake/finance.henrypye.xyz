-- 005: Multi-user support
-- Creates the users table and adds user_id FK to all data tables.
-- On first login, the app auto-creates an admin user from AUTH_USERNAME/AUTH_PASSWORD
-- env vars and backfills all existing rows with that admin's user_id.

-- Users table
CREATE TABLE finance_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add user_id column (nullable initially for backfill compatibility)
ALTER TABLE finance_accounts ADD COLUMN user_id UUID REFERENCES finance_users(id);
ALTER TABLE finance_debts ADD COLUMN user_id UUID REFERENCES finance_users(id);
ALTER TABLE finance_family_debts ADD COLUMN user_id UUID REFERENCES finance_users(id);
ALTER TABLE finance_crypto_holdings ADD COLUMN user_id UUID REFERENCES finance_users(id);
ALTER TABLE finance_incomings ADD COLUMN user_id UUID REFERENCES finance_users(id);
ALTER TABLE finance_budget_line_items ADD COLUMN user_id UUID REFERENCES finance_users(id);
ALTER TABLE finance_annual_subscriptions ADD COLUMN user_id UUID REFERENCES finance_users(id);
ALTER TABLE finance_pet_expenses ADD COLUMN user_id UUID REFERENCES finance_users(id);
ALTER TABLE finance_family_owed ADD COLUMN user_id UUID REFERENCES finance_users(id);
