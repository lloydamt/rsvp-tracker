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
      <fieldset className="rsvpSection">
        <legend>Your response</legend>
        <div className="choiceGrid twoChoices">
          <label className="choice"><input type="radio" name="status" value="attending" required defaultChecked={ownerStatus === "attending"} /><span>Attending<small>I’ll be there</small></span></label>
          <label className="choice"><input type="radio" name="status" value="declined" required defaultChecked={ownerStatus === "declined"} /><span>Not attending<small>I can’t make it</small></span></label>
        </div>
      </fieldset>
      <fieldset className="rsvpSection">
        <legend>Who are you responding for?</legend>
        <div className="choiceGrid">
          <label className="choice"><input type="radio" name="scope" value="self" checked={scope === "self"} onChange={() => setScope("self")} /><span>Myself only<small>Update only my response</small></span></label>
          <label className="choice"><input type="radio" name="scope" value="selected" checked={scope === "selected"} onChange={() => setScope("selected")} /><span>Selected people<small>Choose specific group members</small></span></label>
          <label className="choice"><input type="radio" name="scope" value="group" checked={scope === "group"} onChange={() => setScope("group")} /><span>Everyone in the group<small>Apply this response to the whole group</small></span></label>
        </div>
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
      <label className="noteField">Note <span>(optional)</span><textarea name="notes" maxLength={500} defaultValue={initialNotes ?? ""} placeholder="Dietary needs or a message…" /></label>
      <button className="saveRsvpButton" type="submit">Save RSVP</button>
    </form>
  );
}
