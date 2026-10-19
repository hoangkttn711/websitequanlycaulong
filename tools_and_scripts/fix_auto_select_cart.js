const fs = require('fs');
const path = require('path');

console.log('=== FIXING AUTO-SELECTED CART & ADDONS ===');

const appLogicPath = path.join(__dirname, 'app_logic.js');
let logic = fs.readFileSync(appLogicPath, 'utf8');

// 1. Update STORAGE_KEY to v4 to immediately bust any cached mock cart in browsers
logic = logic.replace(
  "const STORAGE_KEY = 'smashcourt_pro_state_v3';",
  "const STORAGE_KEY = 'smashcourt_pro_state_v4';"
);

// 2. In loadState(), clean old storage keys and ALWAYS ensure customerCart & addons start empty
const oldLoadStateTarget = `      function loadState() {
        const init = getInitialState();
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            const merged = Object.assign({}, init, parsed);
            // Xóa sạch các đơn mẫu cũ (BK-101, BK-102...) khỏi localStorage trình duyệt
            const mockIds = ['BK-101', 'BK-102', 'BK-103', 'BK-104', 'BK-106', 'BK-107'];
            if (Array.isArray(merged.bookings)) {
              merged.bookings = merged.bookings.filter(b => !mockIds.includes(b.id));
            }
            if (Array.isArray(merged.invoices)) {
              merged.invoices = merged.invoices.filter(i => !i.id || !i.id.startsWith('HD-2610-0'));
            }


            // Ensure essential arrays always exist
            if (!Array.isArray(merged.courts) || merged.courts.length === 0) merged.courts = init.courts;
            if (!Array.isArray(merged.products) || merged.products.length === 0) merged.products = init.products;
            if (!Array.isArray(merged.bookings)) merged.bookings = init.bookings;
            if (!Array.isArray(merged.invoices)) merged.invoices = init.invoices;
            if (!Array.isArray(merged.customerCart)) merged.customerCart = init.customerCart;
            if (!Array.isArray(merged.posCart)) merged.posCart = init.posCart;

            if (!merged.matrixSlotDuration || merged.matrixSlotDuration === 60) {
              merged.matrixSlotDuration = 30;
            }
            if (!merged.customerDay) merged.customerDay = 'today';

            // Tắt mặc định tự động chọn khung giờ khi mở web (để người dùng tự chọn)
            merged.customerCourtSlots = {};
            if (!merged.customerAddons || typeof merged.customerAddons !== 'object') {
              merged.customerAddons = {};
            }
            // Đồng bộ giá mới theo yêu cầu: Ống Thành Công 77 340k, Cầu lẻ Thành Công 77 30k, Revive 12k
            if (Array.isArray(merged.products)) {
              const p1 = merged.products.find(p => p.id === 'p1');
              if (p1) p1.price = 12000;
              const p10 = merged.products.find(p => p.id === 'p10');
              if (p10) { p10.name = 'Cầu lẻ Thành Công 77'; p10.price = 30000; }
              const p11 = merged.products.find(p => p.id === 'p11');
              if (p11) { p11.name = 'Ống cầu Thành Công 77'; p11.price = 340000; }
            }
            merged.customerSelectedSlots = [];
            merged.customerSelectedCourtId = null;
            merged.customerStartTime = '';
            merged.customerEndTime = '';

            return merged;
          }
        } catch (err) {
          // Ignore sandbox storage error
        }
        return init;
      }`;

const newLoadState = `      function loadState() {
        // Dọn sạch các phiên bản cache cũ khỏi localStorage của trình duyệt
        try {
          ['smashcourt_pro_state', 'smashcourt_pro_state_v1', 'smashcourt_pro_state_v2', 'smashcourt_pro_state_v3'].forEach(k => {
            localStorage.removeItem(k);
          });
        } catch (e) {}

        const init = getInitialState();
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            const merged = Object.assign({}, init, parsed);

            // Xóa sạch các đơn mẫu cũ (BK-101, BK-102...)
            const mockIds = ['BK-101', 'BK-102', 'BK-103', 'BK-104', 'BK-106', 'BK-107'];
            if (Array.isArray(merged.bookings)) {
              merged.bookings = merged.bookings.filter(b => !mockIds.includes(b.id));
            }
            if (Array.isArray(merged.invoices)) {
              merged.invoices = merged.invoices.filter(i => !i.id || !i.id.startsWith('HD-2610-0'));
            }

            // Ensure essential arrays always exist
            if (!Array.isArray(merged.courts) || merged.courts.length === 0) merged.courts = init.courts;
            if (!Array.isArray(merged.products) || merged.products.length === 0) merged.products = init.products;
            if (!Array.isArray(merged.bookings)) merged.bookings = init.bookings;
            if (!Array.isArray(merged.invoices)) merged.invoices = init.invoices;

            // TUYỆT ĐỐI KHÔNG TỰ ĐỘNG CHỌN SẢN PHẨM / GIỎ HÀNG / KHUNG GIỜ KHI MỞ WEB
            // Giỏ hàng và danh sách chọn trước luôn phải TRỐNG 100% để khách tự chọn
            merged.customerCart = [];
            merged.customerAddons = {};
            merged.customerCourtSlots = {};
            merged.customerSelectedSlots = [];
            merged.customerSelectedCourtId = null;
            merged.customerStartTime = '';
            merged.customerEndTime = '';
            merged.posCart = [];

            if (!merged.matrixSlotDuration || merged.matrixSlotDuration === 60) {
              merged.matrixSlotDuration = 30;
            }
            if (!merged.customerDay) merged.customerDay = 'today';

            // Đồng bộ giá mới theo yêu cầu: Ống Thành Công 77 340k, Cầu lẻ Thành Công 77 30k, Revive 12k
            if (Array.isArray(merged.products)) {
              const p1 = merged.products.find(p => p.id === 'p1');
              if (p1) p1.price = 12000;
              const p10 = merged.products.find(p => p.id === 'p10');
              if (p10) { p10.name = 'Cầu lẻ Thành Công 77'; p10.price = 30000; }
              const p11 = merged.products.find(p => p.id === 'p11');
              if (p11) { p11.name = 'Ống cầu Thành Công 77'; p11.price = 340000; }
            }

            return merged;
          }
        } catch (err) {
          // Ignore sandbox storage error
        }
        return init;
      }`;

