"use client";

import { useActionState, useEffect, useState } from "react";
import { sendInvite } from "@/app/actions";

type Feedback = Awaited<ReturnType<typeof sendInvite>> | null;

export function SendInviteForm({ id, hasBeenSent, hasPhone }: { id: string; hasBeenSent: boolean; hasPhone: boolean }) {
  const [feedback, formAction, isPending] = useActionState<Feedback, FormData>(
    async (_previousFeedback, formData) => sendInvite(formData),
    null,
  );
  const [visibleFeedback, setVisibleFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (!feedback) return;
    setVisibleFeedback(feedback);
    if (feedback.status !== "success") return;

    const timeout = window.setTimeout(() => setVisibleFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  return (
    <form action={formAction} className="sendInviteForm" onSubmit={() => setVisibleFeedback(null)}>
      <input type="hidden" name="id" value={id} />
      <button className="secondary" type="submit" disabled={isPending || !hasPhone} title={hasPhone ? undefined : "This guest has no phone number"}>
        {isPending ? "Sending…" : !hasPhone ? "No phone to text" : hasBeenSent ? "Resend text" : "Send text"}
      </button>
      {(isPending || visibleFeedback) && (
        <span
          className={`sendFeedback ${isPending ? "pending" : visibleFeedback?.status}`}
          role={visibleFeedback?.status === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {isPending ? "Attempting to send text…" : visibleFeedback?.message}
        </span>
      )}
    </form>
  );
}
