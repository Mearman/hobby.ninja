#!/usr/bin/env node

/**
 * Simple test to verify scraping from each target source works
 */

console.log('🔍 Testing scraping from target sources...');

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

    // Basic content checks
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(html);
    const hasGundamContent = html.toLowerCase().includes('gundam') ||
                           html.toLowerCase().includes('ガンダム') ||
                           html.toLowerCase().includes('ガンプラ');

    // Language detection using simple character percentage
    const japaneseChars = (html.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
    const englishChars = (html.match(/[a-zA-Z]/g) || []).length;
    const totalChars = japaneseChars + englishChars;

    const japaneseRatio = totalChars > 0 ? japaneseChars / totalChars : 0;
    const englishRatio = totalChars > 0 ? englishChars / totalChars : 0;

    let detectedLang = 'unknown';
    if (japaneseRatio > 0.1 && japaneseRatio > englishRatio) {
      detectedLang = 'ja';
    } else if (englishRatio > 0.8) {
      detectedLang = 'en';
    }

    console.log(`📄 Content size: ${html.length.toLocaleString()} characters`);
    console.log(`🌐 Japanese characters: ${japaneseChars.toLocaleString()} (${(japaneseRatio * 100).toFixed(1)}%)`);
    console.log(`🤖 English characters: ${englishChars.toLocaleString()} (${(englishRatio * 100).toFixed(1)}%)`);
    console.log(`🔤 Detected language: ${detectedLang}`);
    console.log(`🤖 Contains Gundam content: ${hasGundamContent ? 'Yes' : 'No'}`);

    return {
      success: true,
      name,
      url,
      contentSize: html.length,
      japaneseChars,
      englishChars,
      detectedLang,
      hasGundamContent
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
  console.log('🚀 Starting source tests...\n');

  const sources = [
    { name: 'Bandai Hobby', url: 'https://bandai-hobby.net/' },
    { name: 'Bandai Hobby Manual', url: 'https://manual.bandai-hobby.net/' },
    { name: 'Gundam Info', url: 'https://gundam.info/' }
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
      console.log(`✅ ${result.name}: Language=${result.detectedLang}, Gundam=${result.hasGundamContent}, Size=${result.contentSize} chars`);
    } else {
      console.log(`❌ ${result.name}: ${result.error}`);
    }
  });

  console.log('\n🎯 ASSESSMENT');
  if (successful === total) {
    console.log('🎉 SUCCESS: All target sources are accessible for scraping!');
    console.log('📝 The scraping infrastructure is ready for the three priority sources.');
  } else {
    console.log(`⚠️  PARTIAL: ${successful}/${total} sources accessible`);
    console.log('📝 Some sources may need attention or alternative URLs.');
  }

  console.log('\n🏁 Tests completed!');
}

testAllSources().catch(console.error);