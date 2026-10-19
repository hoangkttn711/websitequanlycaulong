const fs = require('fs');

const origPath = 'C:\\Users\\tranl\\Downloads\\smashcourt_pro_qu_n_l_s_n_c_u_l_ng_pos_d_ch_v.html';
const orig = fs.readFileSync(origPath, 'utf8');

// 1. Extract Head
const headStart = orig.indexOf('<head>');
const headEnd = orig.indexOf('</head>') + 7;
let headHTML = orig.slice(headStart, headEnd);
headHTML = headHTML.replace('</head>', '  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n</head>');
headHTML = headHTML.replace(/\.view-mode-phone-wrapper\s*\{[\s\S]*?\}/g, '');

// 2. Extract Modals
const modalStart = orig.indexOf('id="modal-cust-addon-picker"');
const modalActualStart = orig.lastIndexOf('<div', modalStart);
const scriptStart = orig.lastIndexOf('<script>');
const modalsHTML = orig.slice(modalActualStart, scriptStart);

// 3. Extract Script
const scriptContent = fs.readFileSync('c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js', 'utf8');

// 4. Extract Admin Workspace
const adminStart = orig.indexOf('<div id="admin-workspace"');
const adminHTML = orig.slice(adminStart, modalActualStart);

function buildMobile() {
  const topSwitch = `
  <div class="bg-slate-950 text-slate-300 py-1.5 px-3.5 text-xs border-b border-slate-800 flex items-center justify-between">
    <div class="flex items-center gap-1.5 min-w-0">
      <span class="w-2 h-2 rounded-full bg-emerald-400 live-dot shrink-0"></span>
      <span class="font-bold text-white text-[11px] truncate">📱 SmashCourt Pro • Bản Điện Thoại</span>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <a href="pc.html" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-[11px] font-bold flex items-center gap-1 transition shadow-xs">
        <span>💻 Mở Bản PC</span>
      </a>
      <a href="index.html" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 text-[11px] transition">
        <span>🌐 Tự Động</span>
      </a>
    </div>
  </div>
  `;

  // Compact Mobile Header
  const header = `
  <header class="bg-slate-900 text-white sticky top-0 z-50 shadow-md border-b border-slate-800">
    <div class="w-full px-3 py-2.5">
      <div class="flex items-center justify-between gap-2">
        <!-- Brand Logo -->
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0 shadow-inner">
            <svg class="w-4 h-4 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
              <path d="M12 22c-1.5 0-2.5-1-2.5-2.5S10.5 17 12 17s2.5 1 2.5 2.5S13.5 22 12 22z"/>
              <path d="M9.5 17.5L5 4l4.5 2L12 2l2.5 4L19 4l-4.5 13.5"/>
              <line x1="7.2" y1="10.5" x2="16.8" y2="10.5"/>
            </svg>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-black text-base tracking-tight text-white leading-none">SmashCourt<span class="text-emerald-400">Pro</span></span>
              <span id="role-mode-badge" class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Khách</span>
              <span id="supabase-status-badge" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[10px] font-bold"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot"></span><span>Realtime Cloud</span></span>
            </div>
            <p class="text-[10px] text-slate-400 mt-0.5 truncate">📍 11 Lê Khôi • 4 Sân BWF • <a href="tel:0988412889" class="text-emerald-400 font-bold">0988.412.889</a></p>
          </div>
        </div>

        <!-- Right Controls -->
        <div class="flex items-center gap-1.5 shrink-0">
          <!-- Button shown when NOT logged in as Admin -->
          <button type="button" id="btn-open-admin-login" class="px-2.5 py-1.5 rounded-lg bg-slate-800 text-emerald-400 border border-slate-700 text-xs font-bold flex items-center gap-1 transition shadow-xs">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <span>Quản Lý</span>
          </button>

          <!-- Controls shown ONLY when logged in as Admin -->
          <div id="admin-header-controls" class="hidden flex items-center gap-1">
            <button type="button" id="btn-toggle-customer-preview" class="px-2 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-medium">
              Xem Khách
            </button>
            <button type="button" id="btn-reset-demo" class="hidden text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
              Reset
            </button>
            <button type="button" id="btn-admin-logout" class="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-medium">
              Thoát
            </button>
          </div>
        </div>
      </div>

      <!-- Hidden live clock for compatibility -->
      <span id="live-clock-display" class="hidden"></span>

      <!-- Primary Admin Navigation Tabs -->
      <div id="admin-nav-bar" class="hidden pb-2 pt-1 border-t border-slate-800/80 mt-1">
        <nav class="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/70 overflow-x-auto max-w-full custom-scrollbar" aria-label="Điều hướng chính">
          <button type="button" data-nav="courts" class="nav-tab-btn px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 bg-emerald-500 text-slate-950 shadow-xs whitespace-nowrap">
            <span>Sơ đồ Sân</span>
            <span id="badge-active-courts" class="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-950/20 font-bold">4/8</span>
          </button>
          <button type="button" data-nav="pos" class="nav-tab-btn px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 text-slate-300 whitespace-nowrap">
            <span>Bán Hàng</span>
            <span id="badge-pos-cart" class="hidden px-1.5 py-0.2 text-[10px] rounded-full bg-amber-400 text-slate-950 font-bold">0</span>
          </button>
          <button type="button" data-nav="schedule" class="nav-tab-btn px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 text-slate-300 whitespace-nowrap">
            <span>Lịch Đặt</span>
          </button>
          <button type="button" data-nav="inventory" class="nav-tab-btn px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 text-slate-300 whitespace-nowrap">
            <span>Kho Hàng</span>
            <span id="badge-low-stock" class="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500/90 text-white font-bold">2</span>
          </button>
          <button type="button" data-nav="reports" class="nav-tab-btn px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 text-slate-300 whitespace-nowrap">
            <span>Doanh Thu</span>
          </button>
        </nav>
      </div>
    </div>
  </header>
  `;

  // Customer Portal tailored for Mobile
  const custPortalMobile = `
  <section id="customer-portal" class="flex-1 w-full max-w-lg mx-auto px-3 py-3 pb-28 space-y-3.5">
    <!-- Top Segmented Switch -->
    <div class="bg-white p-1 rounded-xl shadow-xs border border-slate-200 grid grid-cols-2 gap-1">
      <button type="button" data-cust-tab="book" class="cust-tab-btn py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 bg-emerald-600 text-white shadow-xs transition">
        <span>🏸 Đặt Lịch Sân</span>
      </button>
      <button type="button" data-cust-tab="shop" class="cust-tab-btn py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 text-slate-600 hover:bg-slate-100 transition">
        <span>🥤 Mua Nước & Đồ</span>
        <span id="cust-shop-badge" class="hidden px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">0</span>
      </button>
    </div>

    <!-- TAB KHÁCH 1: ĐẶT LỊCH SÂN (MOBILE FIRST FLOW) -->
    <div id="cust-view-book" class="space-y-3.5">
      <!-- Club Intro Card -->
      <div class="bg-gradient-to-r from-emerald-700 to-teal-700 text-white p-3 rounded-xl shadow-sm space-y-2">
        <div class="flex items-center justify-between gap-2">
          <h1 class="text-xs sm:text-sm font-black tracking-tight">🏸 Đặt Sân Cầu Lông</h1>
          <span id="cust-club-date-badge" class="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-md border border-white/20 whitespace-nowrap">Hôm nay</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="bg-slate-950/20 px-2.5 py-1.5 rounded-lg border border-white/10 flex items-center justify-between">
            <span class="text-emerald-100 font-medium text-[11px]">Giờ thường</span>
            <strong class="text-white font-black text-xs">60k/h</strong>
          </div>
          <div class="bg-amber-400/20 px-2.5 py-1.5 rounded-lg border border-amber-300/30 flex items-center justify-between">
            <span class="text-amber-100 font-medium text-[11px]">Tối 17h–21h</span>
            <strong class="text-amber-300 font-black text-xs">80k/h</strong>
          </div>
        </div>
      </div>

      <!-- ALOBO-STYLE INTERACTIVE COURT X TIME MATRIX -->
      <div class="bg-white p-3 rounded-xl shadow-xs border border-slate-200/90 space-y-2.5">
        <!-- Section Header: Title & Quick Day Switcher -->
        <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h2 class="text-xs font-black uppercase tracking-wider text-slate-900">Bảng Đặt Lịch</h2>
          <!-- Quick Day Switcher Pills -->
          <div class="flex items-center gap-1 overflow-x-auto custom-scrollbar">
            <button type="button" data-cust-day="today" class="cust-day-btn px-2 py-1 rounded-lg text-[10px] font-black bg-emerald-600 text-white shadow-xs whitespace-nowrap">Hôm nay</button>
            <button type="button" data-cust-day="tomorrow" class="cust-day-btn px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 whitespace-nowrap">Ngày mai</button>
            <button type="button" data-cust-day="sunday" class="cust-day-btn px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 whitespace-nowrap">Chủ nhật</button>
          </div>
        </div>

        <p class="text-[11px] text-slate-500">👉 Nhấp vào ô trống để chọn giờ • Vuốt ngang để xem ca tối</p>

        <!-- Fast Jump Bar on Mobile -->
        <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
          <span class="text-[10px] font-bold text-slate-400 whitespace-nowrap">⚡ Nhảy nhanh:</span>
          <button type="button" data-matrix-jump="05:00" class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold whitespace-nowrap">🌅 5h</button>
          <button type="button" data-matrix-jump="12:00" class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold whitespace-nowrap">☀️ 12h</button>
          <button type="button" data-matrix-jump="17:00" class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold whitespace-nowrap">🌙 17h</button>
        </div>

        <!-- Matrix Table Wrapper with smooth horizontal swipe and sticky left court -->
        <div id="cust-matrix-scroll-wrapper" class="isolate overflow-x-auto custom-scrollbar -mx-1 rounded-xl border border-[#c4ded7] shadow-xs relative bg-white">
          <table class="w-full text-left border-collapse min-w-[1880px]">
            <thead class="bg-[#c0ebfb] text-[#0e362e] border-b border-[#cadfe8]">
              <tr id="cust-alobo-matrix-header" class="bg-[#c0ebfb] text-[#0e362e] h-10">
                <th class="w-20 min-w-[76px] sticky left-0 bg-[#c0ebfb] z-20 border-r-2 border-[#a3cdc2] h-10 p-0"></th>
              </tr>
            </thead>
            <tbody id="cust-alobo-matrix-body" class="text-xs bg-white"></tbody>
          </table>
        </div>
      </div>

      <!-- Hidden validator elements -->
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

      <!-- Step 3: Customer Info & Quick Confirm Form -->
      <form id="form-customer-booking" class="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200/90 space-y-3">
        <!-- Live Selected Summary Card -->
        <div id="cust-selected-summary-card" class="transition-all"></div>

        <span class="block text-xs font-black uppercase tracking-wider text-slate-800">Thông tin đặt sân</span>
        <div class="space-y-2.5">
          <div>
            <label for="cust-book-name" class="block text-xs font-bold text-slate-700 mb-1">Họ tên của bạn / Tên nhóm *</label>
            <input type="text" id="cust-book-name" required placeholder="VD: Anh Minh..." class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label for="cust-book-phone" class="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ *</label>
            <input type="tel" id="cust-book-phone" required placeholder="VD: 0988.123.456" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>

        <div class="space-y-2 pt-1 border-t border-slate-100">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-bold text-slate-700">Chuẩn bị sẵn tại sân:</label>
            <button type="button" id="btn-open-addon-picker" class="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              <span>Thêm Nước / Cầu</span>
            </button>
          </div>
          <!-- Quick Addon Items -->
          <div id="cust-addons-grid" class="grid grid-cols-1 gap-1.5 text-xs"></div>
        </div>

        <div class="pt-2 border-t border-slate-100 flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <span id="cust-book-total-label" class="text-xs text-slate-500">Tạm tính:</span>
            <p id="cust-book-total-preview" class="text-lg font-black text-emerald-600">0đ</p>
          </div>
          <button type="submit" id="btn-cust-submit-booking" class="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-sm transition">
            Xác Nhận Đặt Sân Ngay
          </button>
        </div>
      </form>

      <!-- Recent Customer Bookings Ticket List -->
      <div id="cust-my-bookings-box" class="bg-white p-3.5 rounded-xl shadow-xs border border-slate-200/90 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-black uppercase tracking-wider text-slate-800">Lịch đã đặt gần đây</span>
          <span class="text-[10px] text-emerald-600 font-bold">Đã đồng bộ Lễ tân</span>
        </div>
        <div id="cust-my-bookings-list" class="space-y-2"></div>
      </div>
    </div>

    <!-- TAB KHÁCH 2: MUA NƯỚC UỐNG, QUẤN CÁN, CẦU LÔNG (MOBILE SHOP) -->
    <div id="cust-view-shop" class="hidden space-y-3.5">
      <div class="bg-white p-3 rounded-xl shadow-xs border border-slate-200/90 space-y-2.5">
        <div>
          <h2 class="text-xs sm:text-sm font-black text-slate-900">Menu Nước Uống, Phụ Kiện & Cầu Lông</h2>
          <p class="text-[11px] text-slate-500">Giao tận sân hoặc nhận tại quầy lễ tân</p>
        </div>
        <!-- Category Pills -->
        <div class="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
          <button type="button" data-cust-cat="all" class="cust-cat-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white whitespace-nowrap">Tất cả</button>
          <button type="button" data-cust-cat="drink" class="cust-cat-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 whitespace-nowrap">🥤 Nước uống</button>
          <button type="button" data-cust-cat="grip" class="cust-cat-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 whitespace-nowrap">🎾 Quấn cán</button>
          <button type="button" data-cust-cat="shuttle" class="cust-cat-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 whitespace-nowrap">🏸 Cầu lông</button>
          <button type="button" data-cust-cat="rental" class="cust-cat-btn px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 whitespace-nowrap">👟 Thuê đồ</button>
        </div>
      </div>

      <!-- Mobile-friendly 2-column Product List -->
      <div id="cust-shop-grid" class="grid grid-cols-2 gap-2"></div>

      <!-- Customer Order Checkout Box -->
      <div id="cust-cart-drawer" class="bg-white p-3.5 rounded-xl shadow-md border-2 border-emerald-500 space-y-2.5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 class="text-xs font-black text-slate-900">Giỏ Hàng Của Bạn</h3>
            <p id="cust-cart-summary-text" class="text-[10px] text-slate-500">Chưa có món nào được chọn</p>
          </div>
          <div class="flex items-center gap-2">
            <span id="cust-cart-total-amount" class="text-base font-black text-emerald-600">0đ</span>
            <button type="button" id="btn-clear-cust-cart" class="text-[10px] text-slate-400 hover:text-rose-500 hover:underline cursor-pointer" title="Làm trống giỏ hàng">Làm trống</button>
          </div>
        </div>

        <div id="cust-cart-items-list" class="divide-y divide-slate-100 max-h-40 overflow-y-auto custom-scrollbar text-xs"></div>

        <div class="space-y-2 pt-1">
          <div>
            <label for="cust-order-delivery" class="block text-[11px] font-bold text-slate-700 mb-0.5">Giao tới vị trí:</label>
            <select id="cust-order-delivery" class="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs font-bold bg-slate-50">
              <option value="retail">Nhận tại Quầy lễ tân</option>
              <option value="1">Mang ra Sân 1 (Thảm xanh)</option>
              <option value="2">Mang ra Sân 2 (Thảm xanh)</option>
              <option value="3">Mang ra Sân 3 (Thảm xám)</option>
              <option value="4">Mang ra Sân 4 (Thảm xám)</option>
            </select>
          </div>
          <div>
            <label for="cust-order-note" class="block text-[11px] font-bold text-slate-700 mb-0.5">Ghi chú (nếu có):</label>
            <input type="text" id="cust-order-note" placeholder="VD: Lấy nước lạnh..." class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs" />
          </div>
        </div>

        <button type="button" id="btn-cust-submit-order" class="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition">
          Gửi Đơn Nước & Phụ Kiện
        </button>
      </div>
    </div>
  </section>
  `;

  // Fixed Bottom Navigation Bar for Mobile
  const bottomBar = `
  <nav class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 shadow-2xl">
    <div class="max-w-md mx-auto grid grid-cols-4 gap-1 text-center">
      <button type="button" onclick="document.querySelector('[data-cust-tab=book]').click(); window.scrollTo({top:0, behavior:'smooth'});" class="py-1 px-1 rounded-xl flex flex-col items-center justify-center text-emerald-600 font-black text-[10px] active:scale-95 transition">
        <span class="text-base leading-tight">🏸</span>
        <span>Đặt Sân</span>
      </button>
      <button type="button" onclick="document.querySelector('[data-cust-tab=shop]').click(); window.scrollTo({top:0, behavior:'smooth'});" class="py-1 px-1 rounded-xl flex flex-col items-center justify-center text-slate-600 font-bold text-[10px] active:scale-95 transition">
        <span class="text-base leading-tight">🥤</span>
        <span>Menu Nước</span>
      </button>
      <button type="button" onclick="document.getElementById('cust-my-bookings-box').scrollIntoView({behavior:'smooth'});" class="py-1 px-1 rounded-xl flex flex-col items-center justify-center text-slate-600 font-bold text-[10px] active:scale-95 transition">
        <span class="text-base leading-tight">📋</span>
        <span>Lịch Đã Đặt</span>
      </button>
      <button type="button" onclick="document.getElementById('btn-open-admin-login').click();" class="py-1 px-1 rounded-xl flex flex-col items-center justify-center text-slate-600 font-bold text-[10px] active:scale-95 transition">
        <span class="text-base leading-tight">👑</span>
        <span>Quản Lý</span>
      </button>
    </div>
  </nav>
  `;

  return `<!DOCTYPE html>
<html lang="vi">
${headHTML}
<body class="bg-slate-50 min-h-screen flex flex-col font-sans text-slate-900 antialiased">
${topSwitch}
${header}
${custPortalMobile}
${adminHTML}
${bottomBar}
${modalsHTML}
<script>
${scriptContent}
</script>
</body>
</html>`;
}

// Write mobile.html
const mobileHTML = buildMobile();
fs.writeFileSync('c:\\Quan ly san cau\\mobile.html', mobileHTML, 'utf8');
console.log('mobile.html written, size:', fs.statSync('c:\\Quan ly san cau\\mobile.html').size);
