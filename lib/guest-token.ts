import { randomBytes } from "crypto";

export const GUEST_TOKEN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const GUEST_TOKEN_PATTERN = /^[A-HJ-KM-NP-Z2-9]{4}$/;

export function createGuestToken() {
  const bytes = randomBytes(4);
  return Array.from(bytes, (byte) => GUEST_TOKEN_ALPHABET[byte % GUEST_TOKEN_ALPHABET.length]).join("");
}

export function createUniqueGuestTokens(count: number) {
  const tokens: string[] = [];
  const used = new Set<string>();
  let attempts = 0;
  while (tokens.length < count) {
    if (++attempts > count * 50) throw new Error("Could not generate unique RSVP codes.");
    const token = createGuestToken();
    if (used.has(token)) continue;
    used.add(token);
    tokens.push(token);
  }
  return tokens;
}

export function normalizeGuestToken(value: string) {
  return value.trim().toUpperCase();
}

export function isGuestToken(value: string) {
  return GUEST_TOKEN_PATTERN.test(value);
}

export function isTokenUniqueViolation(error: { code?: string; message?: string; details?: string }) {
  if (error.code !== "23505") return false;
  return /token/i.test(`${error.message ?? ""} ${error.details ?? ""}`);
}
