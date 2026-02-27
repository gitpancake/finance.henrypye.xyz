-- Allow GBP-E as a crypto asset type
ALTER TABLE finance_crypto_holdings DROP CONSTRAINT IF EXISTS finance_crypto_holdings_asset_check;
ALTER TABLE finance_crypto_holdings ADD CONSTRAINT finance_crypto_holdings_asset_check CHECK (asset IN ('ETH', 'USDC', 'GBP-E'));
