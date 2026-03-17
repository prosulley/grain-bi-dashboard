const express = require('express');
const pool    = require('../config/db');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/warehouses ──────────────────────────────────────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT w.*,
         COALESCE(SUM(i.quantity_kg), 0) AS total_stock_kg,
         COUNT(DISTINCT i.grain_id)       AS grain_types
       FROM warehouses w
       LEFT JOIN inventory i ON i.warehouse_id = w.id
       WHERE w.is_active = TRUE
       GROUP BY w.id ORDER BY w.name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// ─── GET /api/warehouses/:id ──────────────────────────────────────────────────
router.get('/:id', protect, async (req, res, next) => {
  try {
    const warehouse = await pool.query('SELECT * FROM warehouses WHERE id = $1', [req.params.id]);
    if (!warehouse.rows[0])
      return res.status(404).json({ success: false, message: 'Warehouse not found.' });

    const stock = await pool.query(
      `SELECT g.name AS grain, g.variety, i.quantity_kg, i.reorder_level, i.last_updated
       FROM inventory i JOIN grains g ON g.id = i.grain_id
       WHERE i.warehouse_id = $1 ORDER BY g.name`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...warehouse.rows[0], stock: stock.rows } });
  } catch (err) { next(err); }
});

// ─── POST /api/warehouses ─────────────────────────────────────────────────────
router.post('/', protect, async (req, res, next) => {
  try {
    const { name, location, region, capacity_kg, manager_name, phone } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Warehouse name is required.' });

    const result = await pool.query(
      `INSERT INTO warehouses (name, location, region, capacity_kg, manager_name, phone)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, location, region, capacity_kg, manager_name, phone]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── PUT /api/warehouses/:id ──────────────────────────────────────────────────
router.put('/:id', protect, async (req, res, next) => {
  try {
    const { name, location, region, capacity_kg, manager_name, phone, is_active } = req.body;
    const result = await pool.query(
      `UPDATE warehouses SET
         name         = COALESCE($1, name),
         location     = COALESCE($2, location),
         region       = COALESCE($3, region),
         capacity_kg  = COALESCE($4, capacity_kg),
         manager_name = COALESCE($5, manager_name),
         phone        = COALESCE($6, phone),
         is_active    = COALESCE($7, is_active),
         updated_at   = NOW()
       WHERE id = $8 RETURNING *`,
      [name, location, region, capacity_kg, manager_name, phone, is_active, req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── DELETE /api/warehouses/:id (soft-delete) ─────────────────────────────────
router.delete('/:id', protect, async (req, res, next) => {
  try {
    // Prevent deletion if warehouse still holds stock
    const stock = await pool.query(
      `SELECT COALESCE(SUM(quantity_kg), 0) AS total_stock
       FROM inventory WHERE warehouse_id = $1`,
      [req.params.id]
    );
    if (parseFloat(stock.rows[0].total_stock) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a warehouse that still has stock. Move or clear inventory first.',
      });
    }

    const result = await pool.query(
      `UPDATE warehouses SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND is_active = TRUE RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ success: false, message: 'Warehouse not found.' });

    res.json({ success: true, message: 'Warehouse deleted.', data: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
