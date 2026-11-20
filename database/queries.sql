USE campusops;

-- JOIN: show each event with its organizer. This demonstrates how the foreign key connects events to users.
SELECT e.title, u.name AS organizer
FROM events e JOIN users u ON u.id = e.created_by;

-- GROUP BY and HAVING: find events with at least five registrations. The grouped count supports a simple popularity report.
SELECT e.id, e.title, COUNT(r.id) AS registration_count
FROM events e LEFT JOIN registrations r ON r.event_id = e.id
GROUP BY e.id, e.title HAVING COUNT(r.id) >= 5;

-- Subquery: list participants registered for Campus Tech Day. The inner query first finds that event's ID.
SELECT u.name, u.email
FROM users u
WHERE u.id IN (SELECT r.user_id FROM registrations r JOIN events e ON e.id = r.event_id
               WHERE e.title = 'Campus Tech Day');

-- NOT EXISTS: find registrations with no attendance rows, which identifies event no-shows.
SELECT r.event_id, r.id AS registration_id, u.name
FROM registrations r JOIN users u ON u.id = r.user_id
WHERE NOT EXISTS (SELECT 1 FROM attendance a WHERE a.registration_id = r.id);

-- EXPLAIN: inspect how MySQL locates registrations for an event using the event_id index.
EXPLAIN SELECT id, user_id, status FROM registrations WHERE event_id = 1;

-- Capacity report: compare session selections with the configured room capacity. GROUP BY returns one row per session.
SELECT s.id, s.title, s.capacity, COUNT(sr.registration_id) AS registered_count
FROM sessions s LEFT JOIN session_registrations sr ON sr.session_id = s.id
GROUP BY s.id, s.title, s.capacity;
