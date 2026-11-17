# CampusOps Functional Dependencies

## Notation and assumptions

`X → Y` states that each value of `X` identifies exactly one value of `Y`. Candidate keys are minimal superkeys. The dependencies below assume unique user email, QR token, and certificate code; one registration per user/event; one volunteer record per user/event; one attendance per registration/session; and one certificate record per registration. A functional dependency follows from an enforced business rule, not merely from sample data.

## Relation-by-relation dependencies

| Relation | Candidate key(s) | Functional dependencies |
|---|---|---|
| `users(user_id, name, email, password_hash, role)` | `user_id`; `email` | `user_id → name,email,password_hash,role`; `email → user_id,name,password_hash,role` |
| `venues(venue_id, name, address)` | `venue_id` | `venue_id → name,address` |
| `events(event_id, title, description, venue_id, start_at, end_at, capacity, created_by)` | `event_id` | `event_id → title,description,venue_id,start_at,end_at,capacity,created_by` |
| `sessions(session_id, event_id, title, speaker, start_at, end_at, capacity)` | `session_id` | `session_id → event_id,title,speaker,start_at,end_at,capacity` |
| `registrations(registration_id, event_id, user_id, qr_token, status, registered_at)` | `registration_id`; `(event_id,user_id)`; `qr_token` | `registration_id → event_id,user_id,qr_token,status,registered_at`; `(event_id,user_id) → registration_id,qr_token,status,registered_at`; `qr_token → registration_id,event_id,user_id,status,registered_at` |
| `session_registrations(session_id, registration_id)` | `(session_id,registration_id)` | Pair determines the row; no non-key descriptive attributes |
| `attendance(attendance_id, registration_id, session_id, checked_in_at, checked_in_by)` | `attendance_id`; `(registration_id,session_id)` | `attendance_id → registration_id,session_id,checked_in_at,checked_in_by`; pair → `attendance_id,checked_in_at,checked_in_by` |
| `volunteers(volunteer_id, user_id, event_id)` | `volunteer_id`; `(user_id,event_id)` | `volunteer_id → user_id,event_id`; `(user_id,event_id) → volunteer_id` |
| `volunteer_assignments(assignment_id, volunteer_id, session_id, task, status)` | `assignment_id` | `assignment_id → volunteer_id,session_id,task,status` |
| `certificates(certificate_id, registration_id, eligible, issued_at, certificate_code)` | `certificate_id`; `registration_id`; `certificate_code` | `certificate_id → registration_id,eligible,issued_at,certificate_code`; `registration_id → certificate_id,eligible,issued_at,certificate_code`; `certificate_code → certificate_id,registration_id,eligible,issued_at` |

## Partial dependencies in the denormalized attendance example

For `EventParticipantSession(event_id,user_id,session_id,event_title,participant_name,participant_email,session_title,attendance_status)` with key `(event_id,user_id,session_id)`, event title depends on `event_id`; session title depends on `session_id`; participant identity facts depend on the event registration identity, not on the full participant-session key. These partial dependencies violate 2NF. Split the relation into event, user, registration, session, session-selection, and attendance relations. Because users may attend multiple events, name/email alone are not registration attributes; they are determined by `user_id`.

## Transitive dependencies

If venue name/address were stored in events:

```text
event_id → venue_id
venue_id → venue_name, venue_address
therefore event_id → venue_name, venue_address (transitively)
```

Store venue details in `venues`. Likewise, registration rows should store `user_id`, not copied user details, and session rows should store `event_id`, not copied event title. Certificates store registration identity only; event identity is determined through `registration_id → event_id` in registrations.

## BCNF check

In each listed relation, every nontrivial determinant is a candidate key (or an alternate key declared UNIQUE). The two pure association/relationship relations use composite or surrogate keys as listed; they contain no descriptive fact determined by a proper subset of a composite key. Thus these relations satisfy BCNF under the stated assumptions.

Event-scope matching is an inclusion/business constraint, not one of the listed single-relation dependencies: a session selected or checked into must belong to the same event as the registration, and an assignment's session must belong to the volunteer's event. The schema implements this equality with PostgreSQL triggers and makes event ownership immutable for sessions, registrations, and volunteer records. The lean relations do not repeat `event_id` in the relationship tables.
