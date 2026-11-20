import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { pool, withTransaction } from '../db.js';

const router = Router();
const managers = ['admin', 'organizer'];

function validId(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

function dateTime(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const input = value.trim();
  const local = input.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?$/);
  if (local) {
    const [, year, month, day, hour, minute, second = '00'] = local;
    const parts = [Number(year), Number(month), Number(day), Number(hour), Number(minute), Number(second)];
    const date = new Date(Date.UTC(...parts));
    if (date.getUTCFullYear() !== parts[0] || date.getUTCMonth() + 1 !== parts[1] || date.getUTCDate() !== parts[2]
      || date.getUTCHours() !== parts[3] || date.getUTCMinutes() !== parts[4] || date.getUTCSeconds() !== parts[5]) return null;
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function validCapacity(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

async function canManageEvent(eventId, user) {
  const [events] = await pool.execute('SELECT id, created_by FROM events WHERE id = ?', [eventId]);
  const event = events[0];
  if (!event) return { error: 'Event not found', status: 404 };
  if (user.role !== 'admin' && event.created_by !== user.id) return { error: 'Forbidden', status: 403 };
  return { event };
}

async function timesFitEvent(eventId, startAt, endAt) {
  const [events] = await pool.execute(
    'SELECT id FROM events WHERE id = ? AND start_at <= ? AND end_at >= ?',
    [eventId, startAt, endAt]
  );
  return events.length > 0;
}

const countsQuery = `
  SELECT s.id, s.event_id, s.title, s.speaker, s.start_at, s.end_at, s.capacity,
    (SELECT COUNT(*) FROM session_registrations sr WHERE sr.session_id = s.id) AS registered_count,
    (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id) AS attended_count,
    s.capacity - (SELECT COUNT(*) FROM session_registrations sr WHERE sr.session_id = s.id) AS seats_left
  FROM sessions s`;

// GET /api/sessions/event/:eventId — public session list and counts.
router.get('/event/:eventId', async (req, res) => {
  if (!validId(req.params.eventId)) return res.status(400).json({ error: 'eventId must be a positive integer' });
  const [events] = await pool.execute('SELECT id FROM events WHERE id = ?', [req.params.eventId]);
  if (!events[0]) return res.status(404).json({ error: 'Event not found' });
  const [sessions] = await pool.execute(`${countsQuery} WHERE s.event_id = ? ORDER BY s.start_at`, [req.params.eventId]);
  return res.json(sessions);
});

// GET /api/sessions/:id — public session details and counts.
router.get('/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'id must be a positive integer' });
  const [sessions] = await pool.execute(`${countsQuery} WHERE s.id = ?`, [req.params.id]);
  if (!sessions[0]) return res.status(404).json({ error: 'Session not found' });
  return res.json(sessions[0]);
});

// POST /api/sessions — organizer who owns the event or admin.
router.post('/', authenticate, requireRole(...managers), async (req, res) => {
  const { eventId, title, speaker = null, startAt, endAt, capacity } = req.body ?? {};
  if (!validId(eventId)) return res.status(400).json({ error: 'eventId required' });
  if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'title required' });
  if (speaker !== null && typeof speaker !== 'string') return res.status(400).json({ error: 'speaker must be a string' });
  if (!validCapacity(capacity)) return res.status(400).json({ error: 'capacity must be a positive integer' });
  const start = dateTime(startAt);
  const end = dateTime(endAt);
  if (!start || !end || start >= end) return res.status(400).json({ error: 'valid startAt and endAt required; startAt must be before endAt' });

  const access = await canManageEvent(eventId, req.user);
  if (access.error) return res.status(access.status).json({ error: access.error });
  if (!(await timesFitEvent(eventId, start, end))) {
    return res.status(400).json({ error: 'Session times must be inside the event' });
  }

  const [result] = await pool.execute(
    'INSERT INTO sessions (event_id, title, speaker, start_at, end_at, capacity) VALUES (?, ?, ?, ?, ?, ?)',
    [eventId, title.trim(), speaker, start, end, Number(capacity)]
  );
  return res.status(201).json({ id: result.insertId, eventId: Number(eventId), title: title.trim(), speaker, startAt: start, endAt: end, capacity: Number(capacity) });
});

