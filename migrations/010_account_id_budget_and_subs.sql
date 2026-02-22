-- Add optional account FK to budget line items and annual subscriptions.
ALTER TABLE finance_budget_line_items
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL;

ALTER TABLE finance_annual_subscriptions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES finance_accounts(id) ON DELETE SET NULL;
