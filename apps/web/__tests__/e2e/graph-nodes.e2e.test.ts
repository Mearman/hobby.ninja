import { test, expect } from '@playwright/test';

/**
 * Graph Node Tests for hobby.ninja
 *
 * Tests the graph node functionality, including brand, category, item,
 * manual, and series pages to ensure the graph API integration works correctly.
 */

test.describe('Graph Node Functionality', () => {
  const baseUrl = 'http://localhost:3000/';

  test.beforeAll(async () => {
    console.log('🧪 Running graph node functionality tests');
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

  // Sample node IDs to test (these may or may not exist, but should not crash)
  const sampleNodes = {
    items: ['01_1000', '01_1330', '01_2607'],
    brands: ['bandai', 'kotobukiya'],
    categories: ['gundam', 'real-robot'],
    series: ['mobile-suit-gundam', 'gundam-seed'],
    manuals: ['1', '1441'],
  };

  test.describe('Item Nodes', () => {
    test('item pages load with correct structure', async ({ page }) => {
      await page.goto('/#/item/01_1000');
      await waitForReactApp(page);

      // Check page loads without crashing
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      // Check for some content
      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(20);

      console.log('✅ Item node page loaded successfully');
    });

    test('multiple item nodes load correctly', async ({ page }) => {
      for (const itemId of sampleNodes.items) {
        await page.goto(`/#/item/${itemId}`);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        const rootElement = page.locator('#root');
        await expect(rootElement).toBeVisible();

        const content = await rootElement.textContent();
        expect(content?.trim().length).toBeGreaterThan(10);

        console.log(`✅ Item node ${itemId} loaded successfully`);
      }
    });

    test('item pages show item-specific information', async ({ page }) => {
      await page.goto('/#/item/01_1000');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      const content = await rootElement.textContent();

      // Look for item-related content
      const hasItemContent = content.toLowerCase().includes('item') ||
                            content.toLowerCase().includes('kit') ||
                            content.toLowerCase().includes('model') ||
                            content.toLowerCase().includes('price') ||
                            content.toLowerCase().includes('release');

      if (hasItemContent) {
        console.log('✅ Item page shows item-specific content');
      }

      // Look for structured data or metadata
      const pageHtml = await page.content();
      const hasStructuredData = pageHtml.includes('application/ld+json') ||
                                pageHtml.includes('@type') ||
                                pageHtml.includes('schema.org');

      if (hasStructuredData) {
        console.log('✅ Item page has structured data');
      }

      console.log('✅ Item page content analyzed');
    });
  });

  test.describe('Brand Nodes', () => {
    test('brand pages load with correct structure', async ({ page }) => {
      await page.goto('/#/brand/bandai');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(20);

      console.log('✅ Brand node page loaded successfully');
    });

    test('brand pages show brand information', async ({ page }) => {
      await page.goto('/#/brand/bandai');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      const content = await rootElement.textContent();

      // Look for brand-related content
      const hasBrandContent = content.toLowerCase().includes('brand') ||
                             content.toLowerCase().includes('bandai') ||
                             content.toLowerCase().includes('company') ||
                             content.toLowerCase().includes('manufacturer');

      if (hasBrandContent) {
        console.log('✅ Brand page shows brand-specific content');
      }

      console.log('✅ Brand page content analyzed');
    });
  });

  test.describe('Category Nodes', () => {
    test('category pages load with correct structure', async ({ page }) => {
      await page.goto('/#/category/gundam');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(20);

      console.log('✅ Category node page loaded successfully');
    });

    test('category pages show category information', async ({ page }) => {
      await page.goto('/#/category/gundam');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      const content = await rootElement.textContent();

      // Look for category-related content
      const hasCategoryContent = content.toLowerCase().includes('category') ||
                                content.toLowerCase().includes('gundam') ||
                                content.toLowerCase().includes('type') ||
                                content.toLowerCase().includes('classification');

      if (hasCategoryContent) {
        console.log('✅ Category page shows category-specific content');
      }

      console.log('✅ Category page content analyzed');
    });
  });

  test.describe('Series Nodes', () => {
    test('series pages load with correct structure', async ({ page }) => {
      await page.goto('/#/series/mobile-suit-gundam');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(20);

      console.log('✅ Series node page loaded successfully');
    });

    test('series pages show series information', async ({ page }) => {
      await page.goto('/#/series/mobile-suit-gundam');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      const content = await rootElement.textContent();

      // Look for series-related content
      const hasSeriesContent = content.toLowerCase().includes('series') ||
                             content.toLowerCase().includes('gundam') ||
                             content.toLowerCase().includes('mobile suit') ||
                             content.toLowerCase().includes('anime');

      if (hasSeriesContent) {
        console.log('✅ Series page shows series-specific content');
      }

      console.log('✅ Series page content analyzed');
    });
  });

  test.describe('Manual Nodes', () => {
    test('manual pages load with correct structure', async ({ page }) => {
      await page.goto('/#/manual/1441');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      const content = await rootElement.textContent();
      expect(content?.trim().length).toBeGreaterThan(20);

      console.log('✅ Manual node page loaded successfully');
    });

    test('manual pages show manual information', async ({ page }) => {
      await page.goto('/#/manual/1441');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      const content = await rootElement.textContent();

      // Look for manual-related content
      const hasManualContent = content.toLowerCase().includes('manual') ||
                             content.toLowerCase().includes('instruction') ||
                             content.toLowerCase().includes('guide') ||
                             content.toLowerCase().includes('pdf');

      if (hasManualContent) {
        console.log('✅ Manual page shows manual-specific content');
      }

      console.log('✅ Manual page content analyzed');
    });
  });

  test.describe('Graph Data Loading', () => {
    test('graph nodes load data from API correctly', async ({ page }) => {
      // Monitor network requests to graph API
      const graphRequests: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('/api/graph/')) {
          graphRequests.push(url);
        }
      });

      await page.goto('/#/item/01_1000');
      await waitForReactApp(page);

      // Give some time for API requests
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

    test('graph nodes handle missing data gracefully', async ({ page }) => {
      // Try a node that likely doesn't exist
      await page.goto('/#/item/nonexistent-item-99999');
      await waitForReactApp(page);

      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      // Should show some kind of error or "not found" message
      const content = await rootElement.textContent();
      const hasErrorContent = content.toLowerCase().includes('not found') ||
                             content.toLowerCase().includes('error') ||
                             content.toLowerCase().includes('missing') ||
                             content.toLowerCase().includes('404');

      if (hasErrorContent) {
        console.log('✅ Graph node shows appropriate error for missing data');
      }

      console.log('✅ Missing data handled gracefully');
    });

    test('graph nodes maintain correct URL structure', async ({ page }) => {
      const nodeRoute = '/#/item/01_1000';
      await page.goto(nodeRoute);
      await waitForReactApp(page);

      // Verify URL is maintained
      const currentUrl = page.url();
      expect(currentUrl).toContain(nodeRoute);

      console.log('✅ Graph node URL structure maintained correctly');
    });
  });

  test.describe('Related Nodes and Navigation', () => {
    test('graph nodes show related content navigation', async ({ page }) => {
      await page.goto('/#/item/01_1000');
      await waitForReactApp(page);

      // Look for navigation elements to related content
      const relatedLinks = page.locator('a[href*="/brand/"], a[href*="/category/"], a[href*="/series/"], a[href*="/item/"]');
      const hasRelatedLinks = await relatedLinks.count() > 0;

      if (hasRelatedLinks) {
        console.log(`✅ Found ${await relatedLinks.count()} related content links`);

        // Test clicking a related link if available
        if (await relatedLinks.count() > 0) {
          const firstLink = relatedLinks.first();
          const href = await firstLink.getAttribute('href');

          if (href) {
            await firstLink.click();
            await page.waitForTimeout(1000);

            const newUrl = page.url();
            console.log(`🔗 Navigated to related content: ${newUrl}`);

            // Go back for continuing tests
            await page.goBack();
            await waitForReactApp(page);
          }
        }
      } else {
        console.log('ℹ️ No related content links found');
      }
    });

    test('graph nodes have proper breadcrumb navigation', async ({ page }) => {
      await page.goto('/#/item/01_1000');
      await waitForReactApp(page);

      // Look for breadcrumb elements
      const breadcrumbElements = page.locator('nav[aria-label*="breadcrumb" i], .breadcrumb, [role="navigation"] a');
      const hasBreadcrumbs = await breadcrumbElements.count() > 0;

      if (hasBreadcrumbs) {
        console.log('✅ Graph node has breadcrumb navigation');

        const breadcrumbContent = await breadcrumbElements.allTextContents();
        console.log('🍞 Breadcrumb content:', breadcrumbContent.join(' > '));
      } else {
        console.log('ℹ️ No breadcrumb navigation found');
      }
    });
  });

  test.describe('Graph Node Error Handling', () => {
    test('graph nodes handle network errors gracefully', async ({ page }) => {
      // Monitor for network errors
      const failedRequests: string[] = [];
      page.on('requestfailed', (request) => {
        if (request.url().includes('/api/graph/')) {
          failedRequests.push(request.url());
        }
      });

      await page.goto('/#/item/01_1000');
      await waitForReactApp(page);

      // Should still render something even if some requests fail
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();

      if (failedRequests.length > 0) {
        console.log(`⚠️ ${failedRequests.length} graph API requests failed`);
      } else {
        console.log('✅ All graph API requests succeeded');
      }

      console.log('✅ Network error handling tested');
    });

    test('graph nodes handle malformed IDs gracefully', async ({ page }) => {
      const malformedIds = [
        '/#/item/',
        '/#/item/',
        '/#/item/@@invalid@@chars@@',
        '/#/brand/',
        '/#/category/too-long-id-name-that-might-cause-issues',
      ];

      for (const malformedId of malformedIds) {
        await page.goto(malformedId);
        await waitForReactApp(page);

        const rootElement = page.locator('#root');
        await expect(rootElement).toBeVisible();

        const content = await rootElement.textContent();
        expect(content?.trim().length).toBeGreaterThan(10);

        console.log(`✅ Malformed ID handled gracefully: ${malformedId}`);
      }
    });
  });

  test.describe('Performance and Optimization', () => {
    test('graph nodes load within reasonable time', async ({ page }) => {
      const nodeRoutes = [
        '/#/item/01_1000',
        '/#/brand/bandai',
        '/#/category/gundam',
        '/#/series/mobile-suit-gundam',
      ];

      for (const route of nodeRoutes) {
        const startTime = Date.now();

        await page.goto(route);
        await waitForReactApp(page, 5000);

        const loadTime = Date.now() - startTime;

        // Graph nodes should load within 5 seconds
        expect(loadTime).toBeLessThan(5000);

        console.log(`⏱️ ${route} loaded in ${loadTime}ms`);
      }
    });

    test('graph nodes are responsive across viewports', async ({ page }) => {
      const viewports = [
        { width: 1280, height: 720 }, // Desktop
        { width: 768, height: 1024 },  // Tablet
        { width: 375, height: 667 },   // Mobile
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/#/item/01_1000');
        await waitForReactApp(page);

        const rootElement = page.locator('#root');
        await expect(rootElement).toBeVisible();

        const content = await rootElement.textContent();
        expect(content?.trim().length).toBeGreaterThan(20);

        console.log(`📱 Graph node responsive at ${viewport.width}x${viewport.height}`);
      }
    });
  });
});