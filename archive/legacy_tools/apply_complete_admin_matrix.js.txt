const fs = require('fs');
const path = require('path');

console.log('=== APPLYING COMPLETE ALOBO MATRIX TO ADMIN SCHEDULE ===');

const newAdminMatrixHTML = `<!-- Visual Alobo-Style 30-min Admin Court Timeline Grid -->
      <div class="bg-white p-3.5 sm:p-5 rounded-2xl shadow-xs border border-slate-200/90 space-y-3 sm:space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5 sm:pb-3">
          <div>
            <h3 class="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span>📅 Ma Trận Lịch Đặt Sân Toàn Hệ Thống (05:00 - 23:00)</span>
              <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">Hiển thị trực tiếp Tên Khách</span>
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">Nhìn trực tiếp biết ai đặt khung giờ nào • Bấm vào ô trống để đặt nhanh • Bấm vào ô đã đặt để xem / nhận sân</p>
          </div>
          <div class="flex items-center gap-3 sm:gap-4 flex-wrap text-[11px] sm:text-xs">
            <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-emerald-600"></span> Đang đánh</span>
            <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-amber-400 border border-amber-500"></span> Đã đặt trước</span>
            <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-white border border-slate-300"></span> Còn trống (Bấm để đặt)</span>
            <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300 text-rose-700 text-[10px] text-center font-bold">🔒</span> Bảo trì</span>
          </div>
        </div>

        <!-- Scrollable Matrix Table -->
        <div id="admin-matrix-scroll-wrapper" class="isolate overflow-x-auto custom-scrollbar rounded-xl border border-[#c4ded7] shadow-xs relative bg-white">
          <table class="w-full text-left border-collapse min-w-[2160px]">
            <thead class="bg-[#c0ebfb] text-[#0e362e] border-b border-[#cadfe8]">
              <tr id="admin-alobo-matrix-header" class="bg-[#c0ebfb] text-[#0e362e] h-11">
                <th class="w-20 min-w-[76px] sm:w-24 sm:min-w-[90px] sticky left-0 bg-[#c0ebfb] z-20 border-r-2 border-[#a3cdc2] h-11 p-0 text-center font-black text-xs text-[#0e362e] uppercase tracking-wider">SÂN</th>
              </tr>
            </thead>
            <tbody id="admin-alobo-matrix-body" class="text-xs bg-white"></tbody>
          </table>
        </div>

        <!-- Fast Time Jump Bar & Scroll Navigation for Admin -->
        <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap text-xs">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[11px] font-bold text-slate-500">⚡ Xem nhanh:</span>
            <button type="button" data-admin-matrix-jump="05:00" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer">🌅 Sáng (5h)</button>
            <button type="button" data-admin-matrix-jump="12:00" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer">☀️ Trưa (12h)</button>
            <button type="button" data-admin-matrix-jump="17:00" class="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer">🌙 Tối vàng (17h)</button>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-slate-400 hidden sm:inline">🖱️ Lăn chuột / kéo rê để lướt</span>
            <div class="flex items-center gap-1">
              <button type="button" id="btn-admin-matrix-scroll-left" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs transition shadow-xs cursor-pointer" title="Lướt sang trái">◀</button>
              <button type="button" id="btn-admin-matrix-scroll-right" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs transition shadow-xs cursor-pointer" title="Lướt sang phải">▶</button>
            </div>
          </div>
        </div>
      </div>`;

// 1. UPDATE app_logic.js
const appLogicPath = path.join(__dirname, 'app_logic.js');
let logic = fs.readFileSync(appLogicPath, 'utf8');

