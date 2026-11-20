import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { authenticate, requireRole } from '../auth.js';

const router = Router();
const userRoles = ['admin', 'organizer', 'volunteer', 'participant'];
const creatableRoles = ['admin', 'organizer', 'volunteer'];

// GET /api/users — admin only.
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  const { role } = req.query;
  if (role && !userRoles.includes(role)) {
    return res.status(400).json({ error: 'role must be admin, organizer, volunteer, or participant' });
  }

  const [users] = role
    ? await pool.execute(
      'SELECT id, name, email, role, created_at FROM users WHERE role = ? ORDER BY id',
      [role]
    )
    : await pool.execute('SELECT id, name, email, role, created_at FROM users ORDER BY id');

  return res.json(users);
});

// POST /api/users — admin only.
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { name, email, password, role } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'name required' });
  if (typeof email !== 'string' || !email.trim()) return res.status(400).json({ error: 'email required' });
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'password must contain at least 8 characters' });
  }
  if (!creatableRoles.includes(role)) {
    return res.status(400).json({ error: 'role must be admin, organizer, or volunteer' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name.trim(), email.trim().toLowerCase(), passwordHash, role]
  );

  return res.status(201).json({
    id: result.insertId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role
  });
});

export default router;
