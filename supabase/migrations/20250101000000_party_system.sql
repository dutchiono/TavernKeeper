-- Create parties table
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) NOT NULL,
    dungeon_id TEXT,
    status TEXT NOT NULL DEFAULT 'waiting', -- waiting, ready, in_progress, completed, cancelled
    max_members INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create party_members table
CREATE TABLE IF NOT EXISTS party_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    hero_token_id NUMERIC, -- Token ID from contract
    hero_contract_address TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(party_id, hero_token_id, hero_contract_address)
);

-- Create party_invites table
CREATE TABLE IF NOT EXISTS party_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER DEFAULT 10,
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hero_ownership table (cache for on-chain ownership)
CREATE TABLE IF NOT EXISTS hero_ownership (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    token_id NUMERIC NOT NULL,
    contract_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    metadata JSONB, -- Cached metadata
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(token_id, contract_address, chain_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    farcaster_fid INTEGER,
    type TEXT NOT NULL, -- party_invite, party_joined, etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    delivered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS farcaster_fid INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_chain_id INTEGER;

-- Update characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS nft_token_id NUMERIC;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS nft_contract_address TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS metadata_cached JSONB;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS metadata_cached_at TIMESTAMP WITH TIME ZONE;

-- Update runs table
ALTER TABLE runs ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES parties(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_parties_owner ON parties(owner_id);
CREATE INDEX IF NOT EXISTS idx_party_members_party ON party_members(party_id);
CREATE INDEX IF NOT EXISTS idx_party_invites_code ON party_invites(code);
CREATE INDEX IF NOT EXISTS idx_hero_ownership_user ON hero_ownership(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE read = FALSE;

-- Enable RLS
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Basic examples, refine as needed)
CREATE POLICY "Users can view their own parties" ON parties FOR SELECT USING (auth.uid() = owner_id OR id IN (SELECT party_id FROM party_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can create parties" ON parties FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update parties" ON parties FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Public view for invites" ON party_invites FOR SELECT USING (true); -- Needed to validate codes

CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
