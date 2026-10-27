import type { Court, Booking, Product, Invoice } from './domain';
import type { CourtRow, BookingRow, ProductRow, InvoiceRow } from './supabase_types';
function mapCourtFromDb(c: CourtRow): Court {
  return { id: Number(c.id), name: c.name, zone: c.zone, matColor: c.mat_color, status: c.status,
    customer: c.customer || '', rateType: c.rate_type || 'normal', hourlyRate: Number(c.hourly_rate ?? 60000),
    startTime: c.start_time || '', bookedHours: Number(c.booked_hours ?? 1.5), elapsedMinutes: Number(c.elapsed_minutes ?? 0),
    deposit: Number(c.deposit ?? 0), items: c.items || [], startedAt: c.started_at, sessionId: c.session_id, bookingId: c.booking_id };
}
function mapBookingFromDb(b: BookingRow): Booking {
  return { id: b.id, customer: b.customer || '', phone: b.phone || '', courtId: Number(b.court_id), slot: b.slot,
    bookingDate: b.booking_date, type: b.type || 'Khách đặt Online', deposit: Number(b.deposit ?? 0), status: b.status,
    createdAt: b.created_at, isMine: b.is_mine === true };
}
function mapProductFromDb(p: ProductRow): Product {
  return { id: p.id, name: p.name, category: p.category, unit: p.unit, cost: Number(p.cost ?? 0), price: Number(p.price),
    stock: Number(p.stock), soldToday: 0, icon: p.icon || '🏸' };
}

function mapInvoiceFromDb(i: InvoiceRow): Invoice { return { id:i.id, time:i.time, type:i.type, courtName:i.court_name, customer:i.customer,
    courtFee:Number(i.court_fee), posFee:Number(i.pos_fee), discount:Number(i.discount), total:Number(i.total),
    paymentMethod:i.payment_method, items:i.items || [], createdAt:i.created_at, paymentAmount:i.payment_amount,
    depositApplied:i.deposit_applied, refundAmount:i.refund_amount, sessionId:i.session_id }; }

// Only server-controlled app_metadata is used, as before. SQL remains authoritative.
function hasAdminRole(user: { app_metadata?: { role?: unknown } } | null | undefined): boolean {
  return user?.app_metadata?.role === 'admin';
}
export = { mapCourtFromDb, mapBookingFromDb, mapProductFromDb, mapInvoiceFromDb, hasAdminRole };
