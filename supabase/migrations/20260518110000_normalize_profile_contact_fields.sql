-- Normalize profile contact fields so search always matches stored data.
--
-- profiles.full_name / email / phone are written from several paths: the
-- handle_new_user signup trigger, the sync_user_name_to_profile trigger,
-- onboarding, the profile edit screen, and edge functions. Without a single
-- normalization point:
--   * a phone stored formatted ("(555) 123-4567") can't be found by a search
--     that strips formatting to digits ("5551234567") -- ILIKE never matches.
--   * a mixed-case email breaks sendFriendRequestByEmail's exact-match (.eq).
--   * stray whitespace in a name breaks ILIKE name search.
--
-- A BEFORE INSERT/UPDATE trigger guarantees every write is normalized the same
-- way, regardless of which caller wrote it.

-- 1. Backfill existing rows to the normalized form (idempotent).
update public.profiles
set
  full_name = nullif(trim(full_name), ''),
  email     = nullif(lower(trim(email)), ''),
  phone     = nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '')
where
  full_name is distinct from nullif(trim(full_name), '')
  or email  is distinct from nullif(lower(trim(email)), '')
  or phone  is distinct from nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '');

-- 2. Normalization trigger function.
create or replace function public.normalize_profile_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  new.full_name := nullif(trim(new.full_name), '');
  new.email     := nullif(lower(trim(new.email)), '');
  -- Phone stored as digits only -- the canonical form friend search expects.
  new.phone     := nullif(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), '');
  return new;
end;
$function$;

-- Trigger functions must not be REST-callable (advisor + CVE hygiene).
revoke execute on function public.normalize_profile_fields() from anon, authenticated, public;

drop trigger if exists normalize_profile_fields_trigger on public.profiles;
create trigger normalize_profile_fields_trigger
  before insert or update on public.profiles
  for each row
  execute function public.normalize_profile_fields();
