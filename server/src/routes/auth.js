import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../auth.js';
import { pool } from '../db.js';

const router = Router();

// POST /api/auth/register — public; new accounts are always participants.
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'name required' });
  if (typeof email !== 'string' || !email.trim()) return res.status(400).json({ error: 'email required' });
  if (typeof password !== 'string' || !password) return res.status(400).json({ error: 'password required' });

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name.trim(), normalizedEmail, passwordHash, 'participant']
  );

  return res.status(201).json({
    id: result.insertId,
    name: name.trim(),
    email: normalizedEmail,
    role: 'participant'
  });
});

// POST /api/auth/login — public.
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }

  const [rows] = await pool.execute(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ?',
    [email.trim().toLowerCase()]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

// GET /api/auth/me — authenticated users.
router.get('/me', authenticate, async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT id, name, email, role FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  return res.json(rows[0]);
});

export default router;
