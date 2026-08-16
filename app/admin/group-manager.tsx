"use client";

import { useActionState, useState } from "react";
import { createGroup, deleteGroup, renameGroup } from "@/app/actions";

type ManagedGroup = { id: string; name: string; memberCount: number };

export function GroupManager({ groups }: { groups: ManagedGroup[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteResult, deleteAction, isDeleting] = useActionState(
    async (_previous: { status: "error"; message: string } | null, formData: FormData) => {
      try {
        await deleteGroup(formData);
        return null;
      } catch (error) {
        return { status: "error" as const, message: error instanceof Error ? error.message : "That group could not be deleted." };
      }
    },
    null,
  );

  return (
    <details className="groupsPanel">
      <summary>
        <span className="groupsIcon" aria-hidden="true">G</span>
        <span><strong>Groups</strong><small>{groups.length === 0 ? "Create groups to organize your guest list" : `${groups.length} group${groups.length === 1 ? "" : "s"}`}</small></span>
        <span className="panelCta">Manage</span>
      </summary>
      <div className="groupsPanelBody">
        <form action={createGroup} className="createGroupForm">
          <label>Create a group<input name="name" required maxLength={100} placeholder="e.g. Bride's family" /></label>
          <button type="submit">Create group</button>
        </form>
        {groups.length === 0 ? <p className="groupsEmpty">No groups yet. Create one now and add guests later.</p> : <div className="groupRows">
          {groups.map((group) => <div className="groupRow" key={group.id}>
            {editingId === group.id ? <form action={renameGroup} className="renameGroupForm" onSubmit={() => setEditingId(null)}>
              <input type="hidden" name="id" value={group.id} />
              <input name="name" required maxLength={100} defaultValue={group.name} aria-label={`Rename ${group.name}`} autoFocus />
              <button type="submit">Save</button>
              <button className="secondary" type="button" onClick={() => setEditingId(null)}>Cancel</button>
            </form> : <>
              <span className="groupRowIdentity"><strong>{group.name}</strong><small>{group.memberCount} member{group.memberCount === 1 ? "" : "s"}</small></span>
              <span className="groupRowActions">
                <button className="textButton" type="button" onClick={() => setEditingId(group.id)}>Rename</button>
                <form action={deleteAction} onSubmit={(event) => {
                  if (!window.confirm(`Delete “${group.name}”? ${group.memberCount > 0 ? `${group.memberCount} guest${group.memberCount === 1 ? " will" : "s will"} become ungrouped.` : ""}`)) event.preventDefault();
                }}>
                  <input type="hidden" name="id" value={group.id} />
                  <button className="textButton dangerText" type="submit" disabled={isDeleting}>Delete</button>
                </form>
              </span>
            </>}
          </div>)}
        </div>}
        {deleteResult?.status === "error" && <p className="guestActionError" role="alert">{deleteResult.message}</p>}
      </div>
    </details>
  );
}
