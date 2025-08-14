# PercyTech Monorepo Documentation

Welcome to the PercyTech monorepo documentation. This serves as your navigation hub for understanding our multi-brand platform architecture.

## 📋 Quick Navigation

### 🏗️ Architecture

- **[Architecture Overview](./architecture/overview.md)** - High-level system design and component relationships
- **[Brand Strategy](./architecture/brand-strategy.md)** - Multi-brand approach and isolation strategy
- **[Database Design](./architecture/database-design.md)** - Unified vs separate database decisions
- **[API Routing](./architecture/api-routing.md)** - Brand context detection and routing patterns

### 📝 Architecture Decision Records (ADRs)

- **[ADR-001: Monorepo Structure](./decisions/001-monorepo-structure.md)** - Turbo monorepo with brand domains
- **[ADR-002: Snake Case Convention](./decisions/002-snake-case-convention.md)** - Supabase compatibility standardization
- **[ADR-003: Brand Isolation](./decisions/003-brand-isolation.md)** - Database and application isolation strategy
- **[ADR Template](./decisions/template.md)** - Template for future architectural decisions

### 🛠️ Development

- **[Setup Guide](./development/setup.md)** - Complete development environment setup
- **[Code Conventions](./development/conventions.md)** - Coding standards and naming conventions
- **[Troubleshooting](./development/troubleshooting.md)** - Common issues and solutions

## 🚀 Quick Start

1. **New to the project?** Start with [Architecture Overview](./architecture/overview.md)
2. **Setting up locally?** Follow the [Setup Guide](./development/setup.md)
3. **Making architectural changes?** Use the [ADR Template](./decisions/template.md)
4. **Code questions?** Check [Conventions](./development/conventions.md)

## 🏢 About PercyTech

PercyTech operates three distinct brands:

- **Gnymble** (`gnymble.com` → `app.gnymble.com`)
- **PercyMD** (`percymd.com` → `app.percymd.com`)
- **PercyText** (`percytext.com` → `app.percytext.com`)

Each brand has its own marketing site and platform application, unified by shared SMS automation and customer journey tracking.

## 📚 Documentation Principles

Our documentation follows these principles:

- **📍 Focused**: Each file covers a single topic
- **🔗 Linkable**: Cross-references related decisions
- **🔄 Updatable**: Easy to modify without breaking other docs
- **⚡ Actionable**: Includes code examples where relevant

## 🤝 Contributing to Documentation

When making architectural decisions:

1. Create a new ADR using the [template](./decisions/template.md)
2. Update relevant architecture docs
3. Add troubleshooting entries for new patterns
4. Link from this README if it's a major addition

---

**Last Updated**: December 2024  
**Maintainers**: PercyTech Engineering Team
