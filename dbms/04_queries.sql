-- CampusOps PostgreSQL query cookbook
-- These are read-only examples against the schema in 03_schema.sql.
-- Replace the sample IDs/tokens in each params CTE with values for your data.

-- 1. Event dashboard: confirmed registrations, event capacity, and session count.
WITH params AS (
    SELECT 1::bigint AS event_id
)
SELECT
    e.event_id,
    e.title,
    e.start_at,
    e.end_at,
    v.name AS venue_name,
    e.capacity AS event_capacity,
    count(DISTINCT r.registration_id)
        FILTER (WHERE r.status = 'confirmed') AS confirmed_registrations,
    e.capacity - count(DISTINCT r.registration_id)
        FILTER (WHERE r.status = 'confirmed') AS remaining_event_capacity,
    count(DISTINCT s.session_id) AS session_count
FROM params p
JOIN events e ON e.event_id = p.event_id
LEFT JOIN venues v ON v.venue_id = e.venue_id
LEFT JOIN registrations r ON r.event_id = e.event_id
LEFT JOIN sessions s ON s.event_id = e.event_id
GROUP BY e.event_id, e.title, e.start_at, e.end_at, v.name, e.capacity;

-- 2. Registration roster for an event, including each participant's QR token.
WITH params AS (
    SELECT 1::bigint AS event_id
)
SELECT
    r.registration_id,
    u.user_id,
    u.name AS participant_name,
    u.email,
    r.status,
    r.registered_at,
    r.qr_token
FROM params p
JOIN registrations r ON r.event_id = p.event_id
JOIN users u ON u.user_id = r.user_id
ORDER BY r.registered_at, u.name;

-- 3. Session utilization: selected participants, check-ins, and capacity.
WITH params AS (
    SELECT 1::bigint AS event_id
)
SELECT
    s.session_id,
    s.title AS session_title,
    s.start_at,
    s.end_at,
    s.capacity,
    count(sr.registration_id) AS selected_participants,
    count(a.attendance_id) AS checked_in_participants,
    s.capacity - count(sr.registration_id) AS remaining_session_capacity,
    round(
        100.0 * count(a.attendance_id) / NULLIF(count(sr.registration_id), 0),
        1
    ) AS attendance_percent_of_selected
FROM params p
JOIN sessions s ON s.event_id = p.event_id
LEFT JOIN session_registrations sr ON sr.session_id = s.session_id
LEFT JOIN attendance a
    ON a.session_id = sr.session_id
   AND a.registration_id = sr.registration_id
GROUP BY s.session_id, s.title, s.start_at, s.end_at, s.capacity
ORDER BY s.start_at;

-- 4. No-show roster for one session (selected, confirmed participants not checked in).
WITH params AS (
    SELECT 1::bigint AS event_id, 1::bigint AS session_id
)
SELECT
    s.session_id,
    s.title AS session_title,
    r.registration_id,
    u.user_id,
    u.name AS participant_name,
    u.email
FROM params p
JOIN sessions s
  ON s.session_id = p.session_id
 AND s.event_id = p.event_id
JOIN session_registrations sr ON sr.session_id = s.session_id
JOIN registrations r
  ON r.registration_id = sr.registration_id
 AND r.event_id = p.event_id
JOIN users u ON u.user_id = r.user_id
LEFT JOIN attendance a
  ON a.session_id = sr.session_id
 AND a.registration_id = sr.registration_id
WHERE r.status = 'confirmed'
  AND a.attendance_id IS NULL
ORDER BY u.name;

-- 5. Validate a QR token for check-in to a specific session.
-- A row means the token has a confirmed registration for that session/event.
-- This query does not insert attendance; the check-in write should be a separate
-- transaction and should handle a duplicate-key response idempotently.
WITH params AS (
    SELECT 'replace-with-scanned-token'::text AS qr_token,
           1::bigint AS session_id
)
SELECT
    r.registration_id,
    u.name AS participant_name,
    e.event_id,
    e.title AS event_title,
    s.session_id,
    s.title AS session_title,
    a.checked_in_at AS already_checked_in_at
FROM params p
JOIN registrations r
  ON r.qr_token = p.qr_token
 AND r.status = 'confirmed'
JOIN users u ON u.user_id = r.user_id
JOIN session_registrations sr ON sr.registration_id = r.registration_id
JOIN sessions s
  ON s.session_id = sr.session_id
 AND s.session_id = p.session_id
 AND s.event_id = r.event_id
JOIN events e ON e.event_id = r.event_id
LEFT JOIN attendance a
  ON a.session_id = s.session_id
 AND a.registration_id = r.registration_id;

-- 6. A participant's selected session schedule for one event.
WITH params AS (
    SELECT 1::bigint AS user_id, 1::bigint AS event_id
)
SELECT
    u.name AS participant_name,
    e.title AS event_title,
    s.session_id,
    s.title AS session_title,
    s.speaker,
    s.start_at,
    s.end_at,
    CASE WHEN a.attendance_id IS NULL THEN 'not checked in' ELSE 'checked in' END
        AS attendance_status,
    a.checked_in_at
