const fs = require('fs');
const path = require('path');

const MODALS_HTML = `
  <!-- MODAL: ADDON PICKER -->
  <div id="modal-cust-addon-picker" class="fixed inset-0 z-50 hidden bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
      <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <h3 class="font-black text-sm flex items-center gap-2">
            <span>🥤 Chọn Đồ Uống & Phụ Kiện Mang Ra Sân</span>
          </h3>
          <p class="text-[11px] text-slate-400">Chọn đồ để nhân viên mang sẵn ra sân cho bạn</p>
        </div>
        <button type="button" data-close-modal="modal-cust-addon-picker" class="text-slate-400 hover:text-white p-1 text-sm font-bold">✕</button>
      </div>

      <div class="p-3 border-b border-slate-100 space-y-2 bg-slate-50">
        <input type="text" id="cust-addon-search-input" placeholder="Tìm kiếm nước, quấn cán, cầu..." class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar text-[11px]">
          <button type="button" data-addon-cat="all" class="addon-cat-btn px-2.5 py-1 rounded-lg font-bold bg-slate-900 text-white whitespace-nowrap">Tất cả</button>
          <button type="button" data-addon-cat="drink" class="addon-cat-btn px-2.5 py-1 rounded-lg font-bold bg-white text-slate-700 border border-slate-200 whitespace-nowrap">🥤 Nước</button>
          <button type="button" data-addon-cat="shuttle" class="addon-cat-btn px-2.5 py-1 rounded-lg font-bold bg-white text-slate-700 border border-slate-200 whitespace-nowrap">🏸 Cầu lông</button>
          <button type="button" data-addon-cat="grip" class="addon-cat-btn px-2.5 py-1 rounded-lg font-bold bg-white text-slate-700 border border-slate-200 whitespace-nowrap">🎾 Quấn cán</button>
          <button type="button" data-addon-cat="rental" class="addon-cat-btn px-2.5 py-1 rounded-lg font-bold bg-white text-slate-700 border border-slate-200 whitespace-nowrap">👟 Thuê đồ</button>
        </div>
      </div>

      <div id="modal-addon-products-list" class="p-3 overflow-y-auto custom-scrollbar divide-y divide-slate-100 flex-1 space-y-1"></div>

      <div class="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
        <div>
          <span class="text-[11px] text-slate-500 block">Tạm tính phụ kiện:</span>
          <span id="modal-addon-total-fee" class="text-sm font-black text-emerald-700">0đ</span>
        </div>
        <button type="button" data-close-modal="modal-cust-addon-picker" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition">
          Xác Nhận Xong
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL: ADMIN LOGIN -->
  <div id="modal-admin-login" class="fixed inset-0 z-50 hidden bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
      <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">🔐</span>
          <h3 class="font-extrabold text-sm">Đăng Nhập Quản Lý Sân</h3>
        </div>
        <button type="button" data-close-modal="modal-admin-login" class="text-slate-400 hover:text-white p-1">✕</button>
      </div>
      <form id="form-admin-login" class="p-5 space-y-4">
        <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <span>TK/MK mặc định: <strong class="text-slate-900 font-bold">admin / admin</strong></span>
          <button type="button" id="btn-autofill-admin" class="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px] hover:bg-emerald-200">Điền nhanh</button>
        </div>
        <div>
          <label for="admin-username-input" class="block text-xs font-bold text-slate-700 mb-1">Tài khoản</label>
          <input type="text" id="admin-username-input" required value="admin" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label for="admin-password-input" class="block text-xs font-bold text-slate-700 mb-1">Mật khẩu</label>
          <input type="password" id="admin-password-input" required value="admin" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <p id="admin-login-error" class="hidden text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
          Sai tài khoản hoặc mật khẩu! Vui lòng nhập: admin / admin.
        </p>
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" data-close-modal="modal-admin-login" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">Đóng</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm">Đăng Nhập Quản Lý</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: CHECK-IN SÂN -->
  <div id="modal-checkin" class="fixed inset-0 z-50 hidden bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
      <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
        <h3 id="modal-checkin-title" class="font-extrabold text-base">Mở Sân Cầu Lông</h3>
        <button type="button" data-close-modal="modal-checkin" class="text-slate-400 hover:text-white p-1">✕</button>
      </div>
      <form id="form-checkin-court" class="p-5 space-y-4">
        <input type="hidden" id="checkin-court-id" />
        <div>
          <label for="checkin-customer-name" class="block text-xs font-bold text-slate-700 mb-1">Tên khách hàng / Nhóm chơi</label>
          <input type="text" id="checkin-customer-name" required placeholder="VD: Nhóm Anh Tuấn..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="checkin-customer-type" class="block text-xs font-bold text-slate-700 mb-1">Khung giá áp dụng</label>
            <select id="checkin-customer-type" class="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white">
              <option value="normal" selected>Giờ thường (60.000đ/h)</option>
              <option value="peak">Tối 17h–21h (80.000đ/h)</option>
            </select>
          </div>
          <div>
            <label for="checkin-duration" class="block text-xs font-bold text-slate-700 mb-1">Số giờ chơi</label>
            <input type="number" id="checkin-duration" step="0.5" min="0.5" max="8" value="1.5" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Gọi sẵn Nước / Cầu mang ra sân:</label>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" id="checkin-quick-shuttle" class="rounded text-emerald-600" />
              <span>+1 Ống Thành Công 77 (340k)</span>
            </label>
            <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" id="checkin-quick-revive" class="rounded text-emerald-600" />
              <span>+4 Chai Revive (48k)</span>
            </label>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" data-close-modal="modal-checkin" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">Hủy</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm">Bắt Đầu Tính Giờ Sân</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: CHECKOUT & THANH TOÁN SÂN -->
  <div id="modal-checkout" class="fixed inset-0 z-50 hidden bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
      <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <h3 id="checkout-modal-title" class="font-black text-base">Thanh Toán & Chi Tiết Sân</h3>
          <p id="checkout-modal-subtitle" class="text-xs text-slate-400"></p>
        </div>
        <button type="button" data-close-modal="modal-checkout" class="text-slate-400 hover:text-white p-1">✕</button>
      </div>

      <div class="p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
        <!-- 1. Court Fee -->
        <div class="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-3">
          <div>
            <span class="text-[11px] font-black uppercase text-emerald-800 tracking-wider">1. Tiền Thuê Sân Cầu Lông</span>
            <p id="checkout-rate-info" class="text-xs text-slate-600 mt-0.5"></p>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5">
              <label for="checkout-hours-input" class="text-xs font-bold text-slate-700">Số giờ:</label>
              <input type="number" id="checkout-hours-input" step="0.5" min="0.5" max="10" class="w-16 px-2 py-1.5 rounded-lg border border-emerald-300 text-sm font-bold text-center bg-white" />
            </div>
            <span id="checkout-court-subtotal" class="text-base font-black text-emerald-700 min-w-[80px] text-right">0đ</span>
          </div>
        </div>

        <!-- 2. POS Items called on Court -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-black uppercase text-slate-700 tracking-wider">2. Nước, Quấn cán, Cầu lông đã gọi</span>
            <button type="button" id="btn-checkout-go-pos" class="text-xs font-bold text-emerald-600 hover:text-emerald-700">
              + Mở quầy POS thêm món
            </button>
          </div>

          <div class="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <button type="button" data-quick-add="p1" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 font-medium">+ Revive (12k)</button>
            <button type="button" data-quick-add="p3" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 font-medium">+ Aquafina (10k)</button>
            <button type="button" data-quick-add="p6" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 font-medium">+ Quấn VS (20k)</button>
            <button type="button" data-quick-add="p10" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 font-medium">+ Cầu lẻ TC77 (30k)</button>
            <button type="button" data-quick-add="p11" class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 font-medium">+ Ống TC77 (340k)</button>
          </div>

          <div id="checkout-items-list" class="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-40 overflow-y-auto custom-scrollbar"></div>
        </div>

        <!-- Discount & Breakdown -->
        <div class="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
          <div class="space-y-2">
            <label for="checkout-discount-input" class="block text-xs font-bold text-slate-700">Giảm giá / Tiền cọc trước (đ):</label>
            <input type="number" id="checkout-discount-input" step="5000" min="0" value="0" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
            <label class="block text-xs font-bold text-slate-700 pt-1">Hình thức thanh toán:</label>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" data-checkout-pay="cash" class="checkout-pay-btn py-2 px-3 rounded-xl border text-xs font-bold bg-emerald-50 border-emerald-500 text-emerald-800">💵 Tiền mặt</button>
              <button type="button" data-checkout-pay="transfer" class="checkout-pay-btn py-2 px-3 rounded-xl border text-xs font-bold bg-white border-slate-200 text-slate-600">📱 QR Ngân hàng</button>
            </div>
          </div>

          <div class="bg-slate-900 text-white p-4 rounded-xl flex flex-col justify-between space-y-2">
            <div class="space-y-1 text-xs">
              <div class="flex justify-between text-slate-300">
                <span>Tiền thuê sân:</span>
                <span id="summary-court-fee" class="font-bold text-white">0đ</span>
              </div>
              <div class="flex justify-between text-slate-300">
                <span>Tiền nước & phụ kiện:</span>
                <span id="summary-pos-fee" class="font-bold text-amber-300">0đ</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Giảm trừ / Cọc:</span>
                <span id="summary-discount-fee">-0đ</span>
              </div>
            </div>
            <div class="pt-2 border-t border-slate-800 flex justify-between items-baseline">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-300">TỔNG CẦN THU:</span>
              <span id="summary-grand-total" class="text-2xl font-black text-emerald-400">0đ</span>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
        <button type="button" data-close-modal="modal-checkout" class="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100">Đóng</button>
        <button type="button" id="btn-confirm-court-checkout" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center gap-2 transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Hoàn Tất Thu Tiền & Trả Sân</span>
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL: ĐẶT LỊCH SÂN MỚI -->
  <div id="modal-booking" class="fixed inset-0 z-50 hidden bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
      <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
        <h3 class="font-black text-base">Tạo Phiếu Đặt Sân Trước</h3>
        <button type="button" data-close-modal="modal-booking" class="text-slate-400 hover:text-white p-1">✕</button>
      </div>
      <form id="form-new-booking" class="p-5 space-y-3.5">
        <div>
          <label for="booking-customer" class="block text-xs font-bold text-slate-700 mb-1">Tên khách / CLB</label>
          <input type="text" id="booking-customer" required placeholder="VD: Anh Hoàng - VCB..." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="booking-phone" class="block text-xs font-bold text-slate-700 mb-1">Số điện thoại</label>
            <input type="tel" id="booking-phone" required placeholder="0988xxxxxx" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs" />
          </div>
          <div>
            <label for="booking-court" class="block text-xs font-bold text-slate-700 mb-1">Chọn sân</label>
            <select id="booking-court" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white">
              <option value="1">Sân 1 (Thảm xanh)</option>
              <option value="2">Sân 2 (Thảm xanh)</option>
              <option value="3">Sân 3 (Thảm xám)</option>
              <option value="4">Sân 4 (Thảm xám)</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="booking-slot" class="block text-xs font-bold text-slate-700 mb-1">Khung giờ</label>
            <input type="text" id="booking-slot" required value="18:00 - 20:00" placeholder="18:00 - 20:00" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
          </div>
          <div>
            <label for="booking-type" class="block text-xs font-bold text-slate-700 mb-1">Loại lịch</label>
            <select id="booking-type" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white">
              <option value="Khách vãng lai">Khách vãng lai</option>
              <option value="Cố định tháng">Cố định tháng</option>
            </select>
          </div>
        </div>
        <div>
          <label for="booking-deposit" class="block text-xs font-bold text-slate-700 mb-1">Tiền cọc trước (đ)</label>
          <input type="number" id="booking-deposit" step="10000" min="0" value="50000" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold" />
        </div>
        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" data-close-modal="modal-booking" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">Hủy</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm">Lưu Lịch Đặt</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: THÊM MẶT HÀNG KHO -->
  <div id="modal-product" class="fixed inset-0 z-50 hidden bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
      <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
        <h3 class="font-black text-base">Thêm Sản Phẩm Vào Menu POS</h3>
        <button type="button" data-close-modal="modal-product" class="text-slate-400 hover:text-white p-1">✕</button>
      </div>
      <form id="form-new-product" class="p-5 space-y-3.5">
        <div>
          <label for="prod-name" class="block text-xs font-bold text-slate-700 mb-1">Tên sản phẩm / Dịch vụ</label>
          <input type="text" id="prod-name" required placeholder="VD: Bò Húc Lùn, Quấn Yonex..." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="prod-category" class="block text-xs font-bold text-slate-700 mb-1">Danh mục</label>
            <select id="prod-category" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white">
              <option value="drink">Nước giải khát</option>
              <option value="grip">Quấn cán & Phụ kiện</option>
              <option value="shuttle">Quả cầu lông</option>
              <option value="rental">Thuê dụng cụ</option>
            </select>
          </div>
          <div>
            <label for="prod-unit" class="block text-xs font-bold text-slate-700 mb-1">Đơn vị tính</label>
            <input type="text" id="prod-unit" required value="Chai" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label for="prod-cost" class="block text-xs font-bold text-slate-700 mb-1">Giá vốn (đ)</label>
            <input type="number" id="prod-cost" required step="1000" min="0" value="8000" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs" />
          </div>
          <div>
            <label for="prod-price" class="block text-xs font-bold text-slate-700 mb-1">Giá bán (đ)</label>
            <input type="number" id="prod-price" required step="1000" min="1000" value="15000" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-emerald-700" />
          </div>
          <div>
            <label for="prod-stock" class="block text-xs font-bold text-slate-700 mb-1">Tồn kho</label>
            <input type="number" id="prod-stock" required min="1" value="50" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" data-close-modal="modal-product" class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">Hủy</button>
          <button type="submit" class="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold">Thêm Vào Menu</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: HÓA ĐƠN CHI TIẾT & IN PHIẾU -->
  <div id="modal-invoice-detail" class="fixed inset-0 z-50 hidden bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
      <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <h3 id="inv-detail-title" class="font-black text-sm">Phiếu Thu Dịch Vụ</h3>
          <p id="inv-detail-time" class="text-[11px] text-slate-400"></p>
        </div>
        <button type="button" data-close-modal="modal-invoice-detail" class="text-slate-400 hover:text-white p-1">✕</button>
      </div>
      <div id="print-receipt-area" class="p-5 space-y-3 text-xs">
        <div id="inv-detail-body" class="space-y-2"></div>
      </div>
      <div class="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-between gap-2">
        <button type="button" onclick="window.print()" class="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5">
          <span>🖨️ In Hóa Đơn</span>
        </button>
        <button type="button" data-close-modal="modal-invoice-detail" class="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Đóng</button>
      </div>
    </div>
  </div>
`;

