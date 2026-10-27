
    (function () {
      const Core = globalThis.SmashCourtCore;
      const STORAGE_KEY = 'smashcourt_pro_state_v6';

      // Time & Pricing Helpers:
      // Rule 1: 17:00 to 21:00 is 80,000đ/h; all other hours are 60,000đ/h.
      function timeToMinutes(value) { return value ? Core.minutes(value) : 300; }
      function minutesToTime(value) { return Core.time(Math.max(300, Math.min(1380, value))); }
      function calculateTimeRangeFee(start, end) { return Core.fee(start, end); }
      function parseSlotRange(slot) { return Core.ranges(slot)[0]; }
      function bookingRanges(booking) { try { return Core.ranges(booking.slot); } catch { return []; } }
      function selectedDate() { return state.isAdminLoggedIn && state.viewMode === 'admin' ? state.adminScheduleDate || Core.dateKey() : Core.bookingDate(state.customerDay); }
      function bookingOnDay(booking) { return booking.bookingDate === selectedDate() && ['reserved','checked_in'].includes(booking.status); }
      function conflicts(booking, start, end) { return bookingOnDay(booking) && bookingRanges(booking).some(r => Core.overlap(r, {startMin:start,endMin:end})); }
      function isTimeOverlapping(startA, endA, startB, endB) {
        return Math.max(startA, startB) < Math.min(endA, endB);
      }


      function getCurrentMinutes() { return Core.nowMinutes(); }
      function getFirstSelectableMin(curMin, step = 30) {
        const rounded = Math.ceil(curMin / step) * step;
        return Math.max(5 * 60, Math.min(23 * 60, rounded));
      }

      // Unified Alobo time slots generator (Chuẩn Alobo: Mặc định mỗi cột là 1 giờ: 6h, 7h, 8h... hỗ trợ ca 30p)
      function getAloboSlots(duration) {
        const step = duration || 30;
        const slots = [];
        const startMin = 5 * 60; // 05:00
        const endLimit = 23 * 60; // 22:00
        for (let m = startMin; m < endLimit; m += step) {
          const sTime = minutesToTime(m);
          const eTime = minutesToTime(m + step);
          const isPeak = (m >= 17 * 60 && m < 21 * 60); // 17h-21h: 80k/h; Giờ khác: 60k/h
          const h = Math.floor(m / 60);
          const mins = m % 60;
          const displayLabel = step === 60 ? `${sTime}` : (mins === 0 ? `${h}h` : `${h}h30`);
          slots.push({
            label: `${sTime} - ${eTime}`,
            start: sTime,
            end: eTime,
            displayLabel: displayLabel,
            isPeak: isPeak
          });
        }
        return slots;
      }
      const ALOBO_SLOTS = getAloboSlots(30);

      function getInitialState() {
        return {
          isAdminLoggedIn: false,
          viewMode: 'customer', // 'customer' or 'admin'
          myDeviceBookingIds: [],
          customerTab: 'book', // 'book' or 'shop'
          customerDay: 'today', // 'today', 'tomorrow', 'sunday'
          matrixSlotDuration: 30, // 30 for 30m (5:00 - 22:00)
          customerStartTime: '',
          customerEndTime: '',
          customerSelectedCourtId: null,
          customerSelectedSlots: [],
          customerCourtSlots: {},
          customerAddons: {},
          customerAddonSearch: '',
          customerAddonCat: 'all',
          customerShopCat: 'all',
          customerCart: [],
          activeTab: 'courts',
          courtFilter: 'all',
          posCategory: 'all',
          posSearch: '',
          posTarget: 'retail',
          posPaymentMethod: 'cash',
          checkoutPaymentMethod: 'cash',
          invoiceFilter: 'all',
          activeCheckoutCourtId: null,
          posCart: [],
          kpiCollapsed: true,
          // Rule 2: Exactly 4 courts — 2 Sân thảm xanh (Sân 1, 2) & 2 Sân thảm xám (Sân 3, 4)
          courts: [
            { id: 1, name: 'Sân 1', zone: 'Sân thảm xanh', matColor: 'green', status: 'free', customer: '', rateType: 'normal', hourlyRate: 60000, startTime: '', bookedHours: 1.5, elapsedMinutes: 0, deposit: 0, items: [] },
            { id: 2, name: 'Sân 2', zone: 'Sân thảm xanh', matColor: 'green', status: 'free', customer: '', rateType: 'normal', hourlyRate: 60000, startTime: '', bookedHours: 1.5, elapsedMinutes: 0, deposit: 0, items: [] },
            { id: 3, name: 'Sân 3', zone: 'Sân thảm xám', matColor: 'grey', status: 'free', customer: '', rateType: 'normal', hourlyRate: 60000, startTime: '', bookedHours: 1.5, elapsedMinutes: 0, deposit: 0, items: [] },
            { id: 4, name: 'Sân 4', zone: 'Sân thảm xám', matColor: 'grey', status: 'free', customer: '', rateType: 'normal', hourlyRate: 60000, startTime: '', bookedHours: 1.5, elapsedMinutes: 0, deposit: 0, items: [] }
          ],
          products: [],
          bookings: [],
          invoices: []
        };
      }

      let state = loadState();
      let weeklyChartInstance = null;
      let categoryChartInstance = null;

      function loadState() {
        const initial = getInitialState();
        try {
          const legacy = localStorage.getItem('smashcourt_pro_state_v5');
          if (legacy && !localStorage.getItem('smashcourt_legacy_backup')) localStorage.setItem('smashcourt_legacy_backup', legacy);
          const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          const keys = ['myDeviceBookingIds','customerTab','customerDay','customerCart','customerAddons','customerCourtSlots','posCart','kpiCollapsed'];
          for (const key of keys) if (parsed[key] !== undefined) initial[key] = parsed[key];
          for (const key of ['myDeviceBookingIds','customerCart','posCart']) if (!Array.isArray(initial[key])) initial[key] = [];
          for (const key of ['customerAddons','customerCourtSlots']) if (!initial[key] || typeof initial[key] !== 'object' || Array.isArray(initial[key])) initial[key] = {};
        } catch (error) { console.warn('Không đọc được bộ nhớ nháp:', error); }
        // Business data comes only from the authorized server snapshot. Legacy data is backed up, never filtered/deleted.
        initial.courts.forEach(c => c.status = 'maintenance');
        initial.products = [];
        return initial;
      }
      function saveState() {
        try {
          const draft = {};
          for (const key of ['myDeviceBookingIds','customerTab','customerDay','customerCart','customerAddons','customerCourtSlots','posCart','kpiCollapsed']) draft[key] = state[key];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        } catch (error) { setSyncMessage('Không lưu được bản nháp trên thiết bị. Giữ trang này mở.', true); }
      }

      function formatVND(amount) {
        return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
      }

      function showToast(message, type) {
        if (pendingNotices) { pendingNotices.push([message, type]); return; }
        const container = document.getElementById('toast-container');
        if (!container) return;
        const bgClass = type === 'warn' ? 'bg-amber-600' : 'bg-slate-900 border border-emerald-500/40';
        const toast = document.createElement('div');
        toast.className = `${bgClass} text-white px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 transition-all duration-300`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 300);
        }, 2800);
      }

      function getCourtPosTotal(court) {
        return (court.items || []).reduce((sum, it) => sum + it.price * it.qty, 0);
      }

      function getCourtCurrentTotal(court) {
        if (court.status !== 'active') return 0;
        const courtFee = Math.round(court.bookedHours * court.hourlyRate);
        const posFee = getCourtPosTotal(court);
        return Math.max(0, courtFee + posFee - (court.deposit || 0));
      }

      // ==================== RENDER TOP KPIs & BADGES ====================
      function renderKPIs() {
        const kpiPanel = document.getElementById('kpi-shortcuts-panel');
        const kpiLabel = document.getElementById('kpi-toggle-label');
        if (kpiPanel && kpiLabel) {
          const collapsed = Boolean(state.kpiCollapsed);
          kpiPanel.classList.toggle('hidden', collapsed);
          kpiLabel.textContent = collapsed ? 'Mở rộng ▼' : 'Thu gọn ▲';
        }
        const totalCourts = state.courts.length;
        const activeCount = state.courts.filter(c => c.status === 'active').length;
        const freeCount = state.courts.filter(c => c.status === 'free').length;
        const reservedCount = state.courts.filter(c => c.status === 'reserved').length;

        document.getElementById('badge-active-courts').textContent = `${activeCount}/${totalCourts}`;
        document.getElementById('kpi-courts-active').textContent = `${activeCount} / ${totalCourts} sân`;
        document.getElementById('kpi-courts-sub').textContent = `${freeCount} trống • ${reservedCount} đã đặt`;

        const allFilterBtn = document.querySelector('[data-court-filter="all"]');
        if (allFilterBtn) {
          allFilterBtn.textContent = `Tất cả (${totalCourts})`;
        }

        const runningUnbilled = state.courts
          .filter(c => c.status === 'active')
          .reduce((sum, c) => sum + getCourtCurrentTotal(c), 0);
        document.getElementById('kpi-running-unbilled').textContent = formatVND(runningUnbilled);

        const settledPosRev = state.invoices.filter(inv => Core.invoiceDate(inv) === Core.dateKey()).reduce((sum, inv) => sum + (inv.posFee || 0), 0);
        const activePosRev = state.courts.filter(c => c.status === 'active').reduce((sum, c) => sum + getCourtPosTotal(c), 0);
        const totalSoldItems = state.products.reduce((sum, p) => sum + (p.soldToday || 0), 0);

        document.getElementById('kpi-pos-revenue').textContent = formatVND(settledPosRev + activePosRev);
        document.getElementById('kpi-pos-items-sold').textContent = `${totalSoldItems} món đã xuất`;

        const totalSettledRevenue = state.invoices.filter(inv => Core.invoiceDate(inv) === Core.dateKey()).reduce((sum, inv) => sum + (inv.total || 0), 0);
        document.getElementById('kpi-total-revenue').textContent = formatVND(totalSettledRevenue);
        document.getElementById('kpi-invoice-count').textContent = `${state.invoices.filter(i => Core.invoiceDate(i) === Core.dateKey()).length} hóa đơn hôm nay`;

        const lowStockCount = state.products.filter(p => p.stock <= 15 && p.category !== 'rental').length;
        const lowBadge = document.getElementById('badge-low-stock');
        lowBadge.textContent = String(lowStockCount);
        lowBadge.classList.toggle('hidden', lowStockCount === 0);

        const cartCount = state.posCart.reduce((sum, item) => sum + item.qty, 0);
        const cartBadge = document.getElementById('badge-pos-cart');
        cartBadge.textContent = String(cartCount);
        cartBadge.classList.toggle('hidden', cartCount === 0);
      }

      // ==================== RENDER VIEW 1: COURTS GRID (4 SÂN: 2 THẢM XANH, 2 THẢM XÁM) ====================
      function renderCourts() {
        const grid = document.getElementById('courts-grid');
        if (!grid) return;

        document.querySelectorAll('.court-filter-btn').forEach(btn => {
          const f = btn.getAttribute('data-court-filter');
          if (f === state.courtFilter) {
            btn.className = 'court-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-900 shadow-xs transition';
          } else {
            btn.className = 'court-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition';
          }
        });

        const filtered = state.courts.filter(c => {
          if (state.courtFilter === 'all') return true;
          return c.status === state.courtFilter;
        });

        grid.innerHTML = filtered.map(court => {
          const posTotal = getCourtPosTotal(court);
          const courtFee = Math.round(court.bookedHours * court.hourlyRate);
          const totalBill = getCourtCurrentTotal(court);
          const itemCount = (court.items || []).reduce((s, i) => s + i.qty, 0);

          // Visual distinction: Sân 1 & 2 are Sân thảm xanh, Sân 3 & 4 are Sân thảm xám
          const isGreyMat = court.matColor === 'grey' || court.id >= 3;
          const surfaceClass = isGreyMat ? 'court-surface-maint' : 'court-surface-active';

          let badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Sân Trống</span>`;
          if (court.status === 'active') {
            badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-white live-dot"></span>Đang Chơi (${court.startedAt ? Math.max(0, Math.floor((Date.now()-Date.parse(court.startedAt))/60000)) : court.elapsedMinutes}p)</span>`;
          } else if (court.status === 'reserved') {
            badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">Đã Đặt Trước</span>`;
          } else if (court.status === 'maintenance') {
            badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800">Bảo Trì</span>`;
          }

          const itemsPreview = (court.items || []).slice(0, 3).map(i => `${i.name.split(' ')[0]} ${i.name.split(' ')[1] || ''} (x${i.qty})`).join(', ');

          return `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden flex flex-col justify-between transition hover:shadow-md">
              <div>
                <div class="${surfaceClass} p-3.5 text-white relative overflow-hidden">

                  <div class="relative z-10 flex items-center justify-between">
                    <div>
                      <span class="text-base font-extrabold tracking-tight">${court.name}</span>
                      <p class="text-[11px] text-white/90 font-semibold">${court.zone}</p>
                    </div>
                    ${badgeHtml}
                  </div>
                </div>

                <div class="p-4 space-y-3">
                  ${court.status === 'active' ? `
                    <div>
                      <p class="text-xs font-bold text-slate-900 truncate">${court.customer}</p>
                      <p class="text-[11px] text-slate-500 mt-0.5">Vào sân: <strong>${court.startTime}</strong> • Thời lượng: <strong>${court.bookedHours}h</strong> (${formatVND(court.hourlyRate)}/h)</p>
                    </div>
                    <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                      <div class="flex justify-between">
                        <span class="text-slate-500">Tiền giờ sân:</span>
                        <span class="font-semibold text-slate-800">${formatVND(courtFee)}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-slate-500">Nước & Phụ kiện (${itemCount}):</span>
                        <span class="font-semibold text-amber-700">${formatVND(posTotal)}</span>
                      </div>
                      ${court.items.length > 0 ? `<p class="text-[11px] text-slate-500 truncate pt-0.5 border-t border-slate-200/60">${itemsPreview}${court.items.length > 3 ? '...' : ''}</p>` : `<p class="text-[11px] text-slate-400 italic">Chưa gọi nước / cầu</p>`}
                    </div>
                    <div class="flex items-baseline justify-between pt-1">
                      <span class="text-xs font-semibold text-slate-600">Tạm tính:</span>
                      <span class="text-lg font-extrabold text-emerald-600">${formatVND(totalBill)}</span>
                    </div>
                  ` : ''}

                  ${court.status === 'free' ? `
                    <div class="py-4 text-center space-y-1">
                      <p class="text-xs font-semibold text-emerald-700">Sân trống sẵn sàng</p>
                      <p class="text-[11px] text-slate-500">${court.zone}</p>
                      <p class="text-xs font-bold text-slate-700 pt-1">60.000đ/h • Tối 17h–21h: 80.000đ/h</p>
                    </div>
                  ` : ''}

                  ${court.status === 'reserved' ? `
                    <div class="space-y-2 py-1">
                      <p class="text-xs font-bold text-slate-900">${court.customer}</p>
                      <p class="text-[11px] text-slate-500">Giờ đặt: <strong>${court.startTime}</strong> (${court.bookedHours} giờ)</p>
                      <div class="p-2 rounded-lg bg-amber-50 border border-amber-200/80 flex justify-between text-xs">
                        <span class="text-amber-800">Đã đặt cọc:</span>
                        <span class="font-bold text-amber-900">${formatVND(court.deposit)}</span>
                      </div>
                    </div>
                  ` : ''}

                  ${court.status === 'maintenance' ? `
                    <div class="py-4 text-center space-y-1">
                      <p class="text-xs font-semibold text-slate-700">${court.customer}</p>
                      <p class="text-[11px] text-slate-400">Tạm ngưng nhận khách</p>
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="p-3 bg-slate-50 border-t border-slate-200/80 grid grid-cols-2 gap-2">
                ${court.status === 'active' ? `
                  <button type="button" data-court-pos="${court.id}" class="py-2 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 border border-amber-400/50 font-semibold text-xs transition flex items-center justify-center gap-1">
                    <span>+ Nước / Cầu</span>
                  </button>
                  <button type="button" data-court-checkout="${court.id}" class="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1">
                    <span>Thanh Toán</span>
                  </button>
                ` : ''}

                ${court.status === 'free' ? `
                  <button type="button" data-court-open="${court.id}" class="col-span-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition">
                    + Mở Sân Ngay (Check-in)
                  </button>
                ` : ''}

                ${court.status === 'reserved' ? `
                  <button type="button" data-court-checkin-res="${court.id}" class="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition">
                    Nhận Sân
                  </button>
                  <button type="button" data-court-cancel-res="${court.id}" class="py-2 px-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 font-semibold text-xs transition">
                    Hủy Lịch
                  </button>
                ` : ''}

                ${court.status === 'maintenance' ? `
                  <button type="button" data-court-finish-maint="${court.id}" class="col-span-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition">
                    Hoàn Tất Bảo Trì & Mở Lại Sân
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
      }

      // ==================== RENDER VIEW 2: POS CATALOG & CART ====================
      function renderPOS() {
        const targetSelect = document.getElementById('pos-target-select');
        if (targetSelect) {
          const activeCourts = state.courts.filter(c => c.status === 'active');
          let optionsHtml = `<option value="retail" ${state.posTarget === 'retail' ? 'selected' : ''}>💵 Khách mua lẻ tại quầy (Thanh toán ngay)</option>`;
          activeCourts.forEach(c => {
            const sel = String(c.id) === String(state.posTarget) ? 'selected' : '';
            optionsHtml += `<option value="${c.id}" ${sel}>🏸 Ghi vào ${c.name} (${c.zone}) — ${c.customer}</option>`;
          });
          targetSelect.innerHTML = optionsHtml;
          if (state.posTarget !== 'retail' && !activeCourts.some(c => String(c.id) === state.posTarget)) state.posTarget = 'retail';
          targetSelect.value = state.posTarget;
        }

        document.querySelectorAll('.pos-cat-btn').forEach(btn => {
          const cat = btn.getAttribute('data-pos-cat');
          if (cat === state.posCategory) {
            btn.className = 'pos-cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white whitespace-nowrap transition';
          } else {
            btn.className = 'pos-cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap transition';
          }
        });

        const catLabels = {
          drink: 'Nước giải khát',
          grip: 'Quấn cán & Phụ kiện',
          shuttle: 'Cầu lông',
          rental: 'Dịch vụ thuê'
        };

        const searchLower = (state.posSearch || '').toLowerCase().trim();
        const filteredProducts = state.products.filter(p => {
          const matchCat = state.posCategory === 'all' || p.category === state.posCategory;
          const matchSearch = !searchLower || p.name.toLowerCase().includes(searchLower);
          return matchCat && matchSearch;
        });

        const prodGrid = document.getElementById('pos-products-grid');
        if (prodGrid) {
          prodGrid.innerHTML = filteredProducts.map(p => {
            const inCart = state.posCart.find(item => item.productId === p.id);
            const qtyBadge = inCart ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-600 text-white">Đã chọn: ${inCart.qty}</span>` : '';
            const lowStockClass = p.stock <= 15 && p.category !== 'rental' ? 'text-rose-600 font-bold' : 'text-slate-500';

            return `
              <button type="button" data-add-pos="${p.id}" class="text-left bg-white p-3.5 rounded-2xl border ${inCart ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/90'} hover:border-emerald-500 shadow-xs transition flex flex-col justify-between group">
                <div>
                  <div class="flex items-start justify-between gap-2 mb-2">
                    <span class="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-50 flex items-center justify-center text-xl">${p.icon || '🏸'}</span>
                    ${qtyBadge}
                  </div>
                  <p class="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-emerald-700">${p.name}</p>
                  <p class="text-[11px] text-slate-400 mt-0.5">${catLabels[p.category] || p.category}</p>
                </div>
                <div class="pt-3 mt-2 border-t border-slate-100 flex items-baseline justify-between w-full">
                  <span class="text-sm font-extrabold text-emerald-600">${formatVND(p.price)}<span class="text-[10px] font-normal text-slate-400">/${p.unit}</span></span>
                  <span class="text-[11px] ${lowStockClass}">Kho: ${p.stock}</span>
                </div>
              </button>
            `;
          }).join('');
        }

        const cartContainer = document.getElementById('pos-cart-items');
        let cartTotal = 0;
        let cartCount = 0;

        if (state.posCart.length === 0) {
          cartContainer.innerHTML = `
            <div class="py-8 text-center text-slate-400 text-xs">
              Chưa có sản phẩm nào trong phiếu.<br/>Bấm vào Nước, Quấn cán hoặc Cầu bên trái để chọn.
            </div>
          `;
        } else {
          cartContainer.innerHTML = state.posCart.map(item => {
            const prod = state.products.find(p => p.id === item.productId);
            if (!prod) return '';
            const lineTotal = prod.price * item.qty;
            cartTotal += lineTotal;
            cartCount += item.qty;
            return `
              <div class="py-2.5 flex items-center justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-bold text-slate-800 truncate">${prod.name}</p>
                  <p class="text-[11px] text-slate-500">${formatVND(prod.price)} / ${prod.unit}</p>
                </div>
                <div class="flex items-center gap-1.5">
                  <button type="button" data-cart-dec="${prod.id}" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">-</button>
                  <span class="w-6 text-center text-xs font-bold">${item.qty}</span>
                  <button type="button" data-cart-inc="${prod.id}" class="w-6 h-6 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center">+</button>
                </div>
                <span class="text-xs font-bold text-slate-900 min-w-[66px] sm:min-w-[70px] text-right">${formatVND(lineTotal)}</span>
              </div>
            `;
          }).join('');
        }

        document.getElementById('pos-cart-count').textContent = `${cartCount} món`;
        document.getElementById('pos-cart-total').textContent = formatVND(cartTotal);

        const isRetail = state.posTarget === 'retail';
        const retailPayBox = document.getElementById('pos-retail-payment-box');
        retailPayBox.classList.toggle('hidden', !isRetail);

        const submitLabel = document.getElementById('btn-submit-pos-label');
        if (isRetail) {
          submitLabel.textContent = 'Thanh Toán Đơn Bán Lẻ Ngay';
        } else {
          const targetCourt = state.courts.find(c => String(c.id) === String(state.posTarget));
          submitLabel.textContent = targetCourt ? `Ghi Vào Hóa Đơn ${targetCourt.name}` : 'Ghi Vào Sân';
        }
      }

      // ==================== RENDER VIEW 3: SCHEDULE TIMELINE & BOOKINGS ====================
                  function renderSchedule() {
        const aloboSlots = getAloboSlots(30);
        const isToday = selectedDate() === Core.dateKey();
        document.getElementById('admin-schedule-date').value=selectedDate();
        const currentMin = getCurrentMinutes();
        const firstSelectableMin = getFirstSelectableMin(currentMin, 30);

        // 1. Render Admin Alobo Matrix Header (05:00 - 23:00)
        const adminHeader = document.getElementById('admin-alobo-matrix-header');
        if (adminHeader) {
          adminHeader.innerHTML = `
            <th class="w-20 min-w-[76px] sm:w-24 sm:min-w-[90px] sticky left-0 bg-[#f1f5f9] z-20 border-r-2 border-[#cbd5e1] h-11 p-0 text-center font-black text-xs text-[#334155] uppercase tracking-wider">SÂN</th>
            ${aloboSlots.map((slot, idx) => {
              const slotStartM = timeToMinutes(slot.start);
              const isColPast = isToday && (slotStartM < currentMin);
              const isFirstSelect = isToday && (slotStartM === firstSelectableMin);
              const colBg = isColPast ? 'bg-[#b6e2f3] opacity-80' : 'bg-[#f1f5f9]';
              const labelColor = isColPast ? 'text-slate-500' : 'text-[#334155]';
              const tickClass = isColPast
                ? 'w-[2px] h-[7px] bg-slate-400 rounded-xs pointer-events-none z-30'
                : (isFirstSelect
                    ? 'w-[3px] h-[8px] bg-emerald-700 rounded-xs pointer-events-none z-30'
                    : 'w-[2px] h-[7px] bg-emerald-600 rounded-xs pointer-events-none z-30');

              return `
              <th data-slot-start="${slot.start}" class="relative border-r border-[#e2e8f0] min-w-[56px] sm:min-w-[64px] h-11 p-0 text-left ${colBg} select-none">
                <span class="absolute left-0 -translate-x-1/2 bottom-1 ${tickClass}"></span>
                <span class="absolute left-0 -translate-x-1/2 top-1.5 text-[10px] sm:text-[11px] font-bold ${labelColor} tracking-tight leading-none whitespace-nowrap pointer-events-none z-30">${slot.start}</span>
                ${idx === aloboSlots.length - 1 ? `
                  <span class="absolute right-0 translate-x-1/2 bottom-1 w-[2px] h-[7px] bg-emerald-600 rounded-xs pointer-events-none z-30"></span>
                  <span class="absolute right-0 translate-x-1/2 top-1.5 text-[10px] sm:text-[11px] font-bold text-[#334155] tracking-tight leading-none whitespace-nowrap pointer-events-none z-30">${slot.end}</span>
                ` : ''}
              </th>
            `;}).join('')}
          `;
        }

        // 2. Render Admin Alobo Matrix Body (HIỂN THỊ RÕ RÀNG TÊN KHÁCH & TRẠNG THÁI)
        const adminBody = document.getElementById('admin-alobo-matrix-body');
        if (adminBody) {
          adminBody.innerHTML = state.courts.map(court => {
            const courtBookings = state.bookings
              .filter(booking => Number(booking.courtId) === court.id && bookingOnDay(booking))
              .map(booking => ({ booking, ranges: bookingRanges(booking) }))
              .filter(entry => entry.ranges.length)
              .sort((a, b) => a.ranges[0].startMin - b.ranges[0].startMin);
            const slotCells = [];

            for (let slotIndex = 0; slotIndex < aloboSlots.length;) {
              const slot = aloboSlots[slotIndex];
              const slotStartMin = timeToMinutes(slot.start);
              const slotEndMin = timeToMinutes(slot.end);
              const slotRange = { startMin: slotStartMin, endMin: slotEndMin };
              const bookingEntry = courtBookings.find(entry => entry.ranges.some(range => Core.overlap(range, slotRange)));
              const booking = bookingEntry?.booking;

              if (booking) {
                let colspan = 1;
                while (slotIndex + colspan < aloboSlots.length) {
                  const next = aloboSlots[slotIndex + colspan];
                  const nextRange = { startMin: timeToMinutes(next.start), endMin: timeToMinutes(next.end) };
                  if (!bookingEntry.ranges.some(range => Core.overlap(range, nextRange))) break;
                  colspan++;
                }

                const isCourtActive = court.status === 'active' && isToday
                  && bookingEntry.ranges.some(range => currentMin >= range.startMin && currentMin < range.endMin);
                let bgStyle = 'bg-amber-100 hover:bg-amber-200 border-r border-amber-300 text-amber-950 font-bold';
                let tagText = booking.deposit ? formatVND(booking.deposit) : 'Đã đặt';
                if (booking.status === 'checked_in' || isCourtActive) {
                  bgStyle = 'bg-emerald-600 hover:bg-emerald-700 border-r border-emerald-500 text-white font-bold';
                  tagText = 'Đang đánh';
                } else if (booking.status === 'completed') {
                  bgStyle = 'bg-slate-200 hover:bg-slate-300 text-slate-700';
                  tagText = 'Đã xong';
                }

                slotCells.push(`
                  <td colspan="${colspan}" class="h-11 sm:h-12 border-r border-b border-slate-200 p-0 text-center select-none ${bgStyle}">
                    <button type="button" data-admin-booking-id="${booking.id}" class="w-full h-full p-0.5 flex flex-col items-center justify-center leading-tight cursor-pointer overflow-hidden transition-opacity hover:opacity-90" title="Khách: ${booking.customer} • SĐT: ${booking.phone || 'Chưa có'} • ${booking.slot} • Cọc: ${formatVND(booking.deposit)} • Bấm để xem / nhận sân">
                      <span class="font-black text-[11px] truncate w-full px-0.5 text-center leading-tight">${booking.customer}</span>
                      <span class="text-[9px] font-semibold opacity-90 truncate w-full px-0.5 text-center leading-none mt-0.5">${booking.phone ? booking.phone.slice(-4) : tagText}</span>
                    </button>
                  </td>
                `);
                slotIndex += colspan;
                continue;
              }

              if (court.status === 'maintenance') {
                slotCells.push(`
                  <td class="h-11 sm:h-12 min-w-[56px] sm:min-w-[64px] border-r border-b border-slate-200 bg-rose-50 p-0 text-center select-none text-rose-700 font-bold text-[10px]">
                    <div class="w-full h-full flex items-center justify-center">Bảo trì</div>
                  </td>
                `);
                slotIndex++;
                continue;
              }

              // Khung giờ còn trống -> Admin bấm vào để ĐẶT LỊCH NHANH cho khách!
              const isPast = isToday && (slotStartMin < currentMin);
              const cellBg = isPast ? 'bg-slate-50/70 hover:bg-emerald-50/70' : 'bg-white hover:bg-emerald-50/80';
              const plusColor = isPast ? 'text-slate-300' : 'text-slate-400 group-hover:text-emerald-600';

              slotCells.push(`
                <td class="h-11 sm:h-12 min-w-[56px] sm:min-w-[64px] border-r border-b border-slate-200 ${cellBg} p-0 text-center select-none transition-colors group">
                  <button type="button" data-quick-slot-court="${court.id}" data-quick-slot-time="${slot.start}" data-quick-slot-end="${slot.end}" class="w-full h-full flex items-center justify-center cursor-pointer" title="${slot.start} - ${slot.end} (${court.name} còn trống • Bấm để đặt)">
                    <span class="${plusColor} text-[11px] font-bold transition-all transform opacity-0 group-hover:opacity-100 group-hover:scale-125">+</span>
                  </button>
                </td>
              `);
              slotIndex++;
            }

            const isGreyCourt = court.matColor === 'grey' || court.id >= 3;
            const courtMatGradient = isGreyCourt
              ? 'bg-gradient-to-br from-[#475569] via-[#3b4754] to-[#2d3748]'
              : 'bg-gradient-to-br from-[#059669] via-[#047857] to-[#065f46]';
            const courtTypeLabel = isGreyCourt ? 'Thảm xám' : 'Thảm xanh';
            const subTextColor = isGreyCourt ? 'text-slate-200' : 'text-emerald-100';

            return `
              <tr class="h-11 sm:h-12">
                <td class="sticky left-0 z-20 border-r-2 border-[#cbd5e1] border-b border-slate-200 text-center select-none w-20 min-w-[76px] sm:w-24 sm:min-w-[90px] h-11 sm:h-12 p-0 ${courtMatGradient} relative overflow-hidden">
                  <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-80" viewBox="0 0 100 50" preserveAspectRatio="none">
                    <rect x="2" y="2" width="96" height="46" fill="none" stroke="white" stroke-width="1.2" stroke-opacity="0.85" />
                    <line x1="2" y1="7" x2="98" y2="7" stroke="white" stroke-width="0.8" stroke-opacity="0.7" />
                    <line x1="2" y1="43" x2="98" y2="43" stroke="white" stroke-width="0.8" stroke-opacity="0.7" />
                    <line x1="9" y1="2" x2="9" y2="48" stroke="white" stroke-width="0.8" stroke-opacity="0.7" />
                    <line x1="91" y1="2" x2="91" y2="48" stroke="white" stroke-width="0.8" stroke-opacity="0.7" />
                    <line x1="36" y1="2" x2="36" y2="48" stroke="white" stroke-width="0.8" stroke-opacity="0.7" />
                    <line x1="64" y1="2" x2="64" y2="48" stroke="white" stroke-width="0.8" stroke-opacity="0.7" />
                    <line x1="2" y1="25" x2="36" y2="25" stroke="white" stroke-width="0.8" stroke-opacity="0.7" />
                    <line x1="64" y1="25" x2="98" y2="25" stroke="white" stroke-width="0.8" stroke-opacity="0.7" />
                    <line x1="50" y1="1" x2="50" y2="49" stroke="white" stroke-width="1.8" stroke-dasharray="2.5 1.5" stroke-opacity="0.9" />
                  </svg>
                  <div class="relative z-10 flex flex-col items-center justify-center w-full h-full py-1">
                    <span class="font-black text-white text-[11px] sm:text-xs tracking-tight uppercase leading-none drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)]">${court.name}</span>
                    <span class="text-[8.5px] sm:text-[9px] font-bold ${subTextColor} leading-none mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">${courtTypeLabel}</span>
                  </div>
                </td>
                ${slotCells.join('')}
              </tr>
            `;
          }).join('');
        }

        // 3. Render Bookings List Table
        const bookingsBody = document.getElementById('bookings-table-body');
        const countLabel = document.getElementById('booking-count-label');
        if (countLabel) countLabel.textContent = `${state.bookings.length} lịch đặt`;
        if (bookingsBody) {
          bookingsBody.innerHTML = state.bookings.filter(b => b.bookingDate === selectedDate() || !b.bookingDate).map(b => {
            const court = state.courts.find(c => c.id === Number(b.courtId));
            const courtName = court ? `${court.name} (${court.zone})` : `Sân ${b.courtId}`;

            return `
              <tr class="hover:bg-slate-50/80">
                <td class="py-3 px-4 font-bold text-slate-900">${b.customer}</td>
                <td class="py-3 px-4 text-slate-600">${b.phone || '—'}</td>
                <td class="py-3 px-4 font-semibold text-emerald-700">${courtName}</td>
                <td class="py-3 px-4 font-bold text-slate-800">${b.slot}</td>
                <td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[11px] bg-slate-100 font-medium">${b.type === 'Cố định tháng' ? 'Khách cố định' : 'Vãng lai'}</span></td>
                <td class="py-3 px-4 text-right font-bold text-emerald-600">${formatVND(b.deposit)}</td>
                <td class="py-3 px-4">
                  <span class="px-2 py-0.5 rounded text-[11px] font-bold ${b.status === 'checked_in' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                    ${({checked_in:'Đang đánh',reserved:'Chờ nhận',cancelled:'Đã hủy',completed:'Đã xong'})[b.status] || 'Cần kiểm tra'}${!b.bookingDate ? ' • Chưa có ngày' : ''}
                  </span>
                </td>
                <td class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    ${b.status === 'reserved' && b.bookingDate ? `
                      <button type="button" data-booking-checkin="${b.id}" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs cursor-pointer">
                        Nhận Sân
                      </button>
                    ` : ''}
                    <button type="button" data-booking-cancel="${b.id}" class="px-2 py-1 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 font-semibold text-[11px] cursor-pointer">
                      Hủy
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('');
        }
      }

      function renderInventory() {
        const tbody = document.getElementById('inventory-table-body');
        if (!tbody) return;

        const catNames = {
          drink: '🥤 Nước giải khát',
          grip: '🎾 Quấn cán & Phụ kiện',
          shuttle: '🏸 Quả cầu lông',
          rental: '👟 Cho thuê dụng cụ'
        };

        tbody.innerHTML = state.products.map(p => {
          const profit = p.price - p.cost;
          const isLow = p.stock <= 15 && p.category !== 'rental';
          return `
            <tr class="hover:bg-slate-50">
              <td class="py-3 px-4">
                <div class="flex items-center gap-2.5">
                  <span class="text-lg">${p.icon || '🏸'}</span>
                  <div>
                    <p class="font-bold text-slate-900">${p.name}</p>
                    <p class="text-[11px] text-slate-400">Mã: ${p.id.toUpperCase()}</p>
                  </div>
                </div>
              </td>
              <td class="py-3 px-4 text-slate-600 font-medium">${catNames[p.category] || p.category}</td>
              <td class="py-3 px-4 text-slate-600">${p.unit}</td>
              <td class="py-3 px-4 text-right text-slate-500">${formatVND(p.cost)}</td>
              <td class="py-3 px-4 text-right font-bold text-slate-900">${formatVND(p.price)}</td>
              <td class="py-3 px-4 text-right font-semibold text-emerald-600">+${formatVND(profit)}</td>
              <td class="py-3 px-4 text-center">
                <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}">
                  ${p.stock} ${p.unit} ${isLow ? '⚠️ Sắp hết' : ''}
                </span>
              </td>
              <td class="py-3 px-4 text-center font-bold text-slate-700">${p.soldToday || 0}</td>
              <td class="py-3 px-4 text-right">
                <button type="button" data-restock-prod="${p.id}" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-emerald-600 text-white font-semibold text-[11px] transition">
                  + Nhập thêm 20
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }

      // ==================== RENDER VIEW 5: REPORTS & CHARTS ====================
      function renderReports() {
        document.querySelectorAll('.inv-filter-btn').forEach(btn => {
          const f = btn.getAttribute('data-inv-filter');
          if (f === state.invoiceFilter) {
            btn.className = 'inv-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white';
          } else {
            btn.className = 'inv-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200';
          }
        });

        const filteredInvoices = state.invoices.filter(inv => {
          if (state.invoiceFilter === 'all') return true;
          return inv.type === state.invoiceFilter;
        });

        const tbody = document.getElementById('invoices-table-body');
        if (tbody) {
          tbody.innerHTML = filteredInvoices.slice().sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(inv => `
            <tr class="hover:bg-slate-50">
              <td class="py-3 px-4 font-mono font-bold text-slate-800">${inv.id}</td>
              <td class="py-3 px-4 text-slate-500">${inv.createdAt ? new Date(inv.createdAt).toLocaleString('vi-VN', {timeZone:Core.timezone}) : 'Chưa có ngày'}</td>
              <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold ${inv.type === 'court' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}">
                  ${inv.type === 'court' ? `Thu ${inv.courtName}` : 'Bán lẻ POS'}
                </span>
              </td>
              <td class="py-3 px-4 font-semibold text-slate-900">${inv.customer}</td>
              <td class="py-3 px-4 text-right text-slate-700">${formatVND(inv.courtFee)}</td>
              <td class="py-3 px-4 text-right text-amber-700 font-semibold">${formatVND(inv.posFee)}</td>
              <td class="py-3 px-4 text-right font-extrabold text-emerald-600">${formatVND(inv.total)}</td>
              <td class="py-3 px-4"><span class="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">${inv.paymentMethod}</span></td>
              <td class="py-3 px-4 text-right">
                <button type="button" data-view-invoice="${inv.id}" class="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700">
                  Xem phiếu
                </button>
              </td>
            </tr>
          `).join('');
        }

        renderCharts();
      }

      function renderCharts() {
        if (typeof Chart === 'undefined') return;

        const todayInvoices = state.invoices.filter(inv => Core.invoiceDate(inv) === Core.dateKey());
        const todayCourtRev = todayInvoices.reduce((s, i) => s + (i.courtFee || 0), 0);
        const todayPosRev = todayInvoices.reduce((s, i) => s + (i.posFee || 0), 0);

        // Tạo 7 ngày gần nhất thực tế (từ 6 ngày trước đến hôm nay)
        const labels = Array.from({length:7},(_,index)=> {
          if(index===6)return 'Hôm nay';
          const d=new Date(new Date(Core.dateKey()+'T12:00:00+07:00').getTime()-(6-index)*86400000);
          return new Intl.DateTimeFormat('vi-VN',{timeZone:Core.timezone,weekday:'short',day:'2-digit',month:'2-digit'}).format(d);
        });

        const ctxWeekly = document.getElementById('chart-weekly-revenue');
        if (ctxWeekly) {
          if (weeklyChartInstance) weeklyChartInstance.destroy();
          weeklyChartInstance = new Chart(ctxWeekly, {
            type: 'bar',
            data: {
              labels: labels,
              datasets: [
                {
                  label: 'Tiền thuê sân',
                  data: weeklyRevenue('courtFee'),
                  backgroundColor: '#059669',
                  borderRadius: 6
                },
                {
                  label: 'Doanh thu POS (Nước, Cầu, Quấn cán)',
                  data: weeklyRevenue('posFee'),
                  backgroundColor: '#f59e0b',
                  borderRadius: 6
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top' }
              },
              scales: {
                x: { stacked: true },
                y: {
                  stacked: true,
                  ticks: {
                    callback: function (value) {
                      return (value / 1000).toLocaleString('vi-VN') + 'k';
                    }
                  }
                }
              }
            }
          });
        }

        // Tính cơ cấu doanh thu thực tế từ invoices
        const courtShare = todayInvoices.reduce((sum,inv)=>sum+netCourtRevenue(inv),0);
        let shuttleShare = 0, drinkShare = 0, gripShare = 0, rentalShare = 0;
        todayInvoices.forEach(inv => {
          (inv.items || []).forEach(it => {
            const p = state.products.find(prod => prod.name === it.name);
            if (!it.productId && !it.category) return;
            const lineTotal = (it.price || 0) * (it.qty || 1) * (inv.total / (inv.courtFee + inv.posFee || 1));
            if (p) {
              if (p.category === 'shuttle') shuttleShare += lineTotal;
              else if (p.category === 'drink') drinkShare += lineTotal;
              else if (p.category === 'grip') gripShare += lineTotal;
              else if (p.category === 'rental') rentalShare += lineTotal;
            } else {
              drinkShare += lineTotal;
            }
          });
        });

        const totalShares = courtShare + shuttleShare + drinkShare + gripShare + rentalShare;
        const chartData = totalShares > 0
          ? [courtShare, shuttleShare, drinkShare, gripShare, rentalShare]
          : [0, 0, 0, 0, 0];

        const ctxCat = document.getElementById('chart-category-share');
        if (ctxCat) {
          if (categoryChartInstance) categoryChartInstance.destroy();
          categoryChartInstance = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
              labels: ['Tiền thuê sân', 'Ống cầu & Quả cầu', 'Nước giải khát', 'Quấn cán & Phụ kiện', 'Thuê vợt & Giày'],
              datasets: [{
                data: chartData,
                backgroundColor: ['#059669', '#f59e0b', '#0284c7', '#7c3aed', '#64748b'],
                borderWidth: 2
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
              }
            }
          });
        }
      }

      // ==================== MODAL CHECKOUT LOGIC ====================
      function openCheckoutModal(courtId) {
        const court = state.courts.find(c => c.id === Number(courtId));
        if (!court) return;
        state.activeCheckoutCourtId = court.id;

        document.getElementById('checkout-modal-title').textContent = `Thanh Toán & Chi Tiết — ${court.name} (${court.zone})`;
        document.getElementById('checkout-modal-subtitle').textContent = `Khách hàng: ${court.customer} • Giờ vào: ${court.startTime}`;
        document.getElementById('checkout-rate-info').textContent = `Đơn giá: ${formatVND(court.hourlyRate)}/giờ (Tối 17h–21h: 80k/h, Giờ khác: 60k/h)`;
        document.getElementById('checkout-hours-input').value = court.bookedHours;
        document.getElementById('checkout-discount-input').value = 0;

        renderCheckoutModalItems();
        document.getElementById('modal-checkout').classList.remove('hidden');
      }

      function renderCheckoutModalItems() {
        const court = state.courts.find(c => c.id === Number(state.activeCheckoutCourtId));
        if (!court) return;

        const hours = Number(document.getElementById('checkout-hours-input').value);
        if (!Number.isFinite(hours) || hours <= 0 || hours > 18) throw new Error('Thời lượng không hợp lệ.');
        const discount = Core.amount(document.getElementById('checkout-discount-input').value || 0, 'Giảm giá');

        const courtFee = checkoutFee(court, hours);
        const posFee = getCourtPosTotal(court);
        const totals = Core.checkoutTotals(courtFee,posFee,discount,court.deposit || 0);
        const grandTotal=totals.paymentAmount;

        document.getElementById('checkout-court-subtotal').textContent = formatVND(courtFee);
        document.getElementById('summary-court-fee').textContent = formatVND(courtFee);
        document.getElementById('summary-pos-fee').textContent = formatVND(posFee);
        document.getElementById('summary-discount-fee').textContent = '-' + formatVND(discount + (court.deposit || 0));
        document.getElementById('summary-grand-total').textContent = formatVND(grandTotal);
        document.getElementById('summary-refund').textContent=totals.refundAmount?'Cần hoàn lại tiền cọc: '+formatVND(totals.refundAmount):'';

        const listEl = document.getElementById('checkout-items-list');
        if (!court.items || court.items.length === 0) {
          listEl.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">Chưa có nước uống, quấn cán hay cầu lông nào được gọi cho sân này.</div>`;
        } else {
          listEl.innerHTML = court.items.map(item => `
            <div class="p-3 flex items-center justify-between gap-2 text-xs">
              <div class="flex-1">
                <p class="font-bold text-slate-900">${item.name}</p>
                <p class="text-[11px] text-slate-500">${formatVND(item.price)} / đơn vị</p>
              </div>
              <div class="flex items-center gap-1.5">
                <button type="button" data-modal-item-dec="${item.productId}" class="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold">-</button>
                <span class="w-6 text-center font-bold">${item.qty}</span>
                <button type="button" data-modal-item-inc="${item.productId}" class="w-6 h-6 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold">+</button>
              </div>
              <span class="font-bold text-slate-900 min-w-[75px] text-right">${formatVND(item.price * item.qty)}</span>
            </div>
          `).join('');
        }
      }

      function addProductToCourt(courtId, productId, delta) {
        const court = state.courts.find(c => c.id === Number(courtId));
        const product = state.products.find(p => p.id === productId);
        if (!court || !product) throw new Error('Không tìm thấy sân hoặc sản phẩm.');
        Core.adjustItem(court, product, delta);
        saveState(); renderAll();
      }
      // ==================== SWITCH TABS ====================
      function switchTab(tabName) {
        state.activeTab = tabName;
        // Auto-collapse the KPI strip when switching to sub-sections on mobile so the screen stays uncluttered
        if (tabName !== 'courts' && window.innerWidth < 768) {
          state.kpiCollapsed = true;
        }
        const views = ['courts', 'pos', 'schedule', 'inventory', 'reports'];
        views.forEach(v => {
          const el = document.getElementById(`view-${v}`);
          if (el) el.classList.toggle('hidden', v !== tabName);
        });

        document.querySelectorAll('.nav-tab-btn').forEach(btn => {
          const nav = btn.getAttribute('data-nav');
          if (nav === tabName) {
            btn.className = 'nav-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 bg-emerald-500 text-slate-950 shadow-sm whitespace-nowrap';
          } else {
            btn.className = 'nav-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-700/60 whitespace-nowrap';
          }
        });

        renderAll();
      }

      function updateRoleViewMode() {
        const isAdmin = Boolean(state.isAdminLoggedIn);
        const showAdminWorkspace = isAdmin && state.viewMode === 'admin';

        document.getElementById('customer-portal').classList.toggle('hidden', showAdminWorkspace);
        document.getElementById('admin-workspace').classList.toggle('hidden', !showAdminWorkspace);
        document.getElementById('admin-nav-bar').classList.toggle('hidden', !showAdminWorkspace);
        document.getElementById('btn-open-admin-login').classList.toggle('hidden', isAdmin);
        const adminHeaderControls = document.getElementById('admin-header-controls');
        if (adminHeaderControls) adminHeaderControls.classList.toggle('hidden', !isAdmin);

        const roleBadge = document.getElementById('role-mode-badge');
        if (roleBadge) {
          if (showAdminWorkspace) {
            roleBadge.textContent = '👑 Quản trị viên (Admin)';
            roleBadge.className = 'hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 whitespace-nowrap';
          } else if (isAdmin) {
            roleBadge.textContent = '👁️ Xem như Khách';
            roleBadge.className = 'hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap';
          } else {
            roleBadge.textContent = 'Khách đặt sân';
            roleBadge.className = 'hidden';
          }
        }

        const previewBtn = document.getElementById('btn-toggle-customer-preview');
        if (previewBtn) {
          previewBtn.textContent = showAdminWorkspace ? 'Giao diện Khách' : 'Về trang Quản lý';
        }
      }

      function renderCustomerPortal() {
        if (!state.customerTab) state.customerTab = 'book';
        if (state.customerStartTime === undefined) state.customerStartTime = '';
        if (state.customerEndTime === undefined) state.customerEndTime = '';
        if (!state.customerShopCat) state.customerShopCat = 'all';
        if (!Array.isArray(state.customerCart)) state.customerCart = [];

        document.getElementById('cust-view-book').classList.toggle('hidden', state.customerTab !== 'book');
        document.getElementById('cust-view-shop').classList.toggle('hidden', state.customerTab !== 'shop');
        updateDynamicDateLabels();

        document.querySelectorAll('.cust-tab-btn').forEach(btn => {
          const t = btn.getAttribute('data-cust-tab');
          if (t === state.customerTab) {
            btn.className = 'cust-tab-btn py-2.5 px-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 bg-emerald-600 text-white shadow-xs transition whitespace-nowrap';
          } else {
            btn.className = 'cust-tab-btn py-2.5 px-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 text-slate-600 hover:bg-slate-100 transition whitespace-nowrap';
          }
        });

        // 1. Render Flexible Start Time & End Time Selectors (30-min steps from 05:00 to 22:30)
        const startMin = timeToMinutes(state.customerStartTime);
        let endMin = timeToMinutes(state.customerEndTime);
        if (endMin <= startMin) {
          endMin = Math.min(22 * 60 + 30, startMin + 60);
          state.customerEndTime = minutesToTime(endMin);
        }

        const currentMin = getCurrentMinutes();
        const isToday = (!state.customerDay || state.customerDay === 'today');
        const firstSelectableMin = isToday ? getFirstSelectableMin(currentMin, state.matrixSlotDuration || 30) : (5 * 60);

        // Đảm bảo giờ bắt đầu không nằm trong quá khứ
        if (isToday && timeToMinutes(state.customerStartTime) < firstSelectableMin) {
          state.customerStartTime = minutesToTime(firstSelectableMin);
          state.customerEndTime = minutesToTime(Math.min(23 * 60, firstSelectableMin + 60));
        }

        const startSelect = document.getElementById('cust-start-time');
        if (startSelect) {
          let startOpts = '';
          const loopStart = isToday ? firstSelectableMin : (5 * 60);
          for (let m = loopStart; m <= 22 * 60 + 30; m += 30) {
            const t = minutesToTime(m);
            const isEvening = m >= 17 * 60 && m < 21 * 60;
            const sel = t === state.customerStartTime ? 'selected' : '';
            startOpts += `<option value="${t}" ${sel}>${t} (${isEvening ? '80k/h' : '60k/h'})</option>`;
          }
          startSelect.innerHTML = startOpts;
        }

        const endSelect = document.getElementById('cust-end-time');
        if (endSelect) {
          let endOpts = '';
          for (let m = startMin + 30; m <= Math.min(23 * 60, startMin + 4 * 60); m += 30) {
            const t = minutesToTime(m);
            const dur = ((m - startMin) / 60).toFixed(1).replace('.0', '');
            const sel = t === state.customerEndTime ? 'selected' : '';
            endOpts += `<option value="${t}" ${sel}>${t} (${dur} tiếng)</option>`;
          }
          endSelect.innerHTML = endOpts;
        }

        // Quick duration buttons (0.5h, 1h, 1.5h, 2h, 2.5h, 3h)
        const currentDuration = (endMin - startMin) / 60;
        const durations = [1, 1.5, 2, 2.5, 3, 4];
        const slotGrid = document.getElementById('cust-slot-grid');
        if (slotGrid) {
          slotGrid.innerHTML = durations.map(d => {
            const isActive = Math.abs(currentDuration - d) < 0.05;
            return `
              <button type="button" data-cust-dur="${d}" class="py-2 px-2 rounded-xl border text-center text-xs font-bold transition ${isActive ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
                ${d} tiếng
              </button>
            `;
          }).join('');
        }

        if (!state.customerCourtSlots || typeof state.customerCourtSlots !== 'object') {
          state.customerCourtSlots = {};
        }
        const activeCourtIds = Object.keys(state.customerCourtSlots)
          .filter(cId => Array.isArray(state.customerCourtSlots[cId]) && state.customerCourtSlots[cId].length > 0)
          .map(Number);
        const hasSelection = activeCourtIds.length > 0;

        let grandTotalCourtHours = 0;
        let grandTotalCourtFee = 0;
        const courtSummaries = [];

        activeCourtIds.forEach(cId => {
          const slots = state.customerCourtSlots[cId] || [];
          let courtHours = 0;
          let courtFee = 0;
          slots.forEach(sKey => {
            const parts = sKey.split('-').map(s => s.trim());
            courtHours += (timeToMinutes(parts[1]) - timeToMinutes(parts[0])) / 60;
            courtFee += calculateTimeRangeFee(parts[0], parts[1]).fee;
          });
          grandTotalCourtHours += courtHours;
          grandTotalCourtFee += courtFee;

          const isContig = slots.every((sKey, i) => {
            if (i === 0) return true;
            return slots[i - 1].split('-')[1].trim() === sKey.split('-')[0].trim();
          });
          const timeStr = isContig
            ? `${slots[0].split('-')[0].trim()} – ${slots[slots.length - 1].split('-')[1].trim()}`
            : slots.join(', ');

          const courtObj = state.courts.find(c => c.id === cId);
          courtSummaries.push({
            cId,
            courtName: courtObj ? courtObj.name : `Sân ${cId}`,
            courtZone: courtObj ? courtObj.zone : '',
            courtHours,
            hoursFormatted: courtHours.toFixed(1).replace('.0', ''),
            courtFee,
            timeStr,
            slotsCount: slots.length
          });
        });

        const rateEl = document.getElementById('cust-selected-slot-rate');
        if (rateEl) rateEl.textContent = '60.000đ - 80.000đ / giờ';
        const timeSumEl = document.getElementById('cust-time-summary-label');
        if (timeSumEl) {
          if (!hasSelection) {
            timeSumEl.textContent = 'Chưa chọn khung giờ';
          } else if (courtSummaries.length === 1) {
            timeSumEl.textContent = `${courtSummaries[0].courtName}: ${courtSummaries[0].timeStr} (${courtSummaries[0].hoursFormatted} tiếng)`;
          } else {
            timeSumEl.textContent = `Đã chọn ${courtSummaries.length} sân (${grandTotalCourtHours.toFixed(1).replace('.0', '')} tiếng)`;
          }
        }
        const feeLblEl = document.getElementById('cust-time-fee-label');
        if (feeLblEl) feeLblEl.textContent = formatVND(grandTotalCourtFee);


        // Render Alobo Court x Time Matrix (Header Xanh Da Trời & Cột Sân Xanh Bạc Hà Chuẩn Ảnh Alobo)
        document.querySelectorAll('.slot-dur-btn').forEach(btn => {
          const dur = Number(btn.getAttribute('data-slot-dur'));
          if (dur === (state.matrixSlotDuration || 30)) {
            btn.className = 'slot-dur-btn px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-slate-900 text-white shadow-xs whitespace-nowrap';
          } else {
            btn.className = 'slot-dur-btn px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 whitespace-nowrap';
          }
        });

        // Customer Day Switcher Buttons state
        document.querySelectorAll('.cust-day-btn').forEach(b => {
          const d = b.getAttribute('data-cust-day');
          if (d === (state.customerDay || 'today')) {
            b.className = 'cust-day-btn px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-600 text-white shadow-xs whitespace-nowrap';
          } else {
            b.className = 'cust-day-btn px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 whitespace-nowrap';
          }
        });
        const aloboSlots = getAloboSlots(state.matrixSlotDuration || 30);

        const matrixHeader = document.getElementById('cust-alobo-matrix-header');
        if (matrixHeader) {
          matrixHeader.innerHTML = `
            <th class="w-20 min-w-[76px] sm:w-24 sm:min-w-[90px] sticky left-0 bg-[#f1f5f9] z-20 border-r-2 border-[#cbd5e1] h-11 p-0"></th>
            ${aloboSlots.map((slot, idx) => {
              const slotStartM = timeToMinutes(slot.start);
              const isColPast = isToday && (slotStartM < currentMin);
              const isFirstSelect = isToday && (slotStartM === firstSelectableMin);
              const colBg = isColPast ? 'bg-[#b6e2f3] opacity-80' : 'bg-[#f1f5f9]';
              const labelColor = isColPast ? 'text-slate-500' : 'text-[#334155]';
              const tickClass = isColPast
                ? 'w-[2px] h-[7px] bg-slate-400 rounded-xs pointer-events-none z-30'
                : (isFirstSelect
                    ? 'w-[3px] h-[8px] bg-emerald-700 rounded-xs pointer-events-none z-30'
                    : 'w-[2px] h-[7px] bg-emerald-600 rounded-xs pointer-events-none z-30');

              return `
              <th data-slot-start="${slot.start}" class="relative border-r border-[#e2e8f0] min-w-[50px] sm:min-w-[56px] h-11 p-0 text-left ${colBg} select-none">
                <!-- Vạch khấc đặt chuẩn trên đường kẻ dọc phân cách giữa các cột -->
                <span class="absolute left-0 -translate-x-1/2 bottom-1 ${tickClass}"></span>
                <!-- Nhãn thời gian -->
                <span class="absolute left-0 -translate-x-1/2 top-1.5 text-[10px] sm:text-[11px] font-bold ${labelColor} tracking-tight leading-none whitespace-nowrap pointer-events-none z-30">${slot.start}</span>
                ${idx === aloboSlots.length - 1 ? `
                  <span class="absolute right-0 translate-x-1/2 bottom-1 w-[2px] h-[7px] bg-emerald-600 rounded-xs pointer-events-none z-30"></span>
                  <span class="absolute right-0 translate-x-1/2 top-1.5 text-[10px] sm:text-[11px] font-bold text-[#334155] tracking-tight leading-none whitespace-nowrap pointer-events-none z-30">${slot.end}</span>
                ` : ''}
              </th>
            `}).join('')}
          `;
        }

        const matrixBody = document.getElementById('cust-alobo-matrix-body');
        if (matrixBody) {
          // Bảng đặt lịch phẳng, liền mạch, không ô trong ô, không viền kép
          matrixBody.innerHTML = state.courts.map(court => {
            const courtSlots = (state.customerCourtSlots && state.customerCourtSlots[court.id]) || [];

            const slotCells = aloboSlots.map((slot) => {
              const slotStartMin = timeToMinutes(slot.start);
              const slotEndMin = timeToMinutes(slot.end);

              // 1. Khung giờ đã qua trong ngày (liền mạch, không hộp lồng hộp)
              const isPast = isToday && (slotStartMin < currentMin);
              if (isPast) {
                return `
                  <td class="h-10 sm:h-11 min-w-[50px] sm:min-w-[56px] border-r border-b border-slate-200 bg-slate-100/70 p-0 text-center select-none">
                    <div class="w-full h-full flex items-center justify-center text-slate-300 font-bold text-[10px] cursor-not-allowed select-none" title="Khung giờ đã qua (${slot.start} - ${slot.end})">
                      <span>—</span>
                    </div>
                  </td>
                `;
              }

              // 2. Khung giờ đã có khách đặt / Khóa
              const overlappingBk = state.bookings.find(b => {
                if (Number(b.courtId) !== court.id || !bookingOnDay(b)) return false;
                return conflicts(b, slotStartMin, slotEndMin);
              });
              const isMaint = court.status === 'maintenance' || (court.status === 'active' && isToday && slotStartMinSafe(court, typeof slotStartMin === 'undefined' ? startMin : slotStartMin, typeof slotEndMin === 'undefined' ? endMin : slotEndMin));
              const isBooked = Boolean(overlappingBk || isMaint);

              if (isBooked) {
                // Bảo mật tuyệt đối trên giao diện Khách: KHÔNG hiển thị tên khách khác
                const bkLabel = court.status === 'maintenance' ? 'Bảo trì' : 'Đã đặt';
                const bkTitle = court.status === 'maintenance' ? 'Sân đang bảo trì' : 'Khung giờ đã có khách đặt';

                return `
                  <td class="h-10 sm:h-11 min-w-[50px] sm:min-w-[56px] border-r border-b border-slate-200 bg-slate-100 p-0 text-center select-none">
                    <div class="w-full h-full flex items-center justify-center text-[10px] sm:text-[11px] text-slate-400 font-semibold cursor-not-allowed select-none px-1 tracking-tight" title="${bkTitle}">
                      <span class="truncate">${bkLabel}</span>
                    </div>
                  </td>
                `;
              }

              // 3. Khung giờ đang chọn (màu xanh tràn viền ô, tạo dải liền mạch khi chọn liên tiếp)
              const isSlotSelected = courtSlots.includes(slot.label);

              if (isSlotSelected) {
                return `
                  <td class="h-10 sm:h-11 min-w-[50px] sm:min-w-[56px] border-r border-b border-emerald-700 bg-emerald-600 p-0 text-center select-none">
                    <button type="button" aria-label="${court.name}: ${slot.start} - ${slot.end}" aria-pressed="${isSlotSelected}" data-matrix-slot-court="${court.id}" data-matrix-slot-start="${slot.start}" data-matrix-slot-end="${slot.end}" class="matrix-slot-btn w-full h-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center cursor-pointer select-none transition-colors">
                      <span class="text-xs font-bold">✓</span>
                    </button>
                  </td>
                `;
              }

              // 4. Khung giờ còn trống (ô phẳng sạch sẽ, tràn viền, chỉ có đường kẻ lưới phân cách)
              return `
                <td class="h-10 sm:h-11 min-w-[50px] sm:min-w-[56px] border-r border-b border-slate-200 bg-white p-0 text-center select-none">
                  <button type="button" aria-label="${court.name}: ${slot.start} - ${slot.end}" aria-pressed="${isSlotSelected}" data-matrix-slot-court="${court.id}" data-matrix-slot-start="${slot.start}" data-matrix-slot-end="${slot.end}" class="matrix-slot-btn w-full h-full bg-white hover:bg-emerald-50/80 transition-colors flex items-center justify-center cursor-pointer select-none" title="${slot.start} - ${slot.end} (${slot.isPeak ? '80k/h' : '60k/h'})"></button>
                </td>
              `;
            }).join('');

            const isGreyCourt = court.matColor === 'grey' || court.id >= 3;
              const courtMatGradient = isGreyCourt ? 'bg-slate-600' : 'bg-emerald-700';
            const courtTypeLabel = isGreyCourt ? 'Thảm xám' : 'Thảm xanh';
            const subTextColor = isGreyCourt ? 'text-slate-200' : 'text-emerald-100';

            return `
              <tr class="h-10 sm:h-11">
                <!-- Cột Sân tràn viền 100%, không lọt thỏm trong ô trắng -->
                <td class="sticky left-0 z-20 border-r-2 border-[#cbd5e1] border-b border-slate-200 text-center select-none w-20 min-w-[76px] sm:w-24 sm:min-w-[90px] h-10 sm:h-11 p-0 ${courtMatGradient} relative overflow-hidden">

                  <div class="relative z-10 flex flex-col items-center justify-center w-full h-full py-1">
                    <span class="font-black text-white text-[11px] sm:text-xs tracking-tight uppercase leading-none drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)]">${court.name}</span>
                    <span class="text-[8.5px] sm:text-[9px] font-bold ${subTextColor} leading-none mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">${courtTypeLabel}</span>
                  </div>
                </td>
                ${slotCells}
              </tr>
            `;
          }).join('');
        }

        // Update Live Selected Court & Time Summary Card (Hỗ trợ chọn 1 sân hoặc nhiều sân cùng lúc)
        const cardContainer = document.getElementById('cust-selected-summary-card');
        if (cardContainer) {
          if (!hasSelection) {
            cardContainer.innerHTML = '';
          } else if (courtSummaries.length === 1) {
            const c = courtSummaries[0];
            cardContainer.innerHTML = `
              <div class="p-3 sm:p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-300 shadow-xs flex items-center justify-between gap-2.5 transition-all">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-extrabold text-slate-900 text-sm tracking-tight">${c.courtName}</span>
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800">${c.courtZone}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-700 text-white">${c.hoursFormatted} tiếng</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mt-1">
                    <svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span class="truncate">${c.timeStr}</span>
                  </div>
                </div>
                <div class="text-right shrink-0 pl-2.5 border-l border-emerald-200 flex flex-col items-end">
                  <span class="text-[10px] text-slate-500 font-medium">Tạm tính tiền sân:</span>
                  <span class="text-base sm:text-lg font-extrabold text-emerald-700 leading-none mt-0.5">${formatVND(c.courtFee)}</span>
                  <button type="button" id="btn-cust-clear-slots" class="text-[11px] font-bold text-slate-400 hover:text-rose-600 mt-1 transition cursor-pointer">Bỏ chọn ✕</button>
                </div>
              </div>
            `;
          } else {
            // Multiple courts selected
            const totalHoursStr = grandTotalCourtHours.toFixed(1).replace('.0', '');
            cardContainer.innerHTML = `
              <div class="p-3 sm:p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-300 shadow-xs space-y-2.5 transition-all">
                <div class="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 live-dot"></span>
                    <span class="font-extrabold text-slate-900 text-xs sm:text-sm">Đang chọn ${courtSummaries.length} sân (${totalHoursStr} tiếng tổng cộng)</span>
                  </div>
                  <button type="button" id="btn-cust-clear-slots" class="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition cursor-pointer">Bỏ chọn tất cả ✕</button>
                </div>
                <div class="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
                  ${courtSummaries.map(c => `
                    <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-emerald-200/90 text-xs">
                      <div class="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-slate-900">${c.courtName}</span>
                        <span class="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-100">${c.courtZone}</span>
                        <span class="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                          <svg class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          ${c.timeStr} (${c.hoursFormatted} tiếng)
                        </span>
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        <span class="font-extrabold text-emerald-700">${formatVND(c.courtFee)}</span>
                        <button type="button" data-remove-court-selection="${c.cId}" class="w-5 h-5 rounded-full hover:bg-rose-100 text-slate-400 hover:text-rose-600 font-bold flex items-center justify-center text-xs transition" title="Bỏ sân này">✕</button>
                      </div>
                    </div>
                  `).join('')}
                </div>
                <div class="pt-2 border-t border-emerald-200/80 flex items-baseline justify-between text-xs">
                  <span class="text-slate-600 font-medium">Tổng tiền ${courtSummaries.length} sân:</span>
                  <span class="text-base sm:text-lg font-black text-emerald-700">${formatVND(grandTotalCourtFee)}</span>
                </div>
              </div>
            `;
          }
        }

        const bookTotalLabel = document.getElementById('cust-book-total-label');
        if (bookTotalLabel) {
          if (hasSelection) {
            const courtText = courtSummaries.length > 1 ? `${courtSummaries.length} sân, ` : '';
            bookTotalLabel.textContent = `Tạm tính (${courtText}${grandTotalCourtHours.toFixed(1).replace('.0', '')} tiếng):`;
          } else {
            bookTotalLabel.textContent = 'Tạm tính:';
          }
        }

        const submitBookingBtn = document.getElementById('btn-cust-submit-booking');
        if (submitBookingBtn) {
          if (courtSummaries.length > 1) {
            submitBookingBtn.textContent = `Xác Nhận Đặt ${courtSummaries.length} Sân Ngay`;
          } else {
            submitBookingBtn.textContent = 'Xác Nhận Đặt Sân Ngay';
          }
        }

        // 2. Render 4 Courts (2 Sân thảm xanh, 2 Sân thảm xám) Availability for Selected Time Range
        const courtPicker = document.getElementById('cust-court-picker');
        let freeCount = 0;
        if (courtPicker) {
          courtPicker.innerHTML = state.courts.map(court => {
            const overlappingBk = state.bookings.find(b => {
              if (Number(b.courtId) !== court.id || !bookingOnDay(b)) return false;
              return conflicts(b, startMin, endMin);
            });
            const isMaint = court.status === 'maintenance' || (court.status === 'active' && isToday && slotStartMinSafe(court, typeof slotStartMin === 'undefined' ? startMin : slotStartMin, typeof slotEndMin === 'undefined' ? endMin : slotEndMin));
            const isAvailable = !overlappingBk && !isMaint;

            if (isAvailable) freeCount++;
            // Do not auto-select court

            const isSelected = isAvailable && Number(state.customerSelectedCourtId) === court.id;
            const isGreenMat = court.matColor === 'green' || court.id <= 2;
            const matDot = isGreenMat
              ? `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>`
              : `<span class="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block"></span>`;

            if (!isAvailable) {
              return `
                <div class="p-3 rounded-xl border border-slate-200 bg-slate-100 opacity-65 text-left">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-600 flex items-center gap-1.5">${matDot}${court.name}</span>
                    <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">Đã đặt</span>
                  </div>
                  <p class="text-[11px] font-medium text-slate-500 mt-1">${court.zone}</p>
                  <p class="text-[10px] text-rose-600 mt-0.5 truncate">Kín: ${overlappingBk ? overlappingBk.slot : 'Đang bận'}</p>
                </div>
              `;
            }

            return `
              <button type="button" data-cust-pick-court="${court.id}" class="p-3 rounded-xl border text-left transition ${isSelected ? 'bg-emerald-50 border-2 border-emerald-600 ring-2 ring-emerald-500/20' : 'bg-white hover:border-emerald-500 border-slate-200'}">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">${matDot}${court.name}</span>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'}">${isSelected ? 'Đang chọn' : 'Trống'}</span>
                </div>
                <p class="text-[11px] font-semibold ${isGreenMat ? 'text-emerald-700' : 'text-slate-600'} mt-1">${court.zone}</p>
              </button>
            `;
          }).join('');
        }
        document.getElementById('cust-free-count-hint').textContent = `Còn ${freeCount}/4 sân trống`;

        // Render Quick Add-on items on the booking form (có bộ chọn số lượng +/- và nút chọn thêm)
        const defaultQuickProdIds = [];
        const allAddonProdIds = Array.from(new Set([
          ...defaultQuickProdIds,
          ...Object.keys(state.customerAddons || {}).filter(id => (state.customerAddons[id] || 0) > 0)
        ]));

        const addonsGrid = document.getElementById('cust-addons-grid');
        if (addonsGrid && allAddonProdIds.length === 0) {
          addonsGrid.replaceChildren();
        } else if (addonsGrid) {
          addonsGrid.innerHTML = allAddonProdIds.map(pId => {
            const prod = state.products.find(p => p.id === pId);
            if (!prod) return '';
            const qty = (state.customerAddons && state.customerAddons[pId]) || 0;
            const isSelected = qty > 0;
            const lineTotal = prod.price * qty;

            return `
              <div class="p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${isSelected ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/40' : 'bg-slate-50/60 hover:bg-slate-50 border-slate-200'}">
                <div class="min-w-0 flex-1">
                  <p class="font-bold text-slate-900 truncate flex items-center gap-1">
                    <span>${prod.icon || '🏸'}</span>
                    <span class="truncate">${prod.name}</span>
                  </p>
                  <p class="text-[11px] ${isSelected ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'} mt-0.5">
                    ${formatVND(prod.price)}<span class="font-normal text-slate-400">/${prod.unit}</span>
                    ${isSelected ? ` • <span class="font-extrabold">${formatVND(lineTotal)}</span>` : ''}
                  </p>
                </div>
                <div class="flex items-center gap-1.5 shrink-0 bg-white px-1.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  <button type="button" data-addon-dec="${prod.id}" class="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center transition cursor-pointer" title="Giảm">-</button>
                  <span class="w-5 text-center font-extrabold text-xs ${isSelected ? 'text-emerald-800' : 'text-slate-400'}">${qty}</span>
                  <button type="button" data-addon-inc="${prod.id}" class="w-6 h-6 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-extrabold text-xs flex items-center justify-center transition cursor-pointer" title="Tăng">+</button>
                </div>
              </div>
            `;
          }).join('');
        }

        // Calculate booking preview total (court hours + optional add-ons)
        let addonsTotal = 0;
        let addonsCount = 0;
        Object.keys(state.customerAddons || {}).forEach(pId => {
          const qty = state.customerAddons[pId] || 0;
          if (qty > 0) {
            const prod = state.products.find(p => p.id === pId);
            if (prod) {
              addonsTotal += prod.price * qty;
              addonsCount += qty;
            }
          }
        });
        const previewTotal = grandTotalCourtFee + addonsTotal;
        document.getElementById('cust-book-total-preview').textContent = formatVND(previewTotal);

        if (bookTotalLabel) {
          if (hasSelection) {
            const courtText = courtSummaries.length > 1 ? `${courtSummaries.length} sân, ` : '';
            const addonText = addonsCount > 0 ? `, +${addonsCount} phụ kiện` : '';
            bookTotalLabel.textContent = `Tạm tính (${courtText}${grandTotalCourtHours.toFixed(1).replace('.0', '')} tiếng${addonText}):`;
          } else {
            bookTotalLabel.textContent = addonsCount > 0 ? `Tạm tính (${addonsCount} phụ kiện):` : 'Tạm tính:';
          }
        }

        // Render recent bookings list for customer (Chỉ hiện đơn do chính khách này tự đặt trên thiết bị)
        const myBkList = document.getElementById('cust-my-bookings-list');
        if (myBkList) {
          const myBks = state.bookings.filter(b => b.isMine && b.status !== 'cancelled');
          const myBkBox = document.getElementById('cust-my-bookings-box');
          if (myBkBox) myBkBox.classList.toggle('hidden', myBks.length === 0);

          if (myBks.length === 0) {
            myBkList.innerHTML = '<p class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Chưa có lịch đặt trên thiết bị này.</p>';
          } else {
            myBkList.innerHTML = myBks.map(b => {
              const cObj = state.courts.find(c => c.id === Number(b.courtId));
              const cDesc = cObj ? `${cObj.name} (${cObj.zone})` : `Sân ${b.courtId}`;
              return `
                <div class="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <p class="font-bold text-slate-900">${b.customer} <span class="text-emerald-700 font-extrabold">• ${cDesc}</span></p>
                    <p class="text-[11px] text-slate-500">Khung giờ: <strong>${b.slot}</strong> • Mã: <strong>${b.id}</strong></p>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shrink-0 shadow-xs">Đã giữ sân</span>
                </div>
              `;
            }).join('');
          }
        }

        // 3. Render Customer Shop (Drinks, Overgrips, Shuttles, Rentals)
        document.querySelectorAll('.cust-cat-btn').forEach(btn => {
          const c = btn.getAttribute('data-cust-cat');
          btn.className = c === state.customerShopCat
            ? 'cust-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white whitespace-nowrap'
            : 'cust-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 whitespace-nowrap';
        });

        const shopProds = state.products.filter(p => state.customerShopCat === 'all' || p.category === state.customerShopCat);
        const shopGrid = document.getElementById('cust-shop-grid');
        if (shopGrid) {
          shopGrid.innerHTML = shopProds.map(p => {
            const inCart = state.customerCart.find(i => i.productId === p.id);
            return `
              <div class="bg-white p-3.5 rounded-2xl border ${inCart ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-slate-200'} shadow-xs flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg">${p.icon || '🏸'}</span>
                    <span class="text-xs font-extrabold text-emerald-600">${formatVND(p.price)}</span>
                  </div>
                  <p class="text-xs font-bold text-slate-900 line-clamp-2">${p.name}</p>
                  <p class="text-[10px] text-slate-400 mt-0.5">Đơn vị: ${p.unit}</p>
                </div>
                <div class="pt-3 mt-2 border-t border-slate-100">
                  ${inCart ? `
                    <div class="flex items-center justify-between bg-emerald-50 rounded-xl p-1 border border-emerald-200">
                      <button type="button" data-cust-cart-dec="${p.id}" class="w-7 h-7 rounded-lg bg-white text-slate-700 font-extrabold text-xs shadow-xs">-</button>
                      <span class="text-xs font-extrabold text-emerald-800">${inCart.qty}</span>
                      <button type="button" data-cust-cart-inc="${p.id}" class="w-7 h-7 rounded-lg bg-emerald-600 text-white font-extrabold text-xs shadow-xs">+</button>
                    </div>
                  ` : `
                    <button type="button" data-cust-add-prod="${p.id}" class="w-full py-2 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs transition">
                      + Chọn mua
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('');
        }

        // Update Customer Cart summary
        let custTotal = 0;
        let custCount = 0;
        const custCartList = document.getElementById('cust-cart-items-list');
        if (state.customerCart.length === 0) {
          custCartList.innerHTML = `<p class="py-3 text-center text-slate-400">Hãy bấm "+ Chọn mua" ở trên để thêm Nước, Quấn cán hoặc Cầu lông.</p>`;
        } else {
          custCartList.innerHTML = state.customerCart.map(item => {
            const prod = state.products.find(p => p.id === item.productId);
            if (!prod) return '';
            const line = prod.price * item.qty;
            custTotal += line;
            custCount += item.qty;
            return `
              <div class="py-2 flex items-center justify-between gap-2">
                <span class="font-semibold text-slate-800 truncate">${prod.icon} ${prod.name} (x${item.qty})</span>
                <span class="font-bold text-slate-900 shrink-0">${formatVND(line)}</span>
              </div>
            `;
          }).join('');
        }

        document.getElementById('cust-cart-summary-text').textContent = custCount > 0 ? `Đã chọn ${custCount} sản phẩm` : 'Chưa có món nào được chọn';
        document.getElementById('cust-cart-total-amount').textContent = formatVND(custTotal);
        const shopBadge = document.getElementById('cust-shop-badge');
        shopBadge.textContent = String(custCount);
        shopBadge.classList.toggle('hidden', custCount === 0);
      }



            function renderAddonModal() {
        const modalList = document.getElementById('modal-addon-products-list');
        if (!modalList) return;
        const cat = state.customerAddonCat || 'all';
        const q = (state.customerAddonSearch || '').toLowerCase().trim();

        document.querySelectorAll('.addon-cat-btn').forEach(btn => {
          const bCat = btn.getAttribute('data-addon-cat');
          btn.className = bCat === cat
            ? 'addon-cat-btn px-2.5 py-1 rounded-lg font-bold bg-slate-900 text-white whitespace-nowrap'
            : 'addon-cat-btn px-2.5 py-1 rounded-lg font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 whitespace-nowrap';
        });

        const filtered = state.products.filter(p => {
          const mCat = cat === 'all' || p.category === cat;
          const mSearch = !q || p.name.toLowerCase().includes(q);
          return mCat && mSearch;
        });

        let modalAddonsFee = 0;
        Object.keys(state.customerAddons || {}).forEach(pId => {
          const qty = state.customerAddons[pId] || 0;
          const prod = state.products.find(p => p.id === pId);
          if (prod && qty > 0) modalAddonsFee += prod.price * qty;
        });
        const totalFeeEl = document.getElementById('modal-addon-total-fee');
        if (totalFeeEl) totalFeeEl.textContent = formatVND(modalAddonsFee);

        if (filtered.length === 0) {
          modalList.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">Không tìm thấy sản phẩm phù hợp.</div>`;
          return;
        }

        modalList.innerHTML = filtered.map(p => {
          const qty = (state.customerAddons && state.customerAddons[p.id]) || 0;
          const isSel = qty > 0;
          return `
            <div class="py-2.5 px-2 flex items-center justify-between gap-2 text-xs rounded-xl transition ${isSel ? 'bg-emerald-50/70 border border-emerald-200' : 'hover:bg-slate-50'}">
              <div class="min-w-0 flex-1 flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-base shrink-0">${p.icon || '🏸'}</span>
                <div class="min-w-0">
                  <p class="font-bold text-slate-900 truncate">${p.name}</p>
                  <p class="text-[11px] text-slate-500 font-semibold">${formatVND(p.price)} / ${p.unit}</p>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs">
                <button type="button" data-addon-dec="${p.id}" class="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-extrabold text-xs flex items-center justify-center text-slate-700">-</button>
                <span class="w-5 text-center font-extrabold text-xs ${isSel ? 'text-emerald-700' : 'text-slate-400'}">${qty}</span>
                <button type="button" data-addon-inc="${p.id}" class="w-6 h-6 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-extrabold text-xs flex items-center justify-center">+</button>
              </div>
            </div>
          `;
        }).join('');
      }

function updateDynamicDateLabels() {
        const labels = {today:'Hôm nay',tomorrow:'Ngày mai',sunday:null};
        for(const day of Object.keys(labels)) {
          const date=Core.bookingDate(day),value=new Date(date+'T12:00:00+07:00');
          const label=labels[day]||new Intl.DateTimeFormat('vi-VN',{weekday:'long',timeZone:Core.timezone}).format(value);
          const formatted=date.slice(8,10)+'/'+date.slice(5,7);
          const button=document.querySelector('[data-cust-day="'+day+'"]');if(button)button.textContent=label+' ('+formatted+')';
          if((state.customerDay||'today')===day){const badge=document.getElementById('cust-club-date-badge');if(badge)badge.textContent=label+' • '+formatted+'/'+date.slice(0,4);}
        }
      }

      function scrollToFirstSelectableSlot(smooth = false) {
        const wrapper = document.getElementById('cust-matrix-scroll-wrapper');
        if (!wrapper) return;

        const isToday = (!state.customerDay || state.customerDay === 'today');
        if (!isToday) {
          wrapper.scrollTo({ left: 0, behavior: smooth ? 'smooth' : 'auto' });
          return;
        }

        const curMin = getCurrentMinutes();
        const step = state.matrixSlotDuration || 30;
        const firstMin = getFirstSelectableMin(curMin, step);
        const firstTime = minutesToTime(firstMin);

        const targetTh = document.querySelector(`[data-slot-start="${firstTime}"]`);
        const stickyTh = document.getElementById('cust-alobo-matrix-header')?.firstElementChild;
        const stickyWidth = stickyTh ? stickyTh.offsetWidth : 80;

        if (targetTh) {
          const scrollPos = Math.max(0, targetTh.offsetLeft - stickyWidth);
          wrapper.scrollTo({ left: scrollPos, behavior: smooth ? 'smooth' : 'auto' });
        }
      }

      function scrollToMatrixTime(time, smooth = true) {
        const wrapper = document.getElementById('cust-matrix-scroll-wrapper');
        if (!wrapper) return;
        const targetTh = document.querySelector(`[data-slot-start="${time}"]`);
        const stickyTh = document.getElementById('cust-alobo-matrix-header')?.firstElementChild;
        const stickyWidth = stickyTh ? stickyTh.offsetWidth : 80;
        if (targetTh) {
          const scrollPos = Math.max(0, targetTh.offsetLeft - stickyWidth);
          wrapper.scrollTo({ left: scrollPos, behavior: smooth ? 'smooth' : 'auto' });
        }
      }


      function scrollToAdminMatrixTime(time, smooth = true) {
        const wrapper = document.getElementById('admin-matrix-scroll-wrapper');
        if (!wrapper) return;
        const targetTh = wrapper.querySelector(`[data-slot-start="${time}"]`);
        const stickyTh = document.getElementById('admin-alobo-matrix-header')?.firstElementChild;
        const stickyWidth = stickyTh ? stickyTh.offsetWidth : 80;
        if (targetTh) {
          const scrollPos = Math.max(0, targetTh.offsetLeft - stickyWidth);
          wrapper.scrollTo({ left: scrollPos, behavior: smooth ? 'smooth' : 'auto' });
        }
      }

      function setupHorizontalScrollInteractions() {

        // Admin Quick Jump Buttons
        document.querySelectorAll('[data-admin-matrix-jump]').forEach(btn => {
          if (btn._hasAdminJumpSetup) return;
          btn._hasAdminJumpSetup = true;
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            const time = btn.getAttribute('data-admin-matrix-jump');
            scrollToAdminMatrixTime(time, true);
          });
        });

        // Admin Arrow Navigation Buttons
        const btnAdminLeft = document.getElementById('btn-admin-matrix-scroll-left');
        const btnAdminRight = document.getElementById('btn-admin-matrix-scroll-right');
        const adminWrapper = document.getElementById('admin-matrix-scroll-wrapper');
        if (btnAdminLeft && !btnAdminLeft._hasNavSetup && adminWrapper) {
          btnAdminLeft._hasNavSetup = true;
          btnAdminLeft.addEventListener('click', function () {
            adminWrapper.scrollBy({ left: -360, behavior: 'smooth' });
          });
        }
        if (btnAdminRight && !btnAdminRight._hasNavSetup && adminWrapper) {
          btnAdminRight._hasNavSetup = true;
          btnAdminRight.addEventListener('click', function () {
            adminWrapper.scrollBy({ left: 360, behavior: 'smooth' });
          });
        }

        const scrollWrappers = [
          document.getElementById('cust-matrix-scroll-wrapper'),
          ...document.querySelectorAll('.overflow-x-auto.custom-scrollbar')
        ].filter((el, idx, arr) => el && arr.indexOf(el) === idx);

        scrollWrappers.forEach(wrapper => {
          if (wrapper._hasHorizontalScrollSetup) return;
          wrapper._hasHorizontalScrollSetup = true;

          // 1. Mouse Wheel -> Horizontal Scroll (Chuyển lăn dọc thành lướt ngang khi ở trong bảng)
          wrapper.addEventListener('wheel', function (e) {
            // Touchpad lướt ngang chuẩn hoặc Shift + wheel thì giữ nguyên trình duyệt xử lý
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

            const isScrollingDown = e.deltaY > 0;
            const atLeft = wrapper.scrollLeft <= 2;
            const atRight = (wrapper.scrollLeft + wrapper.clientWidth) >= (wrapper.scrollWidth - 3);

            // Chống kẹt cuộn: Nếu đã chạm mép cuối (23h) hoặc mép đầu (5h), cho phép cuộn trang web dọc bình thường
            if ((!isScrollingDown && atLeft) || (isScrollingDown && atRight)) {
              return;
            }

            e.preventDefault();
            wrapper.scrollLeft += e.deltaY * 1.0;
          }, { passive: false });

          // 2. Kéo giữ chuột để lướt ngang (Click & Drag to Scroll)
          let isDown = false;
          let startX = 0;
          let scrollLeft = 0;
          let hasDragged = false;

          wrapper.style.cursor = 'grab';

          wrapper.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return; // Chỉ nhận chuột trái
            isDown = true;
            hasDragged = false;
            startX = e.pageX - wrapper.offsetLeft;
            scrollLeft = wrapper.scrollLeft;
            wrapper.style.cursor = 'grabbing';
            wrapper.style.userSelect = 'none';
          });

          window.addEventListener('mouseup', function () {
            if (isDown) {
              isDown = false;
              wrapper.style.cursor = 'grab';
              wrapper.style.removeProperty('user-select');
              if (hasDragged) {
                setTimeout(function () { hasDragged = false; }, 60);
              }
            }
          });

          wrapper.addEventListener('mousemove', function (e) {
            if (!isDown) return;
            const x = e.pageX - wrapper.offsetLeft;
            const walk = (x - startX);
            if (Math.abs(walk) > 4) {
              hasDragged = true;
              e.preventDefault();
              wrapper.scrollLeft = scrollLeft - walk;
            }
          });

          // Ngăn chặn việc bấm nhầm chọn giờ nếu đang vuốt/kéo rê chuột
          wrapper.addEventListener('click', function (e) {
            if (hasDragged) {
              e.preventDefault();
              e.stopPropagation();
              hasDragged = false;
            }
          }, true);
        });

        // 3. Xử lý các nút bấm nhảy nhanh tới khung giờ (Sáng / Trưa / Tối)
        document.querySelectorAll('[data-matrix-jump]').forEach(btn => {
          if (btn._hasJumpSetup) return;
          btn._hasJumpSetup = true;
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            const time = btn.getAttribute('data-matrix-jump');
            scrollToMatrixTime(time, true);
          });
        });

        // 4. Xử lý 2 nút mũi tên điều hướng lướt sang trái / phải
        const btnLeft = document.getElementById('btn-matrix-scroll-left');
        const btnRight = document.getElementById('btn-matrix-scroll-right');
        const custWrapper = document.getElementById('cust-matrix-scroll-wrapper');
        if (btnLeft && !btnLeft._hasNavSetup && custWrapper) {
          btnLeft._hasNavSetup = true;
          btnLeft.addEventListener('click', function () {
            custWrapper.scrollBy({ left: -360, behavior: 'smooth' });
          });
        }
        if (btnRight && !btnRight._hasNavSetup && custWrapper) {
          btnRight._hasNavSetup = true;
          btnRight.addEventListener('click', function () {
            custWrapper.scrollBy({ left: 360, behavior: 'smooth' });
          });
        }
      }


      function renderAll() {
        updateRoleViewMode();
        renderCustomerPortal();
        if (!state.isAdminLoggedIn) { clearAdminViews(); return; }
        renderKPIs();
        renderCourts();
        renderPOS();
        renderSchedule();
        renderInventory();
        renderPendingOrders();
        if (state.activeTab === 'reports') {
          renderReports();
        }
      }

      // ==================== EVENT DELEGATION & HANDLERS ====================
      document.addEventListener('click', async function (e) {
        const bookingCell = e.target.closest('[data-admin-booking-id]');
        if (bookingCell) {
          const id = bookingCell.getAttribute('data-admin-booking-id');
          const button = document.querySelector('[data-booking-checkin="' + id + '"]');
          if (button) setTimeout(() => button.click(), 0);
          else showToast('Lịch này không còn ở trạng thái chờ nhận sân.', 'warn');
          return;
        }
        const exportLegacy=e.target.closest('[data-export-legacy]');
        if(exportLegacy){
          if(!state.isAdminLoggedIn)throw new Error('Cần quyền quản trị.');
          const value=localStorage.getItem('smashcourt_legacy_backup');if(!value)throw new Error('Không có bản sao cũ.');
          const url=URL.createObjectURL(new Blob([value],{type:'application/json'}));
          const link=document.createElement('a');link.href=url;link.download='smashcourt-legacy-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
        }
        const assignDate = e.target.closest('[data-assign-date]');
        if (assignDate) {
          const booking=state.bookings.find(b=>b.id===assignDate.getAttribute('data-assign-date'));
          const date=assignDate.parentElement.querySelector('input[type=date]').value;
          if(!booking)throw new Error('Không tìm thấy lịch.');
          validateBooking(booking.courtId,booking.slot,date);
          const rs=Core.ranges(booking.slot,true);
          if(rs.length===1){booking.bookingDate=date;booking.slot=Core.time(rs[0].startMin)+' - '+Core.time(rs[0].endMin);}
          else {booking.status='cancelled';rs.forEach((r,i)=>state.bookings.push({...booking,id:Core.id('BK'),status:'reserved',bookingDate:date,slot:Core.time(r.startMin)+' - '+Core.time(r.endMin),deposit:i===0?booking.deposit:0}));}
          saveState();renderAll();return;
        }
        const recoverCourt = e.target.closest('[data-recover-court]');
        if(recoverCourt){
          const court=state.courts.find(c=>c.id===Number(recoverCourt.getAttribute('data-recover-court')));
          const value=recoverCourt.parentElement.querySelector('input[type=datetime-local]').value;
          const start=new Date(value+':00+07:00');
          if(!court||!Number.isFinite(start.getTime())||start.getTime()>Date.now()||Core.dateKey(start)!==Core.dateKey()||Core.nowMinutes(start)<300||Core.nowMinutes(start)>=1380)throw new Error('Nhập giờ vào thực tế trong hôm nay.');
          court.startedAt=start.toISOString();court.startTime=Core.time(Core.nowMinutes(start));court.sessionId=Core.id('SESSION');court.bookingId=null;
          saveState();renderAll();return;
        }
        const rejectOrder=e.target.closest('[data-reject-order]');
        if(rejectOrder){await rejectPendingOrder(rejectOrder.getAttribute('data-reject-order'));return;}
        const acceptOrder = e.target.closest('[data-accept-order]');
        if (acceptOrder) { await acceptPendingOrder(acceptOrder.getAttribute('data-accept-order')); return; }
        // Open Addon Picker Modal
        const openAddonPickerBtn = e.target.closest('#btn-open-addon-picker');
        if (openAddonPickerBtn) {
          document.getElementById('modal-cust-addon-picker').classList.remove('hidden');
          renderAddonModal();
          return;
        }

        // Addon Category filter inside Modal
        const addonCatBtn = e.target.closest('[data-addon-cat]');
        if (addonCatBtn) {
          state.customerAddonCat = addonCatBtn.getAttribute('data-addon-cat');
          renderAddonModal();
          return;
        }

        // Addon Inc / Dec (cả trên form lẫn trong modal)
        const addonInc = e.target.closest('[data-addon-inc]');
        if (addonInc) {
          const pId = addonInc.getAttribute('data-addon-inc');
          if (!state.customerAddons) state.customerAddons = {};
          state.customerAddons[pId] = (state.customerAddons[pId] || 0) + 1;
          saveState();
          renderCustomerPortal();
          renderAddonModal();
          return;
        }
        const addonDec = e.target.closest('[data-addon-dec]');
        if (addonDec) {
          const pId = addonDec.getAttribute('data-addon-dec');
          if (!state.customerAddons) state.customerAddons = {};
          const cur = state.customerAddons[pId] || 0;
          if (cur > 0) {
            state.customerAddons[pId] = cur - 1;
            if (state.customerAddons[pId] === 0) {
              delete state.customerAddons[pId];
            }
            saveState();
            renderCustomerPortal();
            renderAddonModal();
          }
          return;
        }

        // Clear customer slots selection (Tất cả hoặc từng sân)
        const clearSlotsBtn = e.target.closest('#btn-cust-clear-slots');
        if (clearSlotsBtn) {
          state.customerCourtSlots = {};
          state.customerSelectedCourtId = null;
          state.customerSelectedSlots = [];
          state.customerStartTime = '';
          state.customerEndTime = '';
          saveState();
          renderCustomerPortal();
          return;
        }

        // Bỏ chọn 1 sân riêng lẻ
        const removeCourtBtn = e.target.closest('[data-remove-court-selection]');
        if (removeCourtBtn) {
          const cId = Number(removeCourtBtn.getAttribute('data-remove-court-selection'));
          if (state.customerCourtSlots) {
            delete state.customerCourtSlots[cId];
          }
          const remaining = Object.keys(state.customerCourtSlots || {}).map(Number);
          if (remaining.length === 0) {
            state.customerSelectedCourtId = null;
            state.customerSelectedSlots = [];
            state.customerStartTime = '';
            state.customerEndTime = '';
          } else {
            state.customerSelectedCourtId = remaining[0];
            state.customerSelectedSlots = state.customerCourtSlots[remaining[0]] || [];
          }
          saveState();
          renderCustomerPortal();
          return;
        }

        // Customer Tab Switch (Book vs Shop)
        const custTabBtn = e.target.closest('[data-cust-tab]');
        if (custTabBtn) {
          state.customerTab = custTabBtn.getAttribute('data-cust-tab');
          saveState();
          renderCustomerPortal();
          return;
        }


        // Click-only Matrix Slot Toggle (Hỗ trợ chọn NHIỀU SÂN CÙNG LÚC & nhiều khung giờ liên tiếp hoặc riêng lẻ)
        const matrixBtn = e.target.closest('[data-matrix-slot-court]');
        if (matrixBtn) {
          const courtId = Number(matrixBtn.getAttribute('data-matrix-slot-court'));
          const slotStart = matrixBtn.getAttribute('data-matrix-slot-start');
          const slotEnd = matrixBtn.getAttribute('data-matrix-slot-end');
          const slotKey = `${slotStart} - ${slotEnd}`;

          // Chặn không cho chọn nếu khung giờ trong ngày đã qua
          const isToday = (!state.customerDay || state.customerDay === 'today');
          const curM = getCurrentMinutes();
          const slotStartM = timeToMinutes(slotStart);
          if (isToday && slotStartM < curM) {
            const firstM = getFirstSelectableMin(curM, state.matrixSlotDuration || 30);
            showToast(`Khung giờ ${slotStart} đã qua rồi! Vui lòng chọn từ ${minutesToTime(firstM)} trở đi.`, 'warn');
            return;
          }

          // Check if slot is booked
          const isBooked = state.bookings.some(b => {
            if (Number(b.courtId) !== courtId || !bookingOnDay(b)) return false;
            return conflicts(b, timeToMinutes(slotStart), timeToMinutes(slotEnd));
          });
          if (isBooked) {
            showToast('Khung giờ này đã có khách đặt trước!', 'warn');
            return;
          }

          if (!state.customerCourtSlots || typeof state.customerCourtSlots !== 'object') {
            state.customerCourtSlots = {};
          }
          if (!Array.isArray(state.customerCourtSlots[courtId])) {
            state.customerCourtSlots[courtId] = [];
          }

          const courtSlots = state.customerCourtSlots[courtId];
          const idx = courtSlots.indexOf(slotKey);
          if (idx >= 0) {
            // Đã chọn -> Bỏ chọn ô này
            courtSlots.splice(idx, 1);
            if (courtSlots.length === 0) {
              delete state.customerCourtSlots[courtId];
            }
          } else {
            // Chưa chọn -> Thêm vào danh sách ô của sân này
            courtSlots.push(slotKey);
            courtSlots.sort((a, b) => timeToMinutes(a.split('-')[0]) - timeToMinutes(b.split('-')[0]));
          }

          // Cập nhật legacy fields để tương thích ngược nếu có hàm nào cần
          const activeKeys = Object.keys(state.customerCourtSlots).map(Number);
          if (activeKeys.length === 0) {
            state.customerSelectedCourtId = null;
            state.customerSelectedSlots = [];
            state.customerStartTime = '';
            state.customerEndTime = '';
          } else {
            state.customerSelectedCourtId = activeKeys[0];
            state.customerSelectedSlots = state.customerCourtSlots[activeKeys[0]] || [];
            if (state.customerSelectedSlots.length > 0) {
              state.customerStartTime = state.customerSelectedSlots[0].split('-')[0].trim();
              state.customerEndTime = state.customerSelectedSlots[state.customerSelectedSlots.length - 1].split('-')[1].trim();
            }
          }

          saveState();
          renderCustomerPortal();
          return;
        }

        // Slot Duration Switcher (1 tiếng Alobo vs 30 phút)
        const slotDurBtn = e.target.closest('[data-slot-dur]');
        if (slotDurBtn) {
          const dur = Number(slotDurBtn.getAttribute('data-slot-dur')) || 60;
          state.matrixSlotDuration = dur;
          state.customerCourtSlots = {};
          state.customerSelectedSlots = [];
          state.customerSelectedCourtId = null;
          state.customerStartTime = '';
          state.customerEndTime = '';
          saveState();
          renderCustomerPortal();
          showToast(`Đã chuyển sang chế độ hiển thị: Ca ${dur === 60 ? '1 tiếng (Chuẩn Alobo)' : '30 phút'}`);
          scrollToFirstSelectableSlot(true);
          return;
        }

        // Customer Day Switch
        const custDayBtn = e.target.closest('[data-cust-day]');
        if (custDayBtn) {
          const day = custDayBtn.getAttribute('data-cust-day') || 'today';
          state.customerDay = day;

          // Cập nhật lại khung giờ chọn hợp lệ nếu cần
          const curM = getCurrentMinutes();
          const step = state.matrixSlotDuration || 30;
          const firstM = (day === 'today') ? getFirstSelectableMin(curM, step) : (5 * 60);

          // Reset các ô đã chọn khi chuyển ngày để tránh đặt nhầm ngày
          state.customerCourtSlots = {};
          state.customerSelectedSlots = [];
          state.customerSelectedCourtId = null;
          state.customerStartTime = '';
          state.customerEndTime = '';

          saveState();
          renderCustomerPortal();
          scrollToFirstSelectableSlot(true);


          return;
        }

        // Customer Quick Duration Button
        const custDurBtn = e.target.closest('[data-cust-dur]');
        if (custDurBtn) {
          const hrs = parseFloat(custDurBtn.getAttribute('data-cust-dur')) || 1.5;
          const startMin = timeToMinutes(state.customerStartTime);
          const endMin = Math.min(23 * 60, startMin + Math.round(hrs * 60));
          state.customerEndTime = minutesToTime(endMin);
          saveState();
          renderCustomerPortal();
          return;
        }

        // Customer Court Selection
        const custCourtBtn = e.target.closest('[data-cust-pick-court]');
        if (custCourtBtn) {
          state.customerSelectedCourtId = Number(custCourtBtn.getAttribute('data-cust-pick-court'));
          renderCustomerPortal();
          return;
        }

        // Customer Shop Category
        const custCatBtn = e.target.closest('[data-cust-cat]');
        if (custCatBtn) {
          state.customerShopCat = custCatBtn.getAttribute('data-cust-cat');
          renderCustomerPortal();
          return;
        }

        // Customer Add/Inc/Dec Product
        const custAddBtn = e.target.closest('[data-cust-add-prod]');
        if (custAddBtn) {
          const pId = custAddBtn.getAttribute('data-cust-add-prod');
          state.customerCart.push({ productId: pId, qty: 1 });
          saveState();
          renderCustomerPortal();
          return;
        }
        const custIncBtn = e.target.closest('[data-cust-cart-inc]');
        if (custIncBtn) {
          const pId = custIncBtn.getAttribute('data-cust-cart-inc');
          const item = state.customerCart.find(i => i.productId === pId);
          if (item) item.qty += 1;
          saveState();
          renderCustomerPortal();
          return;
        }
        const custDecBtn = e.target.closest('[data-cust-cart-dec]');
        if (custDecBtn) {
          const pId = custDecBtn.getAttribute('data-cust-cart-dec');
          const item = state.customerCart.find(i => i.productId === pId);
          if (item) {
            item.qty -= 1;
            if (item.qty <= 0) {
              state.customerCart = state.customerCart.filter(i => i.productId !== pId);
            }
          }
          saveState();
          renderCustomerPortal();
          return;
        }

        // Navigation Tabs
        const navBtn = e.target.closest('[data-nav]');
        if (navBtn) {
          switchTab(navBtn.getAttribute('data-nav'));
          return;
        }

        // Court Status Filter
        const filterBtn = e.target.closest('[data-court-filter]');
        if (filterBtn) {
          state.courtFilter = filterBtn.getAttribute('data-court-filter');
          renderCourts();
          return;
        }

        // Close Modal
        const closeBtn = e.target.closest('[data-close-modal]');
        if (closeBtn) {
          const modalId = closeBtn.getAttribute('data-close-modal');
          document.getElementById(modalId).classList.add('hidden');
          return;
        }

        // Open Court Check-in Modal
        const openCourtBtn = e.target.closest('[data-court-open]');
        if (openCourtBtn) {
          const cId = Number(openCourtBtn.getAttribute('data-court-open'));
          const court = state.courts.find(c => c.id === cId);
          document.getElementById('checkin-court-id').value = cId;
          document.getElementById('modal-checkin-title').textContent = `Mở ${court.name} (${court.zone})`;
          document.getElementById('checkin-customer-name').value = '';
          document.getElementById('checkin-quick-shuttle').checked = false;
          document.getElementById('checkin-quick-revive').checked = false;
          document.getElementById('modal-checkin').classList.remove('hidden');
          return;
        }

        // Court -> Go to POS assigned to this court
        const courtPosBtn = e.target.closest('[data-court-pos]');
        if (courtPosBtn) {
          const cId = courtPosBtn.getAttribute('data-court-pos');
          state.posTarget = String(cId);
          switchTab('pos');
          showToast(`Đã chọn ghi order Nước/Phụ kiện vào Sân ${cId}`);
          return;
        }

        // Court -> Open Checkout Modal
        const checkoutBtn = e.target.closest('[data-court-checkout]');
        if (checkoutBtn) {
          openCheckoutModal(checkoutBtn.getAttribute('data-court-checkout'));
          return;
        }

        const reservationAction = e.target.closest('[data-court-checkin-res], [data-court-cancel-res]');
        if (reservationAction) {
          const checkin = reservationAction.hasAttribute('data-court-checkin-res');
          const cId = Number(reservationAction.getAttribute(checkin ? 'data-court-checkin-res' : 'data-court-cancel-res'));
          const booking = state.bookings.find(b => b.courtId === cId && b.status === 'reserved' && b.bookingDate === Core.dateKey());
          if (!booking) throw new Error('Không có lịch hôm nay để xử lý.');
          const button = document.querySelector('[' + (checkin ? 'data-booking-checkin' : 'data-booking-cancel') + '="' + booking.id + '"]');
          if (button) { setTimeout(() => button.click(), 0); }
          return;
        }
        // Maintenance Court -> Finish Maintenance
        const maintBtn = e.target.closest('[data-court-finish-maint]');
        if (maintBtn) {
          const cId = Number(maintBtn.getAttribute('data-court-finish-maint'));
          const court = state.courts.find(c => c.id === cId);
          if (court) {
            court.status = 'free';
            court.customer = '';
            saveState();
            renderAll();
            showToast(`${court.name} đã sẵn sàng đón khách!`);
          }
          return;
        }

        // Quick add inside Checkout Modal
        const quickAddBtn = e.target.closest('[data-quick-add]');
        if (quickAddBtn && state.activeCheckoutCourtId) {
          const prodId = quickAddBtn.getAttribute('data-quick-add');
          addProductToCourt(state.activeCheckoutCourtId, prodId, 1);
          renderCheckoutModalItems();
          showToast('Đã cộng thêm vào hóa đơn sân');
          return;
        }

        // Increment / Decrement inside Checkout Modal
        const modalInc = e.target.closest('[data-modal-item-inc]');
        if (modalInc && state.activeCheckoutCourtId) {
          addProductToCourt(state.activeCheckoutCourtId, modalInc.getAttribute('data-modal-item-inc'), 1);
          renderCheckoutModalItems();
          return;
        }
        const modalDec = e.target.closest('[data-modal-item-dec]');
        if (modalDec && state.activeCheckoutCourtId) {
          addProductToCourt(state.activeCheckoutCourtId, modalDec.getAttribute('data-modal-item-dec'), -1);
          renderCheckoutModalItems();
          return;
        }

        // Checkout Payment Method toggle
        const checkoutPayBtn = e.target.closest('[data-checkout-pay]');
        if (checkoutPayBtn) {
          state.checkoutPaymentMethod = checkoutPayBtn.getAttribute('data-checkout-pay');
          document.querySelectorAll('.checkout-pay-btn').forEach(b => {
            const active = b.getAttribute('data-checkout-pay') === state.checkoutPaymentMethod;
            b.className = active
              ? 'checkout-pay-btn py-2 px-3 rounded-xl border text-xs font-semibold bg-emerald-50 border-emerald-500 text-emerald-800'
              : 'checkout-pay-btn py-2 px-3 rounded-xl border text-xs font-semibold bg-white border-slate-200 text-slate-600';
          });
          return;
        }

        // POS Category Filter
        const posCatBtn = e.target.closest('[data-pos-cat]');
        if (posCatBtn) {
          state.posCategory = posCatBtn.getAttribute('data-pos-cat');
          renderPOS();
          return;
        }

        // POS Add Item to Cart
        const addPosBtn = e.target.closest('[data-add-pos]');
        if (addPosBtn) {
          const pId = addPosBtn.getAttribute('data-add-pos');
          const existing = state.posCart.find(i => i.productId === pId);
          if (existing) {
            existing.qty += 1;
          } else {
            state.posCart.push({ productId: pId, qty: 1 });
          }
          renderKPIs();
          renderPOS();
          return;
        }

        // POS Cart Inc / Dec
        const cartInc = e.target.closest('[data-cart-inc]');
        if (cartInc) {
          const pId = cartInc.getAttribute('data-cart-inc');
          const item = state.posCart.find(i => i.productId === pId);
          if (item) item.qty += 1;
          renderKPIs();
          renderPOS();
          return;
        }
        const cartDec = e.target.closest('[data-cart-dec]');
        if (cartDec) {
          const pId = cartDec.getAttribute('data-cart-dec');
          const item = state.posCart.find(i => i.productId === pId);
          if (item) {
            item.qty -= 1;
            if (item.qty <= 0) {
              state.posCart = state.posCart.filter(i => i.productId !== pId);
            }
          }
          renderKPIs();
          renderPOS();
          return;
        }

        // POS Retail Payment Method
        const posPayBtn = e.target.closest('[data-pos-pay]');
        if (posPayBtn) {
          state.posPaymentMethod = posPayBtn.getAttribute('data-pos-pay');
          document.querySelectorAll('.pos-pay-method-btn').forEach(b => {
            const active = b.getAttribute('data-pos-pay') === state.posPaymentMethod;
            b.className = active
              ? 'pos-pay-method-btn py-2 px-3 rounded-xl border text-xs font-semibold bg-emerald-50 border-emerald-500 text-emerald-800 transition'
              : 'pos-pay-method-btn py-2 px-3 rounded-xl border text-xs font-semibold bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition';
          });
          return;
        }

        // Schedule Timeline Slot Quick Click
        const slotBtn = e.target.closest('[data-quick-slot-court]');
        if (slotBtn) {
          document.getElementById('booking-court').value = slotBtn.getAttribute('data-quick-slot-court');
          document.getElementById('booking-slot').value = slotBtn.getAttribute('data-quick-slot-time') + ' - ' + slotBtn.getAttribute('data-quick-slot-end');
          document.getElementById('booking-date').value = selectedDate();
          document.getElementById('modal-booking').classList.remove('hidden');
          return;
        }

        // Booking Table Check-in / Cancel
        const bkCheckin = e.target.closest('[data-booking-checkin]');
        if (bkCheckin) {
          const bkId = bkCheckin.getAttribute('data-booking-checkin');
          const bk = state.bookings.find(b => b.id === bkId);
          if (bk) {
            if (bk.status !== 'reserved' || bk.bookingDate !== Core.dateKey()) throw new Error('Chỉ nhận lịch còn hiệu lực trong hôm nay.');
            const occupied = state.courts.find(c => c.id === Number(bk.courtId));
            if (!occupied || occupied.status === 'active' || occupied.status === 'maintenance') throw new Error('Sân chưa sẵn sàng.');
            bk.status = 'checked_in';
            const court = state.courts.find(c => c.id === Number(bk.courtId));
            if (court) {
              const rs = bookingRanges(bk);
              if (rs.length !== 1) throw new Error('Nhận từng ca liên tiếp riêng biệt.');
              const parts = [Core.time(rs[0].startMin),Core.time(rs[0].endMin)];
              const calc = calculateTimeRangeFee(...parts);
              court.sessionId = Core.id('SESSION');
              court.bookingId = bk.id;
              court.startedAt = new Date().toISOString();
              court.status = 'active';
              court.customer = bk.customer;
              court.startTime = parts[0] || '18:00';
              court.bookedHours = calc.totalHours || 1.5;
              court.hourlyRate = Math.round(calc.fee / (calc.totalHours || 1));
              court.elapsedMinutes = 5;
              court.deposit = bk.deposit;
            }
            saveState();
            renderAll();
            showToast(`Đã check-in lịch đặt của ${bk.customer} vào Sân ${bk.courtId}`);
          }
          return;
        }
        const bkCancel = e.target.closest('[data-booking-cancel]');
        if (bkCancel) {
          const bkId = bkCancel.getAttribute('data-booking-cancel');
          const bk = state.bookings.find(b => b.id === bkId);
          if (bk) {
            if (bk.status !== 'reserved') throw new Error('Chỉ hủy lịch chưa nhận sân.');
            bk.status = 'cancelled';
            reconcileCourtReservation(Number(bk.courtId));
            saveState();
            renderAll();
            showToast(`Đã hủy lịch đặt của ${bk.customer}`, 'warn');
          }
          return;
        }

        // Restock Product
        const restockBtn = e.target.closest('[data-restock-prod]');
        if (restockBtn) {
          const pId = restockBtn.getAttribute('data-restock-prod');
          const prod = state.products.find(p => p.id === pId);
          if (prod) {
            prod.stock += 20;
            saveState();
            renderAll();
            showToast(`Đã nhập thêm 20 ${prod.unit} ${prod.name} vào kho`);
          }
          return;
        }

        // Invoice Filter
        const invFilterBtn = e.target.closest('[data-inv-filter]');
        if (invFilterBtn) {
          state.invoiceFilter = invFilterBtn.getAttribute('data-inv-filter');
          renderReports();
          return;
        }

        // View Invoice Detail
        const viewInvBtn = e.target.closest('[data-view-invoice]');
        if (viewInvBtn) {
          const invId = viewInvBtn.getAttribute('data-view-invoice');
          const inv = state.invoices.find(i => i.id === invId);
          if (inv) {
            document.getElementById('inv-detail-title').textContent = `Phiếu Thu ${inv.id} — ${inv.customer}`;
            document.getElementById('inv-detail-time').textContent = `Thời gian: ${inv.time} • Hình thức: ${inv.paymentMethod}`;
            const itemsHtml = (inv.items || []).map(it => `
              <div class="flex justify-between py-1.5 border-b border-slate-100">
                <span>${it.name} <strong class="text-slate-600">x${it.qty}</strong></span>
                <span class="font-semibold">${formatVND(it.price * it.qty)}</span>
              </div>
            `).join('');
            document.getElementById('inv-detail-body').innerHTML = `
              <div class="space-y-1">${itemsHtml}</div>
              <div class="pt-2 flex justify-between items-baseline text-sm font-extrabold text-emerald-700">
                <span>TỔNG HÓA ĐƠN:</span>
                <span>${formatVND(inv.total)}</span>
              </div>
              <p>Cọc áp dụng: ${formatVND(inv.depositApplied || 0)} • Thu thêm: ${formatVND(inv.paymentAmount ?? inv.total)} • Hoàn cọc: ${formatVND(inv.refundAmount || 0)}</p>
            `;
            document.getElementById('modal-invoice-detail').classList.remove('hidden');
          }
          return;
        }
      });

      // Customer Start/End Time Dropdown listeners
      document.getElementById('cust-start-time').addEventListener('change', function (e) {
        const newStart = e.target.value;
        const oldStartMin = timeToMinutes(state.customerStartTime);
        const oldEndMin = timeToMinutes(state.customerEndTime);
        const durationMins = Math.max(30, oldEndMin - oldStartMin);
        state.customerStartTime = newStart;
        state.customerEndTime = minutesToTime(Math.min(23 * 60, timeToMinutes(newStart) + durationMins));
        saveState();
        renderCustomerPortal();
      });

      document.getElementById('cust-end-time').addEventListener('change', function (e) {
        state.customerEndTime = e.target.value;
        saveState();
        renderCustomerPortal();
      });

      // Quick Buttons
      document.getElementById('btn-quick-pos-from-courts').addEventListener('click', function () {
        state.posTarget = 'retail';
        switchTab('pos');
      });

      document.getElementById('btn-checkout-go-pos').addEventListener('click', function () {
        if (state.activeCheckoutCourtId) {
          state.posTarget = String(state.activeCheckoutCourtId);
        }
        document.getElementById('modal-checkout').classList.add('hidden');
        switchTab('pos');
      });

      document.getElementById('btn-clear-pos-cart').addEventListener('click', function () {
        state.posCart = [];
        renderKPIs();
        renderPOS();
      });

      document.getElementById('pos-target-select').addEventListener('change', function (e) {
        state.posTarget = e.target.value;
        renderPOS();
      });

      document.getElementById('pos-search-input').addEventListener('input', function (e) {
        state.posSearch = e.target.value;
        renderPOS();
      });

      // Submit POS Order
      document.getElementById('btn-submit-pos-order').addEventListener('click', function () {
        if (state.posCart.length === 0) {
          showToast('Vui lòng chọn ít nhất 1 sản phẩm Nước / Quấn cán / Cầu!', 'warn');
          return;
        }

        if (state.posTarget === 'retail') {
          let total = 0;
          const invoiceItems = [];
          state.posCart.forEach(item => {
            const prod = state.products.find(p => p.id === item.productId);
            if (prod) {
              total += prod.price * item.qty;
              if (!Number.isInteger(item.qty) || item.qty < 1 || prod.stock < item.qty) throw new Error('Không đủ tồn kho: ' + prod.name);
              if (prod.category === 'rental') throw new Error('Ghi dịch vụ thuê vào sân để theo dõi hoàn trả.');
              prod.stock -= item.qty;
              prod.soldToday = (prod.soldToday || 0) + item.qty;
              invoiceItems.push({ productId: prod.id, category: prod.category, name: prod.name, qty: item.qty, price: prod.price });
            }
          });

          const newId = Core.id('HD');
          const nowStr = Core.time(getCurrentMinutes());
          state.invoices.push({
            id: newId,
            time: nowStr,
            createdAt: new Date().toISOString(),
            type: 'retail',
            courtName: 'Quầy POS',
            customer: 'Khách mua lẻ tại quầy',
            courtFee: 0,
            posFee: total,
            discount: 0,
            total: total,
            paymentMethod: state.posPaymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt',
            items: invoiceItems
          });

          state.posCart = [];
          saveState();
          renderAll();
          showToast(`Đã thanh toán đơn bán lẻ ${formatVND(total)} (${newId})`);
        } else {
          const court = state.courts.find(c => String(c.id) === String(state.posTarget));
          if (!court) return;
          state.posCart.forEach(item => {
            addProductToCourt(court.id, item.productId, item.qty);
          });
          state.posCart = [];
          saveState();
          renderAll();
          showToast(`Đã cộng toàn bộ Nước & Phụ kiện vào ${court.name}!`);
        }
      });

      // Check-in Court Form Submit (Rule 1: 80k peak 17h-21h, 60k other hours)
      document.getElementById('form-checkin-court').addEventListener('submit', function (e) {
        e.preventDefault();
        const cId = Number(document.getElementById('checkin-court-id').value);
        const court = state.courts.find(c => c.id === cId);
        if (!court || court.status !== 'free') throw new Error('Sân không còn trống.');

        const name = document.getElementById('checkin-customer-name').value.trim() || 'Khách vãng lai';
        const rateType = document.getElementById('checkin-customer-type').value;
        const duration = parseFloat(document.getElementById('checkin-duration').value) || 1.5;
        if (!Number.isFinite(duration) || duration <= 0 || getCurrentMinutes() < 300 || getCurrentMinutes()+duration*60 > 1380) throw new Error('Ca chơi phải nằm trong 05:00–23:00.');

        court.status = 'active';
        court.customer = name;
        court.rateType = rateType;
        court.hourlyRate = Math.round(calculateTimeRangeFee(Core.time(getCurrentMinutes()), Core.time(getCurrentMinutes() + duration * 60)).fee / duration);
        if (state.bookings.some(b => b.courtId === cId && b.bookingDate === Core.dateKey() && ['reserved','checked_in'].includes(b.status) && bookingRanges(b).some(r => Core.overlap(r,{startMin:getCurrentMinutes(),endMin:Math.min(1380,getCurrentMinutes()+duration*60)})))) throw new Error('Ca này trùng lịch đã đặt.');
        court.bookedHours = duration;
        court.startTime = Core.time(getCurrentMinutes());
        court.startedAt = new Date().toISOString();
        court.sessionId = Core.id('SESSION');
        court.bookingId = null;
        court.elapsedMinutes = 0;
        court.deposit = 0;
        court.items = [];

        if (document.getElementById('checkin-quick-shuttle').checked) {
          addProductToCourt(court.id, 'p9', 1);
        }
        if (document.getElementById('checkin-quick-revive').checked) {
          addProductToCourt(court.id, 'p1', 4);
        }

        document.getElementById('modal-checkin').classList.add('hidden');
        saveState();
        renderAll();
        showToast(`Đã mở ${court.name} (${court.zone}) cho ${name}`);
      });

      // Checkout Modal inputs live update
      document.getElementById('checkout-hours-input').addEventListener('input', renderCheckoutModalItems);
      document.getElementById('checkout-discount-input').addEventListener('input', renderCheckoutModalItems);

      // Confirm Court Checkout
      document.getElementById('btn-confirm-court-checkout').addEventListener('click', function () {
        const court = state.courts.find(c => c.id === Number(state.activeCheckoutCourtId));
        if (!court) return;

        const hours = Number(document.getElementById('checkout-hours-input').value);
        if (!Number.isFinite(hours) || hours <= 0 || hours > 18) throw new Error('Thời lượng không hợp lệ.');
        const discount = Core.amount(document.getElementById('checkout-discount-input').value || 0, 'Giảm giá');
        const courtFee = checkoutFee(court, hours);
        const posFee = getCourtPosTotal(court);
        const totals = Core.checkoutTotals(courtFee,posFee,discount,court.deposit || 0);
        const grandTotal=totals.paymentAmount;

        const invoiceItems = [
          { name: `Tiền thuê ${court.name} - ${court.zone} (${hours} giờ)`, qty: 1, price: courtFee }
        ];
        (court.items || []).forEach(it => {
          invoiceItems.push({ productId: it.productId, category: it.category || state.products.find(p=>p.id===it.productId)?.category, name: it.name, qty: it.qty, price: it.price });
        });

        const newId = Core.id('HD');
        const nowStr = Core.time(getCurrentMinutes());

        state.invoices.push({
          id: newId,
          time: nowStr,
            createdAt: new Date().toISOString(),
          type: 'court',
          courtName: court.name,
          customer: court.customer,
          courtFee: courtFee,
          posFee: posFee,
          discount: discount,
          total: totals.total,
          paymentAmount: grandTotal,
          depositApplied: totals.depositApplied,
          refundAmount: totals.refundAmount,
          sessionId: court.sessionId,
          paymentMethod: state.checkoutPaymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt',
          items: invoiceItems
        });

        if (court.status !== 'active' || !court.sessionId) throw new Error('Phiên sân đã kết thúc hoặc chưa được nhận.');
        if (court.bookingId) { const bk = state.bookings.find(b => b.id === court.bookingId); if (bk) bk.status = 'completed'; }
        for (const item of court.items) { const p = state.products.find(p => p.id === item.productId); if (p?.category === 'rental') p.stock += item.qty; }
        court.status = 'free';
        court.customer = '';
        court.startedAt = null; court.sessionId = null; court.bookingId = null;
        court.items = [];
        court.elapsedMinutes = 0;
        court.deposit = 0;
        reconcileCourtReservation(court.id);

        document.getElementById('modal-checkout').classList.add('hidden');
        saveState();
        renderAll();
        showToast(`Đã thu ${formatVND(grandTotal)}${totals.refundAmount ? ", hoàn cọc " + formatVND(totals.refundAmount) : ""} và đóng ${court.name} thành công!`);
      });

      // Open New Booking Modal
      document.getElementById('btn-open-new-booking').addEventListener('click', function () {
        document.getElementById('booking-date').value = selectedDate();
        document.getElementById('modal-booking').classList.remove('hidden');
      });

      document.getElementById('form-new-booking').addEventListener('submit', function (e) {
        e.preventDefault();
        const customer = document.getElementById('booking-customer').value.trim();
        const phone = document.getElementById('booking-phone').value.trim();
        const courtId = Number(document.getElementById('booking-court').value);
        const slot = document.getElementById('booking-slot').value.trim();
        const type = document.getElementById('booking-type').value;
        const deposit = Core.amount(document.getElementById('booking-deposit').value || 0, 'Cọc đã nhận');

        const bookingDate = document.getElementById('booking-date').value;
        validateBooking(courtId, slot, bookingDate);
        state.bookings.unshift({
          bookingDate,
          id: Core.id('BK'),
          customer,
          phone,
          courtId,
          slot,
          type,
          deposit,
          status: 'reserved'
        });

        reconcileCourtReservation(courtId);
        document.getElementById('modal-booking').classList.add('hidden');
        document.getElementById('form-new-booking').reset();
        saveState();
        renderAll();
        showToast(`Đã tạo lịch đặt Sân ${courtId} (${slot}) cho ${customer}`);
      });

      // Open New Product Modal
      document.getElementById('btn-open-new-product').addEventListener('click', function () {
        document.getElementById('modal-product').classList.remove('hidden');
      });

      document.getElementById('form-new-product').addEventListener('submit', function (e) {
        e.preventDefault();
        const name = document.getElementById('prod-name').value.trim();
        const category = document.getElementById('prod-category').value;
        const unit = document.getElementById('prod-unit').value.trim();
        const cost = Core.amount(document.getElementById('prod-cost').value || 0, 'Giá vốn');
        const price = Core.amount(document.getElementById('prod-price').value || 0, 'Giá bán');
        const stock = Core.amount(document.getElementById('prod-stock').value || 0, 'Tồn kho');

        const iconMap = { drink: '🥤', grip: '🎾', shuttle: '🏸', rental: '👟' };
        state.products.push({
          id: Core.id('p'),
          name,
          category,
          unit,
          cost,
          price,
          stock,
          soldToday: 0,
          icon: iconMap[category] || '🏸'
        });

        document.getElementById('modal-product').classList.add('hidden');
        document.getElementById('form-new-product').reset();
        saveState();
        renderAll();
        showToast(`Đã thêm "${name}" vào danh mục POS & Kho!`);
      });

      // Reset Demo Data removed


      document.getElementById('admin-schedule-date').addEventListener('change',function(e){
        if(!/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))return;
        state.adminScheduleDate=e.target.value;renderAll();
      });

      // Toggle KPI Shortcut Strip
      document.getElementById('btn-toggle-kpi-strip').addEventListener('click', function () {
        state.kpiCollapsed = !state.kpiCollapsed;
        saveState();
        renderKPIs();
      });

      // Admin Login Modal & Role Controls
      document.getElementById('btn-open-admin-login').addEventListener('click', function () {
        document.getElementById('admin-login-error').classList.add('hidden');
        document.getElementById('modal-admin-login').classList.remove('hidden');
      });

      document.getElementById('form-admin-login').addEventListener('submit', async function (e) {
        e.preventDefault();
        await loginAdmin(document.getElementById('admin-username-input').value.trim(), document.getElementById('admin-password-input').value);
      });
      document.getElementById('btn-toggle-customer-preview')?.addEventListener('click', function () {
        if (!state.isAdminLoggedIn) return;
        state.viewMode = state.viewMode === 'admin' ? 'customer' : 'admin'; renderAll();
      });
      document.getElementById('btn-admin-logout')?.addEventListener('click', async function () { await logoutAdmin(); });

      // Customer Booking Addon Search Input live update
      const addonSearchEl = document.getElementById('cust-addon-search-input');
      if (addonSearchEl) {
        addonSearchEl.addEventListener('input', function (e) {
          state.customerAddonSearch = e.target.value;
          renderAddonModal();
        });
      }

      document.getElementById('form-customer-booking').addEventListener('submit', async function (e) {
        e.preventDefault();
        await submitCustomerBooking();
      });

      // Nút làm trống giỏ hàng nhanh cho Khách
      const btnClearCustCart = document.getElementById('btn-clear-cust-cart');
      if (btnClearCustCart) {
        btnClearCustCart.addEventListener('click', function () {
          state.customerCart = [];
          saveState();
          renderCustomerPortal();
          showToast('Đã làm trống giỏ hàng!');
        });
      }

      document.getElementById('btn-cust-submit-order').addEventListener('click', async function () {
        await submitCustomerOrder();
      });


      /* CLOUD_MODULE */
    })();
