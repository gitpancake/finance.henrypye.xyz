-- Wallet addresses for NFT portfolio tracking
CREATE TABLE finance_wallet_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES finance_users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  label TEXT DEFAULT '',
  chain TEXT DEFAULT 'ethereum',
  created_at TIMESTAMPTZ DEFAULT now()
);
