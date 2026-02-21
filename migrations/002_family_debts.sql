-- 002: Family debts table
-- Tracks money lent by family members. Excluded from dashboard debt totals.

CREATE TABLE finance_family_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CAD',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
