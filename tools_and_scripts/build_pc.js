const fs = require('fs');

const origPath = 'C:\\Users\\tranl\\Downloads\\smashcourt_pro_qu_n_l_s_n_c_u_l_ng_pos_d_ch_v.html';
const orig = fs.readFileSync(origPath, 'utf8');

// 1. Extract Head
const headStart = orig.indexOf('<head>');
const headEnd = orig.indexOf('</head>') + 7;
let headHTML = orig.slice(headStart, headEnd);
headHTML = headHTML.replace('</head>', '  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n</head>');
// Remove any phone-wrapper simulation CSS
headHTML = headHTML.replace(/\.view-mode-phone-wrapper\s*\{[\s\S]*?\}/g, '');

// 2. Extract Modals
const modalStart = orig.indexOf('id="modal-cust-addon-picker"');
const modalActualStart = orig.lastIndexOf('<div', modalStart);
const scriptStart = orig.lastIndexOf('<script>');
let modalsHTML = orig.slice(modalActualStart, scriptStart);
// Clean all prefilled demo inputs in modals
modalsHTML = modalsHTML.replace('value="17:30 - 19:00"', '');
modalsHTML = modalsHTML.replace('value="50000"', 'value="0" placeholder="0"');
modalsHTML = modalsHTML.replace('value="Chai"', 'placeholder="Chai, Cái, Ống..."');
modalsHTML = modalsHTML.replace('value="8000"', 'placeholder="0"');
modalsHTML = modalsHTML.replace('value="15000"', 'placeholder="0"');
modalsHTML = modalsHTML.replace('value="48"', 'placeholder="0"');


// 3. Extract Script
const scriptContent = fs.readFileSync('c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js', 'utf8');

// 4. Extract Admin Workspace
const adminStart = orig.indexOf('<div id="admin-workspace"');
const adminHTML = orig.slice(adminStart, modalActualStart);

