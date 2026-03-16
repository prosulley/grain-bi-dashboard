const express = require('express');
const pool    = require('../config/db');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/grains ──────────────────────────────────────────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM grains WHERE is_active = TRUE ORDER BY name'
    );
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) { next(err); }
});

// ─── GET /api/grains/:id ──────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM grains WHERE id = $1', [req.params.id]);
    if (!result.rows[0])
      return res.status(404).json({ success: false, message: 'Grain not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── POST /api/grains ─────────────────────────────────────────────────────────
router.post('/', protect, async (req, res, next) => {
  try {
    const { name, variety, default_unit, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Grain name is required.' });

    const result = await pool.query(
      `INSERT INTO grains (name, variety, default_unit, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, variety || null, default_unit || 'kg', description || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── PUT /api/grains/:id ──────────────────────────────────────────────────────
router.put('/:id', protect, async (req, res, next) => {
  try {
    const { name, variety, default_unit, description, is_active } = req.body;
    const result = await pool.query(
      `UPDATE grains SET
         name         = COALESCE($1, name),
         variety      = COALESCE($2, variety),
         default_unit = COALESCE($3, default_unit),
         description  = COALESCE($4, description),
         is_active    = COALESCE($5, is_active),
         updated_at   = NOW()
       WHERE id = $6 RETURNING *`,
      [name, variety, default_unit, description, is_active, req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ success: false, message: 'Grain not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── DELETE /api/grains/:id (soft delete) ────────────────────────────────────
router.delete('/:id', protect, async (req, res, next) => {
  try {
    await pool.query('UPDATE grains SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Grain deactivated.' });
  } catch (err) { next(err); }
});

module.exports = router;
