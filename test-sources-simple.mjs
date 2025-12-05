#!/usr/bin/env node

/**
 * Simple test to verify scraping from each data source works
 */

console.log('🔍 Testing scraping from each data source...');

async function testSource(name, url) {
  try {
    console.log(`\n--- Testing ${name} ---`);
    console.log(`📍 URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GundamDataScraper/1.0 (Source Test)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    // Extract basic information
    const title = $('title').text().trim() || 'No title found';
    const hasImages = $('img').length > 0;
    const imageCount = $('img').length;

    // Language and content detection
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(html);
    const hasGundamContent = html.toLowerCase().includes('gundam') ||
                           html.toLowerCase().includes('ガンダム') ||
                           html.toLowerCase().includes('ガンプラ');

    // Test some basic scraping patterns
    const hasH1 = $('h1').length > 0;
    const hasLinks = $('a').length > 0;
    const hasProducts = html.toLowerCase().includes('hg-') ||
                      html.toLowerCase().includes('mg-') ||
                      html.toLowerCase().includes('pg-');

    console.log(`📄 Title: ${title}`);
    console.log(`🌐 Japanese content: ${hasJapanese ? 'Yes' : 'No'}`);
    console.log(`🤖 Gundam content: ${hasGundamContent ? 'Yes' : 'No'}`);
    console.log(`🏷️  Product grades (HG/MG/PG): ${hasProducts ? 'Yes' : 'No'}`);
    console.log(`🖼️  Images: ${imageCount} found`);
    console.log(`🔗 Links: ${hasLinks ? 'Yes' : 'No'}`);
    console.log(`📝 Headings: ${hasH1 ? 'Yes' : 'No'}`);
    console.log(`📏 Content size: ${html.length.toLocaleString()} characters`);

    return {
      success: true,
      name,
      title,
      hasJapanese,
      hasGundamContent,
      hasProducts,
      hasImages,
      contentSize: html.length
    };

  } catch (error) {
    console.error(`❌ Failed to test ${name}:`, error.message);
    return {
      success: false,
      name,
      error: error.message
    };
  }
}

async function testAllSources() {
  console.log('🚀 Starting source tests...\n');

  const sources = [
    { name: 'Bandai Hobby', url: 'https://bandai-hobby.net/' },
    { name: 'Gundam Info', url: 'https://gundam.info/' },
    { name: 'HobbyLink Japan', url: 'https://1999.co.jp/' }
  ];

  const results = [];

  for (const source of sources) {
    const result = await testSource(source.name, source.url);
    results.push(result);
  }

  // Summary
  console.log('\n📋 TEST SUMMARY');
  console.log('================');

  const successful = results.filter(r => r.success).length;
  const total = results.length;

  console.log(`\n📊 Results: ${successful}/${total} sources accessible`);

  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.name}: ${result.title} (${result.contentSize} chars)`);
    } else {
      console.log(`❌ ${result.name}: ${result.error}`);
    }
  });

  console.log('\n🎯 ASSESSMENT');
  if (successful === total) {
    console.log('🎉 SUCCESS: All sources are accessible for scraping!');
  } else if (successful > 0) {
    console.log(`⚠️  PARTIAL: ${successful}/${total} sources accessible`);
  } else {
    console.log('❌ FAILED: No sources accessible');
  }

  console.log('\n🏁 Tests completed!');
}

testAllSources().catch(console.error);