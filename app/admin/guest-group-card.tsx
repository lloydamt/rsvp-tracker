import { Guest } from "@/lib/supabase";
import { GuestCard } from "./guest-card";
import { GroupSelectCheckbox } from "./group-select-checkbox";

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
  name,
  members,
  isPreview,
}: {
  name: string;
  members: Guest[];
  isPreview: boolean;
}) {
  const breakdown = rsvpParts(members);

  return (
    <details className="groupCard">
      <summary className={`groupSummary ${isPreview ? "preview" : ""}`}>
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
      </div>
    </details>
  );
}
