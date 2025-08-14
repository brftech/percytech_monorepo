# ADR-002: Snake Case Convention for Database and API Consistency

**Date**: 2024-12-15  
**Status**: Accepted  
**Deciders**: Engineering Team  
**Consulted**: Database Team  
**Informed**: All Developers

## Context

Our monorepo integrates with Supabase PostgreSQL, which follows SQL naming conventions using snake_case for table and column names. We discovered a significant inconsistency between our database schema and TypeScript code:

**Database Schema** (Supabase/PostgreSQL):

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  brand_id brand_id NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**TypeScript Code** (camelCase):

```typescript
interface Customer {
  id: string;
  brandId: BrandId;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
}
```

This mismatch was causing:

- **TypeScript compilation errors** when interfacing with Supabase
- **Runtime errors** due to field name mismatches
- **Development friction** requiring constant field name translation
- **Maintenance burden** maintaining two naming conventions

The team needed to choose a consistent naming convention across the entire stack.

## Decision

We will standardize on **snake_case naming convention** throughout the entire application stack:

- **Database tables and columns**: snake_case (already established)
- **TypeScript interfaces and types**: snake_case
- **API request/response payloads**: snake_case
- **Zod validation schemas**: snake_case
- **Function parameters**: snake_case for database-related operations

**Examples of the new convention**:

```typescript
// TypeScript types (NEW)
interface Customer {
  id: string;
  brand_id: BrandId;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
}

// API endpoints (NEW)
POST /api/gnymble/customers
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "marketing_qualified_at": "2024-12-15T10:00:00Z"
}

// Database operations (NEW)
const customer = await db.customers.create({
  brand_id: 'gnymble',
  email: 'user@example.com',
  first_name: 'John',
  trial_started_at: new Date().toISOString()
});
```

**Exceptions**:

- React component props may remain camelCase when they don't directly map to database fields
- JavaScript/React event handlers remain camelCase (`onClick`, `onChange`)
- Third-party library APIs maintain their original conventions

## Consequences

### Positive Consequences

- **Zero Translation Overhead**: Direct mapping between database and TypeScript types
- **Supabase Compatibility**: Perfect alignment with Supabase client expectations
- **Reduced Errors**: Eliminates field name mismatch runtime errors
- **Simplified Development**: No mental overhead switching between conventions
- **SQL Query Consistency**: TypeScript field names match SQL column names exactly
- **Third-party Integration**: Many APIs (Stripe, Bandwidth) use snake_case

### Negative Consequences

- **JavaScript Convention Deviation**: Goes against typical JavaScript camelCase preference
- **Learning Curve**: Team needs to adapt to snake_case in TypeScript
- **Linting Updates**: ESLint rules need configuration to allow snake_case
- **Existing Code Migration**: All existing camelCase interfaces need updating

### Neutral Consequences

- **API Documentation**: External API consumers see snake_case (common in REST APIs)
- **Database Queries**: No change needed in SQL queries

## Alternatives Considered

### Alternative 1: camelCase with Field Mapping

- **Description**: Keep camelCase in TypeScript and map fields when interfacing with database
- **Pros**: Follows JavaScript conventions, familiar to React developers
- **Cons**: Constant translation overhead, error-prone mapping, runtime performance cost

### Alternative 2: Mixed Convention (Database snake_case, API camelCase)

- **Description**: Use snake_case for database operations but camelCase for API responses
- **Pros**: Best of both worlds for different audiences
- **Cons**: Requires field transformation layer, increased complexity, potential for bugs

### Alternative 3: Supabase Client Configuration

- **Description**: Configure Supabase client to automatically transform field names
- **Pros**: Maintains JavaScript conventions in application code
- **Cons**: Hidden magic transformations, debugging difficulties, potential performance impact

### Alternative 4: Custom Type Mapping Library

- **Description**: Build a library to handle bidirectional field name conversion
- **Pros**: Could provide type safety for transformations
- **Cons**: Significant development overhead, maintenance burden, unnecessary complexity

## Implementation

### Immediate Actions

1. ✅ **Update shared-database types** from camelCase to snake_case
2. ✅ **Modify Zod schemas** to use snake_case field names
3. ✅ **Update database operation functions** to use snake_case parameters
4. ✅ **Fix TypeScript compilation errors** across all packages
5. 🔄 **Update API route handlers** to use snake_case in request/response
6. 🔄 **Configure ESLint** to allow snake_case in specific contexts

### Long-term Plan

- **Phase 1** (Week 1): Core database and type updates (completed)
- **Phase 2** (Week 2): API endpoints and client integration
- **Phase 3** (Week 3): Component integration and testing
- **Phase 4** (Ongoing): Team training and documentation updates

### Success Metrics

- **Zero TypeScript errors** related to field name mismatches
- **Build time improvement** due to reduced type errors
- **Developer velocity** measured through reduced debugging time
- **Code review efficiency** with fewer naming-related issues

## Migration Strategy

### Automated Transformations

```bash
# Use TypeScript compiler and regex to transform interfaces
# Update all interface definitions
sed -i 's/brandId:/brand_id:/g' **/*.ts
sed -i 's/firstName:/first_name:/g' **/*.ts
sed -i 's/lastName:/last_name:/g' **/*.ts
sed -i 's/createdAt:/created_at:/g' **/*.ts
sed -i 's/updatedAt:/updated_at:/g' **/*.ts
```

### Manual Review Required

- Component props that don't map to database fields
- Third-party library integrations
- Complex nested object transformations

## References

- [Supabase Naming Conventions](https://supabase.com/docs/guides/api#tables-and-views)
- [PostgreSQL Naming Conventions](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS)
- [REST API Naming Conventions](https://restfulapi.net/naming-conventions/)
- [Database Design Documentation](../architecture/database-design.md)

---

## Revision History

| Date       | Change                    | Author           |
| ---------- | ------------------------- | ---------------- |
| 2024-12-15 | Initial decision document | Engineering Team |

## Notes

- **Assumptions**: Team prioritizes consistency over JavaScript conventions
- **Dependencies**: Requires updating all existing TypeScript interfaces
- **Review Schedule**: Review impact after 3 months of usage

**Enables**: Seamless Supabase integration and reduced development friction  
**Impacts**: All database-related TypeScript code requires updates

---

**Related Documentation**:

- [Database Design](../architecture/database-design.md)
- [Code Conventions](../development/conventions.md)
- [ADR-001: Monorepo Structure](./001-monorepo-structure.md)
