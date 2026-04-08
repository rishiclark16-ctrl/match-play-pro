-- Promo codes table for lifetime Pro access
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null default 'lifetime_pro',
  max_uses int not null default 1,
  current_uses int not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- Track who redeemed which code
create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  promo_code_id uuid not null references public.promo_codes(id),
  redeemed_at timestamptz not null default now(),
  unique(user_id, promo_code_id)
);

-- Index for fast code lookups
create index if not exists idx_promo_codes_code on public.promo_codes(code);
create index if not exists idx_promo_redemptions_user on public.promo_redemptions(user_id);

-- RLS: promo_codes read-only for authenticated users (needed for redemption check)
alter table public.promo_codes enable row level security;
create policy "Anyone can read promo codes" on public.promo_codes
  for select using (true);

-- RLS: promo_redemptions - users can read their own
alter table public.promo_redemptions enable row level security;
create policy "Users can read own redemptions" on public.promo_redemptions
  for select using (auth.uid() = user_id);
