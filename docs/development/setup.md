# Development Setup Guide

## Prerequisites

Before setting up the PercyTech monorepo, ensure you have the following installed:

### Required Software

| Tool        | Version | Purpose            |
| ----------- | ------- | ------------------ |
| **Node.js** | ≥18.0.0 | JavaScript runtime |
| **pnpm**    | ≥10.0.0 | Package manager    |
| **Git**     | Latest  | Version control    |
| **VSCode**  | Latest  | Recommended IDE    |

### Package Manager Setup

```bash
# Install pnpm globally
npm install -g pnpm@latest

# Verify installation
pnpm --version  # Should be 10.14.0 or higher
```

### Recommended VSCode Extensions

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "Supabase.supabase-vscode",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag"
  ]
}
```

## Repository Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/brftech/percytech_monorepo.git
cd percytech_monorepo

# Verify structure
ls -la
# Should see: apps/, packages/, docs/, package.json, turbo.json
```

### 2. Install Dependencies

```bash
# Install all dependencies across the monorepo
pnpm install

# Verify Turborepo is working
pnpm turbo build
```

### 3. Environment Configuration

Create environment files for each application:

```bash
# Root environment (shared variables)
cp .env.example .env.local

# App-specific environments (when created)
cp apps/api/.env.example apps/api/.env.local
cp apps/gnymble-site/.env.example apps/gnymble-site/.env.local
# ... repeat for other apps
```

## Environment Variables

### Required Variables

Create `.env.local` in the repository root:

```bash
# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SMS Service (Bandwidth)
GNYMBLE_BANDWIDTH_USER_ID=your-bandwidth-user-id
GNYMBLE_BANDWIDTH_API_TOKEN=your-bandwidth-token
GNYMBLE_BANDWIDTH_API_SECRET=your-bandwidth-secret

PERCYMD_BANDWIDTH_USER_ID=your-bandwidth-user-id
PERCYMD_BANDWIDTH_API_TOKEN=your-bandwidth-token
PERCYMD_BANDWIDTH_API_SECRET=your-bandwidth-secret

PERCYTEXT_BANDWIDTH_USER_ID=your-bandwidth-user-id
PERCYTEXT_BANDWIDTH_API_TOKEN=your-bandwidth-token
PERCYTEXT_BANDWIDTH_API_SECRET=your-bandwidth-secret

# Payments (Stripe)
GNYMBLE_STRIPE_PUBLIC_KEY=pk_test_...
GNYMBLE_STRIPE_SECRET_KEY=sk_test_...

PERCYMD_STRIPE_PUBLIC_KEY=pk_test_...
PERCYMD_STRIPE_SECRET_KEY=sk_test_...

PERCYTEXT_STRIPE_PUBLIC_KEY=pk_test_...
PERCYTEXT_STRIPE_SECRET_KEY=sk_test_...

# AI Service (Anthropic Claude)
ANTHROPIC_API_KEY=your-anthropic-key

# Development
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
```

### Brand-Specific Configuration

For development, you can override brand detection:

```bash
# Force brand context in development
NEXT_PUBLIC_FORCE_BRAND=gnymble  # or percymd, percytext
```

## Database Setup

### 1. Supabase Project Setup

1. **Create Supabase Project**:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create new project: "PercyTech Monorepo"
   - Note the URL and anon key

2. **Run Database Migrations**:

   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Initialize Supabase (if not already done)
   supabase init

   # Link to your project
   supabase link --project-ref your-project-ref

   # Apply schema
   supabase db push
   ```

3. **Verify Database Setup**:
   ```bash
   # Test shared-database package
   cd packages/shared-database
   pnpm build
   pnpm test  # (when tests are added)
   ```

### 2. Local Database (Optional)

For development, you can run a local database:

```bash
# Start local Supabase
supabase start

# This provides:
# - Local PostgreSQL database
# - Local Supabase Studio
# - Local Edge Functions
```

## Development Workflow

### 1. Daily Development

```bash
# Start all apps in development mode
pnpm dev

# Or start specific apps
pnpm dev --filter=@percytech/gnymble-site
pnpm dev --filter=@percytech/shared-database

