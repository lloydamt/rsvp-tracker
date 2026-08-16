"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { bulkGuestOperation } from "@/app/actions";

const formId = "bulk-guest-form";

function guestCheckboxes() {
  return Array.from(document.querySelectorAll<HTMLInputElement>(`input[name="guest_ids"][form="${formId}"]`));
}

export function BulkActions({ groups }: { groups: { id: string; name: string; memberCount: number }[] }) {
  const [allSelected, setAllSelected] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [selectedGroupedCount, setSelectedGroupedCount] = useState(0);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [submittedOperation, setSubmittedOperation] = useState("");
  const [feedback, formAction, isPending] = useActionState(
    async (_previousFeedback: Awaited<ReturnType<typeof bulkGuestOperation>> | null, formData: FormData) => {
      try {
        return await bulkGuestOperation(formData) ?? null;
      } catch (error) {
        return { status: "error" as const, message: error instanceof Error ? error.message : "That action could not be completed. Please try again." };
      }
    },
    null,
  );
  const [visibleFeedback, setVisibleFeedback] = useState<typeof feedback>(null);

  useEffect(() => {
    if (!feedback) return;
    setVisibleFeedback(feedback);
    if (feedback.status !== "success") return;

    const timeout = window.setTimeout(() => setVisibleFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    const checkboxes = guestCheckboxes();
    const updateSelection = () => {
      const count = checkboxes.filter((checkbox) => checkbox.checked).length;
      const groupedCount = checkboxes.filter((checkbox) => checkbox.checked && checkbox.dataset.grouped === "true").length;
      setSelectedCount(count);
      setSelectedGroupedCount(groupedCount);
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
            guestCheckboxes().forEach((checkbox) => {
              checkbox.checked = event.target.checked;
              checkbox.dispatchEvent(new Event("change", { bubbles: true }));
            });
            setAllSelected(event.target.checked);
            setSelectedCount(event.target.checked ? guestCheckboxes().length : 0);
            setSelectedGroupedCount(event.target.checked ? guestCheckboxes().filter((checkbox) => checkbox.dataset.grouped === "true").length : 0);
          }}
        />
        <span>{selectedCount > 0 ? `${selectedCount} selected` : "Select all"}</span>
      </label>
      <form
        id={formId}
        action={formAction}
        onSubmit={(event) => {
          const selected = guestCheckboxes().filter((checkbox) => checkbox.checked);
          if (selected.length === 0) {
            event.preventDefault();
            window.alert("Select at least one guest first.");
            return;
          }
          const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          setSubmittedOperation(submitter?.value ?? "");
          setVisibleFeedback(null);
          if (submitter?.value === "delete" && !window.confirm(`Delete ${selected.length} selected guest${selected.length === 1 ? "" : "s"}? This cannot be undone.`)) {
            event.preventDefault();
          }
          if (submitter?.value === "ungroup" && !window.confirm(`Remove ${selectedGroupedCount} selected guest${selectedGroupedCount === 1 ? "" : "s"} from their group${selectedGroupedCount === 1 ? "" : "s"}?`)) {
            event.preventDefault();
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
        {((isPending && submittedOperation === "send") || visibleFeedback) && (
          <span
            className={`sendFeedback bulkSendFeedback ${isPending ? "pending" : visibleFeedback?.status}`}
            role={visibleFeedback?.status === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {isPending && submittedOperation === "send" ? "Attempting to send invitation texts…" : visibleFeedback?.message}
          </span>
        )}
        <button type="submit" name="operation" value="send" disabled={selectedCount === 0 || isPending}>{isPending && submittedOperation === "send" ? "Sending…" : "Send invitation"}</button>
        <button className="secondary ungroupAction" type="submit" name="operation" value="ungroup" disabled={selectedGroupedCount === 0}>Remove from group</button>
        <button className="danger bulkDeleteAction" type="submit" name="operation" value="delete" disabled={selectedCount === 0}>Delete selected</button>
        <details className="organizeMenu">
          <summary aria-label="More bulk actions">Organize <span aria-hidden="true">⌄</span></summary>
          <div className="organizePopover">
            <p><strong>Add to group</strong><small>Choose where to move the selected guests</small></p>
            {selectedGroupedCount > 0 ? <div className="groupMoveNotice">
              <strong>{selectedGroupedCount === 1 ? "This guest is already in a group" : `${selectedGroupedCount} selected guests are already in groups`}</strong>
              <span>Remove {selectedGroupedCount === 1 ? "this guest" : "these guests"} from the current group before moving to another.</span>
            </div> : groups.length === 0 ? <p className="pickerEmpty">Create a group in the Groups panel first.</p> : <div className="bulkGroupPicker">
              {groups.map((group) => <label key={group.id}>
                <input type="radio" name="existing_group_id" value={group.id} />
                <span><strong>{group.name}</strong><small>{group.memberCount} member{group.memberCount === 1 ? "" : "s"}</small></span>
              </label>)}
            </div>}
            <button className="pickerConfirm" type="submit" name="operation" value="add_to_group" disabled={groups.length === 0 || selectedCount === 0 || selectedGroupedCount > 0}>Add selected to group</button>
            <button className="secondary mobileUngroupAction" type="submit" name="operation" value="ungroup" disabled={selectedGroupedCount === 0}>Remove from group</button>
            <hr />
            <p><strong>Invitation type</strong><small>Change access for selected guests</small></p>
            <div className="groupControl">
              <select name="invitation_category" defaultValue="ceremony_reception" aria-label="Invitation category">
                <option value="ceremony_reception">Ceremony &amp; reception</option>
                <option value="reception_only">Reception only</option>
              </select>
              <button className="secondary" type="submit" name="operation" value="set_category">Update</button>
            </div>
          </div>
        </details>
      </form>
    </div>
  );
}
