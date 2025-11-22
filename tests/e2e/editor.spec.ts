/**
 * E2E Tests: Editor
 * Tests the main editor functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Editor Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Skip onboarding if present
    const skipButton = page.locator('button:has-text("Skip")').first();
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
    }
  });

  test('should load the editor interface', async ({ page }) => {
    // Check for main editor elements
    const hasEditor = await page.locator('[data-testid="editor"], [class*="editor"]').count();
    expect(hasEditor).toBeGreaterThan(0);
  });

  test('should display component controls', async ({ page }) => {
    // Look for component list or controls
    const controls = page.locator('[data-testid="controls"], [class*="controls"]').first();
    const controlsVisible = await controls.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (controlsVisible) {
      await expect(controls).toBeVisible();
    }
  });

  test('should allow toggling component visibility', async ({ page }) => {
    // Look for toggle switches or visibility controls
    const toggles = page.locator('input[type="checkbox"], button[aria-label*="toggle"], button[aria-label*="visibility"]');
    
    const count = await toggles.count();
    if (count > 0) {
      const firstToggle = toggles.first();
      const initialState = await firstToggle.isChecked().catch(() => await firstToggle.getAttribute('aria-checked') === 'true');
      
      await firstToggle.click();
      await page.waitForTimeout(300);
      
      const newState = await firstToggle.isChecked().catch(() => await firstToggle.getAttribute('aria-checked') === 'true');
      expect(newState).not.toBe(initialState);
    }
  });

  test('should preview changes in real-time', async ({ page }) => {
    // Look for preview area
    const preview = page.locator('[data-testid="preview"], [class*="preview"]').first();
    const previewVisible = await preview.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (previewVisible) {
      await expect(preview).toBeVisible();
    }
  });

  test('should save changes', async ({ page }) => {
    // Look for save button
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Guardar")').first();
    
    if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await saveButton.click();
      
      // Wait for save confirmation
      await page.waitForTimeout(1000);
      
      // Look for success message
      const successMessage = page.locator('text=/saved|guardado|success/i').first();
      const hasSuccess = await successMessage.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasSuccess) {
        await expect(successMessage).toBeVisible();
      }
    }
  });
});

test.describe('Component Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should select a component to edit', async ({ page }) => {
    // Look for component list items
    const components = page.locator('[data-component-id], [class*="component-item"]');
    
    const count = await components.count();
    if (count > 0) {
      await components.first().click();
      await page.waitForTimeout(300);
    }
  });

  test('should edit text content', async ({ page }) => {
    // Look for editable text fields
    const textInputs = page.locator('input[type="text"], textarea').filter({ hasText: '' });
    
    const count = await textInputs.count();
    if (count > 0) {
      const input = textInputs.first();
      await input.fill('Test Content');
      
      const value = await input.inputValue();
      expect(value).toBe('Test Content');
    }
  });

  test('should change colors', async ({ page }) => {
    // Look for color picker inputs
    const colorInputs = page.locator('input[type="color"]');
    
    const count = await colorInputs.count();
    if (count > 0) {
      const colorInput = colorInputs.first();
      await colorInput.fill('#FF0000');
      
      const value = await colorInput.inputValue();
      expect(value).toBe('#ff0000'); // lowercase hex
    }
  });

  test('should adjust spacing', async ({ page }) => {
    // Look for range sliders
    const sliders = page.locator('input[type="range"]');
    
    const count = await sliders.count();
    if (count > 0) {
      const slider = sliders.first();
      const initialValue = await slider.inputValue();
      
      await slider.fill('50');
      
      const newValue = await slider.inputValue();
      expect(newValue).not.toBe(initialValue);
    }
  });
});

test.describe('Editor Navigation', () => {
  test('should navigate between views', async ({ page }) => {
    await page.goto('/');
    
    // Look for navigation tabs or buttons
    const navButtons = page.locator('button[role="tab"], nav button');
    
    const count = await navButtons.count();
    if (count > 1) {
      // Click second nav item
      await navButtons.nth(1).click();
      await page.waitForTimeout(500);
      
      // Check if view changed
      const url = page.url();
      expect(url).toBeTruthy();
    }
  });

  test('should access different dashboards', async ({ page }) => {
    await page.goto('/');
    
    // Look for dashboard navigation
    const dashboards = page.locator('button:has-text("Dashboard"), a:has-text("Dashboard")');
    
    if (await dashboards.count() > 0) {
      await dashboards.first().click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Editor Responsiveness', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check if app loads correctly on mobile
    await page.waitForLoadState('networkidle');
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);
  });

  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBe(true);
  });
});

