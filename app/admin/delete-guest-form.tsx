"use client";

import { deleteGuest } from "@/app/actions";

export function DeleteGuestForm({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteGuest}
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${name} from the guest list? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="danger" type="submit">Delete</button>
    </form>
  );
}
