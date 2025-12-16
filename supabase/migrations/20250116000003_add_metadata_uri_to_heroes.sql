-- Add metadata_uri column to heroes table if it doesn't exist
-- This allows us to store the token URI so metadata can be fetched later
-- even if the initial metadata fetch fails during sync

ALTER TABLE heroes
ADD COLUMN IF NOT EXISTS metadata_uri TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_heroes_metadata_uri ON heroes(metadata_uri) WHERE metadata_uri IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN heroes.metadata_uri IS 'The token URI from the NFT contract. Used to fetch metadata when needed.';

