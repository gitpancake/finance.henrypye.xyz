-- 006: Enforce user_id NOT NULL and add indexes
-- Run AFTER the first admin login has backfilled existing data.
-- On a fresh install with no pre-existing data, this can be run immediately after 005.

ALTER TABLE finance_accounts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE finance_debts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE finance_family_debts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE finance_crypto_holdings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE finance_incomings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE finance_budget_line_items ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE finance_annual_subscriptions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE finance_pet_expenses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE finance_family_owed ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX idx_finance_accounts_user ON finance_accounts(user_id);
CREATE INDEX idx_finance_debts_user ON finance_debts(user_id);
CREATE INDEX idx_finance_family_debts_user ON finance_family_debts(user_id);
CREATE INDEX idx_finance_crypto_user ON finance_crypto_holdings(user_id);
CREATE INDEX idx_finance_incomings_user ON finance_incomings(user_id);
CREATE INDEX idx_finance_budget_user ON finance_budget_line_items(user_id);
CREATE INDEX idx_finance_annual_subs_user ON finance_annual_subscriptions(user_id);
CREATE INDEX idx_finance_pet_expenses_user ON finance_pet_expenses(user_id);
CREATE INDEX idx_finance_family_owed_user ON finance_family_owed(user_id);
