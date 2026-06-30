import { describe, expect, it } from 'vitest';
import { shouldPreserveScopedAccessDeniedRoute } from '../../routes/accessGuards';

describe('shouldPreserveScopedAccessDeniedRoute', () => {
  it('preserves authenticated ecommerce subroutes so editor subviews do not bounce to dashboard', () => {
    expect(shouldPreserveScopedAccessDeniedRoute({
      path: '/ecommerce/storefront',
      isAuthenticated: true,
    })).toBe(true);
  });

  it('does not preserve the ecommerce overview route', () => {
    expect(shouldPreserveScopedAccessDeniedRoute({
      path: '/ecommerce',
      isAuthenticated: true,
    })).toBe(false);
  });

  it('does not preserve ecommerce subroutes for unauthenticated users', () => {
    expect(shouldPreserveScopedAccessDeniedRoute({
      path: '/ecommerce/storefront',
      isAuthenticated: false,
    })).toBe(false);
  });

  it('does not preserve unrelated private routes', () => {
    expect(shouldPreserveScopedAccessDeniedRoute({
      path: '/dashboard',
      isAuthenticated: true,
    })).toBe(false);
  });
});
