USE campusops;

-- Demo password for every seeded account: CampusOpsDemo123!
-- This bcrypt hash uses cost 12.
INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'Campus Admin', 'admin@campusops.test', '$2b$12$wcl1WRpNgPXyFBv6Udtuse.JsIegW49/H5RCf3lQbTjsFj7gmRoUW', 'admin'),
(2, 'Aarav Organizer', 'organizer@campusops.test', '$2b$12$wcl1WRpNgPXyFBv6Udtuse.JsIegW49/H5RCf3lQbTjsFj7gmRoUW', 'organizer'),
(3, 'Volunteer One', 'volunteer1@campusops.test', '$2b$12$wcl1WRpNgPXyFBv6Udtuse.JsIegW49/H5RCf3lQbTjsFj7gmRoUW', 'volunteer'),
(4, 'Volunteer Two', 'volunteer2@campusops.test', '$2b$12$wcl1WRpNgPXyFBv6Udtuse.JsIegW49/H5RCf3lQbTjsFj7gmRoUW', 'volunteer'),
(5, 'Aditi Shah', 'aditi@campusops.test', '$2b$12$wcl1WRpNgPXyFBv6Udtuse.JsIegW49/H5RCf3lQbTjsFj7gmRoUW', 'participant'),
(6, 'Kabir Mehta', 'kabir@campusops.test', '$2b$12$wcl1WRpNgPXyFBv6Udtuse.JsIegW49/H5RCf3lQbTjsFj7gmRoUW', 'participant'),
(7, 'Isha Rao', 'isha@campusops.test', '$2b$12$wcl1WRpNgPXyFBv6Udtuse.JsIegW49/H5RCf3lQbTjsFj7gmRoUW', 'participant'),
(8, 'Rohan Das', 'rohan@campusops.test', '$2b$12$wcl1WRpNgPXyFBv6Udtuse.JsIegW49/H5RCf3lQbTjsFj7gmRoUW', 'participant'),
(9, 'Mira Nair', 'mira@campusops.test', '$2b$12$wcl1WRpNgPXyFBv6Udtuse.JsIegW49/H5RCf3lQbTjsFj7gmRoUW', 'participant'),
(10, 'Dev Patel', 'dev@campusops.test', '$2b$12$wcl1WRpNgPXyFBv6Udtuse.JsIegW49/H5RCf3lQbTjsFj7gmRoUW', 'participant'),
(11, 'Sara Khan', 'sara@campusops.test', '$2b$12$wcl1WRpNgPXyFBv6Udtuse.JsIegW49/H5RCf3lQbTjsFj7gmRoUW', 'participant'),
(12, 'Neel Joshi', 'neel@campusops.test', '$2b$12$wcl1WRpNgPXyFBv6Udtuse.JsIegW49/H5RCf3lQbTjsFj7gmRoUW', 'participant'),
(13, 'Tara Bose', 'tara@campusops.test', '$2b$12$wcl1WRpNgPXyFBv6Udtuse.JsIegW49/H5RCf3lQbTjsFj7gmRoUW', 'participant'),
(14, 'Arjun Sen', 'arjun@campusops.test', '$2b$12$wcl1WRpNgPXyFBv6Udtuse.JsIegW49/H5RCf3lQbTjsFj7gmRoUW', 'participant');

INSERT INTO events (id, title, description, venue, start_at, end_at, capacity, created_by) VALUES
(1, 'Campus Tech Day', 'Student talks and hands-on workshops.', 'Main Auditorium', '2026-12-05 09:00:00', '2026-12-05 17:00:00', 40, 2),
(2, 'Design Sprint', 'A collaborative product design workshop.', 'Innovation Lab', '2026-12-12 10:00:00', '2026-12-12 16:00:00', 30, 2);

