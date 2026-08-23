export type SmsViaOption = { id: string; name: string };

export const invalidPhoneMessage = "Enter a UK number such as 07700900123 or +447700900123, or an international number starting with +.";

export function isUkPhone(phone: string | null | undefined): phone is string {
  return typeof phone === "string" && /^\+44\d{10}$/.test(phone);
}

export function parseGuestPhone(value: FormDataEntryValue | null) {
  const phone = String(value ?? "")
    .trim()
    .replace(/[\s()-]/g, "");

  if (!phone) return { ok: true as const, phone: null };
  if (/^0\d{10}$/.test(phone)) return { ok: true as const, phone: `+44${phone.slice(1)}` };
  if (/^\+44\d{10}$/.test(phone)) return { ok: true as const, phone };
  if (/^\+[1-9]\d{7,14}$/.test(phone)) return { ok: true as const, phone };
  return { ok: false as const, error: invalidPhoneMessage };
}

export function isSmsViaRecipient(guest: { phone: string | null; sms_via_guest_id: string | null }) {
  return isUkPhone(guest.phone) && !guest.sms_via_guest_id;
}

export type InviteDestination = { phone: string; viaName: string | null };

export function inviteDestination(
  guest: { phone: string | null; sms_via_guest_id: string | null },
  viaGuest: { name: string; phone: string | null; sms_via_guest_id: string | null } | null | undefined,
): { ok: true; destination: InviteDestination } | { ok: false; message: string } {
  if (guest.sms_via_guest_id) {
    if (!viaGuest) return { ok: false, message: "The guest chosen to receive this text no longer exists." };
    if (viaGuest.sms_via_guest_id) {
      return { ok: false, message: `${viaGuest.name} cannot receive texts for others because their own texts are sent via someone else.` };
    }
    if (!isUkPhone(viaGuest.phone)) return { ok: false, message: `${viaGuest.name} needs a UK number to receive invitation texts.` };
    return { ok: true, destination: { phone: viaGuest.phone, viaName: viaGuest.name } };
  }
  if (isUkPhone(guest.phone)) return { ok: true, destination: { phone: guest.phone, viaName: null } };
  if (guest.phone) return { ok: false, message: "Choose a guest with a UK number to receive this invitation text." };
  return { ok: false, message: "This guest has no phone number. Send the invitation to a group member who has one." };
}

export function guestCanSendInvite(
  guest: { phone: string | null; sms_via_guest_id: string | null },
  viaGuest: { name: string; phone: string | null; sms_via_guest_id: string | null } | null | undefined,
) {
  return inviteDestination(guest, viaGuest).ok;
}

export function smsViaOptions(guests: Array<{ id: string; name: string; phone: string | null; sms_via_guest_id: string | null }>, exceptId?: string) {
  return guests
    .filter((guest) => guest.id !== exceptId && isSmsViaRecipient(guest))
    .map((guest) => ({ id: guest.id, name: guest.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
