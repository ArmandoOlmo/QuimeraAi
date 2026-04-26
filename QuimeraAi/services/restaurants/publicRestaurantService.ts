/**
 * Public Restaurant Reservation Service
 * 
 * Handles reservation creation from the public website.
 * Writes to `publicRestaurantMenus/{restaurantId}/publicReservations`
 * which can be read by the dashboard or synced via Cloud Function.
 */
import { addDoc, collection, serverTimestamp } from '../../firebase';
import { db } from '../../firebase';

export interface PublicReservationData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:mm
  partySize: number;
  tablePreference?: string;
  notes?: string;
}

/**
 * Creates a public reservation in Firestore.
 * Validates required fields before writing.
 */
export async function createPublicReservation(
  restaurantId: string,
  data: PublicReservationData
): Promise<string> {
  // Validation
  if (!restaurantId) throw new Error('Restaurant ID is required');
  if (!data.customerName?.trim()) throw new Error('Customer name is required');
  if (!data.customerEmail?.trim()) throw new Error('Customer email is required');
  if (!data.date) throw new Error('Reservation date is required');
  if (!data.time) throw new Error('Reservation time is required');
  if (!data.partySize || data.partySize < 1) throw new Error('Party size must be at least 1');

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.customerEmail.trim())) {
    throw new Error('Invalid email address');
  }

  const ref = await addDoc(
    collection(db, 'publicRestaurantMenus', restaurantId, 'publicReservations'),
    {
      restaurantId,
      customerName: data.customerName.trim(),
      customerEmail: data.customerEmail.trim(),
      customerPhone: data.customerPhone?.trim() || '',
      date: data.date,
      time: data.time,
      partySize: Number(data.partySize),
      tablePreference: data.tablePreference || '',
      notes: data.notes?.trim() || '',
      status: 'pending',
      source: 'website',
      createdAt: serverTimestamp(),
    }
  );

  return ref.id;
}
