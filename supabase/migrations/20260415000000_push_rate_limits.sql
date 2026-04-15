-- Persistent rate limit store for the send-push edge function.
-- Replaces the in-memory Map which resets every cold start.

create table if not exists push_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

alter table push_rate_limits enable row level security;
-- No policies: only service-role writes; clients never touch this table.

create or replace function check_push_rate_limit(
  p_user_id uuid,
  p_limit integer default 50,
  p_window_minutes integer default 60
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into push_rate_limits (user_id, window_start, count)
  values (p_user_id, now(), 1)
  on conflict (user_id) do update set
    window_start = case
      when now() - push_rate_limits.window_start > make_interval(mins => p_window_minutes)
        then now()
      else push_rate_limits.window_start
    end,
    count = case
      when now() - push_rate_limits.window_start > make_interval(mins => p_window_minutes)
        then 1
      else push_rate_limits.count + 1
    end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function check_push_rate_limit(uuid, integer, integer) from public;
grant execute on function check_push_rate_limit(uuid, integer, integer) to service_role;
