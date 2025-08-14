import { z } from 'zod';

// Brand enum and types
export const BrandId = z.enum(['gnymble', 'percymd', 'percytext']);
export type BrandId = z.infer<typeof BrandId>;

// Brand configuration interface
export interface BrandConfig {
  id: BrandId;
  name: string;
  domain: string;
  platform_domain: string;
  primary_color: string;
  logo_url: string;
  support_email: string;
  is_active: boolean;
}

// Brand context for API requests
export interface BrandContext {
  brand_id: BrandId;
  config: BrandConfig;
  user_id?: string;
  is_admin?: boolean;
}

// Default brand configurations
export const BRAND_CONFIGS: Record<BrandId, BrandConfig> = {
  gnymble: {
    id: 'gnymble',
    name: 'Gnymble',
    domain: 'gnymble.com',
    platform_domain: 'app.gnymble.com',
    primary_color: '#4F46E5',
    logo_url: '/brands/gnymble/logo.svg',
    support_email: 'support@gnymble.com',
    is_active: true,
  },
  percymd: {
    id: 'percymd',
    name: 'PercyMD',
    domain: 'percymd.com',
    platform_domain: 'app.percymd.com',
    primary_color: '#059669',
    logo_url: '/brands/percymd/logo.svg',
    support_email: 'support@percymd.com',
    is_active: true,
  },
  percytext: {
    id: 'percytext',
    name: 'PercyText',
    domain: 'percytext.com',
    platform_domain: 'app.percytext.com',
    primary_color: '#DC2626',
    logo_url: '/brands/percytext/logo.svg',
    support_email: 'support@percytext.com',
    is_active: true,
  },
};

// Helper to get brand config
export function getBrandConfig(brand_id: BrandId): BrandConfig {
  return BRAND_CONFIGS[brand_id];
}

// Helper to validate brand ID from string
export function validateBrandId(input: string): BrandId | null {
  const result = BrandId.safeParse(input);
  return result.success ? result.data : null;
}
