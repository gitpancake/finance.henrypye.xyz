-- Drop the foreign key constraint on account_id for budget line items and annual subscriptions.
-- account_id can now reference either finance_accounts or finance_wallet_addresses,
-- so the FK to finance_accounts alone is too restrictive and causes silent insert failures.

ALTER TABLE finance_budget_line_items
  DROP CONSTRAINT IF EXISTS finance_budget_line_items_account_id_fkey;

ALTER TABLE finance_annual_subscriptions
  DROP CONSTRAINT IF EXISTS finance_annual_subscriptions_account_id_fkey;
