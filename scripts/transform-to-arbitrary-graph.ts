#!/usr/bin/env pnpm tsx

/**
 * Transform existing data structure to arbitrary graph format
 * Creates schema-referenced nodes for maximum flexibility
 * Works at both build-time and runtime
 */

import { validateArbitraryGraph } from '../apps/web/src/schemas/arbitrary-graph-schema';

// Import type definitions, re-enable runtime validation to test Zod 4.1.13
type ArbitraryGraphType = {
  nodes: Array<SchemaNode | DataNode | Relationship>;
  schemas?: Record<string, {
    jsonSchema: Record<string, unknown>;
    zodSchema: string;
  }>;
  metadata: {
    version: string;
    createdAt: string;
    updatedAt: string;
    description?: string;
    totalNodes: number;
    totalRelationships: number;
  };
};

// Node interfaces without Zod runtime dependencies
interface SchemaNode {
  id: string;
  category: 'schema';
  type: 'object_schema' | 'field_schema' | 'enum_schema' | 'array_schema' | 'relationship_schema';
  name: string;
  description?: string;
  definition: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface DataNode {
  id: string;
  category: 'data';
  type: 'hobby_type' | 'brand' | 'scale' | 'category' | 'item' | 'collection' | 'field_instance';
  schemaId: string;
  properties: Record<string, unknown>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    version?: string;
    source?: string;
    confidence?: number;
    [key: string]: unknown;
  };
}

interface Relationship {
  id: string;
  category: 'relationship';
  type: string;
  fromNode: string;
  toNode: string;
  direction: 'directed' | 'undirected' | 'bidirectional';
  properties?: Record<string, unknown>;
  metadata?: {
    createdAt: string;
    updatedAt: string;
    strength?: number;
    confidence?: number;
    [key: string]: unknown;
  };
}
import * as fs from 'fs';
import * as path from 'path';

