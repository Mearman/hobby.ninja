import fs from 'fs';
import path from 'path';
import {
  GraphNode,
  ItemNode,
  BrandNode,
  CategoryNode,
  SeriesNode,
  ManualNode,
  isItemNode,
  isBrandNode,
  isCategoryNode,
  isSeriesNode,
  isManualNode,
  parseNode,
  getNodeDisplayName
} from './schemas';

// Graph data access utilities with runtime validation
const DATA_ROOT = path.resolve(process.cwd(), '../../data/api/graph');

// Generic function to read and parse JSON files with validation
async function readJsonFiles<T>(directory: string): Promise<T[]> {
  try {
    const files = await fs.promises.readdir(directory);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    const items: T[] = [];
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(directory, file);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        // Use type-safe parsing function
        const parsed = parseNode(data);
        if (parsed) {
          items.push(parsed as T);
        } else {
          console.warn(`Failed to parse ${file}: Invalid schema`);
        }
      } catch (error) {
        console.warn(`Error reading file ${file}:`, error);
      }
    }

    return items;
  } catch (error) {
    console.error(`Error reading directory ${directory}:`, error);
    return [];
  }
}

export async function getAllItems(): Promise<ItemNode[]> {
  const items = await readJsonFiles<ItemNode>(path.join(DATA_ROOT, 'items'));
  return items
    .filter(isItemNode)
    .sort((a, b) => {
      const nameA = getNodeDisplayName(a);
      const nameB = getNodeDisplayName(b);
      return nameA.localeCompare(nameB);
    });
}

export async function getAllBrands(): Promise<BrandNode[]> {
  const brands = await readJsonFiles<BrandNode>(path.join(DATA_ROOT, 'brands'));
  return brands
    .filter(isBrandNode)
    .sort((a, b) => {
      const nameA = getNodeDisplayName(a);
      const nameB = getNodeDisplayName(b);
      return nameA.localeCompare(nameB);
    });
}

export async function getAllCategories(): Promise<CategoryNode[]> {
  const categories = await readJsonFiles<CategoryNode>(path.join(DATA_ROOT, 'categories'));
  return categories
    .filter(isCategoryNode)
    .sort((a, b) => {
      const nameA = getNodeDisplayName(a);
      const nameB = getNodeDisplayName(b);
      return nameA.localeCompare(nameB);
    });
}

export async function getAllSeries(): Promise<SeriesNode[]> {
  const series = await readJsonFiles<SeriesNode>(path.join(DATA_ROOT, 'series'));
  return series
    .filter(isSeriesNode)
    .sort((a, b) => {
      const nameA = getNodeDisplayName(a);
      const nameB = getNodeDisplayName(b);
      return nameA.localeCompare(nameB);
    });
}

export async function getAllManuals(): Promise<ManualNode[]> {
  const manuals = await readJsonFiles<ManualNode>(path.join(DATA_ROOT, 'manuals'));
  return manuals
    .filter(isManualNode)
    .sort((a, b) => {
      const nameA = getNodeDisplayName(a);
      const nameB = getNodeDisplayName(b);
      return nameA.localeCompare(nameB);
    });
}

// Generic function to get a single node by ID with type safety
async function getNodeById<T>(
  id: string,
  directory: string,
  typeGuard: (data: unknown) => data is T
): Promise<T | null> {
  try {
    const filePath = path.join(directory, `${id}.json`);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    return typeGuard(data) ? data : null;
  } catch (error) {
    console.error(`Error reading node ${id}:`, error);
    return null;
  }
}

export async function getItemById(id: string): Promise<ItemNode | null> {
  return getNodeById(id, path.join(DATA_ROOT, 'items'), isItemNode);
}

export async function getBrandById(id: string): Promise<BrandNode | null> {
  return getNodeById(id, path.join(DATA_ROOT, 'brands'), isBrandNode);
}

export async function getCategoryById(id: string): Promise<CategoryNode | null> {
  return getNodeById(id, path.join(DATA_ROOT, 'categories'), isCategoryNode);
}

export async function getSeriesById(id: string): Promise<SeriesNode | null> {
  return getNodeById(id, path.join(DATA_ROOT, 'series'), isSeriesNode);
}

export async function getManualById(id: string): Promise<ManualNode | null> {
  return getNodeById(id, path.join(DATA_ROOT, 'manuals'), isManualNode);
}

// Get all nodes with their types for advanced queries
export async function getAllNodes(): Promise<GraphNode[]> {
  const [items, brands, categories, series, manuals] = await Promise.all([
    getAllItems(),
    getAllBrands(),
    getAllCategories(),
    getAllSeries(),
    getAllManuals(),
  ]);

  return [...items, ...brands, ...categories, ...series, ...manuals];
}

// Get nodes by type with runtime validation
export async function getNodesByType<T extends GraphNode>(
  type: string,
  typeGuard: (data: unknown) => data is T
): Promise<T[]> {
  const allNodes = await getAllNodes();
  return allNodes.filter((node): node is T => node.type === type && typeGuard(node));
}

// Get node by ID without knowing the type in advance
export async function getNodeByIdAny(id: string): Promise<GraphNode | null> {
  // Try each type until we find a match
  const [
    item,
    brand,
    category,
    series,
    manual
  ] = await Promise.all([
    getItemById(id),
    getBrandById(id),
    getCategoryById(id),
    getSeriesById(id),
    getManualById(id),
  ]);

  return item || brand || category || series || manual;
}

// Validate a directory contains graph data
export async function validateGraphData(): Promise<boolean> {
  try {
    const requiredDirs = ['items', 'brands', 'categories', 'series', 'manuals'];

    for (const dir of requiredDirs) {
      const dirPath = path.join(DATA_ROOT, dir);
      if (!fs.existsSync(dirPath)) {
        console.error(`Missing directory: ${dirPath}`);
        return false;
      }
    }

    // Test reading a few files to validate schema
    const testFiles = [
      { type: 'items', id: '01_1000' },
      { type: 'brands', id: 'bandai' },
      { type: 'categories', id: 'hg' },
      { type: 'series', id: 'gundam' },
      { type: 'manuals', id: '01_1000_manual' },
    ];

    for (const { type, id } of testFiles) {
      const filePath = path.join(DATA_ROOT, type, `${id}.json`);
      if (fs.existsSync(filePath)) {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        const parsed = parseNode(data);
        if (!parsed) {
          console.error(`Invalid schema in ${filePath}`);
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error validating graph data:', error);
    return false;
  }
}