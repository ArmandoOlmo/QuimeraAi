import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from '../../firebase';
import { db } from '../../firebase';
import { RestaurantReservation, RestaurantReservationStatus } from '../../types/restaurants';
import { getReservationsPath, getRestaurantTenantId, RestaurantScope } from './restaurantPaths';

export async function createReservation(
  scope: RestaurantScope,
  restaurantId: string,
  data: Partial<RestaurantReservation>
) {
  if (!data.customerName?.trim()) throw new Error('Customer name is required');
  if (!data.customerEmail?.trim()) throw new Error('Customer email is required');
  if (!data.date || !data.time) throw new Error('Reservation date and time are required');
  if (!data.partySize || data.partySize < 1) throw new Error('Party size is required');

  const ref = await addDoc(collection(db, getReservationsPath(scope, restaurantId)), {
    tenantId: getRestaurantTenantId(scope),
    restaurantId,
    customerName: data.customerName.trim(),
    customerEmail: data.customerEmail.trim(),
    customerPhone: data.customerPhone || '',
    date: data.date,
    time: data.time,
    partySize: Number(data.partySize),
    tablePreference: data.tablePreference || '',
    status: data.status || 'pending',
    notes: data.notes || '',
    source: data.source || 'manual',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateReservation(
  scope: RestaurantScope,
  restaurantId: string,
  reservationId: string,
  data: Partial<RestaurantReservation>
) {
  await updateDoc(doc(db, getReservationsPath(scope, restaurantId), reservationId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateReservationStatus(
  scope: RestaurantScope,
  restaurantId: string,
  reservationId: string,
  status: RestaurantReservationStatus
) {
  await updateReservation(scope, restaurantId, reservationId, { status });
}

export function listenReservations(
  scope: RestaurantScope,
  restaurantId: string,
  onNext: (items: RestaurantReservation[]) => void,
  onError: (error: Error) => void,
  date?: string
) {
  const ref = collection(db, getReservationsPath(scope, restaurantId));
  const q = date ? query(ref, where('date', '==', date), orderBy('time', 'asc')) : query(ref, orderBy('date', 'desc'), orderBy('time', 'asc'));
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((item) => ({ id: item.id, ...item.data() }) as RestaurantReservation)),
    onError
  );
}
