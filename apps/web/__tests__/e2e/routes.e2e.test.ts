import { test, expect } from '@playwright/test';

/**
 * Comprehensive Route Testing for hobby.ninja
 *
 * Tests all available routes and navigation functionality to ensure
 * the application works correctly after the SSG cleanup and graph migration.
 */

test.describe('Application Routes and Navigation', () => {
  const baseUrl = 'http://localhost:3000/';

  test.beforeAll(async () => {
    console.log('🧪 Running comprehensive route tests');
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

  test.describe('Core Routes', () => {
    test('home page loads and renders correctly', async ({ page }) => {
      await page.goto('http://localhost:3000/');
      await waitForReactApp(page);

      // Check page title
      const title = await page.title();
      expect(title).toContain('hobby.ninja');

      // Check content is present
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(50);

      console.log('✅ Home page loaded successfully');
    });

    test('about page loads and renders correctly', async ({ page }) => {
      await page.goto('/#/about');
      await waitForReactApp(page);

      // Check page title
      const title = await page.title();
      expect(title).toContain('hobby.ninja');

      // Check content is present
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(20);

      console.log('✅ About page loaded successfully');
    });

    test('database page loads with correct structure', async ({ page }) => {
      await page.goto('/#/database');
      await waitForReactApp(page);

      // Check page title
      const title = await page.title();
      expect(title).toContain('hobby.ninja');

      // Check for database-specific content
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      // Look for database-related content
      const content = await rootElement.textContent();
      expect(content).toMatch(/(database|Database|Gunpla|Collection|Search)/i);

      console.log('✅ Database page loaded successfully');
    });

    test('collection page loads and renders correctly', async ({ page }) => {
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

      console.log('✅ Collection page loaded successfully');
    });

    test('search page loads and renders correctly', async ({ page }) => {
      await page.goto('/#/search');
      await waitForReactApp(page);

      // Check page title
      const title = await page.title();
      expect(title).toContain('hobby.ninja');

      // Check for search functionality
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      // Look for search-related elements
      const searchInput = page.locator('input[placeholder*="Search"], input[aria-label*="search"], input[type="search"]');
      const hasSearchInput = await searchInput.count() > 0;

      if (hasSearchInput) {
        await expect(searchInput.first()).toBeVisible();
      }

      console.log('✅ Search page loaded successfully');
    });
  });

  test.describe('Database Hobby Routes', () => {
    test('gunpla database page loads correctly', async ({ page }) => {
      await page.goto('/#/database/gunpla');
      await waitForReactApp(page);

      // Check page title
      const title = await page.title();
      expect(title).toContain('hobby.ninja');

      // Check content is present
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(30);

      console.log('✅ Gunpla database page loaded successfully');
    });

    test('database page with search parameters', async ({ page }) => {
      await page.goto('/#/database/gunpla?q=RG&grade=RG');
      await waitForReactApp(page);

      // Should load successfully with parameters
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      console.log('✅ Database page with search params loaded successfully');
    });

    test('database page with recent filter', async ({ page }) => {
      await page.goto('/#/database/gunpla?recent=true');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      console.log('✅ Database page with recent filter loaded successfully');
    });

    test('database page with popular filter', async ({ page }) => {
      await page.goto('/#/database/gunpla?popular=true');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      console.log('✅ Database page with popular filter loaded successfully');
    });
  });

  test.describe('Graph Node Routes', () => {
    // Test some sample graph nodes to ensure the graph API integration works
    test('item graph node page loads', async ({ page }) => {
      await page.goto('/#/item/01_1000');

      // Wait a bit longer for graph data loading
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Check page loads (might show 404 if node doesn't exist, but shouldn't crash)
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      // Check for either content or error page
      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(10);

      console.log('✅ Graph node item/01_1000 loaded successfully');
    });

    test('brand graph node page loads', async ({ page }) => {
      await page.goto('/#/brand/bandai');

      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(10);

      console.log('✅ Graph node brand/bandai loaded successfully');
    });

    test('category graph node page loads', async ({ page }) => {
      await page.goto('/#/category/gundam');

      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(10);

      console.log('✅ Graph node category/gundam loaded successfully');
    });

    test('series graph node page loads', async ({ page }) => {
      await page.goto('/#/series/mobile-suit-gundam');

      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(10);

      console.log('✅ Graph node series/mobile-suit-gundam loaded successfully');
    });
  });

  test.describe('Item Detail Routes', () => {
    test('gunpla item detail page structure', async ({ page }) => {
      // Try a sample item ID format
      await page.goto('/#/database/gunpla/01_1000');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      console.log('✅ Item detail page structure loaded successfully');
    });
  });

  test.describe('Shared List Routes', () => {
    test('shared list route handles empty data', async ({ page }) => {
      await page.goto('/#/database/share/test-data');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      console.log('✅ Shared list route handled successfully');
    });
  });

  test.describe('Navigation and Routing Behavior', () => {
    test('navigation between pages works correctly', async ({ page }) => {
      // Start at home
      await page.goto('/');
      await waitForReactApp(page);

      // Navigate to database
      await page.goto('/#/database');
      await waitForReactApp(page);

      // Verify we're on database page
      const dbContent = await page.locator('#root').textContent();
      expect(dbContent).toMatch(/(database|Database|Search)/i);

      // Navigate to gunpla database
      await page.goto('/#/database/gunpla');
      await waitForReactApp(page);

      // Verify navigation worked
      const gunplaContent = await page.locator('#root').textContent();
      expect(gunplaContent?.trim().length).toBeGreaterThan(30);

      console.log('✅ Navigation between pages works correctly');
    });

    test('hash navigation preserves state', async ({ page }) => {
      // Navigate with hash
      await page.goto('/#/database/gunpla');
      await waitForReactApp(page);

      // Check hash is preserved
      const url = page.url();
      expect(url).toContain('/#/database/gunpla');

      console.log('✅ Hash navigation preserves state');
    });

    test('back and forward navigation works', async ({ page }) => {
      // Navigate through history
      await page.goto('/');
      await waitForReactApp(page);

      await page.goto('/#/database');
      await waitForReactApp(page);

      await page.goto('/#/about');
      await waitForReactApp(page);

      // Go back
      await page.goBack();
      await page.waitForTimeout(1000);

      // Should be on database page
      const urlAfterBack = page.url();
      expect(urlAfterBack).toContain('/#/database');

      // Go forward
      await page.goForward();
      await page.waitForTimeout(1000);

      // Should be on about page
      const urlAfterForward = page.url();
      expect(urlAfterForward).toContain('/#/about');

      console.log('✅ Back and forward navigation works');
    });
  });

  test.describe('Error Handling', () => {
    test('handles invalid routes gracefully', async ({ page }) => {
      await page.goto('/#/invalid-route');
      await waitForReactApp(page);

      // Should not crash and show some content
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(10);

      console.log('✅ Invalid route handled gracefully');
    });

    test('handles invalid database hobby types', async ({ page }) => {
      await page.goto('/#/database/invalid-hobby');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      console.log('✅ Invalid database hobby type handled gracefully');
    });

    test('handles malformed item IDs gracefully', async ({ page }) => {
      await page.goto('/#/database/gunpla/invalid-id-format');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      console.log('✅ Malformed item ID handled gracefully');
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('pages load within reasonable time', async ({ page }) => {
      const routes = [
        '/',
        '/#/about',
        '/#/database',
        '/#/collection',
        '/#/search',
        '/#/database/gunpla',
      ];

      for (const route of routes) {
        const startTime = Date.now();

        await page.goto(route);
        await waitForReactApp(page, 5000);

        const loadTime = Date.now() - startTime;

        // Each page should load within 5 seconds in development
        expect(loadTime).toBeLessThan(5000);

        console.log(`⏱️ ${route} loaded in ${loadTime}ms`);
      }
    });

    test('pages are responsive across different viewports', async ({ page }) => {
      const viewports = [
        { width: 1280, height: 720 }, // Desktop
        { width: 768, height: 1024 },  // Tablet
        { width: 375, height: 667 },   // Mobile
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/#/database');
        await waitForReactApp(page);

        const rootElement = page.locator('#root');
        await expect(rootElement).toBeVisible();

        const content = await rootElement.textContent();
        expect(content?.trim().length).toBeGreaterThan(20);

        console.log(`📱 Database page responsive at ${viewport.width}x${viewport.height}`);
      }
    });
  });
});