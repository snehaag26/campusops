# CampusOps PostgreSQL Database Design

This document specifies the proposed normalized tables and constraints. It is design documentation only; it does not create a `schema.sql` or application code. Types use PostgreSQL conventions. Select concrete enum vocabularies with the team before implementation.

## Tables

| Table | Columns and constraints |
|---|---|
| `users` | `user_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`; `name text NOT NULL`; `email text NOT NULL UNIQUE`; `password_hash text NOT NULL`; `role text NOT NULL CHECK (role IN (...))` |
| `venues` | `venue_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`; `name text NOT NULL`; `address text NOT NULL` |
| `events` | `event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`; `title text NOT NULL`; `description text`; `venue_id bigint REFERENCES venues`; `start_at timestamptz NOT NULL`; `end_at timestamptz NOT NULL`; `capacity integer NOT NULL CHECK (capacity >= 0)`; `created_by bigint NOT NULL REFERENCES users`; `CHECK (end_at > start_at)` |
| `sessions` | `session_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`; `event_id bigint NOT NULL REFERENCES events`; `title text NOT NULL`; `speaker text`; `start_at timestamptz NOT NULL`; `end_at timestamptz NOT NULL`; `capacity integer NOT NULL CHECK (capacity >= 0)`; `CHECK (end_at > start_at)` |
| `registrations` | `registration_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`; `event_id bigint NOT NULL REFERENCES events`; `user_id bigint NOT NULL REFERENCES users`; `qr_token text NOT NULL UNIQUE`; `status text NOT NULL CHECK (status IN (...))`; `registered_at timestamptz NOT NULL DEFAULT now()`; `UNIQUE (event_id,user_id)` |
| `session_registrations` | `session_id bigint NOT NULL REFERENCES sessions`; `registration_id bigint NOT NULL REFERENCES registrations`; `PRIMARY KEY (session_id,registration_id)` |
| `attendance` | `attendance_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`; `registration_id bigint NOT NULL`; `session_id bigint NOT NULL`; `checked_in_at timestamptz NOT NULL DEFAULT now()`; `checked_in_by bigint NOT NULL REFERENCES users`; `UNIQUE (registration_id,session_id)`; composite FK `(session_id,registration_id)` → `session_registrations(session_id,registration_id)` |
| `volunteers` | `volunteer_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`; `user_id bigint NOT NULL REFERENCES users`; `event_id bigint NOT NULL REFERENCES events`; `UNIQUE (user_id,event_id)` |
| `volunteer_assignments` | `assignment_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`; `volunteer_id bigint NOT NULL REFERENCES volunteers`; `session_id bigint NOT NULL REFERENCES sessions`; `task text NOT NULL`; `status text NOT NULL CHECK (status IN (...))` |
| `certificates` | `certificate_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`; `registration_id bigint NOT NULL UNIQUE REFERENCES registrations`; `eligible boolean NOT NULL DEFAULT false`; `issued_at timestamptz`; `certificate_code text UNIQUE`; check rule: issuance fields are consistently populated when issued and only for eligible records |

`...` in role/status checks denotes a deliberately unresolved allowed-value list, not SQL to copy. Choose the vocabulary before schema creation. `certificate_code` may be NULL until issuance; PostgreSQL's ordinary unique constraint allows multiple NULL values. If records are created only when a certificate is ready to issue, change the lifecycle and constraints accordingly.

## Referential integrity and delete/update behavior

- Use `ON UPDATE RESTRICT` for identity keys; identity values should not change.
- Use `ON DELETE RESTRICT` for users referenced by event creator, registration, check-in, or volunteer history, and for events with operational history. Prefer status/deactivation over deleting historical actors or events.
- Use `ON DELETE RESTRICT` from sessions/events/registrations when history must be retained. For an explicitly cancelled draft, controlled `ON DELETE CASCADE` from an event to its sessions and dependent join rows may be acceptable, but must not silently erase attendance/certificate audit history.
- `session_registrations` can cascade when a registration/session is deliberately removed before attendance exists; the composite FK from attendance should use `ON DELETE RESTRICT` to protect check-in history.
- Venue deletion should be `RESTRICT` while referenced; set an event's optional venue to NULL through an explicit update before removing it.
- Do not cascade-delete certificates or issued attendance records as a side effect of account cleanup.

## Cross-event consistency

The FKs above verify referenced records exist. They do not alone ensure a selected session belongs to the same event as its registration, or that an assignment session is part of the volunteer's event. Before schema implementation, choose one of these enforcement strategies:

1. Add `event_id` to the relevant association rows and use composite FKs backed by matching `UNIQUE(id,event_id)` constraints; this repeats a derivable value and should be consciously documented.
2. Use PostgreSQL constraint triggers to check the event match transactionally.

Attendance's composite FK to `session_registrations` additionally ensures a participant was registered for the session before check-in. Concurrent capacity enforcement must also be designed transactionally; a simple row-level `CHECK` cannot count registrations or check-ins across rows.

## Index recommendations

PostgreSQL automatically indexes primary keys and unique constraints. Add indexes for common joins and filters:

- `events(created_by)`, `events(venue_id)`
- `sessions(event_id, start_at)`
- `registrations(event_id, status)`, `registrations(user_id)` (the unique `(event_id,user_id)` index does not efficiently serve all user-only lookups)
- `session_registrations(registration_id)` (the primary key begins with `session_id`)
- `attendance(session_id, checked_in_at)`, `attendance(checked_in_by)`
- `volunteers(event_id)`, `volunteers(user_id)` as needed (the unique pair index begins with `user_id`)
- `volunteer_assignments(session_id)`, `volunteer_assignments(volunteer_id)`
- Add partial indexes for active/unissued records only when query patterns and chosen status lifecycle justify them.

Avoid redundant indexes duplicating a primary/unique index. Revisit recommendations using production query plans and measured workload.
