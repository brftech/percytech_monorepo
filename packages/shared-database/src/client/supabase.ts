import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { BrandId, BrandContext } from '../types/brand';

// Database interface for type safety
export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          brand_id: BrandId;
          email: string;
          phone: string | null;
          first_name: string | null;
          last_name: string | null;
          stage: string;
          source: string;
          is_active: boolean;
          marketing_qualified_at: string | null;
          trial_started_at: string | null;
          subscribed_at: string | null;
          churned_at: string | null;
          metadata: Record<string, unknown> | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          brand_id: BrandId;
          email: string;
          phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          stage?: string;
          source?: string;
          is_active?: boolean;
          marketing_qualified_at?: string | null;
          trial_started_at?: string | null;
          subscribed_at?: string | null;
          churned_at?: string | null;
          metadata?: Record<string, unknown> | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          brand_id?: BrandId;
          email?: string;
          phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          stage?: string;
          source?: string;
          is_active?: boolean;
          marketing_qualified_at?: string | null;
          trial_started_at?: string | null;
          subscribed_at?: string | null;
          churned_at?: string | null;
          metadata?: Record<string, unknown> | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      conversations: {
        Row: {
          id: string;
          brand_id: BrandId;
          customer_id: string;
          customer_phone: string;
          brand_phone: string;
          status: string;
          campaign_id: string | null;
          campaign_name: string | null;
          message_count: number;
          last_message_at: string | null;
          last_inbound_at: string | null;
          last_outbound_at: string | null;
          opted_out_at: string | null;
          opt_out_reason: string | null;
          metadata: Record<string, unknown> | null;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: BrandId;
          customer_id: string;
          customer_phone: string;
          brand_phone: string;
          status?: string;
          campaign_id?: string | null;
          campaign_name?: string | null;
          message_count?: number;
          last_message_at?: string | null;
          last_inbound_at?: string | null;
          last_outbound_at?: string | null;
          opted_out_at?: string | null;
          opt_out_reason?: string | null;
          metadata?: Record<string, unknown> | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: BrandId;
          customer_id?: string;
          customer_phone?: string;
          brand_phone?: string;
          status?: string;
          campaign_id?: string | null;
          campaign_name?: string | null;
          message_count?: number;
          last_message_at?: string | null;
          last_inbound_at?: string | null;
          last_outbound_at?: string | null;
          opted_out_at?: string | null;
          opt_out_reason?: string | null;
          metadata?: Record<string, unknown> | null;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          direction: string;
          content: string;
          media_urls: string[] | null;
          status: string | null;
          external_id: string | null;
          metadata: Record<string, unknown> | null;
          sent_at: string;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          direction: string;
          content: string;
          media_urls?: string[] | null;
          status?: string | null;
          external_id?: string | null;
          metadata?: Record<string, unknown> | null;
          sent_at?: string;
          delivered_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          direction?: string;
          content?: string;
          media_urls?: string[] | null;
          status?: string | null;
          external_id?: string | null;
          metadata?: Record<string, unknown> | null;
          sent_at?: string;
          delivered_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

// Singleton Supabase client
let supabaseClient: SupabaseClient<Database> | null = null;

export function createSupabaseClient(
  url?: string,
  anonKey?: string
): SupabaseClient<Database> {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration');
  }

  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Handle sessions at app level
    },
  });

  return supabaseClient;
}

// Get existing client
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseClient) {
    return createSupabaseClient();
  }
  return supabaseClient;
}

// Brand-aware client wrapper
export class BrandAwareSupabase {
  private client: SupabaseClient<Database>;
  private brandContext: BrandContext;

  constructor(brandContext: BrandContext, client?: SupabaseClient<Database>) {
    this.brandContext = brandContext;
    this.client = client || getSupabaseClient();
  }

  // Get customers for this brand
  get customers(): any {
    return this.client
      .from('customers')
      .select('*')
      .eq('brand_id', this.brandContext.brand_id);
  }

  // Get conversations for this brand
  get conversations(): any {
    return this.client
      .from('conversations')
      .select('*')
      .eq('brand_id', this.brandContext.brand_id);
  }

  // Raw client access
  get raw() {
    return this.client;
  }

  // Brand context
  get context() {
    return this.brandContext;
  }
}

// Factory function for brand-aware client
export function createBrandClient(brandContext: BrandContext): BrandAwareSupabase {
  return new BrandAwareSupabase(brandContext);
}
