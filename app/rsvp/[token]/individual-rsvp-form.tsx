"use client";

import { useState } from "react";
import { submitRsvp } from "@/app/actions";

export function IndividualRsvpForm({
  token,
  initialStatus,
  initialNotes,
}: {
  token: string;
  initialStatus: string;
  initialNotes: string | null;
}) {
  const [status, setStatus] = useState(initialStatus === "attending" || initialStatus === "declined" ? initialStatus : "");
  const action = submitRsvp.bind(null, token);

  return (
    <form action={action} className="rsvpForm">
      <fieldset className="rsvpSection">
        <legend>Your response</legend>
        <div className="choiceGrid twoChoices">
          <label className="choice"><input type="radio" name="status" value="attending" required checked={status === "attending"} onChange={() => setStatus("attending")} /><span>Attending<small>I’ll be there</small></span></label>
          <label className="choice"><input type="radio" name="status" value="declined" required checked={status === "declined"} onChange={() => setStatus("declined")} /><span>Not attending<small>I can’t make it</small></span></label>
        </div>
      </fieldset>
      <input type="hidden" name="party_size" value="1" />
      <label className="noteField">Note <span>(optional)</span><textarea name="notes" maxLength={500} defaultValue={initialNotes ?? ""} placeholder="Dietary needs or a message…" /></label>
      <button className="saveRsvpButton" type="submit">Save RSVP</button>
    </form>
  );
}
