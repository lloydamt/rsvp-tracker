"use client";

import { useActionState, useEffect, useState } from "react";
import { addGuests, type AddGuestsResult } from "@/app/actions";
import type { InvitationCategory } from "@/lib/supabase";
import type { SmsViaOption } from "@/lib/phone";
import { SmsViaSelect } from "./sms-via-select";

export function AddGroupMemberForm({
  groupId,
  groupName,
  defaultInvitationCategory,
  phoneRequired,
  smsViaGuests,
}: {
  groupId: string;
  groupName: string;
  defaultInvitationCategory: InvitationCategory;
  phoneRequired: boolean;
  smsViaGuests: SmsViaOption[];
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [smsViaGuestId, setSmsViaGuestId] = useState("");
  const [invitationCategory, setInvitationCategory] = useState(defaultInvitationCategory);
  const [result, formAction, isPending] = useActionState(
    async (_previous: AddGuestsResult | null, formData: FormData) => {
      try {
        const nextResult = await addGuests(formData);
        if (nextResult.status === "success") {
          setName("");
          setPhone("");
          setSmsViaGuestId("");
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
      <p className="addGroupMemberHint">Add a plus-one to {groupName}. Phone can be left blank. International numbers must send texts via a guest with a UK number.</p>
      <input type="hidden" name="group_mode" value="existing" />
      <input type="hidden" name="existing_group_id" value={groupId} />
      <label><span className="fieldCaption">Name</span><input name="guest_name" required maxLength={100} placeholder="Plus-one name" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>
        <span className="fieldCaption">Phone <span className="optionalField">{phoneRequired ? "Required" : "Optional"}</span></span>
        <input
          name="guest_phone"
          required={phoneRequired}
          inputMode="tel"
          autoComplete="tel"
          placeholder="07700 900123 or +1…"
          value={phone}
          aria-invalid={Boolean(phoneError)}
          aria-describedby={phoneError ? `group-member-phone-error-${groupId}` : undefined}
          onChange={(event) => setPhone(event.target.value)}
        />
        {phoneError && <small className="guestPhoneError" id={`group-member-phone-error-${groupId}`} role="alert">{phoneError}</small>}
      </label>
      <SmsViaSelect name="guest_sms_via_guest_id" options={smsViaGuests} value={smsViaGuestId} onChange={setSmsViaGuestId} />
      <label><span className="fieldCaption">Invitation</span><select
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
