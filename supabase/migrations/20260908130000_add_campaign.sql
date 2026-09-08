-- Campaign / referral tagging for visits.
--
-- Goal: know which job application or posting actually drove a visit. The owner
-- shares a tagged link per application — andrew-langeveldt.netlify.app/?ref=acme
-- (or standard utm_source / utm_campaign) — and that tag is stored on the visit
-- so the dashboard can show "Visits by campaign". No names or emails involved:
-- it only answers "did the link I gave company X get opened?".
--
-- Same trust model: the browser never writes. The Netlify `track` function
-- (service role) passes the tag to record_visit(); only the owner reads it.

alter table public.visit_events add column if not exists campaign text;
alter table public.visit_log   add column if not exists last_campaign text;

-- Replace the 5-arg record_visit with a 6-arg one that also stores the campaign
-- tag. `campaign` defaults to '' so any older caller still resolves.
drop function if exists public.record_visit(text, text, text, text, text);

create or replace function public.record_visit(
  client_ip text,
  ua        text,
  referrer  text,
  path      text,
  country   text default '',
  campaign  text default ''
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

  -- Per-IP rollup. Only overwrite last_campaign when a tag is present, so a
  -- later untagged visit doesn't erase which link first brought this visitor.
  insert into public.visit_log (ip, hits, first_seen, last_seen, last_user_agent, last_referrer, last_path, last_campaign)
    values (client_ip, 1, now(), now(), ua, referrer, path, nullif(campaign, ''))
  on conflict (ip) do update
    set hits            = public.visit_log.hits + 1,
        last_seen       = now(),
        last_user_agent = excluded.last_user_agent,
        last_referrer   = excluded.last_referrer,
        last_path       = excluded.last_path,
        last_campaign   = coalesce(nullif(excluded.last_campaign, ''), public.visit_log.last_campaign);

  -- One immutable event row for the time-series dashboard.
  insert into public.visit_events (ip, user_agent, referrer, path, country, campaign)
    values (client_ip, ua, referrer, path, nullif(country, ''), nullif(campaign, ''));

  update public.site_visits
    set count = count + 1
    where id = 1
    returning count into new_total;

  return coalesce(new_total, 0);
end;
$$;

grant execute on function public.record_visit(text, text, text, text, text, text) to service_role;
