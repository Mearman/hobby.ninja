/**
 * Fix item brand and series IDs - migrate to canonical IDs
 */

const fs = require('fs');
const path = require('path');

const ITEMS_DIR = path.join(__dirname, '../data/src/items');

// Brand ID mappings (invalid → canonical)
const BRAND_MAPPINGS = {
  'sd': 'sdgundamseries',
  'eg': 'entry_grade',
  'fm': 'fullmechanics'
};

// Series ID mappings (verbose → canonical)
const SERIES_MAPPINGS = {
  'mobile-suit-gundam-seed': 'seed',
  'mobile-suit-gundam': 'gundam',
  'gundam-build-fighters': 'buildfighters',
  'mobile-suit-gundam-uc': 'unicorn',
  'mobile-suit-gundam-00': 'g-00',
  'mobile-suit-gundam-seed-destiny': 'seed-d',
  'mobile-suit-gundam-iron-blooded-orphans': 'tekketsu',
  'mobile-suit-z-gundam': 'z-gundam',
  'new-mobile-report-gundam-w': 'endlesswaltz',
  'gundam-build-divers': 'builddivers',
  'gundam-msv': 'msv',
  'mobile-suit-gundam-age': 'age',
  'mobile-suit-gundam-witch-of-mercury': 'g-witch',
  'mobile-suit-gundam-0083-stardust-memory': 'g-0083',
  'gundam-build-divers-rerise': 'builddivers-rerise',
  'mobile-suit-gundam-chars-counterattack': 'gundam-cca',
  'mobile-suit-gundam-the-origin': 'origin',
  'mobile-suit-gundam-zz': 'gundam-zz',
  'mobile-suit-crossbone-gundam': 'crossbone',
  'mobile-suit-gundam-nt-narrative': 'narrative',
  'mobile-suit-gundam-0080-war-in-the-pocket': 'g-0080',
  'gundam-gs-reconguista': 'g-reco',
  'mobile-suit-gundam-seed-freedom': 'seed-freedom',
  'mobile-suit-v-gundam': 'v-gundam',
  'gundam-sentinel': 'sentinel',
  'mobile-fighter-g-gundam': 'ggundam',
  'mobile-suit-gundam-thunderbolt': 'thunderbolt',
  'gundam-build-metaverse': 'gundambuildmetaverse',
  'mobile-suit-gundam-gquuuuuux': 'gquuuuuux',
  'mobile-suit-gundam-f91': 'gundamf91',
  'gundam-breaker-battlogue': 'gundam_breaker_battlogue',
  'mobile-new-century-gundam-x': 'x',
  'mobile-suit-gundam-cucurrus-doan-island': 'g-doan',
  'mobile-suit-gundam-flash-hathaway': 'hathaway',
  'mobile-suit-gundam-ms-igloo': 'msigloo',
  'mobile-suit-gundam-requiem-of-vengeance': 'requiem',
  'mobile-suit-moon-gundam': 'moon-gundam'
};

function fixItemIds() {
  const files = fs.readdirSync(ITEMS_DIR).filter(f => f.endsWith('.json'));
  let modifiedCount = 0;
  const changes = [];

  for (const file of files) {
    const filePath = path.join(ITEMS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const item = JSON.parse(content);

    let modified = false;

    // Fix brand IDs
    if (item.brandIds && item.brandIds.length > 0) {
      const originalBrandIds = [...item.brandIds];
      item.brandIds = item.brandIds.map(id => {
        if (BRAND_MAPPINGS[id]) {
          modified = true;
          return BRAND_MAPPINGS[id];
        }
        return id;
      });
    }

    // Fix series IDs
    if (item.seriesIds && item.seriesIds.length > 0) {
      const originalSeriesIds = [...item.seriesIds];
      item.seriesIds = item.seriesIds.map(id => {
        if (SERIES_MAPPINGS[id]) {
          modified = true;
          return SERIES_MAPPINGS[id];
        }
        return id;
      });
    }

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(item, null, '\t') + '\n');
      modifiedCount++;
      changes.push({
        file,
        id: item.id,
        name: item.name?.en || item.name?.ja,
        brandIds: item.brandIds,
        seriesIds: item.seriesIds
      });
    }
  }

  console.log(`\nModified ${modifiedCount} item files\n`);

  // Show some examples
  console.log('Examples of updated items:');
  for (const change of changes.slice(0, 5)) {
    console.log(`  ${change.file}: ${change.name}`);
    console.log(`    brands: ${change.brandIds?.join(', ')}`);
    console.log(`    series: ${change.seriesIds?.join(', ')}`);
  }

  if (changes.length > 5) {
    console.log(`  ... and ${changes.length - 5} more`);
  }
}

fixItemIds();
