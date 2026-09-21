/*
  Family Tree tables

  family_people      — individuals in the tree
  family_relationships — parent / child / spouse / sibling links
  family_photos      — up to 5 photos per person (Supabase Storage paths)
  family_submissions — branch submissions from family members (pending review)

  RLS:
    - family_people / family_relationships / family_photos: public SELECT, authenticated write
    - family_submissions: anon INSERT; authenticated SELECT/UPDATE/DELETE
*/

-- ── People ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS family_people (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  birth_year   int,
  death_year   int,
  country_code text,                       -- ISO 3166-1 alpha-2, e.g. "ZA"
  city         text,
  profession   text,
  hobbies      text[]      DEFAULT '{}',
  bio          text,
  is_root      boolean     NOT NULL DEFAULT false,  -- anchor person (the admin)
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE family_people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_people"  ON family_people;
CREATE POLICY "public_select_people"
ON family_people FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_people"    ON family_people;
CREATE POLICY "auth_insert_people"
ON family_people FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_people"    ON family_people;
CREATE POLICY "auth_update_people"
ON family_people FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_people"    ON family_people;
CREATE POLICY "auth_delete_people"
ON family_people FOR DELETE TO authenticated USING (true);

-- ── Relationships ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS family_relationships (
  id               uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  person_a_id      uuid  NOT NULL REFERENCES family_people(id) ON DELETE CASCADE,
  person_b_id      uuid  NOT NULL REFERENCES family_people(id) ON DELETE CASCADE,
  -- relationship_type is from person_a's perspective
  -- 'parent'  → person_a is a parent of person_b
  -- 'child'   → person_a is a child of person_b
  -- 'spouse'  → person_a is spouse of person_b  (mirrored automatically by app)
  -- 'sibling' → person_a is sibling of person_b (mirrored automatically by app)
  relationship_type text NOT NULL CHECK (relationship_type IN ('parent','child','spouse','sibling')),
  created_at        timestamptz DEFAULT now(),
  UNIQUE (person_a_id, person_b_id, relationship_type)
);

ALTER TABLE family_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_rels"  ON family_relationships;
CREATE POLICY "public_select_rels"
ON family_relationships FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_rels"    ON family_relationships;
CREATE POLICY "auth_insert_rels"
ON family_relationships FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_rels"    ON family_relationships;
CREATE POLICY "auth_update_rels"
ON family_relationships FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_rels"    ON family_relationships;
CREATE POLICY "auth_delete_rels"
ON family_relationships FOR DELETE TO authenticated USING (true);

-- ── Photos ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS family_photos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     uuid        NOT NULL REFERENCES family_people(id) ON DELETE CASCADE,
  storage_path  text        NOT NULL,   -- path inside the "family-photos" bucket
  url           text        NOT NULL,   -- public URL for display
  display_order int         NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE family_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_photos"  ON family_photos;
CREATE POLICY "public_select_photos"
ON family_photos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_photos"    ON family_photos;
CREATE POLICY "auth_insert_photos"
ON family_photos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_photos"    ON family_photos;
CREATE POLICY "auth_delete_photos"
ON family_photos FOR DELETE TO authenticated USING (true);

-- ── Submissions ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS family_submissions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_name  text        NOT NULL,
  submitter_email text        NOT NULL,
  data            jsonb       NOT NULL DEFAULT '{}',
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','approved','rejected')),
  admin_notes     text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE family_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_submissions"   ON family_submissions;
CREATE POLICY "anon_insert_submissions"
ON family_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_submissions"   ON family_submissions;
CREATE POLICY "auth_select_submissions"
ON family_submissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_update_submissions"   ON family_submissions;
CREATE POLICY "auth_update_submissions"
ON family_submissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_submissions"   ON family_submissions;
CREATE POLICY "auth_delete_submissions"
ON family_submissions FOR DELETE TO authenticated USING (true);
