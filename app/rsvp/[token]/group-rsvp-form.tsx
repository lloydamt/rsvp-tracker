"use client";

import { useState } from "react";
import { submitGroupRsvp } from "@/app/actions";

type Member = { id: string; name: string; status: string };
type MemberStatus = "attending" | "declined" | "";

function currentResponseLabel(status: string) {
  if (status === "pending") return "Not responded";
  if (status === "declined") return "Not attending";
  return "Attending";
}

function savedMemberStatus(status: string): MemberStatus {
  return status === "attending" || status === "declined" ? status : "";
}

function isIncludedMember(memberId: string, ownerId: string, included: Record<string, boolean>) {
  return memberId === ownerId || Boolean(included[memberId]);
}

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
  const [status, setStatus] = useState(savedMemberStatus(ownerStatus));
  const [included, setIncluded] = useState<Record<string, boolean>>(() => (
    Object.fromEntries(members.map((member) => [member.id, member.id === ownerId]))
  ));
  const [memberStatuses, setMemberStatuses] = useState<Record<string, MemberStatus>>(() => (
    Object.fromEntries(members.map((member) => [member.id, savedMemberStatus(member.status)]))
  ));
  const action = submitGroupRsvp.bind(null, token);
  const selectedReady = members
    .filter((member) => isIncludedMember(member.id, ownerId, included))
    .every((member) => {
      const response = memberStatuses[member.id];
      return response === "attending" || response === "declined";
    });
  const canSave = scope === "selected" ? selectedReady : status === "attending" || status === "declined";

  function selectAll() {
    setIncluded(Object.fromEntries(members.map((member) => [member.id, true])));
  }

  function applyToIncluded(nextStatus: "attending" | "declined") {
    setMemberStatuses((current) => {
      const next = { ...current };
      for (const member of members) {
        if (isIncludedMember(member.id, ownerId, included)) next[member.id] = nextStatus;
      }
      return next;
    });
  }

  return (
    <form action={action} className="rsvpForm">
      {scope !== "selected" && (
        <fieldset className="rsvpSection">
          <legend>Your response</legend>
          <div className="choiceGrid twoChoices">
            <label className="choice"><input type="radio" name="status" value="attending" required checked={status === "attending"} onChange={() => setStatus("attending")} /><span>Attending<small>I’ll be there</small></span></label>
            <label className="choice"><input type="radio" name="status" value="declined" required checked={status === "declined"} onChange={() => setStatus("declined")} /><span>Not attending<small>I can’t make it</small></span></label>
          </div>
        </fieldset>
      )}
      <fieldset className="rsvpSection">
        <legend>Who are you responding for?</legend>
        <div className="choiceGrid">
          <label className="choice"><input type="radio" name="scope" value="self" checked={scope === "self"} onChange={() => setScope("self")} /><span>Myself only<small>Update only my response</small></span></label>
          <label className="choice"><input type="radio" name="scope" value="selected" checked={scope === "selected"} onChange={() => setScope("selected")} /><span>Selected people<small>Choose a response for each person</small></span></label>
          <label className="choice"><input type="radio" name="scope" value="group" checked={scope === "group"} onChange={() => setScope("group")} /><span>Everyone in the group<small>Apply this response to the whole group</small></span></label>
        </div>
      </fieldset>
      {scope === "selected" && (
        <fieldset className="memberPicker">
          <legend>Choose a response for each person</legend>
          <div className="memberToolbar">
            <button type="button" className="memberToolbarAction" onClick={selectAll}>Select all</button>
            <div className="memberToolbarApply">
              <span>Set selected</span>
              <button type="button" className="memberToolbarChoice" onClick={() => applyToIncluded("attending")}>Yes</button>
              <button type="button" className="memberToolbarChoice" onClick={() => applyToIncluded("declined")}>No</button>
            </div>
          </div>
          {members.map((member) => {
            const isOwner = member.id === ownerId;
            const isIncluded = isIncludedMember(member.id, ownerId, included);
            const memberStatus = memberStatuses[member.id] ?? "";
            return (
              <div className={`memberRow${isIncluded ? " included" : ""}`} key={member.id}>
                <label className="memberInclude">
                  <input
                    type="checkbox"
                    name="selected_ids"
                    value={member.id}
                    checked={isIncluded}
                    disabled={isOwner}
                    onChange={(event) => setIncluded((current) => ({ ...current, [member.id]: event.target.checked }))}
                  />
                  <span>
                    {member.name}
                    <small>
                      {isOwner ? "You — always included · " : ""}
                      Current response: {currentResponseLabel(member.status)}
                    </small>
                  </span>
                </label>
                <div className="memberStatus" role="group" aria-label={`Response for ${member.name}`}>
                  <label className="choice">
                    <input
                      type="radio"
                      name={`member_status_${member.id}`}
                      value="attending"
                      required={isIncluded}
                      checked={memberStatus === "attending"}
                      disabled={!isIncluded}
                      onChange={() => setMemberStatuses((current) => ({ ...current, [member.id]: "attending" }))}
                    />
                    <span>Yes</span>
                  </label>
                  <label className="choice">
                    <input
                      type="radio"
                      name={`member_status_${member.id}`}
                      value="declined"
                      checked={memberStatus === "declined"}
                      disabled={!isIncluded}
                      onChange={() => setMemberStatuses((current) => ({ ...current, [member.id]: "declined" }))}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
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
