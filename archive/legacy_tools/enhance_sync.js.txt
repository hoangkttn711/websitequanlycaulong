const fs = require('fs');

let js = fs.readFileSync('c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js', 'utf8');

// Replace the setupSupabaseRealtime and syncFromSupabase section with enhanced resilient sync
const targetCode = `      // Kích hoạt kết nối và đồng bộ Supabase Realtime
      if (typeof syncFromSupabase === 'function') {
        syncFromSupabase();
      }
      if (typeof setupSupabaseRealtime === 'function') {
        setupSupabaseRealtime();
      }`;

const enhancedInit = `      // Kích hoạt kết nối và đồng bộ Supabase Realtime
      if (typeof syncFromSupabase === 'function') {
        syncFromSupabase();
      }
      if (typeof setupSupabaseRealtime === 'function') {
        setupSupabaseRealtime();
      }

      // ==================== ROCK-SOLID AUTO-SYNC POLLING (MỖI 3 GIÂY) ====================
      // Đảm bảo dù mạng yếu hoặc WebSocket bị ngắt thì máy tính & điện thoại LUÔN đồng bộ 100%
      setInterval(function () {
        if (typeof syncFromSupabase === 'function' && document.visibilityState !== 'hidden') {
          syncFromSupabase(true);
        }
      }, 3000);

      // Làm tươi ngay lập tức khi người dùng bấm quay lại tab
      window.addEventListener('focus', function () {
        if (typeof syncFromSupabase === 'function') {
          syncFromSupabase(true);
        }
      });

      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && typeof syncFromSupabase === 'function') {
          syncFromSupabase(true);
        }
      });`;

if (js.includes(targetCode)) {
  js = js.replace(targetCode, enhancedInit);
  console.log('Added 3-second auto-sync and visibility sync');
} else {
  console.warn('Target code not found for enhancedInit');
}

// Enhance syncFromSupabase so it compares and only re-renders if data actually changed
const oldSyncFn = `async function syncFromSupabase() {
        if (!supabaseClient) {
          updateSupabaseBadge(false);
          return;
        }
        try {
          const [courtsRes, prodsRes, bksRes, invsRes] = await Promise.all([
            supabaseClient.from('courts').select('*').order('id', { ascending: true }),
            supabaseClient.from('products').select('*'),
            supabaseClient.from('bookings').select('*'),
            supabaseClient.from('invoices').select('*').order('created_at', { ascending: false })
          ]);

          let hasUpdates = false;

          if (courtsRes.data && courtsRes.data.length > 0) {
            state.courts = courtsRes.data.map(mapCourtFromDb);
            hasUpdates = true;
          }
          if (prodsRes.data && prodsRes.data.length > 0) {
            state.products = prodsRes.data.map(mapProductFromDb);
            hasUpdates = true;
          }
          if (bksRes.data) {
            state.bookings = bksRes.data.map(mapBookingFromDb);
            hasUpdates = true;
          }
          if (invsRes.data && invsRes.data.length > 0) {
            state.invoices = invsRes.data.map(i => ({
              id: i.id,
              time: i.time,
              type: i.type,
              courtName: i.court_name || i.courtName,
              customer: i.customer,
              courtFee: Number(i.court_fee || i.courtFee || 0),
              posFee: Number(i.pos_fee || i.posFee || 0),
              discount: Number(i.discount || 0),
              total: Number(i.total || 0),
              paymentMethod: i.payment_method || i.paymentMethod || 'Tiền mặt',
              items: Array.isArray(i.items) ? i.items : []
            }));
            hasUpdates = true;
          }

          if (hasUpdates) {
            saveState();
            renderAll();
          }
          updateSupabaseBadge(true);
        } catch (err) {
          console.warn('Supabase sync failed, using local storage:', err);
          updateSupabaseBadge(false);
        }
      }`;

const newSyncFn = `async function syncFromSupabase(isSilent) {
        if (!supabaseClient) {
          updateSupabaseBadge(false);
          return;
        }
        try {
          const [courtsRes, prodsRes, bksRes, invsRes] = await Promise.all([
            supabaseClient.from('courts').select('*').order('id', { ascending: true }),
            supabaseClient.from('products').select('*'),
            supabaseClient.from('bookings').select('*'),
            supabaseClient.from('invoices').select('*').order('created_at', { ascending: false })
          ]);

          let hasChanges = false;

          if (bksRes.data) {
            const mappedBks = bksRes.data.map(mapBookingFromDb);
            const currentIds = (state.bookings || []).map(b => b.id).sort().join(',');
            const newIds = mappedBks.map(b => b.id).sort().join(',');
            if (currentIds !== newIds || JSON.stringify(state.bookings) !== JSON.stringify(mappedBks)) {
              state.bookings = mappedBks;
              hasChanges = true;
            }
          }

          if (courtsRes.data && courtsRes.data.length > 0) {
            const mappedCourts = courtsRes.data.map(mapCourtFromDb);
            if (JSON.stringify(state.courts) !== JSON.stringify(mappedCourts)) {
              state.courts = mappedCourts;
              hasChanges = true;
            }
          }

          if (prodsRes.data && prodsRes.data.length > 0) {
            const mappedProds = prodsRes.data.map(mapProductFromDb);
            if (JSON.stringify(state.products) !== JSON.stringify(mappedProds)) {
              state.products = mappedProds;
              hasChanges = true;
            }
          }

          if (invsRes.data && invsRes.data.length > 0) {
            const mappedInvs = invsRes.data.map(i => ({
              id: i.id,
              time: i.time,
              type: i.type,
              courtName: i.court_name || i.courtName,
              customer: i.customer,
              courtFee: Number(i.court_fee || i.courtFee || 0),
              posFee: Number(i.pos_fee || i.posFee || 0),
              discount: Number(i.discount || 0),
              total: Number(i.total || 0),
              paymentMethod: i.payment_method || i.paymentMethod || 'Tiền mặt',
              items: Array.isArray(i.items) ? i.items : []
            }));
            if (JSON.stringify(state.invoices) !== JSON.stringify(mappedInvs)) {
              state.invoices = mappedInvs;
              hasChanges = true;
            }
          }

          if (hasChanges) {
            saveState();
            renderAll();
            console.log('🔄 Đã tự động cập nhật dữ liệu mới nhất từ Supabase!');
          }
          updateSupabaseBadge(true);
        } catch (err) {
          if (!isSilent) console.warn('Supabase sync warning:', err);
          updateSupabaseBadge(false);
        }
      }`;

if (js.includes(oldSyncFn)) {
  js = js.replace(oldSyncFn, newSyncFn);
  console.log('Optimized syncFromSupabase with diff checking');
} else {
  console.warn('oldSyncFn not matched exactly');
}

fs.writeFileSync('c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js', js, 'utf8');
console.log('Updated app_logic.js successfully!');
