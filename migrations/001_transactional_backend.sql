-- Apply after supabase_schema.sql (fresh installs: run both files in order).
-- Existing undated bookings are retained for staff review; dates are never guessed.
BEGIN;
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.courts ADD COLUMN IF NOT EXISTS booking_id varchar(50);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_date date;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS owner_hash text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_amount integer;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS deposit_applied integer NOT NULL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS refund_amount integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_session_unique ON public.invoices(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookings_date_court ON public.bookings(booking_date,court_id);
CREATE INDEX IF NOT EXISTS invoices_created ON public.invoices(created_at DESC);

-- Validate new writes while retaining legacy rows for explicit reconciliation.
DO $$ DECLARE rule record; BEGIN
 FOR rule IN SELECT * FROM (VALUES
  ('products','app_product_values','price >= 0 AND stock >= 0 AND cost >= 0'),
  ('courts','app_court_values','COALESCE(deposit >= 0 AND booked_hours > 0 AND booked_hours <= 18 AND hourly_rate >= 0 AND jsonb_typeof(items) = ''array'', false)'),
  ('courts','app_active_session','status <> ''active'' OR (session_id IS NOT NULL AND started_at IS NOT NULL)'),
  ('bookings','app_booking_values','COALESCE(deposit >= 0 AND status IN (''reserved'',''checked_in'',''cancelled'',''completed''),false)'),
  ('invoices','app_invoice_values','COALESCE(total >= 0 AND court_fee >= 0 AND pos_fee >= 0 AND discount >= 0 AND discount <= court_fee + pos_fee AND total = court_fee + pos_fee - discount AND deposit_applied >= 0 AND deposit_applied <= total AND refund_amount >= 0 AND (payment_amount IS NULL OR payment_amount = total - deposit_applied), false)')
 ) AS rules(table_name,constraint_name,expression) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=('public.'||rule.table_name)::regclass AND conname=rule.constraint_name) THEN
   EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID',rule.table_name,rule.constraint_name,rule.expression);
  END IF;
 END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.app_revision (id boolean PRIMARY KEY DEFAULT true CHECK(id), revision bigint NOT NULL DEFAULT 0);
