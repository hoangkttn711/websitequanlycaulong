const fs = require('fs');
const path = require('path');

console.log('=== APPLYING HORIZONTAL SCROLL & WHEEL ENHANCEMENTS ===');

// 1. UPDATE app_logic.js
const appLogicPath = path.join(__dirname, 'app_logic.js');
let appLogic = fs.readFileSync(appLogicPath, 'utf8');

const scrollFunctions = `
      function scrollToMatrixTime(time, smooth = true) {
        const wrapper = document.getElementById('cust-matrix-scroll-wrapper');
        if (!wrapper) return;
        const targetTh = document.querySelector(\`[data-slot-start="\${time}"]\`);
        const stickyTh = document.getElementById('cust-alobo-matrix-header')?.firstElementChild;
        const stickyWidth = stickyTh ? stickyTh.offsetWidth : 80;
        if (targetTh) {
          const scrollPos = Math.max(0, targetTh.offsetLeft - stickyWidth);
          wrapper.scrollTo({ left: scrollPos, behavior: smooth ? 'smooth' : 'auto' });
        }
      }

      function setupHorizontalScrollInteractions() {
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
`;

const origScrollFn = `      function scrollToFirstSelectableSlot(smooth = false) {
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

        const targetTh = document.querySelector(\`[data-slot-start="\${firstTime}"]\`);
        const stickyTh = document.getElementById('cust-alobo-matrix-header')?.firstElementChild;
        const stickyWidth = stickyTh ? stickyTh.offsetWidth : 80;

        if (targetTh) {
          const scrollPos = Math.max(0, targetTh.offsetLeft - stickyWidth);
          wrapper.scrollTo({ left: scrollPos, behavior: smooth ? 'smooth' : 'auto' });
        }
      }`;

if (!appLogic.includes('function setupHorizontalScrollInteractions()')) {
  appLogic = appLogic.replace(origScrollFn, origScrollFn + '\n' + scrollFunctions);
  
  // Also call setupHorizontalScrollInteractions in renderCustomerPortal / renderAll / timeout
  appLogic = appLogic.replace(
    'scrollToFirstSelectableSlot(false);',
    'scrollToFirstSelectableSlot(false);\n        setupHorizontalScrollInteractions();'
  );
  
  // Call in renderCustomerPortal at the end
  appLogic = appLogic.replace(
    'renderCustomerSlotMatrix();',
    'renderCustomerSlotMatrix();\n        setTimeout(setupHorizontalScrollInteractions, 10);'
  );

  fs.writeFileSync(appLogicPath, appLogic, 'utf8');
  console.log('✓ app_logic.js updated with horizontal scroll & mouse grab features');
} else {
  console.log('• app_logic.js already has scroll functions');
}

// 2. NAV & JUMP BAR HTML SNIPPET
const navBarHTML = `
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
          </div>`;

// 3. UPDATE build_index.js
const buildIndexPath = path.join(__dirname, 'build_index.js');
let buildIndexContent = fs.readFileSync(buildIndexPath, 'utf8');
const indexTarget = `<span class="text-[11px] text-slate-400">Vuốt ngang xem từ 5h đến 23h</span>
          </div>`;
if (buildIndexContent.includes(indexTarget) && !buildIndexContent.includes('btn-matrix-scroll-left')) {
  buildIndexContent = buildIndexContent.replace(indexTarget, indexTarget + '\n' + navBarHTML);
  fs.writeFileSync(buildIndexPath, buildIndexContent, 'utf8');
  console.log('✓ build_index.js updated with quick nav controls');
}

// 4. UPDATE build_pc.js
const buildPcPath = path.join(__dirname, 'build_pc.js');
let buildPcContent = fs.readFileSync(buildPcPath, 'utf8');
const pcTarget = `<span class="text-[11px] text-slate-400">Cuộn ngang bảng để xem từ 05:00 đến 23:00</span>
          </div>`;
if (buildPcContent.includes(pcTarget) && !buildPcContent.includes('btn-matrix-scroll-left')) {
  buildPcContent = buildPcContent.replace(pcTarget, pcTarget + '\n' + navBarHTML);
  fs.writeFileSync(buildPcPath, buildPcContent, 'utf8');
  console.log('✓ build_pc.js updated with quick nav controls');
}

// 5. UPDATE build_mobile.js
const buildMobilePath = path.join(__dirname, 'build_mobile.js');
let buildMobileContent = fs.readFileSync(buildMobilePath, 'utf8');
const mobileTarget = `<p class="text-[11px] text-slate-500">👉 Nhấp vào ô trống để chọn giờ • Vuốt ngang để xem ca tối</p>`;
const mobileJumpBar = `
        <!-- Fast Jump Bar on Mobile -->
        <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
          <span class="text-[10px] font-bold text-slate-400 whitespace-nowrap">⚡ Nhảy nhanh:</span>
          <button type="button" data-matrix-jump="05:00" class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold whitespace-nowrap">🌅 5h</button>
          <button type="button" data-matrix-jump="12:00" class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold whitespace-nowrap">☀️ 12h</button>
          <button type="button" data-matrix-jump="17:00" class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold whitespace-nowrap">🌙 17h</button>
        </div>`;
if (buildMobileContent.includes(mobileTarget) && !buildMobileContent.includes('data-matrix-jump')) {
  buildMobileContent = buildMobileContent.replace(mobileTarget, mobileTarget + '\n' + mobileJumpBar);
  fs.writeFileSync(buildMobilePath, buildMobileContent, 'utf8');
  console.log('✓ build_mobile.js updated with quick nav controls');
}

console.log('=== ALL SOURCE FILES ENHANCED SUCCESSFULLY ===');
