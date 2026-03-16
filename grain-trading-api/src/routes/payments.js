const express = require('express');
const pool    = require('../config/db');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/payments ────────────────────────────────────────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const { direction, party_type, from, to, method } = req.query;
    let query = `
      SELECT p.*,
        CASE WHEN p.party_type = 'buyer'
          THEN b.full_name ELSE s.full_name END AS party_name
      FROM payments p
      LEFT JOIN buyers    b ON b.id = p.party_id AND p.party_type = 'buyer'
      LEFT JOIN suppliers s ON s.id = p.party_id AND p.party_type = 'supplier'
      WHERE 1=1`;
    const params = [];

    if (direction)   { params.push(direction);   query += ` AND p.direction = $${params.length}`; }
    if (party_type)  { params.push(party_type);  query += ` AND p.party_type = $${params.length}`; }
    if (method)      { params.push(method);       query += ` AND p.method = $${params.length}`; }
    if (from)        { params.push(from);         query += ` AND p.payment_date >= $${params.length}`; }
    if (to)          { params.push(to);           query += ` AND p.payment_date <= $${params.length}`; }

    query += ' ORDER BY p.payment_date DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) { next(err); }
});

// ─── GET /api/payments/receivables ────────────────────────────────────────────
router.get('/receivables', protect, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM vw_outstanding_receivables');
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// ─── GET /api/payments/payables ───────────────────────────────────────────────
router.get('/payables', protect, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM vw_outstanding_payables');
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// ─── GET /api/payments/:id ────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    if (!result.rows[0])
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
