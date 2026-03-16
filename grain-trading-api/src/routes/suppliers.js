const express = require('express');
const pool    = require('../config/db');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/suppliers ───────────────────────────────────────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const { search, region } = req.query;
    let query  = 'SELECT * FROM suppliers WHERE is_active = TRUE';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (full_name ILIKE $${params.length} OR company_name ILIKE $${params.length} OR phone ILIKE $${params.length})`;
    }
    if (region) {
      params.push(region);
      query += ` AND region = $${params.length}`;
    }

    query += ' ORDER BY full_name';
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) { next(err); }
});

// ─── GET /api/suppliers/:id ───────────────────────────────────────────────────
router.get('/:id', protect, async (req, res, next) => {
  try {
    const supplier = await pool.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    if (!supplier.rows[0])
      return res.status(404).json({ success: false, message: 'Supplier not found.' });

    // Get purchase history
    const purchases = await pool.query(
      'SELECT * FROM vw_purchases_summary WHERE supplier = $1 ORDER BY purchase_date DESC LIMIT 10',
      [supplier.rows[0].full_name]
    );

    res.json({ success: true, data: { ...supplier.rows[0], recent_purchases: purchases.rows } });
  } catch (err) { next(err); }
});

// ─── POST /api/suppliers ──────────────────────────────────────────────────────
router.post('/', protect, async (req, res, next) => {
  try {
    const {
      full_name, company_name, phone, alt_phone, email,
      region, address, id_type, id_number,
      bank_name, bank_account, momo_number, rating, notes
    } = req.body;

    if (!full_name || !phone)
      return res.status(400).json({ success: false, message: 'full_name and phone are required.' });

    // Auto-generate supplier code
    const countResult = await pool.query('SELECT COUNT(*) FROM suppliers');
    const code = `SUP-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;

    const result = await pool.query(
      `INSERT INTO suppliers
         (code, full_name, company_name, phone, alt_phone, email, region, address,
          id_type, id_number, bank_name, bank_account, momo_number, rating, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [code, full_name, company_name, phone, alt_phone, email, region, address,
       id_type, id_number, bank_name, bank_account, momo_number, rating, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── PUT /api/suppliers/:id ───────────────────────────────────────────────────
router.put('/:id', protect, async (req, res, next) => {
  try {
    const {
      full_name, company_name, phone, alt_phone, email,
      region, address, bank_name, bank_account, momo_number, rating, notes, is_active
    } = req.body;

    const result = await pool.query(
      `UPDATE suppliers SET
         full_name    = COALESCE($1, full_name),
         company_name = COALESCE($2, company_name),
         phone        = COALESCE($3, phone),
         alt_phone    = COALESCE($4, alt_phone),
         email        = COALESCE($5, email),
         region       = COALESCE($6, region),
         address      = COALESCE($7, address),
         bank_name    = COALESCE($8, bank_name),
         bank_account = COALESCE($9, bank_account),
         momo_number  = COALESCE($10, momo_number),
         rating       = COALESCE($11, rating),
         notes        = COALESCE($12, notes),
         is_active    = COALESCE($13, is_active),
         updated_at   = NOW()
       WHERE id = $14 RETURNING *`,
      [full_name, company_name, phone, alt_phone, email, region, address,
       bank_name, bank_account, momo_number, rating, notes, is_active, req.params.id]
    );
    if (!result.rows[0])
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── DELETE /api/suppliers/:id (soft delete) ─────────────────────────────────
router.delete('/:id', protect, async (req, res, next) => {
  try {
    await pool.query('UPDATE suppliers SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Supplier deactivated.' });
  } catch (err) { next(err); }
});

module.exports = router;
