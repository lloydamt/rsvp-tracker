"use client";

import { useEffect, useRef, useState } from "react";
import { bulkGuestOperation } from "@/app/actions";

const formId = "bulk-guest-form";

function guestCheckboxes() {
  return Array.from(document.querySelectorAll<HTMLInputElement>(`input[name="guest_ids"][form="${formId}"]`));
}

export function BulkActions({ groups }: { groups: { id: string; name: string }[] }) {
  const [allSelected, setAllSelected] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkboxes = guestCheckboxes();
    const updateSelection = () => {
      const count = checkboxes.filter((checkbox) => checkbox.checked).length;
      setSelectedCount(count);
      setAllSelected(checkboxes.length > 0 && count === checkboxes.length);
      if (selectAllRef.current) selectAllRef.current.indeterminate = count > 0 && count < checkboxes.length;
    };
    checkboxes.forEach((checkbox) => checkbox.addEventListener("change", updateSelection));
    return () => checkboxes.forEach((checkbox) => checkbox.removeEventListener("change", updateSelection));
  }, []);

  return (
    <div className="bulkBar">
      <label className="selectAll">
        <input
          ref={selectAllRef}
          type="checkbox"
          checked={allSelected}
          onChange={(event) => {
            guestCheckboxes().forEach((checkbox) => { checkbox.checked = event.target.checked; });
            setAllSelected(event.target.checked);
            setSelectedCount(event.target.checked ? guestCheckboxes().length : 0);
          }}
        />
        <span>{selectedCount > 0 ? `${selectedCount} selected` : "Select all"}</span>
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
        <button type="submit" name="operation" value="send" disabled={selectedCount === 0}>Send invitation</button>
        <details className="organizeMenu">
          <summary aria-label="More bulk actions">Organize <span aria-hidden="true">⌄</span></summary>
          <div className="organizePopover">
            <p><strong>Group</strong><small>Keep related guests together</small></p>
            <div className="groupControl">
              <select name="existing_group_id" defaultValue="" aria-label="Existing group">
                <option value="" disabled>Choose a group</option>
                {groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}
              </select>
              <button className="secondary" type="submit" name="operation" value="add_to_group" disabled={groups.length === 0}>Add</button>
            </div>
            <div className="groupControl">
              <input className="groupNameInput" name="group_name" maxLength={100} placeholder="Create a new group" aria-label="New group name" />
              <button className="secondary" type="submit" name="operation" value="group">Create</button>
            </div>
            <button className="textAction" type="submit" name="operation" value="ungroup">Remove from group</button>
            <hr />
            <p><strong>Invitation type</strong><small>Change access for selected guests</small></p>
            <div className="groupControl">
              <select name="invitation_category" defaultValue="ceremony_reception" aria-label="Invitation category">
                <option value="ceremony_reception">Ceremony &amp; reception</option>
                <option value="reception_only">Reception only</option>
              </select>
              <button className="secondary" type="submit" name="operation" value="set_category">Update</button>
            </div>
            <hr />
            <button className="textAction dangerText" type="submit" name="operation" value="delete">Delete selected guests</button>
          </div>
        </details>
      </form>
    </div>
  );
}
