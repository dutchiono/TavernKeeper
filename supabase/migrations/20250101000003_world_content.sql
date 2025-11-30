-- Create world_content table
CREATE TABLE world_content (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  parent_id TEXT REFERENCES world_content(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create provenance table
CREATE TABLE provenance (
  content_id TEXT PRIMARY KEY REFERENCES world_content(id) ON DELETE CASCADE,
  origin_id TEXT REFERENCES world_content(id),
  creator_id TEXT,
  creation_method TEXT NOT NULL,
  creation_time TIMESTAMP WITH TIME ZONE,
  history JSONB DEFAULT '[]'::jsonb,
  age INTEGER,
  materials TEXT[],
  location TEXT
);

-- Create lore table
CREATE TABLE lore (
  content_id TEXT PRIMARY KEY REFERENCES world_content(id) ON DELETE CASCADE,
  story TEXT NOT NULL,
  significance TEXT NOT NULL,
  connections JSONB DEFAULT '[]'::jsonb,
  cultural_context TEXT,
  enriched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Create indexes
CREATE INDEX idx_world_content_type ON world_content(type);
CREATE INDEX idx_world_content_parent_id ON world_content(parent_id);
CREATE INDEX idx_provenance_creator_id ON provenance(creator_id);
CREATE INDEX idx_provenance_origin_id ON provenance(origin_id);
