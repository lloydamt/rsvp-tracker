"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { sendInvite } from "@/app/actions";
import { INVITATION_MESSAGE_MAX_LENGTH } from "@/lib/messaging/invitation-message";

type Feedback = Awaited<ReturnType<typeof sendInvite>> | null;

export function InvitationTextPreview({ draftMessage }: { draftMessage: string }) {
  return (
    <div className="sendInviteForm">
      <label>
        <span className="fieldCaption">Invitation text</span>
        <textarea readOnly value={draftMessage} rows={6} />
      </label>
      <div className="inviteMessageMeta">
        <p className="inviteDraftHint">Preview only — sending is disabled for generated guests.</p>
        <span className="inviteCharCount">{draftMessage.length} characters</span>
      </div>
    </div>
  );
}

export function SendInviteForm({
  id,
  hasBeenSent,
  canSend,
  draftMessage,
  children,
}: {
  id: string;
  hasBeenSent: boolean;
  canSend: boolean;
  draftMessage: string;
  children?: ReactNode;
}) {
  const [feedback, formAction, isPending] = useActionState<Feedback, FormData>(
    async (_previousFeedback, formData) => sendInvite(formData),
    null,
  );
  const [visibleFeedback, setVisibleFeedback] = useState<Feedback>(null);
  const [body, setBody] = useState(draftMessage);
  const formId = `send-invite-${id}`;

  useEffect(() => {
    if (!feedback) return;
    setVisibleFeedback(feedback);
    if (feedback.status !== "success") return;

    const timeout = window.setTimeout(() => setVisibleFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  return (
    <div className="sendInviteForm">
      <form id={formId} action={formAction} onSubmit={() => setVisibleFeedback(null)}>
        <input type="hidden" name="id" value={id} />
        <label>
          <span className="fieldCaption">Invitation text</span>
          <textarea
            name="body"
            required
            rows={6}
            maxLength={INVITATION_MESSAGE_MAX_LENGTH}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <div className="inviteMessageMeta">
          <p className="inviteDraftHint">Edits apply only to this send. Reopening the guest restores the template.</p>
          <span className="inviteCharCount">{body.length} / {INVITATION_MESSAGE_MAX_LENGTH}</span>
        </div>
      </form>
      <div className="guestActions">
        <button
          className="secondary"
          type="submit"
          form={formId}
          disabled={isPending || !canSend || !body.trim()}
          title={canSend ? undefined : "This guest has no UK number to text"}
        >
          {isPending ? "Sending…" : !canSend ? "No phone to text" : hasBeenSent ? "Resend text" : "Send text"}
        </button>
        {children}
        {(isPending || visibleFeedback) && (
          <span
            className={`sendFeedback ${isPending ? "pending" : visibleFeedback?.status}`}
            role={visibleFeedback?.status === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {isPending ? "Attempting to send text…" : visibleFeedback?.message}
          </span>
        )}
      </div>
    </div>
  );
}
