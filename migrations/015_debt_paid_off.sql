-- Add paid_off flag to debts for settling without deleting
ALTER TABLE finance_debts ADD COLUMN paid_off BOOLEAN NOT NULL DEFAULT false;
