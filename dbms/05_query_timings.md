# PostgreSQL query timings

Measured from `dbms/04_queries.sql` in PostgreSQL 18.6 (Postgres.app) on Apple silicon, 2026-11-23.
The existing PostgreSQL cluster was used only to host the isolated database `campusops_query_timing_20261123`.
Fixture: one event (id 1), two sessions, two confirmed registrations, three selected session registrations, one attendance row, one volunteer assignment, and one issued certificate; query 5 used registration 1’s seeded QR token. Queries were run unchanged apart from substituting that token for its documented placeholder.
Each query was executed three consecutive times in one `psql` session with `\timing` enabled. Times are client-reported query durations in milliseconds, rounded to 3 decimals; averages use unrounded values. Plans are estimated `EXPLAIN` plans without `ANALYZE` and are stored in `dbms/plans/`.

| Query | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Average (ms) |
| --- | ---: | ---: | ---: | ---: |
| 1. Event dashboard: confirmed registrations, event capacity, and session count. | 2.610 | 0.374 | 0.296 | 1.093 |
| 2. Registration roster for an event, including each participant's QR token. | 1.944 | 0.238 | 0.211 | 0.798 |
| 3. Session utilization: selected participants, check-ins, and capacity. | 2.383 | 0.439 | 0.306 | 1.043 |
| 4. No-show roster for one session (selected, confirmed participants not checked in). | 2.844 | 0.465 | 0.411 | 1.240 |
| 5. Validate a QR token for check-in to a specific session. | 2.584 | 0.568 | 0.501 | 1.218 |
| 6. A participant's selected session schedule for one event. | 2.759 | 0.641 | 0.588 | 1.329 |
| 7. Volunteer assignments for an event, with volunteer and session details. | 2.148 | 0.321 | 0.265 | 0.911 |
| 8. Session staffing coverage, including sessions without assignments. | 1.932 | 0.222 | 0.164 | 0.773 |
| 9. Certificate review report. | 2.352 | 0.422 | 0.353 | 1.042 |
| 10. Event analytics: registration, attendance, and event-level no-show counts. | 2.159 | 0.329 | 0.276 | 0.921 |
| 11. Issued certificates for one event, with recipient and registration status. | 1.966 | 0.278 | 0.237 | 0.827 |

Plans: [`query_01_plan.txt`](plans/query_01_plan.txt), [`query_02_plan.txt`](plans/query_02_plan.txt), [`query_03_plan.txt`](plans/query_03_plan.txt), [`query_04_plan.txt`](plans/query_04_plan.txt), [`query_05_plan.txt`](plans/query_05_plan.txt), [`query_06_plan.txt`](plans/query_06_plan.txt), [`query_07_plan.txt`](plans/query_07_plan.txt), [`query_08_plan.txt`](plans/query_08_plan.txt), [`query_09_plan.txt`](plans/query_09_plan.txt), [`query_10_plan.txt`](plans/query_10_plan.txt), [`query_11_plan.txt`](plans/query_11_plan.txt).
