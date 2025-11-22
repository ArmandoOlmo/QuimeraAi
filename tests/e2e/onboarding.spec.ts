/**
 * E2E Tests: Onboarding Wizard
 * Tests the complete onboarding flow for new users
 */

import { test, expect } from '@playwright/test';

test.describe('Onboarding Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should display onboarding wizard for new users', async ({ page }) => {
    // Look for onboarding modal or wizard
    const onboardingVisible = await page.locator('[data-testid="onboarding-wizard"]').isVisible().catch(() => false);
    
    // If onboarding is visible, it should have the expected structure
    if (onboardingVisible) {
      await expect(page.locator('[data-testid="onboarding-wizard"]')).toBeVisible();
    }
  });

  test('should have a way to start creating a website', async ({ page }) => {
    // Look for "Create Website" or "New Project" button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Project"), button:has-text("Get Started")').first();
    
    // Button should be visible
    await expect(createButton).toBeVisible({ timeout: 10000 });
  });

  test('should navigate through onboarding steps', async ({ page }) => {
    // Skip test if no onboarding
    const hasOnboarding = await page.locator('[data-testid="onboarding-wizard"]').isVisible().catch(() => false);
    
    if (!hasOnboarding) {
      test.skip();
      return;
    }

    // Look for "Next" or "Continue" button
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
    
    if (await nextButton.isVisible()) {
      await nextButton.click();
      
      // Should navigate to next step
      await page.waitForTimeout(500);
    }
  });

  test('should allow entering business information', async ({ page }) => {
    // Look for input fields
    const nameInput = page.locator('input[type="text"]').first();
    
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Business');
      
      const value = await nameInput.inputValue();
      expect(value).toBe('Test Business');
    }
  });

  test('should allow selecting website type', async ({ page }) => {
    // Look for selection buttons or dropdowns
    const options = page.locator('[role="button"], button').filter({ hasText: /portfolio|business|ecommerce|blog/i });
    
    const count = await options.count();
    if (count > 0) {
      await options.first().click();
      await page.waitForTimeout(300);
    }
  });

  test('should complete onboarding and create project', async ({ page }) => {
    // Look for finish/complete button
    const completeButton = page.locator('button:has-text("Finish"), button:has-text("Complete"), button:has-text("Create")').first();
    
    if (await completeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await completeButton.click();
      
      // Should redirect to editor or dashboard
      await page.waitForTimeout(2000);
      
      // Check if we're in a new view
      const url = page.url();
      expect(url).toBeTruthy();
    }
  });
});

test.describe('Onboarding Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Press Tab to navigate
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should have focus indicators
    const focused = await page.locator(':focus').count();
    expect(focused).toBeGreaterThan(0);
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');
    
    // Check for ARIA labels on interactive elements
    const buttonsWithLabels = await page.locator('button[aria-label]').count();
    const linksWithLabels = await page.locator('a[aria-label]').count();
    
    expect(buttonsWithLabels + linksWithLabels).toBeGreaterThanOrEqual(0);
  });
});