console.log("MODALS_HTML defined, size:", MODALS_HTML.length);

const APP_LOGIC_JS = \`
  function updateRoleViewMode() {
    const isAdmin = Boolean(state.isAdminLoggedIn);
    const showAdminWorkspace = isAdmin && state.viewMode === 'admin';

    const portal = document.getElementById('customer-portal');
    const adminWs = document.getElementById('admin-workspace');
    const adminNav = document.getElementById('admin-nav-bar');
    const openLoginBtn = document.getElementById('btn-open-admin-login');
    const adminControls = document.getElementById('admin-header-controls');

    if (portal) portal.classList.toggle('hidden', showAdminWorkspace);
    if (adminWs) adminWs.classList.toggle('hidden', !showAdminWorkspace);
    if (adminNav) adminNav.classList.toggle('hidden', !showAdminWorkspace);
    if (openLoginBtn) openLoginBtn.classList.toggle('hidden', isAdmin);
    if (adminControls) adminControls.classList.toggle('hidden', !isAdmin);

    const badge = document.getElementById('role-mode-badge');
    if (badge) {
      if (showAdminWorkspace) {
        badge.textContent = '👑 Quản Trị Viên (Admin)';
        badge.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 whitespace-nowrap shadow-xs';
      } else if (isAdmin) {
        badge.textContent = '👁️ Xem Như Khách';
        badge.className = 'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap';
      } else {
        badge.textContent = 'Khách Đặt Sân';
        badge.className = 'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap';
      }
    }

    const previewBtn = document.getElementById('btn-toggle-customer-preview');
    if (previewBtn) {
      previewBtn.textContent = showAdminWorkspace ? 'Giao diện Khách' : 'Về trang Quản lý';
    }
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    const views = ['courts', 'pos', 'schedule', 'inventory', 'reports'];
    views.forEach(v => {
      const el = document.getElementById('view-' + v);
      if (el) el.classList.toggle('hidden', v !== tabName);
    });

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const nav = btn.getAttribute('data-nav');
      if (nav === tabName) {
        btn.className = 'nav-tab-btn px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-emerald-500 text-slate-950 shadow-sm';
      } else {
        btn.className = 'nav-tab-btn px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800';
      }
    });

    renderAll();
  }

  function renderCustomerPortal() {
    if (!state.customerTab) state.customerTab = 'book';
    const viewBook = document.getElementById('cust-view-book');
    const viewShop = document.getElementById('cust-view-shop');
    if (viewBook) viewBook.classList.toggle('hidden', state.customerTab !== 'book');
    if (viewShop) viewShop.classList.toggle('hidden', state.customerTab !== 'shop');
    updateDynamicDateLabels();

    document.querySelectorAll('.cust-tab-btn').forEach(btn => {
      const t = btn.getAttribute('data-cust-tab');
      if (t === state.customerTab) {
        btn.className = 'cust-tab-btn py-2 px-5 rounded-xl text-xs font-extrabold flex items-center gap-2 bg-emerald-600 text-white shadow-xs transition';
      } else {
        btn.className = 'cust-tab-btn py-2 px-5 rounded-xl text-xs font-extrabold flex items-center gap-2 text-slate-600 hover:bg-slate-100 transition';
      }
    });

    document.querySelectorAll('.cust-day-btn').forEach(b => {
      const d = b.getAttribute('data-cust-day');
      if (d === (state.customerDay || 'today')) {
        b.className = 'cust-day-btn px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-xs';
      } else {
        b.className = 'cust-day-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200';
      }
    });

    const isToday = (!state.customerDay || state.customerDay === 'today');
    const currentMin = getCurrentMinutes();
    const aloboSlots = getAloboSlots(30);

    const matrixHeader = document.getElementById('cust-alobo-matrix-header');
    if (matrixHeader) {
      matrixHeader.innerHTML = \`
        <th class="w-24 min-w-[96px] sticky left-0 bg-[#c0ebfb] z-20 border-r-2 border-[#a3cdc2] h-11 p-0 text-center font-black text-xs text-slate-800">
          Sân / Khung Giờ
        </th>
        \${aloboSlots.map((slot, idx) => {
          const slotStartM = timeToMinutes(slot.start);
          const isColPast = isToday && (slotStartM < currentMin);
          const colBg = isColPast ? 'bg-[#b6e2f3] opacity-80' : 'bg-[#c0ebfb]';
          const labelColor = isColPast ? 'text-slate-400' : 'text-[#0e362e]';
          return \`
            <th data-slot-start="\${slot.start}" class="relative border-r border-[#cadfe8] min-w-[50px] sm:min-w-[56px] h-11 p-0 text-left \${colBg} select-none">
              <span class="absolute left-0 -translate-x-1/2 bottom-1 w-[2px] h-[7px] \${isColPast ? 'bg-slate-400' : 'bg-emerald-600'} pointer-events-none"></span>
              <span class="absolute left-0 -translate-x-1/2 top-1.5 text-[10px] sm:text-[11px] font-bold \${labelColor} leading-none whitespace-nowrap pointer-events-none">\${slot.start}</span>
              \${idx === aloboSlots.length - 1 ? \`
                <span class="absolute right-0 translate-x-1/2 top-1.5 text-[10px] sm:text-[11px] font-bold text-[#0e362e] whitespace-nowrap">\${slot.end}</span>
              \` : ''}
            </th>
          \`;
        }).join('')}
      \`;
    }

    const matrixBody = document.getElementById('cust-alobo-matrix-body');
    if (matrixBody) {
      matrixBody.innerHTML = state.courts.map(court => {
        const courtSlots = (state.customerCourtSlots && state.customerCourtSlots[court.id]) || [];

        const slotCells = aloboSlots.map(slot => {
          const slotStartMin = timeToMinutes(slot.start);
          const slotEndMin = timeToMinutes(slot.end);

          const isPast = isToday && (slotStartMin < currentMin);
          if (isPast) {
            return \`
              <td class="h-10 sm:h-11 min-w-[50px] sm:min-w-[56px] border-r border-b border-slate-200 bg-slate-100/70 p-0 text-center select-none">
                <span class="text-slate-300 font-bold text-xs">—</span>
              </td>
            \`;
          }

          const overlappingBk = state.bookings.find(b => {
            if (Number(b.courtId) !== court.id || b.status === 'cancelled') return false;
            const r = parseSlotRange(b.slot);
            return isTimeOverlapping(slotStartMin, slotEndMin, r.startMin, r.endMin);
          });

          if (overlappingBk) {
            const label = state.isAdminLoggedIn ? overlappingBk.customer : '🔒 Khóa';
            return \`
              <td class="h-10 sm:h-11 min-w-[50px] sm:min-w-[56px] border-r border-b border-slate-200 bg-slate-100 p-0 text-center select-none">
                <div class="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold px-1 select-none">
                  <span class="truncate">\${label}</span>
                </div>
              </td>
            \`;
          }

          const isSelected = courtSlots.includes(slot.label);
          if (isSelected) {
            return \`
              <td class="h-10 sm:h-11 min-w-[50px] sm:min-w-[56px] border-r border-b border-emerald-700 bg-emerald-600 p-0 text-center select-none">
                <button type="button" data-matrix-slot-court="\${court.id}" data-matrix-slot-start="\${slot.start}" data-matrix-slot-end="\${slot.end}" class="w-full h-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center cursor-pointer transition">
                  ✓
                </button>
              </td>
            \`;
          }

          const peakHint = slot.isPeak ? '80k/h' : '60k/h';
          const peakBgHover = slot.isPeak ? 'hover:bg-amber-50/70' : 'hover:bg-emerald-50/80';
          return \`
            <td class="h-10 sm:h-11 min-w-[50px] sm:min-w-[56px] border-r border-b border-slate-200 bg-white p-0 text-center select-none">
              <button type="button" data-matrix-slot-court="\${court.id}" data-matrix-slot-start="\${slot.start}" data-matrix-slot-end="\${slot.end}" class="w-full h-full bg-white \${peakBgHover} transition flex items-center justify-center cursor-pointer" title="\${slot.start} - \${slot.end} (\${peakHint})"></button>
            </td>
          \`;
        }).join('');

        const isGrey = court.matColor === 'grey' || court.id >= 3;
        const gradClass = isGrey ? 'court-bg-grey' : 'court-bg-green';
        const labelType = isGrey ? 'Thảm xám' : 'Thảm xanh';

        return \`
          <tr class="h-10 sm:h-11">
            <td class="sticky left-0 z-20 border-r-2 border-[#a3cdc2] border-b border-slate-200 text-center select-none w-24 min-w-[96px] h-10 sm:h-11 p-0 \${gradClass} text-white shadow-xs">
              <div class="flex flex-col items-center justify-center py-1">
                <span class="font-black text-xs tracking-tight uppercase leading-none drop-shadow-sm">\${court.name}</span>
                <span class="text-[9px] font-bold opacity-90 leading-none mt-0.5">\${labelType}</span>
              </div>
            </td>
            \${slotCells}
          </tr>
        \`;
      }).join('');
    }

    const activeCourtIds = Object.keys(state.customerCourtSlots || {})
      .filter(cId => Array.isArray(state.customerCourtSlots[cId]) && state.customerCourtSlots[cId].length > 0)
      .map(Number);
    
    let grandCourtHours = 0;
    let grandCourtFee = 0;
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
      grandCourtHours += courtHours;
      grandCourtFee += courtFee;

      const courtObj = state.courts.find(c => c.id === cId);
      courtSummaries.push({
        cId,
        name: courtObj ? courtObj.name : ('Sân ' + cId),
        zone: courtObj ? courtObj.zone : '',
        hoursFormatted: courtHours.toFixed(1).replace('.0', ''),
        courtFee,
        timeStr: slots.join(', ')
      });
    });

    const summaryCard = document.getElementById('cust-selected-summary-card');
    if (summaryCard) {
      if (courtSummaries.length === 0) {
        summaryCard.innerHTML = \`
          <div class="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400 w-full bg-slate-50">
            👆 Vui lòng chạm vào các ô khung giờ trên bảng ma trận để bắt đầu đặt sân.
          </div>
        \`;
      } else {
        summaryCard.innerHTML = \`
          <div class="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-300 shadow-xs space-y-2 w-full text-xs">
            <div class="flex items-center justify-between border-b border-emerald-200 pb-2">
              <span class="font-extrabold text-slate-900 text-xs sm:text-sm">🏸 Đã chọn \${courtSummaries.length} sân (\${grandCourtHours.toFixed(1).replace('.0', '')}h)</span>
              <button type="button" id="btn-cust-clear-slots" class="text-[11px] font-bold text-rose-600 hover:underline">Bỏ chọn ✕</button>
            </div>
            <div class="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
              \${courtSummaries.map(c => \`
                <div class="flex items-center justify-between p-2 rounded-lg bg-white border border-emerald-200">
                  <div>
                    <span class="font-bold text-slate-900">\${c.name}</span>
                    <span class="text-[10px] text-slate-500">(\${c.zone})</span>
                    <p class="text-[11px] font-semibold text-emerald-800">\${c.timeStr}</p>
                  </div>
                  <span class="font-black text-emerald-700">\${formatVND(c.courtFee)}</span>
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      }
    }

    let addonsTotal = 0;
    let addonsCount = 0;
    const defaultQuickProds = ['p11', 'p10', 'p1'];
    const allAddonIds = Array.from(new Set([
      ...defaultQuickProds,
      ...Object.keys(state.customerAddons || {}).filter(id => (state.customerAddons[id] || 0) > 0)
    ]));

    const addonsGrid = document.getElementById('cust-addons-grid');
    if (addonsGrid) {
      addonsGrid.innerHTML = allAddonIds.map(pId => {
        const p = state.products.find(item => item.id === pId);
        if (!p) return '';
        const qty = (state.customerAddons && state.customerAddons[pId]) || 0;
        if (qty > 0) {
          addonsTotal += p.price * qty;
          addonsCount += qty;
        }
        const isSel = qty > 0;
        return \`
          <div class="p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2 \${isSel ? 'bg-emerald-50/90 border-emerald-300' : 'bg-slate-50 border-slate-200'}">
            <div class="min-w-0 flex-1">
              <p class="font-bold text-slate-900 truncate flex items-center gap-1">
                <span>\${p.icon || '🏸'}</span>
                <span class="truncate">\${p.name}</span>
              </p>
              <p class="text-[11px] \${isSel ? 'text-emerald-700 font-bold' : 'text-slate-500'}">
                \${formatVND(p.price)}/\${p.unit}
              </p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0 bg-white px-1.5 py-1 rounded-lg border border-slate-200">
              <button type="button" data-addon-dec="\${p.id}" class="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-xs flex items-center justify-center">-</button>
              <span class="w-5 text-center font-bold text-xs \${isSel ? 'text-emerald-800' : 'text-slate-400'}">\${qty}</span>
              <button type="button" data-addon-inc="\${p.id}" class="w-6 h-6 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center">+</button>
            </div>
          </div>
        \`;
      }).join('');
    }

    const totalBookingFee = grandCourtFee + addonsTotal;
    const previewEl = document.getElementById('cust-book-total-preview');
    if (previewEl) previewEl.textContent = formatVND(totalBookingFee);
    const freeCount = state.courts.filter(c => c.status === 'free').length;
    const freeHint = document.getElementById('cust-free-count-hint');
    if (freeHint) freeHint.textContent = freeCount + '/4 sân trống';

    const myBkList = document.getElementById('cust-my-bookings-list');
    if (myBkList) {
      const list = state.bookings.slice(0, 4);
      myBkList.innerHTML = list.map(b => {
        const court = state.courts.find(c => c.id === Number(b.courtId));
        const courtName = court ? (court.name + ' (' + court.zone + ')') : ('Sân ' + b.courtId);
        return \`
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <p class="font-bold text-slate-900">\${b.customer} • <span class="text-emerald-700">\${courtName}</span></p>
              <p class="text-[11px] text-slate-500">\${b.slot} • Mã: \${b.id}</p>
            </div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Đã đặt sân</span>
          </div>
        \`;
      }).join('');
    }

    renderCustomerShop();
  }

  function renderCustomerShop() {
    document.querySelectorAll('.cust-cat-btn').forEach(btn => {
      const c = btn.getAttribute('data-cust-cat');
      btn.className = c === state.customerShopCat
        ? 'cust-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white whitespace-nowrap'
        : 'cust-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 whitespace-nowrap';
    });

    const filteredProds = state.products.filter(p => state.customerShopCat === 'all' || p.category === state.customerShopCat);
    const shopGrid = document.getElementById('cust-shop-grid');
    if (shopGrid) {
      shopGrid.innerHTML = filteredProds.map(p => {
        const inCart = state.customerCart.find(i => i.productId === p.id);
        return \`
          <div class="bg-white p-3.5 rounded-2xl border \${inCart ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'} shadow-xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">\${p.icon || '🏸'}</span>
                <span class="text-xs font-black text-emerald-600">\${formatVND(p.price)}</span>
              </div>
              <p class="text-xs font-bold text-slate-900 line-clamp-2">\${p.name}</p>
              <p class="text-[10px] text-slate-400 mt-0.5">\${p.unit}</p>
            </div>
            <div class="pt-3 mt-2 border-t border-slate-100">
              \${inCart ? \`
                <div class="flex items-center justify-between bg-emerald-50 rounded-xl p-1 border border-emerald-200">
                  <button type="button" data-cust-cart-dec="\${p.id}" class="w-7 h-7 rounded-lg bg-white text-slate-700 font-black text-xs shadow-xs">-</button>
                  <span class="text-xs font-black text-emerald-800">\${inCart.qty}</span>
                  <button type="button" data-cust-cart-inc="\${p.id}" class="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs shadow-xs">+</button>
                </div>
              \` : \`
                <button type="button" data-cust-add-prod="\${p.id}" class="w-full py-2 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs transition">
                  + Chọn Mua
                </button>
              \`}
            </div>
          </div>
        \`;
      }).join('');
    }

    let total = 0;
    let count = 0;
    const cartList = document.getElementById('cust-cart-items-list');
    if (cartList) {
      if (state.customerCart.length === 0) {
        cartList.innerHTML = '<p class="py-3 text-center text-slate-400">Chưa có sản phẩm nào được chọn.</p>';
      } else {
        cartList.innerHTML = state.customerCart.map(i => {
          const prod = state.products.find(p => p.id === i.productId);
          if (!prod) return '';
          const line = prod.price * i.qty;
          total += line;
          count += i.qty;
          return \`
            <div class="py-2 flex items-center justify-between">
              <span class="font-bold text-slate-800">\${prod.icon} \${prod.name} (x\${i.qty})</span>
              <span class="font-black text-slate-900">\${formatVND(line)}</span>
            </div>
          \`;
        }).join('');
      }
    }

    const sumText = document.getElementById('cust-cart-summary-text');
    if (sumText) sumText.textContent = count > 0 ? ('Đã chọn ' + count + ' sản phẩm') : 'Chưa có món nào được chọn';
    const totalEl = document.getElementById('cust-cart-total-amount');
    if (totalEl) totalEl.textContent = formatVND(total);
    const shopBadge = document.getElementById('cust-shop-badge');
    if (shopBadge) {
      shopBadge.textContent = String(count);
      shopBadge.classList.toggle('hidden', count === 0);
    }
  }

  function updateDynamicDateLabels() {
    const now = new Date();
    const d0 = now;
    const d1 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const d2 = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const fmt = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    const b0 = document.querySelector('[data-cust-day="today"]');
    const b1 = document.querySelector('[data-cust-day="tomorrow"]');
    const b2 = document.querySelector('[data-cust-day="sunday"]');
    if (b0) b0.textContent = 'Hôm nay (' + fmt(d0) + ')';
    if (b1) b1.textContent = 'Ngày mai (' + fmt(d1) + ')';
    if (b2) b2.textContent = dayNames[d2.getDay()] + ' (' + fmt(d2) + ')';

    const clubBadge = document.getElementById('cust-club-date-badge');
    if (clubBadge) {
      const cur = state.customerDay || 'today';
      if (cur === 'today') clubBadge.textContent = 'Hôm nay • ' + fmt(d0) + '/' + d0.getFullYear();
      else if (cur === 'tomorrow') clubBadge.textContent = 'Ngày mai • ' + fmt(d1) + '/' + d1.getFullYear();
      else clubBadge.textContent = dayNames[d2.getDay()] + ' • ' + fmt(d2) + '/' + d2.getFullYear();
    }
  }

  function renderKPIs() {
    const totalCourts = state.courts.length;
    const activeCount = state.courts.filter(c => c.status === 'active').length;
    const freeCount = state.courts.filter(c => c.status === 'free').length;
    const reservedCount = state.courts.filter(c => c.status === 'reserved').length;

    const bActive = document.getElementById('badge-active-courts');
    if (bActive) bActive.textContent = activeCount + '/' + totalCourts;
    const kpiActive = document.getElementById('kpi-courts-active');
    if (kpiActive) kpiActive.textContent = activeCount + ' / ' + totalCourts + ' sân';
    const kpiSub = document.getElementById('kpi-courts-sub');
    if (kpiSub) kpiSub.textContent = freeCount + ' trống • ' + reservedCount + ' đã đặt';

    const runningUnbilled = state.courts.filter(c => c.status === 'active').reduce((sum, c) => sum + getCourtCurrentTotal(c), 0);
    const kpiRunning = document.getElementById('kpi-running-unbilled');
    if (kpiRunning) kpiRunning.textContent = formatVND(runningUnbilled);

    const settledPosRev = state.invoices.reduce((sum, inv) => sum + (inv.posFee || 0), 0);
    const activePosRev = state.courts.filter(c => c.status === 'active').reduce((sum, c) => sum + getCourtPosTotal(c), 0);
    const totalSoldItems = state.products.reduce((sum, p) => sum + (p.soldToday || 0), 0);
    const kpiPos = document.getElementById('kpi-pos-revenue');
    if (kpiPos) kpiPos.textContent = formatVND(settledPosRev + activePosRev);
    const kpiPosItems = document.getElementById('kpi-pos-items-sold');
    if (kpiPosItems) kpiPosItems.textContent = totalSoldItems + ' món đã xuất';

    const totalSettledRevenue = state.invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const kpiTot = document.getElementById('kpi-total-revenue');
    if (kpiTot) kpiTot.textContent = formatVND(totalSettledRevenue);
    const kpiInv = document.getElementById('kpi-invoice-count');
    if (kpiInv) kpiInv.textContent = state.invoices.length + ' hóa đơn đã thu';

    const lowStockCount = state.products.filter(p => p.stock <= 15 && p.category !== 'rental').length;
    const lowBadge = document.getElementById('badge-low-stock');
    if (lowBadge) {
      lowBadge.textContent = String(lowStockCount);
      lowBadge.classList.toggle('hidden', lowStockCount === 0);
    }

    const cartCount = state.posCart.reduce((sum, item) => sum + item.qty, 0);
    const cartBadge = document.getElementById('badge-pos-cart');
    if (cartBadge) {
      cartBadge.textContent = String(cartCount);
      cartBadge.classList.toggle('hidden', cartCount === 0);
    }
  }

  function renderCourts() {
    const grid = document.getElementById('courts-grid');
    if (!grid) return;

    document.querySelectorAll('.court-filter-btn').forEach(btn => {
      const f = btn.getAttribute('data-court-filter');
      btn.className = f === state.courtFilter
        ? 'court-filter-btn px-3 py-1.5 rounded-lg font-bold bg-white text-slate-900 shadow-xs'
        : 'court-filter-btn px-3 py-1.5 rounded-lg font-bold text-slate-600 hover:text-slate-900';
    });

    const filtered = state.courts.filter(c => state.courtFilter === 'all' || c.status === state.courtFilter);

    grid.innerHTML = filtered.map(court => {
      const isGrey = court.matColor === 'grey' || court.id >= 3;
      const bgGrad = isGrey ? 'court-bg-grey' : 'court-bg-green';
      const courtFee = Math.round(court.bookedHours * court.hourlyRate);
      const posFee = getCourtPosTotal(court);
      const total = getCourtCurrentTotal(court);

      let badgeHtml = '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">Sân Trống</span>';
      if (court.status === 'active') {
        badgeHtml = '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-white live-dot"></span>Đang Đánh (' + court.elapsedMinutes + 'p)</span>';
      } else if (court.status === 'reserved') {
        badgeHtml = '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900">Đã Đặt Trước</span>';
      }

      return \`
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div class="\${bgGrad} p-3.5 text-white flex items-center justify-between">
              <div>
                <span class="text-base font-black tracking-tight">\${court.name}</span>
                <p class="text-[11px] font-semibold opacity-90">\${court.zone}</p>
              </div>
              \${badgeHtml}
            </div>

            <div class="p-4 space-y-3">
              \${court.status === 'active' ? \`
                <div>
                  <p class="text-xs font-black text-slate-900">\${court.customer}</p>
                  <p class="text-[11px] text-slate-500 mt-0.5">Vào sân: <strong>\${court.startTime}</strong> (\${court.bookedHours}h • \${formatVND(court.hourlyRate)}/h)</p>
                </div>
                <div class="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div class="flex justify-between">
                    <span class="text-slate-500">Tiền sân:</span>
                    <span class="font-bold text-slate-800">\${formatVND(courtFee)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-500">Nước/Cầu:</span>
                    <span class="font-bold text-amber-700">\${formatVND(posFee)}</span>
                  </div>
                </div>
                <div class="flex items-baseline justify-between pt-1">
                  <span class="text-xs font-semibold text-slate-600">Tạm tính:</span>
                  <span class="text-lg font-black text-emerald-600">\${formatVND(total)}</span>
                </div>
              \` : ''}

              \${court.status === 'free' ? \`
                <div class="py-5 text-center space-y-1">
                  <p class="text-xs font-bold text-emerald-700">Sẵn sàng nhận khách</p>
                  <p class="text-[11px] text-slate-500">\${court.zone}</p>
                  <p class="text-xs font-extrabold text-slate-800 pt-1">60k/h • Tối: 80k/h</p>
                </div>
              \` : ''}

              \${court.status === 'reserved' ? \`
                <div class="space-y-1.5 py-2">
                  <p class="text-xs font-black text-slate-900">\${court.customer}</p>
                  <p class="text-[11px] text-slate-500">Giờ đặt: <strong>\${court.startTime}</strong></p>
                  <div class="p-2 rounded-lg bg-amber-50 border border-amber-200 flex justify-between text-xs">
                    <span class="text-amber-800">Cọc trước:</span>
                    <span class="font-bold text-amber-900">\${formatVND(court.deposit)}</span>
                  </div>
                </div>
              \` : ''}
            </div>
          </div>

          <div class="p-3 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
            \${court.status === 'active' ? \`
              <button type="button" data-court-pos="\${court.id}" class="py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold transition">+ Nước/Cầu</button>
              <button type="button" data-court-checkout="\${court.id}" class="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition">Thanh Toán</button>
            \` : ''}

            \${court.status === 'free' ? \`
              <button type="button" data-court-open="\${court.id}" class="col-span-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black transition">
                + Mở Sân Ngay (Check-in)
              </button>
            \` : ''}

            \${court.status === 'reserved' ? \`
              <button type="button" data-court-checkin-res="\${court.id}" class="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition">Nhận Sân</button>
              <button type="button" data-court-cancel-res="\${court.id}" class="py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 font-bold transition">Hủy Lịch</button>
            \` : ''}
          </div>
        </div>
      \`;
    }).join('');
  }

  function renderPOS() {
    const targetSelect = document.getElementById('pos-target-select');
    if (targetSelect) {
      const activeCourts = state.courts.filter(c => c.status === 'active');
      let opts = '<option value="retail" ' + (state.posTarget === 'retail' ? 'selected' : '') + '>💵 Khách mua lẻ tại quầy (Thu ngay)</option>';
      activeCourts.forEach(c => {
        const sel = String(c.id) === String(state.posTarget) ? 'selected' : '';
        opts += '<option value="' + c.id + '" ' + sel + '>🏸 Gắn vào ' + c.name + ' (' + c.zone + ') — ' + c.customer + '</option>';
      });
      targetSelect.innerHTML = opts;
    }

    document.querySelectorAll('.pos-cat-btn').forEach(btn => {
      const cat = btn.getAttribute('data-pos-cat');
      btn.className = cat === state.posCategory
        ? 'pos-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white whitespace-nowrap'
        : 'pos-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 whitespace-nowrap';
    });

    const q = (state.posSearch || '').toLowerCase().trim();
    const filteredProds = state.products.filter(p => {
      const matchCat = state.posCategory === 'all' || p.category === state.posCategory;
      const matchSearch = !q || p.name.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });

    const prodGrid = document.getElementById('pos-products-grid');
    if (prodGrid) {
      prodGrid.innerHTML = filteredProds.map(p => {
        const inCart = state.posCart.find(i => i.productId === p.id);
        return \`
          <button type="button" data-add-pos="\${p.id}" class="text-left bg-white p-3.5 rounded-2xl border \${inCart ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'} hover:border-emerald-500 shadow-xs transition flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">\${p.icon || '🏸'}</span>
                \${inCart ? ('<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">x' + inCart.qty + '</span>') : ''}
              </div>
              <p class="text-xs font-bold text-slate-900 line-clamp-2">\${p.name}</p>
            </div>
            <div class="pt-2 mt-2 border-t border-slate-100 flex items-baseline justify-between w-full">
              <span class="text-xs font-black text-emerald-600">\${formatVND(p.price)}</span>
              <span class="text-[10px] text-slate-400">Kho: \${p.stock}</span>
            </div>
          </button>
        \`;
      }).join('');
    }

    let cartTotal = 0;
    let cartCount = 0;
    const cartItems = document.getElementById('pos-cart-items');
    if (cartItems) {
      if (state.posCart.length === 0) {
        cartItems.innerHTML = '<div class="py-6 text-center text-slate-400 text-xs">Chưa có sản phẩm trong phiếu.</div>';
      } else {
        cartItems.innerHTML = state.posCart.map(i => {
          const prod = state.products.find(p => p.id === i.productId);
          if (!prod) return '';
          const line = prod.price * i.qty;
          cartTotal += line;
          cartCount += i.qty;
          return \`
            <div class="py-2 flex items-center justify-between text-xs gap-1.5">
              <div class="flex-1 truncate">
                <p class="font-bold text-slate-900 truncate">\${prod.name}</p>
                <p class="text-[10px] text-slate-500">\${formatVND(prod.price)}</p>
              </div>
              <div class="flex items-center gap-1">
                <button type="button" data-cart-dec="\${prod.id}" class="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold">-</button>
                <span class="w-5 text-center font-bold">\${i.qty}</span>
                <button type="button" data-cart-inc="\${prod.id}" class="w-6 h-6 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold">+</button>
              </div>
              <span class="font-black text-slate-900 min-w-[60px] text-right">\${formatVND(line)}</span>
            </div>
          \`;
        }).join('');
      }
    }

    const posCountEl = document.getElementById('pos-cart-count');
    if (posCountEl) posCountEl.textContent = cartCount + ' món';
    const posTotEl = document.getElementById('pos-cart-total');
    if (posTotEl) posTotEl.textContent = formatVND(cartTotal);

    const isRetail = state.posTarget === 'retail';
    const retailPay = document.getElementById('pos-retail-payment-box');
    if (retailPay) retailPay.classList.toggle('hidden', !isRetail);
    const subLabel = document.getElementById('btn-submit-pos-label');
    if (subLabel) subLabel.textContent = isRetail ? 'Thanh Toán Bán Lẻ Ngay' : 'Ghi Vào Sân Đang Chơi';
  }

  function renderSchedule() {
    const slots = ['06:00 - 08:00', '08:00 - 10:00', '14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00', '20:00 - 22:00'];
    const tbody = document.getElementById('schedule-timeline-body');
    if (tbody) {
      tbody.innerHTML = state.courts.map(court => {
        const cells = slots.map(slot => {
          const col = parseSlotRange(slot);
          const bk = state.bookings.find(b => {
            if (Number(b.courtId) !== court.id || b.status === 'cancelled') return false;
            const r = parseSlotRange(b.slot);
            return isTimeOverlapping(col.startMin, col.endMin, r.startMin, r.endMin);
          });

          if (bk) {
            const color = bk.status === 'checked_in' ? 'bg-emerald-600 text-white' : 'bg-amber-100 border border-amber-300 text-amber-950';
            return '<td class="p-1.5"><div class="p-2 rounded-xl ' + color + ' text-[11px] font-bold"><p class="truncate">' + bk.customer + '</p><span class="text-[10px] opacity-90">' + bk.slot + '</span></div></td>';
          }
          return \`
            <td class="p-1.5">
              <button type="button" data-quick-slot-court="\${court.id}" data-quick-slot-time="\${slot}" class="w-full py-2.5 px-2 rounded-xl border border-dashed border-slate-200 hover:border-emerald-500 text-[11px] text-slate-400 hover:text-emerald-700 font-semibold transition">
                + Đặt
              </button>
            </td>
          \`;
        }).join('');

        return \`
          <tr class="hover:bg-slate-50">
            <td class="py-3 px-4 font-black text-slate-900 sticky left-0 bg-white border-r border-slate-200">
              \${court.name}
              <span class="block text-[10px] font-normal text-slate-500">\${court.zone}</span>
            </td>
            \${cells}
          </tr>
        \`;
      }).join('');
    }

    const bkTbody = document.getElementById('bookings-table-body');
    const bkCount = document.getElementById('booking-count-label');
    if (bkCount) bkCount.textContent = state.bookings.length + ' lịch đặt';
    if (bkTbody) {
      bkTbody.innerHTML = state.bookings.map(b => {
        let statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Chờ nhận sân</span>';
        if (b.status === 'checked_in') statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Đang đánh</span>';
        if (b.status === 'cancelled') statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">Đã hủy</span>';

        return \`
          <tr class="hover:bg-slate-50">
            <td class="py-3 px-4 font-bold text-slate-900">\${b.customer}</td>
            <td class="py-3 px-4 text-slate-600">\${b.phone}</td>
            <td class="py-3 px-4 font-bold text-emerald-700">Sân \${b.courtId}</td>
            <td class="py-3 px-4 font-semibold">\${b.slot}</td>
            <td class="py-3 px-4"><span class="px-2 py-0.5 rounded bg-slate-100 text-[11px]">\${b.type}</span></td>
            <td class="py-3 px-4 text-right font-black">\${formatVND(b.deposit)}</td>
            <td class="py-3 px-4">\${statusBadge}</td>
            <td class="py-3 px-4 text-right">
              \${b.status === 'reserved' ? \`
                <button type="button" data-booking-checkin="\${b.id}" class="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px]">Nhận sân</button>
                <button type="button" data-booking-cancel="\${b.id}" class="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px]">Hủy</button>
              \` : '—'}
            </td>
          </tr>
        \`;
      }).join('');
    }
  }

  function renderInventory() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    tbody.innerHTML = state.products.map(p => {
      const profit = p.price - p.cost;
      const isLow = p.stock <= 15 && p.category !== 'rental';
      return \`
        <tr class="hover:bg-slate-50">
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <span class="text-lg">\${p.icon || '🏸'}</span>
              <div>
                <p class="font-bold text-slate-900">\${p.name}</p>
                <p class="text-[10px] text-slate-400">Mã: \${p.id.toUpperCase()}</p>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 text-slate-600">\${p.category}</td>
          <td class="py-3 px-4 text-slate-600">\${p.unit}</td>
          <td class="py-3 px-4 text-right text-slate-500">\${formatVND(p.cost)}</td>
          <td class="py-3 px-4 text-right font-black text-slate-900">\${formatVND(p.price)}</td>
          <td class="py-3 px-4 text-right font-bold text-emerald-600">+\${formatVND(profit)}</td>
          <td class="py-3 px-4 text-center">
            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold \${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}">
              \${p.stock} \${isLow ? '⚠️ Sắp hết' : ''}
            </span>
          </td>
          <td class="py-3 px-4 text-center font-bold text-slate-700">\${p.soldToday || 0}</td>
          <td class="py-3 px-4 text-right">
            <button type="button" data-restock-prod="\${p.id}" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-emerald-600 text-white font-bold text-[11px] transition">
              + Nhập 20
            </button>
          </td>
        </tr>
      \`;
    }).join('');
  }

  function renderReports() {
    document.querySelectorAll('.inv-filter-btn').forEach(btn => {
      const f = btn.getAttribute('data-inv-filter');
      btn.className = f === state.invoiceFilter
        ? 'inv-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white'
        : 'inv-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700';
    });

    const filtered = state.invoices.filter(i => state.invoiceFilter === 'all' || i.type === state.invoiceFilter);
    const tbody = document.getElementById('invoices-table-body');
    if (tbody) {
      tbody.innerHTML = filtered.slice().reverse().map(inv => \`
        <tr class="hover:bg-slate-50">
          <td class="py-3 px-4 font-mono font-bold text-slate-900">\${inv.id}</td>
          <td class="py-3 px-4 text-slate-500">\${inv.time}</td>
          <td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-[11px] font-bold \${inv.type === 'court' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}">\${inv.courtName}</span></td>
          <td class="py-3 px-4 font-bold text-slate-900">\${inv.customer}</td>
          <td class="py-3 px-4 text-right font-medium">\${formatVND(inv.courtFee)}</td>
          <td class="py-3 px-4 text-right font-medium text-amber-700">\${formatVND(inv.posFee)}</td>
          <td class="py-3 px-4 text-right font-black text-emerald-600">\${formatVND(inv.total)}</td>
          <td class="py-3 px-4"><span class="text-[11px] px-2 py-0.5 rounded bg-slate-100">\${inv.paymentMethod}</span></td>
          <td class="py-3 px-4 text-right">
            <button type="button" data-view-invoice="\${inv.id}" class="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 font-bold text-slate-700">Xem</button>
          </td>
        </tr>
      \`).join('');
    }

    renderCharts();
  }

  function renderCharts() {
    if (typeof Chart === 'undefined') return;
    const courtRev = state.invoices.reduce((s, i) => s + (i.courtFee || 0), 0);
    const posRev = state.invoices.reduce((s, i) => s + (i.posFee || 0), 0);

    const ctxWeekly = document.getElementById('chart-weekly-revenue');
    if (ctxWeekly) {
      if (weeklyChartInstance) weeklyChartInstance.destroy();
      weeklyChartInstance = new Chart(ctxWeekly, {
        type: 'bar',
        data: {
          labels: ['T7', 'CN', 'T2', 'T3', 'T4', 'T5', 'Hôm nay'],
          datasets: [
            { label: 'Tiền thuê sân', data: [1800000, 2100000, 1400000, 1500000, 1600000, 1750000, Math.max(courtRev, 850000)], backgroundColor: '#059669', borderRadius: 6 },
            { label: 'Doanh thu POS', data: [1200000, 1500000, 950000, 1100000, 1150000, 1250000, Math.max(posRev, 620000)], backgroundColor: '#f59e0b', borderRadius: 6 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: { x: { stacked: true }, y: { stacked: true } }
        }
      });
    }

    const ctxCat = document.getElementById('chart-category-share');
    if (ctxCat) {
      if (categoryChartInstance) categoryChartInstance.destroy();
      categoryChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
          labels: ['Tiền sân', 'Ống cầu', 'Nước giải khát', 'Quấn cán', 'Khác'],
          datasets: [{
            data: [Math.max(courtRev, 500000), 450000, 320000, 180000, 90000],
            backgroundColor: ['#059669', '#f59e0b', '#0284c7', '#7c3aed', '#64748b']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  }

  function openCheckoutModal(courtId) {
    const court = state.courts.find(c => c.id === Number(courtId));
    if (!court) return;
    state.activeCheckoutCourtId = court.id;
    document.getElementById('checkout-modal-title').textContent = 'Thanh Toán — ' + court.name + ' (' + court.zone + ')';
    document.getElementById('checkout-modal-subtitle').textContent = 'Khách: ' + court.customer + ' • Vào sân: ' + court.startTime;
    document.getElementById('checkout-rate-info').textContent = 'Đơn giá: ' + formatVND(court.hourlyRate) + '/giờ (Tối 17h-21h: 80k/h; Giờ khác: 60k/h)';
    document.getElementById('checkout-hours-input').value = court.bookedHours;
    document.getElementById('checkout-discount-input').value = court.deposit || 0;
    renderCheckoutModalItems();
    document.getElementById('modal-checkout').classList.remove('hidden');
  }

  function renderCheckoutModalItems() {
    const court = state.courts.find(c => c.id === Number(state.activeCheckoutCourtId));
    if (!court) return;
    const hours = parseFloat(document.getElementById('checkout-hours-input').value) || court.bookedHours;
    court.bookedHours = hours;
    const discount = parseFloat(document.getElementById('checkout-discount-input').value) || 0;
    const courtFee = Math.round(hours * court.hourlyRate);
    const posFee = getCourtPosTotal(court);
    const total = Math.max(0, courtFee + posFee - discount);

    document.getElementById('checkout-court-subtotal').textContent = formatVND(courtFee);
    document.getElementById('summary-court-fee').textContent = formatVND(courtFee);
    document.getElementById('summary-pos-fee').textContent = formatVND(posFee);
    document.getElementById('summary-discount-fee').textContent = '-' + formatVND(discount);
    document.getElementById('summary-grand-total').textContent = formatVND(total);

    const list = document.getElementById('checkout-items-list');
    if (!court.items || court.items.length === 0) {
      list.innerHTML = '<div class="p-3 text-center text-xs text-slate-400">Chưa có nước hay cầu nào được gọi.</div>';
    } else {
      list.innerHTML = court.items.map(it => \`
        <div class="p-2.5 flex items-center justify-between text-xs">
          <div>
            <p class="font-bold text-slate-900">\${it.name}</p>
            <p class="text-[10px] text-slate-500">\${formatVND(it.price)}</p>
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button" data-modal-item-dec="\${it.productId}" class="w-6 h-6 rounded bg-slate-100 font-bold">-</button>
            <span class="w-5 text-center font-bold">\${it.qty}</span>
            <button type="button" data-modal-item-inc="\${it.productId}" class="w-6 h-6 rounded bg-emerald-100 text-emerald-800 font-bold">+</button>
          </div>
          <span class="font-black text-slate-900 min-w-[70px] text-right">\${formatVND(it.price * it.qty)}</span>
        </div>
      \`).join('');
    }
  }

  function addProductToCourt(courtId, prodId, qty) {
    const court = state.courts.find(c => c.id === Number(courtId));
    const prod = state.products.find(p => p.id === prodId);
    if (!court || !prod) return;
    const exist = court.items.find(i => i.productId === prodId);
    if (exist) {
      exist.qty += qty;
      if (exist.qty <= 0) court.items = court.items.filter(i => i.productId !== prodId);
    } else if (qty > 0) {
      court.items.push({ productId: prod.id, name: prod.name, price: prod.price, qty });
    }
    if (qty > 0 && prod.category !== 'rental') prod.stock = Math.max(0, prod.stock - qty);
    prod.soldToday = (prod.soldToday || 0) + qty;
    saveState();
    renderAll();
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
        : 'addon-cat-btn px-2.5 py-1 rounded-lg font-bold bg-white text-slate-700 border border-slate-200 whitespace-nowrap';
    });

    const filtered = state.products.filter(p => {
      const mCat = cat === 'all' || p.category === cat;
      const mSearch = !q || p.name.toLowerCase().includes(q);
      return mCat && mSearch;
    });

    let fee = 0;
    Object.keys(state.customerAddons || {}).forEach(pId => {
      const qty = state.customerAddons[pId] || 0;
      const prod = state.products.find(p => p.id === pId);
      if (prod && qty > 0) fee += prod.price * qty;
    });
    const feeEl = document.getElementById('modal-addon-total-fee');
    if (feeEl) feeEl.textContent = formatVND(fee);

    modalList.innerHTML = filtered.map(p => {
      const qty = (state.customerAddons && state.customerAddons[p.id]) || 0;
      return \`
        <div class="py-2 px-1 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="text-base">\${p.icon || '🏸'}</span>
            <div>
              <p class="font-bold text-slate-900">\${p.name}</p>
              <p class="text-[10px] text-slate-500">\${formatVND(p.price)} / \${p.unit}</p>
            </div>
          </div>
          <div class="flex items-center gap-1 bg-white px-1.5 py-1 rounded-lg border border-slate-200">
            <button type="button" data-addon-dec="\${p.id}" class="w-6 h-6 rounded bg-slate-100 font-bold">-</button>
            <span class="w-5 text-center font-bold text-xs">\${qty}</span>
            <button type="button" data-addon-inc="\${p.id}" class="w-6 h-6 rounded bg-emerald-100 text-emerald-800 font-bold">+</button>
          </div>
        </div>
      \`;
    }).join('');
  }

  function scrollToFirstSelectableSlot(smooth = false) {
    const wrapper = document.getElementById('cust-matrix-scroll-wrapper');
    if (!wrapper) return;
    const curMin = getCurrentMinutes();
    const firstMin = getFirstSelectableMin(curMin, 30);
    const firstTime = minutesToTime(firstMin);
    const th = document.querySelector('[data-slot-start="' + firstTime + '"]');
    if (th) {
      wrapper.scrollTo({ left: Math.max(0, th.offsetLeft - 96), behavior: smooth ? 'smooth' : 'auto' });
    }
  }

  function renderAll() {
    updateRoleViewMode();
    renderCustomerPortal();
    renderKPIs();
    renderCourts();
    renderPOS();
    renderSchedule();
    renderInventory();
    if (state.activeTab === 'reports') renderReports();
  }

  // Event Listeners
  document.addEventListener('click', function (e) {
    const jumpBtn = e.target.closest('[data-jump-hour]');
    if (jumpBtn) {
      const hour = jumpBtn.getAttribute('data-jump-hour');
      const th = document.querySelector('[data-slot-start="' + hour + '"]');
      const wrapper = document.getElementById('cust-matrix-scroll-wrapper');
      if (th && wrapper) {
        wrapper.scrollTo({ left: Math.max(0, th.offsetLeft - 96), behavior: 'smooth' });
      }
      return;
    }

    const matrixBtn = e.target.closest('[data-matrix-slot-court]');
    if (matrixBtn) {
      const courtId = Number(matrixBtn.getAttribute('data-matrix-slot-court'));
      const slotStart = matrixBtn.getAttribute('data-matrix-slot-start');
      const slotEnd = matrixBtn.getAttribute('data-matrix-slot-end');
      const slotKey = slotStart + ' - ' + slotEnd;

      const isToday = (!state.customerDay || state.customerDay === 'today');
      if (isToday && timeToMinutes(slotStart) < getCurrentMinutes()) {
        showToast('Khung giờ ' + slotStart + ' đã qua rồi!', 'warn');
        return;
      }

      if (!state.customerCourtSlots[courtId]) state.customerCourtSlots[courtId] = [];
      const list = state.customerCourtSlots[courtId];
      const idx = list.indexOf(slotKey);
      if (idx >= 0) {
        list.splice(idx, 1);
        if (list.length === 0) delete state.customerCourtSlots[courtId];
      } else {
        list.push(slotKey);
        list.sort((a, b) => timeToMinutes(a.split('-')[0]) - timeToMinutes(b.split('-')[0]));
      }

      saveState();
      renderCustomerPortal();
      return;
    }

    if (e.target.closest('#btn-cust-clear-slots')) {
      state.customerCourtSlots = {};
      saveState();
      renderCustomerPortal();
      return;
    }

    if (e.target.closest('#btn-open-addon-picker')) {
      document.getElementById('modal-cust-addon-picker').classList.remove('hidden');
      renderAddonModal();
      return;
    }

    const addInc = e.target.closest('[data-addon-inc]');
    if (addInc) {
      const pId = addInc.getAttribute('data-addon-inc');
      state.customerAddons[pId] = (state.customerAddons[pId] || 0) + 1;
      saveState();
      renderCustomerPortal();
      renderAddonModal();
      return;
    }
    const addDec = e.target.closest('[data-addon-dec]');
    if (addDec) {
      const pId = addDec.getAttribute('data-addon-dec');
      const cur = state.customerAddons[pId] || 0;
      if (cur > 0) {
        state.customerAddons[pId] = cur - 1;
        if (state.customerAddons[pId] === 0) delete state.customerAddons[pId];
        saveState();
        renderCustomerPortal();
        renderAddonModal();
      }
      return;
    }

    const addCatBtn = e.target.closest('[data-addon-cat]');
    if (addCatBtn) {
      state.customerAddonCat = addCatBtn.getAttribute('data-addon-cat');
      renderAddonModal();
      return;
    }

    const dayBtn = e.target.closest('[data-cust-day]');
    if (dayBtn) {
      state.customerDay = dayBtn.getAttribute('data-cust-day') || 'today';
      state.customerCourtSlots = {};
      saveState();
      renderCustomerPortal();
      scrollToFirstSelectableSlot(true);
      return;
    }

    const custTab = e.target.closest('[data-cust-tab]');
    if (custTab) {
      state.customerTab = custTab.getAttribute('data-cust-tab');
      saveState();
      renderCustomerPortal();
      return;
    }

    const shopCat = e.target.closest('[data-cust-cat]');
    if (shopCat) {
      state.customerShopCat = shopCat.getAttribute('data-cust-cat');
      renderCustomerShop();
      return;
    }

    const shopAdd = e.target.closest('[data-cust-add-prod]');
    if (shopAdd) {
      state.customerCart.push({ productId: shopAdd.getAttribute('data-cust-add-prod'), qty: 1 });
      saveState();
      renderCustomerShop();
      return;
    }
    const shopInc = e.target.closest('[data-cust-cart-inc]');
    if (shopInc) {
      const item = state.customerCart.find(i => i.productId === shopInc.getAttribute('data-cust-cart-inc'));
      if (item) item.qty += 1;
      saveState();
      renderCustomerShop();
      return;
    }
    const shopDec = e.target.closest('[data-cust-cart-dec]');
    if (shopDec) {
      const pId = shopDec.getAttribute('data-cust-cart-dec');
      const item = state.customerCart.find(i => i.productId === pId);
      if (item) {
        item.qty -= 1;
        if (item.qty <= 0) state.customerCart = state.customerCart.filter(i => i.productId !== pId);
      }
      saveState();
      renderCustomerShop();
      return;
    }

    const navBtn = e.target.closest('[data-nav]');
    if (navBtn) {
      switchTab(navBtn.getAttribute('data-nav'));
      return;
    }

    const cfBtn = e.target.closest('[data-court-filter]');
    if (cfBtn) {
      state.courtFilter = cfBtn.getAttribute('data-court-filter');
      renderCourts();
      return;
    }

    const closeMod = e.target.closest('[data-close-modal]');
    if (closeMod) {
      document.getElementById(closeMod.getAttribute('data-close-modal')).classList.add('hidden');
      return;
    }

    const openCourt = e.target.closest('[data-court-open]');
    if (openCourt) {
      const cId = Number(openCourt.getAttribute('data-court-open'));
      const court = state.courts.find(c => c.id === cId);
      document.getElementById('checkin-court-id').value = cId;
      document.getElementById('modal-checkin-title').textContent = 'Mở ' + court.name + ' (' + court.zone + ')';
      document.getElementById('checkin-customer-name').value = '';
      document.getElementById('modal-checkin').classList.remove('hidden');
      return;
    }

    const checkOut = e.target.closest('[data-court-checkout]');
    if (checkOut) {
      openCheckoutModal(checkOut.getAttribute('data-court-checkout'));
      return;
    }

    const courtPos = e.target.closest('[data-court-pos]');
    if (courtPos) {
      state.posTarget = courtPos.getAttribute('data-court-pos');
      switchTab('pos');
      return;
    }

    const resCheckin = e.target.closest('[data-court-checkin-res]');
    if (resCheckin) {
      const court = state.courts.find(c => c.id === Number(resCheckin.getAttribute('data-court-checkin-res')));
      if (court) {
        court.status = 'active';
        court.elapsedMinutes = 1;
        saveState();
        renderAll();
        showToast('Đã nhận ' + court.name + ' cho khách ' + court.customer);
      }
      return;
    }

    const resCancel = e.target.closest('[data-court-cancel-res]');
    if (resCancel) {
      const court = state.courts.find(c => c.id === Number(resCancel.getAttribute('data-court-cancel-res')));
      if (court) {
        court.status = 'free';
        court.customer = '';
        court.deposit = 0;
        saveState();
        renderAll();
        showToast('Đã hủy đặt ' + court.name, 'warn');
      }
      return;
    }

    const modInc = e.target.closest('[data-modal-item-inc]');
    if (modInc && state.activeCheckoutCourtId) {
      addProductToCourt(state.activeCheckoutCourtId, modInc.getAttribute('data-modal-item-inc'), 1);
      renderCheckoutModalItems();
      return;
    }
    const modDec = e.target.closest('[data-modal-item-dec]');
    if (modDec && state.activeCheckoutCourtId) {
      addProductToCourt(state.activeCheckoutCourtId, modDec.getAttribute('data-modal-item-dec'), -1);
      renderCheckoutModalItems();
      return;
    }
    const quickAdd = e.target.closest('[data-quick-add]');
    if (quickAdd && state.activeCheckoutCourtId) {
      addProductToCourt(state.activeCheckoutCourtId, quickAdd.getAttribute('data-quick-add'), 1);
      renderCheckoutModalItems();
      return;
    }

    const posCat = e.target.closest('[data-pos-cat]');
    if (posCat) {
      state.posCategory = posCat.getAttribute('data-pos-cat');
      renderPOS();
      return;
    }

    const addPos = e.target.closest('[data-add-pos]');
    if (addPos) {
      const pId = addPos.getAttribute('data-add-pos');
      const ex = state.posCart.find(i => i.productId === pId);
      if (ex) ex.qty += 1;
      else state.posCart.push({ productId: pId, qty: 1 });
      renderKPIs();
      renderPOS();
      return;
    }

    const cartInc = e.target.closest('[data-cart-inc]');
    if (cartInc) {
      const ex = state.posCart.find(i => i.productId === cartInc.getAttribute('data-cart-inc'));
      if (ex) ex.qty += 1;
      renderKPIs();
      renderPOS();
      return;
    }
    const cartDec = e.target.closest('[data-cart-dec]');
    if (cartDec) {
      const pId = cartDec.getAttribute('data-cart-dec');
      const ex = state.posCart.find(i => i.productId === pId);
      if (ex) {
        ex.qty -= 1;
        if (ex.qty <= 0) state.posCart = state.posCart.filter(i => i.productId !== pId);
      }
      renderKPIs();
      renderPOS();
      return;
    }

    const posPay = e.target.closest('[data-pos-pay]');
    if (posPay) {
      state.posPaymentMethod = posPay.getAttribute('data-pos-pay');
      document.querySelectorAll('.pos-pay-method-btn').forEach(b => {
        const act = b.getAttribute('data-pos-pay') === state.posPaymentMethod;
        b.className = act
          ? 'pos-pay-method-btn py-2 px-3 rounded-xl border text-xs font-bold bg-emerald-50 border-emerald-500 text-emerald-800'
          : 'pos-pay-method-btn py-2 px-3 rounded-xl border text-xs font-bold bg-white border-slate-200 text-slate-600';
      });
      return;
    }

    const qSlot = e.target.closest('[data-quick-slot-court]');
    if (qSlot) {
      document.getElementById('booking-court').value = qSlot.getAttribute('data-quick-slot-court');
      document.getElementById('booking-slot').value = qSlot.getAttribute('data-quick-slot-time');
      document.getElementById('modal-booking').classList.remove('hidden');
      return;
    }

    const bkIn = e.target.closest('[data-booking-checkin]');
    if (bkIn) {
      const bk = state.bookings.find(b => b.id === bkIn.getAttribute('data-booking-checkin'));
      if (bk) {
        bk.status = 'checked_in';
        const court = state.courts.find(c => c.id === Number(bk.courtId));
        if (court) {
          court.status = 'active';
          court.customer = bk.customer;
          court.startTime = bk.slot.split('-')[0].trim();
          court.deposit = bk.deposit;
        }
        saveState();
        renderAll();
        showToast('Đã nhận sân cho ' + bk.customer);
      }
      return;
    }

    const restock = e.target.closest('[data-restock-prod]');
    if (restock) {
      const p = state.products.find(item => item.id === restock.getAttribute('data-restock-prod'));
      if (p) {
        p.stock += 20;
        saveState();
        renderAll();
        showToast('Đã nhập thêm 20 ' + p.unit + ' ' + p.name);
      }
      return;
    }

    const viewInv = e.target.closest('[data-view-invoice]');
    if (viewInv) {
      const inv = state.invoices.find(i => i.id === viewInv.getAttribute('data-view-invoice'));
      if (inv) {
        document.getElementById('inv-detail-title').textContent = 'Hóa Đơn ' + inv.id;
        document.getElementById('inv-detail-time').textContent = 'Giờ: ' + inv.time + ' • ' + inv.paymentMethod;
        const items = (inv.items || []).map(it => \`
          <div class="flex justify-between py-1 border-b border-slate-100">
            <span>\${it.name} x\${it.qty}</span>
            <span class="font-bold">\${formatVND(it.price * it.qty)}</span>
          </div>
        \`).join('');
        document.getElementById('inv-detail-body').innerHTML = \`
          <div class="text-center pb-2 border-b border-slate-200">
            <h4 class="font-extrabold text-sm text-slate-900">SMASHCOURT PRO</h4>
            <p class="text-[10px] text-slate-500">11 Lê Khôi • Hotline: 0988.123.456</p>
            <p class="text-[11px] font-bold text-emerald-700 mt-1">\${inv.courtName} — Khách: \${inv.customer}</p>
          </div>
          <div class="py-1">\${items}</div>
          <div class="pt-2 flex justify-between text-sm font-black text-emerald-700 border-t border-slate-200">
            <span>TỔNG CỘNG:</span>
            <span>\${formatVND(inv.total)}</span>
          </div>
        \`;
        document.getElementById('modal-invoice-detail').classList.remove('hidden');
      }
      return;
    }
  });

  // Forms
  const loginForm = document.getElementById('form-admin-login');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const u = document.getElementById('admin-username-input').value.trim().toLowerCase();
      const p = document.getElementById('admin-password-input').value.trim();
      if (u === 'admin' && p === 'admin') {
        state.isAdminLoggedIn = true;
        state.viewMode = 'admin';
        document.getElementById('modal-admin-login').classList.add('hidden');
        saveState();
        renderAll();
        showToast('Đăng nhập Quản Lý thành công!');
      } else {
        document.getElementById('admin-login-error').classList.remove('hidden');
      }
    });
  }

  const btnAutofill = document.getElementById('btn-autofill-admin');
  if (btnAutofill) {
    btnAutofill.addEventListener('click', function () {
      document.getElementById('admin-username-input').value = 'admin';
      document.getElementById('admin-password-input').value = 'admin';
    });
  }

  const btnToggleCust = document.getElementById('btn-toggle-customer-preview');
  if (btnToggleCust) {
    btnToggleCust.addEventListener('click', function () {
      state.viewMode = state.viewMode === 'admin' ? 'customer' : 'admin';
      saveState();
      renderAll();
    });
  }

  const btnLogout = document.getElementById('btn-admin-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', function () {
      state.isAdminLoggedIn = false;
      state.viewMode = 'customer';
      saveState();
      renderAll();
      showToast('Đã đăng xuất tài khoản Quản Lý');
    });
  }

  const btnReset = document.getElementById('btn-reset-demo');
  if (btnReset) {
    btnReset.addEventListener('click', function () {
      const wasAdmin = state.isAdminLoggedIn;
      state = getInitialState();
      state.isAdminLoggedIn = wasAdmin;
      saveState();
      renderAll();
      showToast('Đã khôi phục dữ liệu mẫu ban đầu!');
    });
  }

  const btnOpenAdmin = document.getElementById('btn-open-admin-login');
  if (btnOpenAdmin) {
    btnOpenAdmin.addEventListener('click', function () {
      document.getElementById('admin-login-error').classList.add('hidden');
      document.getElementById('modal-admin-login').classList.remove('hidden');
    });
  }

  const btnNewBk = document.getElementById('btn-open-new-booking');
  if (btnNewBk) {
    btnNewBk.addEventListener('click', function () {
      document.getElementById('modal-booking').classList.remove('hidden');
    });
  }

  const btnNewProd = document.getElementById('btn-open-new-product');
  if (btnNewProd) {
    btnNewProd.addEventListener('click', function () {
      document.getElementById('modal-product').classList.remove('hidden');
    });
  }

  const btnQuickPos = document.getElementById('btn-quick-pos-from-courts');
  if (btnQuickPos) {
    btnQuickPos.addEventListener('click', function () {
      state.posTarget = 'retail';
      switchTab('pos');
    });
  }

  const btnCheckoutPos = document.getElementById('btn-checkout-go-pos');
  if (btnCheckoutPos) {
    btnCheckoutPos.addEventListener('click', function () {
      if (state.activeCheckoutCourtId) state.posTarget = String(state.activeCheckoutCourtId);
      document.getElementById('modal-checkout').classList.add('hidden');
      switchTab('pos');
    });
  }

  const btnClearPos = document.getElementById('btn-clear-pos-cart');
  if (btnClearPos) {
    btnClearPos.addEventListener('click', function () {
      state.posCart = [];
      renderKPIs();
      renderPOS();
    });
  }

  const posTargetSelect = document.getElementById('pos-target-select');
  if (posTargetSelect) {
    posTargetSelect.addEventListener('change', function (e) {
      state.posTarget = e.target.value;
      renderPOS();
    });
  }

  const posSearchInput = document.getElementById('pos-search-input');
  if (posSearchInput) {
    posSearchInput.addEventListener('input', function (e) {
      state.posSearch = e.target.value;
      renderPOS();
    });
  }

  const btnSubPos = document.getElementById('btn-submit-pos-order');
  if (btnSubPos) {
    btnSubPos.addEventListener('click', function () {
      if (state.posCart.length === 0) {
        showToast('Giỏ hàng POS đang trống!', 'warn');
        return;
      }

      if (state.posTarget === 'retail') {
        let total = 0;
        const items = [];
        state.posCart.forEach(item => {
          const p = state.products.find(prod => prod.id === item.productId);
          if (p) {
            total += p.price * item.qty;
            if (p.category !== 'rental') p.stock = Math.max(0, p.stock - item.qty);
            p.soldToday = (p.soldToday || 0) + item.qty;
            items.push({ name: p.name, qty: item.qty, price: p.price });
          }
        });

        const newId = 'HD-2610-0' + (state.invoices.length + 1);
        state.invoices.push({
          id: newId,
          time: new Date().toTimeString().slice(0, 5),
          type: 'retail',
          courtName: 'Quầy POS',
          customer: 'Khách mua lẻ',
          courtFee: 0,
          posFee: total,
          discount: 0,
          total,
          paymentMethod: state.posPaymentMethod === 'transfer' ? 'Chuyển khoản QR' : 'Tiền mặt',
          items
        });
        state.posCart = [];
        saveState();
        renderAll();
        showToast('Đã thanh toán đơn bán lẻ ' + formatVND(total));
      } else {
        const court = state.courts.find(c => String(c.id) === String(state.posTarget));
        if (!court) return;
        state.posCart.forEach(item => addProductToCourt(court.id, item.productId, item.qty));
        state.posCart = [];
        saveState();
        renderAll();
        showToast('Đã ghi toàn bộ nước & phụ kiện vào ' + court.name + '!');
      }
    });
  }

  const formCheckin = document.getElementById('form-checkin-court');
  if (formCheckin) {
    formCheckin.addEventListener('submit', function (e) {
      e.preventDefault();
      const cId = Number(document.getElementById('checkin-court-id').value);
      const court = state.courts.find(c => c.id === cId);
      if (!court) return;

      const name = document.getElementById('checkin-customer-name').value.trim() || 'Khách vãng lai';
      const rateType = document.getElementById('checkin-customer-type').value;
      const dur = parseFloat(document.getElementById('checkin-duration').value) || 1.5;

      court.status = 'active';
      court.customer = name;
      court.rateType = rateType;
      court.hourlyRate = rateType === 'peak' ? 80000 : 60000;
      court.bookedHours = dur;
      court.startTime = new Date().toTimeString().slice(0, 5);
      court.elapsedMinutes = 1;
      court.deposit = 0;
      court.items = [];

      if (document.getElementById('checkin-quick-shuttle').checked) addProductToCourt(court.id, 'p11', 1);
      if (document.getElementById('checkin-quick-revive').checked) addProductToCourt(court.id, 'p1', 4);

      document.getElementById('modal-checkin').classList.add('hidden');
      saveState();
      renderAll();
      showToast('Đã mở ' + court.name + ' cho ' + name + '!');
    });
  }

  const chkHours = document.getElementById('checkout-hours-input');
  if (chkHours) chkHours.addEventListener('input', renderCheckoutModalItems);
  const chkDisc = document.getElementById('checkout-discount-input');
  if (chkDisc) chkDisc.addEventListener('input', renderCheckoutModalItems);

  const btnConfirmChk = document.getElementById('btn-confirm-court-checkout');
  if (btnConfirmChk) {
    btnConfirmChk.addEventListener('click', function () {
      const court = state.courts.find(c => c.id === Number(state.activeCheckoutCourtId));
      if (!court) return;
      const hours = parseFloat(document.getElementById('checkout-hours-input').value) || court.bookedHours;
      const discount = parseFloat(document.getElementById('checkout-discount-input').value) || 0;
      const courtFee = Math.round(hours * court.hourlyRate);
      const posFee = getCourtPosTotal(court);
      const grandTotal = Math.max(0, courtFee + posFee - discount);

      const items = [{ name: 'Tiền thuê ' + court.name + ' (' + hours + ' giờ)', qty: 1, price: courtFee }];
      (court.items || []).forEach(it => items.push({ name: it.name, qty: it.qty, price: it.price }));

      const newId = 'HD-2610-0' + (state.invoices.length + 1);
      state.invoices.push({
        id: newId,
        time: new Date().toTimeString().slice(0, 5),
        type: 'court',
        courtName: court.name,
        customer: court.customer,
        courtFee,
        posFee,
        discount,
        total: grandTotal,
        paymentMethod: 'Tiền mặt',
        items
      });

      court.status = 'free';
      court.customer = '';
      court.items = [];
      court.elapsedMinutes = 0;
      court.deposit = 0;

      document.getElementById('modal-checkout').classList.add('hidden');
      saveState();
      renderAll();
      showToast('Đã thu ' + formatVND(grandTotal) + ' và trả ' + court.name + '!');
    });
  }

  const formNewBk = document.getElementById('form-new-booking');
  if (formNewBk) {
    formNewBk.addEventListener('submit', function (e) {
      e.preventDefault();
      const customer = document.getElementById('booking-customer').value.trim();
      const phone = document.getElementById('booking-phone').value.trim();
      const courtId = Number(document.getElementById('booking-court').value);
      const slot = document.getElementById('booking-slot').value.trim();
      const type = document.getElementById('booking-type').value;
      const deposit = Number(document.getElementById('booking-deposit').value) || 0;

      state.bookings.unshift({
        id: 'BK-' + (100 + state.bookings.length + 1),
        customer, phone, courtId, slot, type, deposit,
        status: 'reserved'
      });

      document.getElementById('modal-booking').classList.add('hidden');
      document.getElementById('form-new-booking').reset();
      saveState();
      renderAll();
      showToast('Đã tạo lịch đặt Sân ' + courtId + ' cho ' + customer);
    });
  }

  const formNewProd = document.getElementById('form-new-product');
  if (formNewProd) {
    formNewProd.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = document.getElementById('prod-name').value.trim();
      const category = document.getElementById('prod-category').value;
      const unit = document.getElementById('prod-unit').value.trim();
      const cost = Number(document.getElementById('prod-cost').value) || 0;
      const price = Number(document.getElementById('prod-price').value) || 15000;
      const stock = Number(document.getElementById('prod-stock').value) || 20;

      const iconMap = { drink: '🥤', grip: '🎾', shuttle: '🏸', rental: '👟' };
      state.products.push({
        id: 'p' + (state.products.length + 1),
        name, category, unit, cost, price, stock,
        soldToday: 0,
        icon: iconMap[category] || '🏸'
      });

      document.getElementById('modal-product').classList.add('hidden');
      document.getElementById('form-new-product').reset();
      saveState();
      renderAll();
      showToast('Đã thêm "' + name + '" vào menu POS');
    });
  }

  const formCustBk = document.getElementById('form-customer-booking');
  if (formCustBk) {
    formCustBk.addEventListener('submit', function (e) {
      e.preventDefault();
      const activeCourtIds = Object.keys(state.customerCourtSlots || {})
        .filter(cId => Array.isArray(state.customerCourtSlots[cId]) && state.customerCourtSlots[cId].length > 0)
        .map(Number);

      if (activeCourtIds.length === 0) {
        showToast('Vui lòng chạm chọn ít nhất 1 khung giờ trên bảng ma trận!', 'warn');
        return;
      }

      const name = document.getElementById('cust-book-name').value.trim();
      const phone = document.getElementById('cust-book-phone').value.trim();
      const bookedCourtNames = [];

      activeCourtIds.forEach(cId => {
        const slots = state.customerCourtSlots[cId];
        const slotStr = slots.join(', ');
        const newBkId = 'BK-' + (100 + state.bookings.length + 1);
        state.bookings.unshift({
          id: newBkId,
          customer: name,
          phone,
          courtId: cId,
          slot: slotStr,
          type: 'Khách Đặt Online',
          deposit: 50000,
          status: 'reserved'
        });

        const target = state.courts.find(c => c.id === cId);
        if (target && target.status === 'free') {
          target.status = 'reserved';
          target.customer = name + ' (' + slotStr + ')';
          target.startTime = slots[0].split('-')[0].trim();
          target.deposit = 50000;
        }
        bookedCourtNames.push('Sân ' + cId);
      });

      const firstCId = activeCourtIds[0];
      Object.keys(state.customerAddons || {}).forEach(pId => {
        const qty = state.customerAddons[pId] || 0;
        if (qty > 0) addProductToCourt(firstCId, pId, qty);
      });

      state.customerCourtSlots = {};
      state.customerAddons = {};
      formCustBk.reset();
      saveState();
      renderAll();
      showToast('Đặt thành công ' + bookedCourtNames.join(', ') + '! Quầy thu ngân đã nhận thông tin.');
    });
  }

  const btnCustOrder = document.getElementById('btn-cust-submit-order');
  if (btnCustOrder) {
    btnCustOrder.addEventListener('click', function () {
      if (!state.customerCart || state.customerCart.length === 0) {
        showToast('Giỏ hàng của bạn đang trống!', 'warn');
        return;
      }

      const delivery = document.getElementById('cust-order-delivery').value;
      const note = document.getElementById('cust-order-note').value.trim() || 'Khách đặt online';

      if (delivery === 'retail') {
        let total = 0;
        const items = [];
        state.customerCart.forEach(i => {
          const p = state.products.find(prod => prod.id === i.productId);
          if (p) {
            total += p.price * i.qty;
            if (p.category !== 'rental') p.stock = Math.max(0, p.stock - i.qty);
            p.soldToday = (p.soldToday || 0) + i.qty;
            items.push({ name: p.name, qty: i.qty, price: p.price });
          }
        });

        const newId = 'HD-2610-0' + (state.invoices.length + 1);
        state.invoices.push({
          id: newId,
          time: new Date().toTimeString().slice(0, 5),
          type: 'retail',
          courtName: 'Đặt Online',
          customer: note,
          courtFee: 0,
          posFee: total,
          discount: 0,
          total,
          paymentMethod: 'Chuyển khoản QR',
          items
        });
        state.customerCart = [];
        document.getElementById('cust-order-note').value = '';
        saveState();
        renderAll();
        showToast('Đã gửi đơn hàng (' + formatVND(total) + ') tới quầy thu ngân!');
      } else {
        const cId = Number(delivery);
        state.customerCart.forEach(i => addProductToCourt(cId, i.productId, i.qty));
        state.customerCart = [];
        document.getElementById('cust-order-note').value = '';
        saveState();
        renderAll();
        showToast('Đã báo nhân viên mang đồ ra Sân ' + cId + '!');
      }
    });
  }

  // Live Clock
  setInterval(() => {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8);
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayStr = dayNames[now.getDay()];
    const dateStr = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
    const clockEl = document.getElementById('live-clock-display');
    if (clockEl) clockEl.textContent = timeStr + ' - ' + dayStr + ', ' + dateStr;
  }, 1000);

  // Initial Run
  renderAll();
  setTimeout(() => scrollToFirstSelectableSlot(false), 80);
\`;

console.log("APP_LOGIC_JS defined, size:", APP_LOGIC_JS.length);
