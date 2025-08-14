# Code Conventions

## Overview

This document establishes coding standards and naming conventions for the PercyTech monorepo. These conventions ensure consistency, maintainability, and team collaboration across all brands and packages.

## Naming Conventions

### Database & API Layer (snake_case)

Following [ADR-002: Snake Case Convention](../decisions/002-snake-case-convention.md), we use snake_case for all database-related code:

```typescript
// ✅ Correct: Database types
interface Customer {
  id: string;
  brand_id: BrandId;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
  marketing_qualified_at?: string;
}

// ✅ Correct: API payloads
POST /api/gnymble/customers
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "trial_started_at": "2024-12-15T10:00:00Z"
}

// ✅ Correct: Database operations
const customer = await db.customers.create({
  brand_id: 'gnymble',
  email: 'user@example.com',
  first_name: 'John'
});
```

### Frontend Layer (camelCase)

React components and frontend-specific code use camelCase:

```typescript
// ✅ Correct: React component props
interface CustomerCardProps {
  customer: Customer;
  onEdit?: (customerId: string) => void;
  showActions?: boolean;
}

// ✅ Correct: Event handlers
const handleSubmit = (event: FormEvent) => {
  // ...
};

// ✅ Correct: React state
const [isLoading, setIsLoading] = useState(false);
const [customerData, setCustomerData] = useState<Customer | null>(null);
```

### File and Directory Naming

```
├── components/
│   ├── CustomerCard.tsx           # PascalCase for components
│   ├── customer-form.tsx          # kebab-case for complex components
│   └── index.ts                   # Barrel exports
├── hooks/
│   ├── use-customer-data.ts       # kebab-case for hooks
│   └── use-brand-context.ts
├── utils/
│   ├── format-phone.ts            # kebab-case for utilities
│   └── customer-helpers.ts
└── types/
    ├── customer.ts                # snake_case matching database
    ├── conversation.ts
    └── index.ts
```

## TypeScript Standards

### Strict Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Type Definitions

```typescript
// ✅ Correct: Explicit types for clarity
export interface BrandContext {
  brand_id: BrandId;
  config: BrandConfig;
  user_id?: string;
  is_admin?: boolean;
}

// ✅ Correct: Union types for specific values
export type CustomerStage =
  | 'lead'
  | 'marketing'
  | 'trial'
  | 'active'
  | 'churned'
  | 'dormant';

// ✅ Correct: Generic types with constraints
export interface APIResponse<T = unknown> {
  data: T;
  brand: BrandId;
  total?: number;
  error?: string;
}

// ❌ Avoid: any types
const data: any = await fetch(...);

// ✅ Better: Proper typing
const data: APIResponse<Customer[]> = await fetch(...);
```

### Import/Export Standards

```typescript
// ✅ Correct: Named exports preferred
export function createDatabaseClient(context: BrandContext) {
  // ...
}

export interface Customer {
  // ...
}

// ✅ Correct: Barrel exports for packages
// packages/shared-database/src/index.ts
export type { Customer, CreateCustomer } from "./types/customer";
export { createDatabaseClient } from "./client/supabase";
export { CustomerOperations } from "./utils/customer-ops";

// ✅ Correct: Import organization
// 1. External libraries
import React from "react";
import { z } from "zod";

// 2. Internal packages
import {
  createDatabaseClient,
  type Customer,
} from "@percytech/shared-database";
import { Button, Card } from "@percytech/shared-ui";

// 3. Relative imports
import { formatPhoneNumber } from "../utils/format-phone";
import type { ComponentProps } from "./types";
```

## React Component Standards

### Component Structure

```typescript
// ✅ Correct: Component structure
import React from 'react';
import { type Customer } from '@percytech/shared-database';

interface CustomerCardProps {
  customer: Customer;
  onEdit?: (id: string) => void;
  className?: string;
}

export function CustomerCard({
  customer,
  onEdit,
  className = ""
}: CustomerCardProps) {
  const displayName = customer.first_name && customer.last_name
    ? `${customer.first_name} ${customer.last_name}`
    : customer.email;

  const handleEdit = () => {
    onEdit?.(customer.id);
  };

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold">{displayName}</h3>
      <p className="text-gray-600">{customer.email}</p>
      {onEdit && (
        <button
          onClick={handleEdit}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
        >
          Edit
        </button>
      )}
    </div>
  );
}
```

### Hooks Pattern

