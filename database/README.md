# CampusOps Database

CampusOps uses a relational database for event operations. No SQL database implementation, migration, or schema file was present when this documentation was prepared, so the project design adopts **PostgreSQL** as the proposed database.

## Design documents

- [Normalization](../dbms/01_normalization.md) — UNF through BCNF and final relations.
- [ER diagram](../dbms/02_er_diagram.md) — entities, relationships, assumptions, Mermaid source, and [PNG](../dbms/02_er_diagram.png).
- [Functional dependencies](../dbms/03_functional_dependencies.md) — keys, dependencies, and BCNF check.
- [Database design](../dbms/04_database_design.md) — PostgreSQL types, constraints, referential actions, and indexes.
- [PostgreSQL schema](../dbms/03_schema.sql) — executable table, constraint, trigger, and index definitions.

The normalized design separates users, events, venues, sessions, registrations, session selections, attendance, volunteers, assignments, and certificates. The SQL file is the initial schema foundation; application migrations and capacity enforcement are not included.

Review the remaining assumptions recorded in the design docs, especially whether multiple volunteer assignments per volunteer/session and certificate reissue history are required.
