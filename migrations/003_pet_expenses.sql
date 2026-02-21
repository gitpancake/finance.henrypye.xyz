-- 003: Pet expenses table
-- Tracks spending on pets. Excluded from dashboard totals.

CREATE TABLE finance_pet_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CAD',
  date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