// PUT /api/sessions/:id — organizer who owns the event or admin.
router.put('/:id', authenticate, requireRole(...managers), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'id must be a positive integer' });
  const { title, speaker = null, startAt, endAt, capacity } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'title required' });
  if (speaker !== null && typeof speaker !== 'string') return res.status(400).json({ error: 'speaker must be a string' });
  if (!validCapacity(capacity)) return res.status(400).json({ error: 'capacity must be a positive integer' });
  const start = dateTime(startAt);
  const end = dateTime(endAt);
  if (!start || !end || start >= end) return res.status(400).json({ error: 'valid startAt and endAt required; startAt must be before endAt' });

  const [sessions] = await pool.execute(
    'SELECT s.id, s.event_id, e.created_by FROM sessions s JOIN events e ON e.id = s.event_id WHERE s.id = ?',
    [req.params.id]
  );
  const session = sessions[0];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (req.user.role !== 'admin' && session.created_by !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (!(await timesFitEvent(session.event_id, start, end))) {
    return res.status(400).json({ error: 'Session times must be inside the event' });
  }

  const [[{ registered }]] = await pool.execute(
    'SELECT COUNT(*) AS registered FROM session_registrations WHERE session_id = ?',
    [session.id]
  );
  if (Number(capacity) < Number(registered)) return res.status(409).json({ error: 'Capacity cannot be below current registrations' });
  await pool.execute(
    'UPDATE sessions SET title = ?, speaker = ?, start_at = ?, end_at = ?, capacity = ? WHERE id = ?',
    [title.trim(), speaker, start, end, Number(capacity), session.id]
  );
  return res.json({ id: session.id, eventId: session.event_id, title: title.trim(), speaker, startAt: start, endAt: end, capacity: Number(capacity) });
});

// DELETE /api/sessions/:id — organizer who owns the event or admin.
router.delete('/:id', authenticate, requireRole(...managers), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'id must be a positive integer' });
  const [sessions] = await pool.execute(
    'SELECT s.id, e.created_by FROM sessions s JOIN events e ON e.id = s.event_id WHERE s.id = ?',
    [req.params.id]
  );
  if (!sessions[0]) return res.status(404).json({ error: 'Session not found' });
  if (req.user.role !== 'admin' && sessions[0].created_by !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  await pool.execute('DELETE FROM sessions WHERE id = ?', [req.params.id]);
  return res.json({ message: 'Session deleted' });
});

// POST /api/sessions/:id/register — participant with own registration, organizer, or admin.
router.post('/:id/register', authenticate, requireRole('participant', ...managers), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'id must be a positive integer' });
  const registrationId = req.body?.registrationId;
  if (!validId(registrationId)) return res.status(400).json({ error: 'registrationId required' });

  const result = await withTransaction(async (connection) => {
    const [sessions] = await connection.execute('SELECT id, event_id, capacity FROM sessions WHERE id = ? FOR UPDATE', [req.params.id]);
    const session = sessions[0];
    if (!session) return { status: 404, body: { error: 'Session not found' } };

    const [registrations] = await connection.execute(
      'SELECT id, event_id, user_id, status FROM registrations WHERE id = ?',
      [registrationId]
    );
    const registration = registrations[0];
    if (!registration) return { status: 404, body: { error: 'Registration not found' } };
    if (registration.event_id !== session.event_id) return { status: 409, body: { error: 'Registration belongs to another event' } };
    if (registration.status === 'cancelled') return { status: 409, body: { error: 'Registration is cancelled' } };
    if (req.user.role === 'participant' && registration.user_id !== req.user.id) {
      return { status: 403, body: { error: 'Forbidden' } };
    }

    const [existing] = await connection.execute(
      'SELECT id FROM session_registrations WHERE session_id = ? AND registration_id = ?',
      [session.id, registration.id]
    );
    if (existing[0]) return { status: 409, body: { error: 'Already registered for this session' } };

    const [counts] = await connection.execute(
      'SELECT COUNT(*) AS registered FROM session_registrations WHERE session_id = ?',
      [session.id]
    );
    if (Number(counts[0].registered) >= session.capacity) return { status: 409, body: { error: 'Session is full' } };

    await connection.execute(
      'INSERT INTO session_registrations (session_id, registration_id) VALUES (?, ?)',
      [session.id, registration.id]
    );
    return { status: 201, body: { message: 'Registered for session', sessionId: session.id, registrationId: registration.id } };
  });

  return res.status(result.status).json(result.body);
});

// GET /api/sessions/:id/capacity — public registration and attendance counts.
router.get('/:id/capacity', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'id must be a positive integer' });
  const [sessions] = await pool.execute(
    `SELECT s.capacity,
      (SELECT COUNT(*) FROM session_registrations sr WHERE sr.session_id = s.id) AS registered,
      (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id) AS checked_in
     FROM sessions s WHERE s.id = ?`,
    [req.params.id]
  );
  if (!sessions[0]) return res.status(404).json({ error: 'Session not found' });
  const { capacity, registered, checked_in: checkedIn } = sessions[0];
  return res.json({ capacity, registered, checked_in: checkedIn, seats_left: Number(capacity) - Number(registered) });
});

export default router;
