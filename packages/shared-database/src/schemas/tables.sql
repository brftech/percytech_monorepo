-- PercyTech Multi-Brand Database Schema
-- This schema supports unified database with brand isolation

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Brand enum type
CREATE TYPE brand_id AS ENUM ('gnymble', 'percymd', 'percytext');

-- Customer stage enum
CREATE TYPE customer_stage AS ENUM ('lead', 'marketing', 'trial', 'active', 'churned', 'dormant');

-- Customer source enum  
CREATE TYPE customer_source AS ENUM ('website', 'sms_campaign', 'email_campaign', 'referral', 'organic', 'paid_ads', 'social', 'other');

-- Message direction enum
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');

-- Message status enum
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'undelivered');

-- Conversation status enum
CREATE TYPE conversation_status AS ENUM ('active', 'paused', 'completed', 'archived');

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id brand_id NOT NULL,
    
    -- Identity
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Status tracking
    stage customer_stage NOT NULL DEFAULT 'lead',
    source customer_source NOT NULL DEFAULT 'website',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Journey tracking
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
    created_by UUID,
    
    -- Constraints
    CONSTRAINT customers_brand_email_unique UNIQUE (brand_id, email),
    CONSTRAINT customers_brand_phone_unique UNIQUE (brand_id, phone) DEFERRABLE INITIALLY DEFERRED
);

-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id brand_id NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Phone numbers
    customer_phone VARCHAR(20) NOT NULL,
    brand_phone VARCHAR(20) NOT NULL,
    
    -- Status
    status conversation_status NOT NULL DEFAULT 'active',
    
    -- Campaign tracking
    campaign_id UUID,
    campaign_name VARCHAR(255),
    
    -- Message counts
    message_count INTEGER NOT NULL DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    last_inbound_at TIMESTAMPTZ,
    last_outbound_at TIMESTAMPTZ,
    
    -- Opt-out tracking
    opted_out_at TIMESTAMPTZ,
    opt_out_reason TEXT,
    
    -- Metadata
    metadata JSONB,
    tags TEXT[],
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT conversations_brand_phones_unique UNIQUE (brand_id, customer_phone, brand_phone)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Message content
    direction message_direction NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT[],
    
    -- Status tracking (for outbound messages)
    status message_status,
    external_id VARCHAR(255), -- Provider message ID
    
    -- Metadata
    metadata JSONB,
    
    -- Timing
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_customers_brand_id ON customers(brand_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_stage ON customers(brand_id, stage);
CREATE INDEX idx_customers_source ON customers(brand_id, source);
CREATE INDEX idx_customers_created_at ON customers(created_at);
CREATE INDEX idx_customers_tags ON customers USING GIN(tags);

CREATE INDEX idx_conversations_brand_id ON conversations(brand_id);
CREATE INDEX idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX idx_conversations_status ON conversations(brand_id, status);
CREATE INDEX idx_conversations_phones ON conversations(customer_phone, brand_phone);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_campaign ON conversations(campaign_id);
CREATE INDEX idx_conversations_tags ON conversations USING GIN(tags);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_direction ON messages(direction);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX idx_messages_external_id ON messages(external_id);

-- Full text search indexes
CREATE INDEX idx_customers_search ON customers USING GIN(
    to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || email)
);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (customize based on your auth strategy)
-- Brand isolation policy for customers
CREATE POLICY customers_brand_isolation ON customers
    FOR ALL
    USING (brand_id = current_setting('app.current_brand')::brand_id);

-- Brand isolation policy for conversations
CREATE POLICY conversations_brand_isolation ON conversations
    FOR ALL
    USING (brand_id = current_setting('app.current_brand')::brand_id);

-- Messages are accessible through conversations (brand isolation inherited)
CREATE POLICY messages_conversation_access ON messages
    FOR ALL
    USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE brand_id = current_setting('app.current_brand')::brand_id
        )
    );

-- Views for common queries
CREATE VIEW customer_analytics AS
SELECT 
    brand_id,
    stage,
    source,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as count_30d,
    AVG(EXTRACT(EPOCH FROM (subscribed_at - created_at))/86400) FILTER (WHERE subscribed_at IS NOT NULL) as avg_days_to_subscription
FROM customers
WHERE is_active = TRUE
GROUP BY brand_id, stage, source;

CREATE VIEW conversation_analytics AS
SELECT 
    brand_id,
    status,
    COUNT(*) as count,
    AVG(message_count) as avg_message_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as count_30d,
    COUNT(*) FILTER (WHERE opted_out_at IS NOT NULL) as opted_out_count
FROM conversations
GROUP BY brand_id, status;

-- Grant permissions (adjust based on your needs)
-- These are examples - customize for your auth setup
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
