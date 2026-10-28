const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const Core=require('../tools_and_scripts/app_core');
const {webcrypto}=require('node:crypto');
const tick=()=>new Promise(r=>setTimeout(r,20));
function fixture(){return {revision:0,courts:Array.from({length:4},(_,i)=>({id:i+1,name:'Sân '+(i+1),zone:'Thảm xanh',mat_color:'green',status:'free',hourly_rate:60000,booked_hours:1.5,deposit:0,items:[]})),products:[{id:'p1',name:'Water',category:'drink',unit:'Chai',price:12000,cost:8000,stock:10,icon:'🥤'}],bookings:[],invoices:[],orders:[]};}
async function page(name='index',options={}){
 const html=fs.readFileSync(path.join(__dirname,'..',name+'.html'),'utf8');
 const dom=new JSDOM(html,{url:'https://test.local/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 Object.defineProperty(w,'crypto',{value:webcrypto});
 w.HTMLElement.prototype.scrollTo=function(){};w.HTMLElement.prototype.scrollBy=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};
 let server=Object.assign(fixture(),options.snapshot||{}),fail=false;const calls=[];
 if(options.malicious)server.products[0].name='<img src=x onerror="alert(1)">';
 const user={app_metadata:{role:'admin'}};
 w.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:options.admin?{}:null}}),getUser:async()=>({data:{user}}),onAuthStateChange(){},signOut:async()=>({}),signInWithPassword:async(args)=>{calls.push({name:'signInWithPassword',args});return options.loginError?{data:{user:null},error:{message:'Invalid credentials'}}:{data:{user}};}},rpc:async(name,args)=>{
   calls.push({name,args});if(fail)return {error:{message:'Network rejected'}};
   if(options.rpc)return options.rpc(name,args);
   if(name==='app_admin_commit'){
     server.revision++;
     const m={courts:c=>({...c,mat_color:c.matColor,hourly_rate:c.hourlyRate,booked_hours:c.bookedHours,start_time:c.startTime,started_at:c.startedAt,session_id:c.sessionId,booking_id:c.bookingId}),products:p=>p,bookings:b=>({...b,court_id:b.courtId,booking_date:b.bookingDate}),invoices:i=>({...i,court_name:i.courtName,court_fee:i.courtFee,pos_fee:i.posFee,payment_method:i.paymentMethod,created_at:i.createdAt})};
     for(const [key,rows] of Object.entries(args.p_state))for(const row of rows){const value=m[key](row),i=server[key].findIndex(x=>x.id===row.id);if(i<0)server[key].push(value);else server[key][i]=value;}
   }
   if(name==='app_reserve')return {data:{booking_ids:args.p_requests.map(b=>b.id),state:server}};
   return {data:JSON.parse(JSON.stringify(server))};
 }})};
 const errors=[];w.addEventListener('error',e=>errors.push(e.message));
 const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
 w.eval(script);await tick();await tick();
 return {dom,w,calls,errors,fail:()=>{fail=true;},server:()=>server,click:async(selector)=>{const el=w.document.querySelector(selector);assert(el,'Missing '+selector+'; '+w.document.getElementById('sync-message').textContent+'; '+errors.join(';'));el.click();await tick();await tick();}};
}
test('all three pages start, load products, clear carts and expose no default admin password',async()=>{
 for(const name of ['index','pc','mobile']){
   const p=await page(name);try{
     assert.equal(p.errors.length,0);assert(p.w.document.querySelector('[data-cust-add-prod="p1"]'));
     await p.click('[data-cust-add-prod="p1"]');assert(p.w.document.getElementById('cust-cart-total-amount').textContent.includes('12'));
     await p.click('#btn-clear-cust-cart');assert.equal(p.w.document.getElementById('cust-cart-total-amount').textContent,'0đ');
     assert.equal(p.w.document.getElementById('admin-password-input').value,'');assert(!p.w.document.querySelector('[data-booking-checkin]'));assert.equal(p.errors.length,0);
   }finally{p.dom.window.close();}
 }
});
test('admin alias uses Supabase password authentication on all pages and still rejects invalid credentials',async()=>{
 for(const name of ['index','pc','mobile']){
  const p=await page(name);try{
   const d=p.w.document;await p.click('#btn-open-admin-login');
   const username=d.getElementById('admin-username-input');username.value=' ADMIN ';
   d.getElementById('admin-password-input').value='private-test-password';
   assert(d.getElementById('form-admin-login').checkValidity());
   await p.click('#form-admin-login button[type="submit"]');
   const auth=p.calls.find(c=>c.name==='signInWithPassword');assert(auth);
   assert.equal(auth.args.email,'hoang.kttn711@gmail.com');assert.equal(auth.args.password,'private-test-password');
   assert(d.getElementById('modal-admin-login').classList.contains('hidden'));
  }finally{p.dom.window.close();}
 }
 const p=await page('index',{loginError:true});try{
  await p.click('#btn-open-admin-login');const d=p.w.document;
  d.getElementById('admin-username-input').value='another-admin@example.com';d.getElementById('admin-password-input').value='incorrect-password';
  await p.click('#form-admin-login button[type="submit"]');
  assert.equal(p.calls.find(c=>c.name==='signInWithPassword').args.email,'another-admin@example.com');
  assert(!d.getElementById('modal-admin-login').classList.contains('hidden'));
  assert(!d.getElementById('admin-login-error').classList.contains('hidden'));
  assert(d.getElementById('btn-open-admin-login').classList.contains('hidden')===false);
 }finally{p.dom.window.close();}
});

