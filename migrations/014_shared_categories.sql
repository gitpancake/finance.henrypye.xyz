-- Shared categories for collaborative expense tracking
CREATE TABLE finance_shared_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES finance_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'CAD' CHECK (currency IN ('CAD', 'USD', 'GBP', 'EUR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_shared_categories_owner ON finance_shared_categories(owner_id);

-- Category sharing (many-to-many: category <-> user)
CREATE TABLE finance_shared_category_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES finance_shared_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES finance_users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, user_id)
);

CREATE INDEX idx_finance_shared_category_members_user ON finance_shared_category_members(user_id);
CREATE INDEX idx_finance_shared_category_members_category ON finance_shared_category_members(category_id);

-- Items within shared categories
CREATE TABLE finance_shared_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES finance_shared_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CAD' CHECK (currency IN ('CAD', 'USD', 'GBP', 'EUR')),
  date TEXT,
  notes TEXT NOT NULL DEFAULT '',
  added_by UUID NOT NULL REFERENCES finance_users(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_shared_items_category ON finance_shared_items(category_id);
