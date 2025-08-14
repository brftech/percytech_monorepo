# ADR-003: Brand Isolation Strategy with Unified Database

**Date**: 2024-12-15  
**Status**: Accepted  
**Deciders**: Engineering Team, Product Team  
**Consulted**: Legal Team, Compliance Team  
**Informed**: All Stakeholders

## Context

PercyTech operates three independent brands (Gnymble, PercyMD, PercyText) that must maintain **complete business and data isolation** while sharing common infrastructure and functionality. We needed to make critical decisions about:

**Data Architecture**:

- Should each brand have separate databases or share a unified database?
- How do we ensure zero data leakage between brands?
- How do we maintain compliance and audit trails per brand?

**Application Architecture**:

- How do we detect brand context in applications?
- Should authentication be brand-specific or cross-brand?
- How do we handle brand-specific configurations and theming?

**Compliance Requirements**:

- Each brand has separate SMS compliance registrations (TCR/10DLC)
- Customer data must be completely isolated for privacy/legal reasons
- Analytics and reporting must be brand-scoped

The team evaluated multiple approaches to ensure complete brand isolation while maximizing development efficiency.

## Decision

We will implement **unified database with brand isolation** using domain-based brand context detection:

### Database Strategy: Unified with Row-Level Security

```sql
-- Every table includes brand_id as the primary isolation mechanism
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  brand_id brand_id NOT NULL,  -- ENUM: 'gnymble' | 'percymd' | 'percytext'
  email VARCHAR(255),
  -- Unique constraints are brand-scoped
  CONSTRAINT customers_brand_email_unique UNIQUE (brand_id, email)
);

-- Automatic brand filtering via Row Level Security
CREATE POLICY customers_brand_isolation ON customers
  FOR ALL
  USING (brand_id = current_setting('app.current_brand')::brand_id);
```

### Brand Context Detection: Domain-Based

```typescript
// Brand context determined by domain, not authentication
export function getBrandFromDomain(host: string): BrandId {
  if (host.includes("gnymble")) return "gnymble";
  if (host.includes("percymd")) return "percymd";
  if (host.includes("percytext")) return "percytext";
  throw new Error(`Unknown brand domain: ${host}`);
}
```

### API Architecture: Brand-Aware Routing

```
/api/[brand]/customers     # Brand-scoped endpoints
/api/gnymble/customers     # Only Gnymble customers
/api/percymd/campaigns     # Only PercyMD campaigns
/api/shared/billing        # Cross-brand admin only
```

### Application Isolation: Brand-Specific Deployments

```
gnymble.com      → gnymble-site    (marketing)
app.gnymble.com  → gnymble-app     (platform)
percymd.com      → percymd-site    (marketing)
app.percymd.com  → percymd-app     (platform)
```

## Consequences

### Positive Consequences

- **Complete Data Isolation**: RLS policies ensure zero cross-brand data leakage
- **Simplified Customer Journey**: Single customer record from marketing → platform
- **Unified Analytics**: Native SQL joins for cross-brand business reporting
- **Development Efficiency**: Single schema to maintain and evolve
- **Cost Optimization**: Single database instance vs. multiple separate instances
- **Compliance Clarity**: Brand context always explicit and auditable
- **Automatic Filtering**: Database-level enforcement prevents application bugs

### Negative Consequences

- **Complexity Risk**: Single point of failure for all brands
- **Performance Concerns**: All brands share database resources
- **Migration Challenges**: Moving to separate databases later would be complex
- **RLS Dependency**: Heavy reliance on PostgreSQL Row Level Security
- **Brand Context Bugs**: Incorrect brand context could cause data leakage

### Neutral Consequences

- **Database Size**: Larger single database instead of multiple smaller ones
- **Backup Strategy**: Single backup process covers all brands
- **Monitoring**: Unified database monitoring with brand-level metrics

## Alternatives Considered

### Alternative 1: Separate Databases per Brand

- **Description**: Each brand gets its own Supabase project/database
- **Pros**: Perfect isolation, independent scaling, simpler permissions
- **Cons**: Customer journey tracking complexity, expensive ($75/month × 3), complex cross-brand analytics

### Alternative 2: Microservices with Separate Data Stores

- **Description**: Brand-specific services with dedicated databases
- **Pros**: Ultimate isolation, independent technology choices, scalable architecture
- **Cons**: Network complexity, distributed system challenges, over-engineering for current scale

