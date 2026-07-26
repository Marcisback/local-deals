SELECT
    v.name AS venue,
    d.title AS deal,
    dsw.day_of_week,
    dsw.start_time,
    dsw.end_time,
    now() AT TIME ZONE v.timezone AS venue_local_time
FROM venues v
JOIN deals d
    ON d.venue_id = v.id
JOIN deal_schedule_windows dsw
    ON dsw.deal_id = d.id
WHERE
    v.status = 'active'
    AND d.status = 'active'

    AND dsw.day_of_week =
        EXTRACT(
            DOW FROM now() AT TIME ZONE v.timezone
        )

    AND (
        now() AT TIME ZONE v.timezone
    )::time >= dsw.start_time

    AND (
        now() AT TIME ZONE v.timezone
    )::time < dsw.end_time;