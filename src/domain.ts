/** Client models. Dates remain the existing YYYY-MM-DD / ISO strings; money is VND. */
export type CourtStatus = 'free' | 'active' | 'reserved' | 'maintenance';
export type BookingStatus = 'reserved' | 'checked_in' | 'cancelled' | 'completed';
export type ProductCategory = 'drink' | 'grip' | 'shuttle' | 'rental';
export interface TimeRange { startMin: number; endMin: number }
export interface LineItem {
  productId: string; name: string; price: number; category: ProductCategory; qty: number;
}
export interface Court {
  id: number; name: string; zone: string; matColor: string; status: CourtStatus;
  customer: string; rateType: string; hourlyRate: number; startTime: string;
  bookedHours: number; elapsedMinutes: number; deposit: number; items: LineItem[];
  startedAt?: string | null; sessionId?: string | null; bookingId?: string | null;
}
export interface Booking {
  id: string; customer: string; phone: string; courtId: number; slot: string;
  bookingDate: string | null; type: string; deposit: number; status: BookingStatus;
  createdAt?: string | null; isMine: boolean;
}
export interface Product {
  id: string; name: string; category: ProductCategory; unit: string; cost: number;
  price: number; stock: number; soldToday: number; icon: string;
}
export interface Invoice {
  id: string; time: string; type: string; courtName: string; customer: string | null;
  courtFee: number; posFee: number; discount: number; total: number;
  paymentMethod: string | null; items: LineItem[]; createdAt?: string | null;
  paymentAmount?: number | null; depositApplied?: number | null;
  refundAmount?: number | null; sessionId?: string | null;
}
