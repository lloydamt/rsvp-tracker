"use client";

import { useState } from "react";
import { addGuests } from "@/app/actions";

type GuestRow = { id: number; invitationCategory: "ceremony_reception" | "reception_only" };

export function AddGuestForm({ groups }: { groups: { id: string; name: string }[] }) {
  const [groupMode, setGroupMode] = useState<"none" | "existing" | "new">("none");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [rows, setRows] = useState<GuestRow[]>([{ id: 1, invitationCategory: "ceremony_reception" }]);
  const [nextRowId, setNextRowId] = useState(2);

  const addRow = () => {
    if (rows.length >= 50) return;
    setRows((current) => [...current, { id: nextRowId, invitationCategory: "ceremony_reception" }]);
    setNextRowId((current) => current + 1);
  };

  return (
    <form action={addGuests} className="addGuestForm">
      <div className="multiGuestHeader">
        <div><strong>Guest details</strong><small>Add up to 50 guests in one go</small></div>
        <span>{rows.length} guest{rows.length === 1 ? "" : "s"}</span>
      </div>
      <div className="guestRows">
        {rows.map((row, index) => (
          <div className="guestInputRow" key={row.id}>
            <span className="guestRowNumber" aria-hidden="true">{index + 1}</span>
            <label>Name<input name="guest_name" required maxLength={100} placeholder={index === 0 ? "Ada Lovelace" : "Guest name"} /></label>
            <label>Phone<input name="guest_phone" required inputMode="tel" autoComplete="tel" placeholder="07700 900123" /></label>
            <label>Invitation<select
              name="guest_invitation_category"
              required
              value={row.invitationCategory}
              onChange={(event) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, invitationCategory: event.target.value as GuestRow["invitationCategory"] } : item))}
            ><option value="ceremony_reception">Ceremony &amp; reception</option><option value="reception_only">Reception only</option></select></label>
            <button
              className="removeGuestRow"
              type="button"
              aria-label={`Remove guest ${index + 1}`}
              disabled={rows.length === 1}
              onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
            >×</button>
          </div>
        ))}
      </div>
      <button className="addAnotherGuest" type="button" onClick={addRow} disabled={rows.length >= 50}><span aria-hidden="true">+</span> Add another guest</button>
      <fieldset className="guestGroupField">
        <legend>Group <span>Optional · applies to everyone above</span></legend>
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
      <div className="addGuestSubmit"><button type="submit">Save {rows.length} guest{rows.length === 1 ? "" : "s"}</button></div>
    </form>
  );
}
