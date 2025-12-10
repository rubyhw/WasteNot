create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'recycler' check (role in ('recycler', 'centre_staff', 'admin')),
  points_total bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read_own_profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "update_own_profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
