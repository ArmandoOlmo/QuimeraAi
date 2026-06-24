import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type ReservationSource = "website" | "qrMenu" | "aiAssistant";

type PublicReservationPayload = {
  restaurantId?: unknown;
  customerName?: unknown;
  customerEmail?: unknown;
  customerPhone?: unknown;
  date?: unknown;
  time?: unknown;
  partySize?: unknown;
  tablePreference?: unknown;
  notes?: unknown;
  source?: unknown;
};

type RestaurantRow = {
  id: string;
  tenant_id: string;
  owner_id: string;
  name: string;
  reservation_enabled: boolean | null;
  max_party_size: number | null;
  reservation_interval: number | null;
  average_table_duration: number | null;
  public_slug: string | null;
  qr_menu_enabled: boolean | null;
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const integrationDrafts = {
  analyticsEvent: "reservation_created",
  crmLeadSource: "reservation_created",
  emailFlow: "reservation_received",
  chatbotIntent: "book_reservation",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json() as PublicReservationPayload;
    const restaurantId = normalizeString(payload.restaurantId);
    if (!restaurantId) throw httpError("Restaurant ID is required", 400);

    const restaurant = await getRestaurant(restaurantId);
    const reservation = validateReservation(payload, restaurant);
    const existing = await findExistingReservation(restaurant, reservation);

    if (existing) {
      return json({
        reservationId: existing.id,
        restaurantId: restaurant.id,
        status: existing.status || "pending",
        source: reservation.source,
        deduped: true,
        integrationDrafts,
      });
    }

    const { data, error } = await supabase
      .from("restaurant_reservations")
      .insert({
        tenant_id: restaurant.tenant_id,
        restaurant_id: restaurant.id,
        customer_name: reservation.customerName,
        customer_email: reservation.customerEmail,
        customer_phone: reservation.customerPhone,
        date: reservation.date,
        time: reservation.time,
        party_size: reservation.partySize,
        table_preference: reservation.tablePreference,
        status: "pending",
        notes: reservation.notes,
        source: reservation.source,
      })
      .select("id, status")
      .single();

    if (error) throw error;
    await recordAnalyticsEvent(restaurant, data.id, reservation, false);

    return json({
      reservationId: data.id,
      restaurantId: restaurant.id,
      status: data.status || "pending",
      source: reservation.source,
      deduped: false,
      integrationDrafts,
    });
  } catch (error) {
    const status = typeof (error as { status?: unknown })?.status === "number"
      ? Number((error as { status: number }).status)
      : 400;
    const message = error instanceof Error ? error.message : "Reservation could not be created";
    console.error("[create-public-restaurant-reservation]", error);
    return json({ error: message }, status);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeEmail(value: unknown) {
  return normalizeString(value).toLowerCase();
}

function normalizeTime(value: unknown) {
  const raw = normalizeString(value);
  return /^\d{2}:\d{2}$/.test(raw) ? raw : raw.slice(0, 5);
}

function minutesFromMidnight(time: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function parseLocalReservationDate(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeSource(value: unknown): ReservationSource {
  return value === "qrMenu" || value === "aiAssistant" ? value : "website";
}

async function getRestaurant(restaurantIdOrSlug: string): Promise<RestaurantRow> {
  const select = "id, tenant_id, owner_id, name, reservation_enabled, max_party_size, reservation_interval, average_table_duration, public_slug, qr_menu_enabled";
  const query = supabase.from("restaurants").select(select);
  const lookup = uuidRegex.test(restaurantIdOrSlug)
    ? query.eq("id", restaurantIdOrSlug)
    : query.eq("public_slug", restaurantIdOrSlug);

  const { data, error } = await lookup.maybeSingle();
  if (error) throw error;
  if (!data) throw httpError("Restaurant not found", 404);
  return data as RestaurantRow;
}

function validateReservation(payload: PublicReservationPayload, restaurant: RestaurantRow) {
  const customerName = normalizeString(payload.customerName);
  const customerEmail = normalizeEmail(payload.customerEmail);
  const customerPhone = normalizeString(payload.customerPhone);
  const date = normalizeString(payload.date);
  const time = normalizeTime(payload.time);
  const partySize = Number(payload.partySize);
  const tablePreference = normalizeString(payload.tablePreference);
  const notes = normalizeString(payload.notes);
  const source = normalizeSource(payload.source);

  if (!customerName) throw httpError("Customer name is required", 400);
  if (!customerEmail) throw httpError("Customer email is required", 400);
  if (!emailRegex.test(customerEmail)) throw httpError("Invalid email address", 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw httpError("Reservation date is required", 400);
  if (minutesFromMidnight(time) === null) throw httpError("Reservation time is required", 400);
  if (!Number.isFinite(partySize) || partySize < 1) throw httpError("Party size must be at least 1", 400);

  if (restaurant.reservation_enabled === false) {
    throw httpError("This restaurant is not accepting online reservations", 400);
  }

  const maxPartySize = Number(restaurant.max_party_size || 0);
  if (maxPartySize > 0 && partySize > maxPartySize) {
    throw httpError(`Party size cannot exceed ${maxPartySize}`, 400);
  }

  const reservationDate = parseLocalReservationDate(date, time);
  if (!reservationDate || reservationDate.getTime() <= Date.now()) {
    throw httpError("Reservation date and time must be in the future", 400);
  }

  const interval = Number(restaurant.reservation_interval || 0);
  const minutes = minutesFromMidnight(time);
  if (interval > 0 && minutes !== null && minutes % interval !== 0) {
    throw httpError(`Reservation time must align with ${interval}-minute intervals`, 400);
  }

  return {
    customerName,
    customerEmail,
    customerPhone,
    date,
    time,
    partySize,
    tablePreference,
    notes,
    source,
  };
}

async function findExistingReservation(
  restaurant: RestaurantRow,
  reservation: ReturnType<typeof validateReservation>
) {
  const { data, error } = await supabase
    .from("restaurant_reservations")
    .select("id, status, party_size")
    .eq("tenant_id", restaurant.tenant_id)
    .eq("restaurant_id", restaurant.id)
    .eq("customer_email", reservation.customerEmail)
    .eq("date", reservation.date)
    .eq("time", reservation.time)
    .eq("source", reservation.source)
    .neq("status", "cancelled")
    .limit(10);

  if (error) throw error;

  return (data || []).find((item) => Number(item.party_size) === reservation.partySize) || null;
}

async function recordAnalyticsEvent(
  restaurant: RestaurantRow,
  reservationId: string,
  reservation: ReturnType<typeof validateReservation>,
  deduped: boolean
) {
  const { error } = await supabase
    .from("restaurant_analytics_events")
    .insert({
      tenant_id: restaurant.tenant_id,
      restaurant_id: restaurant.id,
      event_name: "reservation_created",
      metadata: {
        reservationId,
        source: reservation.source,
        partySize: reservation.partySize,
        deduped,
        crmLeadSource: integrationDrafts.crmLeadSource,
        emailFlow: integrationDrafts.emailFlow,
        chatbotIntent: integrationDrafts.chatbotIntent,
      },
    });

  if (error) {
    console.warn("[create-public-restaurant-reservation] analytics event failed:", error.message);
  }
}
