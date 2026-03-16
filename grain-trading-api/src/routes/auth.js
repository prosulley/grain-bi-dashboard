const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../config/db');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Helper: generate JWT
const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', protect, adminOnly, async (req, res, next) => {
  try {
    const { full_name, email, phone, password, role } = req.body;

    if (!full_name || !email || !password)
      return res.status(400).json({ success: false, message: 'full_name, email and password are required.' });

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0)
      return res.status(400).json({ success: false, message: 'Email already registered.' });

    const hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, phone, role, created_at`,
      [full_name, email, phone || null, hash, role || 'sales_officer']
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email]);
    const user   = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    // Update last login
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    res.json({
      success: true,
      token: generateToken(user),
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
    });
  } catch (err) { next(err); }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, phone, role, last_login_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── GET /api/auth/users  (admin only) ────────────────────────────────────────
router.get('/users', protect, adminOnly, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, phone, role, is_active, last_login_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) { next(err); }
});

// ─── POST /api/auth/setup  (create first admin — disable after setup) ─────────
router.post('/setup', async (req, res, next) => {
  try {
    const count = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(count.rows[0].count) > 0)
      return res.status(403).json({ success: false, message: 'Setup already completed.' });

    const { full_name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, full_name, email, role`,
      [full_name, email, hash]
    );

    res.status(201).json({
      success: true,
      message: 'Admin account created.',
      token: generateToken(result.rows[0]),
      user: result.rows[0],
    });
  } catch (err) { next(err); }
});

module.exports = router;
