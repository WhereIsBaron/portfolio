-- Adds a nullable `status` qualifier to family_relationships.
-- Interpreted per relationship_type:
--   spouse         → married | partner | engaged | separated | divorced | widowed
--   parent / child → biological | adopted | foster | step
-- NULL means the sensible default (married for a union, biological for a child link).

ALTER TABLE family_relationships
  ADD COLUMN IF NOT EXISTS status text;
