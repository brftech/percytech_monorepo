import { z } from 'zod';
import { BrandId } from './brand';

// Customer lifecycle stages
export const CustomerStage = z.enum([
  'lead',           // Initial contact/interest
  'marketing',      // In marketing funnel
  'trial',          // Trial user on platform
  'active',         // Paying customer
  'churned',        // Cancelled subscription
  'dormant'         // Inactive but not churned
]);
export type CustomerStage = z.infer<typeof CustomerStage>;

// Customer source tracking
export const CustomerSource = z.enum([
  'website',        // Direct website signup
  'sms_campaign',   // SMS marketing campaign
  'email_campaign', // Email marketing
  'referral',       // Customer referral
  'organic',        // Organic search
  'paid_ads',       // Paid advertising
  'social',         // Social media
  'other'           // Other/unknown
]);
export type CustomerSource = z.infer<typeof CustomerSource>;

// Base customer schema
export const CustomerSchema = z.object({
  id: z.string().uuid(),
  brand_id: BrandId,
  
  // Identity
  email: z.string().email(),
  phone: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  
  // Status tracking
  stage: CustomerStage,
  source: CustomerSource,
  is_active: z.boolean().default(true),
  
  // Journey tracking
  marketing_qualified_at: z.string().datetime().optional(),
  trial_started_at: z.string().datetime().optional(),
  subscribed_at: z.string().datetime().optional(),
  churned_at: z.string().datetime().optional(),
  
  // Metadata
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  
  // Audit
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;

// Customer creation input (subset of fields)
export const CreateCustomerSchema = CustomerSchema.pick({
  email: true,
  phone: true,
  first_name: true,
  last_name: true,
  stage: true,
  source: true,
  metadata: true,
  tags: true,
}).partial({
  phone: true,
  first_name: true,
  last_name: true,
  stage: true,
  source: true,
  metadata: true,
  tags: true,
});

export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;

// Customer update input
export const UpdateCustomerSchema = CustomerSchema.pick({
  email: true,
  phone: true,
  first_name: true,
  last_name: true,
  stage: true,
  is_active: true,
  marketing_qualified_at: true,
  trial_started_at: true,
  subscribed_at: true,
  churned_at: true,
  metadata: true,
  tags: true,
}).partial();

export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;

// Customer journey helpers
export function getCustomerDisplayName(customer: Customer): string {
  if (customer.first_name && customer.last_name) {
    return `${customer.first_name} ${customer.last_name}`;
  }
  if (customer.first_name) {
    return customer.first_name;
  }
  return customer.email;
}

export function isTrialCustomer(customer: Customer): boolean {
  return customer.stage === 'trial' && !!customer.trial_started_at;
}

export function isPaidCustomer(customer: Customer): boolean {
  return customer.stage === 'active' && !!customer.subscribed_at;
}

export function getCustomerJourneyDuration(customer: Customer): number | null {
  if (!customer.subscribed_at || !customer.created_at) return null;
  
  const start = new Date(customer.created_at);
  const end = new Date(customer.subscribed_at);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)); // days
}
