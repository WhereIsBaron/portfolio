-- Per-visit event log — powers the owner's Google-Analytics-style dashboard.
--
-- The existing visit_log keeps ONE aggregated row per IP (good for totals and
-- recency) but can't produce a time-series. visit_events stores one row per
-- recorded visit, so the dashboard can chart visits over time, top pages,
-- referrer sources, devices, browsers and countries.
--
-- Same trust model as visit_log: the browser never writes here. The Netlify
-- `track` function (service role) calls record_visit(); only the owner account
-- may READ the events (RLS policy below). No third-party analytics involved.

create table if not exists public.visit_events (
  id          bigint generated always as identity primary key,
  ts          timestamptz not null default now(),
  ip          text,
  user_agent  text,
  referrer    text,
  path        text,
  country     text
);

create index if not exists visit_events_ts_idx on public.visit_events (ts desc);

alter table public.visit_events enable row level security;

-- Only the owner account may read the event log (mirrors visit_log).
drop policy if exists "owner reads visit events" on public.visit_events;
create policy "owner reads visit events"
  on public.visit_events
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'andrewpjlangeveldt@gmail.com');

-- ── Record one visit (server-side only) ────────────────────────────────────
-- Replaces the 4-arg version with a 5-arg one that also captures country and
-- appends a visit_events row. The added `country` defaults to '' so any older
-- caller that omits it still resolves. Keeps the per-IP upsert + grand-total
-- bump exactly as before, and returns the new grand total for the footer.
drop function if exists public.record_visit(text, text, text, text);

create or replace function public.record_visit(
  client_ip text,
  ua        text,
  referrer  text,
  path      text,
  country   text default ''
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

  -- Per-IP rollup (unchanged behaviour).
  insert into public.visit_log (ip, hits, first_seen, last_seen, last_user_agent, last_referrer, last_path)
    values (client_ip, 1, now(), now(), ua, referrer, path)
  on conflict (ip) do update
    set hits            = public.visit_log.hits + 1,
        last_seen       = now(),
        last_user_agent = excluded.last_user_agent,
        last_referrer   = excluded.last_referrer,
        last_path       = excluded.last_path;

  -- One immutable event row for the time-series dashboard.
  insert into public.visit_events (ip, user_agent, referrer, path, country)
    values (client_ip, ua, referrer, path, nullif(country, ''));

  update public.site_visits
    set count = count + 1
    where id = 1
    returning count into new_total;

  return coalesce(new_total, 0);
end;
$$;

grant execute on function public.record_visit(text, text, text, text, text) to service_role;
