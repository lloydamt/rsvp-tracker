import { guestPhoneMatchesQuery, phoneSearchDigits } from "./phone";

export function normalizeSearchQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isGuestSearchQueryUseful(query: string) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return false;
  const letters = normalized.replace(/[^\p{L}]/gu, "");
  return letters.length >= 2 || phoneSearchDigits(normalized).length >= 4;
}

export function nameMatchesQuery(name: string, query: string) {
  const normalized = normalizeSearchQuery(query).toLowerCase();
  const letters = normalized.replace(/[^\p{L}]/gu, "");
  if (letters.length < 2) return false;
  return name.toLowerCase().includes(normalized);
}

export function guestMatchesSearch(
  guest: { name: string; phone: string | null; sms_via_guest_id: string | null },
  query: string,
  viaPhone?: string | null,
) {
  if (!isGuestSearchQueryUseful(query)) return false;
  if (nameMatchesQuery(guest.name, query)) return true;
  if (guestPhoneMatchesQuery(guest.phone, query)) return true;
  return Boolean(guest.sms_via_guest_id && viaPhone && guestPhoneMatchesQuery(viaPhone, query));
}
