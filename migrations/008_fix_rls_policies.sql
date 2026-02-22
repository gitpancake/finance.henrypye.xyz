-- Enable RLS and add "Allow all" policies for tables that were missing them
-- Without these, the Supabase JS client (anon key) cannot access the tables

ALTER TABLE finance_family_debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON finance_family_debts FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE finance_pet_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON finance_pet_expenses FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE finance_family_owed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON finance_family_owed FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE finance_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON finance_users FOR ALL TO public USING (true) WITH CHECK (true);
