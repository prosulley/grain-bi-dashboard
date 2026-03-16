require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes       = require('./routes/auth');
const grainRoutes      = require('./routes/grains');
const supplierRoutes   = require('./routes/suppliers');
const buyerRoutes      = require('./routes/buyers');
const purchaseRoutes   = require('./routes/purchases');
const saleRoutes       = require('./routes/sales');
const inventoryRoutes  = require('./routes/inventory');
const paymentRoutes    = require('./routes/payments');
const warehouseRoutes  = require('./routes/warehouses');
const dashboardRoutes  = require('./routes/dashboard');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🌾 Grain Trading API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'healthy', uptime: process.uptime() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/grains',     grainRoutes);
app.use('/api/suppliers',  supplierRoutes);
app.use('/api/buyers',     buyerRoutes);
app.use('/api/purchases',  purchaseRoutes);
app.use('/api/sales',      saleRoutes);
app.use('/api/inventory',  inventoryRoutes);
app.use('/api/payments',   paymentRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/dashboard',  dashboardRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌾  Grain Trading API`);
  console.log(`🚀  Server running on http://localhost:${PORT}`);
  console.log(`📦  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📌  Available endpoints:`);
  console.log(`    POST   /api/auth/setup`);
  console.log(`    POST   /api/auth/login`);
  console.log(`    GET    /api/dashboard/overview`);
  console.log(`    GET    /api/grains`);
  console.log(`    GET    /api/suppliers`);
  console.log(`    GET    /api/buyers`);
  console.log(`    GET    /api/purchases`);
  console.log(`    GET    /api/sales`);
  console.log(`    GET    /api/inventory`);
  console.log(`    GET    /api/payments\n`);
});

module.exports = app;
