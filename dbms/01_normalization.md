# CampusOps Database Normalization

## 1. Introduction

CampusOps stores event setup and the operational records created around it: users, registrations, sessions, session selections, check-ins, volunteer work, and certificates. This document follows one realistic event-operations record from an unnormalized form through 1NF, 2NF, 3NF, and BCNF, then states the resulting PostgreSQL-oriented relations.

The design targets 3NF and BCNF where the stated business rules support them. It assumes a user may register once per event, a session belongs to one event, a volunteer is a user serving a particular event, and a participant checks into a session only if registered for that session. Event and session capacities are limits; enforcing that concurrent registrations/check-ins never exceed them requires transactional logic in addition to ordinary normalization and constraints.

## 2. Initial unnormalized structure (UNF)

Suppose an organizer exports an event's operations into one report row per event, embedding repeating participant, session, attendance, and volunteer details:

```text
EventOperations(
  event_id, event_title, venue_name, event_start_at,
  participants[{user_id, name, email, registration_id, qr_token,
    registered_at, selected_sessions[{session_id, title,
      attendance[{checked_in_at, checked_in_by}]}]}],
  volunteers[{volunteer_id, user_id, name,
    assignments[{session_id, task, status}]}]
)
```

For example, the annual tech fest row might contain participant U17 with registrations for sessions S2 and S3, attendance timestamps for each, and volunteers assigned to S2 and S3. The nested lists are repeating groups, not scalar values in a relational tuple.

### Problems

- Participant, session, and volunteer values are multivalued/nested, so individual values cannot be addressed as atomic columns.
- Updating a person's email or a session title in a repeated export requires editing many copies and invites inconsistencies.
- Adding a session with no registrations or a volunteer with no assignment may require a blank participant row.
- Deleting the only participant row can accidentally erase the only copy of event/session facts (anomalies).
- The structure does not provide reliable relational keys for preventing duplicate event registrations, session check-ins, or QR tokens.

## 3. First Normal Form (1NF): make values atomic

Replace nested lists with one row per participant-session selection. Repeated event, participant, and session facts are temporarily copied across rows; the key is the combination `(event_id, user_id, session_id)`.

```text
EventOperationLine(
  event_id, event_title, venue_name, event_start_at,
  user_id, participant_name, participant_email,
  registration_id, qr_token, registered_at,
  session_id, session_title, session_start_at,
  attendance_checked_in_at, checked_in_by
)
PK (event_id, user_id, session_id)
```

Each row represents one user registered for one session of one event. A separate atomic relation is needed for assignments because volunteers and assignments are not participant-session rows:

```text
VolunteerAssignmentLine(
  event_id, volunteer_id, volunteer_user_id,
  session_id, task, assignment_status
)
```

These relations meet the atomic-value/repeating-group requirement. They are not yet well normalized: the same event, user, and session facts repeat, and a participant with no selected session needs a different row shape or is omitted. The normalized design therefore separates independent entities and relationships.

## 4. Second Normal Form (2NF): remove partial dependencies

Consider a deliberately combined 1NF attendance relation whose composite key is `(event_id, user_id, session_id)`:

```text
EventParticipantSession(
  event_id, user_id, session_id,
  event_title, participant_name, participant_email, session_title,
  attendance_status
)
PK (event_id, user_id, session_id)
```

Under the business rules:

```text
event_id                         → event_title
user_id                          → participant_name, participant_email
(event_id, user_id)              → registration facts
session_id                       → event_id, session_title
(event_id, user_id, session_id)  → attendance_status
```

The event title depends on only part of the composite key (`event_id`); participant name/email depend on `user_id`, also a proper subset of the key; and session title depends on `session_id`, also a proper subset. Registration facts depend on `(event_id, user_id)`. These partial dependencies mean the combined relation is not in 2NF. Splitting `users` from `registrations` is important because names/emails identify the person while registration status/time are specific to that event participation.

Decompose into `events`, `users`, `registrations`, `sessions`, `session_registrations`, and `attendance`. The entity tables hold facts determined by their own identifiers; the intersection table represents the many-to-many registration/session choice; attendance records the check-in event. This avoids repeating event/user/session descriptions for every selected session and supports registrations before a participant selects sessions.

## 5. Third Normal Form (3NF): remove transitive dependencies

### Venue decision

If events store `venue_id, venue_name, venue_address`, and a venue has stable identity and can host multiple events, then:

