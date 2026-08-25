import type { MessagingService } from "./messaging-service";
import { invitationMessage } from "./invitation-message";
import { TwilioMessagingService } from "./twilio-messaging-service";
import { VonageMessagingService } from "./vonage-messaging-service";
import type { InvitationCategory } from "@/lib/supabase";

export type MessagingProvider = "twilio" | "vonage";
export { invitationMessage, INVITATION_MESSAGE_MAX_LENGTH } from "./invitation-message";

export function getMessagingService(): MessagingService {
  const provider = (process.env.MESSAGING_PROVIDER || "vonage").toLowerCase();
  if (provider === "twilio") return new TwilioMessagingService();
  if (provider === "vonage") return new VonageMessagingService();
  throw new Error(`Unsupported messaging provider: ${provider}. Use twilio or vonage.`);
}

export async function sendRsvpInvitation(
  guest: { name: string; phone: string; token: string; invitation_category: InvitationCategory },
  appUrl?: string,
  body?: string,
) {
  const text = body?.trim() || invitationMessage(guest, appUrl);
  return getMessagingService().send({
    to: guest.phone,
    body: text,
  });
}

export type { MessagingService, OutboundMessage, SendResult } from "./messaging-service";
