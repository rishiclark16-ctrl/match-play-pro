-- ============================================================
-- Weekly recap cron schedule
-- ============================================================
-- Invokes the `weekly-recap` edge function every Monday at 14:00 UTC
-- (09:00 EST / 06:00 PST — recipients get the push over morning coffee).
--
-- Requires:
--   - `pg_cron` and `pg_net` extensions
--   - Postgres settings `app.settings.supabase_url` and
--     `app.settings.weekly_recap_secret` to be configured (see README).
--     These are typically set via `ALTER DATABASE postgres SET ...` from
--     the Supabase dashboard SQL editor, not checked into source.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop any prior schedule so this migration is idempotent on re-apply.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-recap') THEN
    PERFORM cron.unschedule('weekly-recap');
  END IF;
END
$$;

SELECT cron.schedule(
  'weekly-recap',
  '0 14 * * 1',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/weekly-recap',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-recap-secret', current_setting('app.settings.weekly_recap_secret', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
