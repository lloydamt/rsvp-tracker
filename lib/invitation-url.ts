import { cache } from "react";
import { headers } from "next/headers";

export const invitationBaseUrl = cache(async function invitationBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      const isLocalUrl = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (process.env.NODE_ENV !== "production" || !isLocalUrl) return url.origin;
    } catch {
      // In production, fall through to the public request origin so an invalid
      // local setting cannot leak into invitation texts.
    }
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0].trim() || requestHeaders.get("host");
  if (host) {
    const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim();
    const protocol = forwardedProtocol || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return new URL(`${protocol}://${host}`).origin;
  }

  throw new Error("Set NEXT_PUBLIC_APP_URL to the public HTTPS URL for this site.");
});
