"use client";

import { useActionState } from "react";
import { deleteGuest } from "@/app/actions";

export function DeleteGuestForm({ id, name }: { id: string; name: string }) {
  const [result, formAction, isPending] = useActionState(
    async (_previous: { status: "error"; message: string } | null, formData: FormData) => {
      try {
        await deleteGuest(formData);
        return null;
      } catch (error) {
        return { status: "error" as const, message: error instanceof Error ? error.message : "That guest could not be deleted." };
      }
    },
    null,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${name} from the guest list? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="danger" type="submit" disabled={isPending}>{isPending ? "Deleting…" : "Delete"}</button>
      {result?.status === "error" && <p className="guestActionError" role="alert">{result.message}</p>}
    </form>
  );
}
