-- ============================================================
-- Weekly recap cron schedule
-- ============================================================
-- Invokes the `weekly-recap` edge function every Monday at 14:00 UTC
-- (09:00 EST / 06:00 PST — recipients get the push over morning coffee).
--
-- Requires:
--   - `pg_cron` and `pg_net` extensions
--   - The `WEEKLY_RECAP_SECRET` env var set on the `weekly-recap` edge
--     function to match the secret inlined below.
--
-- Note: hosted Supabase restricts `ALTER DATABASE SET` on arbitrary
-- GUCs, so the URL and secret are inlined in the cron body instead of
-- using `current_setting('app.settings.*')`. The cron.job table is only
-- readable by the postgres role, so the secret stays server-side.

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
  $job$
  SELECT net.http_post(
    url := 'https://puqgbsxabcyxrbwwoznn.supabase.co/functions/v1/weekly-recap',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-recap-secret', 'df733d9f036cf2476489ee0d61c0cdbc5d78495c7b36c04bef366b17905aa3dc'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $job$
);
