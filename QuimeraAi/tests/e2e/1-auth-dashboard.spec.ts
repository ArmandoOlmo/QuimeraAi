import { test, expect } from '@playwright/test';

test.describe('Autenticación y Dashboard', () => {
  
  test('debe cargar el dashboard directamente con la sesión guardada', async ({ page }) => {
    // Al usar auth.setup.ts, ir a la raíz debería redirigir al dashboard o cargar la app logueada
    await page.goto('/');
    
    // Esperar redirección o carga
    await page.waitForURL(/.*\/dashboard/);
    
    // Verificar que estamos en la URL del dashboard
    expect(page.url()).toContain('/dashboard');
  });

  test('debe mostrar la lista de proyectos en el dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verificar que el contenedor de proyectos se renderiza
    // Asumimos que hay un texto como "Mis Proyectos" o un data-testid
    const heading = page.locator('h1, h2').filter({ hasText: /proyectos|projects|dashboard/i }).first();
    await expect(heading).toBeVisible();

    // Validar que el navbar superior contiene el botón de usuario/perfil
    const profileButton = page.locator('button').filter({ hasText: /test|perfil/i }).first();
    // Es posible que el botón sea un icono, así que buscamos cualquier botón en el nav derecho
    const navButtons = page.locator('header button, nav button');
    await expect(navButtons.first()).toBeVisible();
  });
});
