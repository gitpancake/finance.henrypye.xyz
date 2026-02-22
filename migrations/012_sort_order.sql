-- Add sort_order column to all entity tables for drag-and-drop reordering
ALTER TABLE finance_accounts ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE finance_debts ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE finance_family_debts ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE finance_crypto_holdings ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE finance_incomings ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE finance_budget_line_items ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE finance_annual_subscriptions ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE finance_pet_expenses ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE finance_family_owed ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Backfill with incrementing values per user
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'finance_accounts', 'finance_debts', 'finance_family_debts',
    'finance_crypto_holdings', 'finance_incomings', 'finance_budget_line_items',
    'finance_annual_subscriptions', 'finance_pet_expenses', 'finance_family_owed'
  ] LOOP
    EXECUTE format('
      WITH numbered AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id) - 1 AS rn
        FROM %I
      )
      UPDATE %I SET sort_order = numbered.rn
      FROM numbered WHERE %I.id = numbered.id
    ', tbl, tbl, tbl);
  END LOOP;
END $$;
