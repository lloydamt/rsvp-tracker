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

function categoryInfoUrl(category: InvitationCategory) {
  const envName = category === "ceremony_reception" ? "CEREMONY_RECEPTION_INFO_URL" : "RECEPTION_ONLY_INFO_URL";
  const configured = process.env[envName];
  if (!configured) throw new Error(`${envName} is missing.`);

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error(`${envName} must be a valid absolute URL.`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${envName} must be an http or https URL.`);
  }

  url.search = "";
  url.hash = "";
  return url.toString();
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

  const infoUrl = categoryInfoUrl(guest.invitation_category);
  const moreInfo = `For more info concerning the day, please visit ${infoUrl}`;

  return getMessagingService().send({
    to: guest.phone,
    body: guest.invitation_category === "ceremony_reception"
      ? `Hi ${guest.name}! You are invited to our ceremony and reception. Please RSVP here: ${inviteUrl.toString()} Your RSVP code is ${guest.token}. ${moreInfo}`
      : `Hi ${guest.name}! You are invited to our reception. Please RSVP here: ${inviteUrl.toString()} Your RSVP code is ${guest.token}. ${moreInfo}`,
  });
}

export type { MessagingService, OutboundMessage, SendResult } from "./messaging-service";
