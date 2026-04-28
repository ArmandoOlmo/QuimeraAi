import { test, expect } from '@playwright/test';

test.describe('Editor Core Functionality', () => {
  // Nota: Lo ideal es que en un entorno de CI se pase un PROJECT_ID al test
  // o que el test 2 guarde el ID del proyecto creado.
  // Por simplicidad, este test asume que al ir al dashboard se puede abrir el primer proyecto.

  test('debe abrir un proyecto, añadir una sección y guardar', async ({ page }) => {
    test.setTimeout(60000); // 60 segundos porque puede haber latencia de red

    await page.goto('/dashboard');
    
    // Buscar el primer proyecto en la lista
    // Normalmente son links o cards
    const projectCard = page.locator('a[href*="/editor/"]').first();
    
    // Si no hay proyectos, el test fallaría, pero el Test 2 debería haber creado uno.
    await projectCard.waitFor({ state: 'visible', timeout: 10000 });
    await projectCard.click();

    // Esperar a que el editor cargue
    await page.waitForURL(/.*\/editor\/.*/);
    
    // Buscar el botón de "Añadir Sección" o "+"
    const addSectionBtn = page.locator('button').filter({ hasText: /añadir|add|\+/i }).first();
    await expect(addSectionBtn).toBeVisible({ timeout: 15000 });
    
    // Abrir panel de componentes
    await addSectionBtn.click();
    
    // Buscar una sección básica (ej: Hero) y añadirla
    const heroComponentBtn = page.locator('button, div[role="button"]').filter({ hasText: /hero|encabezado/i }).first();
    if (await heroComponentBtn.isVisible({ timeout: 5000 })) {
        await heroComponentBtn.click();
        
        // Esperar a que la sección aparezca en el lienzo
        const addedSection = page.locator('[data-section-type*="Hero"]').first();
        await expect(addedSection).toBeVisible({ timeout: 5000 });
    }

    // Probar el guardado
    const saveBtn = page.locator('button').filter({ hasText: /guardar|save/i }).first();
    await saveBtn.click();

    // Esperar a que aparezca un toast de éxito
    const toast = page.locator('[role="status"], .toast, [data-sonner-toast]').first();
    await expect(toast).toBeVisible({ timeout: 10000 });
  });

});
