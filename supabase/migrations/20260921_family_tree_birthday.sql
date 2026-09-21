-- Add full birth_date and death_date columns to family_people
-- birth_year / death_year are kept for backward compat; app prefers the date columns when set.

ALTER TABLE family_people
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS death_date date;
