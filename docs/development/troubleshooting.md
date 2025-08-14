# Troubleshooting Guide

## Common Issues and Solutions

This guide covers the most common issues encountered when developing with the PercyTech monorepo and their solutions.

## Installation & Setup Issues

### 1. pnpm Installation Problems

#### Issue: `pnpm command not found`
```bash
zsh: command not found: pnpm
```

**Solution:**
```bash
# Install pnpm globally
npm install -g pnpm@latest

# Or use corepack (Node.js 16.10+)
corepack enable
corepack prepare pnpm@latest --activate

# Verify installation
pnpm --version
```

#### Issue: `Package manager mismatch`
```
 WARN  The "workspaces" field in package.json is not supported by pnpm
```

**Solution:**
```bash
# Ensure pnpm-workspace.yaml exists
ls pnpm-workspace.yaml

# If missing, create it:
echo 'packages:
  - "apps/*"
  - "packages/*"' > pnpm-workspace.yaml

# Remove workspaces field from package.json if present
```

#### Issue: `Lockfile incompatible`
```
WARN Ignoring broken lockfile at /path/to/pnpm-lock.yaml
```

**Solution:**
```bash
# Delete lockfile and reinstall
rm pnpm-lock.yaml
rm -rf node_modules
pnpm install
```

### 2. Turborepo Issues

#### Issue: `turbo command not found`
```bash
turbo: command not found
```

**Solution:**
```bash
# Install turbo globally (optional)
pnpm add -g turbo

# Or use via pnpm
pnpm turbo --version

# Or use via npx
npx turbo --version
```

#### Issue: `No tasks were executed`
```
• Running build in 0 packages
No tasks were executed as part of this run.
```

**Solution:**
```bash
# Check if packages have build scripts
cat packages/shared-database/package.json | grep -A 5 '"scripts"'

# Verify turbo.json configuration
cat turbo.json

# Try force execution
pnpm turbo build --force
```

#### Issue: `Build caching problems`
```
• Packages in scope: 1
• Running build in 1 packages
• Remote caching disabled
```

**Solution:**
```bash
# Clear turbo cache
pnpm turbo clean

# Or clear specific cache
rm -rf .turbo

# Force rebuild without cache
pnpm turbo build --force
```

## TypeScript Issues

### 1. Type Errors

#### Issue: `Property 'brandId' does not exist`
```typescript
Property 'brandId' does not exist on type 'BrandContext'. 
Did you mean 'brand_id'?
```

**Solution:**
```typescript
// ❌ Wrong: Using camelCase
const brandId = context.brandId;

// ✅ Correct: Using snake_case
const brandId = context.brand_id;
```

#### Issue: `Cannot find module '@percytech/shared-database'`
```
Cannot find module '@percytech/shared-database' or its corresponding type declarations.
```

**Solution:**
```bash
# Check if package is built
ls packages/shared-database/dist/

# Build the package
cd packages/shared-database
pnpm build

# Or build all packages
cd ../..
pnpm turbo build

# Restart TypeScript server in VSCode
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

#### Issue: `The inferred type cannot be named`
```typescript
The inferred type of 'customers' cannot be named without a reference to 
'.pnpm/@supabase+postgrest-js@1.19.4/node_modules/@supabase/postgrest-js'
```

**Solution:**
```typescript
// ❌ Problem: Missing explicit return type
get customers() {
  return this.client.from('customers');
}

// ✅ Solution: Add explicit return type
get customers(): any {
  return this.client.from('customers');
}
```

### 2. Import/Export Issues

#### Issue: `Module not found` for relative imports
```
Module not found: Can't resolve '../types/customer'
```

**Solution:**
```bash
# Check file exists
ls packages/shared-database/src/types/customer.ts

# Verify export in index.ts
grep -n "customer" packages/shared-database/src/index.ts

# Use absolute imports when possible
import { Customer } from '@percytech/shared-database';
```

#### Issue: `Circular dependency detected`
```
Circular dependency detected: 
a.ts → b.ts → c.ts → a.ts
```

**Solution:**
```typescript
// ❌ Problem: Direct circular import
// customer.ts
import { BrandContext } from './brand';

// brand.ts  
import { Customer } from './customer';

// ✅ Solution: Extract shared types
// shared.ts
export type BrandId = 'gnymble' | 'percymd' | 'percytext';

// customer.ts
import { type BrandId } from './shared';

// brand.ts
import { type BrandId } from './shared';
```

## Database Issues

### 1. Supabase Connection

#### Issue: `Failed to fetch` or connection timeouts
```
Error: Failed to fetch customers: FetchError: request to ... failed
```

**Solution:**
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Test connection manually
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/customers?select=id&limit=1"

# Verify project is active in Supabase dashboard
```

#### Issue: `Row Level Security policy violation`
```
new row violates row-level security policy for table "customers"
```

**Solution:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'customers';

