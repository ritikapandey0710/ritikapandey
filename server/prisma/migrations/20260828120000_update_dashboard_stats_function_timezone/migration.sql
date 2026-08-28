-- Update the get_dashboard_stats function to use the correct timezone (Asia/Kolkata)
-- This fixes the timezone error: time zone "Asia/Calcutta" not recognized

DROP FUNCTION IF EXISTS get_dashboard_stats();
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_tickets BIGINT,
  open_tickets BIGINT,
  resolved_by_ai BIGINT,
  resolved_by_ai_percentage NUMERIC,
  avg_resolution_time NUMERIC,
  tickets_per_day JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_tickets BIGINT;
  v_open_tickets BIGINT;
  v_resolved_by_ai BIGINT;
  v_avg_resolution_time NUMERIC;
  v_tickets_per_day JSONB;
  v_today DATE;
  v_start_date TIMESTAMP;
BEGIN
  -- Today's date in the server's local timezone (Asia/Kolkata)
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;

  -- Start of the 30-day window: local midnight 29 days ago, as a naive UTC
  -- timestamp. "createdAt" stores UTC values as a naive timestamp, so the
  -- comparison must also be a naive UTC timestamp.
  v_start_date := ((v_today - INTERVAL '29 days')::timestamp AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'UTC';

  -- Total tickets
  SELECT COUNT(*) INTO v_total_tickets FROM "Ticket";

  -- Open tickets (statuses awaiting resolution)
  SELECT COUNT(*) INTO v_open_tickets FROM "Ticket"
  WHERE "status" IN ('NEW', 'PROCESSING', 'OPEN', 'IN_PROGRESS');

  -- AI-resolved tickets
  SELECT COUNT(*) INTO v_resolved_by_ai FROM "Ticket"
  WHERE "resolvedByAI" = true;

  -- Average resolution time in hours (only for tickets that have been resolved)
  SELECT COALESCE(
    AVG(GREATEST(0, EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600.0)),
    0
  ) INTO v_avg_resolution_time
  FROM "Ticket"
  WHERE "resolvedAt" IS NOT NULL;

  -- Build the 30-day tickets-per-day series (all 30 calendar days, including zero-ticket days)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'date', days.day::text,
        'count', COALESCE(tc.count, 0)
      ) ORDER BY days.day
    ),
    '[]'::jsonb
  )
  INTO v_tickets_per_day
  FROM (
    SELECT generate_series(
      v_today - INTERVAL '29 days',
      v_today,
      INTERVAL '1 day'
    )::date AS day
  ) AS days
  LEFT JOIN (
    SELECT ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date AS day, COUNT(*) AS count
    FROM "Ticket"
    WHERE "createdAt" >= v_start_date
    GROUP BY day
  ) AS tc ON days.day = tc.day;

  RETURN QUERY
  SELECT
    v_total_tickets,
    v_open_tickets,
    v_resolved_by_ai,
    CASE
      WHEN v_total_tickets > 0 THEN ROUND((v_resolved_by_ai::numeric / v_total_tickets::numeric) * 100, 2)
      ELSE 0
    END,
    ROUND(v_avg_resolution_time, 2),
    v_tickets_per_day;
END;
$$;