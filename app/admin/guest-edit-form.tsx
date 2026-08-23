"use client";

import { useActionState } from "react";
import { updateGuest } from "@/app/actions";
import { Guest } from "@/lib/supabase";
import type { SmsViaOption } from "@/lib/phone";
import { SmsViaSelect } from "./sms-via-select";

export function GuestEditForm({ guest, smsViaGuests, smsViaName }: { guest: Guest; smsViaGuests: SmsViaOption[]; smsViaName?: string | null }) {
  const [result, formAction, isPending] = useActionState(
    async (_previous: { status: "error"; message: string } | null, formData: FormData) => {
      try {
        await updateGuest(formData);
        return null;
      } catch (error) {
        return { status: "error" as const, message: error instanceof Error ? error.message : "Those changes could not be saved." };
      }
    },
    null,
  );

  const options = guest.sms_via_guest_id && smsViaName && !smsViaGuests.some((option) => option.id === guest.sms_via_guest_id)
    ? [{ id: guest.sms_via_guest_id, name: smsViaName }, ...smsViaGuests]
    : smsViaGuests;

  return (
    <form action={formAction} className="guestEditForm">
      <input type="hidden" name="id" value={guest.id} />
      <label><span className="fieldCaption">Name</span><input name="name" required maxLength={100} defaultValue={guest.name} /></label>
      <label><span className="fieldCaption">Phone{guest.group_id ? <span className="optionalField">Optional in a group</span> : null}</span><input name="phone" required={!guest.group_id} inputMode="tel" autoComplete="tel" defaultValue={guest.phone ?? ""} placeholder="07700 900123 or +1…" /></label>
      <SmsViaSelect name="sms_via_guest_id" options={options} defaultValue={guest.sms_via_guest_id ?? ""} exceptId={guest.id} />
      <label><span className="fieldCaption">Invitation</span><select name="invitation_category" required defaultValue={guest.invitation_category}><option value="ceremony_reception">Ceremony &amp; reception</option><option value="reception_only">Reception only</option></select></label>
      <button className="secondary" type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save changes"}</button>
      {result?.status === "error" && <p className="guestEditError" role="alert">{result.message}</p>}
    </form>
  );
}
