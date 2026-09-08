-- Contact-form leads — a real, consented way for a reviewer to reach out.
--
-- A visitor submits name + email + message (+ optional company); it's stored
-- here with the campaign tag that brought them, so a warm lead ties back to the
-- application/link that produced it. Unlike analytics, this IS identifying data
-- — but only because the person chose to give it.
--
-- Trust model mirrors the rest of the site: the browser can't read the table or
-- write it directly. Inserts go through submit_lead() (SECURITY DEFINER, with
-- validation); only the owner account may read or update (mark handled) rows.

create table if not exists public.leads (
  id        bigint generated always as identity primary key,
  ts        timestamptz not null default now(),
  name      text not null,
  email     text not null,
  company   text,
  message   text not null,
  campaign  text,
  handled   boolean not null default false
);

create index if not exists leads_ts_idx on public.leads (ts desc);

alter table public.leads enable row level security;

-- Owner-only read + update (update so the inbox can mark a lead handled). No
-- insert policy: all inserts flow through submit_lead() below.
drop policy if exists "owner reads leads" on public.leads;
create policy "owner reads leads"
  on public.leads for select to authenticated
  using ((auth.jwt() ->> 'email') = 'andrewpjlangeveldt@gmail.com');

drop policy if exists "owner updates leads" on public.leads;
create policy "owner updates leads"
  on public.leads for update to authenticated
  using ((auth.jwt() ->> 'email') = 'andrewpjlangeveldt@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'andrewpjlangeveldt@gmail.com');

-- ── Submit a lead (public, validated) ───────────────────────────────────────
-- Callable by anon/authenticated. Trims + length-caps every field, requires a
-- plausible email and non-empty name/message, then inserts. Returns true on
-- success; raises on invalid input so the form can show an error.
create or replace function public.submit_lead(
  p_name     text,
  p_email    text,
  p_message  text,
  p_company  text default '',
  p_campaign text default ''
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name    text := btrim(coalesce(p_name, ''));
  v_email   text := btrim(coalesce(p_email, ''));
  v_message text := btrim(coalesce(p_message, ''));
  v_company text := btrim(coalesce(p_company, ''));
  v_camp    text := btrim(coalesce(p_campaign, ''));
begin
  if length(v_name) < 1 or length(v_name) > 120 then
    raise exception 'invalid name';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then
    raise exception 'invalid email';
  end if;
  if length(v_message) < 1 or length(v_message) > 4000 then
    raise exception 'invalid message';
  end if;

  insert into public.leads (name, email, company, message, campaign)
    values (
      left(v_name, 120),
      left(v_email, 200),
      nullif(left(v_company, 160), ''),
      left(v_message, 4000),
      nullif(left(v_camp, 80), '')
    );
  return true;
end;
$$;

grant execute on function public.submit_lead(text, text, text, text, text) to anon, authenticated;
