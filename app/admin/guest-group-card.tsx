import { Guest } from "@/lib/supabase";
import { AddGroupMemberForm } from "./add-group-member-form";
import { GuestCard } from "./guest-card";
import { GroupSelectCheckbox } from "./group-select-checkbox";
import { DragHandle } from "./sortable-list";

function rsvpParts(members: Guest[]) {
  const attending = members.filter((guest) => guest.status === "attending").length;
  const pending = members.filter((guest) => guest.status === "pending").length;
  const declined = members.filter((guest) => guest.status === "declined").length;
  const parts: { status: "attending" | "pending" | "declined"; label: string }[] = [];
  if (attending) parts.push({ status: "attending", label: `${attending} attending` });
  if (pending) parts.push({ status: "pending", label: `${pending} awaiting` });
  if (declined) parts.push({ status: "declined", label: `${declined} declined` });
  return parts;
}

export function GuestGroupCard({
  id,
  name,
  members,
  isPreview,
  sortable = false,
}: {
  id: string;
  name: string;
  members: Guest[];
  isPreview: boolean;
  sortable?: boolean;
}) {
  const breakdown = rsvpParts(members);
  const defaultInvitationCategory = members[0]?.invitation_category ?? "ceremony_reception";

  return (
    <details className="groupCard">
      <summary className={`groupSummary${isPreview ? " preview" : ""}${sortable ? " sortable" : ""}`}>
        {sortable && <DragHandle id={id} label={name} />}
        {!isPreview && <GroupSelectCheckbox groupName={name} guestIds={members.map((guest) => guest.id)} />}
        <span className="groupIdentity">
          <strong>{name}</strong>
          <span>{members.length} guest{members.length === 1 ? "" : "s"}</span>
        </span>
        <span className="groupResponse">
          {breakdown.map((part) => (
            <span className={`statusLabel ${part.status}`} key={part.status}><i aria-hidden="true" />{part.label}</span>
          ))}
        </span>
      </summary>
      <div className="groupMembers">
        {members.map((guest) => (
          <GuestCard key={guest.id} guest={guest} isPreview={isPreview} hideGroupName />
        ))}
        {!isPreview && (
          <AddGroupMemberForm
            groupId={id}
            groupName={name}
            defaultInvitationCategory={defaultInvitationCategory}
            phoneRequired={members.every((guest) => !guest.phone)}
          />
        )}
      </div>
    </details>
  );
}