-- Verify current brand setting
SELECT current_setting('app.current_brand', true);

-- Set brand context before operations
SELECT set_config('app.current_brand', 'gnymble', false);
```

#### Issue: `Invalid brand_id enum value`
```
invalid input value for enum brand_id: "invalid-brand"
```

**Solution:**
```typescript
// ❌ Problem: Not validating brand ID
const brandId = request.params.brand;

// ✅ Solution: Use validation function
import { validateBrandId } from '@percytech/shared-database';
const brandId = validateBrandId(request.params.brand);
```

### 2. Database Schema Issues

#### Issue: `relation "customers" does not exist`
```
relation "customers" does not exist
```

**Solution:**
```bash
# Check if schema is applied
supabase db pull

# Apply schema from file
supabase db push

# Or apply manually
psql $DATABASE_URL -f packages/shared-database/src/schemas/tables.sql
```

#### Issue: `column "brand_id" does not exist`
```
column "brand_id" does not exist
```

**Solution:**
```sql
-- Check table structure
\d customers;

-- Add missing column
ALTER TABLE customers ADD COLUMN brand_id brand_id;

-- Update existing data
UPDATE customers SET brand_id = 'gnymble' WHERE brand_id IS NULL;

-- Make required
ALTER TABLE customers ALTER COLUMN brand_id SET NOT NULL;
```

## Brand Context Issues

### 1. Brand Detection

#### Issue: `Cannot determine brand from host`
```
Error: Cannot determine brand from host: localhost:3000
```

**Solution:**
```typescript
// For development, add brand parameter
http://localhost:3000?brand=gnymble

// Or set environment variable
NEXT_PUBLIC_FORCE_BRAND=gnymble pnpm dev

// Or update brand detection for localhost
export function getBrandFromRequest(request: Request): BrandId {
  const url = new URL(request.url);
  
  // Development fallback
  if (url.hostname === 'localhost') {
    const brand = url.searchParams.get('brand') || 
                  process.env.NEXT_PUBLIC_FORCE_BRAND;
    if (brand) return validateBrandId(brand);
  }
  
  // Production logic...
}
```

#### Issue: `Access denied to brand`
```
Access denied to brand 'percymd'
```

**Solution:**
```typescript
// Check user brand context
console.log('User context:', userContext);
console.log('Requested brand:', requestedBrand);

// For development, use admin context
const db = createDatabaseClient({
  brand_id: brandId,
  config: getBrandConfig(brandId),
  user_id: 'dev-user',
  is_admin: true  // Bypass brand restrictions
});
```

### 2. API Route Issues

#### Issue: `Brand parameter is undefined`
```
TypeError: Cannot read property 'brand' of undefined
```

**Solution:**
```typescript
// ❌ Problem: Incorrect destructuring
export async function GET(request, { params }) {
  const brand = params.brand; // undefined
}

// ✅ Solution: Proper typing and validation
export async function GET(
  request: NextRequest,
  { params }: { params: { brand: string } }
) {
  const brandId = validateBrandId(params.brand);
}
```

## Build & Development Issues

### 1. Hot Reload Problems

#### Issue: Changes not reflecting in browser
```
# File changes not triggering reload
```

**Solution:**
```bash
# Check if dev server is running
ps aux | grep "next dev"

# Restart dev servers
pnpm dev

# Clear browser cache
# Chrome: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Check file watchers (macOS)
sysctl kern.maxfiles
sysctl kern.maxfilesperproc

# Increase if needed
echo 'kern.maxfiles=65536\nkern.maxfilesperproc=25000' | sudo tee -a /etc/sysctl.conf
```

#### Issue: `EMFILE: too many open files`
```
Error: EMFILE: too many open files, watch '/path/to/file'
```

**Solution:**
```bash
# macOS: Increase file descriptor limit
ulimit -n 4096

# Add to ~/.zshrc or ~/.bashrc
echo 'ulimit -n 4096' >> ~/.zshrc

# Linux: Install inotify-tools
sudo apt-get install inotify-tools

# Check current limits
cat /proc/sys/fs/inotify/max_user_watches
```

### 2. Build Failures

#### Issue: `Module parse failed`
```
Module parse failed: Unexpected token
You may need an appropriate loader to handle this file type
```

**Solution:**
```bash
# Check TypeScript configuration
cat tsconfig.json

# Ensure proper file extensions
ls -la src/   # Should see .ts/.tsx files

# Build individual package first
cd packages/shared-database
pnpm build

# Check for syntax errors
pnpm type-check
```

#### Issue: `Cannot resolve dependency`
```
Module not found: Can't resolve '@percytech/shared-ui'
```

**Solution:**
```bash
# Check if dependency is declared
grep "@percytech/shared-ui" package.json

# Add dependency if missing
pnpm add @percytech/shared-ui --filter=your-app

# Build dependency first
pnpm --filter=@percytech/shared-ui build

