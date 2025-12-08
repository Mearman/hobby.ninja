import fs from 'fs';
import path from 'path';

// Generate static paths for all graph nodes
const DATA_ROOT = path.resolve(process.cwd(), '../../data/api/graph');

export async function generateStaticPaths() {
  try {
    const paths: string[] = [];

    // Add static routes
    paths.push(
      '/',
      '/about',
      '/database',
      '/collection',
      '/search',
      '/database/gunpla',
      '/collection/gunpla'
    );

    // Generate item paths
    const itemsDir = path.join(DATA_ROOT, 'items');
    if (fs.existsSync(itemsDir)) {
      const itemFiles = await fs.promises.readdir(itemsDir);
      const itemIds = itemFiles.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''));

      for (const id of itemIds) {
        paths.push(`/item/${id}`);
        paths.push(`/database/gunpla/${id}`);
        paths.push(`/collection/gunpla/item/${id}`);
      }
    }

    // Generate brand paths
    const brandsDir = path.join(DATA_ROOT, 'brands');
    if (fs.existsSync(brandsDir)) {
      const brandFiles = await fs.promises.readdir(brandsDir);
      const brandIds = brandFiles.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''));

      for (const id of brandIds) {
        paths.push(`/brand/${id}`);
      }
    }

    // Generate category paths
    const categoriesDir = path.join(DATA_ROOT, 'categories');
    if (fs.existsSync(categoriesDir)) {
      const categoryFiles = await fs.promises.readdir(categoriesDir);
      const categoryIds = categoryFiles.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''));

      for (const id of categoryIds) {
        paths.push(`/category/${id}`);
      }
    }

    // Generate series paths
    const seriesDir = path.join(DATA_ROOT, 'series');
    if (fs.existsSync(seriesDir)) {
      const seriesFiles = await fs.promises.readdir(seriesDir);
      const seriesIds = seriesFiles.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''));

      for (const id of seriesIds) {
        paths.push(`/series/${id}`);
      }
    }

    // Generate manual paths
    const manualsDir = path.join(DATA_ROOT, 'manuals');
    if (fs.existsSync(manualsDir)) {
      const manualFiles = await fs.promises.readdir(manualsDir);
      const manualIds = manualFiles.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''));

      for (const id of manualIds) {
        paths.push(`/manual/${id}`);
      }
    }

    console.log(`Generated ${paths.length} static paths from graph data`);
    return paths;

  } catch (error) {
    console.error('Error generating static paths:', error);
    return [];
  }
}

export async function getStaticPathsCount() {
  const paths = await generateStaticPaths();
  return {
    total: paths.length,
    items: paths.filter(p => p.startsWith('/item/')).length,
    brands: paths.filter(p => p.startsWith('/brand/')).length,
    categories: paths.filter(p => p.startsWith('/category/')).length,
    series: paths.filter(p => p.startsWith('/series/')).length,
    manuals: paths.filter(p => p.startsWith('/manual/')).length,
    static: paths.filter(p => !p.match(/^\/(item|brand|category|series|manual)\//)).length,
  };
}