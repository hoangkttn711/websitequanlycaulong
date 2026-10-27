const fs = require('fs');

let js = fs.readFileSync('c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js', 'utf8');

// 1. Add myDeviceBookingIds to initialState
const targetState = "viewMode: 'customer', // 'customer' or 'admin'";
const replaceState = "viewMode: 'customer', // 'customer' or 'admin'\n          myDeviceBookingIds: [],";
if (!js.includes('myDeviceBookingIds: []')) {
  js = js.replace(targetState, replaceState);
}

// 2. Fix Matrix Booked Slot to NEVER show customer name on Customer Portal
const oldMatrixBooked = `              if (isBooked) {
                let bkLabel = 'Đã đặt';
                let bkTitle = 'Đã có khách đặt';
                if (state.isAdminLoggedIn) {
                  bkLabel = overlappingBk ? overlappingBk.customer : (isMaint ? 'Bảo trì' : 'Đã đặt');
                  bkTitle = bkLabel;
                } else if (isMaint) {
                  bkLabel = 'Bảo trì';
                  bkTitle = 'Sân đang bảo trì';
                }

                return \`
                  <td class="h-10 sm:h-11 min-w-[50px] sm:min-w-[56px] border-r border-b border-slate-200 bg-slate-100 p-0 text-center select-none">
                    <div class="w-full h-full flex items-center justify-center text-[10px] sm:text-[11px] text-slate-400 font-semibold cursor-not-allowed select-none px-1 tracking-tight" title="\${bkTitle}">
                      <span class="truncate">\${state.isAdminLoggedIn ? bkLabel : '🔒 Khóa'}</span>
                    </div>
                  </td>
                \`;
              }`;

const newMatrixBooked = `              if (isBooked) {
                // Bảo mật tuyệt đối trên giao diện Khách: KHÔNG hiển thị tên khách khác
                const bkLabel = isMaint ? 'Bảo trì' : '🔒 Đã đặt';
                const bkTitle = isMaint ? 'Sân đang bảo trì' : 'Khung giờ đã có khách đặt';

                return \`
                  <td class="h-10 sm:h-11 min-w-[50px] sm:min-w-[56px] border-r border-b border-slate-200 bg-slate-100 p-0 text-center select-none">
                    <div class="w-full h-full flex items-center justify-center text-[10px] sm:text-[11px] text-slate-400 font-semibold cursor-not-allowed select-none px-1 tracking-tight" title="\${bkTitle}">
                      <span class="truncate">\${bkLabel}</span>
                    </div>
                  </td>
                \`;
              }`;

if (js.includes(oldMatrixBooked)) {
  js = js.replace(oldMatrixBooked, newMatrixBooked);
  console.log('Matrix booked slot privacy fixed!');
} else {
  console.warn('oldMatrixBooked pattern not found directly, checking partial');
}

// 3. Fix Customer My Bookings List
const oldMyBk = `        // Render recent bookings list for customer
        const myBkList = document.getElementById('cust-my-bookings-list');
        if (myBkList) {
          const activeBks = state.bookings.filter(b => b.status !== 'cancelled').slice(0, 4);
          myBkList.innerHTML = activeBks.map(b => {
            const cObj = state.courts.find(c => c.id === Number(b.courtId));
            const cDesc = cObj ? \`\${cObj.name} (\${cObj.zone})\` : \`Sân \${b.courtId}\`;
            const clientLabel = state.isAdminLoggedIn ? b.customer : 'Khách đặt sân';
            return \`
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                <div>
                  <p class="font-bold text-slate-900">\${clientLabel} <span class="text-emerald-700 font-extrabold">• \${cDesc}</span></p>
                  <p class="text-[11px] text-slate-500">Khung giờ: <strong>\${b.slot}</strong> • Mã: \${b.id}</p>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 shrink-0">Đã giữ sân</span>
              </div>
            \`;
          }).join('');
        }`;

const newMyBk = `        // Render recent bookings list for customer (Chỉ hiện đơn do chính khách này tự đặt trên thiết bị)
        const myBkList = document.getElementById('cust-my-bookings-list');
        if (myBkList) {
          const myIds = Array.isArray(state.myDeviceBookingIds) ? state.myDeviceBookingIds : [];
          const myBks = state.bookings.filter(b => myIds.includes(b.id) && b.status !== 'cancelled');

          if (myBks.length === 0) {
            myBkList.innerHTML = \`
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500">
                <p class="font-bold text-slate-700">Chưa có lịch đặt sân nào</p>
                <p class="text-[11px] text-slate-400 mt-1">Khi bạn đặt sân thành công, phiếu xác nhận sẽ hiển thị tại đây.</p>
              </div>
            \`;
          } else {
            myBkList.innerHTML = myBks.map(b => {
              const cObj = state.courts.find(c => c.id === Number(b.courtId));
              const cDesc = cObj ? \`\${cObj.name} (\${cObj.zone})\` : \`Sân \${b.courtId}\`;
              return \`
                <div class="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <p class="font-bold text-slate-900">\${b.customer} <span class="text-emerald-700 font-extrabold">• \${cDesc}</span></p>
                    <p class="text-[11px] text-slate-500">Khung giờ: <strong>\${b.slot}</strong> • Mã: <strong>\${b.id}</strong></p>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shrink-0 shadow-xs">Đã giữ sân</span>
                </div>
              \`;
            }).join('');
          }
        }`;

if (js.includes(oldMyBk)) {
  js = js.replace(oldMyBk, newMyBk);
  console.log('Customer my bookings list privacy fixed!');
} else {
  console.warn('oldMyBk pattern not found directly');
}

// 4. Save newBkIds to myDeviceBookingIds in submit booking handler
const oldSubmitSave = `        // Xóa sạch trạng thái chọn sau khi đặt thành công
        state.customerCourtSlots = {};`;

const newSubmitSave = `        // Lưu lại mã đơn của thiết bị này để hiển thị phiếu đặt cho khách
        if (!Array.isArray(state.myDeviceBookingIds)) {
          state.myDeviceBookingIds = [];
        }
        newBkIds.forEach(id => {
          if (!state.myDeviceBookingIds.includes(id)) {
            state.myDeviceBookingIds.unshift(id);
          }
        });

        // Xóa sạch trạng thái chọn sau khi đặt thành công
        state.customerCourtSlots = {};`;

if (js.includes(oldSubmitSave)) {
  js = js.replace(oldSubmitSave, newSubmitSave);
  console.log('Submit booking handler updated with myDeviceBookingIds!');
} else {
  console.warn('oldSubmitSave pattern not found');
}

fs.writeFileSync('c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js', js, 'utf8');
console.log('app_logic.js updated successfully!');