INSERT INTO sessions (id, event_id, title, speaker, start_at, end_at, capacity) VALUES
(1, 1, 'Opening Keynote', 'Dr. Meera Iyer', '2026-12-05 09:30:00', '2026-12-05 10:30:00', 10),
(2, 1, 'Building with APIs', 'Ravi Menon', '2026-12-05 11:00:00', '2026-12-05 12:00:00', 6),
(3, 1, 'Data Modeling Lab', 'Nisha Verma', '2026-12-05 14:00:00', '2026-12-05 15:30:00', 12),
(4, 2, 'Problem Framing', 'Ananya Roy', '2026-12-12 10:30:00', '2026-12-12 11:30:00', 10),
(5, 2, 'Prototype Review', 'Vikram Shah', '2026-12-12 13:00:00', '2026-12-12 14:30:00', 10),
(6, 2, 'Demo and Wrap-up', 'Ananya Roy', '2026-12-12 15:00:00', '2026-12-12 15:45:00', 10);

INSERT INTO registrations (id, event_id, user_id, qr_token, status, registered_at) VALUES
(1, 1, 5, '10000000-0000-4000-8000-000000000001', 'registered', '2026-11-01 09:00:00'),
(2, 1, 6, '10000000-0000-4000-8000-000000000002', 'registered', '2026-11-01 09:05:00'),
(3, 1, 7, '10000000-0000-4000-8000-000000000003', 'registered', '2026-11-01 09:10:00'),
(4, 1, 8, '10000000-0000-4000-8000-000000000004', 'registered', '2026-11-01 09:15:00'),
(5, 1, 9, '10000000-0000-4000-8000-000000000005', 'registered', '2026-11-01 09:20:00'),
(6, 1, 10, '10000000-0000-4000-8000-000000000006', 'registered', '2026-11-01 09:25:00'),
(7, 1, 11, '10000000-0000-4000-8000-000000000007', 'registered', '2026-11-01 09:30:00'),
(8, 1, 12, '10000000-0000-4000-8000-000000000008', 'registered', '2026-11-01 09:35:00'),
(9, 2, 5, '20000000-0000-4000-8000-000000000001', 'registered', '2026-11-02 09:00:00'),
(10, 2, 6, '20000000-0000-4000-8000-000000000002', 'registered', '2026-11-02 09:05:00'),
(11, 2, 13, '20000000-0000-4000-8000-000000000003', 'registered', '2026-11-02 09:10:00'),
(12, 2, 14, '20000000-0000-4000-8000-000000000004', 'registered', '2026-11-02 09:15:00');

-- Session 2 is full: its six registrations equal its capacity.
INSERT INTO session_registrations (id, session_id, registration_id) VALUES
(1, 1, 1), (2, 1, 2), (3, 1, 3), (4, 1, 4), (5, 1, 5),
(6, 2, 1), (7, 2, 2), (8, 2, 3), (9, 2, 4), (10, 2, 5), (11, 2, 6),
(12, 3, 1), (13, 3, 2), (14, 3, 3), (15, 3, 7),
(16, 4, 9), (17, 4, 10), (18, 4, 11), (19, 5, 9), (20, 5, 11), (21, 6, 10), (22, 6, 12);

INSERT INTO attendance (id, registration_id, session_id, checked_in_at, checked_in_by) VALUES
(1, 1, 1, '2026-12-05 09:25:00', 3), (2, 2, 1, '2026-12-05 09:27:00', 3),
(3, 3, 1, '2026-12-05 09:29:00', 4), (4, 1, 2, '2026-12-05 10:55:00', 3),
(5, 2, 2, '2026-12-05 10:56:00', 3), (6, 1, 3, '2026-12-05 13:55:00', 4),
(7, 9, 4, '2026-12-12 10:25:00', 3), (8, 11, 4, '2026-12-12 10:27:00', 4),
(9, 9, 5, '2026-12-12 12:55:00', 3), (10, 10, 6, '2026-12-12 14:55:00', 4);

INSERT INTO volunteers (id, user_id, event_id) VALUES (1, 3, 1), (2, 4, 2);
INSERT INTO volunteer_assignments (id, volunteer_id, session_id, task, status) VALUES
(1, 1, 1, 'Welcome attendees and check room setup', 'pending'),
(2, 1, 2, 'Manage workshop entry', 'in_progress'),
(3, 2, 4, 'Prepare design materials', 'pending');

INSERT INTO certificates (id, registration_id, event_id, eligible) VALUES
(1, 1, 1, TRUE), (2, 9, 2, TRUE);
