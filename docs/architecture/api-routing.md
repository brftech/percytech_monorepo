# API Routing & Brand Context

## Brand-Aware API Architecture

Our API routing system automatically detects brand context from domain and routes requests to brand-specific handlers, ensuring complete data isolation and brand-appropriate responses.

## Routing Strategy

### Domain-Based Brand Detection

Brand context is determined by **domain detection**, not authentication headers or JWT claims:

```typescript
// Brand detection middleware
export function getBrandFromRequest(request: Request): BrandId {
  const url = new URL(request.url);
  const host = url.hostname;

  if (host.includes("gnymble")) return "gnymble";
  if (host.includes("percymd")) return "percymd";
  if (host.includes("percytext")) return "percytext";

  // Fallback for development
  if (host.includes("localhost")) {
    const brand = url.searchParams.get("brand");
    if (brand) return validateBrandId(brand);
  }

  throw new Error(`Cannot determine brand from host: ${host}`);
}
```

### API Route Structure

```
/api/
├── [brand]/                    # Brand-scoped routes
│   ├── customers/
│   │   ├── route.ts           # GET/POST /api/gnymble/customers
│   │   └── [id]/
│   │       └── route.ts       # GET/PUT/DELETE /api/gnymble/customers/123
│   ├── conversations/
│   │   ├── route.ts           # SMS conversation management
│   │   └── [id]/
│   │       ├── route.ts
│   │       └── messages/
│   │           └── route.ts   # Message threading
│   ├── campaigns/
│   │   └── route.ts           # SMS campaigns
│   └── analytics/
│       └── route.ts           # Brand-specific analytics
├── shared/                     # Cross-brand admin routes
│   ├── billing/
│   ├── users/
│   └── settings/
└── webhooks/                   # External service webhooks
    ├── stripe/
    ├── bandwidth/
    └── tcr/
```

## Implementation Patterns

### Brand Route Handler Template

```typescript
// /api/[brand]/customers/route.ts
import { NextRequest } from "next/server";
import {
  createDatabaseClient,
  validateBrandId,
} from "@percytech/shared-database";

export async function GET(
  request: NextRequest,
  { params }: { params: { brand: string } }
) {
  try {
    // Validate and extract brand context
    const brandId = validateBrandId(params.brand);
    const brandConfig = getBrandConfig(brandId);

    // Create brand-aware database client
    const db = createDatabaseClient({
      brand_id: brandId,
      config: brandConfig,
      user_id: await getUserId(request), // from auth
      is_admin: await checkAdminRole(request),
    });

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage") as CustomerStage | null;
    const limit = parseInt(searchParams.get("limit") || "50");

    // Execute brand-scoped query
    const customers = stage
      ? await db.customers.getByStage(stage, limit)
      : await db.customers.search("", limit);

    return Response.json({
      data: customers,
      brand: brandId,
      total: customers.length,
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: error.message.includes("brand") ? 400 : 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { brand: string } }
) {
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

  return Response.json({ data: customer }, { status: 201 });
}
```

