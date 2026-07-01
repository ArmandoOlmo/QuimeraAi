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

    await expect(page.getByText('Planes para Agencias')).toBeVisible();
    await expect(page.getByText('Agency Starter')).toBeVisible();
    await expect(page.getByText('Agency Pro')).toBeVisible();
    await expect(page.getByText('Agency Scale')).toBeVisible();

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
});
