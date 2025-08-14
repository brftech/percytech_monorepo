# @percytech/shared-database

Shared database client, types, and utilities for PercyTech multi-brand platform.

## Features

- **Brand-aware database operations** with automatic brand isolation
- **Type-safe Supabase client** with TypeScript schemas
- **Customer journey tracking** from marketing → platform
- **SMS conversation management** with message threading
- **Comprehensive analytics** and reporting helpers
- **Zod validation schemas** for runtime type safety

## Architecture

This package implements a **unified database with brand isolation** strategy:

- Single database with `brand_id` field on all tables
- Row Level Security (RLS) for automatic brand filtering
- Brand-aware client wrapper for simplified operations
- Customer journey tracking across marketing → platform transition

## Quick Start

```typescript
import { createDatabaseClient, BrandId } from '@percytech/shared-database';

// Create brand-aware database client
const db = createDatabaseClient({
  brandId: 'gnymble' as BrandId,
  config: getBrandConfig('gnymble'),
  userId: 'user-123',
  isAdmin: false
});

// Customer operations
const customer = await db.customers.create({
  email: 'user@example.com',
  first_name: 'John',
  last_name: 'Doe',
  source: 'website'
});

// Progress customer through journey
await db.customers.progressStage(customer.id, 'trial');

// Conversation operations
const conversation = await db.conversations.findOrCreate(
  customer.id,
  '+1234567890',
  '+1987654321'
);

// Add message to conversation
await db.conversations.addMessage({
  conversation_id: conversation.id,
  direction: 'outbound',
  content: 'Welcome to our platform!'
});
```

## Brand Configuration

The package includes built-in configurations for all PercyTech brands:

```typescript
import { BRAND_CONFIGS, getBrandConfig } from '@percytech/shared-database';

// Access brand configs
const gnymbleConfig = getBrandConfig('gnymble');
console.log(gnymbleConfig.domain); // 'gnymble.com'
console.log(gnymbleConfig.platformDomain); // 'app.gnymble.com'
```

## Customer Journey Tracking

Track customers through their complete journey:

```typescript
// Create lead from marketing
const lead = await db.customers.create({
  email: 'lead@example.com',
  stage: 'lead',
  source: 'sms_campaign'
});

// Progress through stages
await db.customers.progressStage(lead.id, 'marketing'); // Sets marketing_qualified_at
await db.customers.progressStage(lead.id, 'trial');     // Sets trial_started_at  
await db.customers.progressStage(lead.id, 'active');    // Sets subscribed_at

// Analytics
const analytics = await db.customers.getAnalytics();
console.log(analytics.conversionRate); // Percentage of leads that became paid
```

## SMS Conversation Management

Handle SMS conversations with threading and opt-out tracking:

```typescript
// Find or create conversation
const conversation = await db.conversations.findOrCreate(
  customerId,
  customerPhone,
  brandPhone,
  { campaign_id: 'welcome-series' }
);

// Send message
if (canSendMessage(conversation)) {
  await db.conversations.addMessage({
    conversation_id: conversation.id,
    direction: 'outbound',
    content: 'Thanks for signing up!'
  });
}

// Handle opt-out
await db.conversations.optOut(conversation.id, 'STOP request');
```

## Database Schema

The package includes complete SQL schema definitions in `src/schemas/tables.sql`:

- **customers**: Customer profiles with journey tracking
- **conversations**: SMS conversation threads  
- **messages**: Individual SMS messages
- **Enums**: Brand IDs, customer stages, message statuses
- **Indexes**: Optimized for common query patterns
- **RLS Policies**: Automatic brand isolation

## Environment Variables

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## TypeScript Support

Full TypeScript support with Zod runtime validation:

```typescript
import { CustomerSchema, BrandIdSchema } from '@percytech/shared-database';

// Runtime validation
const result = CustomerSchema.safeParse(data);
if (result.success) {
  const customer = result.data; // Fully typed
}

// Type-only imports
import type { Customer, BrandContext } from '@percytech/shared-database';
```

## Testing

```bash
# Run type checking
pnpm type-check

# Run linting  
pnpm lint

# Build package
pnpm build
```

## Brand Isolation

All operations are automatically scoped to the brand context:

```typescript
// Only returns customers for the specified brand
const customers = await db.customers.getByStage('trial');

// Conversations are filtered by brand automatically
const conversations = await db.conversations.getActive();

// Analytics are brand-specific
const analytics = await db.customers.getAnalytics();
```

This ensures complete data isolation between brands while sharing the same database infrastructure.
