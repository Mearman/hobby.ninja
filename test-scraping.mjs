#!/usr/bin/env node

/**
 * Simple test script to verify scraping functionality works
 */

console.log('🔍 Testing basic scraping functionality...');

async function testBasicScraping() {
  try {
    // Test basic fetch functionality first
    console.log('Testing fetch to Bandai Hobby...');
    const response = await fetch('https://bandai-hobby.net/site/hg-1-144-rx-78-2-gundam/', {
      headers: {
        'User-Agent': 'GundamDataScraper/1.0 (Test)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`✅ Successfully fetched ${html.length} characters from Bandai Hobby`);

    // Test basic parsing with cheerio (dynamic import)
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);
    const title = $('title').text().trim();
    console.log(`📄 Page title: ${title}`);

    // Look for product information
    const productName = $('.product-title, .item-title, h1').first().text().trim();
    const productSku = $('.product-sku, .item-sku, .sku').first().text().trim();

    console.log(`🏷️  Product Name: ${productName || 'Not found'}`);
    console.log(`🔢 Product SKU: ${productSku || 'Not found'}`);

    // Test language detection
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(html);
    const hasEnglish = /[a-zA-Z]/.test(html);
    console.log(`🌐 Language detected: ${hasJapanese ? 'Japanese' : 'English'} content found`);

    return {
      success: true,
      title,
      productName,
      productSku,
      language: hasJapanese ? 'ja' : 'en',
      contentLength: html.length
    };

  } catch (error) {
    console.error(`❌ Scraping test failed:`, error instanceof Error ? error.message : error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Test all configured scrapers
async function runScrapingTests() {
  console.log('🚀 Starting scraping tests...\n');

  const testResults = await testBasicScraping();

  if (testResults.success) {
    console.log('\n✅ Basic scraping functionality works!');
    console.log(`📊 Results:
      - Title: ${testResults.title}
      - Product Name: ${testResults.productName}
      - Product SKU: ${testResults.productSku}
      - Language: ${testResults.language}
      - Content Length: ${testResults.contentLength}`);
  } else {
    console.log(`\n❌ Scraping test failed: ${testResults.error}`);
  }

  console.log('\n🏁 Tests completed!');
}

runScrapingTests().catch(console.error);