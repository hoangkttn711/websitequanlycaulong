const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Rules = require('../.build/booking_rules');
const Models = require('../.build/cloud_models');
const Core = require('../.build/app_core');

test('early check-in waits for scheduled start, late check-in uses actual start, legacy timing survives', () => {
  const booking = { id: 'BK-old', bookingDate: '2026-10-27', slot: '18:00 - 19:00' };
  const court = { bookingId: booking.id, startedAt: '2026-10-27T17:45:00+07:00', elapsedMinutes: 5 };
  const at = value => Date.parse('2026-10-27T' + value + '+07:00');
  assert.equal(Rules.courtTiming(court, [booking], at('17:50:00')).waiting, true);
  assert.equal(Rules.courtTiming(court, [booking], at('17:50:00')).elapsedMinutes, 0);
  assert.equal(Rules.courtTiming(court, [booking], at('18:10:59')).elapsedMinutes, 10);
  court.startedAt = '2026-10-27T18:05:00+07:00';
  assert.equal(Rules.courtTiming(court, [booking], at('18:10:00')).elapsedMinutes, 5);
  assert.equal(Rules.bookingStartAt({ ...booking, bookingDate: null }), null);
  assert.equal(Rules.courtTiming({ elapsedMinutes: 12 }, [], at('18:00:00')).elapsedMinutes, 12);
  assert.equal(Rules.bookingRanges({ slot: 'legacy invalid slot' }).length, 0);
});

test('booking validation preserves adjacent slots, disjoint ranges, maintenance and missing legacy session guards', () => {
  const today = Core.dateKey();
  const court = { id: 1, status: 'free' };
  const bookings = [{ courtId: 1, bookingDate: today, status: 'reserved', slot: '18:00 - 19:00' }];
  const validate = slot => Rules.validateBooking(1, slot, today, [court], bookings, () => 300);
  assert.doesNotThrow(() => validate('19:00 - 19:30, 20:00 - 20:30'));
  assert.throws(() => validate('18:30 - 19:30'), /vừa có người đặt/);
  court.status = 'maintenance';
  assert.throws(() => validate('19:00 - 19:30'), /chưa sẵn sàng/);
  court.status = 'active';
  assert.throws(() => validate('19:00 - 19:30'), /trùng phiên/);
  assert.equal(Rules.checkoutFee({ startTime: '16:30' }, 1), 70000);
  assert.throws(() => Rules.checkoutFee({ startTime: '22:30' }, 1));
  assert.throws(() => Rules.checkoutFee({ startTime: '18:00' }, 1 / 7));
});

test('redacted Supabase rows and zero values retain existing mapping semantics', () => {
  const court = Models.mapCourtFromDb({ id: '1', name: 'Sân 1', zone: 'X', mat_color: 'green', status: 'free', hourly_rate: 0, booked_hours: '1.5' });
  assert.equal(court.id, 1); assert.equal(court.customer, ''); assert.equal(court.hourlyRate, 0);
  assert.equal(court.bookedHours, 1.5); assert.deepEqual(court.items, []);
  const booking = Models.mapBookingFromDb({ id: 'BK-old', court_id: 1, slot: '18:00 - 19:00', booking_date: null, status: 'reserved' });
  assert.equal(booking.bookingDate, null); assert.equal(booking.customer, ''); assert.equal(booking.phone, ''); assert.equal(booking.isMine, false);
  const product = Models.mapProductFromDb({ id: 'p', name: 'Water', category: 'drink', unit: 'Chai', price: '0', stock: '0' });
  assert.equal(product.price, 0); assert.equal(product.stock, 0); assert.equal(product.cost, 0);
  const invoice = Models.mapInvoiceFromDb({ id: 'HD-old', total: '0', court_fee: '0', pos_fee: '0', discount: '0', created_at: null, payment_amount: 0, refund_amount: 50000 });
  assert.equal(invoice.createdAt, null); assert.equal(invoice.total, 0); assert.equal(invoice.paymentAmount, 0); assert.equal(invoice.refundAmount, 50000);
  assert.deepEqual(invoice.items, []);
});

test('admin UI role ignores user-editable metadata', () => {
  for (const user of [null, undefined, {}, { user_metadata: { role: 'admin' } }, { app_metadata: { role: 'Admin' } }]) assert.equal(Models.hasAdminRole(user), false);
  assert.equal(Models.hasAdminRole({ app_metadata: { role: 'admin' } }), true);
});

test('static pages keep template markup and ship compiled JavaScript with no Node runtime dependency', () => {
  for (const name of ['index', 'pc', 'mobile']) {
    const template = fs.readFileSync(`templates/${name}.html`, 'utf8');
    const html = fs.readFileSync(`public/${name}.html`, 'utf8');
    assert.equal(html.replace(/<script>\n[\s\S]*?\n<\/script>/, '<!-- APP_SCRIPT -->'), template);
    assert(!html.includes('src=".build/'));
    assert(!fs.existsSync(`public/${name}.ts`));
  }
});
