const express = require('express');
const pool    = require('../config/db');
const { protect } = require('../middleware/auth');

const router = express.Router();

const toKg = (qty, unit) => {
  const map = { kg: 1, tonnes: 1000, bags: 50, crates: 25 };
  return qty * (map[unit] || 1);
};

// ─── GET /api/sales ───────────────────────────────────────────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const { status, buyer_id, from, to } = req.query;
    let query = 'SELECT * FROM vw_sales_summary WHERE 1=1';
    const params = [];

    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    if (from)   { params.push(from);   query += ` AND sale_date >= $${params.length}`; }
    if (to)     { params.push(to);     query += ` AND sale_date <= $${params.length}`; }

    query += ' ORDER BY sale_date DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) { next(err); }
});

// ─── GET /api/sales/:id ───────────────────────────────────────────────────────
router.get('/:id', protect, async (req, res, next) => {
  try {
    const sale = await pool.query('SELECT * FROM vw_sales_summary WHERE id = $1', [req.params.id]);
    if (!sale.rows[0])
      return res.status(404).json({ success: false, message: 'Sale not found.' });

    const items = await pool.query(
      `SELECT si.*, g.name AS grain_name, g.variety
       FROM sale_items si
       JOIN grains g ON g.id = si.grain_id
       WHERE si.sale_id = $1`,
      [req.params.id]
    );

    const payments = await pool.query(
      `SELECT * FROM payments WHERE transaction_id = $1 AND direction = 'inflow' ORDER BY payment_date DESC`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...sale.rows[0], items: items.rows, payments: payments.rows } });
  } catch (err) { next(err); }
});

// ─── POST /api/sales ──────────────────────────────────────────────────────────
router.post('/', protect, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { buyer_id, warehouse_id, sale_date, delivery_date, notes, items } = req.body;

    if (!buyer_id || !warehouse_id || !items || !items.length)
      return res.status(400).json({ success: false, message: 'buyer_id, warehouse_id and items are required.' });

    // Generate reference
    const countResult = await client.query('SELECT COUNT(*) FROM sales');
    const year = new Date().getFullYear();
    const reference = `SAL-${year}-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;

    // Create sale header
    const sale = await client.query(
      `INSERT INTO sales (reference, buyer_id, warehouse_id, recorded_by, sale_date, delivery_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [reference, buyer_id, warehouse_id, req.user.id,
       sale_date || new Date(), delivery_date || null, notes || null]
    );
    const saleId = sale.rows[0].id;

    // Insert line items (triggers auto-deduct stock)
    for (const item of items) {
      const { grain_id, quantity, unit, price_per_kg, notes: itemNotes } = item;
      const qty_kg = toKg(quantity, unit || 'kg');

      await client.query(
        `INSERT INTO sale_items (sale_id, grain_id, quantity, unit, quantity_kg, price_per_kg, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [saleId, grain_id, quantity, unit || 'kg', qty_kg, price_per_kg, itemNotes || null]
      );
    }

    await client.query('COMMIT');

    const full = await pool.query('SELECT * FROM vw_sales_summary WHERE id = $1', [saleId]);
    res.status(201).json({ success: true, data: full.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    // Pass insufficient stock error cleanly
    if (err.message && err.message.includes('Insufficient stock')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  } finally {
    client.release();
  }
});

// ─── PUT /api/sales/:id/status ────────────────────────────────────────────────
router.put('/:id/status', protect, async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE sales SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ success: false, message: 'Sale not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── POST /api/sales/:id/payment ─────────────────────────────────────────────
router.post('/:id/payment', protect, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { amount, method, payment_date, bank_reference, notes } = req.body;
    const saleId = req.params.id;

    const sale = await client.query('SELECT * FROM sales WHERE id = $1', [saleId]);
    if (!sale.rows[0])
      return res.status(404).json({ success: false, message: 'Sale not found.' });

    const s = sale.rows[0];
    if (parseFloat(amount) > parseFloat(s.balance_due))
      return res.status(400).json({ success: false, message: `Amount exceeds balance due (${s.balance_due}).` });

    const countResult = await client.query('SELECT COUNT(*) FROM payments');
    const payRef = `PAY-${new Date().getFullYear()}-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;

    await client.query(
      `INSERT INTO payments (reference, direction, party_type, party_id, transaction_id, transaction_ref, amount, method, payment_date, bank_reference, recorded_by, notes)
       VALUES ($1,'inflow','buyer',$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [payRef, s.buyer_id, saleId, s.reference, amount, method || 'cash',
       payment_date || new Date(), bank_reference || null, req.user.id, notes || null]
    );

    const newPaid  = parseFloat(s.amount_paid) + parseFloat(amount);
    const newStatus = newPaid >= parseFloat(s.total_amount) ? 'completed' : 'partial';

    await client.query(
      'UPDATE sales SET amount_paid = $1, status = $2, updated_at = NOW() WHERE id = $3',
      [newPaid, newStatus, saleId]
    );

    // Update buyer credit balance
    await client.query(
      'UPDATE buyers SET credit_balance = credit_balance - $1 WHERE id = $2',
      [amount, s.buyer_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Payment recorded.', amount_paid: newPaid, status: newStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
