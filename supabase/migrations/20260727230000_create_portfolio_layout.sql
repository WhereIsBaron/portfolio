-- Portfolio arrangement storage.
-- One row holds the ordering the whole site reads. Public visitors can READ it
-- (so everyone sees your latest arrangement); only signed-in (authenticated)
-- users can WRITE it (so only you can rearrange).

create table if not exists public.portfolio_layout (
  id            text primary key default 'default',
  project_order jsonb not null default '[]'::jsonb,   -- array of project names
  image_order   jsonb not null default '{}'::jsonb,   -- { slug: [image paths] }
  updated_at    timestamptz not null default now()
);

insert into public.portfolio_layout (id)
values ('default')
on conflict (id) do nothing;

alter table public.portfolio_layout enable row level security;

-- Anyone (anonymous or signed-in) may read the arrangement.
drop policy if exists "portfolio_layout read" on public.portfolio_layout;
create policy "portfolio_layout read"
  on public.portfolio_layout
  for select
  using (true);

-- Only signed-in users may change it. Since only you have a login, only you can
-- rearrange. No insert/delete policies exist, so the row cannot be created or
-- removed through the public API.
drop policy if exists "portfolio_layout write" on public.portfolio_layout;
create policy "portfolio_layout write"
  on public.portfolio_layout
  for update
  to authenticated
  using (true)
  with check (true);
