const fs = require('fs');

const SUPABASE_URL = 'https://goxvubxvyrcrjzscftab.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdveHZ1Ynh2eXJjcmp6c2NmdGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MDk2NDksImV4cCI6MjEwNzk4NTY0OX0.1oV8z5-waRqJ1oSy5z6x9be0zI-UvyKBNjKzeobiJDk';

// 1. Read app_logic.js
let js = fs.readFileSync('c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js', 'utf8');

// The Supabase Realtime Integration Code to inject
const supabaseModule = `
      // ==================== SUPABASE REALTIME SYNC MODULE ====================
      const SUPABASE_CONFIG = {
        url: '${SUPABASE_URL}',
        anonKey: '${SUPABASE_ANON_KEY}'
      };

      let supabaseClient = null;
      try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
          console.log('✓ Supabase Client initialized successfully');
        }
      } catch (err) {
        console.warn('Supabase initialization failed, falling back to local mode:', err);
      }

      function updateSupabaseBadge(isOnline) {
        const badge = document.getElementById('supabase-status-badge');
        if (badge) {
          badge.classList.remove('hidden');
          if (isOnline) {
            badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[10px] sm:text-[11px] font-bold';
            badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot"></span><span>Realtime Cloud</span>';
          } else {
            badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] sm:text-[11px] font-medium';
            badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span><span>Offline Cache</span>';
          }
        }
      }

      function mapCourtFromDb(c) {
        return {
          id: Number(c.id),
          name: c.name,
          zone: c.zone,
          matColor: c.mat_color || c.matColor || 'green',
          status: c.status || 'free',
          customer: c.customer || '',
          rateType: c.rate_type || c.rateType || 'normal',
          hourlyRate: Number(c.hourly_rate || c.hourlyRate || 60000),
          startTime: c.start_time || c.startTime || '',
          bookedHours: Number(c.booked_hours || c.bookedHours || 1.5),
          elapsedMinutes: Number(c.elapsed_minutes || c.elapsedMinutes || 0),
          deposit: Number(c.deposit || 0),
          items: Array.isArray(c.items) ? c.items : []
        };
      }

      function mapCourtToDb(c) {
        return {
          id: c.id,
          name: c.name,
          zone: c.zone,
          mat_color: c.matColor,
          status: c.status,
          customer: c.customer || '',
          rate_type: c.rateType,
          hourly_rate: c.hourlyRate,
          start_time: c.startTime || '',
          booked_hours: c.bookedHours || 1.5,
          elapsed_minutes: c.elapsedMinutes || 0,
          deposit: c.deposit || 0,
          items: c.items || [],
          updated_at: new Date().toISOString()
        };
      }

      function mapBookingFromDb(b) {
        return {
          id: b.id,
          customer: b.customer,
          phone: b.phone,
          courtId: Number(b.court_id || b.courtId),
          slot: b.slot,
          type: b.type || 'Khách đặt Online',
          deposit: Number(b.deposit || 0),
          status: b.status || 'reserved'
        };
      }

      function mapBookingToDb(b) {
        return {
          id: b.id,
          customer: b.customer,
          phone: b.phone,
          court_id: Number(b.courtId),
          slot: b.slot,
          type: b.type || 'Khách đặt Online',
          deposit: Number(b.deposit || 0),
          status: b.status || 'reserved'
        };
      }

      function mapProductFromDb(p) {
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          unit: p.unit,
          cost: Number(p.cost || 0),
          price: Number(p.price || 0),
          stock: Number(p.stock || 0),
          soldToday: Number(p.sold_today || p.soldToday || 0),
          icon: p.icon || '🏸'
        };
      }

      function syncBookingToSupabase(bk, targetCourt) {
        if (!supabaseClient) return;
        supabaseClient.from('bookings').insert([mapBookingToDb(bk)]).then(res => {
          if (res.error) console.warn('Supabase booking insert error:', res.error);
        });
        if (targetCourt) {
          supabaseClient.from('courts').update(mapCourtToDb(targetCourt)).eq('id', targetCourt.id).then(res => {
            if (res.error) console.warn('Supabase court update error:', res.error);
          });
        }
      }

      function syncCourtToSupabase(court) {
        if (!supabaseClient) return;
        supabaseClient.from('courts').update(mapCourtToDb(court)).eq('id', court.id).then(res => {
          if (res.error) console.warn('Supabase court update error:', res.error);
        });
      }

      function syncInvoiceToSupabase(inv) {
        if (!supabaseClient) return;
        supabaseClient.from('invoices').insert([{
          id: inv.id,
          time: inv.time,
          type: inv.type,
          court_name: inv.courtName,
          customer: inv.customer || '',
          court_fee: inv.courtFee || 0,
          pos_fee: inv.posFee || 0,
          discount: inv.discount || 0,
          total: inv.total || 0,
          payment_method: inv.paymentMethod || 'Tiền mặt',
          items: inv.items || []
        }]).then(res => {
          if (res.error) console.warn('Supabase invoice insert error:', res.error);
        });
      }

      async function syncFromSupabase() {
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
      }

      function setupSupabaseRealtime() {
        if (!supabaseClient) return;

        supabaseClient.channel('smashcourt_realtime_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'courts' }, payload => {
            console.log('⚡ Realtime Court Change:', payload);
            if (payload.new && payload.new.id) {
              const mapped = mapCourtFromDb(payload.new);
              const idx = state.courts.findIndex(c => c.id === mapped.id);
              if (idx !== -1) {
                state.courts[idx] = mapped;
              }
              saveState();
              renderAll();
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
            console.log('⚡ Realtime Booking Change:', payload);
            if (payload.eventType === 'INSERT' && payload.new) {
              const mapped = mapBookingFromDb(payload.new);
              if (!state.bookings.find(b => b.id === mapped.id)) {
                state.bookings.unshift(mapped);
                if (state.isAdminLoggedIn) {
                  showToast('🔔 Có khách đặt sân mới: ' + mapped.slot);
                }
              }
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const mapped = mapBookingFromDb(payload.new);
              const idx = state.bookings.findIndex(b => b.id === mapped.id);
              if (idx !== -1) state.bookings[idx] = mapped;
            } else if (payload.eventType === 'DELETE' && payload.old) {
              state.bookings = state.bookings.filter(b => b.id !== payload.old.id);
            }
            saveState();
            renderAll();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
            if (payload.new && payload.new.id) {
              const mapped = mapProductFromDb(payload.new);
              const idx = state.products.findIndex(p => p.id === mapped.id);
              if (idx !== -1) {
                state.products[idx] = mapped;
                saveState();
                renderAll();
              }
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, payload => {
            if (payload.eventType === 'INSERT' && payload.new) {
              const inv = payload.new;
              const mapped = {
                id: inv.id,
                time: inv.time,
                type: inv.type,
                courtName: inv.court_name || inv.courtName,
                customer: inv.customer,
                courtFee: Number(inv.court_fee || inv.courtFee || 0),
                posFee: Number(inv.pos_fee || inv.posFee || 0),
                discount: Number(inv.discount || 0),
                total: Number(inv.total || 0),
                paymentMethod: inv.payment_method || inv.paymentMethod || 'Tiền mặt',
                items: Array.isArray(inv.items) ? inv.items : []
              };
              if (!state.invoices.find(i => i.id === mapped.id)) {
                state.invoices.unshift(mapped);
                saveState();
                renderAll();
              }
            }
          })
          .subscribe(status => {
            console.log('⚡ Supabase Realtime Subscription:', status);
            if (status === 'SUBSCRIBED') {
              updateSupabaseBadge(true);
            }
          });
      }
`;

