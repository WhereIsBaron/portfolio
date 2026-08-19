-- Per-IP rate limiting for the portfolio AI chat assistant.
--
-- The chat serverless function calls check_chat_rate_limit() before every
-- provider request. The function runs server-side with the SERVICE ROLE key,
-- so this table is NOT exposed to the browser (RLS is on with no policies, and
-- the function is SECURITY DEFINER — it does the counting atomically in one round
-- trip, avoiding race conditions between concurrent requests from the same IP).

create table if not exists public.chat_rate_limits (
  ip           text primary key,
  count        integer     not null default 0,
  window_start timestamptz not null default now()
);

-- Lock the table down: no anon/authenticated access at all. Only the
-- SECURITY DEFINER function below (and the service role) can touch it.
alter table public.chat_rate_limits enable row level security;

-- Atomic "may this IP send another message?" check.
--   returns true  → allowed (and the counter was incremented)
--   returns false → over the limit for the current window
-- A fixed window of `window_seconds` starting at the first request; once it
-- elapses the window resets. `for update` serialises concurrent hits per IP.
create or replace function public.check_chat_rate_limit(
  client_ip      text,
  max_requests   integer,
  window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.chat_rate_limits%rowtype;
begin
  select * into rec
    from public.chat_rate_limits
    where ip = client_ip
    for update;

  -- First time we've seen this IP → start a fresh window.
  if not found then
    insert into public.chat_rate_limits (ip, count, window_start)
      values (client_ip, 1, now());
    return true;
  end if;

  -- Window has elapsed → reset it.
  if now() - rec.window_start > make_interval(secs => window_seconds) then
    update public.chat_rate_limits
      set count = 1, window_start = now()
      where ip = client_ip;
    return true;
  end if;

  -- Inside the window and already at the cap → deny.
  if rec.count >= max_requests then
    return false;
  end if;

  -- Inside the window and under the cap → count it and allow.
  update public.chat_rate_limits
    set count = count + 1
    where ip = client_ip;
  return true;
end;
$$;