test('persisted names are escaped in generated product HTML',async()=>{
 const p=await page('index',{malicious:true});try{assert.equal(p.w.document.querySelectorAll('#cust-shop-grid img').length,0);assert(p.w.document.getElementById('cust-shop-grid').textContent.includes('<img'));}finally{p.dom.window.close();}
});
test('invoice text, including nested templates, cannot inject HTML',async()=>{
 const payload='<img src=x onerror="alert(1)">';
 const p=await page('index',{admin:true,snapshot:{invoices:[{id:'HD-test',time:'18:00',type:'court',court_name:payload,customer:payload,court_fee:60000,pos_fee:0,discount:0,total:60000,payment_method:payload,created_at:new Date().toISOString(),items:[{name:payload,qty:1,price:60000}]}]}});
 try{await p.click('[data-nav="reports"]');assert.equal(p.w.document.querySelectorAll('#invoices-table-body img').length,0);await p.click('[data-view-invoice="HD-test"]');assert.equal(p.w.document.querySelectorAll('#inv-detail-body img').length,0);}finally{p.dom.window.close();}
});
test('admin product writes preserve zero stock, and failures rollback without success notification',async()=>{
 const p=await page('index',{admin:true});try{
   const d=p.w.document;d.getElementById('prod-name').value='Free sample';d.getElementById('prod-category').value='drink';d.getElementById('prod-unit').value='Chai';d.getElementById('prod-cost').value='0';d.getElementById('prod-price').value='0';d.getElementById('prod-stock').value='0';
   d.querySelector('#form-new-product button[type=submit]').click();await tick();await tick();
   const commit=p.calls.find(c=>c.name==='app_admin_commit');assert(commit);assert.equal(commit.args.p_state.products[0].stock,0);assert.equal(commit.args.p_state.products[0].price,0);
   p.fail();d.getElementById('prod-name').value='Rejected product';d.getElementById('prod-unit').value='Chai';
   d.getElementById('form-new-product').dispatchEvent(new p.w.Event('submit',{bubbles:true,cancelable:true}));await tick();await tick();
   assert(!p.server().products.some(x=>x.name==='Rejected product'));assert(!d.getElementById('inventory-table-body')?.textContent.includes('Rejected product'));assert.equal(d.getElementById('sync-message').textContent,'Không thể kết nối máy chủ. Thay đổi chưa lưu vẫn được giữ; vui lòng thử lại sau.');
 }finally{p.dom.window.close();}
});
test('rendered booking check-in, POS, and checkout persist together through real PostgreSQL RPCs',async()=>{
 const {PGlite}=require('@electric-sql/pglite');const {btree_gist}=require('@electric-sql/pglite/contrib/btree_gist');
 const db=new PGlite({extensions:{btree_gist}});let p,guest;
 try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT '11111111-1111-4111-8111-111111111111'::uuid$$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT '{"app_metadata":{"role":"admin"}}'::jsonb$$;`);
  for(const file of ['supabase_schema.sql','migrations/001_transactional_backend.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
  await db.query(`INSERT INTO public.bookings(id,customer,phone,court_id,slot,booking_date,deposit) VALUES('BK-lifecycle','Test Player','0901234567',1,'18:00 - 19:00',(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,50000)`);
  const execute=async(name,args)=>{
   try{const values=Object.values(args).map(v=>v&&typeof v==='object'?JSON.stringify(v):v);const r=await db.query(`SELECT public.${name}(${values.map((_,i)=>'$'+(i+1)).join(',')}) AS data`,values);return {data:r.rows[0].data};}
   catch(error){return {error:{message:error.message,code:error.code}};}
  };
  let loseAdminResponse=true;
  p=await page('index',{admin:true,rpc:async(name,args)=>{const result=await execute(name,args);if(name==='app_admin_commit'&&loseAdminResponse&&!result.error){loseAdminResponse=false;return {error:{message:'Response lost after commit'}};}return result;}});
  await p.click('[data-booking-checkin="BK-lifecycle"]');
  assert.equal((await db.query('SELECT status FROM public.courts WHERE id=1')).rows[0].status,'active');
  assert(p.w.sessionStorage.getItem('smashcourt_pending_admin_write'));
  await p.click('[data-nav="schedule"]'); // First action reconciles the original operation id.
  assert.equal(p.w.sessionStorage.getItem('smashcourt_pending_admin_write'),null);
  const commits=p.calls.filter(c=>c.name==='app_admin_commit');assert.equal(commits[0].args.p_operation_id,commits[1].args.p_operation_id);
  await p.click('[data-court-pos="1"]');await p.click('[data-add-pos="p1"]');await p.click('#btn-submit-pos-order');
  assert.equal((await db.query("SELECT stock FROM public.products WHERE id='p1'")).rows[0].stock,63);
  await p.click('[data-court-checkout="1"]');await p.click('#btn-confirm-court-checkout');
  const inv=(await db.query('SELECT * FROM public.invoices')).rows[0];assert(inv);
  assert.equal(inv.court_fee,80000);assert.equal(inv.pos_fee,12000);assert.equal(inv.total,92000);assert.equal(inv.payment_amount,42000);assert.equal(inv.deposit_applied,50000);
  assert.equal((await db.query('SELECT status FROM public.courts WHERE id=1')).rows[0].status,'free');
  assert.equal((await db.query("SELECT status FROM public.bookings WHERE id='BK-lifecycle'")).rows[0].status,'completed');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.court_occupancy')).rows[0].n,0);
  // A lost customer response must retry the same transaction, even after polling sees its booking.
  await db.exec(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULL::uuid$$;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT '{}'::jsonb$$;`);
  let loseBookingResponse=true;
  guest=await page('mobile',{rpc:async(name,args)=>{const result=await execute(name,args);if(name==='app_reserve'&&loseBookingResponse&&!result.error){loseBookingResponse=false;return {error:{message:'Response lost after booking'}};}return result;}});
  await guest.click('[data-cust-day="tomorrow"]');await guest.click('[data-matrix-slot-court="2"][data-matrix-slot-start="18:00"]');
  guest.w.document.getElementById('cust-book-name').value='UI Customer';guest.w.document.getElementById('cust-book-phone').value='0901234567';
  await guest.click('#btn-cust-submit-booking');assert(guest.w.localStorage.getItem('smashcourt_pending_booking'),guest.w.document.getElementById('sync-message').textContent+'; '+JSON.stringify(guest.calls));
  await guest.click('#btn-cust-submit-booking');assert.equal(guest.w.localStorage.getItem('smashcourt_pending_booking'),null);
  const reservations=guest.calls.filter(c=>c.name==='app_reserve');assert.equal(reservations.length,2);assert.equal(reservations[0].args.p_operation_id,reservations[1].args.p_operation_id);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.bookings WHERE customer='UI Customer'")).rows[0].n,1);
  assert(guest.w.document.getElementById('cust-my-bookings-list').textContent.includes('UI Customer'));
 }finally{p?.dom.window.close();guest?.dom.window.close();await db.close();}
});

test('date picker selects future day and weekly booking validates all dates before committing',async()=>{
 const day=n=>Core.dateKey(Date.now()+n*86400000);
 const p=await page('index',{admin:true});try{
  const d=p.w.document, picker=d.getElementById('cust-date');picker.value=day(40);picker.dispatchEvent(new p.w.Event('change',{bubbles:true}));assert.equal(picker.value,day(40));
  await p.click('#btn-open-new-booking');
  d.getElementById('booking-date').value=day(10);d.getElementById('booking-repeat').checked=true;d.getElementById('booking-repeat-until').value=day(24);
  d.getElementById('booking-customer').value='Hội cầu';d.getElementById('booking-phone').value='0901234567';d.getElementById('booking-slot').value='18:00 - 19:00';d.getElementById('booking-deposit').value='30000';
  d.getElementById('form-new-booking').dispatchEvent(new p.w.Event('submit',{bubbles:true,cancelable:true}));await tick();await tick();
  const commit=p.calls.filter(c=>c.name==='app_admin_commit').at(-1);assert(commit);const rows=commit.args.p_state.bookings;assert.equal(rows.length,3);assert.deepEqual(Array.from(rows,b=>b.bookingDate),[day(10),day(17),day(24)]);assert.deepEqual(Array.from(rows,b=>b.deposit),[30000,0,0]);
 }finally{p.dom.window.close();}
});

test('weekly booking refuses a conflicting later occurrence without saving earlier ones',async()=>{
 const day=n=>Core.dateKey(Date.now()+n*86400000);
 const p=await page('index',{admin:true,snapshot:{bookings:[{id:'BK-conflict',court_id:1,booking_date:day(17),slot:'18:00 - 19:00',customer:'Other',phone:'0901234567',status:'reserved',deposit:0}]}});try{
  const d=p.w.document;await p.click('#btn-open-new-booking');
  d.getElementById('booking-date').value=day(10);d.getElementById('booking-repeat').checked=true;d.getElementById('booking-repeat-until').value=day(24);
  d.getElementById('booking-customer').value='Hội cầu';d.getElementById('booking-phone').value='0901234567';d.getElementById('booking-slot').value='18:00 - 19:00';
  d.getElementById('form-new-booking').dispatchEvent(new p.w.Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.equal(p.calls.filter(c=>c.name==='app_admin_commit').length,0);assert(!d.getElementById('modal-booking').classList.contains('hidden'));
 }finally{p.dom.window.close();}
});

test('schedule is the admin home and contains court operations',async()=>{
 const p=await page('index',{admin:true});try {
  const d=p.w.document;assert(!d.getElementById('view-schedule').classList.contains('hidden'));
  assert.equal(d.querySelector('.nav-tab-btn[data-nav="courts"]'),null);
  assert.equal(d.querySelectorAll('#courts-grid [data-court-open]').length,4);
  await p.click('#courts-grid [data-court-open="1"]');assert(!d.getElementById('modal-checkin').classList.contains('hidden'));
 }finally{p.dom.window.close();}
});