// Insert the module right before "// Initial Render"
if (!js.includes('SUPABASE_CONFIG')) {
  js = js.replace('// Initial Render', supabaseModule + '\n      // Initial Render');
  console.log('Injected Supabase module into app_logic.js');
}

// Hook booking form submit to syncBookingToSupabase
const oldBkSubmitDone = `        document.getElementById('form-customer-booking').reset();
        saveState();
        renderAll();`;

const newBkSubmitDone = `        // Đồng bộ lên Supabase Realtime
        if (typeof syncBookingToSupabase === 'function') {
          activeCourtIds.forEach((cId, idx) => {
            const bkObj = state.bookings.find(b => b.id === newBkIds[idx]);
            const cObj = state.courts.find(c => c.id === cId);
            if (bkObj) syncBookingToSupabase(bkObj, cObj);
          });
        }

        document.getElementById('form-customer-booking').reset();
        saveState();
        renderAll();`;

if (js.includes(oldBkSubmitDone)) {
  js = js.replace(oldBkSubmitDone, newBkSubmitDone);
  console.log('Hooked booking submit to Supabase sync');
}

// Hook check-in court update
const oldCheckinDone = `        targetCourt.status = 'active';
        targetCourt.customer = name;
        targetCourt.rateType = rateType;
        targetCourt.hourlyRate = rate;
        targetCourt.startTime = startTime;
        targetCourt.bookedHours = hours;
        targetCourt.elapsedMinutes = 0;
        targetCourt.deposit = deposit;

        saveState();
        renderAll();`;

