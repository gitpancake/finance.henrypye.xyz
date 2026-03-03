-- Enable RLS on all finance tables that are missing it.
-- Uses permissive "Allow all" policies (auth is handled at the application level).
-- Matches the pattern from migration 008.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'finance_accounts',
      'finance_debts',
      'finance_crypto_holdings',
      'finance_incomings',
      'finance_budget_line_items',
      'finance_annual_subscriptions',
      'finance_wallet_addresses',
      'finance_shared_categories',
      'finance_shared_category_members',
      'finance_shared_items'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'Allow all'
    ) THEN
      EXECUTE format('CREATE POLICY "Allow all" ON %I FOR ALL TO public USING (true) WITH CHECK (true)', t);
    END IF;
  END LOOP;
END $$;
