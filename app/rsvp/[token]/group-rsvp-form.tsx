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
  const [status, setStatus] = useState(ownerStatus === "attending" || ownerStatus === "declined" ? ownerStatus : "");
  const action = submitGroupRsvp.bind(null, token);
  const canSave = status === "attending" || status === "declined";

  return (
    <form action={action} className="rsvpForm">
      <fieldset className="rsvpSection">
        <legend>Your response</legend>
        <div className="choiceGrid twoChoices">
          <label className="choice"><input type="radio" name="status" value="attending" required checked={status === "attending"} onChange={() => setStatus("attending")} /><span>Attending<small>I’ll be there</small></span></label>
          <label className="choice"><input type="radio" name="status" value="declined" required checked={status === "declined"} onChange={() => setStatus("declined")} /><span>Not attending<small>I can’t make it</small></span></label>
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
          {members.map((member) => {
            const isOwner = member.id === ownerId;
            return (
              <label className="choice" key={member.id}>
                <input type="checkbox" name="selected_ids" value={member.id} defaultChecked={isOwner} disabled={isOwner} />
                <span>
                  {member.name}
                  <small>
                    {isOwner ? "You — this response always includes you · " : ""}
                    Current response: {member.status === "pending" ? "Not responded" : member.status === "declined" ? "Not attending" : "Attending"}
                  </small>
                </span>
              </label>
            );
          })}
          <input type="hidden" name="selected_ids" value={ownerId} />
        </fieldset>
      )}
      <label className="noteField">Note <span>(optional)</span><textarea name="notes" maxLength={500} defaultValue={initialNotes ?? ""} placeholder="Dietary needs or a message…" /></label>
      <button className="saveRsvpButton" type="submit" disabled={!canSave} title={canSave ? undefined : "Choose a response to save"}>Save RSVP</button>
    </form>
  );
}
