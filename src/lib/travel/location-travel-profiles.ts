import type { SupabaseClient } from "@supabase/supabase-js";

export interface LocationTravelProfile {
  id: string;
  user_id: string;
  label: string;
  normalized_label: string;
  travel_minutes: number;
  departure_slots: string[];
  strict_by_default: boolean;
  active: boolean;
}

const HOME_LABELS = new Set([
  "home",
  "my home",
  "house",
  "room",
  "dorm",
  "hostel",
]);

export function normalizeLocationLabel(label: string | null | undefined): string {
  if (!label) return "";
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isHomeLabel(label: string | null | undefined): boolean {
  const normalized = normalizeLocationLabel(label);
  return normalized.length > 0 && HOME_LABELS.has(normalized);
}

export function parseDepartureSlots(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const valid = raw
    .filter((value): value is string => typeof value === "string")
    .map((slot) => slot.trim())
    .filter((slot) => /^([01]\d|2[0-3]):[0-5]\d$/.test(slot));

  return Array.from(new Set(valid)).sort((a, b) => a.localeCompare(b));
}

export async function fetchActiveTravelProfiles(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<Map<string, LocationTravelProfile>> {
  const { data, error } = await supabase
    .from("location_travel_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true);

  if (error || !Array.isArray(data)) {
    if (error) {
      console.warn("[Travel Profiles] Failed to load travel profiles:", error.message);
    }
    return new Map();
  }

  const profiles = new Map<string, LocationTravelProfile>();
  for (const row of data) {
    const profile: LocationTravelProfile = {
      id: row.id,
      user_id: row.user_id,
      label: row.label,
      normalized_label:
        row.normalized_label || normalizeLocationLabel(row.label || ""),
      travel_minutes: Number(row.travel_minutes || 0),
      departure_slots: parseDepartureSlots(row.departure_slots),
      strict_by_default: row.strict_by_default !== false,
      active: row.active !== false,
    };
    profiles.set(profile.normalized_label, profile);
  }

  return profiles;
}

function getSlotDate(anchorStart: Date, slot: string): Date {
  const [hourStr, minuteStr] = slot.split(":");
  const slotDate = new Date(anchorStart);
  slotDate.setHours(Number(hourStr), Number(minuteStr), 0, 0);
  return slotDate;
}

export interface SlotSelectionResult {
  selectedSlotTime: Date | null;
  selectedSlotLabel: string | null;
  nextFeasibleSlotLabel: string | null;
}

export function selectDepartureSlotForAnchor(
  anchorStart: Date,
  effectiveDeadline: Date,
  travelMinutes: number,
  slots: string[],
  now?: Date,
): SlotSelectionResult {
  if (!slots.length) {
    return {
      selectedSlotTime: null,
      selectedSlotLabel: null,
      nextFeasibleSlotLabel: null,
    };
  }

  const candidates = slots
    .map((slot) => ({
      slot,
      departure: getSlotDate(anchorStart, slot),
    }))
    .map(({ slot, departure }) => ({
      slot,
      departure,
      arrival: new Date(departure.getTime() + travelMinutes * 60_000),
    }))
    .filter(({ arrival }) => arrival.getTime() <= effectiveDeadline.getTime())
    .sort((a, b) => a.departure.getTime() - b.departure.getTime());

  if (!candidates.length) {
    return {
      selectedSlotTime: null,
      selectedSlotLabel: null,
      nextFeasibleSlotLabel: null,
    };
  }

  if (!now) {
    const latest = candidates[candidates.length - 1];
    return {
      selectedSlotTime: latest.departure,
      selectedSlotLabel: latest.slot,
      nextFeasibleSlotLabel: null,
    };
  }

  const futureCandidates = candidates.filter(
    ({ departure }) => departure.getTime() >= now.getTime(),
  );

  const selected = futureCandidates.length
    ? futureCandidates[0]
    : candidates[candidates.length - 1];
  const nextFeasible = futureCandidates[0] || null;

  return {
    selectedSlotTime: selected.departure,
    selectedSlotLabel: selected.slot,
    nextFeasibleSlotLabel: nextFeasible ? nextFeasible.slot : null,
  };
}

export function shouldSuppressTravel(
  destinationLabel: string | null | undefined,
  currentLocationLabel: string | null | undefined,
): boolean {
  const destination = normalizeLocationLabel(destinationLabel);
  const current = normalizeLocationLabel(currentLocationLabel);
  if (!destination) return true;
  if (isHomeLabel(destination)) return true;
  if (current && destination === current) return true;
  return false;
}
