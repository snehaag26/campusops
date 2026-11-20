import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { pool, withTransaction } from '../db.js';

const router = Router();

function validId(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

async function eventAccess(eventId, user) {
  const [events] = await pool.execute('SELECT id, created_by FROM events WHERE id = ?', [eventId]);
  const event = events[0];
  if (!event) return { status: 404, error: 'Event not found' };
  if (user.role !== 'admin' && event.created_by !== user.id) return { status: 403, error: 'Forbidden' };
  return { event };
}

// POST /api/attendance/check-in — volunteer, organizer, or admin.
router.post('/check-in', authenticate, requireRole('volunteer', 'organizer', 'admin'), async (req, res) => {
  const { qrToken, sessionId } = req.body ?? {};
  if (typeof qrToken !== 'string' || !qrToken.trim()) return res.status(400).json({ error: 'qrToken required' });
  if (!validId(sessionId)) return res.status(400).json({ error: 'sessionId required' });

  try {
    const result = await withTransaction(async (connection) => {
      const [registrations] = await connection.execute(
        'SELECT r.id, r.status, u.id AS user_id, u.name AS participant_name FROM registrations r JOIN users u ON u.id = r.user_id WHERE r.qr_token = ? FOR UPDATE',
        [qrToken.trim()]
      );
      const registration = registrations[0];
      if (!registration) return { status: 404, body: { error: 'QR token not found' } };
      if (registration.status === 'cancelled') return { status: 409, body: { error: 'Registration is cancelled' } };

      const [sessions] = await connection.execute(
        'SELECT s.id, s.title, s.start_at, s.end_at FROM sessions s JOIN session_registrations sr ON sr.session_id = s.id WHERE s.id = ? AND sr.registration_id = ?',
        [sessionId, registration.id]
      );
      const session = sessions[0];
      if (!session) return { status: 409, body: { error: 'Not registered for this session' } };

      const [existing] = await connection.execute(
        'SELECT id FROM attendance WHERE registration_id = ? AND session_id = ?',
        [registration.id, session.id]
      );
      if (existing[0]) return { status: 409, body: { error: 'Already checked in' } };

      await connection.execute(
        'INSERT INTO attendance (registration_id, session_id, checked_in_by) VALUES (?, ?, ?)',
        [registration.id, session.id, req.user.id]
      );
      const [attendance] = await connection.execute(
        'SELECT checked_in_at FROM attendance WHERE registration_id = ? AND session_id = ?',
        [registration.id, session.id]
      );

      return {
        status: 201,
        body: {
          participantName: registration.participant_name,
          sessionTitle: session.title,
          sessionTime: { startAt: session.start_at, endAt: session.end_at },
          checkedInAt: attendance[0].checked_in_at
        }
      };
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Already checked in' });
    throw error;
  }
});

// GET /api/attendance/session/:sessionId — organizer who owns the event or admin.
router.get('/session/:sessionId', authenticate, requireRole('organizer', 'admin'), async (req, res) => {
  if (!validId(req.params.sessionId)) return res.status(400).json({ error: 'sessionId must be a positive integer' });
  const [sessions] = await pool.execute(
    'SELECT s.id, s.event_id, e.created_by FROM sessions s JOIN events e ON e.id = s.event_id WHERE s.id = ?',
    [req.params.sessionId]
  );
  const session = sessions[0];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (req.user.role !== 'admin' && session.created_by !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const [attendees] = await pool.execute(
    `SELECT a.id AS attendance_id, a.registration_id, u.id AS user_id, u.name, u.email,
      a.checked_in_at, a.checked_in_by
     FROM attendance a
     JOIN registrations r ON r.id = a.registration_id
     JOIN users u ON u.id = r.user_id
     WHERE a.session_id = ?
     ORDER BY a.checked_in_at, a.id`,
    [session.id]
  );
  return res.json(attendees);
});

// GET /api/attendance/event/:eventId/no-shows — organizer who owns the event or admin.
router.get('/event/:eventId/no-shows', authenticate, requireRole('organizer', 'admin'), async (req, res) => {
  if (!validId(req.params.eventId)) return res.status(400).json({ error: 'eventId must be a positive integer' });
  const access = await eventAccess(req.params.eventId, req.user);
  if (access.error) return res.status(access.status).json({ error: access.error });

  const [noShows] = await pool.execute(
    `SELECT r.id AS registration_id, u.id AS user_id, u.name, u.email, r.registered_at
     FROM registrations r
     JOIN users u ON u.id = r.user_id
     WHERE r.event_id = ? AND r.status <> 'cancelled'
       AND NOT EXISTS (
         SELECT 1 FROM attendance a
         JOIN sessions s ON s.id = a.session_id
         WHERE a.registration_id = r.id AND s.event_id = r.event_id
       )
     ORDER BY u.name, u.id`,
    [req.params.eventId]
  );
  return res.json(noShows);
});

// GET /api/attendance/event/:eventId/summary — organizer who owns the event or admin.
router.get('/event/:eventId/summary', authenticate, requireRole('organizer', 'admin'), async (req, res) => {
  if (!validId(req.params.eventId)) return res.status(400).json({ error: 'eventId must be a positive integer' });
  const access = await eventAccess(req.params.eventId, req.user);
  if (access.error) return res.status(access.status).json({ error: access.error });

  const [sessions] = await pool.execute(
    `SELECT s.id AS session_id, s.title, s.start_at,
      COUNT(a.id) AS attended_count
     FROM sessions s
     LEFT JOIN attendance a ON a.session_id = s.id
     WHERE s.event_id = ?
     GROUP BY s.id, s.title, s.start_at
     ORDER BY s.start_at`,
    [req.params.eventId]
  );
  const eventTotal = sessions.reduce((total, session) => total + Number(session.attended_count), 0);
  return res.json({ sessions, eventTotal });
});

export default router;
