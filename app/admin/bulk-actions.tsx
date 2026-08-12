"use client";

import { useState } from "react";
import { bulkGuestOperation } from "@/app/actions";

const formId = "bulk-guest-form";

function guestCheckboxes() {
  return Array.from(document.querySelectorAll<HTMLInputElement>(`input[name="guest_ids"][form="${formId}"]`));
}

export function BulkActions({ groups }: { groups: { id: string; name: string }[] }) {
  const [allSelected, setAllSelected] = useState(false);

  return (
    <div className="bulkBar">
      <label className="selectAll">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(event) => {
            guestCheckboxes().forEach((checkbox) => { checkbox.checked = event.target.checked; });
            setAllSelected(event.target.checked);
          }}
        />
        Select all shown
      </label>
      <form
        id={formId}
        action={bulkGuestOperation}
        onSubmit={(event) => {
          const selected = guestCheckboxes().filter((checkbox) => checkbox.checked);
          if (selected.length === 0) {
            event.preventDefault();
            window.alert("Select at least one guest first.");
            return;
          }
          const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (submitter?.value === "delete" && !window.confirm(`Delete ${selected.length} selected guest${selected.length === 1 ? "" : "s"}? This cannot be undone.`)) {
            event.preventDefault();
          }
          if (submitter?.value === "group") {
            const groupName = new FormData(event.currentTarget).get("group_name");
            if (!String(groupName ?? "").trim()) {
              event.preventDefault();
              window.alert("Enter a name for the new group.");
            }
          }
          if (submitter?.value === "add_to_group") {
            const groupId = new FormData(event.currentTarget).get("existing_group_id");
            if (!String(groupId ?? "")) {
              event.preventDefault();
              window.alert("Choose an existing group.");
            }
          }
        }}
      >
        <div className="groupControl">
          <select name="existing_group_id" defaultValue="" aria-label="Existing group">
            <option value="" disabled>Choose existing group</option>
            {groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}
          </select>
          <button className="secondary" type="submit" name="operation" value="add_to_group" disabled={groups.length === 0}>Add to group</button>
        </div>
        <div className="groupControl">
          <input className="groupNameInput" name="group_name" maxLength={100} placeholder="New group name" aria-label="New group name" />
          <button className="secondary" type="submit" name="operation" value="group">Create group</button>
        </div>
        <button className="secondary" type="submit" name="operation" value="ungroup">Remove from group</button>
        <div className="groupControl">
          <select name="invitation_category" defaultValue="ceremony_reception" aria-label="Invitation category">
            <option value="ceremony_reception">Ceremony &amp; reception</option>
            <option value="reception_only">Reception only</option>
          </select>
          <button className="secondary" type="submit" name="operation" value="set_category">Set category</button>
        </div>
        <button className="secondary" type="submit" name="operation" value="send">Send texts</button>
        <button className="danger" type="submit" name="operation" value="delete">Delete selected</button>
      </form>
    </div>
  );
}
