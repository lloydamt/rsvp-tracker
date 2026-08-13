"use client";

import { useActionState } from "react";
import { sendInvite } from "@/app/actions";

type Feedback = Awaited<ReturnType<typeof sendInvite>> | null;

export function SendInviteForm({ id, hasBeenSent }: { id: string; hasBeenSent: boolean }) {
  const [feedback, formAction, isPending] = useActionState<Feedback, FormData>(
    async (_previousFeedback, formData) => sendInvite(formData),
    null,
  );

  return (
    <form action={formAction} className="sendInviteForm">
      <input type="hidden" name="id" value={id} />
      <button className="secondary" type="submit" disabled={isPending}>
        {isPending ? "Sending…" : hasBeenSent ? "Resend text" : "Send text"}
      </button>
      {(isPending || feedback) && (
        <span
          className={`sendFeedback ${isPending ? "pending" : feedback?.status}`}
          role={feedback?.status === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {isPending ? "Attempting to send text…" : feedback?.message}
        </span>
      )}
    </form>
  );
}
