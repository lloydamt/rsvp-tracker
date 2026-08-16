"use client";

import { useActionState } from "react";
import { openRsvpByCode } from "@/app/actions";

type Feedback = Awaited<ReturnType<typeof openRsvpByCode>> | null;

export function CodeEntryForm() {
  const [feedback, formAction, isPending] = useActionState<Feedback, FormData>(
    async (_previous, formData) => openRsvpByCode(formData),
    null,
  );

  return (
    <form action={formAction} className="codeEntryForm">
      <label>
        RSVP code
        <input
          name="code"
          required
          maxLength={4}
          minLength={4}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          pattern="[A-HJ-KM-NP-Z2-9a-hj-km-np-z]{4}"
          placeholder="AB3K"
          aria-invalid={feedback?.status === "error"}
          aria-describedby={feedback?.status === "error" ? "code-entry-error" : undefined}
        />
      </label>
      {feedback?.status === "error" && <p id="code-entry-error" className="codeEntryError" role="alert">{feedback.message}</p>}
      <button className="saveRsvpButton" type="submit" disabled={isPending}>
        {isPending ? "Opening…" : "Continue"}
      </button>
    </form>
  );
}
