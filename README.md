# CampusOps

CampusOps is a college project API for event operations. The Node.js and Express server uses MySQL for users, events, registrations, sessions, attendance, volunteer assignments, and certificates.

## Requirements

- Node.js 20 or newer
- MySQL 8

## Database setup

From the repository root, create the schema and demo data, then install the database rules and reporting objects:

```sh
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
mysql -u root -p campusops < database/triggers.sql
mysql -u root -p campusops < database/procedures.sql
mysql -u root -p campusops < database/views.sql
```

The seed accounts all use `CampusOpsDemo123!`. The admin account is `admin@campusops.test`, the organizer is `organizer@campusops.test`, and volunteer/participant emails are listed in [database/README.md](database/README.md).

## Run the API

```sh
cd server
npm install
cp .env.example .env
```

Set `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and a private `JWT_SECRET` in `server/.env`. Keep `.env` local. Start the API with:

```sh
npm run dev
```

The server listens on `http://localhost:3000` by default. Auth endpoints are under `/api/auth`; use `POST /api/auth/login` with a demo email and password to get a bearer token.

## Certificate endpoints

- `POST /api/certificates/event/:eventId/evaluate` — admin or event owner organizer; JSON body: `{ "minPercent": 60 }`.
- `GET /api/certificates/me` — logged in participant's certificates.
- `GET /api/certificates/:id/download` — eligible certificate PDF for its participant or an admin.

Admin user management is under `/api/users` and is limited to admins. Routes return plain JSON; send the login token as `Authorization: Bearer <token>`.

## Project layout

```text
database/                 MySQL schema, seed, triggers, procedure, views, examples
server/server.js          API entry point
server/src/app.js         Express app and route auto-mounting
server/src/auth.js        JWT authentication and role checks
server/src/db.js          MySQL connection pool and transaction helper
server/src/routes/        API handlers
```

This MVP keeps SQL in route handlers and uses parameterized queries. It is intended as an explainable course project.
