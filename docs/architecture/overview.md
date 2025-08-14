# Architecture Overview

## System Design Philosophy

PercyTech's monorepo implements a **multi-brand platform** with shared infrastructure and brand-specific applications. Our architecture prioritizes:

- **Brand Isolation**: Each brand operates independently while sharing core services
- **Customer Journey**: Unified tracking from marketing → trial → subscription
- **SMS-First**: Minimal website interaction, maximum SMS automation
- **Developer Experience**: Type-safe, maintainable, scalable codebase

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PercyTech Monorepo                         │
├─────────────────────────────────────────────────────────────────┤
│                        apps/                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Marketing  │ │   Platform   │ │      API     │            │
│  │    Sites     │ │     Apps     │ │   (Unified)  │            │
│  │              │ │              │ │              │            │
│  │ gnymble-site │ │ gnymble-app  │ │   Next.js    │            │
│  │ percymd-site │ │ percymd-app  │ │              │            │
│  │percytext-site│ │percytext-app │ │  /api/[brand]│            │
│  │              │ │              │ │              │            │
│  │   Next.js    │ │ Vite+React   │ │              │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                      packages/                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ shared-ui    │ │shared-database│ │ shared-sms   │            │
│  │              │ │              │ │              │            │
│  │React Components│ │Supabase Client│ │  TCR + SMS   │            │
│  │Tailwind CSS  │ │Customer Types │ │  Bandwidth   │            │
│  │Brand Theming │ │Conversation   │ │  Automation  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 🎯 Applications (`apps/`)

| Component           | Technology   | Purpose                                 |
| ------------------- | ------------ | --------------------------------------- |
| **Marketing Sites** | Next.js      | Lead capture, brand content, SEO        |
| **Platform Apps**   | Vite + React | Customer dashboards, core functionality |
| **Unified API**     | Next.js API  | Brand-aware backend services            |
| **Admin Dashboard** | Next.js      | Cross-brand management                  |

### 📦 Shared Packages (`packages/`)

| Package             | Purpose              | Key Features                                                  |
| ------------------- | -------------------- | ------------------------------------------------------------- |
| **shared-database** | Data layer           | Supabase client, customer/conversation types, brand isolation |
| **shared-ui**       | Components           | React components, Tailwind CSS, brand theming                 |
| **shared-sms**      | Communications       | TCR registration, Bandwidth SMS, automation workflows         |
| **aws-client**      | Platform Integration | AWS services for platform applications                        |

## Data Flow Architecture

### Customer Journey Flow

```
Marketing Site → Lead Capture → SMS Campaign → Trial Signup → Platform App → Subscription
      ↓              ↓              ↓              ↓             ↓           ↓
   Next.js      Supabase       shared-sms     Supabase    Vite+React   Stripe
```

### Brand Context Flow

```
Domain Detection → Brand Context → API Routing → Database Filtering → Response
gnymble.com     → brand_id      → /api/gnymble → WHERE brand_id    → Brand Data
```

## Key Architectural Patterns

### 1. **Brand-Aware Everything**

- All database tables include `brand_id`
- API routes use `/api/[brand]/...` pattern
- Components adapt to brand theming
- Analytics are brand-scoped

### 2. **Unified Customer Journey**

- Single customer record across marketing → platform
- SMS conversations linked to customer progression
- Shared analytics for conversion tracking

### 3. **Progressive Enhancement**

- Marketing sites work without JavaScript
- Platform apps are SPA with rich interactions
- SMS automation runs independently

### 4. **Type-Safe Development**

- TypeScript throughout
- Zod runtime validation
- Shared types across packages
- Snake_case for database consistency

## Technology Stack

### Core Technologies

- **Frontend**: React, Vite, Next.js, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Build**: Turborepo, pnpm, TypeScript
- **Deployment**: Vercel (marketing + API), separate hosting for platform apps

### External Services

- **SMS**: The Campaign Registry (TCR), Bandwidth
- **Payments**: Stripe
- **AI**: Claude (Anthropic)
- **Storage**: AWS S3
- **Platform**: AWS (for platform-specific features)

## Security & Compliance

### Data Isolation

- **Row Level Security (RLS)** enforces brand separation
- **Brand context validation** at API boundaries
- **Environment-specific configurations** per brand

### SMS Compliance

- **10DLC registration** per brand
- **Opt-out handling** and compliance tracking
- **Message rate limiting** and carrier guidelines

## Performance Considerations

### Caching Strategy

- **API responses** cached by brand context
- **Static assets** CDN distributed
- **Database queries** optimized with proper indexes

### Bundle Optimization

- **Package sharing** across apps via monorepo
- **Code splitting** by brand and feature
- **Tree shaking** for unused code elimination

## Related Documentation

- 📋 [Brand Strategy](./brand-strategy.md) - Multi-brand implementation details
- 💾 [Database Design](./database-design.md) - Schema and isolation patterns
- 🔌 [API Routing](./api-routing.md) - Brand context and routing patterns
- 📝 [ADR-001: Monorepo Structure](../decisions/001-monorepo-structure.md) - Why we chose this approach

---

**Next Steps**: Read about our [Brand Strategy](./brand-strategy.md) for implementation details.
