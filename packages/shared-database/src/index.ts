// Main exports for @percytech/shared-database package

// Type exports
export type { BrandId, BrandConfig, BrandContext } from "./types/brand";
import type { BrandContext } from "./types/brand";
import { createBrandClient } from "./client/supabase";
import { CustomerOperations } from "./utils/customer-ops";
import { ConversationOperations } from "./utils/conversation-ops";
export type {
  Customer,
  CreateCustomer,
  UpdateCustomer,
  CustomerStage,
  CustomerSource,
} from "./types/customer";
export type {
  Conversation,
  CreateConversation,
  Message,
  CreateMessage,
  MessageDirection,
  MessageStatus,
  ConversationStatus,
} from "./types/conversation";

// Schema exports
export {
  BrandId as BrandIdSchema,
  BRAND_CONFIGS,
  getBrandConfig,
  validateBrandId,
} from "./types/brand";
export {
  CustomerSchema,
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CustomerStage as CustomerStageSchema,
  CustomerSource as CustomerSourceSchema,
  getCustomerDisplayName,
  isTrialCustomer,
  isPaidCustomer,
  getCustomerJourneyDuration,
} from "./types/customer";
export {
  ConversationSchema,
  CreateConversationSchema,
  MessageSchema,
  CreateMessageSchema,
  MessageDirection as MessageDirectionSchema,
  MessageStatus as MessageStatusSchema,
  ConversationStatus as ConversationStatusSchema,
  isOptedOut,
  canSendMessage,
  getConversationDisplayName,
  getLastMessageDirection,
} from "./types/conversation";

// Client exports
export type { Database } from "./client/supabase";
export {
  createSupabaseClient,
  getSupabaseClient,
  BrandAwareSupabase,
  createBrandClient,
} from "./client/supabase";

// Utility exports
export { CustomerOperations } from "./utils/customer-ops";
export { ConversationOperations } from "./utils/conversation-ops";

// Convenience factory function for complete database operations
export function createDatabaseClient(brandContext: BrandContext) {
  const client = createBrandClient(brandContext);

  return {
    client,
    customers: new CustomerOperations(client),
    conversations: new ConversationOperations(client),

    // Direct access to raw client and context
    raw: client.raw,
    context: client.context,
  };
}

// Re-export common types for convenience
export type DatabaseClient = ReturnType<typeof createDatabaseClient>;
