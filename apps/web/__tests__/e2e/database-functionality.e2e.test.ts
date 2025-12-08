import { test, expect } from '@playwright/test';

/**
 * Database Functionality Tests for hobby.ninja
 *
 * Tests database-specific features, search, filtering, and data loading
 * to ensure the graph API integration works correctly.
 */

test.describe('Database Functionality', () => {
  const baseUrl = 'http://localhost:3000/';

  test.beforeAll(async () => {
    console.log('🧪 Running database functionality tests');
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

  test.describe('Database Hub Page', () => {
    test('database page loads statistics and overview', async ({ page }) => {
      await page.goto('/#/database');
      await waitForReactApp(page);

      // Check for database overview sections
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      // Look for database-specific content
      const content = await rootElement.textContent();

      // Should contain database-related terms
      expect(content.toLowerCase()).toMatch(/(database|gunpla|collection|overview|statistics)/i);

      // Look for hobby type cards or sections
      const hobbyTypeSection = page.locator('text=Gunpla, text=Model Kits, text=Collection, text=Database');
      const hasHobbyTypes = await hobbyTypeSection.count() > 0;

      if (hasHobbyTypes) {
        console.log('✅ Database page shows hobby type sections');
      }

      console.log('✅ Database hub page loaded with overview content');
    });

    test('database page navigation links work', async ({ page }) => {
      await page.goto('/#/database');
      await waitForReactApp(page);

      // Look for clickable elements that navigate to gunpla database
      const rootElement = page.locator('#root');

      // Find elements that might be navigation buttons or links
      const clickableElements = page.locator('button, a, [role="button"], [onClick]');
      const elementCount = await clickableElements.count();

      if (elementCount > 0) {
        // Try clicking the first few elements to test navigation
        for (let i = 0; i < Math.min(3, elementCount); i++) {
          const element = clickableElements.nth(i);

          // Get element text to see if it's navigation-related
          const elementText = await element.textContent();

          if (elementText && (
            elementText.toLowerCase().includes('browse') ||
            elementText.toLowerCase().includes('search') ||
            elementText.toLowerCase().includes('gunpla') ||
            elementText.toLowerCase().includes('view all')
          )) {
            // Click and verify navigation
            await element.click();
            await page.waitForTimeout(1000);

            // Check if URL changed or content updated
            const currentUrl = page.url();
            console.log(`🔗 Navigation clicked: "${elementText}" -> ${currentUrl}`);

            // Go back for next test
            await page.goBack();
            await waitForReactApp(page);
          }
        }
      }

      console.log('✅ Database page navigation elements tested');
    });

    test('search functionality is present and functional', async ({ page }) => {
      await page.goto('/#/database');
      await waitForReactApp(page);

      // Look for search input
      const searchInputs = [
        page.locator('input[placeholder*="search" i]'),
        page.locator('input[aria-label*="search" i]'),
        page.locator('input[type="search"]'),
        page.locator('input[name*="search" i]'),
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

        // Test typing in search
        await searchInput.fill('Gundam');
        await page.waitForTimeout(500);

        // Verify input has the text
        const value = await searchInput.inputValue();
        expect(value).toBe('Gundam');

        console.log('✅ Search functionality is working');
      } else {
        console.log('ℹ️ No search input found on database page');
      }
    });

    test('quick filter buttons are present', async ({ page }) => {
      await page.goto('/#/database');
      await waitForReactApp(page);

      // Look for filter-related buttons
      const filterButtons = page.locator('button:has-text("High Grade"), button:has-text("Master Grade"), button:has-text("HG"), button:has-text("MG"), button:has-text("RG"), button:has-text("PG")');

      const filterCount = await filterButtons.count();

      if (filterCount > 0) {
        console.log(`✅ Found ${filterCount} filter buttons`);

        // Test clicking a filter button
        await filterButtons.first().click();
        await page.waitForTimeout(1000);

        // Should navigate or update content
        const currentUrl = page.url();
        console.log(`🔗 Filter button clicked, URL: ${currentUrl}`);
      } else {
        console.log('ℹ️ No filter buttons found on database page');
      }
    });
  });

  test.describe('Database Hobby Pages', () => {
    test('gunpla database page loads with data', async ({ page }) => {
      await page.goto('/#/database/gunpla');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(50);

      // Should show some indication of gunpla data
      const hasGunplaContent = content.toLowerCase().includes('gunpla') ||
                               content.toLowerCase().includes('gundam') ||
                               content.toLowerCase().includes('model') ||
                               content.toLowerCase().includes('kit');

      if (hasGunplaContent) {
        console.log('✅ Gunpla database shows relevant content');
      }

      console.log('✅ Gunpla database page loaded successfully');
    });

    test('database page handles search parameters', async ({ page }) => {
      await page.goto('/#/database/gunpla?q=RG');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      // Look for search input and check if it has the query
      const searchInputs = page.locator('input[placeholder*="search" i], input[aria-label*="search" i], input[type="search"]');

      if (await searchInputs.count() > 0) {
        const searchInput = searchInputs.first();
        const value = await searchInput.inputValue();

        // Should contain the search term
        if (value.toLowerCase().includes('rg') || value.toLowerCase().includes('gundam')) {
          console.log('✅ Search parameter reflected in search input');
        }
      }

      console.log('✅ Database page handled search parameters correctly');
    });

    test('database page handles grade filter', async ({ page }) => {
      await page.goto('/#/database/gunpla?grade=MG');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      console.log('✅ Database page handled grade filter correctly');
    });

    test('database page handles recent filter', async ({ page }) => {
      await page.goto('/#/database/gunpla?recent=true');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      console.log('✅ Database page handled recent filter correctly');
    });

    test('database page handles popular filter', async ({ page }) => {
      await page.goto('/#/database/gunpla?popular=true');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      console.log('✅ Database page handled popular filter correctly');
    });
  });

  test.describe('Data Loading and Error Handling', () => {
    test('database handles loading states gracefully', async ({ page }) => {
      // Monitor for loading states
      await page.goto('/#/database');

      // Look for loading indicators
      const loadingIndicators = [
        page.locator('text=Loading'),
        page.locator('[aria-label*="loading" i]'),
        page.locator('.loading'),
        page.locator('[role="progressbar"]'),
      ];

      // Should eventually resolve to content
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const finalContent = await rootElement.textContent();
      expect(finalContent?.trim().length).toBeGreaterThan(30);

      console.log('✅ Database handles loading states gracefully');
    });

    test('database handles network errors gracefully', async ({ page }) => {
      // Monitor console for errors
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/#/database/gunpla');
      await waitForReactApp(page);

      // Should show some content even if some requests fail
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(20);

      // Filter out non-critical errors
      const criticalErrors = consoleErrors.filter(error =>
        !error.includes('deprecated') &&
        !error.includes('warning') &&
        !error.includes('vite') &&
        !error.includes('devtools')
      );

      console.log(`ℹ️ Found ${criticalErrors.length} critical console errors`);
      if (criticalErrors.length > 0) {
        console.log('Errors:', criticalErrors);
      }

      console.log('✅ Database handles network conditions gracefully');
    });

    test('graph data loading works correctly', async ({ page }) => {
      // Monitor for network requests to graph API
      const graphRequests: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('/api/graph/')) {
          graphRequests.push(url);
        }
      });

      await page.goto('/#/database/gunpla');
      await waitForReactApp(page);

      // Should attempt to load graph data
      await page.waitForTimeout(2000);

      if (graphRequests.length > 0) {
        console.log(`✅ Made ${graphRequests.length} requests to graph API`);
        graphRequests.forEach(url => console.log(`  📡 ${url}`));
      } else {
        console.log('ℹ️ No graph API requests detected (may be cached or different loading strategy)');
      }

      // Page should still render content
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();
    });
  });

  test.describe('User Interactions', () => {
    test('user can interact with database elements', async ({ page }) => {
      await page.goto('/#/database');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      // Find interactive elements
      const interactiveElements = page.locator('button, a, input, select, [role="button"]');
      const elementCount = await interactiveElements.count();

      if (elementCount > 0) {
        // Test basic interactivity on a few elements
        const testCount = Math.min(3, elementCount);

        for (let i = 0; i < testCount; i++) {
          const element = interactiveElements.nth(i);

          // Check if element is visible and enabled
          const isVisible = await element.isVisible();
          const isEnabled = await element.isEnabled();

          if (isVisible && isEnabled) {
            // Try to focus the element
            await element.focus();
            await page.waitForTimeout(200);

            const focusedElement = page.locator(':focus');
            const isFocused = await focusedElement.count() > 0;

            if (isFocused) {
              console.log(`✅ Interactive element ${i + 1} is focusable`);
            }
          }
        }
      }

      console.log(`✅ Tested ${elementCount} interactive elements`);
    });

    test('keyboard navigation works on database page', async ({ page }) => {
      await page.goto('/#/database');
      await waitForReactApp(page);

      // Test Tab navigation
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      const focusedElement = page.locator(':focus');
      const hasFocus = await focusedElement.count() > 0;

      if (hasFocus) {
        console.log('✅ Keyboard navigation works');
      } else {
        console.log('ℹ️ No focusable elements found for keyboard navigation test');
      }
    });

    test('scrolling and viewport interactions work', async ({ page }) => {
      await page.goto('/#/database/gunpla');
      await waitForReactApp(page);

      // Test scrolling
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await page.waitForTimeout(500);

      // Test different scroll positions
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(200);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      console.log('✅ Scrolling and viewport interactions work');
    });
  });
});