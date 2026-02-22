-- Add shared_with_user_id to pet expenses for view-only sharing
ALTER TABLE finance_pet_expenses
ADD COLUMN shared_with_user_id UUID REFERENCES finance_users(id) ON DELETE SET NULL;
