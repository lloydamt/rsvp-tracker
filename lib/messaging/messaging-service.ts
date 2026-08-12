export type OutboundMessage = {
  to: string;
  body: string;
};

export type SendResult = {
  messageId: string;
  provider: "twilio" | "vonage";
};

export interface MessagingService {
  send(message: OutboundMessage): Promise<SendResult>;
}
