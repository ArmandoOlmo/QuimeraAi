import { expect, test, type Page } from '@playwright/test';

async function collectRuntimeIssues(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !/Sentry Logger|dsn|Error loading payment link/i.test(message.text())) {
      consoleErrors.push(message.text());
    }
  });

  return { pageErrors, consoleErrors };
}

test.describe('public Agency surfaces', () => {
  test('renders the Agency signup plan surface without authentication', async ({ page }) => {
    const issues = await collectRuntimeIssues(page);
    await page.setViewportSize({ width: 1440, height: 1000 });

    const response = await page.goto('/agency-signup');
    expect(response?.status()).toBe(200);

    await expect(page.getByText('Planes para Agencias')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Agency Starter')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Agency Pro')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Agency Scale')).toBeVisible({ timeout: 15000 });

    const planButtons = page.getByRole('button', { name: /Comenzar ahora|Procesando/i });
    await expect(planButtons.first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Application error|Unhandled Runtime Error/i);

    expect(issues.pageErrors).toEqual([]);
    expect(issues.consoleErrors).toEqual([]);
  });

  test('shows a controlled invalid-token state for public Agency checkout links', async ({ page }) => {
    const issues = await collectRuntimeIssues(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.goto('/pay/e2e-invalid-agency-token');
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { name: /Link no v[aá]lido/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('body')).toContainText(/no es v[aá]lido|ha expirado|No se pudo cargar/i);
    await expect(page.locator('body')).not.toContainText(/Application error|Unhandled Runtime Error/i);

    const hasHorizontalOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > window.innerWidth + 2
    ));
    expect(hasHorizontalOverflow).toBe(false);
    expect(issues.pageErrors).toEqual([]);
  });

  test('starts a valid Agency client subscription through the Vercel checkout boundary', async ({ page }) => {
    const issues = await collectRuntimeIssues(page);
    const token = 'e2e-valid-agency-token';
    let checkoutPayload: Record<string, unknown> | null = null;

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.route(`**/api/agency/payment-links/info?token=${token}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'pending',
          clientName: 'Acme Retail',
          planName: 'Growth Ops',
          monthlyPrice: 240,
          planFeatures: ['AI Studio', 'Client Portal', 'Monthly reports'],
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          agencyName: 'Quimera Agency',
          agencyLogoUrl: '',
          agencyPrimaryColor: '#2563eb',
          agencySecondaryColor: '#10b981',
          agencySupportEmail: 'support@agency.test',
        }),
      });
    });
    await page.route('**/api/agency/payment-links/start-checkout', async route => {
      checkoutPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          checkoutSessionId: 'cs_test_agency_e2e',
          url: 'https://checkout.stripe.com/c/pay/cs_test_agency_e2e',
        }),
      });
    });
    await page.route('https://checkout.stripe.com/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>Stripe Checkout</title><h1>Stripe checkout placeholder</h1>',
      });
    });

    const response = await page.goto(`/pay/${token}`);
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { name: 'Growth Ops' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Acme Retail')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Monthly reports')).toBeVisible({ timeout: 15000 });

    await Promise.all([
      page.waitForURL('https://checkout.stripe.com/c/pay/cs_test_agency_e2e'),
      page.getByRole('button', { name: /Continuar a Stripe por \$240\.00\/mes/i }).click(),
    ]);

    expect(checkoutPayload).toMatchObject({
      token,
      successUrl: `http://localhost:5173/pay/${token}?checkout=success`,
      cancelUrl: `http://localhost:5173/pay/${token}?checkout=cancelled`,
    });
    await expect(page.getByRole('heading', { name: 'Stripe checkout placeholder' })).toBeVisible({ timeout: 15000 });
    expect(issues.pageErrors).toEqual([]);
    expect(issues.consoleErrors).toEqual([]);
  });
});
