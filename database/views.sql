USE campusops;

CREATE OR REPLACE VIEW v_event_stats AS
SELECT
  e.id AS event_id,
  COUNT(DISTINCT r.id) AS total_registrations,
  COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN r.id END) AS total_attended,
  COUNT(DISTINCT CASE WHEN r.id IS NOT NULL AND a.id IS NULL THEN r.id END) AS no_show_count,
  CASE
    WHEN COUNT(DISTINCT r.id) = 0 THEN 0
    ELSE ROUND(COUNT(DISTINCT CASE WHEN r.id IS NOT NULL AND a.id IS NULL THEN r.id END)
      * 100 / COUNT(DISTINCT r.id), 2)
  END AS no_show_rate
FROM events e
LEFT JOIN registrations r ON r.event_id = e.id
LEFT JOIN attendance a ON a.registration_id = r.id
GROUP BY e.id;

CREATE OR REPLACE VIEW v_session_utilization AS
SELECT
  s.id AS session_id,
  s.event_id,
  s.capacity,
  COUNT(DISTINCT sr.registration_id) AS registered_count,
  COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN sr.registration_id END) AS attended_count,
  CASE
    WHEN s.capacity = 0 THEN 0
    ELSE ROUND(COUNT(DISTINCT sr.registration_id) * 100 / s.capacity, 2)
  END AS utilization_percent
FROM sessions s
LEFT JOIN session_registrations sr ON sr.session_id = s.id
LEFT JOIN attendance a ON a.session_id = s.id AND a.registration_id = sr.registration_id
GROUP BY s.id, s.event_id, s.capacity;

CREATE OR REPLACE VIEW v_no_shows AS
SELECT r.event_id, r.id AS registration_id, u.id AS user_id, u.name, u.email
FROM registrations r
JOIN users u ON u.id = r.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM attendance a WHERE a.registration_id = r.id
);