FROM params p
JOIN users u ON u.user_id = p.user_id
JOIN registrations r
  ON r.user_id = u.user_id
 AND r.event_id = p.event_id
JOIN events e ON e.event_id = r.event_id
JOIN session_registrations sr ON sr.registration_id = r.registration_id
JOIN sessions s
  ON s.session_id = sr.session_id
 AND s.event_id = e.event_id
LEFT JOIN attendance a
  ON a.session_id = s.session_id
 AND a.registration_id = r.registration_id
WHERE r.status = 'confirmed'
ORDER BY s.start_at;

-- 7. Volunteer assignments for an event, with volunteer and session details.
WITH params AS (
    SELECT 1::bigint AS event_id
)
SELECT
    v.volunteer_id,
    u.name AS volunteer_name,
    u.email,
    s.session_id,
    s.title AS session_title,
    va.task,
    va.status AS assignment_status,
    va.assigned_at
FROM params p
JOIN volunteers v ON v.event_id = p.event_id
JOIN users u ON u.user_id = v.user_id
JOIN volunteer_assignments va ON va.volunteer_id = v.volunteer_id
JOIN sessions s
  ON s.session_id = va.session_id
 AND s.event_id = v.event_id
ORDER BY s.start_at, u.name, va.task;

-- 8. Session staffing coverage, including sessions without assignments.
WITH params AS (
    SELECT 1::bigint AS event_id
)
SELECT
    s.session_id,
    s.title AS session_title,
    s.start_at,
    count(va.assignment_id)
        FILTER (WHERE va.status <> 'cancelled') AS active_assignment_count,
    count(DISTINCT va.volunteer_id)
        FILTER (WHERE va.status <> 'cancelled') AS assigned_volunteer_count
FROM params p
JOIN sessions s ON s.event_id = p.event_id
LEFT JOIN volunteer_assignments va ON va.session_id = s.session_id
GROUP BY s.session_id, s.title, s.start_at
ORDER BY s.start_at;

-- 9. Certificate review report.
-- Example candidate rule: a confirmed registration has selected at least one
-- session and attended every selected session. This is a report only; confirm
-- the team's eligibility policy before using it to issue certificates.
WITH params AS (
    SELECT 1::bigint AS event_id
)
SELECT
    r.registration_id,
    u.name AS participant_name,
    u.email,
    count(sr.session_id) AS selected_sessions,
    count(a.attendance_id) AS attended_selected_sessions,
    (
        count(sr.session_id) > 0
        AND count(a.attendance_id) = count(sr.session_id)
    ) AS meets_example_eligibility_rule
FROM params p
JOIN registrations r
  ON r.event_id = p.event_id
 AND r.status = 'confirmed'
JOIN users u ON u.user_id = r.user_id
LEFT JOIN session_registrations sr ON sr.registration_id = r.registration_id
LEFT JOIN attendance a
  ON a.registration_id = sr.registration_id
 AND a.session_id = sr.session_id
GROUP BY r.registration_id, u.name, u.email
ORDER BY u.name;

-- 10. Event analytics: registration, attendance, and event-level no-show counts.
WITH params AS (
    SELECT 1::bigint AS event_id
)
SELECT
    e.event_id,
    e.title AS event_title,
    count(DISTINCT r.registration_id) AS total_registrations,
    count(DISTINCT r.registration_id)
        FILTER (WHERE r.status = 'confirmed') AS confirmed_registrations,
    count(DISTINCT r.registration_id)
        FILTER (WHERE r.status = 'confirmed' AND a.attendance_id IS NOT NULL)
        AS participants_with_any_check_in,
    count(DISTINCT r.registration_id)
        FILTER (
            WHERE r.status = 'confirmed'
              AND NOT EXISTS (
                  SELECT 1
                  FROM attendance no_show_attendance
                  WHERE no_show_attendance.registration_id = r.registration_id
              )
        ) AS confirmed_event_no_shows
FROM params p
JOIN events e ON e.event_id = p.event_id
LEFT JOIN registrations r ON r.event_id = e.event_id
LEFT JOIN attendance a ON a.registration_id = r.registration_id
GROUP BY e.event_id, e.title;

-- 11. Issued certificates for one event, with recipient and registration status.
WITH params AS (
    SELECT 1::bigint AS event_id
)
SELECT
    c.certificate_id,
    c.certificate_code,
    c.issued_at,
    u.name AS participant_name,
    u.email,
    r.registration_id,
    r.status AS registration_status
FROM params p
JOIN registrations r ON r.event_id = p.event_id
JOIN certificates c
  ON c.registration_id = r.registration_id
 AND c.issued_at IS NOT NULL
JOIN users u ON u.user_id = r.user_id
ORDER BY c.issued_at DESC;