### Middleware for Brand Context

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only process API routes with [brand] parameter
  if (pathname.startsWith("/api/") && pathname.includes("[brand]")) {
    try {
      const brandId = getBrandFromRequest(request);

      // Add brand context to headers for downstream handlers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-brand-id", brandId);
      requestHeaders.set(
        "x-brand-config",
        JSON.stringify(getBrandConfig(brandId))
      );

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid brand context" },
        { status: 400 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
```

## SMS-Specific Routing

### Webhook Handlers

```typescript
// /api/webhooks/bandwidth/route.ts
export async function POST(request: NextRequest) {
  const payload = await request.json();

  // Extract brand context from phone number or message metadata
  const brandPhone = payload.to;
  const brandId = getBrandFromPhone(brandPhone);

  const db = createDatabaseClient({
    brand_id: brandId,
    config: getBrandConfig(brandId),
  });

  // Find conversation by phone numbers
  const conversation = await db.conversations.getByPhones(
    payload.from, // customer phone
    payload.to // brand phone
  );

  if (conversation) {
    // Add inbound message to existing conversation
    await db.conversations.addMessage({
      conversation_id: conversation.id,
      direction: "inbound",
      content: payload.text,
      external_id: payload.messageId,
    });
  } else {
    // Create new conversation and customer if needed
    const customer = await db.customers.findOrCreate(
      payload.from, // use phone as identifier
      { source: "sms_campaign" }
    );

    const newConversation = await db.conversations.create({
      customer_id: customer.id,
      customer_phone: payload.from,
      brand_phone: payload.to,
    });

    await db.conversations.addMessage({
      conversation_id: newConversation.id,
      direction: "inbound",
      content: payload.text,
      external_id: payload.messageId,
    });
  }

  return Response.json({ success: true });
}
```

### Outbound SMS API

```typescript
// /api/[brand]/sms/send/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { brand: string } }
) {
  const brandId = validateBrandId(params.brand);
  const { to, message, campaign_id } = await request.json();

  const smsService = createSMSClient(brandId);
  const db = createDatabaseClient({ brand_id: brandId });

  // Find or create conversation
  const conversation = await db.conversations.findOrCreate(
    customerId,
    to,
    getBrandPhone(brandId),
    { campaign_id }
  );

  // Send SMS via Bandwidth
  const result = await smsService.sendMessage({
    to,
    from: getBrandPhone(brandId),
    text: message,
  });

  // Record outbound message
  await db.conversations.addMessage({
    conversation_id: conversation.id,
    direction: "outbound",
    content: message,
    external_id: result.messageId,
    status: "sent",
  });

  return Response.json({ success: true, messageId: result.messageId });
}
```

## Cross-Brand Admin Routes

### Shared Analytics API

```typescript
// /api/shared/analytics/route.ts
export async function GET(request: NextRequest) {
  // Verify admin permissions
  const user = await getAuthenticatedUser(request);
  if (!user?.is_admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Aggregate data across all brands
  const analytics = await Promise.all([
    getDatabaseClient("gnymble").customers.getAnalytics(),
    getDatabaseClient("percymd").customers.getAnalytics(),
    getDatabaseClient("percytext").customers.getAnalytics(),
  ]);

  return Response.json({
    gnymble: analytics[0],
    percymd: analytics[1],
    percytext: analytics[2],
    combined: combineAnalytics(analytics),
  });
}
```

## Error Handling Patterns

### Brand-Aware Error Responses

```typescript
// Consistent error handling across all brand routes
export class BrandAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public brandId?: BrandId
  ) {
    super(message);
  }
}

export function handleAPIError(error: unknown, brandId?: BrandId) {
  if (error instanceof BrandAPIError) {
    return Response.json(
      {
        error: error.message,
        brand: error.brandId || brandId,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode }
    );
  }

  // Log unexpected errors with brand context
  console.error(`[${brandId || "unknown"}] API Error:`, error);

  return Response.json({ error: "Internal server error" }, { status: 500 });
}
```

## Development & Testing

### Local Development URLs

```bash
# Development with brand context
http://localhost:3000/api/gnymble/customers?brand=gnymble
http://localhost:3000/api/percymd/campaigns?brand=percymd

# Production URLs
https://gnymble.com/api/gnymble/customers
https://api.percytech.com/gnymble/customers
```

### API Testing with Brand Context

```typescript
// Test helper for brand-aware API testing
export function createBrandTestClient(brandId: BrandId) {
  return {
    get: (path: string) =>
      fetch(`/api/${brandId}${path}`, {
        headers: { "x-test-brand": brandId },
      }),
    post: (path: string, data: any) =>
      fetch(`/api/${brandId}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-brand": brandId,
        },
        body: JSON.stringify(data),
      }),
  };
}

// Usage in tests
const gnymbleAPI = createBrandTestClient("gnymble");
const customers = await gnymbleAPI.get("/customers");
```

## Security Considerations

### Brand Context Validation

```typescript
// Always validate brand context at route boundaries
export function validateBrandAccess(
  requestedBrand: BrandId,
  userContext: UserContext
): void {
  // Admin users can access any brand
  if (userContext.is_admin) return;

  // Regular users can only access their brand
  if (userContext.brand_id !== requestedBrand) {
    throw new BrandAPIError(
      `Access denied to brand ${requestedBrand}`,
      403,
      requestedBrand
    );
  }
}
```

### Rate Limiting by Brand

```typescript
// Brand-aware rate limiting
export async function checkRateLimit(
  brandId: BrandId,
  endpoint: string,
  identifier: string
): Promise<boolean> {
  const key = `rate_limit:${brandId}:${endpoint}:${identifier}`;
  const limit = getBrandConfig(brandId).rate_limits[endpoint];

  // Implement sliding window rate limiting
  return await rateLimiter.check(key, limit);
}
```

## Related Documentation

- 🏗️ [Architecture Overview](./overview.md) - System design context
- 🎯 [Brand Strategy](./brand-strategy.md) - Brand isolation principles
- 💾 [Database Design](./database-design.md) - Data layer integration
- 🛠️ [Development Conventions](../development/conventions.md) - API coding standards

---

**Key Principle**: Every API route must be **brand-aware** and automatically filter data by brand context.