# Or build all dependencies
pnpm turbo build
```

## Performance Issues

### 1. Slow Build Times

#### Issue: Full monorepo builds take too long
```
Tasks: 8 successful, 8 total
Time: 2m 45s
```

**Solution:**
```bash
# Use Turbo caching
pnpm turbo build  # Should say "cache hit" for unchanged packages

# Build only changed packages
pnpm turbo build --filter=...@main

# Parallel builds (already default)
pnpm turbo build --parallel

# Check cache efficiency
pnpm turbo build --summarize
```

#### Issue: `pnpm install` is slow
```
Progress: resolved 1000, reused 200, downloaded 800
```

**Solution:**
```bash
# Use store caching
pnpm config set store-dir ~/.pnpm-store

# Clean up old packages
pnpm store prune

# Use frozen lockfile in CI
pnpm install --frozen-lockfile

# Configure registry mirrors (if applicable)
pnpm config set registry https://registry.npmmirror.com/
```

### 2. Runtime Performance

#### Issue: Large bundle sizes
```
Warning: Bundle size exceeds recommended limit
```

**Solution:**
```bash
# Analyze bundle
npx @next/bundle-analyzer

# Check for duplicate dependencies
pnpm ls --depth=0

# Use dynamic imports
const CustomerList = dynamic(() => import('./CustomerList'));

# Tree shake unused exports
// Use named imports instead of default imports
```

## Testing Issues

### 1. Test Setup

#### Issue: `Jest configuration not found`
```
No tests found, exiting with code 1
```

**Solution:**
```bash
# Check Jest configuration
ls jest.config.js
cat jest.config.js

# Install Jest if missing
pnpm add -D jest @types/jest ts-jest

# Run tests with explicit config
pnpm jest --config=jest.config.js
```

#### Issue: `Cannot find module in tests`
```
Cannot find module '@percytech/shared-database' from 'test.ts'
```

**Solution:**
```javascript
// jest.config.js
module.exports = {
  moduleNameMapping: {
    '^@percytech/(.*)$': '<rootDir>/packages/$1/src'
  },
  // Build packages before testing
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
};
```

## Environment Issues

### 1. Environment Variables

#### Issue: `Environment variable not found`
```
Error: NEXT_PUBLIC_SUPABASE_URL is not defined
```

**Solution:**
```bash
# Check if .env.local exists
ls -la .env*

# Copy from example
cp .env.example .env.local

# Verify variables are loaded
echo $NEXT_PUBLIC_SUPABASE_URL

# For Next.js, variables must be prefixed with NEXT_PUBLIC_ for client-side
```

#### Issue: `Variables not loading in production`
```
Environment variables work locally but not in production
```

**Solution:**
```bash
# Vercel: Set in dashboard
# Settings → Environment Variables

# Check build logs for missing variables
vercel logs

# For sensitive variables, don't use NEXT_PUBLIC_ prefix
# Access only in server-side code (API routes, getServerSideProps)
```

## Debugging Tips

### 1. Logging and Debugging

```typescript
// Add debug logging to API routes
console.log('[DEBUG] Brand context:', { brandId, userContext });

// Log database queries
const { data, error } = await query;
console.log('[DB] Query result:', { data: data?.length, error });

// Use structured logging
import { logger } from './utils/logger';
logger.info('Customer created', { 
  customerId: customer.id, 
  brandId, 
  timestamp: new Date().toISOString() 
});
```

### 2. Browser DevTools

```javascript
// Debug API calls in browser console
fetch('/api/gnymble/customers')
  .then(r => r.json())
  .then(console.log);

// Check environment variables (client-side only)
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

// Inspect brand context
console.log('Current brand:', window.location.hostname);
```

### 3. Database Debugging

```sql
-- Check current connections
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Monitor slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'customers';
```

## Getting Help

### 1. Internal Resources

- **Documentation**: Check [docs/README.md](../README.md) for navigation
- **Architecture**: Review [Architecture Overview](../architecture/overview.md)
- **Conventions**: Follow [Code Conventions](./conventions.md)
- **Setup**: Verify [Setup Guide](./setup.md) steps

### 2. External Resources

- **Turborepo**: [turbo.build/repo/docs](https://turbo.build/repo/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Next.js**: [nextjs.org/docs](https://nextjs.org/docs)
- **pnpm**: [pnpm.io/motivation](https://pnpm.io/motivation)

### 3. Creating Issues

When creating GitHub issues, include:

```markdown
## Issue Description
Brief description of the problem

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: macOS/Windows/Linux
- Node.js: version
- pnpm: version
- Package: which package has the issue

## Error Messages
```
Paste error messages here
```

## Additional Context
Any other relevant information
```

---

**Remember**: When in doubt, check the [Setup Guide](./setup.md) and [Code Conventions](./conventions.md) first. Most issues stem from configuration or convention mismatches.
