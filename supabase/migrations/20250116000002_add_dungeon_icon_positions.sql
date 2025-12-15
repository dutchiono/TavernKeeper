-- Add icon position fields to dungeons map JSONB
-- This migration ensures dungeons can store icon_x and icon_y in their map JSONB
-- No schema change needed - we'll use the existing map JSONB field

-- Note: Icon positions will be stored in map JSONB as:
-- map.icon_x (number between 10-90)
-- map.icon_y (number between 10-90)
-- These represent percentage positions on the map view

-- This is a no-op migration since we're using existing JSONB field
-- Positions will be initialized when dungeons are first loaded in MapScene

