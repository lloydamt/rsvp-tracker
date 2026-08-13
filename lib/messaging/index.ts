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

export async function sendRsvpInvitation(guest: { name: string; phone: string; token: string; invitation_category: InvitationCategory }, appUrl?: string) {
  const configuredUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl) throw new Error("NEXT_PUBLIC_APP_URL is missing.");

  let inviteUrl: URL;
  try {
    inviteUrl = new URL(`/rsvp/${encodeURIComponent(guest.token)}`, configuredUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be a valid absolute URL.");
  }

  return getMessagingService().send({
    to: guest.phone,
    // Vonage's free tier appends a marker to the message. Newlines are less
    // likely to be trimmed than trailing spaces and keep it away from the URL.
    body: guest.invitation_category === "ceremony_reception"
      ? `Hi ${guest.name}! You are invited to our ceremony and reception. Please RSVP here: ${inviteUrl.toString()}\n\n\n`
      : `Hi ${guest.name}! You are invited to our reception. Please RSVP here: ${inviteUrl.toString()}\n\n\n`,
  });
}

export type { MessagingService, OutboundMessage, SendResult } from "./messaging-service";
