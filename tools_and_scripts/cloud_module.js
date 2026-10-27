      // Supabase RPCs are the only authority for business mutations.
      const SUPABASE_CONFIG = {
        url: 'https://goxvubxvyrcrjzscftab.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdveHZ1Ynh2eXJjcmp6c2NmdGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MDk2NDksImV4cCI6MjEwNzk4NTY0OX0.1oV8z5-waRqJ1oSy5z6x9be0zI-UvyKBNjKzeobiJDk'
      };
      let supabaseClient = null, revision = null, serverGeneration = 0;
      let writeBusy = false, readBusy = false, pendingNotices = null, ready = false;
      let orders = [], lastRenderMinute = '', currentDialog = null, returnFocus = null;
      const deviceToken = getDeviceToken();

      function getDeviceToken() {
        const key = 'smashcourt_device_token';
        try {
          const saved = localStorage.getItem(key);
          if (/^[a-f0-9]{64}$/.test(saved || '')) return saved;
          const value = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
          localStorage.setItem(key, value); return value;
        } catch { return null; }
      }
      function setSyncMessage(message, warning = false) {
        const el = document.getElementById('sync-message');
        if (el) { el.textContent = message; el.hidden = !message; el.style.background = warning ? '#fef3c7' : '#ecfdf5'; }
      }
      function updateSupabaseBadge(online) {
        const badge = document.getElementById('supabase-status-badge');
        if (badge) badge.classList.add('hidden');
      }
      async function rpc(name, args) {
        if (!supabaseClient) throw new Error('Chưa kết nối máy chủ. Vui lòng thử lại; bản nháp vẫn được giữ.');
        const { data, error } = await supabaseClient.rpc(name, args);
        if (error) { const failure=new Error(error.message || 'Máy chủ từ chối thao tác.'); failure.code=error.code; throw failure; }
        return data;
      }
      function businessSnapshot() {
        return JSON.parse(JSON.stringify({ courts: state.courts, products: state.products, bookings: state.bookings, invoices: state.invoices }));
      }
      const { mapCourtFromDb, mapBookingFromDb, mapProductFromDb, mapInvoiceFromDb } = globalThis.SmashCourtCloudModels;
      function applySnapshot(data) {
        if (!data || !Number.isSafeInteger(data.revision) || !['courts','products','bookings','invoices'].every(k => Array.isArray(data[k]))) throw new Error('Dữ liệu máy chủ không hợp lệ. Cần chạy migration trước.');
        state.courts = data.courts.map(mapCourtFromDb);
        state.products = data.products.map(mapProductFromDb);
        state.bookings = data.bookings.map(mapBookingFromDb);
        state.invoices = data.invoices.map(mapInvoiceFromDb);
        for (const inv of state.invoices.filter(i => Core.invoiceDate(i) === Core.dateKey())) for (const item of inv.items) {
          const product = state.products.find(p => p.id === item.productId);
          if (product) product.soldToday += item.qty;
        }
        orders = data.orders || []; revision = data.revision; serverGeneration++; ready = true;
        updateSupabaseBadge(true); setSyncMessage(''); saveState(); renderAll();
      }
      async function syncFromSupabase(silent = false) {
        if (readBusy || writeBusy) return;
        readBusy = true;
        const generation = serverGeneration;
        try {
          const data = await rpc('app_read_state', { p_device_token: deviceToken || '' });
          if (!writeBusy && generation === serverGeneration) applySnapshot(data);
        } catch (error) {
          ready = false; updateSupabaseBadge(false);
          setSyncMessage('Không thể kết nối máy chủ. Thay đổi chưa lưu vẫn được giữ; vui lòng thử lại sau.', true);
          if (!silent) console.warn(error);
        } finally { readBusy = false; }
      }
      function guarded(fn) {
        return async function (event) {
          if (event?.type === 'click' && event.currentTarget === document && event.target.closest('button[type=submit],input[type=submit]')) return;
          if (writeBusy) { event?.preventDefault?.(); return; }
          if(state.isAdminLoggedIn && sessionStorage.getItem('smashcourt_pending_admin_write')) {
            event?.preventDefault?.();
            writeBusy=true;
            try {await recoverAdminWrite();showToast('Đã đối chiếu thao tác trước với máy chủ.');}
            catch(error){setSyncMessage(error.message,true);showToast(error.message,'warn');}
            finally{writeBusy=false;}
            return;
          }
          const formBefore=[...document.querySelectorAll('input,select,textarea')].map(el=>({el,id:el.id,value:el.value,checked:el.checked}));
          const dialogsBefore=[...document.querySelectorAll('[role=dialog]')].map(el=>({el,hidden:el.classList.contains('hidden')}));
          const before = JSON.parse(JSON.stringify(state)), businessBefore = businessSnapshot();
          writeBusy = true; serverGeneration++; const actionGeneration = serverGeneration; pendingNotices = [];
          try {
            await fn.call(this, event);
            const after = businessSnapshot();
            if (actionGeneration === serverGeneration && JSON.stringify(after) !== JSON.stringify(businessBefore)) {
              if (!state.isAdminLoggedIn || !ready || revision === null) throw new Error('Cần đăng nhập quản trị và kết nối máy chủ để lưu thay đổi.');
              setSyncMessage('Đang lưu thay đổi…');
              const args = { p_state: Object.fromEntries(Object.keys(after).map(key=>[key,after[key].filter(row=>JSON.stringify(row)!==JSON.stringify(businessBefore[key].find(old=>old.id===row.id)))])), p_revision: revision, p_operation_id: Core.id('OP') };
              sessionStorage.setItem('smashcourt_pending_admin_write',JSON.stringify({args,draftAfter:{posCart:state.posCart,customerCart:state.customerCart,customerAddons:state.customerAddons,customerCourtSlots:state.customerCourtSlots}}));
              const data=await rpc('app_admin_commit',args);
              applySnapshot(data);
              sessionStorage.removeItem('smashcourt_pending_admin_write');
            }
            const notices = pendingNotices; pendingNotices = null;
            for (const [message, type] of notices) showToast(message, type);
            saveState();
          } catch (error) {
            // Retain inputs and carts, but never keep a failed optimistic business mutation.
            if (actionGeneration === serverGeneration) state = before;
            if(error.code)sessionStorage.removeItem('smashcourt_pending_admin_write');
            pendingNotices = null; renderAll(); saveState();
            for(const saved of formBefore){const el=saved.id?document.getElementById(saved.id):saved.el;if(el){el.value=saved.value;el.checked=saved.checked;}}
            for(const saved of dialogsBefore)saved.el.classList.toggle('hidden',saved.hidden);
            ready=false;
            setSyncMessage('Chưa lưu được thay đổi. Dữ liệu vẫn được giữ để bạn thử lại.', true);
            showToast('Chưa lưu được thay đổi. Dữ liệu vẫn được giữ để bạn thử lại.', 'warn');
          } finally { writeBusy = false; }
          if (!ready) void syncFromSupabase(true);
        };
      }
      async function recoverAdminWrite() {
        const pending=JSON.parse(sessionStorage.getItem('smashcourt_pending_admin_write')||'null');
        if(!pending)return;
        try {
          const data=await rpc('app_admin_commit',pending.args);
          Object.assign(state,pending.draftAfter);applySnapshot(data);
          sessionStorage.removeItem('smashcourt_pending_admin_write');
        } catch(error){if(error.code)sessionStorage.removeItem('smashcourt_pending_admin_write');throw error;}
      }
      async function loginAdmin(username, password) {
        if (!supabaseClient) throw new Error('Chưa kết nối được dịch vụ đăng nhập.');
        const identifier = username.trim();
        const email = identifier.toLowerCase() === 'admin' ? 'hoang.kttn711@gmail.com' : identifier;
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error || !globalThis.SmashCourtCloudModels.hasAdminRole(data.user)) {
          await supabaseClient.auth.signOut();
          document.getElementById('admin-login-error').classList.remove('hidden');
          throw new Error('Tài khoản, mật khẩu hoặc quyền quản trị không hợp lệ.');
        }
        state.isAdminLoggedIn = true; state.viewMode = 'admin';
        applySnapshot(await rpc('app_read_state', {p_device_token:deviceToken || ''}));
        document.getElementById('modal-admin-login').classList.add('hidden');
        document.getElementById('admin-password-input').value = '';
        showToast('Đã đăng nhập quản trị.');
      }
      function clearAdminViews() {
        for(const id of ['courts-grid','bookings-table-body','inventory-table-body','invoices-table-body','admin-alobo-matrix-body','pending-orders','pos-products-grid','pos-cart-items','checkout-items-list','inv-detail-body']) document.getElementById(id)?.replaceChildren();
        for(const id of ['modal-checkout','modal-invoice-detail','modal-checkin','modal-booking','modal-product']) document.getElementById(id)?.classList.add('hidden');
        if(weeklyChartInstance){weeklyChartInstance.destroy();weeklyChartInstance=null;}
        if(categoryChartInstance){categoryChartInstance.destroy();categoryChartInstance=null;}
      }
      async function logoutAdmin() {
        if (supabaseClient) { const { error } = await supabaseClient.auth.signOut(); if (error) throw error; }
        state.isAdminLoggedIn = false; state.viewMode = 'customer';
        state.invoices = []; orders = []; sessionStorage.removeItem('smashcourt_pending_admin_write');
        for (const id of ['courts-grid','bookings-table-body','inventory-table-body','invoices-table-body','admin-alobo-matrix-body','pending-orders','pos-products-grid']) {
          const el = document.getElementById(id); if (el) el.replaceChildren();
        }
        applySnapshot(await rpc('app_read_state', {p_device_token:deviceToken || ''}));
      }
      function validateBooking(courtId, slot, date) { return globalThis.SmashCourtBookingRules.validateBooking(courtId, slot, date, state.courts, state.bookings, getCurrentMinutes); }
      function slotStartMinSafe(court, start, end) { return globalThis.SmashCourtBookingRules.slotStartMinSafe(court, start, end, getCurrentMinutes); }
      function reconcileCourtReservation(courtId) {
        const court = state.courts.find(c => c.id === courtId);
        if (!court || ['active','maintenance'].includes(court.status)) return;
        const next = state.bookings.filter(b => b.courtId === courtId && b.status === 'reserved' && b.bookingDate === Core.dateKey()).sort((a,b) => a.slot.localeCompare(b.slot))[0];
        court.status = next ? 'reserved' : 'free'; court.customer = next?.customer || '';
        court.deposit = next?.deposit || 0; court.bookingId = next?.id || null;
        if (next) { const r = bookingRanges(next)[0]; if (r) { court.startTime=Core.time(r.startMin); court.bookedHours=(r.endMin-r.startMin)/60; } }
      }
      const { checkoutFee } = globalThis.SmashCourtBookingRules;
      function netCourtRevenue(inv) { return Math.round(inv.total * inv.courtFee / (inv.courtFee + inv.posFee || 1)); }
      function weeklyRevenue(field) {
        return Array.from({length:7},(_,i) => {
          const day = Core.dateKey(new Date(new Date(Core.dateKey()+'T12:00:00+07:00').getTime()-(6-i)*86400000));
          return state.invoices.filter(inv => Core.invoiceDate(inv) === day).reduce((sum,inv) => sum+(field==='courtFee'?netCourtRevenue(inv):inv.total-netCourtRevenue(inv)),0);
        });
      }
      async function submitCustomerBooking() {
        if (!deviceToken || !ready) throw new Error('Cần bộ nhớ thiết bị và kết nối máy chủ để đặt sân.');
        const name = document.getElementById('cust-book-name').value.trim(), phone = document.getElementById('cust-book-phone').value.trim();
        if (!name || !/^[+\d .()-]{8,25}$/.test(phone)) throw new Error('Vui lòng nhập tên và số điện thoại hợp lệ.');
        const requests = [];
        for (const [key, slots] of Object.entries(state.customerCourtSlots || {})) {
          if (!Array.isArray(slots) || !slots.length) continue;
          // Separate rows for each contiguous range keep session check-in and cancellation unambiguous.
          const rs = Core.ranges(slots.join(', '),true), groups=[];
          for (const r of rs) { const last=groups.at(-1); if(last && last.endMin===r.startMin) last.endMin=r.endMin; else groups.push({...r}); }
          for (const r of groups) {
            const slot=Core.time(r.startMin)+' - '+Core.time(r.endMin);
            requests.push({id:Core.id('BK'),court_id:Number(key),booking_date:selectedDate(),slot,customer:name,phone});
          }
        }
        if (!requests.length) throw new Error('Chọn ít nhất một khung giờ trên bảng.');
        const addons = Object.entries(state.customerAddons || {}).filter(([,qty])=>qty>0).map(([productId,qty])=>({productId,qty}));
        const requestKey = JSON.stringify({requests:requests.map(({id,...r})=>r),addons});
        const previous=JSON.parse(localStorage.getItem('smashcourt_pending_booking')||'null');
        if(previous?.payload!==requestKey)for(const r of requests)validateBooking(r.court_id,r.slot,r.booking_date);
        const operationId = pendingOperation('booking',requestKey);
        const result = await rpc('app_reserve', {p_device_token:deviceToken,p_requests:requests,p_addons:addons,p_operation_id:operationId});
        state.myDeviceBookingIds.unshift(...result.booking_ids.filter(id=>!state.myDeviceBookingIds.includes(id)));
        state.customerCourtSlots={}; state.customerAddons={}; state.customerSelectedSlots=[];
        state.customerSelectedCourtId=null; state.customerStartTime=''; state.customerEndTime='';
        clearPendingOperation('booking'); applySnapshot(result.state);
        document.getElementById('form-customer-booking').reset(); showToast('Máy chủ đã xác nhận lịch đặt. Chưa ghi nhận tiền cọc.');
      }
      function pendingOperation(kind, payload) {
        const key='smashcourt_pending_'+kind;
        const prior=JSON.parse(localStorage.getItem(key)||'null');
        if(prior?.payload===payload) return prior.id;
        const id=Core.id('OP'); localStorage.setItem(key,JSON.stringify({id,payload})); return id;
      }
      function clearPendingOperation(kind) { localStorage.removeItem('smashcourt_pending_'+kind); }
      async function submitCustomerOrder() {
        if (!deviceToken || !ready || !state.customerCart.length) throw new Error('Chọn sản phẩm và kết nối máy chủ trước khi gửi.');
        const target=document.getElementById('cust-order-delivery').value;
        let bookingId=null;
        if(target!=='retail') {
          const own=state.bookings.find(b=>state.myDeviceBookingIds.includes(b.id)&&b.courtId===Number(target)&&b.status==='checked_in'&&b.bookingDate===Core.dateKey());
          if(!own) throw new Error('Chỉ giao vào sân thuộc lịch đang chơi của bạn; hoặc chọn nhận tại quầy.');
          bookingId=own.id;
        }
        const items=state.customerCart.map(i=>({productId:i.productId,qty:i.qty}));
        const note=document.getElementById('cust-order-note').value.trim();
        const op=pendingOperation('order',JSON.stringify({bookingId,items,note}));
        const data=await rpc('app_place_order',{p_device_token:deviceToken,p_booking_id:bookingId,p_items:items,p_note:note,p_operation_id:op});
        state.customerCart=[]; clearPendingOperation('order'); document.getElementById('cust-order-note').value=''; applySnapshot(data);
        showToast('Đã gửi đơn chờ nhân viên xác nhận và thu tiền.');
      }
      function renderPendingOrders() {
        const el=document.getElementById('pending-orders'); if(!el) return;
        const pending=orders.filter(o=>o.status==='pending');
        const warnings=legacyWarnings();
        el.classList.toggle('hidden',pending.length===0&&!warnings);
        el.innerHTML=warnings+(pending.length?`
          <div class="rounded-2xl border border-amber-200 bg-white shadow-xs overflow-hidden">
            <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-amber-100 bg-amber-50/70">
              <h3 class="text-sm font-bold text-slate-900">Đơn chờ xác nhận</h3>
              <span class="min-w-7 h-7 px-2 rounded-full bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center">${pending.length}</span>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 sm:p-4">${pending.map(o=>`
              <article class="rounded-xl border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="min-w-0 space-y-1">
                  <p class="text-sm font-semibold text-slate-900">${Core.escapeHTML(o.note||'Nhận tại quầy')}</p>
                  <p class="text-xs text-slate-600">${o.items.map(i=>Core.escapeHTML(i.name)+' × '+i.qty).join(', ')}</p>
                  <p class="text-sm font-bold text-emerald-700">${formatVND(o.total)}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2 shrink-0">
                  <button type="button" class="min-h-10 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold" data-accept-order="${Core.escapeHTML(o.id)}">Xác nhận</button>
                  <button type="button" class="min-h-10 px-3 py-2 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold" data-reject-order="${Core.escapeHTML(o.id)}">Từ chối</button>
                </div>
              </article>`).join('')}</div>
          </div>`:'');
      }
      function legacyWarnings() {
        const bookings=state.bookings.filter(b=>!b.bookingDate&&b.status==='reserved');
        const courts=state.courts.filter(c=>c.status==='active'&&(!c.startedAt||!c.sessionId));
        return (localStorage.getItem('smashcourt_legacy_backup')?'<p class="border border-amber-400 p-3">Có bản sao dữ liệu cũ trên thiết bị. <button class="border rounded p-2" data-export-legacy>Tải bản sao JSON để đối chiếu</button></p>':'')+bookings.map(b=>'<div class="border border-amber-400 rounded p-3"><p>Lịch cũ chưa có ngày: '+Core.escapeHTML(b.customer)+' • '+Core.escapeHTML(b.slot)+'</p><input aria-label="Ngày thực tế của lịch cũ" type="date"><button data-assign-date="'+Core.escapeHTML(b.id)+'" class="border rounded p-2">Xác nhận ngày lịch cũ</button></div>').join('')+
          courts.map(c=>'<div class="border border-amber-400 rounded p-3"><p>'+Core.escapeHTML(c.name)+' chưa có giờ vào thực tế. Kiểm tra trước khi thu tiền.</p><input aria-label="Giờ vào thực tế" type="datetime-local"><button data-recover-court="'+c.id+'" class="border rounded p-2">Khôi phục phiên đang chơi</button></div>').join('');
      }
      async function rejectPendingOrder(id) {
        if(!state.isAdminLoggedIn)throw new Error('Cần quyền quản trị.');
        applySnapshot(await rpc('app_reject_order',{p_order_id:id,p_revision:revision}));showToast('Đã từ chối đơn, không thu tiền hoặc trừ kho.');
      }
      async function acceptPendingOrder(id) {
        if(!state.isAdminLoggedIn) throw new Error('Cần quyền quản trị.');
        applySnapshot(await rpc('app_accept_order',{p_order_id:id,p_revision:revision}));
        showToast('Đã xác nhận đơn.');
      }
      function setupDialogs() {
        const update=()=>{
          const visible=[...document.querySelectorAll('[role="dialog"]')].filter(el=>!el.classList.contains('hidden'));
          const next=visible.at(-1)||null;
          if(next!==currentDialog) {
            if(next) {next.setAttribute('aria-label',next.querySelector('h3,h2')?.textContent||'Hộp thoại');returnFocus=document.activeElement; currentDialog=next; (next.querySelector('input,button,select')||next).focus();}
            else {currentDialog=null;returnFocus?.focus?.();returnFocus=null;}
          }
        };
        new MutationObserver(update).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
        document.addEventListener('keydown',e=>{
          if(!currentDialog)return;
          if(e.key==='Escape'&&!writeBusy){currentDialog.classList.add('hidden');return;}
          if(e.key==='Tab'){
            const all=[...currentDialog.querySelectorAll('button,input,select,textarea,[tabindex]')].filter(el=>!el.disabled&&el.getClientRects().length);
            const first=all[0],last=all.at(-1);
            if(!first){e.preventDefault();return;}
            if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
            else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
          }
        });
      }
      async function bootstrap() {
        try {
          supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url,SUPABASE_CONFIG.anonKey);
          const { data:{session}, error }=await supabaseClient.auth.getSession(); if(error)throw error;
          // getUser validates the persisted session before privileged UI is shown.
          if(session){const {data:{user},error:userError}=await supabaseClient.auth.getUser();state.isAdminLoggedIn=!userError&&globalThis.SmashCourtCloudModels.hasAdminRole(user);}
          state.viewMode=state.isAdminLoggedIn?'admin':'customer';
          supabaseClient.auth.onAuthStateChange((event,session)=>{
            if(event==='SIGNED_OUT'||(!session&&state.isAdminLoggedIn)){
              state.isAdminLoggedIn=false;state.viewMode='customer';state.invoices=[];orders=[];
              state.bookings=[];state.courts=getInitialState().courts.map(c=>({...c,status:'maintenance'}));
              serverGeneration++;ready=false;renderAll();setTimeout(()=>syncFromSupabase(true),0);
            }
          });
          if(state.isAdminLoggedIn)await recoverAdminWrite();
          await syncFromSupabase();
        } catch(error){ready=false;updateSupabaseBadge(false);setSyncMessage(error.message,true);}
        setupHorizontalScrollInteractions(); setupDialogs(); scrollToFirstSelectableSlot(false);
      }
      renderAll(); void bootstrap();
      setInterval(()=>{if(document.visibilityState!=='hidden')void syncFromSupabase(true);},15000);
      window.addEventListener('focus',()=>void syncFromSupabase(true));
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)void syncFromSupabase(true);});
      setInterval(()=>{
        const key=Core.dateKey()+':'+getCurrentMinutes();
        if(key!==lastRenderMinute&&!writeBusy){lastRenderMinute=key;renderAll();}
      },1000);
