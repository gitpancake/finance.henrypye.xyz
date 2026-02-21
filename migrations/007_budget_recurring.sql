-- Add recurring flag to budget line items
-- Non-recurring items are one-off expenses that won't repeat in future months
ALTER TABLE finance_budget_line_items
  ADD COLUMN IF NOT EXISTS recurring BOOLEAN NOT NULL DEFAULT true;
