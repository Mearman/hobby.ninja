import pako from 'pako';

export interface ShareableFilters {
  category?: string;
  search?: string;
  brands?: string[];
  categories?: string[];
  series?: string[];
  grades?: string[];
  scales?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: string;
    end: string;
  };
  status?: string[];
  availability?: string[];
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  page?: number;
  view?: 'grid' | 'list';
}

export interface ShareableCollection {
  id: string;
  name: string;
  category: string;
  description: string;
  itemCount: number;
}

export interface ShareableData {
  type: 'filters' | 'collection' | 'search';
  data: ShareableFilters | ShareableCollection | string;
  version: string;
  timestamp: number;
}

export class UrlCompression {
  private static readonly VERSION = '1.0';
  private static readonly COMPRESSION_LEVEL = 6;
  private static readonly MAX_URL_LENGTH = 2048;

  /**
   * Compress data to base64url string for URL sharing
   */
  static compress(data: ShareableData): string {
    try {
      // Add metadata
      const payload = {
        ...data,
        version: this.VERSION,
        timestamp: Date.now()
      };

      // Convert to JSON
      const jsonString = JSON.stringify(payload);

      // Compress with pako
      const compressed = pako.deflate(jsonString, {
        level: this.COMPRESSION_LEVEL
      });

      // Convert to base64url (URL-safe base64)
      const base64url = this.arrayBufferToBase64Url(compressed);

      return base64url;
    } catch (error) {
      console.error('Failed to compress data:', error);
      throw new Error('Compression failed');
    }
  }

  /**
   * Decompress base64url string from URL
   */
  static decompress<T>(compressedData: string): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        // Convert base64url to array buffer
        const arrayBuffer = this.base64UrlToArrayBuffer(compressedData);

        // Decompress with pako
        const decompressed = pako.inflate(arrayBuffer, { to: 'string' });

        // Parse JSON
        const data = JSON.parse(decompressed);

        // Validate version
        if (data.version !== this.VERSION) {
          console.warn(`Version mismatch: expected ${this.VERSION}, got ${data.version}`);
        }

        resolve(data.data as T);
      } catch (error) {
        console.error('Failed to decompress data:', error);
        reject(new Error('Decompression failed'));
      }
    });
  }

  /**
   * Create shareable URL for filters
   */
  static createFiltersUrl(filters: ShareableFilters): string {
    const data: ShareableData = {
      type: 'filters',
      data: filters,
      version: this.VERSION,
      timestamp: Date.now()
    };

    const compressed = this.compress(data);
    return `${window.location.origin}/database/share/${compressed}`;
  }

  /**
   * Create shareable URL for collection
   */
  static createCollectionUrl(collection: ShareableCollection): string {
    const data: ShareableData = {
      type: 'collection',
      data: collection,
      version: this.VERSION,
      timestamp: Date.now()
    };

    const compressed = this.compress(data);
    return `${window.location.origin}/database/share/${compressed}`;
  }

  /**
   * Create shareable URL for search query
   */
  static createSearchUrl(searchQuery: string): string {
    const data: ShareableData = {
      type: 'search',
      data: searchQuery,
      version: this.VERSION,
      timestamp: Date.now()
    };

    const compressed = this.compress(data);
    return `${window.location.origin}/database/share/${compressed}`;
  }

  /**
   * Parse current URL to extract compressed data
   */
  static parseCurrentUrl(): ShareableData | null {
    if (typeof window === 'undefined') return null;

    const pathname = window.location.pathname;
    const match = pathname.match(/\/database\/share\/(.+)$/);

    if (!match) return null;

    try {
      const compressedData = match[1];
      const decompressed = pako.inflate(this.base64UrlToArrayBuffer(compressedData), { to: 'string' });
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Failed to parse URL:', error);
      return null;
    }
  }

  /**
   * Convert Uint8Array to base64url string
   */
  private static arrayBufferToBase64Url(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Convert base64url string to Uint8Array
   */
  private static base64UrlToArrayBuffer(base64url: string): Uint8Array {
    // Pad with proper padding characters
    const padding = (4 - (base64url.length % 4)) % 4;
    const base64 = (base64url + '='.repeat(padding))
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Check if compressed data will exceed URL length limits
   */
  static willExceedUrlLimit(data: ShareableData): boolean {
    try {
      const compressed = this.compress(data);
      const estimatedUrlLength = `${window.location.origin}/database/share/${compressed}`.length;
      return estimatedUrlLength > this.MAX_URL_LENGTH;
    } catch {
      return true;
    }
  }

  /**
   * Create optimized shareable data for filters (removes empty values)
   */
  static optimizeFilters(filters: ShareableFilters): ShareableFilters {
    const optimized: ShareableFilters = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (Array.isArray(value)) {
        if (value.length > 0) {
          (optimized as any)[key] = value;
        }
      } else if (typeof value === 'object') {
        if (Object.keys(value).length > 0) {
          (optimized as any)[key] = value;
        }
      } else if (value !== '') {
        (optimized as any)[key] = value;
      }
    });

    return optimized;
  }

  /**
   * Get estimated compression ratio
   */
  static getCompressionRatio(data: ShareableData): number {
    try {
      const jsonString = JSON.stringify(data);
      const compressed = this.compress(data);
      return compressed.length / jsonString.length;
    } catch {
      return 1;
    }
  }
}

export default UrlCompression;