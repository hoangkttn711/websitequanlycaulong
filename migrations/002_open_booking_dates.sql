-- Cho phép khách xem và đặt lịch cho các ngày tương lai. Chạy sau migration 001.
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
   FROM public.bookings b WHERE (admin AND (b.booking_date IS NULL OR b.booking_date >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date-30)) OR (b.booking_date >= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND b.status IN ('reserved','checked_in')) OR (b.owner_hash=h AND b.created_at>=now()-interval '90 days')),'[]'::jsonb),
 'invoices',CASE WHEN admin THEN COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.created_at DESC,i.id) FROM public.invoices i WHERE i.created_at>=now()-interval '90 days'),'[]'::jsonb) ELSE '[]'::jsonb END,
 'orders',CASE WHEN admin THEN COALESCE((SELECT jsonb_agg(to_jsonb(o)-'owner_hash' ORDER BY o.created_at) FROM public.orders o WHERE o.status='pending'),'[]'::jsonb) ELSE '[]'::jsonb END
 ) INTO result FROM public.app_revision r WHERE id=true;
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
   IF d IS NULL OR d<(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date OR lower(sp)%30<>0 OR upper(sp)%30<>0
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

