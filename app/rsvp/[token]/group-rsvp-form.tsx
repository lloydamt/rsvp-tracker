"use client";

import { useState } from "react";
import { submitGroupRsvp } from "@/app/actions";

type Member = { id: string; name: string; status: string };

export function GroupRsvpForm({
  token,
  ownerId,
  ownerStatus,
  initialNotes,
  members,
}: {
  token: string;
  ownerId: string;
  ownerStatus: string;
  initialNotes: string | null;
  members: Member[];
}) {
  const [scope, setScope] = useState("self");
  const action = submitGroupRsvp.bind(null, token);

  return (
    <form action={action} className="rsvpForm">
      <fieldset>
        <legend>Your response</legend>
        <label className="choice"><input type="radio" name="status" value="attending" required defaultChecked={ownerStatus === "attending"} /> Attending</label>
        <label className="choice"><input type="radio" name="status" value="declined" required defaultChecked={ownerStatus === "declined"} /> Not attending</label>
      </fieldset>
      <fieldset>
        <legend>Who are you responding for?</legend>
        <label className="choice"><input type="radio" name="scope" value="self" checked={scope === "self"} onChange={() => setScope("self")} /> Myself only</label>
        <label className="choice"><input type="radio" name="scope" value="selected" checked={scope === "selected"} onChange={() => setScope("selected")} /> Selected people</label>
        <label className="choice"><input type="radio" name="scope" value="group" checked={scope === "group"} onChange={() => setScope("group")} /> Everyone in the group</label>
      </fieldset>
      {scope === "selected" && (
        <fieldset className="memberPicker">
          <legend>Select people</legend>
          {members.map((member) => (
            <label className="choice" key={member.id}>
              <input type="checkbox" name="selected_ids" value={member.id} defaultChecked={member.id === ownerId} />
              <span>{member.name}<small>Current response: {member.status === "pending" ? "Not responded" : member.status === "declined" ? "Not attending" : "Attending"}</small></span>
            </label>
          ))}
        </fieldset>
      )}
      <label>Note (optional)<textarea name="notes" maxLength={500} defaultValue={initialNotes ?? ""} placeholder="Dietary needs or a message…" /></label>
      <button type="submit">Save RSVP</button>
    </form>
  );
}
