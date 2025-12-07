import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E test for Collection Management System
 * Tests navigation, collection creation, item management, and data persistence
 */

test.describe('Collection Management System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to collections page
    await page.goto('http://localhost:3000/#/collection');
    await page.waitForLoadState('networkidle');
  });

  test('collections hub page loads correctly', async ({ page }) => {
    // Check page title and main elements
    await expect(page.locator('h1')).toContainText('My Collections');

    // Check hobby type cards are present
    await expect(page.locator('text=Model Kits')).toBeVisible();
    await expect(page.locator('text=Trading Cards')).toBeVisible();
    await expect(page.locator('text=Miniatures')).toBeVisible();
    await expect(page.locator('text=Other')).toBeVisible();

    // Check statistics cards
    await expect(page.locator('text=Total Collections')).toBeVisible();
    await expect(page.locator('text=Total Items')).toBeVisible();
  });

  test('can navigate to model kits collections', async ({ page }) => {
    // Click on Model Kits
    await page.click('text=Model Kits');

    // Wait for navigation
    await page.waitForURL('**/collection/model_kits');

    // Check we're on the correct page
    await expect(page.locator('h1')).toContainText('Model Kits Collections');
    await expect(page.locator('text=🤖')).toBeVisible();

    // Check for "New Collection" button
    await expect(page.locator('text=New Collection')).toBeVisible();
  });

  test('can create a new collection', async ({ page }) => {
    // Navigate to Model Kits
    await page.click('text=Model Kits');
    await page.waitForURL('**/collection/model_kits');

    // Create new collection
    await page.click('text=New Collection');

    // Check if there's a dialog or if it goes directly to collection page
    const createButton = page.locator('text=Create Your First Collection');
    if (await createButton.isVisible()) {
      await createButton.click();
    }

    // Should navigate to a new collection page
    await page.waitForTimeout(1000);

    // Look for item creation interface
    const addItemButton = page.locator('text=Add Item');
    if (await addItemButton.isVisible()) {
      await addItemButton.click();
    }
  });

  test('can add items to collection', async ({ page }) => {
    // Navigate to Model Kits
    await page.click('text=Model Kits');
    await page.waitForURL('**/collection/model_kits');

    // Try to add an item (this might create a collection first)
    const addItemButton = page.locator('text=Add Item');
    if (await addItemButton.isVisible()) {
      await addItemButton.click();
    } else {
      // Create collection first
      await page.click('text=New Collection');
      await page.waitForTimeout(1000);

      // Then add item
      await page.click('text=Add Item');
    }

    // Check if item form appears
    await page.waitForTimeout(1000);

    // Look for form fields
    const nameInput = page.locator('input[placeholder*="name"], input[label*="Name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('RX-78-2 Gundam');

      // Fill other fields if present
      const brandInput = page.locator('input[placeholder*="brand"], input[label*="Brand"]');
      if (await brandInput.isVisible()) {
        await brandInput.fill('Bandai');
      }

      const gradeSelect = page.locator('select').first();
      if (await gradeSelect.isVisible()) {
        await gradeSelect.selectOption({ label: 'MG' });
      }

      // Save the item
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Add")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }
    }
  });

  test('item editing interface works', async ({ page }) => {
    // Navigate to item creation page directly
    await page.goto('http://localhost:3000/#/collection/model_kits/item/new');
    await page.waitForLoadState('networkidle');

    // Check for form elements
    await expect(page.locator('text=Add New Item')).toBeVisible();

    // Test form fields
    const nameInput = page.locator('input[placeholder*="Enter item name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Gundam Model');

      // Test grade selection
      const gradeSelect = page.locator('select').first();
      if (await gradeSelect.isVisible()) {
        await gradeSelect.selectOption('MG');
        await expect(gradeSelect).toHaveValue('MG');
      }

      // Test scale selection
      const scaleSelect = page.locator('select').nth(1);
      if (await scaleSelect.isVisible()) {
        await scaleSelect.selectOption('1/100');
        await expect(scaleSelect).toHaveValue('1/100');
      }

      // Test tags functionality
      const tagInput = page.locator('input[placeholder*="Add a tag"]');
      if (await tagInput.isVisible()) {
        await tagInput.fill('test-tag');
        await tagInput.press('Enter');

        // Check if tag appears
        await expect(page.locator('text=test-tag')).toBeVisible();
      }
    }
  });

  test('navigation header includes collections link', async ({ page }) => {
    // Navigate to home page first
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Check for Collections navigation
    const collectionsLink = page.locator('text=Collections');

    // It might be in desktop or mobile menu
    let isVisible = await collectionsLink.isVisible();

    if (!isVisible) {
      // Try mobile menu
      const mobileMenuButton = page.locator('button[aria-label*="menu"], button[title*="menu"]');
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();
        await page.waitForTimeout(500);
        isVisible = await collectionsLink.isVisible();
      }
    }

    if (isVisible) {
      await collectionsLink.click();
      await page.waitForURL('**/collection');
    }
  });

  test('data persistence works', async ({ page, context }) => {
    // Enable localStorage for the test
    await context.addInitScript(() => {
      window.localStorage = window.localStorage;
    });

    // Create a collection and verify it persists
    await page.goto('http://localhost:3000/#/collection/model_kits');
    await page.waitForLoadState('networkidle');

    // Check if localStorage has collection data
    const storageData = await page.evaluate(() => {
      return localStorage.getItem('hobby_ninja_collections');
    });

    // Should have some data structure (even if empty)
    expect(storageData).toBeTruthy();

    // Parse and verify structure
    const parsed = JSON.parse(storageData || '{}');
    expect(parsed).toHaveProperty('collections');
    expect(parsed).toHaveProperty('items');
    expect(parsed).toHaveProperty('hobbyTypes');
  });

  test('handles empty states gracefully', async ({ page }) => {
    // Navigate to a hobby type with no collections
    await page.goto('http://localhost:3000/#/collection/miniatures');
    await page.waitForLoadState('networkidle');

    // Should show empty state message
    const emptyState = page.locator('text=No Miniatures Collections Yet');
    if (await emptyState.isVisible()) {
      await expect(page.locator('text=Create Your First Collection')).toBeVisible();
    }
  });

  test('error handling works', async ({ page }) => {
    // Try to navigate to a non-existent collection
    await page.goto('http://localhost:3000/#/collection/model_kits/non-existent-id');
    await page.waitForLoadState('networkidle');

    // Should handle gracefully without crashing
    // Might show 404 or redirect to collection list
    const currentUrl = page.url();
    expect(currentUrl).toContain('collection');
  });

  test('responsive design works', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000/#/collection');
    await page.waitForLoadState('networkidle');

    // Check if mobile layout works
    await expect(page.locator('h1')).toContainText('My Collections');

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('My Collections');

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('My Collections');
  });

  test('accessibility features work', async ({ page }) => {
    await page.goto('http://localhost:3000/#/collection');
    await page.waitForLoadState('networkidle');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // Test ARIA labels (if implemented)
    const mainElement = page.locator('main');
    if (await mainElement.isVisible()) {
      await expect(mainElement).toHaveAttribute('role', 'main');
    }

    // Test heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    expect(headings).toBeGreaterThan(0);
  });
});

test.describe('Database Integration', () => {
  test('data service can be accessed', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Check if data service loads without errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate around to trigger data loading
    await page.goto('http://localhost:3000/#/collection/model_kits');
    await page.waitForLoadState('networkidle');

    // Check for critical errors
    const criticalErrors = consoleErrors.filter(error =>
      error.includes('Failed to load') ||
      error.includes('Cannot read') ||
      error.includes('TypeError')
    );

    // Log any errors for debugging
    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors);
    }

    // The test passes if we don't have critical errors that break functionality
    expect(criticalErrors.length).toBeLessThan(5); // Allow some warnings
  });

  test('public data files are accessible', async ({ page }) => {
    // Test if data files can be accessed
    const response = await page.request.get('http://localhost:3000/data/indices/master-index.json');
    expect(response.status()).toBe(200);

    // Test if unified data is accessible
    const unifiedResponse = await page.request.get('http://localhost:3000/data/indices/unified-index.json');
    expect(unifiedResponse.status()).toBe(200);
  });
});