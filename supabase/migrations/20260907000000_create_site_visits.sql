-- Website visit tracking + a public "total visits" counter.
--
-- Two tables:
--   site_visits — a single row holding the running grand total (shown in footer)
--   visit_log   — one row per visitor IP: how many times, when, and some context
--
-- The browser NEVER writes these directly. The Netlify `track` function reads the
-- real visitor IP from request headers and calls record_visit() with the service
-- role. Public visitors can only read the grand total (get_site_visits); the
-- per-IP log is readable ONLY by the owner account (RLS policy below).

-- ── Grand total ────────────────────────────────────────────────────────────
create table if not exists public.site_visits (
  id    integer primary key default 1,
  count bigint  not null default 0,
  constraint site_visits_singleton check (id = 1)
);

insert into public.site_visits (id, count)
  values (1, 0)
  on conflict (id) do nothing;

alter table public.site_visits enable row level security;

-- ── Per-IP visit log ───────────────────────────────────────────────────────
create table if not exists public.visit_log (
  ip                text primary key,
  hits              bigint      not null default 0,
  first_seen        timestamptz not null default now(),
  last_seen         timestamptz not null default now(),
  last_user_agent   text,
  last_referrer     text,
  last_path         text
);

alter table public.visit_log enable row level security;

-- Only the owner account may read the visitor log. Everyone else (including the
-- public publishable key) gets nothing. Writes never happen through RLS — they
-- go through the SECURITY DEFINER function called by the service role.
drop policy if exists "owner reads visit log" on public.visit_log;
create policy "owner reads visit log"
  on public.visit_log
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'andrewpjlangeveldt@gmail.com');

-- ── Record one visit (server-side only) ────────────────────────────────────
-- Upserts the per-IP row (incrementing hits, refreshing context) and bumps the
-- grand total. Returns the new grand total so the footer can display it.
create or replace function public.record_visit(
  client_ip text,
  ua        text,
  referrer  text,
  path      text
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total bigint;
begin
  if client_ip is null or client_ip = '' then
    client_ip := 'unknown';
  end if;

  insert into public.visit_log (ip, hits, first_seen, last_seen, last_user_agent, last_referrer, last_path)
    values (client_ip, 1, now(), now(), ua, referrer, path)
  on conflict (ip) do update
    set hits            = public.visit_log.hits + 1,
        last_seen       = now(),
        last_user_agent = excluded.last_user_agent,
        last_referrer   = excluded.last_referrer,
        last_path       = excluded.last_path;

  update public.site_visits
    set count = count + 1
    where id = 1
    returning count into new_total;

  return coalesce(new_total, 0);
end;
$$;

-- ── Read the grand total (public) ──────────────────────────────────────────
create or replace function public.get_site_visits()
returns bigint
language sql
security definer
set search_path = public
as $$
  select coalesce((select count from public.site_visits where id = 1), 0);
$$;

-- record_visit is called only by the server (service role); the browser reads
-- the total via get_site_visits.
grant execute on function public.record_visit(text, text, text, text) to service_role;
grant execute on function public.get_site_visits() to anon, authenticated;
