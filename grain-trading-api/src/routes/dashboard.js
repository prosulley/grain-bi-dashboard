const express = require('express');
const pool    = require('../config/db');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/dashboard/overview ─────────────────────────────────────────────
router.get('/overview', protect, async (req, res, next) => {
  try {
    const { period = '30' } = req.query; // days

    const [
      revenue, purchases, inventory, receivables,
      payables, topGrains, recentSales, recentPurchases
    ] = await Promise.all([

      // Total revenue (completed + partial sales)
      pool.query(`
        SELECT
          COALESCE(SUM(total_amount), 0)  AS total_revenue,
          COALESCE(SUM(amount_paid), 0)   AS total_collected,
          COALESCE(SUM(balance_due), 0)   AS total_uncollected,
          COUNT(*)                         AS total_sales
        FROM sales
        WHERE sale_date >= NOW() - INTERVAL '${parseInt(period)} days'
          AND status != 'cancelled'`),

      // Total purchases
      pool.query(`
        SELECT
          COALESCE(SUM(total_amount), 0) AS total_purchase_cost,
          COALESCE(SUM(amount_paid), 0)  AS total_paid_out,
          COALESCE(SUM(balance_due), 0)  AS total_owed_to_suppliers,
          COUNT(*)                        AS total_purchases
        FROM purchases
        WHERE purchase_date >= NOW() - INTERVAL '${parseInt(period)} days'
          AND status != 'cancelled'`),

      // Inventory summary
      pool.query(`
        SELECT
          COUNT(DISTINCT grain_id)        AS grain_types,
          COALESCE(SUM(quantity_kg), 0)   AS total_stock_kg,
          COUNT(*) FILTER (WHERE quantity_kg <= reorder_level AND reorder_level > 0) AS low_stock_alerts
        FROM inventory`),

      // Outstanding receivables
      pool.query(`
        SELECT COALESCE(SUM(balance_due), 0) AS total
        FROM sales WHERE status != 'cancelled' AND balance_due > 0`),

      // Outstanding payables
      pool.query(`
        SELECT COALESCE(SUM(balance_due), 0) AS total
        FROM purchases WHERE status != 'cancelled' AND balance_due > 0`),

      // Top grains by revenue
      pool.query(`
        SELECT g.name AS grain, SUM(si.subtotal) AS revenue, SUM(si.quantity_kg) AS quantity_kg
        FROM sale_items si
        JOIN grains g ON g.id = si.grain_id
        JOIN sales s ON s.id = si.sale_id
        WHERE s.sale_date >= NOW() - INTERVAL '${parseInt(period)} days'
          AND s.status != 'cancelled'
        GROUP BY g.name
        ORDER BY revenue DESC LIMIT 5`),

      // Recent sales
      pool.query(`
        SELECT * FROM vw_sales_summary
        ORDER BY sale_date DESC LIMIT 5`),

      // Recent purchases
      pool.query(`
        SELECT * FROM vw_purchases_summary
        ORDER BY purchase_date DESC LIMIT 5`),
    ]);

    const rev  = revenue.rows[0];
    const pur  = purchases.rows[0];
    const inv  = inventory.rows[0];
    const gross_profit = parseFloat(rev.total_revenue) - parseFloat(pur.total_purchase_cost);

    res.json({
      success: true,
      period_days: parseInt(period),
      data: {
        kpis: {
          total_revenue:            parseFloat(rev.total_revenue),
          total_collected:          parseFloat(rev.total_collected),
          total_purchase_cost:      parseFloat(pur.total_purchase_cost),
          gross_profit,
          profit_margin_pct:        rev.total_revenue > 0
                                      ? ((gross_profit / rev.total_revenue) * 100).toFixed(2)
                                      : 0,
          total_sales:              parseInt(rev.total_sales),
          total_purchases:          parseInt(pur.total_purchases),
          outstanding_receivables:  parseFloat(receivables.rows[0].total),
          outstanding_payables:     parseFloat(payables.rows[0].total),
          total_stock_kg:           parseFloat(inv.total_stock_kg),
          grain_types_in_stock:     parseInt(inv.grain_types),
          low_stock_alerts:         parseInt(inv.low_stock_alerts),
        },
        top_grains:        topGrains.rows,
        recent_sales:      recentSales.rows,
        recent_purchases:  recentPurchases.rows,
      }
    });
  } catch (err) { next(err); }
});

// ─── GET /api/dashboard/profit-by-grain ──────────────────────────────────────
router.get('/profit-by-grain', protect, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM vw_profit_by_grain ORDER BY gross_profit DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// ─── GET /api/dashboard/sales-trend ──────────────────────────────────────────
router.get('/sales-trend', protect, async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const result = await pool.query(`
      SELECT
        DATE(sale_date)           AS date,
        COUNT(*)                  AS orders,
        COALESCE(SUM(total_amount), 0) AS revenue
      FROM sales
      WHERE sale_date >= NOW() - INTERVAL '${parseInt(period)} days'
        AND status != 'cancelled'
      GROUP BY DATE(sale_date)
      ORDER BY date ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// ─── GET /api/dashboard/purchase-trend ───────────────────────────────────────
router.get('/purchase-trend', protect, async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const result = await pool.query(`
      SELECT
        DATE(purchase_date)            AS date,
        COUNT(*)                       AS orders,
        COALESCE(SUM(total_amount), 0) AS cost
      FROM purchases
      WHERE purchase_date >= NOW() - INTERVAL '${parseInt(period)} days'
        AND status != 'cancelled'
      GROUP BY DATE(purchase_date)
      ORDER BY date ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// ─── GET /api/dashboard/inventory-summary ────────────────────────────────────
router.get('/inventory-summary', protect, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM vw_current_inventory ORDER BY grain');
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// ─── GET /api/dashboard/top-suppliers ────────────────────────────────────────
router.get('/top-suppliers', protect, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        s.full_name AS supplier,
        s.phone,
        COUNT(p.id)             AS total_orders,
        SUM(p.total_amount)     AS total_value,
        SUM(p.amount_paid)      AS total_paid
      FROM purchases p
      JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.status != 'cancelled'
      GROUP BY s.full_name, s.phone
      ORDER BY total_value DESC LIMIT 10`);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// ─── GET /api/dashboard/top-buyers ───────────────────────────────────────────
router.get('/top-buyers', protect, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        b.full_name AS buyer,
        b.phone,
        COUNT(s.id)             AS total_orders,
        SUM(s.total_amount)     AS total_value,
        SUM(s.amount_paid)      AS total_paid,
        SUM(s.balance_due)      AS total_outstanding
      FROM sales s
      JOIN buyers b ON b.id = s.buyer_id
      WHERE s.status != 'cancelled'
      GROUP BY b.full_name, b.phone
      ORDER BY total_value DESC LIMIT 10`);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
