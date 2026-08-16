import { updateGuest } from "@/app/actions";
import { Guest } from "@/lib/supabase";
import { DeleteGuestForm } from "./delete-guest-form";
import { SendInviteForm } from "./send-invite-form";

export function GuestCard({
  guest,
  isPreview,
  groupName,
  hideGroupName = false,
}: {
  guest: Guest;
  isPreview: boolean;
  groupName?: string | null;
  hideGroupName?: boolean;
}) {
  return (
    <details className="guestCard">
      <summary className={`guestSummary ${isPreview ? "preview" : ""}`}>
        {!isPreview && <input className="guestCheckbox" type="checkbox" name="guest_ids" value={guest.id} form="bulk-guest-form" data-grouped={guest.group_id ? "true" : "false"} aria-label={`Select ${guest.name}`} />}
        <span className="guestIdentity"><strong>{guest.name}</strong><span>{guest.phone}</span></span>
        <span className="guestResponse">
          <span className={`statusLabel ${guest.status}`}><i aria-hidden="true" />{guest.status === "pending" ? "Awaiting reply" : guest.status === "declined" ? "Declined" : "Attending"}</span>
          <span className="guestMeta">
            {guest.invitation_category === "ceremony_reception" ? "Ceremony & reception" : "Reception only"}
            {guest.status === "attending" && <> · Party of {guest.party_size}</>}
            {guest.group_id && !hideGroupName && <> · {groupName ?? "Group"}</>}
          </span>
        </span>
      </summary>
      <div className="guestDetails">
        {isPreview && <p className="previewDetail">Generated preview guest — management actions are disabled.</p>}
        <p className="guestCode">RSVP code <strong>{guest.token}</strong></p>
        {!isPreview && <form action={updateGuest} className="guestEditForm">
          <input type="hidden" name="id" value={guest.id} />
          <label>Name<input name="name" required maxLength={100} defaultValue={guest.name} /></label>
          <label>Phone<input name="phone" required inputMode="tel" autoComplete="tel" defaultValue={guest.phone} /></label>
          <label>Invitation<select name="invitation_category" required defaultValue={guest.invitation_category}><option value="ceremony_reception">Ceremony &amp; reception</option><option value="reception_only">Reception only</option></select></label>
          <button className="secondary" type="submit">Save changes</button>
        </form>}
        {guest.notes && <p className="guestNote">Guest note: “{guest.notes}”</p>}
        {!isPreview && <div className="guestActions">
          <SendInviteForm id={guest.id} hasBeenSent={Boolean(guest.message_sent_at)} />
          <DeleteGuestForm id={guest.id} name={guest.name} />
        </div>}
      </div>
    </details>
  );
}
