/*
# Create messages table for CV contact form

1. New Tables
- `messages`
  - `id` (uuid, primary key)
  - `name` (text, not null) — sender's name
  - `email` (text, not null) — sender's email, for replies
  - `message` (text, not null) — the body of the inquiry
  - `read` (boolean, default false) — whether the owner has marked it read
  - `created_at` (timestamptz, default now()) — submission time

2. Security
- Enable RLS on `messages`.
- INSERT is open to anon + authenticated so any visitor can submit the
  contact form without signing in.
- SELECT / UPDATE / DELETE are restricted to `authenticated` only, so only
  the signed-in owner can read and manage submissions. The public CV page
  only ever inserts, so anon does not need read access here — this keeps
  submitted messages private.
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages"
ON messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_messages" ON messages;
CREATE POLICY "auth_select_messages"
ON messages FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "auth_update_messages" ON messages;
CREATE POLICY "auth_update_messages"
ON messages FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_messages" ON messages;
CREATE POLICY "auth_delete_messages"
ON messages FOR DELETE
TO authenticated
USING (true);
