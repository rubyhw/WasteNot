-- Vouchers table
create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  points_cost integer not null check (points_cost > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Points ledger: positive = earn, negative = spend
create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  change integer not null, -- +points or -points
  reason text,
  source text,             -- e.g. "recycle", "voucher_redeem"
  created_at timestamptz not null default now()
);

-- Voucher redemptions
create table if not exists public.voucher_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  voucher_id uuid not null references public.vouchers(id),
  points_spent integer not null check (points_spent > 0),
  status text not null default 'redeemed', -- can extend later
  created_at timestamptz not null default now()
);
