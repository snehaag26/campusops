# CampusOps Database

CampusOps uses a relational database for event operations. No SQL database implementation, migration, or schema file was present when this documentation was prepared, so the project design adopts **PostgreSQL** as the proposed database.

## Design documents

- [Normalization](../dbms/01_normalization.md) — UNF through BCNF and final relations.
- [ER diagram](../dbms/02_er_diagram.md) — entities, relationships, assumptions, and Mermaid diagram.
- [Functional dependencies](../dbms/03_functional_dependencies.md) — keys, dependencies, and BCNF check.
- [Database design](../dbms/04_database_design.md) — PostgreSQL types, constraints, referential actions, and indexes.

The normalized design separates users, events, venues, sessions, registrations, session selections, attendance, volunteers, assignments, and certificates. Schema and migrations are intentionally not included in this documentation task.

Before implementing the schema, the team should settle the open assumptions recorded in the design docs, especially event-scope validation for session selections/volunteer assignments, allowed role and status values, and certificate lifecycle.