const newRenderSchedule = `      function renderSchedule() {
        const aloboSlots = getAloboSlots(30);
        const isToday = (!state.customerDay || state.customerDay === 'today');
        const currentMin = getCurrentMinutes();
        const firstSelectableMin = getFirstSelectableMin(currentMin, 30);

        // 1. Render Admin Alobo Matrix Header (05:00 - 23:00)
        const adminHeader = document.getElementById('admin-alobo-matrix-header');
        if (adminHeader) {
          adminHeader.innerHTML = \`
            <th class="w-20 min-w-[76px] sm:w-24 sm:min-w-[90px] sticky left-0 bg-[#c0ebfb] z-20 border-r-2 border-[#a3cdc2] h-11 p-0 text-center font-black text-xs text-[#0e362e] uppercase tracking-wider">SÂN</th>
            \${aloboSlots.map((slot, idx) => {
              const slotStartM = timeToMinutes(slot.start);
              const isColPast = isToday && (slotStartM < currentMin);
              const isFirstSelect = isToday && (slotStartM === firstSelectableMin);
              const colBg = isColPast ? 'bg-[#b6e2f3] opacity-80' : 'bg-[#c0ebfb]';
              const labelColor = isColPast ? 'text-slate-500' : 'text-[#0e362e]';
              const tickClass = isColPast
                ? 'w-[2px] h-[7px] bg-slate-400 rounded-xs pointer-events-none z-30'
                : (isFirstSelect
                    ? 'w-[3px] h-[8px] bg-emerald-700 rounded-xs pointer-events-none z-30'
                    : 'w-[2px] h-[7px] bg-emerald-600 rounded-xs pointer-events-none z-30');

              return \`
              <th data-slot-start="\${slot.start}" class="relative border-r border-[#cadfe8] min-w-[56px] sm:min-w-[64px] h-11 p-0 text-left \${colBg} select-none">
                <span class="absolute left-0 -translate-x-1/2 bottom-1 \${tickClass}"></span>
                <span class="absolute left-0 -translate-x-1/2 top-1.5 text-[10px] sm:text-[11px] font-bold \${labelColor} tracking-tight leading-none whitespace-nowrap pointer-events-none z-30">\${slot.start}</span>
                \${idx === aloboSlots.length - 1 ? \`
                  <span class="absolute right-0 translate-x-1/2 bottom-1 w-[2px] h-[7px] bg-emerald-600 rounded-xs pointer-events-none z-30"></span>
                  <span class="absolute right-0 translate-x-1/2 top-1.5 text-[10px] sm:text-[11px] font-bold text-[#0e362e] tracking-tight leading-none whitespace-nowrap pointer-events-none z-30">\${slot.end}</span>
                \` : ''}
              </th>
            \`;}).join('')}
          \`;
        }

        // 2. Render Admin Alobo Matrix Body (HIỂN THỊ RÕ RÀNG TÊN KHÁCH & TRẠNG THÁI)
        const adminBody = document.getElementById('admin-alobo-matrix-body');
        if (adminBody) {
          adminBody.innerHTML = state.courts.map(court => {
            const slotCells = aloboSlots.map(slot => {
              const slotStartMin = timeToMinutes(slot.start);
              const slotEndMin = timeToMinutes(slot.end);

              // Tìm đơn đặt bao phủ khung giờ này
              const booking = state.bookings.find(b => {
                if (Number(b.courtId) !== court.id || b.status === 'cancelled') return false;
                const r = parseSlotRange(b.slot);
                return isTimeOverlapping(slotStartMin, slotEndMin, r.startMin, r.endMin);
              });

              // Sân đang có khách đánh (active)
              const isCourtActive = court.status === 'active' && isToday && (slotStartMin <= currentMin && slotEndMin >= currentMin);

              if (booking) {
                // Admin nhìn vào là thấy NGAY AI ĐẶT!
                let bgStyle = 'bg-amber-100 hover:bg-amber-200 border-r border-amber-300 text-amber-950 font-bold';
                let tagText = booking.deposit ? formatVND(booking.deposit) : 'Đã đặt';
                if (booking.status === 'checked_in' || isCourtActive) {
                  bgStyle = 'bg-emerald-600 hover:bg-emerald-700 border-r border-emerald-500 text-white font-bold';
                  tagText = 'Đang đánh';
                } else if (booking.status === 'completed') {
                  bgStyle = 'bg-slate-200 hover:bg-slate-300 text-slate-700';
                  tagText = 'Đã xong';
                }

                return \`
                  <td class="h-11 sm:h-12 min-w-[56px] sm:min-w-[64px] border-r border-b border-slate-200 p-0 text-center select-none \${bgStyle}">
                    <button type="button" data-admin-booking-id="\${booking.id}" class="w-full h-full p-0.5 flex flex-col items-center justify-center leading-tight cursor-pointer overflow-hidden transition-opacity hover:opacity-90" title="Khách: \${booking.customer} • SĐT: \${booking.phone || 'Chưa có'} • \${booking.slot} • Cọc: \${formatVND(booking.deposit)} • Bấm để xem / nhận sân">
                      <span class="font-black text-[11px] truncate w-full px-0.5 text-center leading-tight">\${booking.customer}</span>
                      <span class="text-[9px] font-semibold opacity-90 truncate w-full px-0.5 text-center leading-none mt-0.5">\${booking.phone ? booking.phone.slice(-4) : tagText}</span>
                    </button>
                  </td>
                \`;
              }

              if (court.status === 'maintenance') {
                return \`
                  <td class="h-11 sm:h-12 min-w-[56px] sm:min-w-[64px] border-r border-b border-slate-200 bg-rose-50 p-0 text-center select-none text-rose-700 font-bold text-[10px]">
                    <div class="w-full h-full flex items-center justify-center">Bảo trì</div>
                  </td>
                \`;
              }

              // Khung giờ còn trống -> Admin bấm vào để ĐẶT LỊCH NHANH cho khách!
              const isPast = isToday && (slotStartMin < currentMin);
              const cellBg = isPast ? 'bg-slate-50/70 hover:bg-emerald-50/70' : 'bg-white hover:bg-emerald-50/80';
              const plusColor = isPast ? 'text-slate-300' : 'text-slate-400 group-hover:text-emerald-600';

              return \`
                <td class="h-11 sm:h-12 min-w-[56px] sm:min-w-[64px] border-r border-b border-slate-200 \${cellBg} p-0 text-center select-none transition-colors group">
                  <button type="button" data-admin-quick-slot-court="\${court.id}" data-admin-quick-slot-start="\${slot.start}" data-admin-quick-slot-end="\${slot.end}" class="w-full h-full flex items-center justify-center cursor-pointer" title="\${slot.start} - \${slot.end} (\${court.name} còn trống • Bấm để đặt)">
                    <span class="\${plusColor} text-[11px] font-bold transition-all transform group-hover:scale-125">+</span>
                  </button>
                </td>
              \`;
            }).join('');

            const isGreyCourt = court.matColor === 'grey' || court.id >= 3;
            const courtMatGradient = isGreyCourt
              ? 'bg-gradient-to-br from-[#475569] via-[#3b4754] to-[#2d3748]'
              : 'bg-gradient-to-br from-[#059669] via-[#047857] to-[#065f46]';
            const courtTypeLabel = isGreyCourt ? 'Thảm xám' : 'Thảm xanh';
            const subTextColor = isGreyCourt ? 'text-slate-200' : 'text-emerald-100';

            return \`
              <tr class="h-11 sm:h-12">
                <td class="sticky left-0 z-20 border-r-2 border-[#a3cdc2] border-b border-slate-200 text-center select-none w-20 min-w-[76px] sm:w-24 sm:min-w-[90px] h-11 sm:h-12 p-0 \${courtMatGradient} relative overflow-hidden">
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
                    <span class="font-black text-white text-[11px] sm:text-xs tracking-tight uppercase leading-none drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)]">\${court.name}</span>
                    <span class="text-[8.5px] sm:text-[9px] font-bold \${subTextColor} leading-none mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">\${courtTypeLabel}</span>
                  </div>
                </td>
                \${slotCells}
              </tr>
            \`;
          }).join('');
        }

        // 3. Render Bookings List Table
        const bookingsBody = document.getElementById('bookings-table-body');
        const countLabel = document.getElementById('booking-count-label');
        if (countLabel) countLabel.textContent = \`\${state.bookings.length} lịch đặt\`;
        if (bookingsBody) {
          bookingsBody.innerHTML = state.bookings.map(b => {
            const court = state.courts.find(c => c.id === Number(b.courtId));
            const courtName = court ? \`\${court.name} (\${court.zone})\` : \`Sân \${b.courtId}\`;

            return \`
              <tr class="hover:bg-slate-50/80">
                <td class="py-3 px-4 font-bold text-slate-900">\${b.customer}</td>
                <td class="py-3 px-4 text-slate-600">\${b.phone || '—'}</td>
                <td class="py-3 px-4 font-semibold text-emerald-700">\${courtName}</td>
                <td class="py-3 px-4 font-bold text-slate-800">\${b.slot}</td>
                <td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[11px] bg-slate-100 font-medium">\${b.type === 'fixed' ? 'Khách cố định' : 'Vãng lai'}</span></td>
                <td class="py-3 px-4 text-right font-bold text-emerald-600">\${formatVND(b.deposit)}</td>
                <td class="py-3 px-4">
                  <span class="px-2 py-0.5 rounded text-[11px] font-bold \${b.status === 'checked_in' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                    \${b.status === 'checked_in' ? 'Đang đánh' : 'Đã cọc'}
                  </span>
                </td>
                <td class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    \${b.status !== 'checked_in' ? \`
                      <button type="button" data-checkin-booking="\${b.id}" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs cursor-pointer">
                        Nhận Sân
                      </button>
                    \` : ''}
                    <button type="button" data-cancel-booking="\${b.id}" class="px-2 py-1 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 font-semibold text-[11px] cursor-pointer">
                      Hủy
                    </button>
                  </div>
                </td>
              </tr>
            \`;
          }).join('');
        }
      }`;

