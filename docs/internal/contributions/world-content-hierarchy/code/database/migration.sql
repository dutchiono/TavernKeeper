-- World Content Hierarchy Migration
-- Creates tables for world content, provenance, and lore
-- This migration should be named: YYYYMMDDHHMMSS_world_content.sql

-- World content table - base elements
CREATE TABLE IF NOT EXISTS world_content (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('world', 'region', 'location', 'dungeon', 'room', 'encounter', 'item', 'boss', 'creature', 'civilization', 'event')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  parent_id TEXT REFERENCES world_content(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL, -- In-world creation time
  discovered_at TIMESTAMPTZ NOT NULL, -- When discovered by players
  metadata JSONB,
  created_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Provenance table - tracks origin and history
CREATE TABLE IF NOT EXISTS provenance (
  content_id TEXT PRIMARY KEY REFERENCES world_content(id) ON DELETE CASCADE,
  origin_id TEXT REFERENCES world_content(id) ON DELETE SET NULL,
  creator_id TEXT, -- References civilization or entity
  creation_method TEXT NOT NULL CHECK (creation_method IN ('built', 'forged', 'born', 'discovered', 'created', 'formed', 'conquered', 'founded', 'crafted', 'summoned', 'evolved')),
  creation_time TIMESTAMPTZ,
  age INTEGER, -- Calculated age in years
  materials TEXT[], -- For items
  location TEXT, -- Where created/found
  created_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Historical events table - events in an element's history
CREATE TABLE IF NOT EXISTS historical_events (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES world_content(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL, -- In-world time
  type TEXT NOT NULL CHECK (type IN ('creation', 'discovery', 'conquest', 'destruction', 'modification', 'transfer', 'significant')),
  description TEXT NOT NULL,
  actors TEXT[], -- IDs of entities involved
  related_content_ids TEXT[], -- Related world content IDs
  created_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Lore table - stories and significance
CREATE TABLE IF NOT EXISTS lore (
  content_id TEXT PRIMARY KEY REFERENCES world_content(id) ON DELETE CASCADE,
  story TEXT NOT NULL,
  significance TEXT NOT NULL,
  cultural_context TEXT,
  enriched_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Content connections table - relationships between elements
CREATE TABLE IF NOT EXISTS content_connections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  source_id TEXT NOT NULL REFERENCES world_content(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES world_content(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('built_by', 'contains', 'located_in', 'created_by', 'owned_by', 'defeated_by', 'discovered_in', 'related_to', 'influenced_by', 'conflicts_with', 'allied_with')),
  strength TEXT NOT NULL CHECK (strength IN ('weak', 'moderate', 'strong')),
  description TEXT NOT NULL,
  created_timestamp TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, target_id, relationship)
);

-- Civilizations table - creator entities
CREATE TABLE IF NOT EXISTS civilizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('civilization', 'tribe', 'organization', 'individual', 'entity')),
  era TEXT,
  region TEXT,
  characteristics TEXT[],
  known_for TEXT[],
  active_period_start TIMESTAMPTZ,
  active_period_end TIMESTAMPTZ, -- NULL if still active
  created_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_world_content_type ON world_content(type);
CREATE INDEX IF NOT EXISTS idx_world_content_parent_id ON world_content(parent_id);
CREATE INDEX IF NOT EXISTS idx_world_content_created_at ON world_content(created_at);
CREATE INDEX IF NOT EXISTS idx_world_content_discovered_at ON world_content(discovered_at);

CREATE INDEX IF NOT EXISTS idx_provenance_origin_id ON provenance(origin_id);
CREATE INDEX IF NOT EXISTS idx_provenance_creator_id ON provenance(creator_id);
CREATE INDEX IF NOT EXISTS idx_provenance_creation_time ON provenance(creation_time);

CREATE INDEX IF NOT EXISTS idx_historical_events_content_id ON historical_events(content_id);
CREATE INDEX IF NOT EXISTS idx_historical_events_timestamp ON historical_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_historical_events_type ON historical_events(type);

CREATE INDEX IF NOT EXISTS idx_lore_enriched_at ON lore(enriched_at);
CREATE INDEX IF NOT EXISTS idx_lore_version ON lore(version);

CREATE INDEX IF NOT EXISTS idx_content_connections_source_id ON content_connections(source_id);
CREATE INDEX IF NOT EXISTS idx_content_connections_target_id ON content_connections(target_id);
CREATE INDEX IF NOT EXISTS idx_content_connections_relationship ON content_connections(relationship);

CREATE INDEX IF NOT EXISTS idx_civilizations_type ON civilizations(type);
CREATE INDEX IF NOT EXISTS idx_civilizations_era ON civilizations(era);
CREATE INDEX IF NOT EXISTS idx_civilizations_region ON civilizations(region);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_world_content_type_parent ON world_content(type, parent_id);
CREATE INDEX IF NOT EXISTS idx_content_connections_source_relationship ON content_connections(source_id, relationship);
CREATE INDEX IF NOT EXISTS idx_content_connections_target_relationship ON content_connections(target_id, relationship);

-- Enable Row Level Security
ALTER TABLE world_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lore ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE civilizations ENABLE ROW LEVEL SECURITY;

-- Basic policies (adjust for production)
CREATE POLICY "Allow all on world_content" ON world_content FOR ALL USING (true);
CREATE POLICY "Allow all on provenance" ON provenance FOR ALL USING (true);
CREATE POLICY "Allow all on historical_events" ON historical_events FOR ALL USING (true);
CREATE POLICY "Allow all on lore" ON lore FOR ALL USING (true);
CREATE POLICY "Allow all on content_connections" ON content_connections FOR ALL USING (true);
CREATE POLICY "Allow all on civilizations" ON civilizations FOR ALL USING (true);

-- Function to get provenance chain (recursive)
CREATE OR REPLACE FUNCTION get_provenance_chain(content_id_param TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  type TEXT,
  relationship TEXT,
  depth INTEGER
) AS $$
WITH RECURSIVE chain AS (
  -- Start with the requested content
  SELECT 
    wc.id,
    wc.name,
    wc.type,
    'self'::TEXT as relationship,
    0 as depth
  FROM world_content wc
  WHERE wc.id = content_id_param
  
  UNION ALL
  
  -- Recursively get parents
  SELECT 
    parent.id,
    parent.name,
    parent.type,
    CASE 
      WHEN parent.type = 'region' THEN 'located in'
      WHEN parent.type = 'location' THEN 'located in'
      WHEN parent.type = 'dungeon' THEN 'found in'
      ELSE 'part of'
    END as relationship,
    c.depth + 1
  FROM world_content parent
  JOIN chain c ON parent.id = (
    SELECT wc2.parent_id 
    FROM world_content wc2 
    WHERE wc2.id = c.id
  )
  WHERE c.depth < 10 -- Prevent infinite recursion
)
SELECT id, name, type, relationship, depth
FROM chain
ORDER BY depth;
$$ LANGUAGE sql;

-- Function to get related content
CREATE OR REPLACE FUNCTION get_related_content(
  content_id_param TEXT,
  relationship_types_param TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  type TEXT,
  relationship TEXT,
  strength TEXT,
  description TEXT
) AS $$
SELECT 
  wc.id,
  wc.name,
  wc.type,
  cc.relationship,
  cc.strength,
  cc.description
FROM content_connections cc
JOIN world_content wc ON wc.id = cc.target_id
WHERE cc.source_id = content_id_param
  AND (relationship_types_param IS NULL OR cc.relationship = ANY(relationship_types_param))
ORDER BY 
  CASE cc.strength
    WHEN 'strong' THEN 1
    WHEN 'moderate' THEN 2
    WHEN 'weak' THEN 3
  END;
$$ LANGUAGE sql;

