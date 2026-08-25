import { invitationMessage } from "@/lib/messaging/invitation-message";
import { Guest } from "@/lib/supabase";
import type { SmsViaOption } from "@/lib/phone";
import { DeleteGuestForm } from "./delete-guest-form";
import { GuestCardShell } from "./guest-card-shell";
import { GuestEditForm } from "./guest-edit-form";
import { InvitationTextPreview, SendInviteForm } from "./send-invite-form";
import { DragHandle } from "./sortable-list";

export function GuestCard({
  guest,
  isPreview,
  groupName,
  hideGroupName = false,
  sortable = false,
  selectable = true,
  canSend = false,
  smsViaName,
  smsViaGuests = [],
  appUrl,
}: {
  guest: Guest;
  isPreview: boolean;
  groupName?: string | null;
  hideGroupName?: boolean;
  sortable?: boolean;
  selectable?: boolean;
  canSend?: boolean;
  smsViaName?: string | null;
  smsViaGuests?: SmsViaOption[];
  appUrl: string;
}) {
  const draftMessage = invitationMessage(guest, appUrl);

  return (
    <GuestCardShell
      summary={
        <summary className={`guestSummary${isPreview || !selectable ? " preview" : ""}${sortable ? " sortable" : ""}`}>
          {sortable && <DragHandle id={guest.id} label={guest.name} />}
          {!isPreview && selectable && <input className="guestCheckbox" type="checkbox" name="guest_ids" value={guest.id} form="bulk-guest-form" data-grouped={guest.group_id ? "true" : "false"} aria-label={`Select ${guest.name}`} />}
          <span className="guestIdentity">
            <strong>{guest.name}</strong>
            <span className={guest.phone ? undefined : "noPhone"}>
              {guest.phone ?? "No phone"}
              {smsViaName ? ` · Texts via ${smsViaName}` : ""}
            </span>
          </span>
          <span className="guestResponse">
            <span className={`statusLabel ${guest.status}`}><i aria-hidden="true" />{guest.status === "pending" ? "Awaiting reply" : guest.status === "declined" ? "Declined" : "Attending"}</span>
            <span className="guestMeta">
              {guest.invitation_category === "ceremony_reception" ? "Ceremony & reception" : "Reception only"}
              {guest.status === "attending" && <> · Party of {guest.party_size}</>}
              {guest.group_id && !hideGroupName && <> · {groupName ?? "Group"}</>}
            </span>
          </span>
        </summary>
      }
      message={
        isPreview ? (
          <InvitationTextPreview draftMessage={draftMessage} />
        ) : (
          <SendInviteForm id={guest.id} hasBeenSent={Boolean(guest.message_sent_at)} canSend={canSend} draftMessage={draftMessage}>
            <DeleteGuestForm id={guest.id} name={guest.name} />
          </SendInviteForm>
        )
      }
    >
      {isPreview && <p className="previewDetail">Generated preview guest — management actions are disabled.</p>}
      <p className="guestCode">RSVP code <strong>{guest.token}</strong></p>
      {!isPreview && <GuestEditForm guest={guest} smsViaGuests={smsViaGuests} smsViaName={smsViaName} />}
      {guest.notes && <p className="guestNote">Guest note: “{guest.notes}”</p>}
    </GuestCardShell>
  );
}
