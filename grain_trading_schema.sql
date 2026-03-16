-- ============================================================
--  GRAIN TRADING BUSINESS — PostgreSQL Database Schema
--  Version: 1.0
--  Description: Full schema for managing grain purchases,
--               sales, inventory, suppliers, buyers & payments
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
--  ENUMS
-- ============================================================

CREATE TYPE transaction_status AS ENUM ('pending', 'partial', 'completed', 'cancelled');
CREATE TYPE payment_method     AS ENUM ('cash', 'bank_transfer', 'mobile_money', 'cheque');
CREATE TYPE payment_direction  AS ENUM ('inflow', 'outflow');
CREATE TYPE movement_type      AS ENUM ('purchase', 'sale', 'adjustment', 'transfer', 'loss');
CREATE TYPE unit_of_measure    AS ENUM ('kg', 'tonnes', 'bags', 'crates');
CREATE TYPE user_role          AS ENUM ('admin', 'manager', 'sales_officer', 'warehouse_officer', 'accountant');

-- ============================================================
--  1. MASTER DATA TABLES
-- ============================================================

-- 1a. Grains / Commodities
CREATE TABLE grains (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL UNIQUE,           -- e.g. Soyabean, Rice, Groundnut
    variety         VARCHAR(100),                           -- e.g. Local, Imported, Grade A
    default_unit    unit_of_measure NOT NULL DEFAULT 'kg',
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1b. Warehouses / Storage Locations
CREATE TABLE warehouses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(150) NOT NULL,
    location        VARCHAR(255),
    region          VARCHAR(100),
    capacity_kg     NUMERIC(15, 2),                        -- Maximum storage in KG
    manager_name    VARCHAR(150),
    phone           VARCHAR(30),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1c. Suppliers
CREATE TABLE suppliers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(20) UNIQUE,                    -- e.g. SUP-001
    full_name       VARCHAR(200) NOT NULL,
    company_name    VARCHAR(200),
    phone           VARCHAR(30) NOT NULL,
    alt_phone       VARCHAR(30),
    email           VARCHAR(150),
    region          VARCHAR(100),
    address         TEXT,
    id_type         VARCHAR(50),                           -- Ghana Card, Passport, etc.
    id_number       VARCHAR(80),
    bank_name       VARCHAR(100),
    bank_account    VARCHAR(50),
    momo_number     VARCHAR(30),
    rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1d. Buyers
CREATE TABLE buyers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(20) UNIQUE,                    -- e.g. BUY-001
    full_name       VARCHAR(200) NOT NULL,
    company_name    VARCHAR(200),
    phone           VARCHAR(30) NOT NULL,
    alt_phone       VARCHAR(30),
    email           VARCHAR(150),
    region          VARCHAR(100),
    address         TEXT,
    id_type         VARCHAR(50),
    id_number       VARCHAR(80),
    bank_name       VARCHAR(100),
    bank_account    VARCHAR(50),
    momo_number     VARCHAR(30),
    credit_limit    NUMERIC(15, 2) DEFAULT 0,              -- Max credit allowed
    credit_balance  NUMERIC(15, 2) DEFAULT 0,              -- Current outstanding credit
    rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1e. Users / Staff
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(200) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    phone           VARCHAR(30),
    password_hash   TEXT NOT NULL,
    role            user_role NOT NULL DEFAULT 'sales_officer',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  2. PURCHASE TABLES (Buying from Suppliers)
-- ============================================================

-- 2a. Purchase Orders (Header)
CREATE TABLE purchases (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference       VARCHAR(30) NOT NULL UNIQUE,           -- e.g. PUR-2024-0001
    supplier_id     UUID NOT NULL REFERENCES suppliers(id),
    warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
    recorded_by     UUID REFERENCES users(id),
    purchase_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date   DATE,
    status          transaction_status NOT NULL DEFAULT 'pending',
    total_amount    NUMERIC(15, 2) NOT NULL DEFAULT 0,     -- Computed from items
    amount_paid     NUMERIC(15, 2) NOT NULL DEFAULT 0,
    balance_due     NUMERIC(15, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2b. Purchase Line Items
CREATE TABLE purchase_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id     UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    grain_id        UUID NOT NULL REFERENCES grains(id),
    quantity        NUMERIC(15, 2) NOT NULL CHECK (quantity > 0),
    unit            unit_of_measure NOT NULL DEFAULT 'kg',
    quantity_kg     NUMERIC(15, 2) NOT NULL,               -- Normalized to KG
    price_per_kg    NUMERIC(12, 4) NOT NULL CHECK (price_per_kg > 0),
    subtotal        NUMERIC(15, 2) GENERATED ALWAYS AS (quantity_kg * price_per_kg) STORED,
    quality_grade   VARCHAR(20),                           -- A, B, C or custom
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  3. SALES TABLES (Selling to Buyers)
-- ============================================================

-- 3a. Sales Orders (Header)
CREATE TABLE sales (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference       VARCHAR(30) NOT NULL UNIQUE,           -- e.g. SAL-2024-0001
    buyer_id        UUID NOT NULL REFERENCES buyers(id),
    warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
    recorded_by     UUID REFERENCES users(id),
    sale_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date   DATE,
    status          transaction_status NOT NULL DEFAULT 'pending',
    total_amount    NUMERIC(15, 2) NOT NULL DEFAULT 0,
    amount_paid     NUMERIC(15, 2) NOT NULL DEFAULT 0,
    balance_due     NUMERIC(15, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3b. Sale Line Items
CREATE TABLE sale_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    grain_id        UUID NOT NULL REFERENCES grains(id),
    quantity        NUMERIC(15, 2) NOT NULL CHECK (quantity > 0),
    unit            unit_of_measure NOT NULL DEFAULT 'kg',
    quantity_kg     NUMERIC(15, 2) NOT NULL,               -- Normalized to KG
    price_per_kg    NUMERIC(12, 4) NOT NULL CHECK (price_per_kg > 0),
    subtotal        NUMERIC(15, 2) GENERATED ALWAYS AS (quantity_kg * price_per_kg) STORED,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  4. INVENTORY TABLES
-- ============================================================

-- 4a. Current Stock Levels (per grain per warehouse)
CREATE TABLE inventory (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grain_id        UUID NOT NULL REFERENCES grains(id),
    warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
    quantity_kg     NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (quantity_kg >= 0),
    reorder_level   NUMERIC(15, 2) DEFAULT 0,              -- Alert threshold in KG
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (grain_id, warehouse_id)
);

-- 4b. Stock Movement Ledger (audit trail of every change)
CREATE TABLE stock_movements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grain_id        UUID NOT NULL REFERENCES grains(id),
    warehouse_id    UUID NOT NULL REFERENCES warehouses(id),
    movement_type   movement_type NOT NULL,
    reference_id    UUID,                                  -- Links to purchase_id or sale_id
    reference_no    VARCHAR(30),                           -- Human-readable ref
    quantity_kg     NUMERIC(15, 2) NOT NULL,               -- Positive = inflow, Negative = outflow
    balance_after   NUMERIC(15, 2) NOT NULL,               -- Running balance after this movement
    notes           TEXT,
    recorded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  5. PAYMENTS TABLES
-- ============================================================

-- 5a. Payments (unified table for inflows from buyers & outflows to suppliers)
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference       VARCHAR(30) NOT NULL UNIQUE,           -- e.g. PAY-2024-0001
    direction       payment_direction NOT NULL,            -- 'inflow' or 'outflow'
    party_type      VARCHAR(10) NOT NULL CHECK (party_type IN ('buyer', 'supplier')),
    party_id        UUID NOT NULL,                         -- buyer_id or supplier_id
    transaction_id  UUID,                                  -- sale_id or purchase_id
    transaction_ref VARCHAR(30),
    amount          NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    method          payment_method NOT NULL DEFAULT 'cash',
    payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    bank_reference  VARCHAR(100),                          -- Cheque no / Transfer ref
    recorded_by     UUID REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  6. EXPENSES TABLE
-- ============================================================

CREATE TABLE expenses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference       VARCHAR(30) NOT NULL UNIQUE,
    category        VARCHAR(100) NOT NULL,                 -- Transport, Loading, Storage, etc.
    description     TEXT,
    amount          NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    purchase_id     UUID REFERENCES purchases(id),         -- Link to a purchase if applicable
    recorded_by     UUID REFERENCES users(id),
    method          payment_method NOT NULL DEFAULT 'cash',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  7. PRICE HISTORY TABLE
-- ============================================================

CREATE TABLE price_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grain_id        UUID NOT NULL REFERENCES grains(id),
    price_per_kg    NUMERIC(12, 4) NOT NULL,
    price_type      VARCHAR(10) NOT NULL CHECK (price_type IN ('buy', 'sell')),
    effective_date  DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  8. AUDIT LOG TABLE
-- ============================================================

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id),
    action          VARCHAR(50) NOT NULL,                  -- INSERT, UPDATE, DELETE
    table_name      VARCHAR(100) NOT NULL,
    record_id       UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  9. INDEXES (for query performance)
-- ============================================================

-- Purchases
CREATE INDEX idx_purchases_supplier     ON purchases(supplier_id);
CREATE INDEX idx_purchases_date         ON purchases(purchase_date);
CREATE INDEX idx_purchases_status       ON purchases(status);
CREATE INDEX idx_purchase_items_grain   ON purchase_items(grain_id);

-- Sales
CREATE INDEX idx_sales_buyer            ON sales(buyer_id);
CREATE INDEX idx_sales_date             ON sales(sale_date);
CREATE INDEX idx_sales_status           ON sales(status);
CREATE INDEX idx_sale_items_grain       ON sale_items(grain_id);

-- Inventory & Movements
CREATE INDEX idx_inventory_grain        ON inventory(grain_id);
CREATE INDEX idx_inventory_warehouse    ON inventory(warehouse_id);
CREATE INDEX idx_stock_movements_grain  ON stock_movements(grain_id);
CREATE INDEX idx_stock_movements_type   ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date   ON stock_movements(created_at);

-- Payments
CREATE INDEX idx_payments_party         ON payments(party_id);
CREATE INDEX idx_payments_date          ON payments(payment_date);
CREATE INDEX idx_payments_direction     ON payments(direction);

-- ============================================================
--  10. VIEWS (pre-built queries for the dashboard)
-- ============================================================

-- V1. Current inventory with grain and warehouse names
CREATE VIEW vw_current_inventory AS
SELECT
    i.id,
    g.name              AS grain,
    g.variety,
    w.name              AS warehouse,
    w.region,
    i.quantity_kg,
    i.reorder_level,
    CASE WHEN i.quantity_kg <= i.reorder_level THEN TRUE ELSE FALSE END AS low_stock_alert,
    i.last_updated
FROM inventory i
JOIN grains    g ON g.id = i.grain_id
JOIN warehouses w ON w.id = i.warehouse_id
WHERE g.is_active = TRUE;

-- V2. Purchase summary with supplier name and balances
CREATE VIEW vw_purchases_summary AS
SELECT
    p.id,
    p.reference,
    s.full_name         AS supplier,
    s.phone             AS supplier_phone,
    w.name              AS warehouse,
    p.purchase_date,
    p.status,
    p.total_amount,
    p.amount_paid,
    p.balance_due
FROM purchases p
JOIN suppliers  s ON s.id = p.supplier_id
JOIN warehouses w ON w.id = p.warehouse_id;

-- V3. Sales summary with buyer name and balances
CREATE VIEW vw_sales_summary AS
SELECT
    sl.id,
    sl.reference,
    b.full_name         AS buyer,
    b.phone             AS buyer_phone,
    w.name              AS warehouse,
    sl.sale_date,
    sl.status,
    sl.total_amount,
    sl.amount_paid,
    sl.balance_due
FROM sales      sl
JOIN buyers     b ON b.id = sl.buyer_id
JOIN warehouses w ON w.id = sl.warehouse_id;

-- V4. Profit & Loss per grain (buy cost vs. sell revenue)
CREATE VIEW vw_profit_by_grain AS
SELECT
    g.name                          AS grain,
    COALESCE(SUM(pi.subtotal), 0)   AS total_buy_cost,
    COALESCE(SUM(si.subtotal), 0)   AS total_sell_revenue,
    COALESCE(SUM(si.subtotal), 0)
        - COALESCE(SUM(pi.subtotal), 0) AS gross_profit
FROM grains g
LEFT JOIN purchase_items pi ON pi.grain_id = g.id
LEFT JOIN sale_items     si ON si.grain_id = g.id
GROUP BY g.name;

-- V5. Outstanding receivables (buyers who owe money)
CREATE VIEW vw_outstanding_receivables AS
SELECT
    b.full_name         AS buyer,
    b.phone,
    COUNT(sl.id)        AS open_orders,
    SUM(sl.balance_due) AS total_outstanding
FROM sales sl
JOIN buyers b ON b.id = sl.buyer_id
WHERE sl.balance_due > 0 AND sl.status != 'cancelled'
GROUP BY b.full_name, b.phone
ORDER BY total_outstanding DESC;

-- V6. Outstanding payables (suppliers we owe money to)
CREATE VIEW vw_outstanding_payables AS
SELECT
    s.full_name         AS supplier,
    s.phone,
    COUNT(p.id)         AS open_orders,
    SUM(p.balance_due)  AS total_outstanding
FROM purchases p
JOIN suppliers s ON s.id = p.supplier_id
WHERE p.balance_due > 0 AND p.status != 'cancelled'
GROUP BY s.full_name, s.phone
ORDER BY total_outstanding DESC;

-- ============================================================
--  11. FUNCTIONS & TRIGGERS
-- ============================================================

-- Function: Auto-update inventory after a purchase item is inserted
CREATE OR REPLACE FUNCTION fn_update_inventory_on_purchase()
RETURNS TRIGGER AS $$
DECLARE
    v_warehouse UUID;
    v_new_balance NUMERIC;
BEGIN
    SELECT warehouse_id INTO v_warehouse FROM purchases WHERE id = NEW.purchase_id;

    -- Upsert inventory record
    INSERT INTO inventory (grain_id, warehouse_id, quantity_kg)
    VALUES (NEW.grain_id, v_warehouse, NEW.quantity_kg)
    ON CONFLICT (grain_id, warehouse_id)
    DO UPDATE SET
        quantity_kg  = inventory.quantity_kg + NEW.quantity_kg,
        last_updated = NOW();

    -- Get updated balance
    SELECT quantity_kg INTO v_new_balance
    FROM inventory WHERE grain_id = NEW.grain_id AND warehouse_id = v_warehouse;

    -- Log the movement
    INSERT INTO stock_movements
        (grain_id, warehouse_id, movement_type, reference_id, reference_no, quantity_kg, balance_after)
    SELECT
        NEW.grain_id, v_warehouse, 'purchase', NEW.purchase_id, p.reference, NEW.quantity_kg, v_new_balance
    FROM purchases p WHERE p.id = NEW.purchase_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_on_purchase
AFTER INSERT ON purchase_items
FOR EACH ROW EXECUTE FUNCTION fn_update_inventory_on_purchase();

-- Function: Auto-update inventory after a sale item is inserted
CREATE OR REPLACE FUNCTION fn_update_inventory_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    v_warehouse   UUID;
    v_current_qty NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    SELECT warehouse_id INTO v_warehouse FROM sales WHERE id = NEW.sale_id;

    -- Check available stock
    SELECT quantity_kg INTO v_current_qty
    FROM inventory WHERE grain_id = NEW.grain_id AND warehouse_id = v_warehouse;

    IF v_current_qty IS NULL OR v_current_qty < NEW.quantity_kg THEN
        RAISE EXCEPTION 'Insufficient stock: available % kg, requested % kg',
            COALESCE(v_current_qty, 0), NEW.quantity_kg;
    END IF;

    -- Deduct from inventory
    UPDATE inventory
    SET quantity_kg  = quantity_kg - NEW.quantity_kg,
        last_updated = NOW()
    WHERE grain_id = NEW.grain_id AND warehouse_id = v_warehouse;

    -- Get updated balance
    SELECT quantity_kg INTO v_new_balance
    FROM inventory WHERE grain_id = NEW.grain_id AND warehouse_id = v_warehouse;

    -- Log the movement (negative = outflow)
    INSERT INTO stock_movements
        (grain_id, warehouse_id, movement_type, reference_id, reference_no, quantity_kg, balance_after)
    SELECT
        NEW.grain_id, v_warehouse, 'sale', NEW.sale_id, s.reference, -NEW.quantity_kg, v_new_balance
    FROM sales s WHERE s.id = NEW.sale_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_on_sale
AFTER INSERT ON sale_items
FOR EACH ROW EXECUTE FUNCTION fn_update_inventory_on_sale();

-- Function: Auto-update purchase total_amount when items change
CREATE OR REPLACE FUNCTION fn_sync_purchase_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchases
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM purchase_items WHERE purchase_id = COALESCE(NEW.purchase_id, OLD.purchase_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.purchase_id, OLD.purchase_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_purchase_total
AFTER INSERT OR UPDATE OR DELETE ON purchase_items
FOR EACH ROW EXECUTE FUNCTION fn_sync_purchase_total();

-- Function: Auto-update sale total_amount when items change
CREATE OR REPLACE FUNCTION fn_sync_sale_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sales
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM sale_items WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_sale_total
AFTER INSERT OR UPDATE OR DELETE ON sale_items
FOR EACH ROW EXECUTE FUNCTION fn_sync_sale_total();

-- ============================================================
--  12. SEED DATA (Starter records)
-- ============================================================

-- Grain types
INSERT INTO grains (name, variety, default_unit, description) VALUES
    ('Soyabean',   'Local',    'kg', 'Locally grown soyabean'),
    ('Groundnut',  'Shelled',  'kg', 'Shelled groundnut / peanut'),
    ('Maize',      'Yellow',   'kg', 'Yellow maize / corn'),
    ('Rice',       'Local',    'kg', 'Locally milled rice'),
    ('Rice',       'Imported', 'kg', 'Imported parboiled rice'),
    ('Cowpea',     'White',    'kg', 'White cowpea / beans'),
    ('Millet',     'Pearl',    'kg', 'Pearl millet'),
    ('Sorghum',    'Red',      'kg', 'Red sorghum / guinea corn');

-- Default warehouse
INSERT INTO warehouses (name, location, region, capacity_kg, manager_name) VALUES
    ('Main Warehouse', 'Accra Central', 'Greater Accra', 500000, 'Warehouse Manager'),
    ('Kumasi Depot',   'Adum, Kumasi',  'Ashanti',       300000, 'Depot Manager');

-- ============================================================
--  END OF SCHEMA
-- ============================================================
