# Brand Strategy

## Multi-Brand Architecture Approach

PercyTech operates **three independent brands** sharing common infrastructure while maintaining complete business and data isolation.

## Brand Definitions

### Brand Configurations

```typescript
export const BRAND_CONFIGS = {
  gnymble: {
    id: "gnymble",
    name: "Gnymble",
    domain: "gnymble.com",
    platform_domain: "app.gnymble.com",
    primary_color: "#4F46E5",
    support_email: "support@gnymble.com",
  },
  percymd: {
    id: "percymd",
    name: "PercyMD",
    domain: "percymd.com",
    platform_domain: "app.percymd.com",
    primary_color: "#059669",
    support_email: "support@percymd.com",
  },
  percytext: {
    id: "percytext",
    name: "PercyText",
    domain: "percytext.com",
    platform_domain: "app.percytext.com",
    primary_color: "#DC2626",
    support_email: "support@percytext.com",
  },
};
```

## Brand Context Detection

### Domain-Based Routing

Brand context is determined by **domain detection**, not authentication headers or JWT claims:

```typescript
// Brand detection in Next.js middleware
export function getBrandFromDomain(host: string): BrandId {
  if (host.includes("gnymble")) return "gnymble";
  if (host.includes("percymd")) return "percymd";
  if (host.includes("percytext")) return "percytext";
  throw new Error(`Unknown brand domain: ${host}`);
}
```

### API Route Structure

```
/api/[brand]/...           # Brand-scoped API routes
/api/gnymble/customers     # Gnymble customers only
/api/percymd/campaigns     # PercyMD campaigns only
/api/shared/billing        # Cross-brand admin functions
```

## Data Isolation Strategy

### Database Level Isolation

**Every table includes `brand_id`** for automatic filtering:

```sql
-- All tables follow this pattern
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  brand_id brand_id NOT NULL,  -- Enum: gnymble | percymd | percytext
  email VARCHAR(255) NOT NULL,
  -- other fields...
  CONSTRAINT customers_brand_email_unique UNIQUE (brand_id, email)
);
```

### Row Level Security (RLS)

```sql
-- Automatic brand filtering at database level
CREATE POLICY customers_brand_isolation ON customers
  FOR ALL
  USING (brand_id = current_setting('app.current_brand')::brand_id);
```

### Application Level Isolation

```typescript
// Brand-aware database client
export class BrandAwareSupabase {
  constructor(private brandContext: BrandContext) {}

  get customers() {
    return this.client
      .from("customers")
      .select("*")
      .eq("brand_id", this.brandContext.brand_id); // Automatic filtering
  }
}
```

## Brand-Specific Deployment Strategy

### Separate Domains

- **Marketing Sites**: `gnymble.com`, `percymd.com`, `percytext.com`
- **Platform Apps**: `app.gnymble.com`, `app.percymd.com`, `app.percytext.com`
- **Unified API**: `api.percytech.com` (or embedded in marketing sites)

### Environment Variables by Brand

```bash
# Environment configuration per brand
GNYMBLE_STRIPE_PUBLIC_KEY=pk_live_...
PERCYMD_STRIPE_PUBLIC_KEY=pk_live_...
PERCYTEXT_STRIPE_PUBLIC_KEY=pk_live_...

GNYMBLE_BANDWIDTH_USER_ID=...
PERCYMD_BANDWIDTH_USER_ID=...
PERCYTEXT_BANDWIDTH_USER_ID=...
```

## SMS & Compliance Isolation

### Separate TCR Registrations

- Each brand maintains **separate 10DLC registrations**
- Different phone number pools per brand
- Independent opt-out tracking and compliance

### Brand-Specific Campaign Management

```typescript
// SMS campaigns are brand-scoped
interface SMSCampaign {
  id: string;
  brand_id: BrandId;
  name: string;
  from_phone: string; // Brand-specific phone number
  tcr_campaign_id: string; // Brand's TCR registration
}
```

## Cross-Brand Features

### Admin Dashboard

- **Cross-brand analytics** for business owners
- **Consolidated billing** across all brands
- **User management** with multi-brand access

### Shared Resources

- **Component library** with brand theming
- **Common SMS infrastructure** (different credentials)
- **Unified customer journey tracking**

## Brand Theming System

### CSS Custom Properties

```css
/* Brand-specific CSS variables */
.brand-gnymble {
  --brand-primary: #4f46e5;
  --brand-secondary: #e0e7ff;
}

.brand-percymd {
  --brand-primary: #059669;
  --brand-secondary: #d1fae5;
}

.brand-percytext {
  --brand-primary: #dc2626;
  --brand-secondary: #fee2e2;
}
```

### Component Theming

```typescript
// Brand-aware components
export function Button({ brand, ...props }: ButtonProps) {
  const brandConfig = getBrandConfig(brand);
  return (
    <button
      className={`bg-[${brandConfig.primary_color}] text-white`}
      {...props}
    />
  );
}
```

## Customer Journey Across Brands

### Independent Customer Bases

- **No cross-brand customer sharing**
- **Separate analytics and reporting**
- **Independent subscription management**

### Unified Journey Tracking Pattern

```typescript
// Same customer journey stages across all brands
type CustomerStage =
  | "lead" // Initial contact/interest
  | "marketing" // In marketing funnel
  | "trial" // Trial user on platform
  | "active" // Paying customer
  | "churned"; // Cancelled subscription
```

## Brand Isolation Benefits

### Business Benefits

- **Clear brand separation** for legal/compliance
- **Independent marketing strategies**
- **Separate financial reporting**
- **Scalable to additional brands**

### Technical Benefits

- **Simplified permissions** (domain-based)
- **Reduced data leak risk** (automatic filtering)
- **Clear debugging** (brand context always known)
- **Independent deployments** (when needed)

## Implementation Examples

### API Route Handler

```typescript
// /api/[brand]/customers/route.ts
export async function GET(
  request: Request,
  { params }: { params: { brand: string } }
) {
  const brandId = validateBrandId(params.brand);
  const db = createDatabaseClient({ brand_id: brandId });

  const customers = await db.customers.getByStage("active");
  return Response.json(customers);
}
```

### Component with Brand Context

```typescript
// Brand-aware React component
export function CustomerList({ brand }: { brand: BrandId }) {
  const { data: customers } = useSWR(`/api/${brand}/customers`);
  const brandConfig = getBrandConfig(brand);

  return (
    <div style={{ accentColor: brandConfig.primary_color }}>
      {customers?.map(customer => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  );
}
```

## Related Documentation

- 🏗️ [Architecture Overview](./overview.md) - High-level system design
- 💾 [Database Design](./database-design.md) - Schema isolation patterns
- 🔌 [API Routing](./api-routing.md) - Brand-aware routing implementation
- 📝 [ADR-003: Brand Isolation](../decisions/003-brand-isolation.md) - Isolation strategy decisions

---

**Key Principle**: Every component, API route, and database query must be **brand-aware** to maintain proper isolation.
