"use client";

import { useActionState } from "react";
import { updateGuest } from "@/app/actions";
import { Guest } from "@/lib/supabase";

export function GuestEditForm({ guest }: { guest: Guest }) {
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

  return (
    <form action={formAction} className="guestEditForm">
      <input type="hidden" name="id" value={guest.id} />
      <label>Name<input name="name" required maxLength={100} defaultValue={guest.name} /></label>
      <label>Phone{guest.group_id ? <span className="optionalField">Optional in a group</span> : null}<input name="phone" required={!guest.group_id} inputMode="tel" autoComplete="tel" defaultValue={guest.phone ?? ""} placeholder="07700 900123" /></label>
      <label>Invitation<select name="invitation_category" required defaultValue={guest.invitation_category}><option value="ceremony_reception">Ceremony &amp; reception</option><option value="reception_only">Reception only</option></select></label>
      <button className="secondary" type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save changes"}</button>
      {result?.status === "error" && <p className="guestEditError" role="alert">{result.message}</p>}
    </form>
  );
}
