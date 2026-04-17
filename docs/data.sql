-- Database Schema for Print Production Management System (PPMS)

-- 1. Roles table
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  portal TEXT NOT NULL -- 'management' or 'operation'
);

-- 2. Departments table
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL
);

-- 3. Users table (Simplified Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  role_id INTEGER REFERENCES roles(id),
  department_id INTEGER REFERENCES departments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT, -- 'Khách lẻ', 'Khách VIP', etc.
  phone TEXT,
  address TEXT,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  prepaid_amount DECIMAL(15, 2) DEFAULT 0,
  current_debt DECIMAL(15, 2) DEFAULT 0,
  payment_term TEXT, -- 'Ngay', '7 ngày', 'Theo tháng'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Production Orders (LSX)
CREATE TABLE production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  title TEXT NOT NULL, -- Nội dung in
  specs JSONB, -- { "quantity": 1000, "size": "A5", "sides": 1, "paper_type": "C150" }
  financials JSONB, -- { "unit_price": 500, "total": 500000, "vat": 0.1, "total_with_vat": 550000, "received": 200000 }
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  workflow_steps JSONB, -- Order of department IDs e.g. [2, 3, 7]
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tasks (Work per department)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES production_orders(id),
  department_id INTEGER REFERENCES departments(id),
  sequence_order INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'ready', 'in_progress', 'done', 'issue', 'on_hold'
  assigned_to UUID REFERENCES users(id),
  
  -- Timing & KPI
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  kpi_start_time TIMESTAMP WITH TIME ZONE,
  ready_at TIMESTAMP WITH TIME ZONE, -- Time when previous step was done
  hold_start_time TIMESTAMP WITH TIME ZONE, -- For calculating hold duration
  total_hold_seconds INTEGER DEFAULT 0,
  estimated_duration_seconds INTEGER, -- Estimated time for this task
  
  issue_log TEXT,
  machine_info JSONB, -- { "machine_id": "Konica-01", "mode": "Màu" }
  processing_info JSONB, -- { "lamination": "bóng", "folding": true }
  
  -- Automated Material Logic
  material_requested_qty DECIMAL(15, 2) DEFAULT 0,
  material_received_qty DECIMAL(15, 2) DEFAULT 0,
  material_shortage BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Material Inventory
CREATE TABLE materials (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- 'Tờ', 'Mét', 'Kg'
  stock_quantity DECIMAL(15, 2) DEFAULT 0,
  min_stock DECIMAL(15, 2) DEFAULT 0,
  category TEXT
);

-- 8. Inventory Logs
CREATE TABLE inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id INTEGER REFERENCES materials(id),
  task_id UUID REFERENCES tasks(id),
  order_id UUID REFERENCES production_orders(id),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL, -- 'import', 'export', 'usage', 'waste'
  quantity DECIMAL(15, 2) NOT NULL,
  reason TEXT,
  is_waste_correction BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Payment Logs
CREATE TABLE payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES production_orders(id),
  amount DECIMAL(15, 2) NOT NULL,
  type TEXT NOT NULL DEFAULT 'payment', -- 'payment', 'refund'
  method TEXT NOT NULL DEFAULT 'bank_transfer', -- 'cash', 'bank_transfer', 'momo'
  note TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Static Data Initialization
INSERT INTO roles (id, name, portal) VALUES 
(1, 'Quản lý', 'management'),
(4, 'Giám đốc', 'management'),
(5, 'Kế toán', 'management'),
(6, 'Điều phối', 'management'),
(2, 'Sản xuất', 'operation'),
(3, 'Kho', 'operation');

INSERT INTO departments (id, name, code) VALUES
(1, 'Tầng G', 'FLG'),
(2, 'Tầng 1', 'FL1'),
(3, 'Tầng 3', 'FL3'),
(4, 'Tầng 4', 'FL4'),
(5, 'Tầng 5', 'FL5'),
(6, 'In Offset', 'OFFSET'),
(7, 'Kho 2', 'WH2');




-- 1. Tạo vai trò Quản lý nếu chưa có
INSERT INTO roles (id, name, portal) VALUES (1, 'Quản lý', 'management') ON CONFLICT DO NOTHING;

-- 2. Tạo tài khoản Admin (Username: admin / Password: admin123)
INSERT INTO users (username, password, full_name, role_id) 
VALUES ('admin', '$2a$10$X.pT.H5U6vPqOQ0u5jW5.O5m6y6y6y6y6y6y6y6y6y6y6y6y6y6y', 'Hệ thống Quản trị', 1);