// Replace renderSchedule in app_logic.js
const oldScheduleStart = 'function renderSchedule() {';
const oldScheduleEnd = 'function renderInventory() {';
const sIdx = logic.indexOf(oldScheduleStart);
const eIdx = logic.indexOf(oldScheduleEnd);

if (sIdx !== -1 && eIdx !== -1) {
  logic = logic.slice(0, sIdx) + newRenderSchedule + '\n\n      ' + logic.slice(eIdx);
  console.log('✓ renderSchedule() updated in app_logic.js');
}

// Ensure click handlers are properly hooked
if (!logic.includes('data-admin-quick-slot-court')) {
  const handlerBlock = `
      // Khi Admin bấm vào ô trống trên ma trận 30 phút -> Mở modal đặt nhanh
      document.addEventListener('click', function (e) {
        const quickSlotBtn = e.target.closest('[data-admin-quick-slot-court]');
        if (quickSlotBtn) {
          const courtId = quickSlotBtn.getAttribute('data-admin-quick-slot-court');
          const start = quickSlotBtn.getAttribute('data-admin-quick-slot-start');
          const end = quickSlotBtn.getAttribute('data-admin-quick-slot-end');
          
          const courtSel = document.getElementById('booking-court');
          if (courtSel) courtSel.value = courtId;
          const slotInput = document.getElementById('booking-slot');
          if (slotInput) {
            const endHour = minutesToTime(Math.min(23 * 60, timeToMinutes(start) + 60));
            slotInput.value = \`\${start} - \${endHour}\`;
          }
          
          const modal = document.getElementById('modal-booking');
          if (modal) modal.classList.remove('hidden');
          return;
        }

        // Khi Admin bấm vào ô đã có khách đặt -> Xem chi tiết khách hàng và nhận sân/hủy
        const bookingCellBtn = e.target.closest('[data-admin-booking-id]');
        if (bookingCellBtn) {
          const bookingId = bookingCellBtn.getAttribute('data-admin-booking-id');
          const booking = state.bookings.find(b => b.id === bookingId);
          if (booking) {
            const court = state.courts.find(c => c.id === Number(booking.courtId));
            const courtName = court ? court.name : \`Sân \${booking.courtId}\`;
            const confirmAction = confirm(
              \`📋 THÔNG TIN ĐẶT SÂN:\\n\` +
              \`• Khách hàng: \${booking.customer}\\n\` +
              \`• Số điện thoại: \${booking.phone || 'Chưa có'}\\n\` +
              \`• Sân: \${courtName}\\n\` +
              \`• Ca đặt: \${booking.slot}\\n\` +
              \`• Tiền cọc: \${formatVND(booking.deposit)}\\n\` +
              \`• Trạng thái: \${booking.status === 'checked_in' ? 'Đang đánh' : 'Đã cọc'}\\n\\n\` +
              (booking.status !== 'checked_in' ? 'Bấm OK để NHẬN SÂN (bắt đầu đánh), hoặc Cancel để đóng.' : 'Sân này đang trong ca đánh.')
            );
            if (confirmAction && booking.status !== 'checked_in') {
              booking.status = 'checked_in';
              if (court) court.status = 'active';
              syncStateToSupabase();
              renderAll();
            }
          }
          return;
        }
      });
  `;
  const insertPos = logic.indexOf('document.addEventListener(\'DOMContentLoaded\'');
  if (insertPos !== -1) {
    logic = logic.slice(0, insertPos) + handlerBlock + '\n      ' + logic.slice(insertPos);
  }
}