### Alternative 3: Multi-Tenant SaaS Architecture

- **Description**: Traditional SaaS multi-tenancy with tenant_id
- **Pros**: Proven pattern, extensive tooling, clear isolation boundaries
- **Cons**: Not suitable for independent brand domains, complex tenant management

### Alternative 4: JWT-Based Brand Context

- **Description**: Brand context stored in authentication tokens
- **Pros**: Consistent with auth patterns, works across domains
- **Cons**: Requires authentication for brand detection, complex for marketing sites

## Implementation

### Database Implementation

```sql
-- Brand enum defines valid brands
CREATE TYPE brand_id AS ENUM ('gnymble', 'percymd', 'percytext');

-- Row Level Security for automatic filtering
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_brand_isolation ON customers
  FOR ALL USING (brand_id = current_setting('app.current_brand')::brand_id);

-- Brand-scoped unique constraints
ALTER TABLE customers ADD CONSTRAINT customers_brand_email_unique
  UNIQUE (brand_id, email);
```

### Application Implementation

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

// API route with brand validation
export async function GET(
  request: NextRequest,
  { params }: { params: { brand: string } }
) {
  const brandId = validateBrandId(params.brand);
  const db = createDatabaseClient({ brand_id: brandId });
  const customers = await db.customers.getByStage("active");
  return Response.json(customers);
}
```

### Success Metrics

- **Zero Data Leakage**: Automated tests confirm no cross-brand data access
- **Performance Baseline**: Database response times under 100ms for typical queries
- **Isolation Testing**: Comprehensive test suite validates brand filtering
- **Audit Compliance**: All operations traceable to specific brand context

## Security Considerations

### Data Protection Measures

1. **Database Level**: Row Level Security (RLS) policies enforce isolation
2. **Application Level**: Brand context validation at all API boundaries
3. **Runtime Level**: Automated tests verify brand filtering in CI/CD
4. **Audit Level**: All database operations logged with brand context

### Brand Context Validation

```typescript
// Every API operation validates brand context
export function validateBrandAccess(
  requestedBrand: BrandId,
  userContext: UserContext
): void {
  if (!userContext.is_admin && userContext.brand_id !== requestedBrand) {
    throw new Error(`Access denied to brand ${requestedBrand}`);
  }
}
```

### Compliance Features

- **SMS Opt-outs**: Tracked per brand for compliance
- **Data Retention**: Brand-specific retention policies
- **Audit Trails**: All operations logged with brand context
- **Privacy Controls**: Customer data export/deletion by brand

## Risk Mitigation

### Technical Risks

| Risk                     | Probability | Impact | Mitigation                                        |
| ------------------------ | ----------- | ------ | ------------------------------------------------- |
| **Brand Context Bug**    | Medium      | High   | Comprehensive testing, RLS policies, code review  |
| **Database Performance** | Low         | Medium | Monitoring, query optimization, indexing strategy |
| **RLS Policy Failure**   | Low         | High   | Automated policy testing, backup validation       |

### Business Risks

| Risk                     | Probability | Impact | Mitigation                                    |
| ------------------------ | ----------- | ------ | --------------------------------------------- |
| **Compliance Violation** | Low         | High   | Legal review, audit trails, isolation testing |
| **Data Breach**          | Low         | High   | Security testing, access controls, monitoring |
| **Customer Confusion**   | Medium      | Low    | Clear branding, separate domains              |

## References

- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Multi-tenancy Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Brand Strategy Documentation](../architecture/brand-strategy.md)
- [Database Design Documentation](../architecture/database-design.md)

---

## Revision History

| Date       | Change                    | Author           |
| ---------- | ------------------------- | ---------------- |
| 2024-12-15 | Initial decision document | Engineering Team |

## Notes

- **Assumptions**: PostgreSQL RLS is reliable and performant for our scale
- **Dependencies**: Requires disciplined development practices for brand context
- **Review Schedule**: Monthly security review, quarterly architecture review

**Critical Success Factors**:

- All developers understand brand isolation requirements
- Comprehensive testing validates isolation boundaries
- Monitoring alerts on any cross-brand data access

---

**Related Documentation**:

- [Brand Strategy](../architecture/brand-strategy.md)
- [Database Design](../architecture/database-design.md)
- [API Routing](../architecture/api-routing.md)
