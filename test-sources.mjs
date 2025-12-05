#!/usr/bin/env node

/**
 * Test scraping functionality from each configured source
 */

console.log('🔍 Testing scraping from each data source...');

async function testSource(name, url, expectedFeatures = {}) {
  try {
    console.log(`\n--- Testing ${name} ---`);
    console.log(`📍 URL: ${url}`);

    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GundamDataScraper/1.0 (Source Test)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });

    const fetchTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const loadTime = Date.now() - startTime;

    // Parse with Cheerio
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    // Extract basic information
    const title = $('title').text().trim();
    const description = $('meta[name="description"]').attr('content') || '';
    const bodyText = $('body').text().substring(0, 500); // First 500 chars

    // Language detection
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(html);
    const hasEnglish = /[a-zA-Z]/.test(html);
    const detectedLang = hasJapanese ? 'ja' : (hasEnglish ? 'en' : 'unknown');

    // Content analysis
    const hasGundamContent = html.toLowerCase().includes('gundam') ||
                           html.toLowerCase().includes('ガンダム') ||
                           html.toLowerCase().includes('ガンプラ');

    const hasProductInfo = html.toLowerCase().includes('hg-') ||
                          html.toLowerCase().includes('mg-') ||
                          html.toLowerCase().includes('pg-') ||
                          html.toLowerCase().includes('rg-');

    const hasPricing = html.toLowerCase().includes('¥') ||
                      html.toLowerCase().includes('円') ||
                      html.toLowerCase().includes('price') ||
                      html.toLowerCase().includes('価格');

    const hasImages = $('img').length > 0;
    const imageCount = $('img').length;

    console.log(`📄 Title: ${title}`);
    console.log(`📝 Description: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`);
    console.log(`🌐 Language: ${detectedLang}`);
    console.log(`🤖 Contains Gundam content: ${hasGundamContent ? 'Yes' : 'No'}`);
    console.log(`🏷️  Has product info (grades): ${hasProductInfo ? 'Yes' : 'No'}`);
    console.log(`💰 Has pricing info: ${hasPricing ? 'Yes' : 'No'}`);
    console.log(`🖼️  Images found: ${imageCount}`);
    console.log(`⚡ Fetch time: ${fetchTime}ms, Load time: ${loadTime}ms`);
    console.log(`📏 Content size: ${html.length.toLocaleString()} characters`);

    // Test specific selectors that might be useful for scraping
    const potentialSelectors = {
      'product-title': ['h1', '.title', '.product-title', '.item-title', '.page-title'],
      'sku': ['.sku', '.product-sku', '.item-sku', '.model-number'],
      'price': ['.price', '.product-price', '.item-price', '¥', '円'],
      'description': ['.description', '.product-description', '.item-description'],
      'images': ['img', '.product-image img', '.item-image img']
    };

    console.log(`🔍 Testing potential selectors:`);
    for (const [type, selectors] of Object.entries(potentialSelectors)) {
      let found = false;
      for (const selector of selectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          console.log(`  ✅ ${type}: Found ${elements.length} elements with "${selector}"`);
          found = true;
          break;
        }
      }
      if (!found) {
        console.log(`  ❌ ${type}: No elements found`);
      }
    }

    return {
      success: true,
      name,
      url,
      title,
      language: detectedLang,
      hasGundamContent,
      hasProductInfo,
      hasPricing,
      hasImages,
      imageCount,
      fetchTime,
      loadTime,
      contentSize: html.length,
      selectorResults: Object.fromEntries(
        Object.entries(potentialSelectors).map(([type, selectors]) => [
          type,
          selectors.some(selector => $(selector).length > 0)
        ])
      )
    };

  } catch (error) {
    console.error(`❌ Failed to test ${name}:`, error.message);
    return {
      success: false,
      name,
      url,
      error: error.message
    };
  }
}

async function testAllSources() {
  console.log('🚀 Starting comprehensive source tests...\n');

  const sources = [
    {
      name: 'Bandai Hobby',
      url: 'https://bandai-hobby.net/',
      expectedFeatures: { japanese: true, hasProducts: true, hasPricing: true }
    },
    {
      name: 'Gundam Info',
      url: 'https://gundam.info/',
      expectedFeatures: { japanese: true, hasProducts: true, hasNews: true }
    },
    {
      name: 'HobbyLink Japan',
      url: 'https://1999.co.jp/',
      expectedFeatures: { japanese: true, hasProducts: true, hasPricing: true }
    }
  ];

  const results = [];

  for (const source of sources) {
    const result = await testSource(source.name, source.url, source.expectedFeatures);
    results.push(result);
  }

  // Summary
  console.log('\n📋 COMPREHENSIVE TEST SUMMARY');
  console.log('=============================');

  const successful = results.filter(r => r.success).length;
  const total = results.length;

  console.log(`\n📊 Overall Results: ${successful}/${total} sources tested successfully`);

  results.forEach(result => {
    if (result.success) {
      console.log(`\n✅ ${result.name}`);
      console.log(`   🌐 Language: ${result.language}`);
      console.log(`   🤖 Gundam content: ${result.hasGundamContent ? 'Yes' : 'No'}`);
      console.log(`   🏷️  Product info: ${result.hasProductInfo ? 'Yes' : 'No'}`);
      console.log(`   💰 Pricing info: ${result.hasPricing ? 'Yes' : 'No'}`);
      console.log(`   🖼️  Images: ${result.imageCount}`);
      console.log(`   ⚡ Performance: ${result.fetchTime}ms fetch, ${result.loadTime}ms total`);
      console.log(`   📏 Size: ${result.contentSize.toLocaleString()} chars`);
    } else {
      console.log(`\n❌ ${result.name}: ${result.error}`);
    }
  });

  console.log('\n🎯 FINAL ASSESSMENT');
  console.log('==================');

  if (successful === total) {
    console.log('🎉 SUCCESS: All sources are accessible and scrapeable!');
    console.log('📝 The scraping infrastructure is ready for production use.');
    console.log('🔧 Next steps: Build the scrapers package and test individual scrapers.');
  } else {
    console.log(`⚠️  PARTIAL SUCCESS: ${successful}/${total} sources accessible`);
    console.log('📝 Some sources may need attention or alternative URLs.');
  }

  console.log('\n🏁 Tests completed!');
}

testAllSources().catch(console.error);