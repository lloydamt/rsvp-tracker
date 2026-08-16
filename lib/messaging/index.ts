import type { MessagingService } from "./messaging-service";
import { TwilioMessagingService } from "./twilio-messaging-service";
import { VonageMessagingService } from "./vonage-messaging-service";
import type { InvitationCategory } from "@/lib/supabase";

export type MessagingProvider = "twilio" | "vonage";

export function getMessagingService(): MessagingService {
  const provider = (process.env.MESSAGING_PROVIDER || "vonage").toLowerCase();
  if (provider === "twilio") return new TwilioMessagingService();
  if (provider === "vonage") return new VonageMessagingService();
  throw new Error(`Unsupported messaging provider: ${provider}. Use twilio or vonage.`);
}

export async function sendRsvpInvitation(guest: { name: string; phone: string; token: string; invitation_category: InvitationCategory }) {
  return getMessagingService().send({
    to: guest.phone,
    body: guest.invitation_category === "ceremony_reception"
      ? `Hi ${guest.name}! You are invited to our ceremony and reception. Your RSVP code is ${guest.token}.`
      : `Hi ${guest.name}! You are invited to our reception. Your RSVP code is ${guest.token}.`,
  });
}

export type { MessagingService, OutboundMessage, SendResult } from "./messaging-service";