```text
event_id → venue_id
venue_id → venue_name, venue_address
```

Venue name/address are transitively dependent on `event_id`. Since venues are explicitly within scope and may be shared, this design uses `venues(venue_id, name, address)` and `events.venue_id`. If CampusOps later confirms each venue value is just free-form event-specific text with no reuse/identity, a venue table is not required; that would be a different documented business rule.

### Other transitive dependencies

- Do not copy `participant_name` or email into `registrations`; `registration_id → user_id`, and `user_id → name, email, password_hash, role`.
- Do not copy `event_title` into `sessions`; `session_id → event_id`, and `event_id → title, ...`.
- Do not store `event_id` in `certificates` when it is derivable through `registration_id → event_id`. The conceptual input listed it, but retaining both creates the risk of a certificate pointing to a different event than its registration. The final relation omits it and joins through `registrations`.
- Volunteer assignments identify sessions through their volunteer and session references. The design requires each assignment's session to belong to the volunteer's event; this cross-row consistency rule is addressed in the constraint/assumption notes below rather than copying descriptive event data into assignments.

The result separates facts about users, events, venues, sessions, event registrations, session selections, attendance, volunteers, assignments, and certificates. No non-key descriptive attribute is stored in a relation merely because it is convenient to display there.

## 6. BCNF analysis

BCNF requires every nontrivial determinant to be a superkey. Under the functional dependencies stated below and the final keys, each final relation is in BCNF. The claim relies on these business rules: email is unique per user, QR token and certificate code are unique, one user registers once per event, and the relevant pair uniqueness constraints hold. If those rules change, revisit the candidate keys and BCNF assessment.

The association tables have composite candidate keys. Their pair attributes do not independently determine other stored descriptive attributes. `attendance` keeps a surrogate `attendance_id`, but also has the candidate key `(registration_id, session_id)`; that pair determines the check-in facts. `volunteer_assignments` uses `assignment_id` as its key and does not assume a volunteer/session pair is unique, because a volunteer may have multiple distinct tasks for one session unless product rules prohibit it.

The session-registration, attendance, and volunteer-assignment relations also require cross-row event-scope validation: a registration, its selected/check-in session, and a volunteer assignment's session must belong to the same event. Ordinary single-column foreign keys establish that referenced rows exist but do not by themselves prove this equality. The proposed PostgreSQL schema enforces the invariant with triggers and prevents changing the event ownership of sessions, registrations, or volunteer records after creation. Attendance is additionally constrained to a valid session-registration pair. This preserves the lean normalized columns without copying `event_id` into relationship tables.

## 7. Functional dependencies

`X → Y` means values of determinant `X` uniquely determine values of `Y`.

| Relation | Principal functional dependencies |
|---|---|
| users | `user_id → name, email, password_hash, role`; `email → user_id, name, password_hash, role` (email unique) |
| venues | `venue_id → name, address`; `(name, address) → venue_id` only if the product adopts that natural-key rule (not assumed here) |
| events | `event_id → title, description, venue_id, start_at, end_at, capacity, created_by` |
| sessions | `session_id → event_id, title, speaker, start_at, end_at, capacity` |
| registrations | `registration_id → event_id, user_id, qr_token, status, registered_at`; `(event_id, user_id) → registration_id, qr_token, status, registered_at`; `qr_token → registration_id, event_id, user_id, status, registered_at` |
| session_registrations | `(session_id, registration_id) →` no additional descriptive attributes; the pair is the candidate key |
| attendance | `attendance_id → registration_id, session_id, checked_in_at, checked_in_by`; `(registration_id, session_id) → attendance_id, checked_in_at, checked_in_by` |
| volunteers | `volunteer_id → user_id, event_id`; `(user_id, event_id) → volunteer_id` (one volunteer record per user/event) |
| volunteer_assignments | `assignment_id → volunteer_id, session_id, task, status` |
| certificates | `certificate_id → registration_id, eligible, issued_at, certificate_code`; `registration_id → certificate_id, eligible, issued_at, certificate_code` (one certificate record per registration); `certificate_code → certificate_id, registration_id, eligible, issued_at` |

The normalized design removes the earlier partial dependencies (`event_id → event_title`, user/registration identity → participant facts, `session_id → session_title`) and transitive dependencies (for example `event_id → venue_id → venue details`).

## 8. Candidate keys and constraints

