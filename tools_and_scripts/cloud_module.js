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
        if (badge) { badge.textContent = online ? 'Đã đồng bộ máy chủ' : 'Chưa kết nối máy chủ'; badge.classList.remove('hidden'); }
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
      function mapCourtFromDb(c) {
        return { id: Number(c.id), name: c.name, zone: c.zone, matColor: c.mat_color, status: c.status,
          customer: c.customer || '', rateType: c.rate_type || 'normal', hourlyRate: Number(c.hourly_rate ?? 60000),
          startTime: c.start_time || '', bookedHours: Number(c.booked_hours ?? 1.5), elapsedMinutes: Number(c.elapsed_minutes ?? 0),
          deposit: Number(c.deposit ?? 0), items: c.items || [], startedAt: c.started_at, sessionId: c.session_id, bookingId: c.booking_id };
      }
      function mapBookingFromDb(b) {
        return { id: b.id, customer: b.customer || '', phone: b.phone || '', courtId: Number(b.court_id), slot: b.slot,
          bookingDate: b.booking_date, type: b.type || 'Khách đặt Online', deposit: Number(b.deposit ?? 0), status: b.status,
          createdAt: b.created_at, isMine: b.is_mine === true };
      }
      function mapProductFromDb(p) {
        return { id: p.id, name: p.name, category: p.category, unit: p.unit, cost: Number(p.cost ?? 0), price: Number(p.price),
          stock: Number(p.stock), soldToday: 0, icon: p.icon || '🏸' };
      }
      function applySnapshot(data) {
        if (!data || !Number.isSafeInteger(data.revision) || !['courts','products','bookings','invoices'].every(k => Array.isArray(data[k]))) throw new Error('Dữ liệu máy chủ không hợp lệ. Cần chạy migration trước.');
        state.courts = data.courts.map(mapCourtFromDb);
        state.products = data.products.map(mapProductFromDb);
        state.bookings = data.bookings.map(mapBookingFromDb);
        state.invoices = data.invoices.map(i => ({ id:i.id, time:i.time, type:i.type, courtName:i.court_name, customer:i.customer,
          courtFee:Number(i.court_fee), posFee:Number(i.pos_fee), discount:Number(i.discount), total:Number(i.total),
          paymentMethod:i.payment_method, items:i.items || [], createdAt:i.created_at, paymentAmount:i.payment_amount,
          depositApplied:i.deposit_applied, refundAmount:i.refund_amount, sessionId:i.session_id }));
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
          setSyncMessage('Chưa đồng bộ: ' + error.message, true);
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
            setSyncMessage(error.message + ' Dữ liệu nhập được giữ để thử lại.', true);
            showToast(error.message, 'warn');
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
      async function loginAdmin(email, password) {
        if (!supabaseClient) throw new Error('Chưa kết nối được dịch vụ đăng nhập.');
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error || data.user?.app_metadata?.role !== 'admin') {
          await supabaseClient.auth.signOut();
          document.getElementById('admin-login-error').classList.remove('hidden');
          throw new Error('Email, mật khẩu hoặc quyền quản trị không hợp lệ.');
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
      function validateBooking(courtId, slot, date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || date < Core.dateKey()) throw new Error('Ngày đặt không hợp lệ.');
        const rs = Core.ranges(slot, true), court = state.courts.find(c => c.id === courtId);
        if (!court || court.status === 'maintenance') throw new Error('Sân chưa sẵn sàng.');
        for (const r of rs) {
          if (date === Core.dateKey() && r.startMin < getCurrentMinutes()) throw new Error('Khung giờ đã qua.');
          if (state.bookings.some(b => b.courtId === courtId && b.bookingDate === date && ['reserved','checked_in'].includes(b.status) && bookingRanges(b).some(x => Core.overlap(x,r)))) throw new Error('Khung giờ vừa có người đặt.');
          if (date === Core.dateKey() && slotStartMinSafe(court,r.startMin,r.endMin)) throw new Error('Khung giờ trùng phiên đang chơi.');
        }
      }
      function slotStartMinSafe(court, start, end) {
        if (court.status !== 'active') return false;
        if (!court.startedAt || Core.dateKey(court.startedAt) !== Core.dateKey()) return true;
        const a = Core.nowMinutes(court.startedAt), b = Math.min(1380, Math.max(a + Number(court.bookedHours)*60, getCurrentMinutes()+1));
        return Core.overlap({startMin:start,endMin:end},{startMin:a,endMin:b});
      }
      function reconcileCourtReservation(courtId) {
        const court = state.courts.find(c => c.id === courtId);
        if (!court || ['active','maintenance'].includes(court.status)) return;
        const next = state.bookings.filter(b => b.courtId === courtId && b.status === 'reserved' && b.bookingDate === Core.dateKey()).sort((a,b) => a.slot.localeCompare(b.slot))[0];
        court.status = next ? 'reserved' : 'free'; court.customer = next?.customer || '';
        court.deposit = next?.deposit || 0; court.bookingId = next?.id || null;
        if (next) { const r = bookingRanges(next)[0]; if (r) { court.startTime=Core.time(r.startMin); court.bookedHours=(r.endMin-r.startMin)/60; } }
      }
      function checkoutFee(court, hours) {
        const start = Core.minutes(court.startTime);
        if (start + hours*60 > 1380 || !Number.isInteger(hours*60)) throw new Error('Thời lượng vượt giờ đóng cửa hoặc không hợp lệ.');
        return Core.fee(court.startTime, Core.time(start + hours*60)).fee;
      }
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
        el.innerHTML=legacyWarnings()+'<h3 class="font-bold">Đơn chờ xác nhận ('+orders.filter(o=>o.status==='pending').length+')</h3>'+orders.filter(o=>o.status==='pending').map(o=>
          '<div class="border rounded-xl p-3 my-2"><p>'+Core.escapeHTML(o.note||'Nhận tại quầy')+'</p><p>'+o.items.map(i=>Core.escapeHTML(i.name)+' × '+i.qty).join(', ')+'</p><p>'+formatVND(o.total)+'</p><button class="bg-emerald-600 text-white rounded px-3 py-2" data-accept-order="'+Core.escapeHTML(o.id)+'">Xác nhận đã thu tiền / giao vào sân</button><button class="border rounded px-3 py-2 ml-2" data-reject-order="'+Core.escapeHTML(o.id)+'">Từ chối đơn</button></div>').join('');
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
          if(session){const {data:{user},error:userError}=await supabaseClient.auth.getUser();state.isAdminLoggedIn=!userError&&user?.app_metadata?.role==='admin';}
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
