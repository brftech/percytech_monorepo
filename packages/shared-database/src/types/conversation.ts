import { z } from "zod";
import { BrandId } from "./brand";

// Message direction
export const MessageDirection = z.enum(["inbound", "outbound"]);
export type MessageDirection = z.infer<typeof MessageDirection>;

// Message status for outbound messages
export const MessageStatus = z.enum([
  "pending", // Queued for sending
  "sent", // Successfully sent
  "delivered", // Delivered to carrier
  "failed", // Failed to send
  "undelivered", // Failed to deliver
]);
export type MessageStatus = z.infer<typeof MessageStatus>;

// Conversation status
export const ConversationStatus = z.enum([
  "active", // Active conversation
  "paused", // Temporarily paused
  "completed", // Conversation completed
  "archived", // Archived conversation
]);
export type ConversationStatus = z.infer<typeof ConversationStatus>;

// Message schema
export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),

  // Message content
  direction: MessageDirection,
  content: z.string(),
  media_urls: z.array(z.string()).optional(),

  // Status tracking
  status: MessageStatus.optional(), // Only for outbound messages
  external_id: z.string().optional(), // Provider message ID

  // Metadata
  metadata: z.record(z.unknown()).optional(),

  // Audit
  sent_at: z.string().datetime(),
  delivered_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
});

export type Message = z.infer<typeof MessageSchema>;

// Conversation schema
export const ConversationSchema = z.object({
  id: z.string().uuid(),
  brand_id: BrandId,
  customer_id: z.string().uuid(),

  // Phone numbers
  customer_phone: z.string(),
  brand_phone: z.string(),

  // Status
  status: ConversationStatus,

  // Campaign tracking
  campaign_id: z.string().uuid().optional(),
  campaign_name: z.string().optional(),

  // Message counts
  message_count: z.number().int().default(0),
  last_message_at: z.string().datetime().optional(),
  last_inbound_at: z.string().datetime().optional(),
  last_outbound_at: z.string().datetime().optional(),

  // Opt-out tracking
  opted_out_at: z.string().datetime().optional(),
  opt_out_reason: z.string().optional(),

  // Metadata
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),

  // Audit
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// Create conversation input
export const CreateConversationSchema = ConversationSchema.pick({
  customer_id: true,
  customer_phone: true,
  brand_phone: true,
  campaign_id: true,
  campaign_name: true,
  metadata: true,
  tags: true,
}).partial({
  campaign_id: true,
  campaign_name: true,
  metadata: true,
  tags: true,
});

export type CreateConversation = z.infer<typeof CreateConversationSchema>;

// Create message input
export const CreateMessageSchema = MessageSchema.pick({
  conversation_id: true,
  direction: true,
  content: true,
  media_urls: true,
  external_id: true,
  metadata: true,
}).partial({
  media_urls: true,
  external_id: true,
  metadata: true,
});

export type CreateMessage = z.infer<typeof CreateMessageSchema>;

// Conversation helpers
export function isOptedOut(conversation: Conversation): boolean {
  return !!conversation.opted_out_at;
}

export function canSendMessage(conversation: Conversation): boolean {
  return conversation.status === "active" && !isOptedOut(conversation);
}

export function getConversationDisplayName(conversation: Conversation): string {
  return conversation.campaign_name || `SMS - ${conversation.customer_phone}`;
}

export function getLastMessageDirection(
  conversation: Conversation
): MessageDirection | null {
  if (!conversation.last_inbound_at && !conversation.last_outbound_at) {
    return null;
  }

  if (!conversation.last_inbound_at) return "outbound";
  if (!conversation.last_outbound_at) return "inbound";

  const last_inbound = new Date(conversation.last_inbound_at);
  const last_outbound = new Date(conversation.last_outbound_at);

  return last_inbound > last_outbound ? "inbound" : "outbound";
}
