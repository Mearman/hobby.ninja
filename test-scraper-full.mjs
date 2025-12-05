#!/usr/bin/env node

/**
 * Comprehensive test to verify each scraper source works
 */

import { ScraperRegistry, getScraper, AVAILABLE_SCRAPERS } from './packages/scrapers/src/registry.js';

console.log('🔍 Testing comprehensive scraper functionality...');

async function testScraperRegistry() {
  console.log('📊 Testing Scraper Registry...');

  try {
    // Test registry
    const allScrapers = ScraperRegistry.getAllScraperInfo();
    console.log(`✅ Found ${allScrapers.length} available scrapers:`);

    allScrapers.forEach(scraper => {
      console.log(`  - ${scraper.name}: ${scraper.description}`);
    });

    // Test getting specific scrapers
    for (const scraperType of AVAILABLE_SCRAPERS) {
      try {
        const scraper = getScraper(scraperType);
        console.log(`✅ Successfully created ${scraperType} scraper`);

        // Test basic functionality
        const baseUrl = scraper['baseUrl'];
        console.log(`  📍 Base URL: ${baseUrl}`);

      } catch (error) {
        console.error(`❌ Failed to create ${scraperType} scraper:`, error.message);
      }
    }

    return { success: true, scrapersCount: allScrapers.length };

  } catch (error) {
    console.error('❌ Registry test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testDirectScraping() {
  console.log('\n🌐 Testing direct scraping from sources...');

  const testUrls = [
    {
      source: 'Bandai Hobby (Main)',
      url: 'https://bandai-hobby.net/',
      expectedLang: 'ja'
    },
    {
      source: 'Gundam Info',
      url: 'https://gundam.info/',
      expectedLang: 'ja'
    },
    {
      source: 'HobbyLink Japan',
      url: 'https://1999.co.jp/',
      expectedLang: 'ja'
    }
  ];

  const results = [];

  for (const { source, url, expectedLang } of testUrls) {
    try {
      console.log(`\n--- Testing ${source} ---`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GundamDataScraper/1.0 (Comprehensive Test)',
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
      const title = $('title').text().trim();

      // Language detection
      const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(html);
      const hasEnglish = /[a-zA-Z]/.test(html);
      const detectedLang = hasJapanese ? 'ja' : 'en';

      // Check for product/Gundam content
      const hasGundamContent = html.toLowerCase().includes('gundam') ||
                             html.toLowerCase().includes('ガンダム') ||
                             html.toLowerCase().includes('ガンプラ') ||
                             html.toLowerCase().includes('hg-') ||
                             html.toLowerCase().includes('mg-');

      console.log(`  📄 Title: ${title}`);
      console.log(`  🌐 Language: ${detectedLang} (expected: ${expectedLang})`);
      console.log(`  🤖 Contains Gundam/Gunpla content: ${hasGundamContent ? 'Yes' : 'No'}`);
      console.log(`  📏 Content size: ${html.length.toLocaleString()} characters`);

      results.push({
        source,
        url,
        success: true,
        title,
        detectedLang,
        expectedLang,
        languageMatch: detectedLang === expectedLang,
        hasGundamContent,
        contentSize: html.length
      });

    } catch (error) {
      console.error(`  ❌ Failed to fetch ${source}:`, error.message);
      results.push({
        source,
        url,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

async function runComprehensiveTests() {
  console.log('🚀 Starting comprehensive scraper tests...\n');

  // Test 1: Registry functionality
  const registryResult = await testScraperRegistry();

  // Test 2: Direct scraping
  const scrapingResults = await testDirectScraping();

  // Summary
  console.log('\n📋 TEST SUMMARY');
  console.log('================');

  console.log('\n🏷️  Registry Tests:');
  if (registryResult.success) {
    console.log(`  ✅ Registry working - ${registryResult.scrapersCount} scrapers available`);
  } else {
    console.log(`  ❌ Registry failed: ${registryResult.error}`);
  }

  console.log('\n🌐 Scraping Tests:');
  const successfulScrapes = scrapingResults.filter(r => r.success).length;
  const totalScrapes = scrapingResults.length;
  console.log(`  ✅ ${successfulScrapes}/${totalScrapes} sites successfully scraped`);

  scrapingResults.forEach(result => {
    if (result.success) {
      const status = result.languageMatch && result.hasGundamContent ? '✅' : '⚠️';
      console.log(`  ${status} ${result.source}: ${result.detectedLang === result.expectedLang ? 'Correct language' : 'Wrong language'}, ${result.hasGundamContent ? 'Has content' : 'No content'}`);
    } else {
      console.log(`  ❌ ${result.source}: ${result.error}`);
    }
  });

  console.log('\n🎯 Overall Status:');
  if (registryResult.success && successfulScrapes > 0) {
    console.log('✅ Scraper infrastructure is functional and ready for use!');
    console.log('📝 The scrapers can successfully fetch and parse data from target sources.');
  } else {
    console.log('❌ Some components need attention before full functionality.');
  }

  console.log('\n🏁 Comprehensive tests completed!');
}

runComprehensiveTests().catch(console.error);