// Write updated app_logic.js
fs.writeFileSync(appLogicPath, logic, 'utf8');
console.log('✓ app_logic.js saved');

// 2. UPDATE BUILDERS
function patchBuilder(builderFilePath) {
  let content = fs.readFileSync(builderFilePath, 'utf8');

  // Replace const adminHTML = orig.slice(adminStart, modalActualStart);
  // with let adminHTML and the timeline replacement!
  const targetPattern1 = 'const adminHTML = orig.slice(adminStart, modalActualStart);';
  const targetPattern2 = 'let adminHTML = orig.slice(adminStart, modalActualStart);';

  const replacement = `let adminHTML = orig.slice(adminStart, modalActualStart);

// Cleanly replace old 6-column 2-hour timeline with Alobo 30-min matrix
const oldTimelineStart = adminHTML.indexOf('<!-- Visual Court Timeline Grid -->');
const oldTimelineEnd = adminHTML.indexOf('<!-- Bookings List Table -->');
if (oldTimelineStart !== -1 && oldTimelineEnd !== -1) {
  const newAdminTimelineGrid = \`${newAdminMatrixHTML}\`;
  adminHTML = adminHTML.slice(0, oldTimelineStart) + newAdminTimelineGrid + '\\n\\n      ' + adminHTML.slice(oldTimelineEnd);
}
// Clean hardcoded date in heading
adminHTML = adminHTML.replace('Lịch Đặt Sân Trong Ngày (Thứ Sáu, 16/10/2026)', 'Lịch Đặt Sân Toàn Hệ Thống');
`;

  if (content.includes(targetPattern1)) {
    content = content.replace(targetPattern1, replacement);
    fs.writeFileSync(builderFilePath, content, 'utf8');
    console.log(`✓ Patched ${path.basename(builderFilePath)}`);
  } else if (content.includes(targetPattern2)) {
    // If it already has let, replace until before function build
    const pStart = content.indexOf(targetPattern2);
    const pEnd = content.indexOf('function build', pStart);
    content = content.slice(0, pStart) + replacement + '\n' + content.slice(pEnd);
    fs.writeFileSync(builderFilePath, content, 'utf8');
    console.log(`✓ Re-patched ${path.basename(builderFilePath)}`);
  } else {
    console.log(`⚠ Target pattern not found in ${path.basename(builderFilePath)}`);
  }
}

patchBuilder(path.join(__dirname, 'build_pc.js'));
patchBuilder(path.join(__dirname, 'build_index.js'));
patchBuilder(path.join(__dirname, 'build_mobile.js'));

console.log('=== BUILDERS PATCHED SUCCESSFULLY ===');
