import type { Court, Product, TimeRange } from './domain';
type DateInput = Date | string | number;
const timezone = 'Asia/Ho_Chi_Minh';
function dateKey(value: DateInput = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
function nowMinutes(value: DateInput = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
  return Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
}
const dayOffsets: Record<string, number> = { today: 0, tomorrow: 1, sunday: 2 };
function bookingDate(day: string = 'today', now: DateInput = new Date()) {
  const d = new Date(dateKey(now) + 'T12:00:00+07:00');
  d.setTime(d.getTime() + (dayOffsets[day] || 0) * 86400000);
  return dateKey(d);
}
function minutes(value: unknown): number {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.trim())) throw new Error('Giờ không hợp lệ (HH:MM).');
  const [h, m] = value.trim().split(':').map(Number);
  return h * 60 + m;
}
function time(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value >= 1440) throw new Error('Giờ không hợp lệ.');
  return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
}
function ranges(slot: unknown, strict = false): TimeRange[] {
  if (typeof slot !== 'string' || !slot.trim()) throw new Error('Chưa chọn khung giờ.');
  const result = slot.split(',').map(part => {
const match = part.trim().match(/^(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})$/);
if (!match) throw new Error('Khung giờ không hợp lệ.');
const startMin = minutes(match[1]), endMin = minutes(match[2]);
if (startMin < 300 || endMin > 1380 || endMin <= startMin || (strict && (startMin % 30 || endMin % 30))) throw new Error('Chọn giờ từ 05:00 đến 23:00, theo bước 30 phút.');
return { startMin, endMin };
  }).sort((a, b) => a.startMin - b.startMin);
  if (result.some((r, i) => i && r.startMin < result[i - 1].endMin)) throw new Error('Các khung giờ bị chồng lấn.');
  return result;
}
function overlap(a: TimeRange, b: TimeRange): boolean { return a.startMin < b.endMin && b.startMin < a.endMin; }
function fee(start: string, end: string) {
  const a = minutes(start), b = minutes(end);
  if (b <= a || a < 300 || b > 1380) throw new Error('Khung giờ tính tiền không hợp lệ.');
  const peak = Math.max(0, Math.min(b, 1260) - Math.max(a, 1020));
  return { totalHours: (b - a) / 60, normalHours: (b - a - peak) / 60, eveningHours: peak / 60, fee: Math.round(((b - a - peak) * 60000 + peak * 80000) / 60) };
}
const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHTML(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => entities[c]);
}
function id(prefix: string): string { return prefix + '-' + globalThis.crypto.randomUUID(); }
function amount(value: unknown, label = 'Số tiền'): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(label + ' phải là số nguyên không âm.');
  return n;
}
function adjustItem(court: Pick<Court, 'status' | 'items'>, product: Pick<Product, 'id' | 'name' | 'stock' | 'price' | 'category'>, delta: number): void {
  if (!Number.isInteger(delta) || !delta) throw new Error('Số lượng không hợp lệ.');
  if (!['active', 'reserved'].includes(court.status)) throw new Error('Sân chưa có phiên sử dụng.');
  const item = court.items.find(i => i.productId === product.id);
  const next = (item?.qty || 0) + delta;
  if (next < 0 || (!item && delta < 0)) throw new Error('Không có sản phẩm để bớt.');
  if (delta > product.stock) throw new Error('Không đủ tồn kho: ' + product.name);
  product.stock -= delta;
  if (item) item.qty = next;
  else court.items.push({ productId: product.id, name: product.name, price: product.price, category: product.category, qty: delta });
  court.items = court.items.filter(i => i.qty > 0);
}
function checkoutTotals(courtFee: number, posFee: number, discount: number, deposit: number) {
  for(const value of [courtFee,posFee,discount,deposit])amount(value);
  if(discount>courtFee+posFee)throw new Error('Giảm giá vượt giá trị hóa đơn.');
  const total=courtFee+posFee-discount;
  return {total,paymentAmount:Math.max(0,total-deposit),depositApplied:Math.min(total,deposit),refundAmount:Math.max(0,deposit-total)};
}
function invoiceDate(inv: { createdAt?: DateInput | null }): string | null { return inv.createdAt ? dateKey(inv.createdAt) : null; }
const core = { timezone, dateKey, nowMinutes, bookingDate, minutes, time, ranges, overlap, fee, escapeHTML, id, amount, adjustItem, invoiceDate, checkoutTotals };
export = core;
