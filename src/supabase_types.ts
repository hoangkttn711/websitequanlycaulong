import type { BookingStatus, CourtStatus, LineItem, ProductCategory } from './domain';

/** app_read_state JSON contracts, including fields omitted for anonymous readers.
 * These describe the current RPC payloads, not a new database schema.
 */
type DbNumber = number | string;
export interface CourtRow {
  id: DbNumber; name: string; zone: string; mat_color: string; status: CourtStatus;
  customer?: string | null; rate_type?: string | null; hourly_rate?: DbNumber | null;
  start_time?: string | null; booked_hours?: DbNumber | null;
  elapsed_minutes?: DbNumber | null; deposit?: DbNumber | null; items?: LineItem[] | null;
  started_at?: string | null; session_id?: string | null; booking_id?: string | null;
}
export interface BookingRow {
  id: string; customer?: string | null; phone?: string | null; court_id: DbNumber;
  slot: string; booking_date: string | null; type?: string | null;
  deposit?: DbNumber | null; status: BookingStatus; created_at?: string | null;
  is_mine?: boolean;
}
export interface ProductRow {
  id: string; name: string; category: ProductCategory; unit: string;
  cost?: DbNumber | null; price: DbNumber; stock: DbNumber; icon?: string | null;
}
export interface InvoiceRow {
  id: string; time: string; type: string; court_name: string; customer: string | null;
  court_fee: DbNumber | null; pos_fee: DbNumber | null; discount: DbNumber | null;
  total: DbNumber; payment_method: string | null; items?: LineItem[] | null;
  created_at?: string | null; payment_amount?: number | null;
  deposit_applied?: number | null; refund_amount?: number | null; session_id?: string | null;
}
export interface OrderRow {
  id: string; booking_id: string | null; items: LineItem[]; note: string;
  total: number; status: 'pending' | 'accepted' | 'cancelled'; created_at: string;
}
export interface Snapshot {
  revision: number; courts: CourtRow[]; bookings: BookingRow[];
  products: ProductRow[]; invoices: InvoiceRow[]; orders?: OrderRow[];
}
export interface ReservationResult { booking_ids: string[]; state: Snapshot }
/** PostgREST results keep the SDK's actual success/error distinction. */
export type SupabaseResult<T> = import('@supabase/supabase-js').PostgrestSingleResponse<T>;
