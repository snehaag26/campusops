# CampusOps frontend

React and Vite interface for the CampusOps API.

## Run locally

```sh
npm install
cp .env.example .env
npm run dev
```

The app opens at `http://localhost:5173`. Set `VITE_API_BASE_URL` in `.env` if the API is not at `http://localhost:3000/api`. The API and MySQL database must be running for sign-in and data actions to work.

## Try it without the backend

Choose **Open interactive demo** on the sign-in screen to explore as an admin, organizer, participant, or volunteer. Demo events, accounts, registrations, and actions are stored in this browser only; they are separate from the real API. Sign out to switch roles. The demo certificate download is a text preview, not a production PDF.

## Included screens

- Sign in and participant registration
- Overview and event management
- Event registrations with participant QR codes
- Sessions and session sign-up
- Attendance summaries and QR check-in
- Certificate list, evaluation, and PDF download
- Admin user list and account creation
- Local demo workspace with sample records and persistent in-browser interactions
