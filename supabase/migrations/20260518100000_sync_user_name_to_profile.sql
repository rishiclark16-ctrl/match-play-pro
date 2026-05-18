-- Backfill + auto-sync user names into public.profiles.full_name
--
-- Root cause: Apple Sign-In delivers the user's name in the native credential
-- (givenName/familyName), NOT in the identity-token JWT. handle_new_user() runs
-- on the auth.users INSERT (during signInWithIdToken) before the name is
-- available, so profiles.full_name was created NULL. The app later calls
-- supabase.auth.updateUser() which writes the name into auth.users metadata,
-- but nothing propagated it to public.profiles -- leaving every Apple user
-- unsearchable in the "by name" friend search (ILIKE never matches NULL).

-- 1. Backfill existing profiles whose name is null but exists in auth metadata.
update public.profiles p
set full_name = trim(a.raw_user_meta_data ->> 'full_name')
from auth.users a
where a.id = p.id
  and (p.full_name is null or trim(p.full_name) = '')
  and a.raw_user_meta_data ->> 'full_name' is not null
  and trim(a.raw_user_meta_data ->> 'full_name') <> '';

-- 2. handle_new_user(): trim the name and normalise empty -> NULL on INSERT.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, full_name, friend_code, email)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    upper(substring(md5(new.id::text) from 1 for 6)),
    new.email
  );
  return new;
end;
$function$;

-- 3. sync_user_name_to_profile(): whenever auth.users metadata changes, copy
--    the name into profiles.full_name IF the profile name is still empty. This
--    catches the post-sign-in updateUser() call from the Apple flow. It only
--    fills a NULL/empty name, so a user's manual profile edit is never clobbered.
create or replace function public.sync_user_name_to_profile()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if nullif(trim(new.raw_user_meta_data ->> 'full_name'), '') is not null then
    update public.profiles
    set full_name = trim(new.raw_user_meta_data ->> 'full_name')
    where id = new.id
      and (full_name is null or trim(full_name) = '');
  end if;
  return new;
end;
$function$;

-- Trigger functions must not be REST-callable (advisor + CVE hygiene).
-- PostgreSQL does not check EXECUTE on trigger functions, so this is safe.
revoke execute on function public.sync_user_name_to_profile() from anon, authenticated, public;

drop trigger if exists on_auth_user_updated_sync_name on auth.users;
create trigger on_auth_user_updated_sync_name
  after update on auth.users
  for each row
  when (old.raw_user_meta_data is distinct from new.raw_user_meta_data)
  execute function public.sync_user_name_to_profile();
