import { expect, test, type Page } from '@playwright/test';

const PUBLIC_BIO_PAGE_BASE_URL = process.env.PUBLIC_BIO_PAGE_BASE_URL || '';
const BIO_DEMO_PATH = '/bio/demo?utm_source=qr&utm_medium=bio_page&utm_campaign=poster_launch';
const BIO_DEMO_URL = PUBLIC_BIO_PAGE_BASE_URL
  ? new URL(BIO_DEMO_PATH, PUBLIC_BIO_PAGE_BASE_URL).toString()
  : BIO_DEMO_PATH;
const NOT_FOUND_RE = /Bio Page no encontrada|Bio page not found|Pagina no encontrada|Página no encontrada/i;
const TAB_RE = /Enlaces|Tienda|Media|Reservar|Contacto|Links|Shop|Book|Contact/i;

async function expectPublicBioDemo(page: Page) {
  const consoleIssues: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', message => {
    if (['error', 'warning'].includes(message.type()) && !/Sentry Logger|dsn/i.test(message.text())) {
      consoleIssues.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', error => pageErrors.push(error.message));

  const response = await page.goto(BIO_DEMO_URL);
  expect(response?.status()).toBe(200);

  await expect(page.getByRole('heading', { name: /Quimera Creator Studio/i })).toBeVisible();
  await expect(page.locator('body')).toContainText(TAB_RE);
  await expect(page.locator('body')).not.toContainText(NOT_FOUND_RE);

  const interactiveCount = await page.locator('button, a, input, textarea, select').count();
  expect(interactiveCount).toBeGreaterThanOrEqual(8);

  await page.waitForTimeout(1500);
  expect(pageErrors).toEqual([]);
  expect(consoleIssues).toEqual([]);
}

test.describe('public Bio Page demo', () => {
  test('renders the public funnel on desktop without auth', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expectPublicBioDemo(page);
  });

  test('renders the public funnel on mobile without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expectPublicBioDemo(page);

    const hasHorizontalOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > window.innerWidth + 2
    ));
    expect(hasHorizontalOverflow).toBe(false);
  });
});
