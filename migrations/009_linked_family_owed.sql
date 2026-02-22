-- Link a family owed entry to another platform user's account.
-- When linked, the entry appears as a read-only debt on the debtor's Family Debts page.
ALTER TABLE finance_family_owed
  ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES finance_users(id) ON DELETE SET NULL;
