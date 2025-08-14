import { BrandAwareSupabase } from "../client/supabase";
import {
  Conversation,
  CreateConversation,
  Message,
  CreateMessage,
  ConversationStatus,
  MessageDirection,
} from "../types/conversation";

export class ConversationOperations {
  constructor(private db: BrandAwareSupabase) {}

  // Create a new conversation
  async create(data: CreateConversation): Promise<Conversation> {
    const conversationData = {
      ...data,
      brand_id: this.db.context.brand_id,
      status: "active" as ConversationStatus,
      message_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: conversation, error } = await this.db.raw
      .from("conversations")
      .insert(conversationData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return conversation as Conversation;
  }

  // Get conversation by ID
  async getById(id: string): Promise<Conversation | null> {
    const { data, error } = await this.db.conversations.eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Failed to get conversation: ${error.message}`);
    }

    return data as Conversation;
  }

  // Get conversations for a customer
  async getByCustomer(customerId: string): Promise<Conversation[]> {
    const { data, error } = await this.db.conversations
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(
        `Failed to get conversations for customer: ${error.message}`
      );
    }

    return data as Conversation[];
  }

  // Get conversation by phone numbers
  async getByPhones(
    customerPhone: string,
    brandPhone: string
  ): Promise<Conversation | null> {
    const { data, error } = await this.db.conversations
      .eq("customer_phone", customerPhone)
      .eq("brand_phone", brandPhone)
      .eq("status", "active")
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Failed to get conversation by phones: ${error.message}`);
    }

    return data as Conversation;
  }

  // Find or create conversation
  async findOrCreate(
    customerId: string,
    customerPhone: string,
    brandPhone: string,
    campaignData?: { campaign_id?: string; campaign_name?: string }
  ): Promise<Conversation> {
    // Try to find existing active conversation
    const existing = await this.getByPhones(customerPhone, brandPhone);
    if (existing && existing.status === "active") {
      return existing;
    }

    // Create new conversation
    return this.create({
      customer_id: customerId,
      customer_phone: customerPhone,
      brand_phone: brandPhone,
      ...campaignData,
    });
  }

  // Add message to conversation
  async addMessage(data: CreateMessage): Promise<Message> {
    const now = new Date().toISOString();

    const messageData = {
      sent_at: now,
      created_at: now,
      ...data,
    };

    // Start transaction-like operation
    const { data: message, error: messageError } = await this.db.raw
      .from("messages")
      .insert(messageData)
      .select()
      .single();

    if (messageError) {
      throw new Error(`Failed to create message: ${messageError.message}`);
    }

    // Update conversation stats
    const updateData: any = {
      last_message_at: now,
      updated_at: now,
    };

    if (data.direction === "inbound") {
      updateData.last_inbound_at = now;
    } else {
      updateData.last_outbound_at = now;
    }

    const { error: conversationError } = await this.db.raw
      .from("conversations")
      .update(updateData)
      .eq("id", data.conversation_id)
      .eq("brand_id", this.db.context.brand_id);

    if (conversationError) {
      throw new Error(
        `Failed to update conversation stats: ${conversationError.message}`
      );
    }

    return message as Message;
  }

  // Get messages for conversation
  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    const { data, error } = await this.db.raw
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }

    return data as Message[];
  }

  // Update conversation status
  async updateStatus(
    id: string,
    status: ConversationStatus
  ): Promise<Conversation> {
    const { data, error } = await this.db.raw
      .from("conversations")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("brand_id", this.db.context.brand_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update conversation status: ${error.message}`);
    }

    return data as Conversation;
  }

  // Opt out conversation
  async optOut(id: string, reason?: string): Promise<Conversation> {
    const now = new Date().toISOString();

    const { data, error } = await this.db.raw
      .from("conversations")
      .update({
        opted_out_at: now,
        opt_out_reason: reason,
        status: "archived" as ConversationStatus,
        updated_at: now,
      })
      .eq("id", id)
      .eq("brand_id", this.db.context.brand_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to opt out conversation: ${error.message}`);
    }

    return data as Conversation;
  }

  // Get active conversations
  async getActive(limit = 50): Promise<Conversation[]> {
    const { data, error } = await this.db.conversations
      .eq("status", "active")
      .is("opted_out_at", null)
      .order("last_message_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get active conversations: ${error.message}`);
    }

    return data as Conversation[];
  }

  // Search conversations
  async search(query: string, limit = 20): Promise<Conversation[]> {
    const { data, error } = await this.db.conversations
      .or(`customer_phone.ilike.%${query}%, campaign_name.ilike.%${query}%`)
      .order("last_message_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search conversations: ${error.message}`);
    }

    return data as Conversation[];
  }

  // Get conversation with customer details
  async getWithCustomer(id: string) {
    const { data, error } = await this.db.raw
      .from("conversations")
      .select(
        `
        *,
        customers!inner (
          id,
          email,
          first_name,
          last_name,
          stage,
          source
        )
      `
      )
      .eq("id", id)
      .eq("brand_id", this.db.context.brand_id)
      .single();

    if (error) {
      throw new Error(
        `Failed to get conversation with customer: ${error.message}`
      );
    }

    return data;
  }

  // Get conversation analytics
  async getAnalytics(timeRange?: { start: string; end: string }) {
    let query = this.db.conversations;

    if (timeRange) {
      query = query
        .gte("created_at", timeRange.start)
        .lte("created_at", timeRange.end);
    }

    const { data, error } = await query.select("*");

    if (error) {
      throw new Error(`Failed to get conversation analytics: ${error.message}`);
    }

    // Process analytics
    const analytics = {
      total: data.length,
      active: 0,
      optedOut: 0,
      byStatus: {} as Record<ConversationStatus, number>,
      avgMessagesPerConversation: 0,
      totalMessages: 0,
    };

    let totalMessages = 0;

    data.forEach((conv: any) => {
      // Count by status
      analytics.byStatus[conv.status as ConversationStatus] =
        (analytics.byStatus[conv.status as ConversationStatus] || 0) + 1;

      if (conv.status === "active") analytics.active++;
      if (conv.opted_out_at) analytics.optedOut++;

      totalMessages += conv.message_count || 0;
    });

    analytics.totalMessages = totalMessages;
    analytics.avgMessagesPerConversation =
      data.length > 0 ? totalMessages / data.length : 0;

    return analytics;
  }
}
