# 🌾 Grain Trading API

A RESTful backend API for managing a grain trading business — purchases, sales, inventory, payments, suppliers, buyers, and a full analytics dashboard.

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL 16
- **Auth:** JWT (JSON Web Tokens)
- **Password Hashing:** bcryptjs

---

## 🚀 Setup Instructions

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your database credentials
nano .env
```

### 3. Start the server
```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

---

## 🔐 Authentication

### First-time setup — create admin account
```
POST /api/auth/setup
Body: { "full_name": "Admin", "email": "admin@grain.com", "password": "yourpassword" }
```

### Login
```
POST /api/auth/login
Body: { "email": "admin@grain.com", "password": "yourpassword" }
Response: { "token": "eyJ..." }
```

All protected routes require the header:
```
Authorization: Bearer <token>
```

---

## 📌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/setup | Create first admin (one-time) |
| POST | /api/auth/login | Login and get JWT token |
| GET  | /api/auth/me | Get current user profile |
| POST | /api/auth/register | Add new user (admin only) |
| GET  | /api/auth/users | List all users (admin only) |

### Grains
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/grains | List all grains |
| GET  | /api/grains/:id | Get single grain |
| POST | /api/grains | Add new grain |
| PUT  | /api/grains/:id | Update grain |
| DELETE | /api/grains/:id | Deactivate grain |

### Suppliers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/suppliers | List all suppliers (supports ?search= ?region=) |
| GET  | /api/suppliers/:id | Get supplier + purchase history |
| POST | /api/suppliers | Add supplier |
| PUT  | /api/suppliers/:id | Update supplier |
| DELETE | /api/suppliers/:id | Deactivate supplier |

### Buyers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/buyers | List all buyers |
| GET  | /api/buyers/:id | Get buyer + sales history |
| POST | /api/buyers | Add buyer |
| PUT  | /api/buyers/:id | Update buyer |
| DELETE | /api/buyers/:id | Deactivate buyer |

### Purchases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/purchases | List purchases (supports ?status= ?from= ?to=) |
| GET  | /api/purchases/:id | Get purchase + items + payments |
| POST | /api/purchases | Create purchase with line items |
| PUT  | /api/purchases/:id/status | Update purchase status |
| POST | /api/purchases/:id/payment | Record payment to supplier |

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/sales | List sales (supports ?status= ?from= ?to=) |
| GET  | /api/sales/:id | Get sale + items + payments |
| POST | /api/sales | Create sale with line items |
| PUT  | /api/sales/:id/status | Update sale status |
| POST | /api/sales/:id/payment | Record payment from buyer |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/inventory | Current stock levels (supports ?low_stock=true) |
| GET  | /api/inventory/movements | Stock movement log |
| GET  | /api/inventory/warehouses | Warehouse stock summary |
| POST | /api/inventory/adjust | Manual stock adjustment |
| PUT  | /api/inventory/reorder-level | Set reorder alert level |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/payments | All payments (supports ?direction= ?party_type=) |
| GET  | /api/payments/receivables | Outstanding amounts from buyers |
| GET  | /api/payments/payables | Outstanding amounts to suppliers |
| GET  | /api/payments/:id | Single payment |

### Warehouses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/warehouses | All warehouses with stock totals |
| GET  | /api/warehouses/:id | Warehouse + full stock breakdown |
| POST | /api/warehouses | Add warehouse |
| PUT  | /api/warehouses/:id | Update warehouse |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/dashboard/overview | KPIs, revenue, profit (supports ?period=30) |
| GET  | /api/dashboard/profit-by-grain | Profit breakdown per grain |
| GET  | /api/dashboard/sales-trend | Daily sales trend |
| GET  | /api/dashboard/purchase-trend | Daily purchase trend |
| GET  | /api/dashboard/inventory-summary | Full inventory snapshot |
| GET  | /api/dashboard/top-suppliers | Top 10 suppliers by value |
| GET  | /api/dashboard/top-buyers | Top 10 buyers by value |

---

## 📦 Create Purchase Example
```json
POST /api/purchases
{
  "supplier_id": "uuid-here",
  "warehouse_id": "uuid-here",
  "purchase_date": "2024-03-15",
  "items": [
    {
      "grain_id": "uuid-here",
      "quantity": 5000,
      "unit": "kg",
      "price_per_kg": 2.50,
      "quality_grade": "A"
    }
  ]
}
```

## 🛒 Create Sale Example
```json
POST /api/sales
{
  "buyer_id": "uuid-here",
  "warehouse_id": "uuid-here",
  "sale_date": "2024-03-16",
  "items": [
    {
      "grain_id": "uuid-here",
      "quantity": 2000,
      "unit": "kg",
      "price_per_kg": 3.20
    }
  ]
}
```