```typescript
// ✅ Correct: Custom hook structure
import { useState, useEffect } from "react";
import { type Customer } from "@percytech/shared-database";

interface UseCustomerDataOptions {
  brandId: BrandId;
  stage?: CustomerStage;
}

interface UseCustomerDataReturn {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCustomerData({
  brandId,
  stage,
}: UseCustomerDataOptions): UseCustomerDataReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/${brandId}/customers${stage ? `?stage=${stage}` : ""}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }

      const data = await response.json();
      setCustomers(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [brandId, stage]);

  return {
    customers,
    isLoading,
    error,
    refetch: fetchCustomers,
  };
}
```

## API Route Standards

### Route Handler Structure

```typescript
// ✅ Correct: API route structure
import { NextRequest } from "next/server";
import {
  createDatabaseClient,
  validateBrandId,
  CreateCustomerSchema,
  type Customer,
} from "@percytech/shared-database";

export async function GET(
  request: NextRequest,
  { params }: { params: { brand: string } }
) {
  try {
    // 1. Validate brand context
    const brandId = validateBrandId(params.brand);

    // 2. Extract and validate query parameters
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage") as CustomerStage | null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    // 3. Create brand-aware database client
    const db = createDatabaseClient({
      brand_id: brandId,
      config: getBrandConfig(brandId),
      user_id: await getUserId(request),
    });

    // 4. Execute query
    const customers = stage
      ? await db.customers.getByStage(stage, limit)
      : await db.customers.search("", limit);

    // 5. Return consistent response format
    return Response.json({
      data: customers,
      brand: brandId,
      total: customers.length,
    });
  } catch (error) {
    return handleAPIError(error, params.brand);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { brand: string } }
) {
  try {
    const brandId = validateBrandId(params.brand);
    const body = await request.json();

    // Validate input with Zod
    const customerData = CreateCustomerSchema.parse(body);

    const db = createDatabaseClient({
      brand_id: brandId,
      config: getBrandConfig(brandId),
      user_id: await getUserId(request),
    });

    const customer = await db.customers.create(customerData);

    return Response.json({ data: customer, brand: brandId }, { status: 201 });
  } catch (error) {
    return handleAPIError(error, params.brand);
  }
}
```

### Error Handling

```typescript
// ✅ Correct: Consistent error handling
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

export function handleAPIError(error: unknown, brandId?: string) {
  console.error(`[${brandId || "unknown"}] API Error:`, error);

  if (error instanceof APIError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        brand: brandId,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof z.ZodError) {
    return Response.json(
      {
        error: "Validation failed",
        details: error.errors,
        brand: brandId,
      },
      { status: 400 }
    );
  }

  return Response.json({ error: "Internal server error" }, { status: 500 });
}
```

## Database Operations

### Query Patterns

```typescript
// ✅ Correct: Brand-aware database operations
export class CustomerOperations {
  constructor(private db: BrandAwareSupabase) {}

  async create(data: CreateCustomer): Promise<Customer> {
    const customerData = {
      ...data,
      brand_id: this.db.context.brand_id,
      stage: data.stage || "lead",
      source: data.source || "website",
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
      throw new APIError(`Failed to create customer: ${error.message}`);
    }

    return customer as Customer;
  }

  async getByStage(stage: CustomerStage, limit = 50): Promise<Customer[]> {
    const { data, error } = await this.db.customers
      .eq("stage", stage)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new APIError(`Failed to get customers: ${error.message}`);
    }

    return data as Customer[];
  }
}
```

## Validation Standards

### Zod Schema Patterns

```typescript
// ✅ Correct: Zod validation schemas
import { z } from "zod";

// Base schemas
export const BrandIdSchema = z.enum(["gnymble", "percymd", "percytext"]);

export const CustomerStageSchema = z.enum([
  "lead",
  "marketing",
  "trial",
  "active",
  "churned",
  "dormant",
]);

// Entity schemas
export const CustomerSchema = z.object({
  id: z.string().uuid(),
  brand_id: BrandIdSchema,
  email: z.string().email(),
  phone: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  stage: CustomerStageSchema,
  source: CustomerSourceSchema,
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Input schemas (subset for creation)
export const CreateCustomerSchema = CustomerSchema.pick({
  email: true,
  phone: true,
  first_name: true,
  last_name: true,
  stage: true,
  source: true,
}).partial({
  phone: true,
  first_name: true,
  last_name: true,
  stage: true,
  source: true,
});

// Query parameter validation
export const CustomerQuerySchema = z.object({
  stage: CustomerStageSchema.optional(),
  source: CustomerSourceSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});
```

## Testing Standards

### Unit Test Structure

