import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { pool, withTransaction } from '../db.js';
import { createQrDataUrl, createQrToken } from '../utils/qr.js';

const router = Router();
const registrationStatuses = ['registered', 'cancelled', 'checked_in'];

function validId(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

function pageNumber(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

async function eventForOrganizer(eventId, user) {
  const [events] = await pool.execute('SELECT id, created_by FROM events WHERE id = ?', [eventId]);
  const event = events[0];
  if (!event) return { status: 404, error: 'Event not found' };
  if (user.role !== 'admin' && Number(event.created_by) !== Number(user.id)) {
    return { status: 403, error: 'Forbidden' };
  }
  return { event };
}

// POST /api/registrations — participants.
router.post('/', authenticate, requireRole('participant'), async (req, res) => {
  const { eventId } = req.body ?? {};
  if (!validId(eventId)) return res.status(400).json({ error: 'eventId must be a positive integer' });

  const result = await withTransaction(async (connection) => {
    const [events] = await connection.execute(
      'SELECT id, capacity FROM events WHERE id = ? FOR UPDATE',
      [eventId]
    );
    const event = events[0];
    if (!event) return { status: 404, body: { error: 'Event not found' } };

    const [existing] = await connection.execute(
      'SELECT id FROM registrations WHERE event_id = ? AND user_id = ?',
      [event.id, req.user.id]
    );
    if (existing[0]) return { status: 409, body: { error: 'Already registered for this event' } };

    const [counts] = await connection.execute(
      "SELECT COUNT(*) AS total FROM registrations WHERE event_id = ? AND status <> 'cancelled'",
      [event.id]
    );
    if (Number(counts[0].total) >= Number(event.capacity)) {
      return { status: 409, body: { error: 'Event is full' } };
    }

    const qrToken = createQrToken();
    const [insert] = await connection.execute(
      'INSERT INTO registrations (event_id, user_id, qr_token, status) VALUES (?, ?, ?, ?)',
      [event.id, req.user.id, qrToken, 'registered']
    );
    return {
      status: 201,
      body: { id: insert.insertId, eventId: event.id, status: 'registered' }
    };
  });

  return res.status(result.status).json(result.body);
});

// GET /api/registrations/me — participant's own registrations.
router.get('/me', authenticate, requireRole('participant'), async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT r.id, r.event_id AS eventId, e.title AS eventTitle, e.venue,
      e.start_at AS eventStartAt, e.end_at AS eventEndAt, r.status,
      r.registered_at AS registeredAt, r.qr_token AS qrToken
     FROM registrations r
     JOIN events e ON e.id = r.event_id
     WHERE r.user_id = ?
     ORDER BY r.registered_at DESC, r.id DESC`,
    [req.user.id]
  );
  const registrations = await Promise.all(rows.map(async ({ qrToken, ...registration }) => ({
    ...registration,
    qrCode: await createQrDataUrl(qrToken)
  })));
  return res.json(registrations);
});

// GET /api/registrations/event/:eventId — owning organizer or admin.
router.get('/event/:eventId', authenticate, requireRole('organizer', 'admin'), async (req, res) => {
  if (!validId(req.params.eventId)) return res.status(400).json({ error: 'eventId must be a positive integer' });
  const searchValue = req.query.search ?? '';
  const status = req.query.status ?? '';
  if (typeof searchValue !== 'string') return res.status(400).json({ error: 'search must be a string' });
  if (typeof status !== 'string' || (status && !registrationStatuses.includes(status))) {
    return res.status(400).json({ error: 'status must be registered, cancelled, or checked_in' });
  }

  const page = pageNumber(req.query.page, 1);
  const limit = pageNumber(req.query.limit, 10);
  if (!page) return res.status(400).json({ error: 'page must be a positive integer' });
  if (!limit || limit > 50) return res.status(400).json({ error: 'limit must be an integer from 1 to 50' });

  const access = await eventForOrganizer(req.params.eventId, req.user);
  if (access.error) return res.status(access.status).json({ error: access.error });

  const search = searchValue.trim();
  const pattern = `%${search}%`;
  const filters = [access.event.id, status, status, search, pattern, pattern];
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM registrations r
     JOIN users u ON u.id = r.user_id
     WHERE r.event_id = ?
       AND (? = '' OR r.status = ?)
       AND (? = '' OR u.name LIKE ? OR u.email LIKE ?)`,
    filters
  );
  const [registrations] = await pool.execute(
    `SELECT r.id, r.event_id AS eventId, r.user_id AS userId,
      u.name, u.email, r.status, r.registered_at AS registeredAt
     FROM registrations r
     JOIN users u ON u.id = r.user_id
     WHERE r.event_id = ?
       AND (? = '' OR r.status = ?)
       AND (? = '' OR u.name LIKE ? OR u.email LIKE ?)
     ORDER BY r.registered_at DESC, r.id DESC
     LIMIT ? OFFSET ?`,
    [...filters, limit, (page - 1) * limit]
  );
  return res.json({ registrations, page, limit, total: Number(countRows[0].total) });
});

// DELETE /api/registrations/:id — registration owner, owning organizer, or admin.
router.delete('/:id', authenticate, requireRole('participant', 'organizer', 'admin'), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'id must be a positive integer' });

  const result = await withTransaction(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT r.id, r.event_id AS eventId, r.user_id AS userId, r.status,
        e.created_by AS createdBy
       FROM registrations r
       JOIN events e ON e.id = r.event_id
       WHERE r.id = ?
       FOR UPDATE`,
      [req.params.id]
    );
    const registration = rows[0];
    if (!registration) return { status: 404, body: { error: 'Registration not found' } };
    if (req.user.role === 'participant' && Number(registration.userId) !== Number(req.user.id)) {
      return { status: 403, body: { error: 'Forbidden' } };
    }
    if (req.user.role === 'organizer' && Number(registration.createdBy) !== Number(req.user.id)) {
      return { status: 403, body: { error: 'Forbidden' } };
    }
    if (registration.status === 'cancelled') {
      return { status: 409, body: { error: 'Registration is already cancelled' } };
    }

    await connection.execute("UPDATE registrations SET status = 'cancelled' WHERE id = ?", [registration.id]);
    return { status: 200, body: { message: 'Registration cancelled', id: registration.id } };
  });

  return res.status(result.status).json(result.body);
});

export default router;