INSERT INTO public.app_revision(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.app_operations (id text PRIMARY KEY, owner_hash text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.orders (
 id text PRIMARY KEY, owner_hash text NOT NULL, booking_id varchar(50) REFERENCES public.bookings(id),
 items jsonb NOT NULL, note text NOT NULL DEFAULT '', total integer NOT NULL CHECK(total>=0),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.court_occupancy (
 source_id text NOT NULL, kind text NOT NULL, court_id int NOT NULL REFERENCES public.courts(id),
 booking_date date NOT NULL, span int4range NOT NULL,
 EXCLUDE USING gist(court_id WITH =, booking_date WITH =, span WITH &&)
);
CREATE INDEX IF NOT EXISTS occupancy_source ON public.court_occupancy(source_id,kind);

CREATE OR REPLACE FUNCTION public.app_is_admin() RETURNS boolean LANGUAGE sql STABLE SET search_path=public,pg_temp AS $$
 SELECT auth.uid() IS NOT NULL AND COALESCE(auth.jwt()->'app_metadata'->>'role','')='admin'
$$;
CREATE OR REPLACE FUNCTION public.app_token_hash(p_token text) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
BEGIN
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Thiết bị không hợp lệ'; END IF;
 RETURN encode(sha256(convert_to(p_token,'UTF8')),'hex');
END $$;
CREATE OR REPLACE FUNCTION public.app_slot_span(p_slot text) RETURNS int4range LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE m text[]; a int; b int;
BEGIN
 m:=regexp_match(p_slot,'^([0-2][0-9]):([0-5][0-9]) - ([0-2][0-9]):([0-5][0-9])$');
 IF m IS NULL THEN RAISE EXCEPTION 'Khung giờ không hợp lệ'; END IF;
 a:=m[1]::int*60+m[2]::int; b:=m[3]::int*60+m[4]::int;
 IF a<300 OR b>1380 OR b<=a THEN RAISE EXCEPTION 'Giờ phải nằm trong 05:00–23:00'; END IF;
 RETURN int4range(a,b,'[)');
END $$;
CREATE OR REPLACE FUNCTION public.app_booking_occupancy() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE span_value int4range;
BEGIN
 DELETE FROM public.court_occupancy WHERE source_id=COALESCE(NEW.id,OLD.id) AND kind='booking';
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF NEW.booking_date IS NOT NULL AND NEW.status IN ('reserved','checked_in') THEN
   span_value:=public.app_slot_span(NEW.slot);
   IF lower(span_value)%30<>0 OR upper(span_value)%30<>0 THEN RAISE EXCEPTION 'Lịch đặt phải theo bước 30 phút'; END IF;
   INSERT INTO public.court_occupancy VALUES(NEW.id,'booking',NEW.court_id,NEW.booking_date,span_value);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS app_booking_occupancy ON public.bookings;
CREATE TRIGGER app_booking_occupancy AFTER INSERT OR UPDATE OF slot,court_id,booking_date,status OR DELETE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.app_booking_occupancy();
CREATE OR REPLACE FUNCTION public.app_court_occupancy() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a int; b int; d date;
BEGIN
 DELETE FROM public.court_occupancy WHERE source_id=COALESCE(NEW.id,OLD.id)::text AND kind='court';
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF NEW.status='active' AND NEW.booking_id IS NULL AND NEW.started_at IS NOT NULL THEN
   d:=(NEW.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
   a:=extract(hour from NEW.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int*60+extract(minute from NEW.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int;
   b:=LEAST(1380,a+(NEW.booked_hours*60)::int);
   IF b<=a THEN RAISE EXCEPTION 'Phiên sân ngoài giờ hoạt động'; END IF;
   INSERT INTO public.court_occupancy VALUES(NEW.id::text,'court',NEW.id,d,int4range(a,b,'[)'));
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS app_court_occupancy ON public.courts;
CREATE TRIGGER app_court_occupancy AFTER INSERT OR UPDATE OR DELETE ON public.courts FOR EACH ROW EXECUTE FUNCTION public.app_court_occupancy();

-- Old policies were permissive for PUBLIC, including anonymous writes. Remove all of them.
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('courts','products','bookings','invoices','orders','app_revision','app_operations','court_occupancy') LOOP
   EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
 END LOOP;
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC,anon,authenticated;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_revision ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_occupancy ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.courts,public.products,public.bookings,public.invoices,public.orders,public.app_revision,public.app_operations,public.court_occupancy FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.app_read_state(p_device_token text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE admin boolean:=public.app_is_admin(); h text; result jsonb;
BEGIN
 IF p_device_token ~ '^[a-f0-9]{64}$' THEN h:=public.app_token_hash(p_device_token); END IF;
 -- One SQL statement gives all tables and the revision the same MVCC snapshot.
 SELECT jsonb_build_object(
 'revision',r.revision,
 'courts',COALESCE((SELECT jsonb_agg(CASE WHEN admin THEN to_jsonb(c) ELSE jsonb_build_object('id',c.id,'name',c.name,'zone',c.zone,'mat_color',c.mat_color,'status',c.status,'started_at',c.started_at,'booked_hours',c.booked_hours) END ORDER BY c.id) FROM public.courts c),'[]'::jsonb),
 'products',COALESCE((SELECT jsonb_agg(CASE WHEN admin THEN to_jsonb(p) ELSE to_jsonb(p)-'cost'-'sold_today' END ORDER BY p.id) FROM public.products p),'[]'::jsonb),
 'bookings',COALESCE((SELECT jsonb_agg(CASE WHEN admin OR b.owner_hash=h THEN (to_jsonb(b)-'owner_hash')||jsonb_build_object('is_mine',COALESCE(b.owner_hash=h,false)) ELSE jsonb_build_object('id',b.id,'court_id',b.court_id,'slot',b.slot,'booking_date',b.booking_date,'status',b.status) END ORDER BY b.booking_date,b.slot,b.id)
   FROM public.bookings b WHERE (admin AND (b.booking_date IS NULL OR b.booking_date >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-30)) OR (b.booking_date BETWEEN (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+2 AND b.status IN ('reserved','checked_in')) OR (b.owner_hash=h AND b.created_at>=now()-interval '90 days')),'[]'::jsonb),
 'invoices',CASE WHEN admin THEN COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at DESC,i.id) FROM public.invoices i WHERE i.created_at>=now()-interval '90 days'),'[]'::jsonb) ELSE '[]'::jsonb END,
 'orders',CASE WHEN admin THEN COALESCE((SELECT jsonb_agg(to_jsonb(o)-'owner_hash' ORDER BY o.created_at) FROM public.orders o WHERE o.status='pending'),'[]'::jsonb) ELSE '[]'::jsonb END
 ) INTO result FROM public.app_revision r WHERE id=true;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.app_checked_items(p_items jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE entry jsonb; p public.products; q integer; result jsonb:='[]'; ids text[]:=ARRAY[]::text[];
BEGIN
 IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items)>30 THEN RAISE EXCEPTION 'Danh sách sản phẩm không hợp lệ'; END IF;
 FOR entry IN SELECT value FROM jsonb_array_elements(p_items) LOOP
   q:=(entry->>'qty')::integer;
   IF q IS NULL OR q<1 OR q>100 OR (entry->>'productId')=ANY(ids) THEN RAISE EXCEPTION 'Số lượng hoặc sản phẩm bị lặp'; END IF;
   SELECT * INTO p FROM public.products WHERE id=entry->>'productId';
   IF NOT FOUND OR p.stock<q THEN RAISE EXCEPTION 'Sản phẩm hết hàng'; END IF;
   ids:=array_append(ids,p.id);
   result:=result||jsonb_build_array(jsonb_build_object('productId',p.id,'name',p.name,'category',p.category,'qty',q,'price',p.price));
 END LOOP;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.app_reserve(p_device_token text,p_requests jsonb,p_addons jsonb,p_operation_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE h text:=public.app_token_hash(p_device_token); prior jsonb; req jsonb; d date; sp int4range; ids jsonb:='[]'; items jsonb; first_id text; c public.courts; active_start int; active_end int;
BEGIN
 PERFORM 1 FROM public.app_revision WHERE id=true FOR UPDATE;
 SELECT result INTO prior FROM public.app_operations WHERE id=p_operation_id AND owner_hash=h;
 IF prior IS NOT NULL THEN RETURN prior||jsonb_build_object('state',public.app_read_state(p_device_token)); END IF;
 IF length(p_operation_id)>80 OR p_operation_id IS NULL OR jsonb_typeof(p_requests) IS DISTINCT FROM 'array' OR jsonb_array_length(p_requests) NOT BETWEEN 1 AND 36 THEN RAISE EXCEPTION 'Yêu cầu đặt không hợp lệ'; END IF;
 IF (SELECT count(*) FROM public.bookings WHERE owner_hash=h AND created_at>now()-interval '1 hour')+jsonb_array_length(p_requests)>72 THEN RAISE EXCEPTION 'Quá nhiều yêu cầu đặt sân'; END IF;
 FOR req IN SELECT value FROM jsonb_array_elements(p_requests) LOOP
   d:=(req->>'booking_date')::date; sp:=public.app_slot_span(req->>'slot');
   IF d IS NULL OR d<(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date OR d>(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+2 OR lower(sp)%30<>0 OR upper(sp)%30<>0
      OR (d=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND d::timestamp+make_interval(mins=>lower(sp)) < now() AT TIME ZONE 'Asia/Ho_Chi_Minh') THEN RAISE EXCEPTION 'Ngày hoặc giờ đặt không còn hợp lệ'; END IF;
   IF length(trim(req->>'customer')) NOT BETWEEN 1 AND 120 OR (req->>'phone') !~ '^[+0-9 .()-]{8,25}$' OR req->>'id' !~ '^BK-[a-f0-9-]{36}$' THEN RAISE EXCEPTION 'Thông tin khách không hợp lệ'; END IF;
   SELECT * INTO c FROM public.courts WHERE id=(req->>'court_id')::int;
   IF NOT FOUND OR c.status='maintenance' THEN RAISE EXCEPTION 'Sân chưa sẵn sàng'; END IF;
   IF c.status='active' AND d=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN
     IF c.started_at IS NULL THEN RAISE EXCEPTION 'Sân đang có khách chơi'; END IF;
     active_start:=extract(hour from c.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int*60+extract(minute from c.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int;
     active_end:=LEAST(1380,GREATEST(active_start+(c.booked_hours*60)::int,extract(hour from now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::int*60+extract(minute from now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::int+1));
     IF active_start<active_end AND sp && int4range(active_start,active_end,'[)') THEN RAISE EXCEPTION 'Sân đang có khách chơi'; END IF;
   END IF;
   INSERT INTO public.bookings(id,customer,phone,court_id,slot,type,deposit,status,booking_date,owner_hash)
   VALUES(req->>'id',trim(req->>'customer'),req->>'phone',(req->>'court_id')::int,req->>'slot','Khách đặt Online',0,'reserved',d,h);
   IF d=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND c.status='free' THEN
     UPDATE public.courts SET status='reserved',customer=req->>'customer',booking_id=req->>'id',start_time=left(req->>'slot',5),booked_hours=(upper(sp)-lower(sp))::numeric/60,deposit=0 WHERE id=c.id;
   END IF;
   ids:=ids||jsonb_build_array(req->>'id'); first_id:=COALESCE(first_id,req->>'id');
 END LOOP;
 items:=public.app_checked_items(p_addons);
 IF jsonb_array_length(items)>0 THEN
   INSERT INTO public.orders(id,owner_hash,booking_id,items,note,total)
   SELECT 'ORDER-'||gen_random_uuid(),h,first_id,items,'Phụ kiện theo lịch đặt — chờ xác nhận',sum((i->>'price')::int*(i->>'qty')::int) FROM jsonb_array_elements(items) i;
 END IF;
 UPDATE public.app_revision SET revision=revision+1 WHERE id=true;
 prior:=jsonb_build_object('booking_ids',ids);
 INSERT INTO public.app_operations VALUES(p_operation_id,h,prior,now());
 RETURN prior||jsonb_build_object('state',public.app_read_state(p_device_token));
END $$;

CREATE OR REPLACE FUNCTION public.app_place_order(p_device_token text,p_booking_id text,p_items jsonb,p_note text,p_operation_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE h text:=public.app_token_hash(p_device_token); items jsonb;
BEGIN
 PERFORM 1 FROM public.app_revision WHERE id=true FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.app_operations WHERE id=p_operation_id AND owner_hash=h) THEN RETURN public.app_read_state(p_device_token); END IF;
 IF p_operation_id IS NULL OR length(p_operation_id)>80 OR length(p_note)>500 THEN RAISE EXCEPTION 'Yêu cầu không hợp lệ'; END IF;
 IF (SELECT count(*) FROM public.orders WHERE owner_hash=h AND status='pending')>=10 THEN RAISE EXCEPTION 'Còn quá nhiều đơn đang chờ'; END IF;
 IF p_booking_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.bookings b JOIN public.courts c ON c.booking_id=b.id WHERE b.id=p_booking_id AND b.owner_hash=h AND b.status='checked_in' AND c.status='active') THEN RAISE EXCEPTION 'Không có quyền đặt hàng cho sân này'; END IF;
 items:=public.app_checked_items(p_items);
 IF p_booking_id IS NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements(items) i WHERE i->>'category'='rental') THEN RAISE EXCEPTION 'Dịch vụ thuê cần gắn với sân đang chơi'; END IF;
 IF jsonb_array_length(items)=0 THEN RAISE EXCEPTION 'Giỏ hàng trống'; END IF;
 INSERT INTO public.orders(id,owner_hash,booking_id,items,note,total)
 SELECT 'ORDER-'||gen_random_uuid(),h,p_booking_id,items,COALESCE(p_note,''),sum((i->>'price')::int*(i->>'qty')::int) FROM jsonb_array_elements(items) i;
 INSERT INTO public.app_operations VALUES(p_operation_id,h,'{}',now());
 UPDATE public.app_revision SET revision=revision+1 WHERE id=true;
 RETURN public.app_read_state(p_device_token);
END $$;

CREATE OR REPLACE FUNCTION public.app_admin_commit(p_state jsonb,p_revision bigint,p_operation_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE current_revision bigint; row jsonb; old_row public.bookings; c public.courts; p public.products; i public.invoices; d date;
BEGIN
 IF NOT public.app_is_admin() THEN RAISE EXCEPTION 'Cần quyền quản trị' USING ERRCODE='42501'; END IF;
 SELECT revision INTO current_revision FROM public.app_revision WHERE id=true FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.app_operations WHERE id=p_operation_id AND owner_hash=auth.uid()::text) THEN RETURN public.app_read_state(''); END IF;
 IF current_revision<>p_revision THEN RAISE EXCEPTION 'Dữ liệu đã thay đổi trên thiết bị khác. Tải lại và thử lại'; END IF;
 IF p_operation_id IS NULL OR length(p_operation_id)>80 OR NOT (p_state ?& ARRAY['courts','products','bookings','invoices']) THEN RAISE EXCEPTION 'Dữ liệu không đầy đủ'; END IF;
 IF jsonb_array_length(p_state->'courts')>4 OR jsonb_array_length(p_state->'products')>1000 OR jsonb_array_length(p_state->'bookings')>100000 OR jsonb_array_length(p_state->'invoices')>100000 THEN RAISE EXCEPTION 'Dữ liệu vượt giới hạn'; END IF;
 FOR row IN SELECT value FROM jsonb_array_elements(p_state->'bookings') LOOP
   d:=(row->>'bookingDate')::date;
   SELECT * INTO old_row FROM public.bookings WHERE id=row->>'id';
   IF old_row.id IS NULL AND (d IS NULL OR d<(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) THEN RAISE EXCEPTION 'Lịch mới phải có ngày hợp lệ'; END IF;
   IF row->>'status' NOT IN ('reserved','checked_in','cancelled','completed') OR (row->>'deposit')::int<0 OR length(row->>'customer') NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'Thông tin lịch không hợp lệ'; END IF;
   INSERT INTO public.bookings(id,customer,phone,court_id,slot,type,deposit,status,booking_date)
   VALUES(row->>'id',row->>'customer',row->>'phone',(row->>'courtId')::int,row->>'slot',row->>'type',(row->>'deposit')::int,row->>'status',d)
   ON CONFLICT(id) DO UPDATE SET customer=EXCLUDED.customer,phone=EXCLUDED.phone,court_id=EXCLUDED.court_id,slot=EXCLUDED.slot,type=EXCLUDED.type,deposit=EXCLUDED.deposit,status=EXCLUDED.status,booking_date=EXCLUDED.booking_date;
 END LOOP;
 FOR row IN SELECT value FROM jsonb_array_elements(p_state->'products') LOOP
   IF row->>'category' NOT IN ('drink','grip','shuttle','rental') OR (row->>'stock')::int<0 OR (row->>'price')::int<0 OR (row->>'cost')::int<0 OR length(row->>'name') NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'Sản phẩm không hợp lệ'; END IF;
   INSERT INTO public.products(id,name,category,unit,cost,price,stock,icon) VALUES(row->>'id',row->>'name',row->>'category',row->>'unit',(row->>'cost')::int,(row->>'price')::int,(row->>'stock')::int,row->>'icon')
   ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,unit=EXCLUDED.unit,cost=EXCLUDED.cost,price=EXCLUDED.price,stock=EXCLUDED.stock,icon=EXCLUDED.icon,updated_at=now();
 END LOOP;
 FOR row IN SELECT value FROM jsonb_array_elements(p_state->'courts') LOOP
   IF (row->>'id')::int NOT BETWEEN 1 AND 4 OR row->>'status' NOT IN ('free','active','reserved','maintenance') OR (row->>'deposit')::int<0 OR (row->>'bookedHours')::numeric<=0 THEN RAISE EXCEPTION 'Sân không hợp lệ'; END IF;
   IF row->>'status'='active' AND (row->>'sessionId' IS NULL OR row->>'startedAt' IS NULL) THEN RAISE EXCEPTION 'Phiên đang chơi phải có mã và giờ bắt đầu'; END IF;
   UPDATE public.courts SET status=row->>'status',customer=COALESCE(row->>'customer',''),rate_type=row->>'rateType',hourly_rate=(row->>'hourlyRate')::int,start_time=row->>'startTime',booked_hours=(row->>'bookedHours')::numeric,
    deposit=(row->>'deposit')::int,items=row->'items',started_at=(row->>'startedAt')::timestamptz,session_id=row->>'sessionId',booking_id=row->>'bookingId',updated_at=now() WHERE id=(row->>'id')::int;
 END LOOP;
 FOR row IN SELECT value FROM jsonb_array_elements(p_state->'invoices') LOOP
   IF EXISTS(SELECT 1 FROM public.invoices WHERE id=row->>'id') THEN CONTINUE; END IF;
   IF (row->>'courtFee')::int<0 OR (row->>'posFee')::int<0 OR (row->>'discount')::int<0 OR (row->>'total')::int<>GREATEST(0,(row->>'courtFee')::int+(row->>'posFee')::int-(row->>'discount')::int) THEN RAISE EXCEPTION 'Tổng hóa đơn không hợp lệ'; END IF;
   INSERT INTO public.invoices(id,time,type,court_name,customer,court_fee,pos_fee,discount,total,payment_method,items,created_at,session_id,payment_amount,deposit_applied,refund_amount)
   VALUES(row->>'id',row->>'time',row->>'type',row->>'courtName',row->>'customer',(row->>'courtFee')::int,(row->>'posFee')::int,(row->>'discount')::int,(row->>'total')::int,row->>'paymentMethod',row->'items',now(),row->>'sessionId',COALESCE((row->>'paymentAmount')::int,(row->>'total')::int),COALESCE((row->>'depositApplied')::int,0),COALESCE((row->>'refundAmount')::int,0));
 END LOOP;
 INSERT INTO public.app_operations VALUES(p_operation_id,auth.uid()::text,'{}',now());
 UPDATE public.app_revision SET revision=revision+1 WHERE id=true;
 RETURN public.app_read_state('');
END $$;

CREATE OR REPLACE FUNCTION public.app_accept_order(p_order_id text,p_revision bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.orders; c public.courts; item jsonb; rev bigint;
BEGIN
 IF NOT public.app_is_admin() THEN RAISE EXCEPTION 'Cần quyền quản trị' USING ERRCODE='42501'; END IF;
 SELECT revision INTO rev FROM public.app_revision WHERE id=true FOR UPDATE;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đơn'; END IF;
 IF o.status='accepted' THEN RETURN public.app_read_state(''); END IF;
 IF rev<>p_revision OR o.status<>'pending' THEN RAISE EXCEPTION 'Đơn đã thay đổi. Tải lại rồi thử lại'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(o.items) LOOP
   UPDATE public.products SET stock=stock-(item->>'qty')::int,updated_at=now() WHERE id=item->>'productId' AND stock>=(item->>'qty')::int;
   IF NOT FOUND THEN RAISE EXCEPTION 'Không đủ hàng để xác nhận đơn'; END IF;
 END LOOP;
 IF o.booking_id IS NOT NULL THEN
   SELECT c1.* INTO c FROM public.courts c1 JOIN public.bookings b ON b.id=c1.booking_id WHERE b.id=o.booking_id AND b.status='checked_in' AND c1.status='active';
   IF NOT FOUND THEN RAISE EXCEPTION 'Lịch chưa được nhận sân hoặc đã kết thúc'; END IF;
   -- Keep separate lines: checkout sums all lines; no order can be accepted twice.
   UPDATE public.courts SET items=items||o.items,updated_at=now() WHERE id=c.id;
 ELSE
   INSERT INTO public.invoices(id,time,type,court_name,customer,court_fee,pos_fee,discount,total,payment_method,items,payment_amount)
   VALUES('HD-'||gen_random_uuid(),to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh','HH24:MI'),'retail','Quầy POS',o.note,0,o.total,0,o.total,'Nhân viên xác nhận',o.items,o.total);
 END IF;
 UPDATE public.orders SET status='accepted' WHERE id=p_order_id;
 UPDATE public.app_revision SET revision=revision+1 WHERE id=true;
 RETURN public.app_read_state('');
END $$;

CREATE OR REPLACE FUNCTION public.app_reject_order(p_order_id text,p_revision bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE rev bigint;
BEGIN
 IF NOT public.app_is_admin() THEN RAISE EXCEPTION 'Cần quyền quản trị' USING ERRCODE='42501'; END IF;
 SELECT revision INTO rev FROM public.app_revision WHERE id=true FOR UPDATE;
 IF rev<>p_revision THEN RAISE EXCEPTION 'Đơn đã thay đổi. Tải lại rồi thử lại'; END IF;
 UPDATE public.orders SET status='cancelled' WHERE id=p_order_id AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Đơn không còn ở trạng thái chờ'; END IF;
 UPDATE public.app_revision SET revision=revision+1 WHERE id=true;
 RETURN public.app_read_state('');
END $$;
REVOKE ALL ON FUNCTION public.app_reject_order(text,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_reject_order(text,bigint) TO authenticated;

-- Do not expose internal SECURITY DEFINER helpers or inherit default PUBLIC execute grants.
REVOKE ALL ON FUNCTION public.app_token_hash(text),public.app_slot_span(text),public.app_booking_occupancy(),public.app_court_occupancy(),public.app_checked_items(jsonb),public.app_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_read_state(text),public.app_reserve(text,jsonb,jsonb,text),public.app_place_order(text,text,jsonb,text,text),public.app_admin_commit(jsonb,bigint,text),public.app_accept_order(text,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_read_state(text),public.app_reserve(text,jsonb,jsonb,text),public.app_place_order(text,text,jsonb,text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.app_admin_commit(jsonb,bigint,text),public.app_accept_order(text,bigint) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
