# Database Design

## Database Strategy Overview

PercyTech implements a **unified database with brand isolation** approach using Supabase PostgreSQL. This design supports the customer journey from marketing through platform subscription while maintaining strict brand separation.

## Database Architecture Decisions

### Unified vs Separate Database Strategy

| Aspect | Unified Database (✅ Chosen) | Separate Databases |
|--------|------------------------------|-------------------|
| **Brand Isolation** | Row Level Security + brand_id | Physical separation |
| **Cross-Brand Analytics** | Native SQL joins | Complex ETL processes |
| **Customer Journey** | Single customer record | Complex data sync |
| **Development Complexity** | Single schema to maintain | Multiple schema versions |
| **Cost** | Single instance scaling | Multiple instance costs |
| **Backup/Recovery** | Single process | Multiple processes |

### Why Unified Database?

1. **Customer Journey Continuity**: Track customers from marketing → trial → subscription in one place
2. **Simplified Analytics**: Native SQL for cross-brand reporting
3. **Development Velocity**: Single schema, single migration process
4. **Cost Efficiency**: One Supabase instance vs multiple

## Schema Design Patterns

### Brand Isolation Pattern

**Every table includes `brand_id`** as the first column after primary key:

```sql
-- Core pattern for all tables
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id brand_id NOT NULL,  -- Always second column
  -- other columns...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Brand Enum Type

```sql
-- Central brand definition
CREATE TYPE brand_id AS ENUM ('gnymble', 'percymd', 'percytext');
```

## Core Tables

### Customer Lifecycle Table

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id brand_id NOT NULL,
  
  -- Identity
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  
  -- Journey tracking
  stage customer_stage NOT NULL DEFAULT 'lead',
  source customer_source NOT NULL DEFAULT 'website',
  marketing_qualified_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ,
  subscribed_at TIMESTAMPTZ,
  churned_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB,
  tags TEXT[],
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Brand isolation constraints
  CONSTRAINT customers_brand_email_unique UNIQUE (brand_id, email),
  CONSTRAINT customers_brand_phone_unique UNIQUE (brand_id, phone)
);
```

### SMS Conversation Threading

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id brand_id NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  
  -- Phone numbers
  customer_phone VARCHAR(20) NOT NULL,
  brand_phone VARCHAR(20) NOT NULL,
  
  -- Conversation state
  status conversation_status NOT NULL DEFAULT 'active',
  campaign_id UUID,
  campaign_name VARCHAR(255),
  
  -- Message tracking
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  
  -- Opt-out compliance
  opted_out_at TIMESTAMPTZ,
  opt_out_reason TEXT,
  
  -- Metadata
  metadata JSONB,
  tags TEXT[],
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Brand isolation
  CONSTRAINT conversations_brand_phones_unique 
    UNIQUE (brand_id, customer_phone, brand_phone)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  
  -- Message content
  direction message_direction NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[],
  
  -- Status tracking
  status message_status,
  external_id VARCHAR(255), -- Provider message ID
  
  -- Timing
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB
);
```

## Row Level Security (RLS) Implementation

### Brand Isolation Policies

```sql
-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Brand isolation for customers
CREATE POLICY customers_brand_isolation ON customers
  FOR ALL
  USING (brand_id = current_setting('app.current_brand')::brand_id);

-- Brand isolation for conversations  
CREATE POLICY conversations_brand_isolation ON conversations
  FOR ALL
  USING (brand_id = current_setting('app.current_brand')::brand_id);

-- Messages inherit brand isolation through conversations
CREATE POLICY messages_conversation_access ON messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE brand_id = current_setting('app.current_brand')::brand_id
    )
  );
```

### Setting Brand Context

```typescript
// Application sets brand context per request
export async function setBrandContext(
  supabase: SupabaseClient, 
  brandId: BrandId
) {
  await supabase.rpc('set_config', {
    parameter: 'app.current_brand',
    value: brandId
  });
}
```

## Indexing Strategy

### Performance Indexes

```sql
-- Customer indexes for common queries
CREATE INDEX idx_customers_brand_id ON customers(brand_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_stage ON customers(brand_id, stage);
CREATE INDEX idx_customers_source ON customers(brand_id, source);
CREATE INDEX idx_customers_created_at ON customers(created_at);

-- Conversation indexes for SMS operations
CREATE INDEX idx_conversations_brand_id ON conversations(brand_id);
CREATE INDEX idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX idx_conversations_phones ON conversations(customer_phone, brand_phone);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_status ON conversations(brand_id, status);

-- Message indexes for threading
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX idx_messages_direction ON messages(direction);

-- Search indexes
CREATE INDEX idx_customers_search ON customers USING GIN(
  to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || email)
);
```

## Customer Journey Data Model

### Stage Progression Tracking

```sql
-- Customer lifecycle stages
CREATE TYPE customer_stage AS ENUM (
  'lead',      -- Initial contact/interest
  'marketing', -- In marketing funnel
  'trial',     -- Trial user on platform
  'active',    -- Paying customer
  'churned',   -- Cancelled subscription
  'dormant'    -- Inactive but not churned
);

