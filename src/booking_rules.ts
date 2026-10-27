import Core = require('./app_core');
import type { Court, Booking, TimeRange } from './domain';
function bookingRanges(booking: Pick<Booking, 'slot'>): TimeRange[] { try { return Core.ranges(booking.slot); } catch { return []; } }
function bookingStartAt(booking: Booking | null | undefined): number | null {
  if (!booking || !/^\d{4}-\d{2}-\d{2}$/.test(booking.bookingDate || '')) return null;
  const range = bookingRanges(booking)[0];
  if (!range) return null;
  const timestamp = Date.parse(`${booking.bookingDate}T${Core.time(range.startMin)}:00+07:00`);
  return Number.isFinite(timestamp) ? timestamp : null;
}
function bookingStartTime(booking: Booking | null | undefined): string {
  const range = booking && bookingRanges(booking)[0];
  return range ? Core.time(range.startMin) : '';
}
function isBookingAwaitingStart(booking: Booking | null | undefined, now = Date.now()): boolean {
  const startAt = bookingStartAt(booking);
  return startAt !== null && now < startAt;
}
function courtTiming(court: Court, bookings: Booking[], now = Date.now()) {
  const booking = bookings.find(b => String(b.id) === String(court.bookingId));
  const scheduledStartAt = bookingStartAt(booking);
  const recordedStartAt = Date.parse(court.startedAt || '');
  const startAt = scheduledStartAt === null
    ? (Number.isFinite(recordedStartAt) ? recordedStartAt : null)
    : Math.max(Number.isFinite(recordedStartAt) ? recordedStartAt : scheduledStartAt, scheduledStartAt);
  return {
    booking,
    waiting: scheduledStartAt !== null && now < scheduledStartAt,
    elapsedMinutes: startAt === null
      ? Math.max(0, Number(court.elapsedMinutes) || 0)
      : Math.max(0, Math.floor((now - startAt) / 60000))
  };
}
function checkoutFee(court: Pick<Court, 'startTime'>, hours: number): number {
  const start = Core.minutes(court.startTime);
  if (start + hours*60 > 1380 || !Number.isInteger(hours*60)) throw new Error('Thời lượng vượt giờ đóng cửa hoặc không hợp lệ.');
  return Core.fee(court.startTime, Core.time(start + hours*60)).fee;
}

function validateBooking(courtId: number, slot: string, date: string, courts: Court[], bookings: Booking[], getCurrentMinutes: () => number = Core.nowMinutes): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || date < Core.dateKey()) throw new Error('Ngày đặt không hợp lệ.');
  const rs = Core.ranges(slot, true), court = courts.find(c => c.id === courtId);
  if (!court || court.status === 'maintenance') throw new Error('Sân chưa sẵn sàng.');
  for (const r of rs) {
    if (date === Core.dateKey() && r.startMin < getCurrentMinutes()) throw new Error('Khung giờ đã qua.');
    if (bookings.some(b => b.courtId === courtId && b.bookingDate === date && ['reserved','checked_in'].includes(b.status) && bookingRanges(b).some(x => Core.overlap(x,r)))) throw new Error('Khung giờ vừa có người đặt.');
    if (date === Core.dateKey() && slotStartMinSafe(court,r.startMin,r.endMin,getCurrentMinutes)) throw new Error('Khung giờ trùng phiên đang chơi.');
  }
}
function slotStartMinSafe(court: Court, start: number, end: number, getCurrentMinutes: () => number): boolean {
  if (court.status !== 'active') return false;
  if (!court.startedAt || Core.dateKey(court.startedAt) !== Core.dateKey()) return true;
  const a = Core.nowMinutes(court.startedAt), b = Math.min(1380, Math.max(a + Number(court.bookedHours)*60, getCurrentMinutes()+1));
  return Core.overlap({startMin:start,endMin:end},{startMin:a,endMin:b});
}

export = { bookingRanges, bookingStartAt, bookingStartTime, isBookingAwaitingStart, courtTiming, checkoutFee, validateBooking, slotStartMinSafe };
