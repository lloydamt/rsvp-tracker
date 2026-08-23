"use client";

import { useActionState } from "react";
import { openRsvpByCode } from "@/app/actions";
import { GUEST_TOKEN_INPUT_PATTERN, GUEST_TOKEN_LENGTH } from "@/lib/guest-token";

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
          maxLength={GUEST_TOKEN_LENGTH}
          minLength={GUEST_TOKEN_LENGTH}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          pattern={GUEST_TOKEN_INPUT_PATTERN}
          placeholder="AB3K7P"
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
