require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const errorHandler = require('./middleware/errorHandler');

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
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: [
    'https://grain-biz-dashboard.web.app',
    'https://grain-biz-dashboard.firebaseapp.com',
    'https://grain-biz-dashboard-122ac.web.app',
    'https://grain-biz-dashboard-122ac.firebaseapp.com',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ success: true, message: '🌾 Grain Trading API is running', version: '1.0.0' });
});
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'healthy', uptime: process.uptime() });
});

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

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🌾  Grain Trading API`);
  console.log(`🚀  Server running on http://localhost:${PORT}`);
  console.log(`📦  Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
