# Data Model: Static Graph Pages Generation

**Date**: 2025-12-07
**Feature**: Static Graph Pages Generation
**Scale**: 8,485+ graph nodes across 5 node types

## Core Entities

### GraphNode
Represents any entity in the graph database with unified structure for static page generation.

**Attributes**:
- `id`: string - Unique identifier (e.g., "30mm", "01_1000")
- `type`: NodeType - Classification (brand, category, item, manual, series)
- `name`: LocalizedName - Japanese and English names
- `edges`: RelationshipEdges - Connections to other nodes
- `metadata`: NodeMetadata - Type-specific additional data

**Relationships**:
- `CONNECTED_TO`: One-to-many connections to related nodes
- `BELONGS_TO`: Hierarchical relationships (items → brands)
- `HAS_PARTS`: Component relationships
- `IS_SIMILAR_TO`: Similarity relationships

### NodeType
Enumeration of graph node classifications that determine template rendering variations.

**Values**:
- `brand`: Manufacturer or product line (e.g., Bandai, 30MM)
- `category`: Product grouping (e.g., Gunpla, Figure-rise)
- `item`: Individual product kit or model
- `manual`: Assembly instruction document
- `series`: Media or product series (e.g., Gundam Wing)

### LocalizedName
Multilingual name structure supporting Japanese primary and English secondary names.

**Attributes**:
- `ja`: string - Japanese name (primary)
- `en`: string - English name (secondary, optional)

**Validation**:
- Japanese name is required
- English name is optional but recommended for SEO

### RelationshipEdges
Directed graph connections representing relationships between nodes.

**Structure**:
```typescript
interface RelationshipEdges {
  inbound: Relationship[]  // Incoming connections
  outbound: Relationship[] // Outgoing connections
}

interface Relationship {
  targetId: string     // Connected node ID
  targetType: NodeType  // Connected node type
  edgeType: string     // Relationship type
  metadata?: Record<string, any> // Optional edge metadata
}
```

**Edge Types**:
- `BELONGS_TO_BRAND`: Item belongs to brand
- `HAS_CATEGORY`: Node belongs to category
- `CONNECTED_TO_MANUAL`: Item has manual
- `IS_PART_OF_SERIES`: Item part of series
- `SIMILAR_TO`: Similar items

### NodeMetadata
Type-specific additional data that varies by NodeType.

**Brand Metadata**:
- `description`: LocalizedText - Brand description
- `foundedYear`: number - Establishment year
- `country`: string - Country of origin
- `website`: string - Official website

**Item Metadata**:
- `price`: PriceInfo - Cost and currency information
- `releaseDate`: ReleaseDate - Launch date
- `targetAge`: number - Recommended age
- `scale`: string - Model scale (e.g., "1/144", "1/100")
- `grade`: ModelGrade - HG, MG, PG, RG, etc.

**Manual Metadata**:
- `pageCount`: number - Number of pages
- `language`: string - Manual language
- `fileSize`: number - File size in bytes
- `format`: string - File format (PDF, etc.)

**Category Metadata**:
- `description`: LocalizedText - Category description
- `itemCount`: number - Number of items in category

**Series Metadata**:
- `description`: LocalizedText - Series description
- `startYear`: number - Series start year
- `endYear`: number | null - Series end year (if applicable)
- `mediaType`: string - Anime, manga, etc.

## Supporting Types

### PriceInfo
Pricing information for items.

**Attributes**:
- `amount`: number - Price amount
- `currency`: string - Currency code (JPY, USD)
- `taxIncluded`: boolean - Whether tax is included

### ReleaseDate
Structured release date information.

**Attributes**:
- `year`: number - Release year
- `month`: number - Release month (1-12)
- `day`: number - Release day (1-31)
- `ja`: string - Japanese date string (formatted)

### LocalizedText
Multilingual text content.

**Attributes**:
- `ja`: string - Japanese text (primary)
- `en`: string - English text (secondary, optional)

### ModelGrade
Enumeration of Gundam model grades.

**Values**:
- `PG` - Perfect Grade
- `MG` - Master Grade
- `RG` - Real Grade
- `HG` - High Grade
- `EG` - Entry Grade
- `SD` - Super Deformed
- `RE/100` - Reborn One Hundred
- `MGEX` - Master Grade Extreme

## Data Relationships

### Graph Structure
```
Brand (1) ──→ (N) Item
  │              │
  │              └──→ (1) Manual
  │
  └──→ (1) Category ──→ (N) Item
              │
              └──→ (N) Series ──→ (N) Item
```

### Navigation Patterns
- **Brand → Items**: All items belonging to a brand
- **Item → Brand**: Parent brand information
- **Item → Manual**: Associated assembly manual
- **Category → Items**: All items in category
- **Series → Items**: All items in series
- **Similar Items**: Cross-references between similar models

## Validation Rules

### GraphNode Validation
- `id` must be unique across all node types
- `type` must be valid NodeType enum value
- `name.ja` is required
- At least one relationship (inbound or outbound) required

### Relationship Validation
- `targetId` must reference existing GraphNode
- `targetType` must match actual node type
- `edgeType` must be from defined relationship types
- No circular relationships that create infinite loops

### Metadata Validation
- Type-specific metadata validates based on NodeType
- Required fields must be present for each metadata type
- Optional fields validated when present

## State Transitions

### GraphNode Lifecycle
1. **Created**: Node exists with basic ID, type, and name
2. **Enriched**: Relationships and metadata added
3. **Validated**: All validation rules passed
4. **Published**: Ready for static page generation
5. **Archived**: Node removed from active generation (optional)

### Relationship Updates
- **Add**: New connection between nodes
- **Remove**: Existing connection removed
- **Update**: Relationship metadata modified
- **Bulk**: Multiple relationships updated together

## Performance Considerations

### Graph Traversal
- Use adjacency lists for efficient relationship queries
- Implement bidirectional indexing for fast lookups
- Cache frequently accessed relationship paths
- Limit traversal depth to prevent performance issues

### Memory Management
- Lazy loading of relationship data
- Chunked processing for large node sets
- Efficient data structures for 8,485+ nodes
- Garbage collection optimization during generation

## Data Sources

### Primary Source
- **Location**: `apps/web/public/api/graph/`
- **Structure**: Organized by node type (brands/, items/, etc.)
- **Format**: JSON files with GraphNode schema
- **Size**: 8,485+ files across 5 directories

### Data Integrity
- Zod schema validation for all graph data
- Type safety through TypeScript interfaces
- Automated consistency checks during build
- Error handling for malformed or missing data