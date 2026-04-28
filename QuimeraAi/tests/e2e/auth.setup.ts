import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  console.log('Iniciando proceso de autenticación global...');
  
  // Variables de prueba
  const testEmail = process.env.TEST_EMAIL || 'test@quimera.ai';
  const testPassword = process.env.TEST_PASSWORD || 'QuimeraTest2026!';
  const testName = 'Test User Playwright';

  // Ir a la página de login
  await page.goto('/login');
  
  // Llenar datos de login
  await page.locator('input[type="email"]').first().fill(testEmail);
  await page.locator('input[type="password"]').first().fill(testPassword);
  
  // Click en el botón de submit (iniciar sesión)
  await page.locator('button[type="submit"]').click();

  // Esperar a ver si se redirige
  await page.waitForTimeout(3500);

  const currentUrl = page.url();
  
  // Si seguimos en login, significa que la cuenta no existe o credenciales inválidas
  if (currentUrl.includes('/login')) {
    console.log('Login falló (posiblemente usuario no existe). Intentando crear la cuenta...');
    
    // Cambiar a modo registro (click en "¿No tienes cuenta? Crear cuenta")
    await page.getByText(/regístrate|sign up|crear cuenta|create account/i).click();
    await page.waitForTimeout(500);
    
    // Llenar formulario de registro
    await page.locator('input[type="text"]').first().fill(testName);
    await page.locator('input[type="email"]').first().fill(testEmail);
    const passLocators = page.locator('input[type="password"]');
    await passLocators.nth(0).fill(testPassword);
    await passLocators.nth(1).fill(testPassword);
    
    // Click en crear cuenta
    await page.locator('button[type="submit"]').click();
    
    // Esperar que redirija al dashboard
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });
    console.log('Cuenta de prueba creada exitosamente.');
  } else {
    console.log('Login exitoso con cuenta existente.');
  }

  // Verificar que estamos en el dashboard
  await expect(page).toHaveURL(/.*\/dashboard/);

  // Guardar el estado de autenticación (cookies, localStorage, etc.)
  await page.context().storageState({ path: authFile });
  console.log('Estado de autenticación guardado en:', authFile);
});
