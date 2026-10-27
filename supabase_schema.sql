-- ==============================================================================
-- SMASHCOURT PRO — SUPABASE DATABASE SCHEMA & REALTIME SETUP
-- ==============================================================================

-- 1. BẢNG SƠ ĐỒ 4 SÂN (COURTS)
CREATE TABLE IF NOT EXISTS public.courts (
    id INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    zone VARCHAR(100) NOT NULL,
    mat_color VARCHAR(20) NOT NULL DEFAULT 'green',
    status VARCHAR(20) NOT NULL DEFAULT 'free', -- 'free', 'active', 'reserved', 'maintenance'
    customer VARCHAR(255) DEFAULT '',
    rate_type VARCHAR(20) NOT NULL DEFAULT 'normal', -- 'normal', 'peak'
    hourly_rate INT NOT NULL DEFAULT 60000,
    start_time VARCHAR(20) DEFAULT '',
    booked_hours NUMERIC(3,1) DEFAULT 1.5,
    elapsed_minutes INT DEFAULT 0,
    deposit INT DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.courts(id,name,zone,mat_color) VALUES
(1,'Sân 1','Sân thảm xanh','green'),(2,'Sân 2','Sân thảm xanh','green'),
(3,'Sân 3','Sân thảm xám','grey'),(4,'Sân 4','Sân thảm xám','grey') ON CONFLICT DO NOTHING;

-- 2. BẢNG DANH MỤC SẢN PHẨM & DỊCH VỤ POS (PRODUCTS)
CREATE TABLE IF NOT EXISTS public.products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'drink', 'grip', 'shuttle', 'rental'
    unit VARCHAR(20) NOT NULL,
    cost INT NOT NULL DEFAULT 0,
    price INT NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    sold_today INT NOT NULL DEFAULT 0,
    icon VARCHAR(10) DEFAULT '🏸',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Khởi tạo danh mục sản phẩm chuẩn giá mới (Revive 12k, TC77 340k, Cầu lẻ TC77 30k)
INSERT INTO public.products (id, name, category, unit, cost, price, stock, sold_today, icon)
VALUES
('p1', 'Nước bù khoáng Revive', 'drink', 'Chai', 8000, 12000, 64, 0, '🥤'),
('p2', 'Revive Chanh Muối', 'drink', 'Chai', 8500, 15000, 42, 0, '🍋'),
('p3', 'Nước suối Aquafina 500ml', 'drink', 'Chai', 4500, 10000, 85, 0, '💧'),
('p4', 'Bò húc RedBull Thái', 'drink', 'Lon', 12000, 20000, 36, 0, '⚡'),
('p5', 'Điện giải Pocari Sweat', 'drink', 'Chai', 14000, 22000, 28, 0, '🧊'),
('p6', 'Quấn cán VS chống trơn', 'grip', 'Cái', 9000, 20000, 12, 0, '🎾'),
('p7', 'Quấn cán Yonex AC102EX', 'grip', 'Cái', 22000, 35000, 19, 0, '🎗️'),
('p8', 'Quấn cán vải chống mồ hôi', 'grip', 'Cuộn', 13000, 25000, 24, 0, '🧶'),
('p9', 'Ống cầu Hải Yến S90 (12 quả)', 'shuttle', 'Ống', 205000, 245000, 9, 0, '🏸'),
('p10', 'Cầu lẻ Thành Công 77', 'shuttle', 'Quả', 22000, 30000, 45, 0, '🪶'),
('p11', 'Ống cầu Thành Công 77', 'shuttle', 'Ống', 290000, 340000, 15, 0, '🏸'),
('p12', 'Thuê vợt Carbon Yonex', 'rental', 'Cây/ca', 0, 30000, 8, 0, '🏸')
ON CONFLICT (id) DO NOTHING;

-- 3. BẢNG ĐẶT SÂN (BOOKINGS)
CREATE TABLE IF NOT EXISTS public.bookings (
    id VARCHAR(50) PRIMARY KEY,
    customer VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    court_id INT NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
    slot VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'Khách đặt Online',
    deposit INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'reserved', -- 'reserved', 'checked_in', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. BẢNG HÓA ĐƠN DOANH THU (INVOICES)
CREATE TABLE IF NOT EXISTS public.invoices (
    id VARCHAR(50) PRIMARY KEY,
    time VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'court' hoặc 'retail'
    court_name VARCHAR(100) NOT NULL,
    customer VARCHAR(255) DEFAULT '',
    court_fee INT DEFAULT 0,
    pos_fee INT DEFAULT 0,
    discount INT DEFAULT 0,
    total INT NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Tiền mặt', -- 'Tiền mặt', 'Chuyển khoản QR'
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- All application access is installed by migrations/001_transactional_backend.sql.
-- No demo bookings, active sessions, or public write policies are created here.
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.courts,public.products,public.bookings,public.invoices FROM anon,authenticated;