if (logic.includes(oldLoadStateTarget)) {
  logic = logic.replace(oldLoadStateTarget, newLoadState);
  console.log('✓ loadState() replaced successfully');
} else {
  console.warn('! oldLoadStateTarget not matched directly, checking partial replacement...');
  // Find function loadState() and replace up to return init; }
  const startIdx = logic.indexOf('function loadState()');
  const endIdx = logic.indexOf('function saveState()');
  if (startIdx !== -1 && endIdx !== -1) {
    logic = logic.slice(0, startIdx) + newLoadState + '\n\n' + logic.slice(endIdx);
    console.log('✓ loadState() replaced via slice range');
  }
}

// 3. Add listener for btn-clear-cust-cart
const clearCartSnippet = `
      // Nút làm trống giỏ hàng nhanh cho Khách
      const btnClearCustCart = document.getElementById('btn-clear-cust-cart');
      if (btnClearCustCart) {
        btnClearCustCart.addEventListener('click', function () {
          state.customerCart = [];
          saveState();
          renderCustomerShop();
          showToast('Đã làm trống giỏ hàng!');
        });
      }
`;

if (!logic.includes('btnClearCustCart')) {
  const insertPos = logic.indexOf("document.getElementById('btn-cust-submit-order')");
  if (insertPos !== -1) {
    logic = logic.slice(0, insertPos) + clearCartSnippet + '\n      ' + logic.slice(insertPos);
    console.log('✓ btnClearCustCart handler added');
  }
}

fs.writeFileSync(appLogicPath, logic, 'utf8');
console.log('✓ app_logic.js updated and saved');

// 4. Update Cart drawer header in build_index.js, build_pc.js, build_mobile.js
function addClearButtonToBuilder(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const target = `<span id="cust-cart-total-amount" class="text-lg font-black text-emerald-600">0đ</span>
          </div>`;
  const replacement = `<div class="flex items-center gap-2">
              <span id="cust-cart-total-amount" class="text-lg font-black text-emerald-600">0đ</span>
              <button type="button" id="btn-clear-cust-cart" class="text-[11px] text-slate-400 hover:text-rose-500 hover:underline cursor-pointer" title="Làm trống giỏ hàng">Làm trống</button>
            </div>
          </div>`;
  if (content.includes(target) && !content.includes('btn-clear-cust-cart')) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✓ Added btn-clear-cust-cart to', path.basename(filePath));
  }

  // Also check mobile target
  const mobileTarget = `<span id="cust-cart-total-amount" class="text-base font-black text-emerald-600">0đ</span>
        </div>`;
  const mobileReplacement = `<div class="flex items-center gap-2">
            <span id="cust-cart-total-amount" class="text-base font-black text-emerald-600">0đ</span>
            <button type="button" id="btn-clear-cust-cart" class="text-[10px] text-slate-400 hover:text-rose-500 hover:underline cursor-pointer" title="Làm trống giỏ hàng">Làm trống</button>
          </div>
        </div>`;
  if (content.includes(mobileTarget) && !content.includes('btn-clear-cust-cart')) {
    content = content.replace(mobileTarget, mobileReplacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✓ Added mobile btn-clear-cust-cart to', path.basename(filePath));
  }
}

addClearButtonToBuilder(path.join(__dirname, 'build_index.js'));
addClearButtonToBuilder(path.join(__dirname, 'build_pc.js'));
addClearButtonToBuilder(path.join(__dirname, 'build_mobile.js'));

console.log('=== FIX APPLIED SUCCESSFULLY ===');