// Let's verify and build PC version
function buildPC() {
  const topSwitch = `
  <div class="bg-slate-950 text-slate-300 py-2 px-6 text-xs border-b border-slate-800 flex items-center justify-between">
    <div class="flex items-center gap-2.5">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 live-dot"></span>
      <span class="font-bold text-white text-xs sm:text-sm">🏸 SmashCourt Pro • Giao Diện Máy Tính (Widescreen PC Dashboard)</span>
      <span class="hidden md:inline text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-medium">Tối ưu cho Màn hình rộng / Laptop / Máy tính</span>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-xs text-slate-400">Xem thử bản mobile:</span>
      <a href="mobile.html" class="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm">
        <span>📱 Mở Giao Diện Mobile</span>
      </a>
      <a href="index.html" class="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition">
        <span>🌐 Bản Tự Động Thích Ứng</span>
      </a>
    </div>
  </div>
  `;

  // Header with quick switch and info
  const header = `
  <header class="bg-slate-900 text-white sticky top-0 z-50 shadow-lg border-b border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between py-3 gap-3">
        <!-- Brand Logo -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-inner shadow-emerald-300/40">
            <svg class="w-6 h-6 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22c-1.5 0-2.5-1-2.5-2.5S10.5 17 12 17s2.5 1 2.5 2.5S13.5 22 12 22z"/>
              <path d="M9.5 17.5L5 4l4.5 2L12 2l2.5 4L19 4l-4.5 13.5"/>
              <line x1="7.2" y1="10.5" x2="16.8" y2="10.5"/>
            </svg>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-lg tracking-tight text-white leading-none">SmashCourt<span class="text-emerald-400">Pro</span></span>
              <span id="role-mode-badge" class="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">Khách đặt sân</span>
              <span id="supabase-status-badge" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[10px] font-bold"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot"></span><span>Realtime Cloud</span></span>
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Bản PC</span>
            </div>
            <p class="text-xs text-slate-300 mt-1 truncate flex items-center gap-1.5">
              <span>📍 11 Lê Khôi</span>
              <span class="text-slate-500">•</span>
              <span>2 Sân thảm xanh, 2 Sân thảm xám chuẩn BWF</span>
              <span class="text-slate-500">•</span>
              <span class="text-emerald-400 font-semibold">📞 Hotline: 0988.412.889</span>
            </p>
          </div>
        </div>

        <!-- Right Controls -->
        <div class="flex items-center gap-3 shrink-0">
          <div class="hidden xl:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <span class="w-2 h-2 rounded-full bg-emerald-400 live-dot"></span>
            <span id="live-clock-display" class="font-mono text-slate-200 font-medium">14:22:00 - T6, 16/10/2026</span>
          </div>

          <!-- Button shown when NOT logged in as Admin -->
          <button type="button" id="btn-open-admin-login" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-md">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <span>Đăng Nhập Quản Lý (Admin)</span>
          </button>

          <!-- Controls shown ONLY when logged in as Admin -->
          <div id="admin-header-controls" class="hidden flex items-center gap-2">
            <button type="button" id="btn-toggle-customer-preview" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition">
              Giao diện Khách
            </button>
            
            <button type="button" id="btn-admin-logout" class="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition">
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      <!-- Primary Admin Navigation Tabs -->
      <div id="admin-nav-bar" class="hidden pb-3 pt-1 border-t border-slate-800/80">
        <nav class="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700/70 overflow-x-auto max-w-full custom-scrollbar" aria-label="Điều hướng chính">
          <button type="button" data-nav="courts" class="nav-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 bg-emerald-500 text-slate-950 shadow-sm whitespace-nowrap">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
            <span>Sơ đồ 4 Sân</span>
            <span id="badge-active-courts" class="px-2 py-0.5 text-[11px] rounded-full bg-slate-950/20 font-bold">4/8</span>
          </button>
          <button type="button" data-nav="pos" class="nav-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-700/60 whitespace-nowrap">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            <span>Bán Hàng POS Tại Quầy</span>
            <span id="badge-pos-cart" class="hidden px-2 py-0.5 text-[11px] rounded-full bg-amber-400 text-slate-950 font-bold">0</span>
          </button>
          <button type="button" data-nav="schedule" class="nav-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-700/60 whitespace-nowrap">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Lịch Đặt Sân Toàn Hệ Thống</span>
          </button>
          <button type="button" data-nav="inventory" class="nav-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-700/60 whitespace-nowrap">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            <span>Kho & Hàng Hóa</span>
            <span id="badge-low-stock" class="px-2 py-0.5 text-[11px] rounded-full bg-rose-500/90 text-white font-bold">2</span>
          </button>
          <button type="button" data-nav="reports" class="nav-tab-btn px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-700/60 whitespace-nowrap">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span>Báo Cáo Doanh Thu & Hóa Đơn</span>
          </button>
        </nav>
      </div>
    </div>
  </header>
  `;

  // Customer Portal tailored for Widescreen PC
  const custPortalPC = `
  <section id="customer-portal" class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    <!-- Top Segmented Switch -->
    <div class="bg-white p-2 rounded-2xl shadow-xs border border-slate-200 max-w-md mx-auto grid grid-cols-2 gap-2">
      <button type="button" data-cust-tab="book" class="cust-tab-btn py-2.5 px-4 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 bg-emerald-600 text-white shadow-xs transition">
        <span>🏸 Đặt Lịch Sân Trực Tuyến</span>
      </button>
      <button type="button" data-cust-tab="shop" class="cust-tab-btn py-2.5 px-4 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 text-slate-600 hover:bg-slate-100 transition">
        <span>🥤 Mua Nước & Phụ Kiện</span>
        <span id="cust-shop-badge" class="hidden px-2 py-0.5 rounded-full text-xs bg-amber-400 text-slate-950 font-extrabold">0</span>
      </button>
    </div>

    <!-- TAB KHÁCH 1: ĐẶT LỊCH SÂN (PC 2-COLUMN WIDESCREEN LAYOUT) -->
    <div id="cust-view-book" class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- LEFT COLUMN: Sơ đồ ma trận & Bảng giá & Lịch sử đặt (8/12 cols) -->
      <div class="lg:col-span-8 space-y-5">
        <!-- Club Intro Card -->
        <div class="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-4 sm:p-5 rounded-2xl shadow-sm space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h1 class="text-base sm:text-lg font-black tracking-tight">🏸 Đặt Sân Cầu Lông SmashCourt Pro</h1>
              <p class="text-xs text-emerald-100 mt-0.5">Sân thảm tiêu chuẩn BWF • Đèn LED chống lóa • Nhấp chọn khung giờ trực tiếp trên bảng ma trận bên dưới</p>
            </div>
            <span id="cust-club-date-badge" class="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-xl border border-white/20 whitespace-nowrap">Hôm nay</span>
          </div>
          <div class="grid grid-cols-2 gap-3 text-xs pt-1">
            <div class="bg-slate-950/25 px-4 py-2.5 rounded-xl border border-white/10 flex items-center justify-between">
              <span class="text-emerald-100 font-medium">Giờ thường (05:00 - 17:00 & 21:00 - 23:00)</span>
              <strong class="text-white font-black text-sm">60.000đ / h</strong>
            </div>
            <div class="bg-amber-400/25 px-4 py-2.5 rounded-xl border border-amber-300/30 flex items-center justify-between">
              <span class="text-amber-100 font-medium">Giờ vàng cao điểm (17:00 - 21:00)</span>
              <strong class="text-amber-300 font-black text-sm">80.000đ / h</strong>
            </div>
          </div>
        </div>

        <!-- ALOBO-STYLE INTERACTIVE COURT X TIME MATRIX -->
        <div class="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/90 space-y-4">
          <!-- Section Header: Title & Quick Day Switcher -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-sm font-black uppercase tracking-wider text-slate-900">Bảng Giờ & Ma Trận Đặt Lịch Sân</h2>
              <p class="text-xs text-slate-500 mt-0.5">Bấm trực tiếp vào các ô màu trắng để chọn giờ (có thể chọn nhiều khung giờ liên tiếp)</p>
            </div>
            <!-- Quick Day Switcher Pills -->
            <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
              <button type="button" data-cust-day="today" class="cust-day-btn px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-xs whitespace-nowrap">Hôm nay</button>
              <button type="button" data-cust-day="tomorrow" class="cust-day-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 whitespace-nowrap">Ngày mai</button>
              <button type="button" data-cust-day="sunday" class="cust-day-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 whitespace-nowrap">Chủ nhật</button>
            </div>
          </div>

          <!-- Matrix Grid Table -->
          <div id="cust-matrix-scroll-wrapper" class="isolate overflow-x-auto custom-scrollbar rounded-xl border border-[#c4ded7] shadow-xs relative bg-white">
            <table class="w-full text-left border-collapse min-w-[1880px]">
              <thead class="bg-[#c0ebfb] text-[#0e362e] border-b border-[#cadfe8]">
                <tr id="cust-alobo-matrix-header" class="bg-[#c0ebfb] text-[#0e362e] h-11">
                  <th class="w-20 min-w-[76px] sm:w-24 sm:min-w-[90px] sticky left-0 bg-[#c0ebfb] z-20 border-r-2 border-[#a3cdc2] h-11 p-0"></th>
                </tr>
              </thead>
              <tbody id="cust-alobo-matrix-body" class="text-xs bg-white"></tbody>
            </table>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-500 pt-1">
            <div class="flex items-center gap-4 flex-wrap">
              <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-white border border-slate-300"></span> Còn trống</span>
              <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-emerald-600"></span> Đang chọn</span>
              <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200 text-slate-400 text-center font-bold text-[10px] leading-3.5">🔒</span> Đã khóa / Đã đặt</span>
            </div>
            <span class="text-[11px] text-slate-400">Cuộn ngang bảng để xem từ 05:00 đến 23:00</span>
          </div>

          <!-- Quick Time Jump Bar & Scroll Navigation -->
          <div class="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 flex-wrap text-xs">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[11px] font-bold text-slate-500">⚡ Xem nhanh:</span>
              <button type="button" data-matrix-jump="05:00" class="matrix-jump-btn px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer">🌅 Sáng (5h)</button>
              <button type="button" data-matrix-jump="12:00" class="matrix-jump-btn px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer">☀️ Trưa (12h)</button>
              <button type="button" data-matrix-jump="17:00" class="matrix-jump-btn px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer">🌙 Tối vàng (17h)</button>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-slate-400 hidden sm:inline">🖱️ Lăn chuột / kéo rê để lướt</span>
              <div class="flex items-center gap-1">
                <button type="button" id="btn-matrix-scroll-left" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs transition shadow-xs cursor-pointer" title="Lướt sang trái">◀</button>
                <button type="button" id="btn-matrix-scroll-right" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs transition shadow-xs cursor-pointer" title="Lướt sang phải">▶</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Hidden validator elements (Kept intact so JS never breaks) -->
        <div class="hidden">
          <span id="cust-selected-slot-rate">80.000đ / giờ</span>
          <select id="cust-start-time"></select>
          <select id="cust-end-time"></select>
          <div id="cust-slot-grid"></div>
          <div id="cust-time-breakdown-box">
            <span id="cust-time-summary-label"></span>
            <span id="cust-time-fee-label"></span>
          </div>
          <span id="cust-free-count-hint"></span>
          <div id="cust-court-picker"></div>
        </div>

        <!-- Recent Customer Bookings Ticket List -->
        <div id="cust-my-bookings-box" class="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/90 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-xs font-black uppercase tracking-wider text-slate-900">Lịch Sân Đã Đặt Gần Đây</span>
              <p class="text-xs text-slate-500 mt-0.5">Danh sách phiếu đặt của bạn được lưu tự động trên trình duyệt</p>
            </div>
            <span class="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">Đã đồng bộ với Lễ tân</span>
          </div>
          <div id="cust-my-bookings-list" class="space-y-2.5"></div>
        </div>
      </div>

      <!-- RIGHT COLUMN: Sticky Booking Form Sidebar (4/12 cols) -->
      <div class="lg:col-span-4 sticky top-24 space-y-4">
        <form id="form-customer-booking" class="bg-white p-5 rounded-2xl shadow-md border border-slate-200/90 space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h3 class="text-sm font-black uppercase tracking-wider text-slate-900">Phiếu Xác Nhận Đặt Sân</h3>
            <p class="text-xs text-slate-500 mt-0.5">Chọn giờ trên bảng bên trái rồi điền thông tin bên dưới</p>
          </div>

          <!-- Live Selected Court & Time Summary Card directly linked to Drag Matrix -->
          <div id="cust-selected-summary-card" class="transition-all"></div>

          <div class="space-y-3 pt-1">
            <div>
              <label for="cust-book-name" class="block text-xs font-bold text-slate-700 mb-1">Họ tên của bạn / Tên nhóm *</label>
              <input type="text" id="cust-book-name" required placeholder="VD: Anh Minh, Nhóm Bách Khoa..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label for="cust-book-phone" class="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ *</label>
              <input type="tel" id="cust-book-phone" required placeholder="VD: 0988.123.456" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-100">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-700">Dịch vụ chuẩn bị sẵn tại sân:</label>
              <button type="button" id="btn-open-addon-picker" class="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 transition cursor-pointer">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                <span>Menu Nước / Cầu</span>
              </button>
            </div>
            <!-- Quick Addon Items with Quantity Stepper (+/-) -->
            <div id="cust-addons-grid" class="grid grid-cols-1 gap-2 text-xs"></div>
          </div>

          <div class="pt-3 border-t border-slate-200 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span id="cust-book-total-label" class="text-xs font-medium text-slate-500">Tổng tạm tính:</span>
              <p id="cust-book-total-preview" class="text-xl font-black text-emerald-600">0đ</p>
            </div>
            <button type="submit" id="btn-cust-submit-booking" class="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md transition transform active:scale-[0.98]">
              Xác Nhận Đặt Sân Ngay
            </button>
            <p class="text-[11px] text-center text-slate-400">Giữ sân miễn phí trong 15 phút • Thanh toán tại quầy khi đến</p>
          </div>
        </form>
      </div>
    </div>

    <!-- TAB KHÁCH 2: MUA NƯỚC UỐNG, QUẤN CÁN, CẦU LÔNG (PC 2-COLUMN WIDESCREEN) -->
    <div id="cust-view-shop" class="hidden grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- LEFT COLUMN: Categories & Product Catalog (8/12 cols) -->
      <div class="lg:col-span-8 space-y-4">
        <div class="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/90 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-black text-slate-900">Menu Nước Uống, Quấn Cán & Cầu Lông</h2>
              <p class="text-xs text-slate-500">Chọn món để nhân viên mang ra tận sân của bạn hoặc chuẩn bị nhận tại quầy lễ tân</p>
            </div>
          </div>
          <!-- Category Pills -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            <button type="button" data-cust-cat="all" class="cust-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white whitespace-nowrap shadow-xs">Tất cả sản phẩm</button>
            <button type="button" data-cust-cat="drink" class="cust-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap">🥤 Nước giải khát</button>
            <button type="button" data-cust-cat="grip" class="cust-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap">🎾 Quấn cán & Phụ kiện</button>
            <button type="button" data-cust-cat="shuttle" class="cust-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap">🏸 Cầu lông</button>
            <button type="button" data-cust-cat="rental" class="cust-cat-btn px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap">👟 Thuê vợt / Giày</button>
          </div>
        </div>

        <!-- 4-column Product Grid on PC -->
        <div id="cust-shop-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5"></div>
      </div>

      <!-- RIGHT COLUMN: Sticky Cart Drawer (4/12 cols) -->
      <div class="lg:col-span-4 sticky top-24">
        <div id="cust-cart-drawer" class="bg-white p-5 rounded-2xl shadow-md border-2 border-emerald-500 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-sm font-black text-slate-900">Giỏ Hàng Của Bạn</h3>
              <p id="cust-cart-summary-text" class="text-xs text-slate-500">Chưa có món nào được chọn</p>
            </div>
            <div class="flex items-center gap-2">
              <span id="cust-cart-total-amount" class="text-lg font-black text-emerald-600">0đ</span>
              <button type="button" id="btn-clear-cust-cart" class="text-[11px] text-slate-400 hover:text-rose-500 hover:underline cursor-pointer" title="Làm trống giỏ hàng">Làm trống</button>
            </div>
          </div>

          <div id="cust-cart-items-list" class="divide-y divide-slate-100 max-h-60 overflow-y-auto custom-scrollbar text-xs"></div>

          <div class="space-y-3 pt-2">
            <div>
              <label for="cust-order-delivery" class="block text-xs font-bold text-slate-700 mb-1">Vị trí giao nhận hàng:</label>
              <select id="cust-order-delivery" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50">
                <option value="retail">Nhận trực tiếp tại Quầy lễ tân</option>
                <option value="1">Mang ra Sân 1 - Sân thảm xanh</option>
                <option value="2">Mang ra Sân 2 - Sân thảm xanh</option>
                <option value="3">Mang ra Sân 3 - Sân thảm xám</option>
                <option value="4">Mang ra Sân 4 - Sân thảm xám</option>
              </select>
            </div>
            <div>
              <label for="cust-order-note" class="block text-xs font-bold text-slate-700 mb-1">Tên khách / Ghi chú (nếu có):</label>
              <input type="text" id="cust-order-note" placeholder="VD: Lấy nước ướp lạnh, quấn cán màu đen..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs" />
            </div>
          </div>

          <button type="button" id="btn-cust-submit-order" class="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md transition transform active:scale-[0.98]">
            Gửi Đơn Mua Nước & Phụ Kiện
          </button>
        </div>
      </div>
    </div>
  </section>
  `;

  return `<!DOCTYPE html>
<html lang="vi">
${headHTML}
<body class="bg-slate-50 min-h-screen flex flex-col font-sans text-slate-900 antialiased">
${topSwitch}
${header}
${custPortalPC}
${adminHTML}
${modalsHTML}
<script>
${scriptContent}
</script>
</body>
</html>`;
}

// Write pc.html
const pcHTML = buildPC();
fs.writeFileSync('c:\\Quan ly san cau\\pc.html', pcHTML, 'utf8');
console.log('pc.html written, size:', fs.statSync('c:\\Quan ly san cau\\pc.html').size);
