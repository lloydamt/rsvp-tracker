"use client";

import { useActionState, useEffect, useState } from "react";
import { addGuests, type AddGuestsResult } from "@/app/actions";
import type { InvitationCategory } from "@/lib/supabase";

export function AddGroupMemberForm({
  groupId,
  groupName,
  defaultInvitationCategory,
  phoneRequired,
}: {
  groupId: string;
  groupName: string;
  defaultInvitationCategory: InvitationCategory;
  phoneRequired: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [invitationCategory, setInvitationCategory] = useState(defaultInvitationCategory);
  const [result, formAction, isPending] = useActionState(
    async (_previous: AddGuestsResult | null, formData: FormData) => {
      try {
        const nextResult = await addGuests(formData);
        if (nextResult.status === "success") {
          setName("");
          setPhone("");
        }
        return nextResult;
      } catch {
        return { status: "error" as const, message: "That guest could not be added. Please try again." };
      }
    },
    null,
  );

  useEffect(() => {
    setInvitationCategory(defaultInvitationCategory);
  }, [defaultInvitationCategory]);

  const phoneError = result?.status === "error" ? result.phoneErrors?.[0] : undefined;
  const visibleResult = result?.status === "error" || result?.status === "success" ? result : null;

  return (
    <form action={formAction} className={`addGroupMemberForm${phoneError ? " hasError" : ""}`}>
      <p className="addGroupMemberHint">Add a plus-one to {groupName}. Phone can be left blank.</p>
      <input type="hidden" name="group_mode" value="existing" />
      <input type="hidden" name="existing_group_id" value={groupId} />
      <label>Name<input name="guest_name" required maxLength={100} placeholder="Plus-one name" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>
        Phone
        <span className="optionalField">{phoneRequired ? "Required" : "Optional"}</span>
        <input
          name="guest_phone"
          required={phoneRequired}
          inputMode="tel"
          autoComplete="tel"
          placeholder="07700 900123"
          value={phone}
          aria-invalid={Boolean(phoneError)}
          aria-describedby={phoneError ? `group-member-phone-error-${groupId}` : undefined}
          onChange={(event) => setPhone(event.target.value)}
        />
        {phoneError && <small className="guestPhoneError" id={`group-member-phone-error-${groupId}`} role="alert">{phoneError}</small>}
      </label>
      <label>Invitation<select
        name="guest_invitation_category"
        required
        value={invitationCategory}
        onChange={(event) => setInvitationCategory(event.target.value as InvitationCategory)}
      ><option value="ceremony_reception">Ceremony &amp; reception</option><option value="reception_only">Reception only</option></select></label>
      <button type="submit" disabled={isPending}>{isPending ? "Adding…" : "Add to group"}</button>
      {visibleResult && visibleResult.status === "error" && !phoneError && <p className="addGuestFeedback error" role="alert">{visibleResult.message}</p>}
    </form>
  );
}
