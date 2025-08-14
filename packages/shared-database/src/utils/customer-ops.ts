import { BrandAwareSupabase } from "../client/supabase";
import {
  Customer,
  CreateCustomer,
  UpdateCustomer,
  CustomerStage,
  CustomerSource,
} from "../types/customer";
import { BrandId } from "../types/brand";

export class CustomerOperations {
  constructor(private db: BrandAwareSupabase) {}

  // Create a new customer
  async create(data: CreateCustomer): Promise<Customer> {
    const customerData = {
      ...data,
      brand_id: this.db.context.brand_id,
      stage: data.stage || ("lead" as CustomerStage),
      source: data.source || ("website" as CustomerSource),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: this.db.context.user_id,
    };

    const { data: customer, error } = await this.db.raw
      .from("customers")
      .insert(customerData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }

    return customer as Customer;
  }

  // Get customer by ID
  async getById(id: string): Promise<Customer | null> {
    const { data, error } = await this.db.customers.eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Failed to get customer: ${error.message}`);
    }

    return data as Customer;
  }

  // Get customer by email
  async getByEmail(email: string): Promise<Customer | null> {
    const { data, error } = await this.db.customers.eq("email", email).single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Failed to get customer by email: ${error.message}`);
    }

    return data as Customer;
  }

  // Get customer by phone
  async getByPhone(phone: string): Promise<Customer | null> {
    const { data, error } = await this.db.customers.eq("phone", phone).single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Failed to get customer by phone: ${error.message}`);
    }

    return data as Customer;
  }

  // Update customer
  async update(id: string, data: UpdateCustomer): Promise<Customer> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: customer, error } = await this.db.raw
      .from("customers")
      .update(updateData)
      .eq("id", id)
      .eq("brand_id", this.db.context.brand_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update customer: ${error.message}`);
    }

    return customer as Customer;
  }

  // Progress customer through journey stages
  async progressStage(id: string, newStage: CustomerStage): Promise<Customer> {
    const now = new Date().toISOString();
    const updateData: UpdateCustomer = { stage: newStage };

    // Set stage-specific timestamps
    switch (newStage) {
      case "marketing":
        updateData.marketing_qualified_at = now;
        break;
      case "trial":
        updateData.trial_started_at = now;
        break;
      case "active":
        updateData.subscribed_at = now;
        break;
      case "churned":
        updateData.churned_at = now;
        updateData.is_active = false;
        break;
    }

    return this.update(id, updateData);
  }

  // Get customers by stage
  async getByStage(stage: CustomerStage, limit = 50): Promise<Customer[]> {
    const { data, error } = await this.db.customers
      .eq("stage", stage)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get customers by stage: ${error.message}`);
    }

    return data as Customer[];
  }

  // Search customers
  async search(query: string, limit = 20): Promise<Customer[]> {
    const { data, error } = await this.db.customers
      .or(
        `email.ilike.%${query}%, first_name.ilike.%${query}%, last_name.ilike.%${query}%, phone.ilike.%${query}%`
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search customers: ${error.message}`);
    }

    return data as Customer[];
  }

  // Find or create customer (upsert logic)
  async findOrCreate(
    email: string,
    data: Partial<CreateCustomer> = {}
  ): Promise<Customer> {
    // Try to find existing customer
    const existing = await this.getByEmail(email);
    if (existing) {
      return existing;
    }

    // Create new customer
    return this.create({
      email,
      ...data,
    } as CreateCustomer);
  }

  // Add tags to customer
  async addTags(id: string, tags: string[]): Promise<Customer> {
    const customer = await this.getById(id);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const existingTags = customer.tags || [];
    const newTags = [...new Set([...existingTags, ...tags])];

    return this.update(id, { tags: newTags });
  }

  // Remove tags from customer
  async removeTags(id: string, tags: string[]): Promise<Customer> {
    const customer = await this.getById(id);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const existingTags = customer.tags || [];
    const newTags = existingTags.filter((tag) => !tags.includes(tag));

    return this.update(id, { tags: newTags });
  }

  // Get customer analytics for brand
  async getAnalytics() {
    const { data, error } = await this.db.raw
      .from("customers")
      .select(
        `
        stage,
        source,
        created_at,
        trial_started_at,
        subscribed_at,
        churned_at
      `
      )
      .eq("brand_id", this.db.context.brand_id);

    if (error) {
      throw new Error(`Failed to get customer analytics: ${error.message}`);
    }

    // Process analytics data
    const analytics = {
      total: data.length,
      byStage: {} as Record<CustomerStage, number>,
      bySource: {} as Record<CustomerSource, number>,
      conversionRate: 0,
      avgTimeToConversion: 0,
    };

    data.forEach((customer: any) => {
      // Count by stage
      analytics.byStage[customer.stage as CustomerStage] =
        (analytics.byStage[customer.stage as CustomerStage] || 0) + 1;

      // Count by source
      analytics.bySource[customer.source as CustomerSource] =
        (analytics.bySource[customer.source as CustomerSource] || 0) + 1;
    });

    // Calculate conversion rate (leads to paid)
    const leads = analytics.byStage.lead || 0;
    const active = analytics.byStage.active || 0;
    analytics.conversionRate = leads > 0 ? (active / leads) * 100 : 0;

    return analytics;
  }
}