// Input data interfaces
interface PublicHobbyType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
    required?: boolean;
    searchable?: boolean;
    filterable?: boolean;
    displayInList?: boolean;
    displayInDetail?: boolean;
    order?: number;
    description?: string;
    options?: Array<{ label: string; value: string }>;
  }>;
  settings: {
    allowCustomFields: boolean;
    allowImportExport: boolean;
    defaultSort: string;
    defaultView: string;
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface UnifiedProduct {
  id: string;
  name: {
    ja: string;
    en?: string;
  };
  series: {
    ja: string;
    en?: string;
  };
  grade: string;
  scale: string;
  releaseDate?: {
    year: number;
    month: number;
    day?: number;
  };
  brand?: string;
  sources: {
    catalog?: {
      id: string;
      confidence?: number;
    };
    manual?: {
      id: string;
      productNumber?: string;
      pdfUrl?: string;
    };
  };
  matchMethod: string;
  createdAt: string;
  updatedAt: string;
}

class ArbitraryGraphTransformer {
  private graph: ArbitraryGraphType;
  private brandRegistry: Set<string> = new Set();
  private scaleRegistry: Set<string> = new Set();
  private gradeRegistry: Set<string> = new Set();
  private seriesRegistry: Set<string> = new Set();
  private fieldRegistry: Map<string, any> = new Map();

  constructor() {
    this.graph = {
      nodes: [],
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Arbitrary graph database with schema-referenced nodes',
        totalNodes: 0,
        totalRelationships: 0,
      },
    };
  }

  private addNode(node: SchemaNode | DataNode | Relationship): void {
    this.graph.nodes.push(node);
  }

  private addRelationship(relationship: Omit<Relationship, 'id' | 'category'>): Relationship {
    const rel: Relationship = {
      id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: 'relationship',
      ...relationship,
    };
    this.addNode(rel);
    return rel;
  }

  // SCHEMA NODE CREATION

  private createBaseFieldSchema(id: string, name: string, fieldType: string, required = false): SchemaNode {
    const constraints: any = {};
    if (fieldType === 'string') {
      constraints.minLength = required ? 1 : 0;
    } else if (fieldType === 'number') {
      constraints.min = required ? 0 : undefined;
    }

    const schemaNode: SchemaNode = {
      id,
      category: 'schema',
      type: 'field_schema',
      name,
      description: `Field schema for ${name}`,
      definition: {
        fieldType,
        constraints,
        validation: {
          required,
        },
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      },
    };

    this.addNode(schemaNode);
    return schemaNode;
  }

  private createHobbyTypeSchema(hobbyId: string, hobbyType: PublicHobbyType): SchemaNode {
    // Create field schemas first
    const fieldSchemaIds: string[] = [];

    for (const field of hobbyType.fields) {
      const fieldId = `field_${hobbyId}_${field.id}`;
      this.createBaseFieldSchema(fieldId, field.name, field.type, field.required);
      fieldSchemaIds.push(fieldId);
    }

    const schemaNode: SchemaNode = {
      id: `schema_hobby_${hobbyId}`,
      category: 'schema',
      type: 'object_schema',
      name: `${hobbyType.name} Schema`,
      description: `Schema definition for ${hobbyType.name} items`,
      definition: {
        properties: {
          name: 'string',
          description: 'string',
          status: 'string',
          ...(hobbyType.fields.reduce((acc, field) => {
            acc[field.id] = field.type;
            return acc;
          }, {} as Record<string, string>)),
        },
        required: ['name'],
        additionalProperties: true,
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        fieldSchemas: fieldSchemaIds,
      },
    };

    this.addNode(schemaNode);
    return schemaNode;
  }

  private createBrandSchema(): SchemaNode {
    const schemaNode: SchemaNode = {
      id: 'schema_brand',
      category: 'schema',
      type: 'object_schema',
      name: 'Brand Schema',
      description: 'Schema definition for brand entities',
      definition: {
        properties: {
          name: 'string',
          website: 'string',
          founded: 'number',
          country: 'string',
          specialties: 'array',
        },
        required: ['name'],
        additionalProperties: true,
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      },
    };

    this.addNode(schemaNode);
    return schemaNode;
  }

  private createScaleSchema(): SchemaNode {
    const schemaNode: SchemaNode = {
      id: 'schema_scale',
      category: 'schema',
      type: 'object_schema',
      name: 'Scale Schema',
      description: 'Schema definition for scale entities',
      definition: {
        properties: {
          name: 'string',
          ratio: 'string',
          mmPerUnit: 'number',
          category: 'string',
        },
        required: ['name'],
        additionalProperties: true,
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      },
    };

    this.addNode(schemaNode);
    return schemaNode;
  }

  private createItemSchema(hobbyId: string, hobbyType: PublicHobbyType): SchemaNode {
    const schemaNode: SchemaNode = {
      id: `schema_item_${hobbyId}`,
      category: 'schema',
      type: 'object_schema',
      name: `${hobbyType.name} Item Schema`,
      description: `Schema definition for ${hobbyType.name} catalog items`,
      definition: {
        properties: {
          id: 'string',
          name: 'object', // Multilingual name object
          series: 'object', // Multilingual series object
          grade: 'string',
          scale: 'string',
          brand: 'string',
          releaseDate: 'object', // Year/month/day object
          sources: 'object', // Catalog/manual sources
          matchMethod: 'string',
          status: 'string',
          images: 'array',
          ...(hobbyType.fields.reduce((acc, field) => {
            acc[field.id] = field.type;
            return acc;
          }, {} as Record<string, string>)),
        },
        required: ['id', 'name'],
        additionalProperties: true,
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      },
    };

    this.addNode(schemaNode);
    return schemaNode;
  }

  private createCollectionSchema(hobbyId: string, hobbyType: PublicHobbyType): SchemaNode {
    const schemaNode: SchemaNode = {
      id: `schema_collection_${hobbyId}`,
      category: 'schema',
      type: 'object_schema',
      name: `${hobbyType.name} Collection Schema`,
      description: `Schema definition for ${hobbyType.name} user collections`,
      definition: {
        properties: {
          id: 'string',
          name: 'string',
          description: 'string',
          hobbyType: 'string',
          items: 'array', // Array of item references
          settings: 'object',
          metadata: 'object',
        },
        required: ['id', 'name', 'hobbyType'],
        additionalProperties: true,
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      },
    };

    this.addNode(schemaNode);
    return schemaNode;
  }

  private createRelationshipSchemas(): void {
    // HAS_BRAND relationship schema
    this.addNode({
      id: 'schema_rel_has_brand',
      category: 'schema',
      type: 'relationship_schema',
      name: 'HAS_BRAND Relationship',
      description: 'Hobby type has brand relationship',
      definition: {
        fromNodeType: 'schema_hobby_type',
        toNodeType: 'schema_brand',
        direction: 'directed' as const,
        properties: {
          primary: 'boolean',
        },
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      },
    });

    // HAS_SCALE relationship schema
    this.addNode({
      id: 'schema_rel_has_scale',
      category: 'schema',
      type: 'relationship_schema',
      name: 'HAS_SCALE Relationship',
      description: 'Hobby type has scale relationship',
      definition: {
        fromNodeType: 'schema_hobby_type',
        toNodeType: 'schema_scale',
        direction: 'directed' as const,
        properties: {},
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      },
    });

    // INSTANCE_OF relationship schema
    this.addNode({
      id: 'schema_rel_instance_of',
      category: 'schema',
      type: 'relationship_schema',
      name: 'INSTANCE_OF Relationship',
      description: 'Item instance of hobby type relationship',
      definition: {
        fromNodeType: 'schema_item',
        toNodeType: 'schema_hobby_type',
        direction: 'directed' as const,
        properties: {
          confidence: 'number',
        },
      },
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      },
    });
  }

  // DATA NODE CREATION

  private createHobbyTypeDataNode(hobbyId: string, hobbyType: PublicHobbyType): DataNode {
    const dataNode: DataNode = {
      id: `hobby_${hobbyId}`,
      category: 'data',
      type: 'hobby_type',
      schemaId: `schema_hobby_${hobbyId}`,
      properties: {
        name: hobbyType.name,
        description: hobbyType.description,
        icon: hobbyType.icon,
        color: hobbyType.color,
        settings: hobbyType.settings,
        isActive: hobbyType.isActive,
      },
      metadata: {
        createdAt: hobbyType.createdAt || new Date().toISOString(),
        updatedAt: hobbyType.updatedAt || new Date().toISOString(),
        version: '1.0.0',
        source: 'hobby-types.json',
      },
    };

    this.addNode(dataNode);
    return dataNode;
  }

  private createBrandDataNode(brandName: string): DataNode {
    const dataNode: DataNode = {
      id: `brand_${brandName.toLowerCase().replace(/\s+/g, '_')}`,
      category: 'data',
      type: 'brand',
      schemaId: 'schema_brand',
      properties: {
        name: brandName,
        website: this.getBrandWebsite(brandName),
        founded: this.getBrandFounded(brandName),
        country: this.getBrandCountry(brandName),
        specialties: this.getBrandSpecialties(brandName),
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
        source: 'derived_from_unified_data',
      },
    };

    this.addNode(dataNode);
    return dataNode;
  }

  private createScaleDataNode(scaleName: string): DataNode {
    const dataNode: DataNode = {
      id: `scale_${scaleName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}`,
      category: 'data',
      type: 'scale',
      schemaId: 'schema_scale',
      properties: {
        name: scaleName,
        ratio: this.getScaleRatio(scaleName),
        mmPerUnit: this.getScaleMmPerUnit(scaleName),
        category: this.getScaleCategory(scaleName),
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
        source: 'derived_from_unified_data',
      },
    };

    this.addNode(dataNode);
    return dataNode;
  }

  private createItemDataNode(product: UnifiedProduct, hobbyId: string): DataNode {
    const dataNode: DataNode = {
      id: product.id,
      category: 'data',
      type: 'item',
      schemaId: `schema_item_${hobbyId}`,
      properties: {
        name: product.name,
        series: product.series,
        grade: product.grade,
        scale: product.scale,
        brand: product.brand,
        releaseDate: product.releaseDate,
        sources: product.sources,
        matchMethod: product.matchMethod,
        status: 'active',
        images: [], // Would be populated from image processing
      },
      metadata: {
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        version: '1.0.0',
        source: 'unified_products',
        confidence: product.sources?.catalog?.confidence || 1.0,
      },
    };

    this.addNode(dataNode);
    return dataNode;
  }

  // NODE COUNTING METHODS

  private getRelationships(): Relationship[] {
    return this.graph.nodes.filter((node): node is Relationship => node.category === 'relationship');
  }

  private getSchemaNodes(): SchemaNode[] {
    return this.graph.nodes.filter((node): node is SchemaNode => node.category === 'schema');
  }

  private getDataNodes(): DataNode[] {
    return this.graph.nodes.filter((node): node is DataNode => node.category === 'data');
  }

  private getStatistics() {
    const schemaNodes = this.getSchemaNodes();
    const dataNodes = this.getDataNodes();
    const relationships = this.getRelationships();

    return {
      totalNodes: this.graph.nodes.length,
      schemaNodes: {
        total: schemaNodes.length,
        byType: schemaNodes.reduce((acc, node) => {
          acc[node.type] = (acc[node.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      dataNodes: {
        total: dataNodes.length,
        byType: dataNodes.reduce((acc, node) => {
          acc[node.type] = (acc[node.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      relationships: {
        total: relationships.length,
        byType: relationships.reduce((acc, rel) => {
          acc[rel.type] = (acc[rel.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }

  // HELPER METHODS

  private getBrandWebsite(brand: string): string {
    const websites: Record<string, string> = {
      'Bandai': 'https://bandai-hobby.net',
      'Kotobukiya': 'https://www.kotobukiya.co.jp',
      'Hasegawa': 'https://www.hasegawa-mod.co.jp',
      'Tamiya': 'https://www.tamiya.com',
    };
    return websites[brand] || '';
  }

  private getBrandFounded(brand: string): number | undefined {
    const founded: Record<string, number> = {
      'Bandai': 1950,
      'Tamiya': 1946,
      'Hasegawa': 1941,
    };
    return founded[brand];
  }

  private getBrandCountry(brand: string): string {
    const countries: Record<string, string> = {
      'Bandai': 'Japan',
      'Kotobukiya': 'Japan',
      'Hasegawa': 'Japan',
      'Tamiya': 'Japan',
    };
    return countries[brand] || '';
  }

  private getBrandSpecialties(brand: string): string[] {
    const specialties: Record<string, string[]> = {
      'Bandai': ['Gundam', 'Anime', 'Plamo', 'Action Figures'],
      'Kotobukiya': ['Military Models', 'Aircraft', 'Ships'],
      'Hasegawa': ['Aircraft', 'Military Models', 'Cars'],
      'Tamiya': ['RC Cars', 'Military Models', 'Mini 4WD'],
    };
    return specialties[brand] || [];
  }

  private getScaleRatio(scale: string): string {
    const ratios: Record<string, string> = {
      'HG': '1/144',
      'MG': '1/100',
      'PG': '1/60',
      'RG': '1/144',
      '1/72': '1/72',
      '1/48': '1/48',
      '1/35': '1/35',
      '1/24': '1/24',
    };
    return ratios[scale] || scale;
  }

  private getScaleMmPerUnit(scale: string): number | undefined {
    const mmPerUnit: Record<string, number> = {
      '1/144': 1.778,
      '1/100': 2.54,
      '1/72': 3.5,
      '1/48': 6.35,
      '1/35': 7.26,
      '1/24': 10.58,
    };
    return mmPerUnit[scale];
  }

  private getScaleCategory(scale: string): string | undefined {
    const categories: Record<string, string> = {
      '1/144': 'small',
      '1/100': 'medium',
      '1/72': 'large',
      '1/48': 'large',
      '1/35': 'very_large',
      '1/24': 'very_large',
    };
    return categories[scale];
  }

  // MAIN TRANSFORMATION LOGIC

  async loadHobbyTypes(): Promise<Record<string, PublicHobbyType>> {
    try {
      const hobbyGraphPath = path.join(__dirname, '../apps/web/public/data/config/hobby-graph.json');
      const content = await fs.promises.readFile(hobbyGraphPath, 'utf-8');
      const graphData = JSON.parse(content);

      // Convert graph nodes to PublicHobbyType format for transformation
      const hobbyTypes: Record<string, PublicHobbyType> = {};
      const hobbyTypeNodes = graphData.nodes.filter((node: any) =>
        node.category === 'schema' && node.type === 'hobby_type'
      );

      for (const hobbyNode of hobbyTypeNodes) {
        hobbyTypes[hobbyNode.id] = {
          id: hobbyNode.id,
          name: hobbyNode.properties.name || hobbyNode.id,
          description: hobbyNode.properties.description || '',
          icon: hobbyNode.properties.icon || '📦',
          color: hobbyNode.properties.color || 'blue',
          fields: hobbyNode.properties.fields || [],
          settings: hobbyNode.properties.settings || {},
        };
      }

      return hobbyTypes;
    } catch (error) {
      console.warn('Could not load hobby-graph.json, using fallback');
      return {
        model_kits: {
          id: 'model_kits',
          name: 'Model Kits',
          description: 'Plastic model kits and figures',
          icon: '🦾',
          color: 'blue',
          fields: [
            { id: 'grade', name: 'Grade', type: 'select', required: true, options: [] },
            { id: 'scale', name: 'Scale', type: 'select', required: true },
            { id: 'status', name: 'Status', type: 'select', required: true },
          ],
          settings: {
            allowCustomFields: true,
            allowImportExport: true,
            defaultSort: 'name',
            defaultView: 'grid',
          },
          isActive: true,
        },
      };
    }
  }

  async loadUnifiedProducts(): Promise<UnifiedProduct[]> {
    try {
      const unifiedDir = path.join(__dirname, '../data/bandai/unified/products');
      const files = await fs.promises.readdir(unifiedDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      const products: UnifiedProduct[] = [];
      for (const file of jsonFiles.slice(0, 100)) { // Limit for testing
        const content = await fs.promises.readFile(path.join(unifiedDir, file), 'utf-8');
        products.push(JSON.parse(content));
      }

      return products;
    } catch (error) {
      console.warn('Could not load unified products:', error);
      return [];
    }
  }

  extractRegistries(products: UnifiedProduct[]): void {
    for (const product of products) {
      if (product.brand) {
        this.brandRegistry.add(product.brand);
      }
      if (product.scale) {
        this.scaleRegistry.add(product.scale);
      }
      if (product.grade) {
        this.gradeRegistry.add(product.grade);
      }
      if (product.series?.ja) {
        this.seriesRegistry.add(product.series.ja);
      }
    }
  }

  async transform(): Promise<void> {
    console.log('Starting arbitrary graph transformation...');

    // Load source data
    const hobbyTypes = await this.loadHobbyTypes();
    const products = await this.loadUnifiedProducts();

    console.log(`Loaded ${Object.keys(hobbyTypes).length} hobby types`);
    console.log(`Loaded ${products.length} unified products`);

    // Extract registries
    this.extractRegistries(products);
    console.log(`Found ${this.brandRegistry.size} brands, ${this.scaleRegistry.size} scales`);

    // 1. Create base schemas
    console.log('Creating base schemas...');
    this.createBrandSchema();
    this.createScaleSchema();
    this.createRelationshipSchemas();

    // 2. Create hobby type schemas and data nodes
    console.log('Creating hobby type schemas and data nodes...');
    for (const [hobbyId, hobbyType] of Object.entries(hobbyTypes)) {
      if (!hobbyType.isActive) continue;

      // Create schema
      this.createHobbyTypeSchema(hobbyId, hobbyType);

      // Create item schema
      this.createItemSchema(hobbyId, hobbyType);

      // Create collection schema
      this.createCollectionSchema(hobbyId, hobbyType);

      // Create data node
      this.createHobbyTypeDataNode(hobbyId, hobbyType);

      // Create brand relationships
      for (const brand of this.brandRegistry) {
        this.createBrandDataNode(brand);
        this.addRelationship({
          type: 'schema_rel_has_brand',
          fromNode: `hobby_${hobbyId}`,
          toNode: `brand_${brand.toLowerCase().replace(/\s+/g, '_')}`,
          direction: 'directed',
          properties: { primary: true },
        });
      }

      // Create scale relationships
      for (const scale of this.scaleRegistry) {
        this.createScaleDataNode(scale);
        this.addRelationship({
          type: 'schema_rel_has_scale',
          fromNode: `hobby_${hobbyId}`,
          toNode: `scale_${scale.toLowerCase().replace(/[^a-z0-9]/gi, '_')}`,
          direction: 'directed',
          properties: {},
        });
      }
    }

    // 3. Create item data nodes and relationships
    console.log('Creating item data nodes...');
    for (const product of products) {
      // Determine hobby type (simple mapping for now)
      const hobbyId = 'model_kits'; // Default to model_kits
      const hobbyType = hobbyTypes[hobbyId];

      if (hobbyType?.isActive) {
        this.createItemDataNode(product, hobbyId);

        // Create relationship to hobby type
        this.addRelationship({
          type: 'schema_rel_instance_of',
          fromNode: product.id,
          toNode: `hobby_${hobbyId}`,
          direction: 'directed',
          properties: {
            confidence: product.sources?.catalog?.confidence || 1.0,
          },
          metadata: {
            strength: 0.9,
            confidence: product.sources?.catalog?.confidence || 1.0,
          },
        });
      }
    }

    // 4. Generate JSON schemas
    console.log('Generating JSON schemas...');
    this.generateJsonSchemas();

    // 5. Update metadata
    this.graph.metadata.totalNodes = this.graph.nodes.length;
    this.graph.metadata.totalRelationships = this.getRelationships().length;
    this.graph.metadata.updatedAt = new Date().toISOString();

    // 6. Validate graph
    console.log('Validating graph structure...');

    // Test if Zod regression is fixed in 4.1.13
    try {
      const result = validateArbitraryGraph(this.graph);
      if (result.success) {
        console.log('✅ Graph validation passed');
      } else {
        console.error('❌ Graph validation failed:', result.error);
        process.exit(1);
      }
    } catch (error) {
      if (error.message.includes('_zod')) {
        console.log('⚠️  Zod _zod regression still present in 4.1.13 - validation disabled');
        console.log('Error:', error.message);
      } else {
        console.error('❌ Unexpected validation error:', error);
        process.exit(1);
      }
    }

    const schemaNodes = this.getSchemaNodes();
    const dataNodes = this.getDataNodes();
    const relationships = this.getRelationships();

    console.log('✅ Arbitrary graph transformation complete!');
    console.log(`Created ${this.graph.nodes.length} nodes`);
    console.log(`Schema nodes: ${schemaNodes.length}`);
    console.log(`Data nodes: ${dataNodes.length}`);
    console.log(`Relationships: ${relationships.length}`);

    // 7. Save graph
    await this.saveGraph();
  }

  private generateJsonSchemas(): void {
    // Generate JSON schemas for all schema nodes
    const schemaNodes = this.getSchemaNodes();

    this.graph.schemas = {};

    for (const schemaNode of schemaNodes) {
      try {
        // For now, we'll create a simple JSON schema representation
        // In a full implementation, this would use z.toJSONSchema()
        this.graph.schemas[schemaNode.id] = {
          jsonSchema: {
            type: 'object',
            properties: this.extractJsonSchemaFromDefinition(schemaNode.definition),
          },
          zodSchema: `z.object({ ... })`, // Placeholder
        };
      } catch (error) {
        console.warn(`Failed to generate JSON schema for ${schemaNode.id}:`, error);
      }
    }
  }

  private extractJsonSchemaFromDefinition(definition: any): any {
    // Simple extraction - in practice this would be more sophisticated
    if (definition.type === 'object_schema') {
      const schema: any = {
        type: 'object',
        properties: {},
        required: definition.required || [],
        additionalProperties: definition.additionalProperties,
      };

      for (const [key, value] of Object.entries(definition.properties || {})) {
        if (typeof value === 'string') {
          const typeMap: Record<string, string> = {
            'string': 'string',
            'number': 'number',
            'boolean': 'boolean',
            'array': 'array',
            'object': 'object',
            'date': 'string',
            'enum': 'string',
          };
          schema.properties[key] = { type: typeMap[value] || 'string' };
        }
      }

      return schema.properties;
    }

    return definition;
  }

  private async saveGraph(): Promise<void> {
    const outputPath = path.join(__dirname, '../apps/web/public/data/config/arbitrary-graph.json');

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    await fs.promises.writeFile(outputPath, JSON.stringify(this.graph, null, 2));

    console.log(`✅ Saved arbitrary graph to ${outputPath}`);

    // Also save a statistics summary
    const stats = this.getStatistics();
    const statsPath = path.join(__dirname, '../apps/web/public/data/config/arbitrary-graph-stats.json');
    await fs.promises.writeFile(statsPath, JSON.stringify(stats, null, 2));

    console.log(`✅ Saved statistics to ${statsPath}`);
  }
}

// Main execution
async function main() {
  try {
    const transformer = new ArbitraryGraphTransformer();
    await transformer.transform();
    console.log('🎉 Arbitrary graph transformation completed successfully!');
  } catch (error) {
    console.error('❌ Arbitrary graph transformation failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ArbitraryGraphTransformer };