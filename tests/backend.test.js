const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const {btree_gist}=require('@electric-sql/pglite/contrib/btree_gist');
let db;const token='a'.repeat(64),other='b'.repeat(64);
const sql=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
async function call(name,args){const r=await db.query(`SELECT public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS value`,args);return r.rows[0].value;}
async function admin(enabled=true){await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)`,[enabled?'11111111-1111-4111-8111-111111111111':'',JSON.stringify(enabled?{app_metadata:{role:'admin'}}:{})]);}
function request(date,court=1,slot='18:00 - 19:00'){return {id:'BK-'+randomUUID(),court_id:court,booking_date:date,slot,customer:'Private Name',phone:'0901234567'};}
before(async()=>{
 db=new PGlite({extensions:{btree_gist}});
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;`);
 await db.exec(sql('supabase_schema.sql'));
 await db.exec(`INSERT INTO public.bookings(id,customer,phone,court_id,slot) VALUES('BK-101','Legacy customer','0900000000',4,'08:00 - 09:00');
 INSERT INTO public.invoices(id,time,type,court_name,total,created_at) VALUES('HD-2610-01','10:00','court','Sân 4',90000,now()-interval '100 days');`);
 await db.exec(sql('migrations/001_transactional_backend.sql'));
});
after(async()=>{await db?.close();});
test('migration is repeatable and public roles have no direct table or helper access',async()=>{
 await db.exec(sql('migrations/001_transactional_backend.sql'));
 assert.equal((await db.query("SELECT customer,booking_date FROM public.bookings WHERE id='BK-101'")).rows[0].customer,'Legacy customer');
 assert.equal((await db.query("SELECT booking_date FROM public.bookings WHERE id='BK-101'")).rows[0].booking_date,null);
 assert.equal((await db.query("SELECT total FROM public.invoices WHERE id='HD-2610-01'")).rows[0].total,90000);
 const r=await db.query(`SELECT has_table_privilege('anon','public.bookings','SELECT') AS read,has_table_privilege('authenticated','public.courts','UPDATE') AS write,has_function_privilege('anon','public.app_checked_items(jsonb)','EXECUTE') AS helper`);
 assert.deepEqual(r.rows[0],{read:false,write:false,helper:false});
 await db.exec('SET ROLE anon');try{await assert.rejects(db.query('SELECT * FROM public.bookings'),/permission denied/);const state=await call('app_read_state',[token]);assert.equal(state.courts.length,4);}finally{await db.exec('RESET ROLE');}
});
test('reservation is atomic, idempotent, date-aware and private',async()=>{
 await admin(false);const date=(await db.query(`SELECT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+1)::text AS d`)).rows[0].d;
 const booking=request(date),op='OP-'+randomUUID();
 const result=await call('app_reserve',[token,JSON.stringify([booking]),'[]',op]);assert.equal(result.booking_ids[0],booking.id);
 const retry=await call('app_reserve',[token,JSON.stringify([request(date)]),'[]',op]);assert.deepEqual(retry.booking_ids,result.booking_ids);
 const own=await call('app_read_state',[token]),stranger=await call('app_read_state',[other]);
 assert.equal(own.bookings.find(b=>b.id===booking.id).phone,'0901234567');assert(!JSON.stringify(stranger).includes('Private Name'));assert(!JSON.stringify(stranger).includes('0901234567'));assert(!JSON.stringify(stranger).includes('owner_hash'));
 assert.deepEqual(stranger.invoices,[]);assert(!('cost' in stranger.products[0]));
 await assert.rejects(call('app_reserve',[other,JSON.stringify([request(date)]),'[]','OP-'+randomUUID()]),/conflicting key|exclusion constraint/);
 const second=(await db.query(`SELECT ($1::date+1)::text AS d`,[date])).rows[0].d;
 await call('app_reserve',[other,JSON.stringify([request(second)]),'[]','OP-'+randomUUID()]);
 const before=(await db.query('SELECT count(*)::int AS n FROM public.bookings')).rows[0].n;
 await assert.rejects(call('app_reserve',[other,JSON.stringify([request(date,2),request(date)]),'[]','OP-'+randomUUID()]));
 assert.equal((await db.query('SELECT count(*)::int AS n FROM public.bookings')).rows[0].n,before);
});
test('orders do not create paid invoices or charge an unrelated court; acceptance is idempotent',async()=>{
 await admin(false);const stock=(await db.query("SELECT stock FROM public.products WHERE id='p1'")).rows[0].stock;
 const originalInvoices=(await db.query('SELECT count(*)::int AS n FROM public.invoices')).rows[0].n;
 await assert.rejects(call('app_place_order',[other,'BK-unknown',JSON.stringify([{productId:'p1',qty:1}]),'hack','OP-'+randomUUID()]),/quyền/);
 await call('app_place_order',[other,null,JSON.stringify([{productId:'p1',qty:2}]),'Deliver cold','OP-'+randomUUID()]);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM public.invoices')).rows[0].n,originalInvoices);
 assert.equal((await db.query("SELECT stock FROM public.products WHERE id='p1'")).rows[0].stock,stock);
 await admin();let state=await call('app_read_state',[token]);const order=state.orders.find(o=>o.note==='Deliver cold');
 state=await call('app_accept_order',[order.id,state.revision]);await call('app_accept_order',[order.id,state.revision]);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM public.invoices')).rows[0].n,originalInvoices+1);
 assert.equal((await db.query("SELECT stock FROM public.products WHERE id='p1'")).rows[0].stock,stock-2);
});
test('admin commits reject stale revisions and rollback partial writes',async()=>{
 await admin();const state=await call('app_read_state',[token]);
 const product=state.products.find(p=>p.id==='p1');const changed={id:product.id,name:product.name,category:product.category,unit:product.unit,cost:product.cost,price:product.price,stock:0,icon:product.icon};
 const delta={courts:[],bookings:[],products:[changed],invoices:[]};
 await call('app_admin_commit',[JSON.stringify(delta),state.revision,'OP-'+randomUUID()]);
 await assert.rejects(call('app_admin_commit',[JSON.stringify(delta),state.revision,'OP-'+randomUUID()]),/đã thay đổi/);
 const latest=await call('app_read_state',[token]);assert.equal(latest.products.find(p=>p.id==='p1').stock,0);
 delta.products=[{...changed,stock:5},{...changed,id:'p-invalid',stock:-1}];
 await assert.rejects(call('app_admin_commit',[JSON.stringify(delta),latest.revision,'OP-'+randomUUID()]));
 assert.equal((await db.query("SELECT stock FROM public.products WHERE id='p1'")).rows[0].stock,0);
 await admin(false);await assert.rejects(call('app_admin_commit',[JSON.stringify(delta),latest.revision,'OP-'+randomUUID()]),/quản trị/);
});

 test('future date migration exposes occupancy and accepts reservations beyond three days',async()=>{
  await db.exec(sql('migrations/002_open_booking_dates.sql'));
  await db.exec(sql('migrations/002_open_booking_dates.sql'));
  await admin(false);
  const date=(await db.query(`SELECT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+40)::text AS d`)).rows[0].d;
  const booking=request(date,3);
  await call('app_reserve',[token,JSON.stringify([booking]),'[]','OP-'+randomUUID()]);
  const state=await call('app_read_state',[other]);
  const visible=state.bookings.find(b=>b.id===booking.id);
  assert.equal(visible.booking_date,date); assert.equal(visible.customer,undefined);
  await assert.rejects(call('app_reserve',[other,JSON.stringify([request(date,3)]),'[]','OP-'+randomUUID()]));
 });
