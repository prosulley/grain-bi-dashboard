const express = require('express');
const pool    = require('../config/db');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/inventory ───────────────────────────────────────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const { warehouse_id, low_stock } = req.query;
    let query = `
      SELECT i.id, i.grain_id, i.warehouse_id,
             g.name AS grain, g.variety,
             w.name AS warehouse, w.region,
             i.quantity_kg, i.reorder_level,
             CASE WHEN i.quantity_kg <= i.reorder_level THEN TRUE ELSE FALSE END AS low_stock_alert,
             i.last_updated
      FROM inventory i
      JOIN grains g ON g.id = i.grain_id
      JOIN warehouses w ON w.id = i.warehouse_id
      WHERE g.is_active = TRUE`;
    const params = [];

    if (warehouse_id) {
      params.push(warehouse_id);
      query += ` AND i.warehouse_id = $${params.length}`;
    }
    if (low_stock === 'true') {
      query += ' AND i.quantity_kg <= i.reorder_level';
    }

    query += ' ORDER BY g.name';
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) { next(err); }
});

// ─── GET /api/inventory/movements ─────────────────────────────────────────────
router.get('/movements', protect, async (req, res, next) => {
  try {
    const { grain_id, warehouse_id, type, from, to, limit = 50 } = req.query;
    let query = `
      SELECT sm.*, g.name AS grain, w.name AS warehouse
      FROM stock_movements sm
      JOIN grains g ON g.id = sm.grain_id
      JOIN warehouses w ON w.id = sm.warehouse_id
      WHERE 1=1`;
    const params = [];

    if (grain_id)     { params.push(grain_id);     query += ` AND sm.grain_id = $${params.length}`; }
    if (warehouse_id) { params.push(warehouse_id); query += ` AND sm.warehouse_id = $${params.length}`; }
    if (type)         { params.push(type);          query += ` AND sm.movement_type = $${params.length}`; }
    if (from)         { params.push(from);          query += ` AND sm.created_at >= $${params.length}`; }
    if (to)           { params.push(to);            query += ` AND sm.created_at <= $${params.length}`; }

    params.push(parseInt(limit));
    query += ` ORDER BY sm.created_at DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) { next(err); }
});

// ─── GET /api/inventory/warehouses ───────────────────────────────────────────
router.get('/warehouses', protect, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT w.*,
         COALESCE(SUM(i.quantity_kg), 0) AS total_stock_kg,
         COUNT(DISTINCT i.grain_id) AS grain_types
       FROM warehouses w
       LEFT JOIN inventory i ON i.warehouse_id = w.id
       WHERE w.is_active = TRUE
       GROUP BY w.id
       ORDER BY w.name`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// ─── POST /api/inventory/adjust ───────────────────────────────────────────────
// Manual stock adjustment (loss, damage, recount)
router.post('/adjust', protect, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { grain_id, warehouse_id, quantity_kg, movement_type, notes } = req.body;

    if (!grain_id || !warehouse_id || quantity_kg === undefined)
      return res.status(400).json({ success: false, message: 'grain_id, warehouse_id and quantity_kg are required.' });

    // Upsert inventory
    await client.query(
      `INSERT INTO inventory (grain_id, warehouse_id, quantity_kg)
       VALUES ($1, $2, $3)
       ON CONFLICT (grain_id, warehouse_id)
       DO UPDATE SET quantity_kg = inventory.quantity_kg + $3, last_updated = NOW()`,
      [grain_id, warehouse_id, quantity_kg]
    );

    // Get new balance
    const balance = await client.query(
      'SELECT quantity_kg FROM inventory WHERE grain_id = $1 AND warehouse_id = $2',
      [grain_id, warehouse_id]
    );

    // Log movement
    await client.query(
      `INSERT INTO stock_movements (grain_id, warehouse_id, movement_type, quantity_kg, balance_after, notes, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [grain_id, warehouse_id, movement_type || 'adjustment',
       quantity_kg, balance.rows[0].quantity_kg, notes || null, req.user.id]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Stock adjusted.', new_balance_kg: balance.rows[0].quantity_kg });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ─── PUT /api/inventory/reorder-level ────────────────────────────────────────
router.put('/reorder-level', protect, async (req, res, next) => {
  try {
    const { grain_id, warehouse_id, reorder_level } = req.body;
    const result = await pool.query(
      `UPDATE inventory SET reorder_level = $1
       WHERE grain_id = $2 AND warehouse_id = $3 RETURNING *`,
      [reorder_level, grain_id, warehouse_id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── PUT /api/inventory/:id ─────────────────────────────────────────────────
// Edit stock quantity and reorder level directly
router.put('/:id', protect, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { quantity_kg, reorder_level } = req.body;

    // Get current record
    const current = await client.query('SELECT * FROM inventory WHERE id = $1', [req.params.id]);
    if (!current.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Inventory record not found.' });
    }

    const row = current.rows[0];
    const newQty = quantity_kg !== undefined ? parseFloat(quantity_kg) : parseFloat(row.quantity_kg);
    const newReorder = reorder_level !== undefined ? parseFloat(reorder_level) : parseFloat(row.reorder_level);
    const diff = newQty - parseFloat(row.quantity_kg);

    // Update inventory record
    await client.query(
      `UPDATE inventory SET quantity_kg = $1, reorder_level = $2, last_updated = NOW() WHERE id = $3`,
      [newQty, newReorder, req.params.id]
    );

    // Log stock movement if quantity changed
    if (diff !== 0) {
      await client.query(
        `INSERT INTO stock_movements (grain_id, warehouse_id, movement_type, quantity_kg, balance_after, notes, recorded_by)
         VALUES ($1, $2, 'adjustment', $3, $4, $5, $6)`,
        [row.grain_id, row.warehouse_id, diff, newQty, 'Manual inventory edit', req.user.id || null]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Inventory updated.' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ─── DELETE /api/inventory/:id ──────────────────────────────────────────────
// Remove an inventory record and log the removal
router.delete('/:id', protect, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const current = await client.query('SELECT * FROM inventory WHERE id = $1', [req.params.id]);
    if (!current.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Inventory record not found.' });
    }

    const row = current.rows[0];

    // Log a zeroing-out movement before deletion
    if (parseFloat(row.quantity_kg) !== 0) {
      await client.query(
        `INSERT INTO stock_movements (grain_id, warehouse_id, movement_type, quantity_kg, balance_after, notes, recorded_by)
         VALUES ($1, $2, 'adjustment', $3, 0, $4, $5)`,
        [row.grain_id, row.warehouse_id, -parseFloat(row.quantity_kg), 'Inventory record deleted', req.user.id || null]
      );
    }

    await client.query('DELETE FROM inventory WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true, message: 'Inventory record deleted.' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
