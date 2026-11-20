CREATE DATABASE IF NOT EXISTS campusops
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE campusops;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'organizer', 'volunteer', 'participant') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  venue VARCHAR(255) NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  capacity INT UNSIGNED NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_events_capacity CHECK (capacity > 0),
  CONSTRAINT chk_events_dates CHECK (end_at > start_at),
  CONSTRAINT fk_events_created_by FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  speaker VARCHAR(160),
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  capacity INT UNSIGNED NOT NULL,
  CONSTRAINT chk_sessions_capacity CHECK (capacity > 0),
  CONSTRAINT chk_sessions_dates CHECK (end_at > start_at),
  CONSTRAINT fk_sessions_event FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS registrations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  qr_token CHAR(36) NOT NULL UNIQUE,
  status ENUM('registered', 'cancelled', 'checked_in') NOT NULL DEFAULT 'registered',
  registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_registrations_event_user UNIQUE (event_id, user_id),
  CONSTRAINT fk_registrations_event FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_registrations_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Supports event registration counts and event scoped registration lists.
CREATE INDEX idx_registrations_event_id ON registrations(event_id);
-- Supports a user's event registration lookups.
CREATE INDEX idx_registrations_user_id ON registrations(user_id);

CREATE TABLE IF NOT EXISTS session_registrations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id INT UNSIGNED NOT NULL,
  registration_id INT UNSIGNED NOT NULL,
  CONSTRAINT uq_session_registrations_session_registration UNIQUE (session_id, registration_id),
  CONSTRAINT fk_session_registrations_session FOREIGN KEY (session_id) REFERENCES sessions(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_session_registrations_registration FOREIGN KEY (registration_id) REFERENCES registrations(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Supports session roster and capacity count queries.
CREATE INDEX idx_session_registrations_session_id ON session_registrations(session_id);

CREATE TABLE IF NOT EXISTS attendance (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  registration_id INT UNSIGNED NOT NULL,
  session_id INT UNSIGNED NOT NULL,
  checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_in_by INT UNSIGNED NOT NULL,
  CONSTRAINT uq_attendance_registration_session UNIQUE (registration_id, session_id),
  CONSTRAINT fk_attendance_registration FOREIGN KEY (registration_id) REFERENCES registrations(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attendance_session FOREIGN KEY (session_id) REFERENCES sessions(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attendance_checked_in_by FOREIGN KEY (checked_in_by) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Supports attendance counts and reports by session.
CREATE INDEX idx_attendance_session_id ON attendance(session_id);

CREATE TABLE IF NOT EXISTS volunteers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  event_id INT UNSIGNED NOT NULL,
  CONSTRAINT uq_volunteers_user_event UNIQUE (user_id, event_id),
  CONSTRAINT fk_volunteers_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_volunteers_event FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS volunteer_assignments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  volunteer_id INT UNSIGNED NOT NULL,
  session_id INT UNSIGNED NOT NULL,
  task VARCHAR(255) NOT NULL,
  status ENUM('pending', 'in_progress', 'done') NOT NULL DEFAULT 'pending',
  CONSTRAINT fk_volunteer_assignments_volunteer FOREIGN KEY (volunteer_id) REFERENCES volunteers(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_volunteer_assignments_session FOREIGN KEY (session_id) REFERENCES sessions(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Supports assignment lists for each volunteer.
CREATE INDEX idx_volunteer_assignments_volunteer_id ON volunteer_assignments(volunteer_id);

CREATE TABLE IF NOT EXISTS certificates (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  registration_id INT UNSIGNED NOT NULL UNIQUE,
  event_id INT UNSIGNED NOT NULL,
  eligible BOOLEAN NOT NULL DEFAULT FALSE,
  issued_at TIMESTAMP NULL DEFAULT NULL,
  certificate_code CHAR(36) NULL UNIQUE,
  CONSTRAINT fk_certificates_registration FOREIGN KEY (registration_id) REFERENCES registrations(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_certificates_event FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Supports chronological event listings.
CREATE INDEX idx_events_start_at ON events(start_at);
