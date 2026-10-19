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

-- Khởi tạo dữ liệu mặc định 4 sân (2 Sân Thảm xanh, 2 Sân Thảm xám)
INSERT INTO public.courts (id, name, zone, mat_color, status, customer, rate_type, hourly_rate, start_time, booked_hours, elapsed_minutes, deposit, items)
VALUES
(1, 'Sân 1', 'Sân thảm xanh', 'green', 'active', 'Nhóm Anh Tuấn', 'normal', 60000, '14:00', 1.5, 52, 0, '[{"productId": "p9", "name": "Ống cầu Hải Yến S90", "price": 245000, "qty": 1}, {"productId": "p1", "name": "Nước bù khoáng Revive", "price": 12000, "qty": 4}]'::jsonb),
(2, 'Sân 2', 'Sân thảm xanh', 'green', 'free', '', 'normal', 60000, '', 1.5, 0, 0, '[]'::jsonb),
(3, 'Sân 3', 'Sân thảm xám', 'grey', 'active', 'Nhóm Chị Lan', 'normal', 60000, '13:00', 2.0, 80, 0, '[{"productId": "p10", "name": "Cầu lẻ Thành Công 77", "price": 30000, "qty": 3}, {"productId": "p3", "name": "Nước suối Aquafina 500ml", "price": 10000, "qty": 2}]'::jsonb),
(4, 'Sân 4', 'Sân thảm xám', 'grey', 'reserved', 'Đội Anh Hoàng (17:00 - 19:00)', 'peak', 80000, '17:00', 2.0, 0, 50000, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

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
('p1', 'Nước bù khoáng Revive', 'drink', 'Chai', 8000, 12000, 64, 18, '🥤'),
('p2', 'Revive Chanh Muối', 'drink', 'Chai', 8500, 15000, 42, 14, '🍋'),
('p3', 'Nước suối Aquafina 500ml', 'drink', 'Chai', 4500, 10000, 85, 22, '💧'),
('p4', 'Bò húc RedBull Thái', 'drink', 'Lon', 12000, 20000, 36, 9, '⚡'),
('p5', 'Điện giải Pocari Sweat', 'drink', 'Chai', 14000, 22000, 28, 7, '🧊'),
('p6', 'Quấn cán VS chống trơn', 'grip', 'Cái', 9000, 20000, 12, 16, '🎾'),
('p7', 'Quấn cán Yonex AC102EX', 'grip', 'Cái', 22000, 35000, 19, 8, '🎗️'),
('p8', 'Quấn cán vải chống mồ hôi', 'grip', 'Cuộn', 13000, 25000, 24, 5, '🧶'),
('p9', 'Ống cầu Hải Yến S90 (12 quả)', 'shuttle', 'Ống', 205000, 245000, 9, 6, '🏸'),
('p10', 'Cầu lẻ Thành Công 77', 'shuttle', 'Quả', 22000, 30000, 45, 19, '🪶'),
('p11', 'Ống cầu Thành Công 77', 'shuttle', 'Ống', 290000, 340000, 15, 8, '🏸'),
('p12', 'Thuê vợt Carbon Yonex', 'rental', 'Cây/ca', 0, 30000, 8, 4, '🏸')
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, name = EXCLUDED.name;

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

-- Khởi tạo vài lịch đặt mẫu
INSERT INTO public.bookings (id, customer, phone, court_id, slot, type, deposit, status)
VALUES
('BK-101', 'Đội Anh Hoàng', '0988.412.889', 4, '17:00 - 19:00', 'Khách vãng lai', 50000, 'reserved'),
('BK-102', 'CLB Cầu Lông Hà Đông', '0912.678.234', 1, '18:00 - 20:00', 'Cố định tháng', 100000, 'reserved'),
('BK-103', 'Nhóm Anh Kiên (FPT)', '0979.331.556', 3, '19:00 - 21:00', 'Khách vãng lai', 50000, 'reserved'),
('BK-106', 'Nhóm Anh Tuấn', '0963.882.110', 1, '14:00 - 16:00', 'Khách vãng lai', 0, 'checked_in')
ON CONFLICT (id) DO NOTHING;

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

-- 5. KÍCH HOẠT REALTIME CHO TẤT CẢ CÁC BẢNG TRÊN SUPABASE
ALTER PUBLICATION supabase_realtime ADD TABLE public.courts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;

-- 6. PHÂN QUYỀN BẢO MẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Cho phép người dùng công khai (khách) ĐỌC sân, sản phẩm
CREATE POLICY "Public Read Courts" ON public.courts FOR SELECT USING (true);
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Read Bookings" ON public.bookings FOR SELECT USING (true);

-- Cho phép khách đặt sân (INSERT đơn mới)
CREATE POLICY "Public Insert Bookings" ON public.bookings FOR INSERT WITH CHECK (true);

-- Cho phép Admin cập nhật và xóa toàn quyền (dùng anon key hoặc service key)
CREATE POLICY "Admin Full Access Courts" ON public.courts FOR ALL USING (true);
CREATE POLICY "Admin Full Access Products" ON public.products FOR ALL USING (true);
CREATE POLICY "Admin Full Access Bookings" ON public.bookings FOR ALL USING (true);
CREATE POLICY "Admin Full Access Invoices" ON public.invoices FOR ALL USING (true);