-- Source attribution
CREATE TYPE customer_source AS ENUM (
  'website', 'sms_campaign', 'email_campaign', 
  'referral', 'organic', 'paid_ads', 'social', 'other'
);
```

### Journey Analytics Views

```sql
-- Customer analytics by brand
CREATE VIEW customer_analytics AS
SELECT 
  brand_id,
  stage,
  source,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as count_30d,
  AVG(EXTRACT(EPOCH FROM (subscribed_at - created_at))/86400) 
    FILTER (WHERE subscribed_at IS NOT NULL) as avg_days_to_subscription
FROM customers
WHERE is_active = TRUE
GROUP BY brand_id, stage, source;
```

## SMS Compliance Data Model

### Opt-Out Tracking

```sql
-- Conversation status for compliance
CREATE TYPE conversation_status AS ENUM (
  'active',    -- Can send messages
  'paused',    -- Temporarily stopped
  'completed', -- Campaign finished
  'archived'   -- Opted out or inactive
);

-- Message status tracking
CREATE TYPE message_status AS ENUM (
  'pending', 'sent', 'delivered', 'failed', 'undelivered'
);
```

## TypeScript Integration

### Database Types

```typescript
// Generated from database schema
export interface Database {
  public: {
    Tables: {
      customers: {
        Row: Customer;        // Full customer record
        Insert: CreateCustomer; // Fields for INSERT
        Update: UpdateCustomer; // Fields for UPDATE
      };
      conversations: {
        Row: Conversation;
        Insert: CreateConversation;
        Update: UpdateConversation;
      };
      messages: {
        Row: Message;
        Insert: CreateMessage;
        Update: UpdateMessage;
      };
    };
  };
}
```

### Brand-Aware Client

```typescript
// Type-safe database operations
export class BrandAwareSupabase {
  constructor(private brandContext: BrandContext) {}
  
  get customers() {
    return this.client
      .from('customers')
      .select('*')
      .eq('brand_id', this.brandContext.brand_id);
  }
}
```

## Migration Strategy

### Schema Versioning

```sql
-- Migration naming convention
-- YYYY-MM-DD-description.sql
-- 2024-12-01-initial-schema.sql
-- 2024-12-02-add-customer-tags.sql

-- Always include rollback instructions
-- Each migration tested against all brands
```

### Brand-Safe Migrations

```sql
-- Safe migration pattern
BEGIN;
  -- Add column with default
  ALTER TABLE customers ADD COLUMN new_field TEXT DEFAULT 'default_value';
  
  -- Update existing data per brand
  UPDATE customers SET new_field = 'brand_specific_value' 
  WHERE brand_id = 'gnymble';
  
  -- Add constraints after data migration
  ALTER TABLE customers ALTER COLUMN new_field SET NOT NULL;
COMMIT;
```

## Backup and Recovery

### Brand-Aware Backups

```bash
# Full database backup (all brands)
pg_dump $DATABASE_URL > percytech_full_backup.sql

# Brand-specific data export (for compliance)
pg_dump $DATABASE_URL \
  --data-only \
  --where="brand_id='gnymble'" \
  --table=customers \
  --table=conversations \
  --table=messages > gnymble_data.sql
```

## Related Documentation

- 🏗️ [Architecture Overview](./overview.md) - System design context
- 🎯 [Brand Strategy](./brand-strategy.md) - Brand isolation strategy
- 📝 [ADR-002: Snake Case Convention](../decisions/002-snake-case-convention.md) - Naming decisions
- 📝 [ADR-003: Brand Isolation](../decisions/003-brand-isolation.md) - Database isolation approach

---

**Key Principle**: Every query must be **brand-scoped** either through RLS policies or explicit WHERE clauses.
