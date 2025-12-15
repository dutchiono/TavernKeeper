-- Add wallet_address column to runs table for hero initialization
ALTER TABLE runs ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Add index for faster lookups by wallet
CREATE INDEX IF NOT EXISTS idx_runs_wallet_address ON runs(wallet_address);

-- Add comment explaining the column
COMMENT ON COLUMN runs.wallet_address IS 'Wallet address of the user who created the run. Used for hero initialization and ownership verification.';

