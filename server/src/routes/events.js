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

async function eventForManager(eventId, user, connection = pool, lock = false) {
  const [events] = await connection.execute(
    `SELECT id, created_by FROM events WHERE id = ?${lock ? ' FOR UPDATE' : ''}`,
    [eventId]
  );
  const event = events[0];
  if (!event) return { status: 404, error: 'Event not found' };
  if (user.role !== 'admin' && Number(event.created_by) !== Number(user.id)) {
    return { status: 403, error: 'Forbidden' };
  }
  return { event };
}

const eventFields = `
  e.id, e.title, e.description, e.venue, e.start_at, e.end_at, e.capacity,
  e.created_by, e.created_at, COUNT(r.id) AS registered_count`;

// GET /api/events — any authenticated user.
router.get('/', authenticate, async (req, res) => {
  const { q = '', page: pageValue = '1', limit: limitValue = '10' } = req.query;
  if (typeof q !== 'string') return res.status(400).json({ error: 'q must be a string' });

  const page = Number(pageValue);
  const limit = Number(limitValue);
  if (!Number.isSafeInteger(page) || page < 1) return res.status(400).json({ error: 'page must be a positive integer' });
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({ error: 'limit must be an integer from 1 to 50' });
  }

  const search = q.trim();
  const pattern = `%${search}%`;
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM events e
     WHERE (? = '' OR e.title LIKE ? OR e.venue LIKE ?)`,
    [search, pattern, pattern]
  );
  const [events] = await pool.execute(
    `SELECT ${eventFields}
     FROM events e
     LEFT JOIN registrations r ON r.event_id = e.id AND r.status <> 'cancelled'
     WHERE (? = '' OR e.title LIKE ? OR e.venue LIKE ?)
     GROUP BY e.id
     ORDER BY e.start_at, e.id
     LIMIT ? OFFSET ?`,
    [search, pattern, pattern, limit, (page - 1) * limit]
  );

  return res.json({ events, page, limit, total: Number(countRows[0].total) });
});

// GET /api/events/:id — any authenticated user.
router.get('/:id', authenticate, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'id must be a positive integer' });
  const [events] = await pool.execute(
    `SELECT ${eventFields}
     FROM events e
     LEFT JOIN registrations r ON r.event_id = e.id AND r.status <> 'cancelled'
     WHERE e.id = ?
     GROUP BY e.id`,
    [req.params.id]
  );
  if (!events[0]) return res.status(404).json({ error: 'Event not found' });
  return res.json(events[0]);
});

// POST /api/events — organizer or admin.
router.post('/', authenticate, requireRole(...managers), async (req, res) => {
  const { title, description = null, venue, startAt, endAt, capacity } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'title required' });
  if (description !== null && typeof description !== 'string') return res.status(400).json({ error: 'description must be a string or null' });
  if (typeof venue !== 'string' || !venue.trim()) return res.status(400).json({ error: 'venue required' });
  if (!validCapacity(capacity)) return res.status(400).json({ error: 'capacity must be a positive integer' });

  const start = dateTime(startAt);
  const end = dateTime(endAt);
  if (!start || !end || start >= end) {
    return res.status(400).json({ error: 'valid startAt and endAt required; startAt must be before endAt' });
  }

  const [result] = await pool.execute(
    'INSERT INTO events (title, description, venue, start_at, end_at, capacity, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [title.trim(), description, venue.trim(), start, end, Number(capacity), req.user.id]
  );
  return res.status(201).json({
    id: result.insertId,
    title: title.trim(),
    description,
    venue: venue.trim(),
    start_at: start,
    end_at: end,
    capacity: Number(capacity),
    created_by: req.user.id
  });
});

// PUT /api/events/:id — admin or the organizer who owns the event.
router.put('/:id', authenticate, requireRole(...managers), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'id must be a positive integer' });
  const { title, description = null, venue, startAt, endAt, capacity } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'title required' });
  if (description !== null && typeof description !== 'string') return res.status(400).json({ error: 'description must be a string or null' });
  if (typeof venue !== 'string' || !venue.trim()) return res.status(400).json({ error: 'venue required' });
  if (!validCapacity(capacity)) return res.status(400).json({ error: 'capacity must be a positive integer' });

  const start = dateTime(startAt);
  const end = dateTime(endAt);
  if (!start || !end || start >= end) {
    return res.status(400).json({ error: 'valid startAt and endAt required; startAt must be before endAt' });
  }

  const access = await eventForManager(req.params.id, req.user);
  if (access.error) return res.status(access.status).json({ error: access.error });
  await pool.execute(
    'UPDATE events SET title = ?, description = ?, venue = ?, start_at = ?, end_at = ?, capacity = ? WHERE id = ?',
    [title.trim(), description, venue.trim(), start, end, Number(capacity), access.event.id]
  );
  return res.json({
    id: access.event.id,
    title: title.trim(),
    description,
    venue: venue.trim(),
    start_at: start,
    end_at: end,
    capacity: Number(capacity),
    created_by: access.event.created_by
  });
});

// DELETE /api/events/:id — admin or the organizer who owns the event.
router.delete('/:id', authenticate, requireRole(...managers), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'id must be a positive integer' });

  const result = await withTransaction(async (connection) => {
    const access = await eventForManager(req.params.id, req.user, connection, true);
    if (access.error) return { status: access.status, body: { error: access.error } };

    const [registrations] = await connection.execute(
      'SELECT COUNT(*) AS total FROM registrations WHERE event_id = ?',
      [access.event.id]
    );
    if (Number(registrations[0].total) > 0) {
      return { status: 409, body: { error: 'Event has registrations and cannot be deleted' } };
    }

    await connection.execute('DELETE FROM events WHERE id = ?', [access.event.id]);
    return { status: 200, body: { message: 'Event deleted' } };
  });

  return res.status(result.status).json(result.body);
});

export default router;
