# ADR-001: Turborepo Monorepo with Brand Domain Architecture

**Date**: 2024-12-15  
**Status**: Accepted  
**Deciders**: Engineering Team  
**Consulted**: Product Team  
**Informed**: All Stakeholders

## Context

PercyTech operates three independent brands (Gnymble, PercyMD, PercyText) that share common functionality but require separate marketing sites and platform applications. We needed to decide on a code organization strategy that would:

- **Maximize code sharing** for common functionality (SMS, customer management, UI components)
- **Maintain brand independence** for marketing and platform customization
- **Enable independent deployments** when necessary
- **Simplify development workflow** with unified tooling and dependencies
- **Support future brand additions** without major restructuring

The team was experiencing development friction with separate repositories for each brand, leading to:

- Duplicated code across brands
- Inconsistent implementations of shared features
- Complex dependency management between shared libraries
- Slower feature development due to cross-repo coordination

## Decision

We will implement a **Turborepo monorepo** with brand-specific applications and shared packages:

```
percytech-monorepo/
├── apps/
│   ├── api/                     # Unified Next.js API (all brands)
│   ├── gnymble-site/           # gnymble.com marketing
│   ├── percymd-site/           # percymd.com marketing
│   ├── percytext-site/         # percytext.com marketing
│   ├── gnymble-app/            # app.gnymble.com platform
│   ├── percymd-app/            # app.percymd.com platform
│   ├── percytext-app/          # app.percytext.com platform
│   └── admin/                  # admin.percytech.com
└── packages/
    ├── shared-ui/              # React components
    ├── shared-database/        # Supabase schemas/types
    ├── shared-sms/             # SMS logic
    └── aws-client/             # AWS platform integration
```

**Key Architectural Decisions**:

- **Unified API** serving all brands with brand-aware routing (`/api/[brand]/...`)
- **Separate apps** for each brand's marketing site and platform
- **Shared packages** for common functionality
- **Turborepo** for build orchestration and caching
- **pnpm workspaces** for dependency management

## Consequences

### Positive Consequences

- **Code Reuse**: Shared packages eliminate duplication of SMS, database, and UI logic
- **Type Safety**: Shared TypeScript types ensure consistency across brands
- **Development Velocity**: Single codebase for shared features accelerates development
- **Unified Tooling**: Single build system, linting, testing, and deployment pipeline
- **Dependency Management**: Single package.json reduces version conflicts
- **Cross-Brand Features**: Easy to implement admin tools and analytics across brands

### Negative Consequences

- **Increased Complexity**: Larger codebase requires more sophisticated tooling and understanding
- **Coupled Deployments**: Changes to shared packages potentially affect all brands
- **Learning Curve**: Team must understand monorepo concepts and Turborepo tooling
- **Build Times**: Larger repository may have longer full builds (mitigated by Turborepo caching)

### Neutral Consequences

- **Repository Size**: Single large repo instead of multiple smaller ones
- **CI/CD Changes**: Need to implement path-based triggering for selective builds

## Alternatives Considered

### Alternative 1: Separate Repositories per Brand

- **Description**: Maintain completely separate codebases for each brand
- **Pros**: Simple deployment, clear ownership, no cross-brand dependencies
- **Cons**: Massive code duplication, inconsistent implementations, complex shared library management

### Alternative 2: Microservices Architecture

- **Description**: Break functionality into separate services (SMS service, customer service, etc.)
- **Pros**: Independent scaling, technology diversity, clear service boundaries
- **Cons**: Network complexity, distributed system challenges, over-engineering for current scale

### Alternative 3: Nx Monorepo

- **Description**: Use Nx instead of Turborepo for monorepo management
- **Pros**: More mature ecosystem, powerful generators, integrated testing
- **Cons**: Steeper learning curve, more complex configuration, overkill for our use case

### Alternative 4: Rush Monorepo

- **Description**: Microsoft's Rush for monorepo management
- **Pros**: Excellent for large organizations, sophisticated versioning
- **Cons**: Complex setup, designed for much larger scale than needed

## Implementation

### Immediate Actions

1. ✅ **Initialize Turborepo structure** with apps and packages directories
2. ✅ **Configure pnpm workspaces** for dependency management
3. ✅ **Set up Turborepo pipeline** for build, dev, lint, test tasks
4. ✅ **Create shared-database package** with Supabase client and types
5. 🔄 **Create shared-ui package** with React components and brand theming
6. 🔄 **Create shared-sms package** with SMS automation logic

### Long-term Plan

- **Phase 1** (Weeks 1-2): Core infrastructure and shared packages
- **Phase 2** (Weeks 3-4): Migrate existing brand applications to monorepo
- **Phase 3** (Weeks 5-6): Implement unified API with brand routing
- **Phase 4** (Ongoing): Optimize build times and developer experience

### Success Metrics

- **Development Velocity**: 50% reduction in time to implement cross-brand features
- **Code Duplication**: <5% duplication of business logic across brands
- **Build Performance**: <2 minute full monorepo builds
- **Developer Satisfaction**: Team survey showing improved development experience

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Monorepo Tools Comparison](https://nx.dev/concepts/integrated-vs-package-based)
- [Brand Strategy Documentation](../architecture/brand-strategy.md)
- [Database Design Documentation](../architecture/database-design.md)

---

## Revision History

| Date       | Change                    | Author           |
| ---------- | ------------------------- | ---------------- |
| 2024-12-15 | Initial decision document | Engineering Team |

## Notes

- **Assumptions**: Team is comfortable with TypeScript and modern React development
- **Dependencies**: Requires Turborepo 2.x and pnpm 10.x
- **Review Schedule**: Quarterly review of monorepo structure effectiveness

**Supersedes**: Previous multi-repository architecture  
**Enables**: [ADR-002: Snake Case Convention](./002-snake-case-convention.md), [ADR-003: Brand Isolation](./003-brand-isolation.md)

---

**Related Documentation**:

- [Architecture Overview](../architecture/overview.md)
- [Development Setup](../development/setup.md)
