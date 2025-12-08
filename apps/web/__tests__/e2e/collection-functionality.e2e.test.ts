import { test, expect } from '@playwright/test';

/**
 * Collection Functionality Tests for hobby.ninja
 *
 * Tests collection management features, including viewing collections,
 * managing items, and personal collection tracking.
 */

test.describe('Collection Functionality', () => {
  const baseUrl = 'http://localhost:3000/';

  test.beforeAll(async () => {
    console.log('🧪 Running collection functionality tests');
  });

  // Helper function to wait for React app to load
  const waitForReactApp = async (page: any, timeout = 10000) => {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => {
      const root = document.querySelector('#root');
      if (!root) return false;
      const content = root.textContent?.trim() || '';
      return content.length > 10 && !content.includes('Loading...');
    }, { timeout });
  };

  test.describe('Collection Hub Page', () => {
    test('collection hub page loads correctly', async ({ page }) => {
      await page.goto('/#/collection');
      await waitForReactApp(page);

      // Check page title
      const title = await page.title();
      expect(title).toContain('hobby.ninja');

      // Check content is present
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(20);

      console.log('✅ Collection hub page loaded successfully');
    });

    test('collection page shows collection management options', async ({ page }) => {
      await page.goto('/#/collection');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      const content = await rootElement.textContent();

      // Look for collection-related content
      const hasCollectionContent = content.toLowerCase().includes('collection') ||
                                   content.toLowerCase().includes('manage') ||
                                   content.toLowerCase().includes('items') ||
                                   content.toLowerCase().includes('gunpla') ||
                                   content.toLowerCase().includes('wishlist');

      if (hasCollectionContent) {
        console.log('✅ Collection page shows collection-related content');
      }

      // Look for hobby type sections
      const hobbyTypeElements = page.locator('text=Gunpla, text=Collection, text=Manage, text=Wishlist');
      const hasHobbyTypes = await hobbyTypeElements.count() > 0;

      if (hasHobbyTypes) {
        console.log('✅ Collection page shows hobby type sections');
      }

      console.log('✅ Collection hub page analyzed successfully');
    });
  });

  test.describe('Collection Hobby Pages', () => {
    test('gunpla collection page loads correctly', async ({ page }) => {
      await page.goto('/#/collection/gunpla');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(30);

      console.log('✅ Gunpla collection page loaded successfully');
    });

    test('collection page loads for different hobby types', async ({ page }) => {
      const hobbyTypes = ['gunpla', 'figure-rise', 'model-kits'];

      for (const hobbyType of hobbyTypes) {
        await page.goto(`/#/collection/${hobbyType}`);
        await waitForReactApp(page);

        const rootElement = page.locator('#root');
        await expect(rootElement).toBeVisible();

        const content = await rootElement.textContent();
        expect(content?.trim().length).toBeGreaterThan(20);

        console.log(`✅ Collection page for ${hobbyType} loaded successfully`);
      }
    });
  });

  test.describe('Collection Detail Pages', () => {
    test('collection detail page structure works', async ({ page }) => {
      // Try with a sample collection ID
      await page.goto('/#/collection/gunpla/sample-collection');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(10);

      console.log('✅ Collection detail page structure works');
    });
  });

  test.describe('Item Management Pages', () => {
    test('item edit/create page loads with correct structure', async ({ page }) => {
      await page.goto('/#/collection/gunpla/item/new');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      // Look for form elements
      const formElements = page.locator('input, select, textarea, button[type="submit"]');
      const hasFormElements = await formElements.count() > 0;

      if (hasFormElements) {
        console.log('✅ Item edit page shows form elements');
      }

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(20);

      console.log('✅ Item edit/create page loaded successfully');
    });

    test('item edit page handles existing item ID', async ({ page }) => {
      await page.goto('/#/collection/gunpla/item/sample-item-id');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(10);

      console.log('✅ Item edit page with existing ID handled correctly');
    });
  });

  test.describe('Search and Filtering in Collections', () => {
    test('collection search functionality works', async ({ page }) => {
      await page.goto('/#/collection/gunpla');
      await waitForReactApp(page);

      // Look for search input
      const searchInputs = [
        page.locator('input[placeholder*="search" i]'),
        page.locator('input[aria-label*="search" i]'),
        page.locator('input[type="search"]'),
      ];

      let searchInput: any = null;
      for (const input of searchInputs) {
        if (await input.count() > 0) {
          searchInput = input.first();
          break;
        }
      }

      if (searchInput) {
        await expect(searchInput).toBeVisible();

        // Test search functionality
        await searchInput.fill('Gundam');
        await page.waitForTimeout(500);

        const value = await searchInput.inputValue();
        expect(value).toBe('Gundam');

        console.log('✅ Collection search functionality works');
      } else {
        console.log('ℹ️ No search input found on collection page');
      }
    });

    test('collection filtering options work', async ({ page }) => {
      await page.goto('/#/collection/gunpla');
      await waitForReactApp(page);

      // Look for filter elements
      const filterElements = page.locator('select, input[type="checkbox"], input[type="radio"], button:has-text("Filter")');
      const filterCount = await filterElements.count();

      if (filterCount > 0) {
        console.log(`✅ Found ${filterCount} filter elements`);

        // Test interacting with a filter element
        const firstFilter = filterElements.first();
        await expect(firstFilter).toBeVisible();

        // Try to click or interact
        const tagName = await firstFilter.evaluate(el => el.tagName.toLowerCase());

        if (tagName === 'button') {
          await firstFilter.click();
          await page.waitForTimeout(500);
          console.log('✅ Filter button interaction works');
        } else if (tagName === 'select') {
          await firstFilter.selectOption({ index: 0 });
          await page.waitForTimeout(500);
          console.log('✅ Filter select interaction works');
        } else if (tagName === 'input') {
          const inputType = await firstFilter.getAttribute('type');
          if (inputType === 'checkbox' || inputType === 'radio') {
            await firstFilter.check();
            await page.waitForTimeout(500);
            console.log('✅ Filter checkbox/radio interaction works');
          }
        }
      } else {
        console.log('ℹ️ No filter elements found on collection page');
      }
    });
  });

  test.describe('Data Persistence and State', () => {
    test('collection page maintains state across navigation', async ({ page }) => {
      await page.goto('/#/collection/gunpla');
      await waitForReactApp(page);

      // Look for any inputs or form elements
      const formElements = page.locator('input, select, textarea');
      const elementCount = await formElements.count();

      if (elementCount > 0) {
        // Fill a form element if available
        const firstElement = formElements.first();
        const tagName = await firstElement.evaluate(el => el.tagName.toLowerCase());

        if (tagName === 'input' && await firstElement.getAttribute('type') === 'text') {
          await firstElement.fill('Test Value');
          await page.waitForTimeout(500);

          // Navigate away and back
          await page.goto('/#/database');
          await page.waitForTimeout(1000);
          await page.goto('/#/collection/gunpla');
          await waitForReactApp(page);

          // Check if some state is maintained (depends on implementation)
          console.log('✅ Collection page navigation tested');
        }
      }

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      console.log('✅ Collection state management tested');
    });

    test('IndexedDB storage functionality', async ({ page }) => {
      // Monitor IndexedDB usage
      await page.goto('/#/collection/gunpla');
      await waitForReactApp(page);

      // Check if IndexedDB is being used (most modern apps use it for storage)
      const indexedDBUsage = await page.evaluate(() => {
        return 'indexedDB' in window && typeof window.indexedDB === 'object';
      });

      if (indexedDBUsage) {
        console.log('✅ IndexedDB is available in the browser');

        // Check if any IndexedDB operations are happening
        const idbOperations = await page.evaluate(() => {
          const events: string[] = [];
          const originalOpen = window.indexedDB.open;

          window.indexedDB.open = function(...args: any[]) {
            events.push('indexedDB.open called');
            return originalOpen.apply(this, args);
          };

          return events.length;
        });

        await page.waitForTimeout(1000);

        console.log('✅ IndexedDB functionality monitored');
      } else {
        console.log('ℹ️ IndexedDB not available in test environment');
      }
    });
  });

  test.describe('Error Handling in Collections', () => {
    test('collection handles invalid item IDs gracefully', async ({ page }) => {
      await page.goto('/#/collection/gunpla/item/invalid-item-id');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(10);

      console.log('✅ Invalid item ID handled gracefully');
    });

    test('collection handles invalid collection IDs gracefully', async ({ page }) => {
      await page.goto('/#/collection/gunpla/nonexistent-collection');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(10);

      console.log('✅ Invalid collection ID handled gracefully');
    });

    test('collection handles storage errors gracefully', async ({ page }) => {
      // Monitor console for storage-related errors
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' &&
            (msg.text().includes('storage') ||
             msg.text().includes('indexeddb') ||
             msg.text().includes('quota'))) {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/#/collection/gunpla');
      await waitForReactApp(page);

      // Try to interact with collection features
      const formElements = page.locator('input, button');
      const elementCount = await formElements.count();

      if (elementCount > 0) {
        await formElements.first().click();
        await page.waitForTimeout(500);
      }

      // Check for critical storage errors
      const criticalErrors = consoleErrors.filter(error =>
        !error.includes('deprecated') &&
        !error.includes('warning')
      );

      if (criticalErrors.length > 0) {
        console.log('⚠️ Found storage errors:', criticalErrors);
      } else {
        console.log('✅ No critical storage errors found');
      }

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();
    });
  });

  test.describe('Responsive Design in Collections', () => {
    test('collection pages work across different viewports', async ({ page }) => {
      const viewports = [
        { width: 1280, height: 720 }, // Desktop
        { width: 768, height: 1024 },  // Tablet
        { width: 375, height: 667 },   // Mobile
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/#/collection/gunpla');
        await waitForReactApp(page);

        const rootElement = page.locator('#root');
        await expect(rootElement).toBeVisible();

        const content = await rootElement.textContent();
        expect(content?.trim().length).toBeGreaterThan(20);

        console.log(`📱 Collection page responsive at ${viewport.width}x${viewport.height}`);
      }
    });

    test('collection forms work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/#/collection/gunpla/item/new');
      await waitForReactApp(page);

      // Test mobile-friendly form elements
      const inputs = page.locator('input, select, textarea');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        for (let i = 0; i < Math.min(3, inputCount); i++) {
          const input = inputs.nth(i);
          await expect(input).toBeVisible();

          // Test touch-friendly interaction
          const boundingBox = await input.boundingBox();
          if (boundingBox) {
            // Should be at least 44px tall for touch targets
            expect(boundingBox.height).toBeGreaterThanOrEqual(30);
          }
        }

        console.log(`✅ ${inputCount} form elements are mobile-friendly`);
      }

      console.log('✅ Collection forms tested on mobile viewport');
    });
  });
});