import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { pool } from '../db.js';

const router = Router();
const managers = ['admin', 'organizer'];

function validId(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

async function eventAccess(eventId, user) {
  const [events] = await pool.execute('SELECT id, created_by FROM events WHERE id = ?', [eventId]);
  if (!events[0]) return { status: 404, error: 'Event not found' };
  if (user.role !== 'admin' && Number(events[0].created_by) !== Number(user.id)) {
    return { status: 403, error: 'Forbidden' };
  }
  return { event: events[0] };
}

// GET /api/analytics/event/:eventId/summary — event owner organizer or admin.
router.get('/event/:eventId/summary', authenticate, requireRole(...managers), async (req, res) => {
  if (!validId(req.params.eventId)) return res.status(400).json({ error: 'eventId must be a positive integer' });
  const access = await eventAccess(req.params.eventId, req.user);
  if (access.error) return res.status(access.status).json({ error: access.error });

  const [rows] = await pool.execute(
    `SELECT event_id, total_registrations AS registrations, total_attended AS attended,
      no_show_count AS no_shows, no_show_rate
     FROM v_event_stats WHERE event_id = ?`,
    [req.params.eventId]
  );
  const row = rows[0] ?? { event_id: Number(req.params.eventId), registrations: 0, attended: 0, no_shows: 0, no_show_rate: 0 };
  return res.json({
    event_id: Number(row.event_id),
    registrations: Number(row.registrations),
    attended: Number(row.attended),
    no_shows: Number(row.no_shows),
    no_show_rate: Number(row.no_show_rate)
  });
});

// GET /api/analytics/event/:eventId/sessions — event owner organizer or admin.
router.get('/event/:eventId/sessions', authenticate, requireRole(...managers), async (req, res) => {
  if (!validId(req.params.eventId)) return res.status(400).json({ error: 'eventId must be a positive integer' });
  const access = await eventAccess(req.params.eventId, req.user);
  if (access.error) return res.status(access.status).json({ error: access.error });

  const [rows] = await pool.execute(
    `SELECT u.session_id, s.title AS session_title, u.capacity, u.registered_count,
      u.attended_count, u.utilization_percent
     FROM v_session_utilization u JOIN sessions s ON s.id = u.session_id
     WHERE u.event_id = ? ORDER BY s.start_at, s.id`,
    [req.params.eventId]
  );
  return res.json(rows.map((row) => ({
    ...row,
    session_id: Number(row.session_id),
    capacity: Number(row.capacity),
    registered_count: Number(row.registered_count),
    attended_count: Number(row.attended_count),
    utilization_percent: Number(row.utilization_percent)
  })));
});

// GET /api/analytics/event/:eventId/volunteers — event owner organizer or admin.
router.get('/event/:eventId/volunteers', authenticate, requireRole(...managers), async (req, res) => {
  if (!validId(req.params.eventId)) return res.status(400).json({ error: 'eventId must be a positive integer' });
  const access = await eventAccess(req.params.eventId, req.user);
  if (access.error) return res.status(access.status).json({ error: access.error });

  const [rows] = await pool.execute(
    `SELECT v.id AS volunteer_id, u.id AS user_id, u.name AS volunteer_name, u.email,
      COUNT(va.id) AS total_tasks,
      COALESCE(SUM(CASE WHEN va.status = 'done' THEN 1 ELSE 0 END), 0) AS done,
      COALESCE(SUM(CASE WHEN va.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN va.status = 'in_progress' THEN 1 ELSE 0 END), 0) AS in_progress
     FROM volunteers v
     JOIN users u ON u.id = v.user_id
     LEFT JOIN volunteer_assignments va ON va.volunteer_id = v.id
     WHERE v.event_id = ?
     GROUP BY v.id, u.id, u.name, u.email ORDER BY u.name, v.id`,
    [req.params.eventId]
  );
  return res.json(rows.map((row) => ({
    ...row,
    volunteer_id: Number(row.volunteer_id),
    user_id: Number(row.user_id),
    total_tasks: Number(row.total_tasks),
    done: Number(row.done),
    pending: Number(row.pending),
    in_progress: Number(row.in_progress)
  })));
});

// GET /api/analytics/overview — organizer's events or all events for admin.
router.get('/overview', authenticate, requireRole(...managers), async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(e.id) AS event_count,
      COALESCE(SUM(v.total_registrations), 0) AS registrations,
      COALESCE(SUM(v.total_attended), 0) AS attended,
      COALESCE(SUM(v.no_show_count), 0) AS no_shows,
      ROUND(COALESCE(100 * SUM(v.no_show_count) / NULLIF(SUM(v.total_registrations), 0), 0), 2) AS no_show_rate
     FROM events e JOIN v_event_stats v ON v.event_id = e.id
     WHERE (? = 'admin' OR e.created_by = ?)`,
    [req.user.role, req.user.id]
  );
  const row = rows[0];
  return res.json({
    event_count: Number(row.event_count),
    registrations: Number(row.registrations),
    attended: Number(row.attended),
    no_shows: Number(row.no_shows),
    no_show_rate: Number(row.no_show_rate)
  });
});

export default router;