- **Users:** candidate keys `user_id`, `email`; primary key `user_id`; unique constraint on `email`.
- **Events:** candidate key and primary key `event_id`.
- **Venues:** candidate key and primary key `venue_id`.
- **Sessions:** candidate key and primary key `session_id`.
- **Registrations:** candidate keys `registration_id`, `(event_id, user_id)`, `qr_token`; primary key `registration_id`; unique constraints on the two alternatives.
- **Session registrations:** candidate key and primary key `(session_id, registration_id)`.
- **Attendance:** candidate keys `attendance_id`, `(registration_id, session_id)`; primary key `attendance_id`; pair unique.
- **Volunteers:** candidate keys `volunteer_id`, `(user_id, event_id)`; primary key `volunteer_id`; pair unique.
- **Volunteer assignments:** candidate key and primary key `assignment_id`.
- **Certificates:** candidate keys `certificate_id`, `registration_id`, `certificate_code`; primary key `certificate_id`; unique constraints on registration and code.

Foreign keys connect: `events.venue_id → venues`, `events.created_by → users`, `sessions.event_id → events`, `registrations.event_id → events`, `registrations.user_id → users`, `session_registrations → sessions/registrations`, `attendance → registrations/sessions/users`, `volunteers → users/events`, `volunteer_assignments → volunteers/sessions`, and `certificates → registrations`.

## 9. Final normalized relations

```text
users(
  user_id PK, name, email UNIQUE, password_hash, role
)

venues(
  venue_id PK, name, address
)

events(
  event_id PK, title, description, venue_id FK, start_at, end_at,
  capacity, created_by FK → users.user_id
)

sessions(
  session_id PK, event_id FK → events.event_id, title, speaker,
  start_at, end_at, capacity
)

registrations(
  registration_id PK, event_id FK → events.event_id,
  user_id FK → users.user_id, qr_token UNIQUE, status, registered_at,
  UNIQUE(event_id, user_id)
)

session_registrations(
  session_id FK → sessions.session_id,
  registration_id FK → registrations.registration_id,
  PRIMARY KEY(session_id, registration_id)
)

attendance(
  attendance_id PK, registration_id FK, session_id FK,
  checked_in_at, checked_in_by FK → users.user_id,
  UNIQUE(registration_id, session_id),
  FOREIGN KEY(session_id, registration_id)
    → session_registrations(session_id, registration_id)
)

volunteers(
  volunteer_id PK, user_id FK → users.user_id,
  event_id FK → events.event_id, UNIQUE(user_id, event_id)
)

volunteer_assignments(
  assignment_id PK, volunteer_id FK → volunteers.volunteer_id,
  session_id FK → sessions.session_id, task, status
)

certificates(
  certificate_id PK, registration_id FK UNIQUE → registrations.registration_id,
  eligible, issued_at, certificate_code UNIQUE
)
```

Use `NOT NULL` for required identifiers, ownership references, names, timestamps, statuses, and token/code values. Use `CHECK` constraints for nonnegative capacities, `end_at > start_at`, and enumerated role/status values where the allowed vocabulary is settled. A QR token should be generated with sufficient entropy; the database unique constraint protects against collisions. Eligibility and issuance are separate facts: only eligible records may be issued, which can be checked at issuance time or with a carefully designed constraint/trigger.

## 10. Normalization summary

| Stage | CampusOps transformation | Outcome |
|---|---|---|
| UNF | Nested participants, sessions, attendance, and volunteer assignments in event report rows | Repeating groups, duplication, and update anomalies |
| 1NF | One atomic participant-session row; assignments in atomic rows | Atomic values, but facts repeat |
| 2NF | Separate event, user, registration, session, selection, and attendance facts | No partial dependency on a composite key |
| 3NF | Separate shared venues; derive event and user details through their owning relations | No non-key attribute transitively depends on a key |
| BCNF | Check every determinant against candidate keys and enforce alternate keys with UNIQUE constraints | All stated final relations satisfy BCNF under listed assumptions |

## 11. Decisions for team review

1. Confirm venues are reusable, identifiable resources; this document models them as `venues`.
2. Confirm one certificate record per event registration, even if it is initially ineligible; `registration_id` is unique in `certificates`.
3. Review the selected PostgreSQL trigger strategy for same-event scope and immutable event ownership before production use.
4. Confirm whether multiple assignments by the same volunteer to the same session are valid and whether certificate reissue history is needed (history would require multiple certificate rows and a different key rule).