const newCheckinDone = `        targetCourt.status = 'active';
        targetCourt.customer = name;
        targetCourt.rateType = rateType;
        targetCourt.hourlyRate = rate;
        targetCourt.startTime = startTime;
        targetCourt.bookedHours = hours;
        targetCourt.elapsedMinutes = 0;
        targetCourt.deposit = deposit;

        if (typeof syncCourtToSupabase === 'function') {
          syncCourtToSupabase(targetCourt);
        }

        saveState();
        renderAll();`;

if (js.includes(oldCheckinDone)) {
  js = js.replace(oldCheckinDone, newCheckinDone);
  console.log('Hooked check-in to Supabase sync');
}

// Hook checkout invoice
const oldCheckoutDone = `        state.invoices.unshift(invoice);
        court.status = 'free';
        court.customer = '';
        court.startTime = '';
        court.elapsedMinutes = 0;
        court.deposit = 0;
        court.items = [];

        saveState();
        renderAll();`;

const newCheckoutDone = `        state.invoices.unshift(invoice);
        court.status = 'free';
        court.customer = '';
        court.startTime = '';
        court.elapsedMinutes = 0;
        court.deposit = 0;
        court.items = [];

        if (typeof syncInvoiceToSupabase === 'function') {
          syncInvoiceToSupabase(invoice);
        }
        if (typeof syncCourtToSupabase === 'function') {
          syncCourtToSupabase(court);
        }

        saveState();
        renderAll();`;

if (js.includes(oldCheckoutDone)) {
  js = js.replace(oldCheckoutDone, newCheckoutDone);
  console.log('Hooked checkout to Supabase sync');
}

// Trigger initial sync and realtime setup after renderAll()
const oldInitCall = `      // Initial Render
      renderAll();
      setTimeout(function () {
        scrollToFirstSelectableSlot(false);
      }, 50);`;

const newInitCall = `      // Initial Render
      renderAll();
      setTimeout(function () {
        scrollToFirstSelectableSlot(false);
      }, 50);

      // Kích hoạt kết nối và đồng bộ Supabase Realtime
      if (typeof syncFromSupabase === 'function') {
        syncFromSupabase();
      }
      if (typeof setupSupabaseRealtime === 'function') {
        setupSupabaseRealtime();
      }`;

if (js.includes(oldInitCall)) {
  js = js.replace(oldInitCall, newInitCall);
  console.log('Hooked initial Supabase sync call');
}

fs.writeFileSync('c:\\Quan ly san cau\\tools_and_scripts\\app_logic.js', js, 'utf8');
console.log('app_logic.js written with Supabase module!');
