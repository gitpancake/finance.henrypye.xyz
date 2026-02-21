-- 004: Family owed table
-- Tracks money owed TO the user by family/partner. Excluded from dashboard totals.

CREATE TABLE finance_family_owed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  paid NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  paid_off BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
