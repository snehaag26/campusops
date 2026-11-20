# CampusOps API

## Install

Use Node.js 20 or newer, then run:

```sh
npm install
```

## Environment

Copy `.env.example` to `.env` inside `server/` and set the MySQL connection values, a private `JWT_SECRET`, and the frontend `CLIENT_ORIGIN`. Create the `campusops` database and the shared `users` table before starting the API.

## Run

From `server/`:

```sh
npm run dev
# or
npm start
```

The auth routes are mounted at `/api/auth`: `POST /register`, `POST /login`, and authenticated `GET /me`.
