import type { MessagingService, OutboundMessage, SendResult } from "./messaging-service";

type VonageResponse = {
  messages?: Array<{
    status?: string;
    ["message-id"]?: string;
    ["error-text"]?: string;
  }>;
};

export class VonageMessagingService implements MessagingService {
  async send(message: OutboundMessage): Promise<SendResult> {
    const apiKey = process.env.VONAGE_API_KEY;
    const apiSecret = process.env.VONAGE_API_SECRET;
    const sender = process.env.VONAGE_SENDER_ID;
    if (!apiKey || !apiSecret || !sender) throw new Error("Vonage credentials or sender ID are missing.");

    const params = new URLSearchParams({
      from: sender,
      to: message.to.replace(/^\+/, ""),
      text: message.body,
    });
    if (!/^[\x00-\x7F]*$/.test(message.body)) params.set("type", "unicode");

    const response = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
      cache: "no-store",
    });
    const result = await response.json() as VonageResponse;
    const sentMessage = result.messages?.[0];
    if (!response.ok || sentMessage?.status !== "0" || !sentMessage["message-id"]) {
      throw new Error(sentMessage?.["error-text"] || `Vonage rejected the message with HTTP ${response.status}.`);
    }

    return { messageId: sentMessage["message-id"], provider: "vonage" };
  }
}
