"use client";

import { useState } from "react";
import { addGuest } from "@/app/actions";

export function AddGuestForm({ groups }: { groups: { id: string; name: string }[] }) {
  const [groupMode, setGroupMode] = useState<"none" | "existing" | "new">("none");
  const [selectedGroupId, setSelectedGroupId] = useState("");

  return (
    <form action={addGuest} className="addGuestForm">
      <div className="guestFields">
        <label>Name<input name="name" required maxLength={100} placeholder="Ada Lovelace" /></label>
        <label>Phone<input name="phone" required inputMode="tel" autoComplete="tel" placeholder="07700 900123" /></label>
        <label>Invitation<select name="invitation_category" required defaultValue="ceremony_reception"><option value="ceremony_reception">Ceremony &amp; reception</option><option value="reception_only">Reception only</option></select></label>
      </div>
      <fieldset className="guestGroupField">
        <legend>Group <span>Optional</span></legend>
        <input type="hidden" name="group_mode" value={groupMode} />
        {groupMode !== "new" && <div className="groupSelectRow">
          <select
            name="existing_group_id"
            value={selectedGroupId}
            onChange={(event) => {
              setSelectedGroupId(event.target.value);
              setGroupMode(event.target.value ? "existing" : "none");
            }}
            aria-label="Guest group"
          >
            <option value="">No group</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          <button className="secondary" type="button" onClick={() => setGroupMode("new")}>Create new group</button>
        </div>}
        {groupMode === "new" && <div className="groupSelectRow">
          <input name="new_group_name" required maxLength={100} placeholder="e.g. University friends" aria-label="New group name" autoFocus />
          <button className="secondary" type="button" onClick={() => setGroupMode(selectedGroupId ? "existing" : "none")}>Use existing</button>
        </div>}
      </fieldset>
      <div className="addGuestSubmit"><button type="submit">Save guest</button></div>
    </form>
  );
}
