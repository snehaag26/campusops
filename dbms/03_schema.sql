-- CampusOps relational schema (PostgreSQL)
-- Scope: database design foundation; capacity enforcement and application auth
-- remain transactional/application concerns.

BEGIN;

CREATE TABLE users (
    user_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name             text NOT NULL CHECK (btrim(name) <> ''),
    email            text NOT NULL UNIQUE CHECK (btrim(email) <> ''),
    password_hash    text NOT NULL CHECK (password_hash <> ''),
    role             text NOT NULL CHECK (role IN ('admin', 'organizer', 'participant')),
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE venues (
    venue_id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name             text NOT NULL CHECK (btrim(name) <> ''),
    address          text
);

CREATE TABLE events (
    event_id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title            text NOT NULL CHECK (btrim(title) <> ''),
    description      text,
    venue_id         bigint REFERENCES venues(venue_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    start_at         timestamptz NOT NULL,
    end_at           timestamptz NOT NULL,
    capacity         integer NOT NULL CHECK (capacity >= 0),
    created_by       bigint NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    created_at       timestamptz NOT NULL DEFAULT now(),
    CHECK (end_at > start_at)
);

CREATE TABLE sessions (
    session_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id         bigint NOT NULL REFERENCES events(event_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    title            text NOT NULL CHECK (btrim(title) <> ''),
    speaker          text,
    start_at         timestamptz NOT NULL,
    end_at           timestamptz NOT NULL,
    capacity         integer NOT NULL CHECK (capacity >= 0),
    created_at       timestamptz NOT NULL DEFAULT now(),
    CHECK (end_at > start_at)
);

CREATE TABLE registrations (
    registration_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id         bigint NOT NULL REFERENCES events(event_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    user_id          bigint NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    qr_token         text NOT NULL UNIQUE CHECK (qr_token <> ''),
    status           text NOT NULL DEFAULT 'confirmed'
                     CHECK (status IN ('pending', 'confirmed', 'cancelled', 'waitlisted')),
    registered_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);

CREATE TABLE session_registrations (
    session_id       bigint NOT NULL REFERENCES sessions(session_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    registration_id  bigint NOT NULL REFERENCES registrations(registration_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    selected_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (session_id, registration_id)
);

CREATE TABLE attendance (
    attendance_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    registration_id  bigint NOT NULL,
    session_id       bigint NOT NULL,
    checked_in_at    timestamptz NOT NULL DEFAULT now(),
    checked_in_by    bigint NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    UNIQUE (registration_id, session_id),
    FOREIGN KEY (session_id, registration_id)
        REFERENCES session_registrations(session_id, registration_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE TABLE volunteers (
    volunteer_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id          bigint NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    event_id         bigint NOT NULL REFERENCES events(event_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    created_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, event_id)
);

CREATE TABLE volunteer_assignments (
    assignment_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    volunteer_id     bigint NOT NULL REFERENCES volunteers(volunteer_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    session_id       bigint NOT NULL REFERENCES sessions(session_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    task             text NOT NULL CHECK (btrim(task) <> ''),
    status           text NOT NULL DEFAULT 'assigned'
                     CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
    assigned_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE certificates (
    certificate_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    registration_id  bigint NOT NULL UNIQUE REFERENCES registrations(registration_id)
                     ON DELETE RESTRICT ON UPDATE RESTRICT,
    eligible         boolean NOT NULL DEFAULT false,
    issued_at        timestamptz,
    certificate_code text UNIQUE,
    CHECK (
        (issued_at IS NULL AND certificate_code IS NULL)
        OR (issued_at IS NOT NULL AND certificate_code IS NOT NULL AND eligible)
    )
);

-- event_id establishes ownership for these records. Moving a populated child
-- to another event would invalidate session selections or assignments, so the
-- owner is immutable after insert; create a replacement record if needed.
CREATE FUNCTION prevent_event_scope_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.event_id IS DISTINCT FROM OLD.event_id THEN
        RAISE EXCEPTION 'event ownership cannot be changed for % records', TG_TABLE_NAME
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER sessions_event_scope_immutable
BEFORE UPDATE OF event_id ON sessions
FOR EACH ROW EXECUTE FUNCTION prevent_event_scope_change();

CREATE TRIGGER registrations_event_scope_immutable
BEFORE UPDATE OF event_id ON registrations
FOR EACH ROW EXECUTE FUNCTION prevent_event_scope_change();

CREATE TRIGGER volunteers_event_scope_immutable
BEFORE UPDATE OF event_id ON volunteers
FOR EACH ROW EXECUTE FUNCTION prevent_event_scope_change();

-- Keep session selections in the same event as their event registration.
-- FOR SHARE prevents a concurrent change to either parent's event_id until
-- this transaction completes.
CREATE FUNCTION enforce_session_registration_event() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    session_event_id bigint;
    registration_event_id bigint;
BEGIN
    SELECT event_id INTO session_event_id
      FROM sessions WHERE session_id = NEW.session_id FOR SHARE;
    SELECT event_id INTO registration_event_id
      FROM registrations WHERE registration_id = NEW.registration_id FOR SHARE;

    IF session_event_id IS DISTINCT FROM registration_event_id THEN
        RAISE EXCEPTION 'session % and registration % belong to different events',
            NEW.session_id, NEW.registration_id
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER session_registration_event_guard
BEFORE INSERT OR UPDATE OF session_id, registration_id ON session_registrations
FOR EACH ROW EXECUTE FUNCTION enforce_session_registration_event();

-- A volunteer can only be assigned to sessions belonging to the volunteer's
-- event. Parent row locks serialize this check with changes to event_id.
CREATE FUNCTION enforce_volunteer_assignment_event() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    volunteer_event_id bigint;
    session_event_id bigint;
BEGIN
    SELECT event_id INTO volunteer_event_id
      FROM volunteers WHERE volunteer_id = NEW.volunteer_id FOR SHARE;
    SELECT event_id INTO session_event_id
      FROM sessions WHERE session_id = NEW.session_id FOR SHARE;

    IF volunteer_event_id IS DISTINCT FROM session_event_id THEN
        RAISE EXCEPTION 'volunteer % and session % belong to different events',
            NEW.volunteer_id, NEW.session_id
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER volunteer_assignment_event_guard
BEFORE INSERT OR UPDATE OF volunteer_id, session_id ON volunteer_assignments
FOR EACH ROW EXECUTE FUNCTION enforce_volunteer_assignment_event();

-- Indexes for common reverse-FK lookups and event/session filtering.
CREATE INDEX events_created_by_idx ON events(created_by);
CREATE INDEX events_venue_id_idx ON events(venue_id) WHERE venue_id IS NOT NULL;
CREATE INDEX sessions_event_start_idx ON sessions(event_id, start_at);
CREATE INDEX registrations_user_id_idx ON registrations(user_id);
CREATE INDEX registrations_event_status_idx ON registrations(event_id, status);
CREATE INDEX session_registrations_registration_idx ON session_registrations(registration_id);
CREATE INDEX attendance_session_time_idx ON attendance(session_id, checked_in_at);
CREATE INDEX attendance_checked_in_by_idx ON attendance(checked_in_by);
CREATE INDEX volunteers_event_id_idx ON volunteers(event_id);
CREATE INDEX volunteer_assignments_volunteer_idx ON volunteer_assignments(volunteer_id);
CREATE INDEX volunteer_assignments_session_idx ON volunteer_assignments(session_id);

COMMIT;
