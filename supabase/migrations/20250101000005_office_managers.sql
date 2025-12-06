-- Office Managers Table Migration
-- Stores Farcaster FID/name data for office managers to persist across page reloads

CREATE TABLE IF NOT EXISTS office_managers (
    wallet_address TEXT PRIMARY KEY,
    farcaster_fid INTEGER,
    username TEXT,
    display_name TEXT,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for FID lookups
CREATE INDEX IF NOT EXISTS idx_office_managers_fid ON office_managers(farcaster_fid);

-- Enable RLS
ALTER TABLE office_managers ENABLE ROW LEVEL SECURITY;

-- Allow public read (needed to display office manager names)
CREATE POLICY "Public read access" ON office_managers FOR SELECT USING (true);

-- Allow authenticated users to update their own data
CREATE POLICY "Users can update own data" ON office_managers FOR UPDATE
    USING (wallet_address = (SELECT wallet_address FROM users WHERE id = auth.uid()));

-- Allow insert for any wallet address (needed when taking office)
CREATE POLICY "Allow insert" ON office_managers FOR INSERT WITH CHECK (true);
