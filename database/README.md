# CampusOps MySQL database

CampusOps uses MySQL 8 with InnoDB tables and `utf8mb4`. Part 1 creates the nine core tables and loads a small demo dataset.

## Setup

Run these commands from the repository root on a local MySQL 8 installation. They prompt for the MySQL root password. `schema.sql` creates and selects the `campusops` database; run it against an empty database because it uses `CREATE TABLE IF NOT EXISTS` and does not drop existing data.

```sh
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

To inspect seeded row counts:

```sh
mysql -u root -p campusops -e "SELECT 'users' AS table_name, COUNT(*) AS rows_count FROM users UNION ALL SELECT 'events', COUNT(*) FROM events UNION ALL SELECT 'sessions', COUNT(*) FROM sessions UNION ALL SELECT 'registrations', COUNT(*) FROM registrations UNION ALL SELECT 'session_registrations', COUNT(*) FROM session_registrations UNION ALL SELECT 'attendance', COUNT(*) FROM attendance UNION ALL SELECT 'volunteers', COUNT(*) FROM volunteers UNION ALL SELECT 'volunteer_assignments', COUNT(*) FROM volunteer_assignments UNION ALL SELECT 'certificates', COUNT(*) FROM certificates;"
```

## Demo accounts

All seeded accounts use the password `CampusOpsDemo123!` (bcrypt cost 12).

| Role | Email |
| --- | --- |
| Admin | `admin@campusops.test` |
| Organizer | `organizer@campusops.test` |
| Volunteer | `volunteer1@campusops.test`, `volunteer2@campusops.test` |
| Participant | `aditi@campusops.test` and `kabir`, `isha`, `rohan`, `mira`, `dev`, `sara`, `neel`, `tara`, `arjun` at `@campusops.test` |

## Entity relationship diagram

```mermaid
erDiagram
  USERS ||--o{ EVENTS : creates
  USERS ||--o{ REGISTRATIONS : makes
  EVENTS ||--o{ SESSIONS : contains
  EVENTS ||--o{ REGISTRATIONS : receives
  SESSIONS ||--o{ SESSION_REGISTRATIONS : offers
  REGISTRATIONS ||--o{ SESSION_REGISTRATIONS : selects
  REGISTRATIONS ||--o{ ATTENDANCE : records
  SESSIONS ||--o{ ATTENDANCE : tracks
  USERS ||--o{ ATTENDANCE : checks_in
  USERS ||--o{ VOLUNTEERS : serves_as
  EVENTS ||--o{ VOLUNTEERS : assigns
  VOLUNTEERS ||--o{ VOLUNTEER_ASSIGNMENTS : receives
  SESSIONS ||--o{ VOLUNTEER_ASSIGNMENTS : staffs
  REGISTRATIONS ||--o| CERTIFICATES : earns
  EVENTS ||--o{ CERTIFICATES : awards

  USERS {
    int id PK
    varchar name
    varchar email UK
    varchar password_hash
    enum role
    timestamp created_at
  }
  EVENTS {
    int id PK
    varchar title
    text description
    varchar venue
    datetime start_at
    datetime end_at
    int capacity
    int created_by FK
  }
  SESSIONS {
    int id PK
    int event_id FK
    varchar title
    varchar speaker
    datetime start_at
    datetime end_at
    int capacity
  }
  REGISTRATIONS {
    int id PK
    int event_id FK
    int user_id FK
    char qr_token UK
    enum status
    timestamp registered_at
  }
  SESSION_REGISTRATIONS {
    int id PK
    int session_id FK
    int registration_id FK
  }
  ATTENDANCE {
    int id PK
    int registration_id FK
    int session_id FK
    timestamp checked_in_at
    int checked_in_by FK
  }
  VOLUNTEERS {
    int id PK
    int user_id FK
    int event_id FK
  }
  VOLUNTEER_ASSIGNMENTS {
    int id PK
    int volunteer_id FK
    int session_id FK
    varchar task
    enum status
  }
  CERTIFICATES {
    int id PK
    int registration_id FK
    int event_id FK
    boolean eligible
    timestamp issued_at
    char certificate_code UK
  }
```
