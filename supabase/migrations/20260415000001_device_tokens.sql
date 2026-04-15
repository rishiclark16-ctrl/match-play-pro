-- Multi-device push token support.
-- Replaces profiles.push_token (which only supported one device per user).
-- profiles.push_token is kept in place for one release for backfill safety,
-- and dropped in a follow-up migration once all clients are on this version.

create table if not exists device_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  token text not null unique,
  platform text not null default 'ios' check (platform in ('ios', 'android')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists device_tokens_profile_id_idx on device_tokens(profile_id);

alter table device_tokens enable row level security;

-- Users may manage rows for their own profile; service-role bypasses RLS.
create policy "device_tokens_own_select" on device_tokens
  for select using (auth.uid() = profile_id);

create policy "device_tokens_own_insert" on device_tokens
  for insert with check (auth.uid() = profile_id);

create policy "device_tokens_own_update" on device_tokens
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "device_tokens_own_delete" on device_tokens
  for delete using (auth.uid() = profile_id);

-- Backfill existing single-token data.
insert into device_tokens (profile_id, token, platform)
select id, push_token, 'ios'
from profiles
where push_token is not null
on conflict (token) do nothing;
