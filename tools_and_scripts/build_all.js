const fs = require('fs');
const path = require('path');

// 1. GENERATE PC.HTML
function generatePC() {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SmashCourt Pro — Bản Máy Tính (PC & Quản Lý Thu Ngân)</title>
  <script src="https://cdn.tailwindcss.com/3.4.17"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
    }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    @keyframes pulse-dot { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: 0.65; } }
    .live-dot { animation: pulse-dot 1.8s infinite; }
    .court-bg-green { background: linear-gradient(135deg, #059669 0%, #047857 100%); }
    .court-bg-grey { background: linear-gradient(135deg, #475569 0%, #334155 100%); }
    @media print {
      body * { visibility: hidden; }
      #print-receipt-area, #print-receipt-area * { visibility: visible; }
      #print-receipt-area { position: absolute; left: 0; top: 0; width: 100%; max-width: 320px; }
    }
  </style>
</head>
<body class="min-h-screen flex flex-col selection:bg-emerald-600 selection:text-white">

  <!-- TOP PC NAV BAR -->
  <header class="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
    <div class="max-w-7xl mx-auto px-6 lg:px-8">
      <div class="flex items-center justify-between py-3">
        <!-- Logo & Address -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-xl shadow-md">
            🏸
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-lg text-white">SmashCourt<span class="text-emerald-400">Pro</span></span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Bản Máy Tính PC</span>
              <span id="role-mode-badge" class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Khách Đặt Sân</span>
            </div>
            <p class="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
              <span>📍 11 Lê Khôi</span>
              <span class="text-slate-500">•</span>
              <span class="text-emerald-300 font-semibold">2 Sân thảm xanh (Sân 1, 2) • 2 Sân thảm xám (Sân 3, 4)</span>
            </p>
          </div>
        </div>

        <!-- Right Side: Clock & Mode Controls -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-mono text-slate-200">
            <span class="w-2 h-2 rounded-full bg-emerald-400 live-dot"></span>
            <span id="live-clock-display">17:00:00 - T2, 19/10/2026</span>
          </div>

          <a href="mobile.html" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition">
            <span>📱 Chuyển Bản Mobile</span>
          </a>

          <button type="button" id="btn-open-admin-login" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition">
            <span>🔐 Đăng Nhập Quản Lý</span>
          </button>

          <div id="admin-header-controls" class="hidden flex items-center gap-2">
            <button type="button" id="btn-toggle-customer-preview" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition">
              Giao diện Khách
            </button>
            <button type="button" id="btn-reset-demo" class="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 transition">
              Khôi phục mẫu
            </button>
            <button type="button" id="btn-admin-logout" class="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition">
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      <!-- Admin Tab Bar -->
      <div id="admin-nav-bar" class="hidden pb-2.5 pt-1 border-t border-slate-800">
        <nav class="flex items-center gap-2">
          <button type="button" data-nav="courts" class="nav-tab-btn px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-emerald-500 text-slate-950 shadow-sm">
            <span>🏸 Sơ Đồ 4 Sân</span>
            <span id="badge-active-courts" class="px-2 py-0.5 text-[11px] rounded-full bg-slate-950/20 font-black">2/4</span>
          </button>
          <button type="button" data-nav="pos" class="nav-tab-btn px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800">
            <span>🛒 Quầy Bán Hàng POS</span>
            <span id="badge-pos-cart" class="hidden px-2 py-0.5 text-[11px] rounded-full bg-amber-400 text-slate-950 font-black">0</span>
          </button>
          <button type="button" data-nav="schedule" class="nav-tab-btn px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800">
            <span>📅 Lịch Đặt Trong Ngày</span>
          </button>
          <button type="button" data-nav="inventory" class="nav-tab-btn px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800">
            <span>📦 Kho Nước & Cầu Lông</span>
            <span id="badge-low-stock" class="px-2 py-0.5 text-[11px] rounded-full bg-rose-500 text-white font-black">2</span>
          </button>
          <button type="button" data-nav="reports" class="nav-tab-btn px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800">
            <span>📊 Báo Cáo Doanh Thu & Hóa Đơn</span>
          </button>
        </nav>
      </div>
    </div>
  </header>

  <!-- ==================== GIAO DIỆN KHÁCH HÀNG (PC: 2 CỘT RỘNG RÃI) ==================== -->
  <section id="customer-portal" class="max-w-7xl w-full mx-auto px-6 lg:px-8 py-6 space-y-5">
    
    <!-- Top View Switcher: Đặt sân vs Mua nước -->
    <div class="bg-white p-1.5 rounded-2xl shadow-xs border border-slate-200 inline-flex gap-2">
      <button type="button" data-cust-tab="book" class="cust-tab-btn py-2 px-5 rounded-xl text-xs font-extrabold flex items-center gap-2 bg-emerald-600 text-white shadow-xs transition">
        <span>🏸 Đặt Lịch Sân Cầu Lông</span>
      </button>
      <button type="button" data-cust-tab="shop" class="cust-tab-btn py-2 px-5 rounded-xl text-xs font-extrabold flex items-center gap-2 text-slate-600 hover:bg-slate-100 transition">
        <span>🥤 Menu Nước Giải Khát & Phụ Kiện</span>
        <span id="cust-shop-badge" class="hidden px-2 py-0.5 rounded-full text-[11px] bg-amber-400 text-slate-950 font-black">0</span>
      </button>
    </div>

    <!-- TAB KHÁCH 1: ĐẶT SÂN (PC 2-COLUMN SPLIT LAYOUT) -->
    <div id="cust-view-book" class="grid grid-cols-12 gap-6 items-start">
      
      <!-- CỘT TRÁI (8 COLS): MA TRẬN LỊCH SÂN & BẢNG GIÁ -->
      <div class="col-span-8 space-y-5">
        
        <!-- Banner Bảng Giá Sân -->
        <div class="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-lg font-black tracking-tight">🏸 Bảng Giá & Đặt Sân Cầu Lông</h1>
              <p class="text-xs text-emerald-200 mt-0.5">Sân thảm tiêu chuẩn thi đấu, quạt mát, trần cao, bãi đỗ xe rộng rãi</p>
            </div>
            <span id="cust-club-date-badge" class="text-xs font-bold bg-white/15 px-3 py-1.5 rounded-xl border border-white/20">
              Hôm nay
            </span>
          </div>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="bg-slate-950/40 p-3 rounded-xl border border-white/10 flex items-center justify-between">
              <div>
                <span class="text-emerald-200 text-[11px] block">Giờ tiêu chuẩn (5h–17h & 21h–23h)</span>
                <strong class="text-white text-base font-black">60.000đ<span class="text-xs font-normal opacity-80">/giờ</span></strong>
              </div>
              <span class="text-xl">☀️</span>
            </div>
            <div class="bg-amber-400/20 p-3 rounded-xl border border-amber-300/30 flex items-center justify-between">
              <div>
                <span class="text-amber-200 text-[11px] block">Giờ cao điểm tối (17h00 – 21h00)</span>
                <strong class="text-amber-300 text-base font-black">80.000đ<span class="text-xs font-normal opacity-80">/giờ</span></strong>
              </div>
              <span class="text-xl">⚡</span>
            </div>
          </div>
        </div>

        <!-- Bảng Ma Trận Lịch Alobo -->
        <div class="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-base font-black text-slate-900">Bảng Chọn Khung Giờ & Sân (Chuẩn Alobo)</h2>
              <p class="text-xs text-slate-500">Chạm trực tiếp vào ô để chọn (chọn được nhiều ca liên tiếp hoặc nhiều sân cùng lúc)</p>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" data-cust-day="today" class="cust-day-btn px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-xs">Hôm nay</button>
              <button type="button" data-cust-day="tomorrow" class="cust-day-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">Ngày mai</button>
              <button type="button" data-cust-day="sunday" class="cust-day-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">Ngày kia</button>
            </div>
          </div>

          <!-- Quick Jump Buttons -->
          <div class="flex items-center justify-between gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span class="text-slate-500 font-bold text-xs">Nhảy nhanh đến:</span>
            <div class="flex items-center gap-1.5">
              <button type="button" data-jump-hour="06:00" class="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 font-bold text-slate-700">Sáng (6h)</button>
              <button type="button" data-jump-hour="14:00" class="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 font-bold text-slate-700">Chiều (14h)</button>
              <button type="button" data-jump-hour="17:00" class="px-3 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 font-extrabold">🔥 Tối Vàng (17h-21h)</button>
              <button type="button" data-jump-hour="21:00" class="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 font-bold text-slate-700">Đêm (21h)</button>
            </div>
          </div>

          <!-- Matrix Table with sticky left column -->
          <div id="cust-matrix-scroll-wrapper" class="isolate overflow-x-auto custom-scrollbar rounded-xl border border-[#b2dfdb] relative bg-white">
            <table class="w-full text-left border-collapse min-w-[1780px]">
              <thead class="bg-[#c0ebfb] text-[#0e362e] border-b border-[#cadfe8]">
                <tr id="cust-alobo-matrix-header" class="h-11">
                  <th class="w-28 min-w-[110px] sticky left-0 bg-[#c0ebfb] z-20 border-r-2 border-[#a3cdc2] h-11 p-0 text-center font-black text-xs text-slate-800">
                    Sân / Khung Giờ
                  </th>
                </tr>
              </thead>
              <tbody id="cust-alobo-matrix-body" class="text-xs bg-white"></tbody>
            </table>
          </div>

          <!-- Legend -->
          <div class="flex items-center justify-between text-xs text-slate-600 pt-1">
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-white border border-slate-300 inline-block"></span> Ô trắng: Còn trống</span>
              <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-emerald-600 text-white text-[10px] font-black inline-flex items-center justify-center">✓</span> Đang chọn</span>
              <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200 inline-block"></span> Đã kín</span>
              <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300 inline-block"></span> Tối 17h-21h (80k/h)</span>
            </div>
            <span class="text-emerald-700 font-bold">• 2 Sân thảm xanh (1, 2) & 2 Sân thảm xám (3, 4)</span>
          </div>
        </div>

        <!-- Recent Bookings List Card -->
        <div class="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-3">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span class="text-xs font-black uppercase tracking-wider text-slate-800">Lịch Sân Đã Đặt Gần Đây</span>
            <span class="text-xs text-emerald-600 font-bold">Đồng bộ trực tiếp với quầy thu ngân</span>
          </div>
          <div id="cust-my-bookings-list" class="space-y-2"></div>
        </div>

      </div>

      <!-- CỘT PHẢI (4 COLS, STICKY): PHIẾU ĐẶT SÂN & XÁC NHẬN -->
      <div class="col-span-4 sticky top-20 space-y-4">
        
        <form id="form-customer-booking" class="bg-white p-5 rounded-2xl shadow-md border border-slate-200 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-sm font-black text-slate-900 uppercase">Phiếu Đặt Sân Online</h3>
            <span id="cust-free-count-hint" class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200"></span>
          </div>

          <!-- Selected Slots Card -->
          <div id="cust-selected-summary-card">
            <div class="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400 bg-slate-50">
              👆 Vui lòng chạm vào các ô khung giờ trên bảng ma trận để bắt đầu chọn sân.
            </div>
          </div>

          <!-- Customer Name & Phone -->
          <div class="space-y-3 pt-1">
            <div>
              <label for="cust-book-name" class="block text-xs font-bold text-slate-700 mb-1">Họ tên của bạn / Tên nhóm CLB *</label>
              <input type="text" id="cust-book-name" required placeholder="VD: Anh Tuấn, Nhóm Cầu Lông..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label for="cust-book-phone" class="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ *</label>
              <input type="tel" id="cust-book-phone" required placeholder="VD: 0988123456" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <!-- Ready on Court Add-ons -->
          <div class="space-y-2 pt-2 border-t border-slate-100">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-700">Mang sẵn ra sân (Tùy chọn):</label>
              <button type="button" id="btn-open-addon-picker" class="text-xs font-bold text-emerald-600 hover:underline">
                + Chọn thêm món
              </button>
            </div>
            <div id="cust-addons-grid" class="space-y-2 text-xs"></div>
          </div>

          <!-- Price & Confirm Button -->
          <div class="pt-3 border-t border-slate-100 space-y-3">
            <div class="flex items-baseline justify-between">
              <span id="cust-book-total-label" class="text-xs text-slate-500 font-bold">Tạm tính:</span>
              <p id="cust-book-total-preview" class="text-2xl font-black text-emerald-600">0đ</p>
            </div>

            <button type="submit" id="btn-cust-submit-booking" class="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2">
              <span>Xác Nhận Đặt Sân Ngay</span>
            </button>
          </div>
        </form>

      </div>

    </div>

    <!-- TAB KHÁCH 2: MENU MUA NƯỚC & PHỤ KIỆN -->
    <div id="cust-view-shop" class="hidden space-y-5">
      <div class="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-black text-slate-900">Quầy Phục Vụ Nước & Phụ Kiện Cầu Lông</h2>
            <p class="text-xs text-slate-500">Đặt trước để nhân viên chuẩn bị ướp lạnh mang tận sân hoặc nhận tại quầy lễ tân</p>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" data-cust-cat="all" class="cust-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white">Tất cả</button>
            <button type="button" data-cust-cat="drink" class="cust-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">🥤 Nước giải khát</button>
            <button type="button" data-cust-cat="grip" class="cust-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">🎾 Quấn cán & Phụ kiện</button>
            <button type="button" data-cust-cat="shuttle" class="cust-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">🏸 Cầu lông</button>
            <button type="button" data-cust-cat="rental" class="cust-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">👟 Thuê đồ</button>
          </div>
        </div>
      </div>

      <!-- 4 Columns Grid on PC -->
      <div id="cust-shop-grid" class="grid grid-cols-4 gap-4"></div>

      <!-- Checkout Box -->
      <div id="cust-cart-drawer" class="bg-white p-5 rounded-2xl shadow-lg border-2 border-emerald-500 space-y-4 max-w-2xl mx-auto">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 class="text-base font-black text-slate-900">Giỏ Hàng Nước & Phụ Kiện</h3>
            <p id="cust-cart-summary-text" class="text-xs text-slate-500">Chưa có món nào được chọn</p>
          </div>
          <span id="cust-cart-total-amount" class="text-2xl font-black text-emerald-600">0đ</span>
        </div>

        <div id="cust-cart-items-list" class="divide-y divide-slate-100 max-h-48 overflow-y-auto custom-scrollbar text-xs"></div>

        <div class="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label for="cust-order-delivery" class="block text-xs font-bold text-slate-700 mb-1">Giao tới vị trí:</label>
            <select id="cust-order-delivery" class="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50">
              <option value="retail">Nhận trực tiếp tại Quầy lễ tân</option>
              <option value="1">Mang ra Sân 1 - Sân thảm xanh</option>
              <option value="2">Mang ra Sân 2 - Sân thảm xanh</option>
              <option value="3">Mang ra Sân 3 - Sân thảm xám</option>
              <option value="4">Mang ra Sân 4 - Sân thảm xám</option>
            </select>
          </div>
          <div>
            <label for="cust-order-note" class="block text-xs font-bold text-slate-700 mb-1">Tên khách / Ghi chú:</label>
            <input type="text" id="cust-order-note" placeholder="VD: Lấy nước ướp lạnh..." class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs" />
          </div>
        </div>

        <button type="button" id="btn-cust-submit-order" class="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition">
          Gửi Đơn Nước & Dịch Vụ
        </button>
      </div>
    </div>

  </section>

  <!-- ==================== GIAO DIỆN QUẢN LÝ ADMIN (PC: FULL WIDESCREEN) ==================== -->
  <div id="admin-workspace" class="hidden flex-1 flex flex-col">
    
    <!-- TOP KPI STRIP (4 CARDS RỘNG RÃI TRÊN PC) -->
    <section class="bg-white border-b border-slate-200 shadow-xs">
      <div class="max-w-7xl mx-auto px-6 lg:px-8 py-3">
        <div class="grid grid-cols-4 gap-4">
          <!-- 1. Courts -->
          <button type="button" data-nav="courts" class="text-left p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition flex flex-col justify-between group">
            <div class="flex items-center justify-between w-full">
              <span class="text-xs font-bold text-emerald-900">Sân Đang Hoạt Động</span>
              <span class="text-[11px] font-bold text-emerald-700 group-hover:translate-x-0.5 transition">Xem sân →</span>
            </div>
            <div class="my-2">
              <span id="kpi-courts-active" class="text-2xl font-black text-emerald-700">2 / 4 sân</span>
            </div>
            <span id="kpi-courts-sub" class="text-xs text-emerald-700 font-medium">1 trống • 1 đã đặt</span>
          </button>

          <!-- 2. Running Tab -->
          <button type="button" data-nav="schedule" class="text-left p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition flex flex-col justify-between group">
            <div class="flex items-center justify-between w-full">
              <span class="text-xs font-bold text-blue-900">Tạm Tính Đang Chơi</span>
              <span class="text-[11px] font-bold text-blue-700 group-hover:translate-x-0.5 transition">Xem lịch →</span>
            </div>
            <div class="my-2">
              <span id="kpi-running-unbilled" class="text-2xl font-black text-blue-700">0đ</span>
            </div>
            <span class="text-xs text-blue-700 font-medium">Tiền sân + tiền nước</span>
          </button>

          <!-- 3. POS -->
          <button type="button" data-nav="pos" class="text-left p-4 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 transition flex flex-col justify-between group">
            <div class="flex items-center justify-between w-full">
              <span class="text-xs font-bold text-amber-900">Doanh Thu Dịch Vụ POS</span>
              <span class="text-[11px] font-bold text-amber-800 group-hover:translate-x-0.5 transition">Mở POS →</span>
            </div>
            <div class="my-2">
              <span id="kpi-pos-revenue" class="text-2xl font-black text-amber-700">0đ</span>
            </div>
            <span id="kpi-pos-items-sold" class="text-xs text-amber-800 font-medium">0 món đã xuất hôm nay</span>
          </button>

          <!-- 4. Total -->
          <button type="button" data-nav="reports" class="text-left p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 transition flex flex-col justify-between group">
            <div class="flex items-center justify-between w-full">
              <span class="text-xs font-bold text-slate-300">Thực Thu & Hóa Đơn</span>
              <span class="text-[11px] font-bold text-emerald-400 group-hover:translate-x-0.5 transition">Báo cáo →</span>
            </div>
            <div class="my-2">
              <span id="kpi-total-revenue" class="text-2xl font-black text-emerald-400">0đ</span>
            </div>
            <span id="kpi-invoice-count" class="text-xs text-slate-400 font-medium">0 hóa đơn hoàn tất</span>
          </button>
        </div>
      </div>
    </section>

    <!-- MAIN ADMIN CONTAINER -->
    <main class="max-w-7xl w-full mx-auto px-6 lg:px-8 py-6 flex-1">
      
      <!-- VIEW 1: SƠ ĐỒ 4 SÂN (PC 4 CARDS) -->
      <section id="view-courts" class="space-y-5">
        <div class="flex items-center justify-between bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div>
            <h1 class="text-lg font-black text-slate-900">Sơ Đồ 4 Sân (2 Sân Thảm Xanh • 2 Sân Thảm Xám)</h1>
            <p class="text-xs text-slate-500">Giờ thường: 60k/h • Tối 17h–21h: 80k/h. Nhấp vào sân để Gọi nước, Check-in hoặc Thanh toán</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
              <button type="button" data-court-filter="all" class="court-filter-btn px-3 py-1.5 rounded-lg font-bold bg-white text-slate-900 shadow-xs">Tất cả (4)</button>
              <button type="button" data-court-filter="active" class="court-filter-btn px-3 py-1.5 rounded-lg font-bold text-slate-600 hover:text-slate-900">Đang chơi</button>
              <button type="button" data-court-filter="free" class="court-filter-btn px-3 py-1.5 rounded-lg font-bold text-slate-600 hover:text-slate-900">Sân trống</button>
              <button type="button" data-court-filter="reserved" class="court-filter-btn px-3 py-1.5 rounded-lg font-bold text-slate-600 hover:text-slate-900">Đã đặt</button>
            </div>
            <button type="button" id="btn-quick-pos-from-courts" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xs transition">
              <span>+ Bán lẻ Nước / Phụ kiện</span>
            </button>
          </div>
        </div>

        <div id="courts-grid" class="grid grid-cols-4 gap-5"></div>
      </section>

      <!-- VIEW 2: BÁN HÀNG POS (PC 2-COLUMN SPLIT) -->
      <section id="view-pos" class="hidden">
        <div class="grid grid-cols-12 gap-6 items-start">
          <div class="col-span-8 space-y-4">
            <div class="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-lg font-black text-slate-900">Quầy Dịch Vụ & Phụ Kiện Cầu Lông (POS)</h2>
                  <p class="text-xs text-slate-500">Bấm chọn mặt hàng để ghi nợ vào sân đang đánh hoặc thu tiền lẻ</p>
                </div>
                <div class="relative w-64">
                  <input type="text" id="pos-search-input" placeholder="Tìm kiếm nước, quấn cán, cầu..." class="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
              </div>
              <div class="flex items-center gap-2 overflow-x-auto">
                <button type="button" data-pos-cat="all" class="pos-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white">Tất cả</button>
                <button type="button" data-pos-cat="drink" class="pos-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">🥤 Nước giải khát</button>
                <button type="button" data-pos-cat="grip" class="pos-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">🎾 Quấn cán</button>
                <button type="button" data-pos-cat="shuttle" class="pos-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">🏸 Cầu lông</button>
                <button type="button" data-pos-cat="rental" class="pos-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">👟 Thuê đồ</button>
              </div>
            </div>
            <div id="pos-products-grid" class="grid grid-cols-4 gap-4"></div>
          </div>

          <div class="col-span-4 bg-white rounded-2xl shadow-md border border-slate-200 sticky top-20 overflow-hidden">
            <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 class="font-black text-sm">Phiếu Order POS</h3>
                <p class="text-xs text-slate-400">Ghi vào sân hoặc thanh toán bán lẻ</p>
              </div>
              <button type="button" id="btn-clear-pos-cart" class="text-xs text-slate-300 hover:text-rose-400 px-2 py-1 rounded bg-slate-800 transition">Xóa giỏ</button>
            </div>
            <div class="p-4 space-y-4">
              <div>
                <label for="pos-target-select" class="block text-xs font-bold text-slate-700 mb-1.5">Hình thức tính tiền / Gắn vào sân:</label>
                <select id="pos-target-select" class="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="retail">💵 Khách mua lẻ tại quầy (Thu ngay)</option>
                </select>
              </div>
              <div id="pos-cart-items" class="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-slate-100 border-y border-slate-100 py-2"></div>
              <div class="space-y-1.5 pt-1">
                <div class="flex justify-between text-xs text-slate-500">
                  <span>Số lượng:</span>
                  <span id="pos-cart-count" class="font-bold text-slate-800">0 món</span>
                </div>
                <div class="flex justify-between items-baseline">
                  <span class="text-sm font-bold text-slate-800">Tổng cộng:</span>
                  <span id="pos-cart-total" class="text-2xl font-black text-emerald-600">0đ</span>
                </div>
              </div>
              <div id="pos-retail-payment-box" class="space-y-2 pt-2 border-t border-slate-100">
                <label class="block text-xs font-bold text-slate-600">Phương thức thanh toán lẻ:</label>
                <div class="grid grid-cols-2 gap-2">
                  <button type="button" data-pos-pay="cash" class="pos-pay-method-btn py-2 px-3 rounded-xl border text-xs font-bold bg-emerald-50 border-emerald-500 text-emerald-800">💵 Tiền mặt</button>
                  <button type="button" data-pos-pay="transfer" class="pos-pay-method-btn py-2 px-3 rounded-xl border text-xs font-bold bg-white border-slate-200 text-slate-600">📱 QR Ngân hàng</button>
                </div>
              </div>
              <button type="button" id="btn-submit-pos-order" class="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-sm transition">
                <span id="btn-submit-pos-label">Thanh Toán Đơn Bán Lẻ</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- VIEW 3: LỊCH ĐẶT SÂN -->
      <section id="view-schedule" class="hidden space-y-5">
        <div class="flex items-center justify-between bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div>
            <h2 class="text-lg font-black text-slate-900">Lịch Đặt Sân Trong Ngày</h2>
            <p class="text-xs text-slate-500">Quản lý ca đặt trước, khách cố định tháng và khách đặt cọc online</p>
          </div>
          <button type="button" id="btn-open-new-booking" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition">
            + Tạo Lịch Đặt Mới
          </button>
        </div>

        <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
            <span class="font-black text-slate-800 uppercase">Sơ đồ Tiến Trình Khung Giờ Trong Ngày</span>
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-emerald-500"></span> Đang đánh</span>
              <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-amber-400"></span> Đã đặt</span>
              <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-slate-200"></span> Xong</span>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                  <th class="py-3 px-4 w-36 sticky left-0 bg-slate-50 border-r border-slate-200">Sân</th>
                  <th class="py-3 px-2 text-center">06:00 - 08:00</th>
                  <th class="py-3 px-2 text-center">08:00 - 10:00</th>
                  <th class="py-3 px-2 text-center">14:00 - 16:00</th>
                  <th class="py-3 px-2 text-center">16:00 - 18:00</th>
                  <th class="py-3 px-2 text-center bg-amber-50 text-amber-900 font-black">18:00 - 20:00 (Vàng)</th>
                  <th class="py-3 px-2 text-center bg-amber-50 text-amber-900 font-black">20:00 - 22:00 (Vàng)</th>
                </tr>
              </thead>
              <tbody id="schedule-timeline-body" class="divide-y divide-slate-100 text-xs"></tbody>
            </table>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-black text-sm text-slate-900">Danh Sách Phiếu Đặt Sân</h3>
            <span id="booking-count-label" class="text-xs text-slate-500 font-bold">0 lịch đặt</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                  <th class="py-3 px-4">Khách hàng</th>
                  <th class="py-3 px-4">Số điện thoại</th>
                  <th class="py-3 px-4">Sân</th>
                  <th class="py-3 px-4">Khung giờ</th>
                  <th class="py-3 px-4">Loại khách</th>
                  <th class="py-3 px-4 text-right">Tiền cọc</th>
                  <th class="py-3 px-4">Trạng thái</th>
                  <th class="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody id="bookings-table-body" class="divide-y divide-slate-100 text-xs"></tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- VIEW 4: KHO & HÀNG HÓA -->
      <section id="view-inventory" class="hidden space-y-5">
        <div class="flex items-center justify-between bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div>
            <h2 class="text-lg font-black text-slate-900">Quản Lý Kho Hàng & Dịch Vụ</h2>
            <p class="text-xs text-slate-500">Theo dõi tồn kho, giá vốn, giá bán lẻ và nhập kho nhanh</p>
          </div>
          <button type="button" id="btn-open-new-product" class="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition">
            + Thêm Mặt Hàng Mới
          </button>
        </div>

        <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <th class="py-3.5 px-4">Tên mặt hàng</th>
                <th class="py-3.5 px-4">Danh mục</th>
                <th class="py-3.5 px-4">Đơn vị</th>
                <th class="py-3.5 px-4 text-right">Giá vốn</th>
                <th class="py-3.5 px-4 text-right">Giá bán</th>
                <th class="py-3.5 px-4 text-right">Lãi gộp</th>
                <th class="py-3.5 px-4 text-center">Tồn kho</th>
                <th class="py-3.5 px-4 text-center">Đã bán</th>
                <th class="py-3.5 px-4 text-right">Nhập nhanh</th>
              </tr>
            </thead>
            <tbody id="inventory-table-body" class="divide-y divide-slate-100 text-xs"></tbody>
          </table>
        </div>
      </section>

      <!-- VIEW 5: DOANH THU & HÓA ĐƠN -->
      <section id="view-reports" class="hidden space-y-6">
        <div class="grid grid-cols-12 gap-6">
          <div class="col-span-8 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="font-black text-sm text-slate-900">Biểu Đồ Doanh Thu 7 Ngày Gần Nhất (VNĐ)</h3>
                <p class="text-xs text-slate-500">So sánh Tiền thuê sân & Doanh thu dịch vụ POS</p>
              </div>
              <span class="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">Hôm nay</span>
            </div>
            <div class="relative h-72 w-full">
              <canvas id="chart-weekly-revenue"></canvas>
            </div>
          </div>

          <div class="col-span-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
            <div class="mb-4">
              <h3 class="font-black text-sm text-slate-900">Cơ Cấu Doanh Thu</h3>
              <p class="text-xs text-slate-500">Phân bổ nguồn thu hôm nay</p>
            </div>
            <div class="relative h-64 w-full">
              <canvas id="chart-category-share"></canvas>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 class="font-black text-sm text-slate-900">Lịch Sử Hóa Đơn & Phiếu Thu</h3>
              <p class="text-xs text-slate-500">Bấm "Xem phiếu" để in hóa đơn hoặc kiểm tra chi tiết</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" data-inv-filter="all" class="inv-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white">Tất cả</button>
              <button type="button" data-inv-filter="court" class="inv-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">Thu Sân + POS</button>
              <button type="button" data-inv-filter="retail" class="inv-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200">Bán lẻ quầy</button>
            </div>
          </div>
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                <th class="py-3 px-4">Mã HĐ</th>
                <th class="py-3 px-4">Thời gian</th>
                <th class="py-3 px-4">Loại phiếu</th>
                <th class="py-3 px-4">Khách hàng</th>
                <th class="py-3 px-4 text-right">Tiền sân</th>
                <th class="py-3 px-4 text-right">Tiền POS</th>
                <th class="py-3 px-4 text-right">Tổng thanh toán</th>
                <th class="py-3 px-4">Hình thức</th>
                <th class="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody id="invoices-table-body" class="divide-y divide-slate-100 text-xs"></tbody>
          </table>
        </div>
      </section>

    </main>
  </div>

  ${MODALS_HTML}

  <div id="toast-container" class="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm"></div>

  <script>
    ${INITIAL_DATA_JS}
    ${APP_LOGIC_JS}
  </script>
</body>
</html>`;
}

console.log("generatePC function ready");