```typescript
// ✅ Correct: Test file structure
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  createDatabaseClient,
  type BrandContext,
} from "@percytech/shared-database";

describe("CustomerOperations", () => {
  let db: ReturnType<typeof createDatabaseClient>;
  let brandContext: BrandContext;

  beforeEach(() => {
    brandContext = {
      brand_id: "gnymble",
      config: getBrandConfig("gnymble"),
      user_id: "test-user-123",
      is_admin: false,
    };

    db = createDatabaseClient(brandContext);
  });

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestData(brandContext.brand_id);
  });

  describe("create", () => {
    it("should create a customer with brand context", async () => {
      const customerData = {
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
      };

      const customer = await db.customers.create(customerData);

      expect(customer).toMatchObject({
        email: customerData.email,
        first_name: customerData.first_name,
        last_name: customerData.last_name,
        brand_id: "gnymble",
        stage: "lead",
        is_active: true,
      });
      expect(customer.id).toBeDefined();
      expect(customer.created_at).toBeDefined();
    });

    it("should throw error for invalid email", async () => {
      const customerData = {
        email: "invalid-email",
        first_name: "Test",
      };

      await expect(db.customers.create(customerData)).rejects.toThrow(
        "Invalid email format"
      );
    });
  });
});
```

## Documentation Standards

### Code Comments

````typescript
// ✅ Correct: Meaningful comments
/**
 * Creates a brand-aware database client that automatically filters
 * all queries by the provided brand context.
 *
 * @param brandContext - Brand identification and user context
 * @returns Database client with brand filtering applied
 *
 * @example
 * ```typescript
 * const db = createDatabaseClient({
 *   brand_id: 'gnymble',
 *   config: getBrandConfig('gnymble'),
 *   user_id: 'user-123'
 * });
 *
 * const customers = await db.customers.getByStage('active');
 * ```
 */
export function createDatabaseClient(brandContext: BrandContext) {
  // Implementation...
}

// ✅ Correct: Complex logic explanation
// Calculate customer journey duration in days, handling edge cases
// where subscription date might be before creation date (data import scenarios)
export function getCustomerJourneyDuration(customer: Customer): number | null {
  if (!customer.subscribed_at || !customer.created_at) return null;

  const start = new Date(customer.created_at);
  const end = new Date(customer.subscribed_at);

  // Ensure positive duration for data integrity
  const durationMs = Math.max(0, end.getTime() - start.getTime());
  return Math.floor(durationMs / (1000 * 60 * 60 * 24));
}
````

### JSDoc Standards

````typescript
/**
 * @fileoverview Customer operations for brand-aware database interactions
 * @author PercyTech Engineering Team
 * @since 2024-12-15
 */

/**
 * Manages customer lifecycle operations with automatic brand filtering.
 * All operations are scoped to the brand context provided during initialization.
 */
export class CustomerOperations {
  /**
   * @param db - Brand-aware Supabase client
   */
  constructor(private db: BrandAwareSupabase) {}

  /**
   * Creates a new customer with brand context automatically applied.
   *
   * @param data - Customer creation data
   * @returns Promise resolving to the created customer
   * @throws {APIError} When customer creation fails
   *
   * @example
   * ```typescript
   * const customer = await customerOps.create({
   *   email: 'user@example.com',
   *   first_name: 'John',
   *   source: 'website'
   * });
   * ```
   */
  async create(data: CreateCustomer): Promise<Customer> {
    // Implementation...
  }
}
````

## Linting Configuration

### ESLint Setup

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    // Allow snake_case for database-related code
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "interface",
        "format": ["PascalCase"]
      },
      {
        "selector": "typeAlias",
        "format": ["PascalCase"]
      },
      {
        "selector": "variable",
        "format": ["camelCase", "PascalCase", "UPPER_CASE", "snake_case"],
        "filter": {
          "regex": "^(brand_id|user_id|first_name|last_name|created_at|updated_at|marketing_qualified_at|trial_started_at|subscribed_at|churned_at|customer_id|conversation_id|campaign_id|message_count|last_message_at|last_inbound_at|last_outbound_at|opted_out_at|opt_out_reason|external_id|sent_at|delivered_at|media_urls)$",
          "match": true
        }
      }
    ],
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

## Related Documentation

- 🏗️ [Architecture Overview](../architecture/overview.md)
- 📝 [ADR-002: Snake Case Convention](../decisions/002-snake-case-convention.md)
- 🛠️ [Setup Guide](./setup.md)
- 🐛 [Troubleshooting](./troubleshooting.md)

---

**Key Principles**:

- **Consistency**: Follow established patterns across the codebase
- **Type Safety**: Leverage TypeScript's type system fully
- **Brand Awareness**: Every operation must consider brand context
- **Documentation**: Code should be self-documenting with meaningful names and comments