# Build all packages
pnpm build

# Run linting
pnpm lint

# Type checking
pnpm type-check
```

### 2. Working with Packages

```bash
# Add dependency to specific package
pnpm add react --filter=@percytech/shared-ui

# Add dev dependency to root
pnpm add -D jest --filter=root

# Run commands in specific package
pnpm --filter=@percytech/shared-database build
```

### 3. Creating New Apps/Packages

```bash
# Create new app
mkdir apps/new-app
cd apps/new-app
pnpm init

# Create new package
mkdir packages/new-package
cd packages/new-package
pnpm init
```

## Testing Setup

### Unit Testing (Jest)

```bash
# Install testing dependencies (when ready)
pnpm add -D jest @types/jest ts-jest --filter=root

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Integration Testing

```bash
# Database testing with test database
SUPABASE_URL=test-db-url pnpm test:integration
```

## Brand Development

### Testing Different Brands

```bash
# Development URLs for testing brand context
http://localhost:3000?brand=gnymble
http://localhost:3000?brand=percymd
http://localhost:3000?brand=percytext

# Or use different ports
GNYMBLE_PORT=3001 pnpm dev --filter=gnymble-site
PERCYMD_PORT=3002 pnpm dev --filter=percymd-site
```

### Brand-Specific Environment

```bash
# Override brand context for testing
NEXT_PUBLIC_FORCE_BRAND=gnymble pnpm dev
```

## Troubleshooting

### Common Issues

#### 1. pnpm Installation Issues

```bash
# Clear pnpm cache
pnpm store prune

# Reinstall dependencies
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

#### 2. Turborepo Build Issues

```bash
# Clear Turbo cache
pnpm turbo clean
rm -rf .turbo

# Force rebuild
pnpm turbo build --force
```

#### 3. TypeScript Errors

```bash
# Check TypeScript setup
pnpm type-check

# Restart TypeScript server in VSCode
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

#### 4. Database Connection Issues

```bash
# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Test database connection
cd packages/shared-database
node -e "
const { createSupabaseClient } = require('./dist/index.js');
const client = createSupabaseClient();
console.log('Database connected:', !!client);
"
```

#### 5. Brand Context Issues

```bash
# Debug brand detection
curl -H "Host: gnymble.localhost" http://localhost:3000/api/gnymble/customers
```

### Development Tools

#### Database Inspection

```bash
# Open Supabase Studio locally
supabase studio

# Connect to production database (read-only)
psql "postgresql://[connection-string]?options=-c%20default_transaction_read_only=on"
```

#### API Testing

```bash
# Test API endpoints
curl http://localhost:3000/api/gnymble/customers
curl -X POST http://localhost:3000/api/gnymble/customers \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","first_name":"Test"}'
```

## VSCode Configuration

### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Next.js API",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "cwd": "${workspaceFolder}/apps/api",
      "runtimeArgs": ["--inspect"],
      "env": {
        "NODE_OPTIONS": "--inspect"
      }
    }
  ]
}
```

## Getting Help

### Resources

- **Architecture**: [Architecture Overview](../architecture/overview.md)
- **Brand Strategy**: [Brand Strategy](../architecture/brand-strategy.md)
- **Database**: [Database Design](../architecture/database-design.md)
- **Conventions**: [Code Conventions](./conventions.md)
- **Troubleshooting**: [Troubleshooting Guide](./troubleshooting.md)

### Team Support

- **Slack**: #engineering-help
- **Documentation**: Update this guide if you find missing steps
- **Issues**: Create GitHub issues for bugs or feature requests

---

## Quick Reference

```bash
# Most common commands
pnpm install          # Install dependencies
pnpm dev             # Start development servers
pnpm build           # Build all packages
pnpm lint            # Run linting
pnpm type-check      # Check TypeScript

# Turborepo commands
pnpm turbo dev       # Parallel development
pnpm turbo build     # Parallel builds
pnpm turbo clean     # Clear caches

# Package management
pnpm add <package> --filter=<app-name>
pnpm remove <package> --filter=<app-name>
```

**Next Steps**: After setup, read [Code Conventions](./conventions.md) for development standards.
