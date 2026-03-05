-- Add firebase_uid column to link finance_users to Firebase Authentication.
-- Drop password_hash column (passwords now managed by Firebase).

ALTER TABLE finance_users ADD COLUMN firebase_uid TEXT UNIQUE;

-- Map existing users to their Firebase UIDs
UPDATE finance_users SET firebase_uid = 'rC7VxhpjmPOT6aO2DfUxZL2I8VD2' WHERE id = '7cfefe25-fa1f-4c38-a66f-c29539c1b7b9'; -- henry
UPDATE finance_users SET firebase_uid = 'hxpDWF1BZJMs3pxWILVxh5rgr7j1' WHERE id = '1acb2f2d-0016-4a06-8fdb-c639c574bacc'; -- zoey

-- Make firebase_uid NOT NULL now that all rows are populated
ALTER TABLE finance_users ALTER COLUMN firebase_uid SET NOT NULL;

-- Drop the password_hash column (no longer needed)
ALTER TABLE finance_users DROP COLUMN password_hash;
