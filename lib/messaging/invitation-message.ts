import type { InvitationCategory } from "@/lib/supabase";

export const INVITATION_MESSAGE_MAX_LENGTH = 1600;

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

function requireAppUrl(appUrl?: string) {
  const configuredUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl) throw new Error("NEXT_PUBLIC_APP_URL is missing.");
  return configuredUrl;
}

export function invitationMessage(
  guest: { token: string; invitation_category: InvitationCategory },
  appUrl?: string,
) {
  let inviteUrl: URL;
  try {
    inviteUrl = new URL(`/rsvp/${encodeURIComponent(guest.token)}`, requireAppUrl(appUrl));
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_PUBLIC_APP_URL is missing.") throw error;
    throw new Error("NEXT_PUBLIC_APP_URL must be a valid absolute URL.");
  }

  const infoUrl = categoryInfoUrl(guest.invitation_category);
  const intro = guest.invitation_category === "ceremony_reception"
    ? `Tadiwa & Adawari invite you to their wedding ceremony and reception: ${infoUrl}`
    : `Tadiwa & Adawari invite you to their wedding reception: ${infoUrl}`;

  return `${intro}\n\nRSVP at ${inviteUrl.toString()}\n\nCode: ${guest.token}`;
}
