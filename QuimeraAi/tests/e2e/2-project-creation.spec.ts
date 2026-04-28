import { test, expect } from '@playwright/test';

test.describe('Creación de Proyecto', () => {

  test('debe permitir crear un nuevo proyecto vacío y abrir el editor', async ({ page }) => {
    // Definimos un timeout más largo para creación de proyectos
    test.setTimeout(45000);

    await page.goto('/dashboard');
    
    // Buscar el botón de crear proyecto (normalmente contiene "Nuevo", "New" o un icono Plus)
    const newProjectBtn = page.locator('button').filter({ hasText: /nuevo|new|crear|create/i }).first();
    
    // Si no está visible el botón de texto, buscar por data-testid o clase si existiera
    // Como fallback, daremos click al botón primario
    if (await newProjectBtn.isVisible()) {
      await newProjectBtn.click();
    } else {
      // Intentar encontrar un botón con clase bg-primary
      await page.locator('button[class*="bg-primary"]').first().click();
    }

    // Esperar a que aparezca el modal de selección de tipo (Template vs AI)
    // O si crea directamente, esperar redirección al editor
    // Buscamos cualquier diálogo
    const dialog = page.locator('[role="dialog"]');
    if (await dialog.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Seleccionar "Empezar desde cero" o "Blank"
        const blankOption = dialog.locator('button').filter({ hasText: /blanco|blank|cero/i }).first();
        if (await blankOption.isVisible()) {
            await blankOption.click();
        }
        
        // Escribir nombre si lo pide
        const nameInput = dialog.locator('input[type="text"]').first();
        if (await nameInput.isVisible()) {
            await nameInput.fill(`Test Project ${Date.now()}`);
            await dialog.locator('button[type="submit"], button:has-text("Crear")').first().click();
        }
    }

    // Esperar a que la URL cambie al editor (ej: /editor/id)
    await page.waitForURL(/.*\/editor\/.*/, { timeout: 15000 });

    // Verificar que el lienzo del editor esté visible
    const editorCanvas = page.locator('[id="editor-canvas"], [data-testid="editor-canvas"], main').first();
    await expect(editorCanvas).toBeVisible();
  });

});
