import { getTwilioClient } from "@/lib/twilio";
import type { MessagingService, OutboundMessage, SendResult } from "./messaging-service";

export class TwilioMessagingService implements MessagingService {
  async send(message: OutboundMessage): Promise<SendResult> {
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const sender = process.env.TWILIO_SENDER_ID || process.env.TWILIO_PHONE_NUMBER;
    if (!messagingServiceSid && !sender) {
      throw new Error("Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_SENDER_ID.");
    }

    const result = await getTwilioClient().messages.create({
      to: message.to,
      body: message.body,
      ...(messagingServiceSid ? { messagingServiceSid } : { from: sender! }),
    });

    return { messageId: result.sid, provider: "twilio" };
  }
}
