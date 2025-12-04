#!/usr/bin/env node

/**
 * Icon Generation Script
 *
 * This script generates PNG icons in various sizes from the SVG placeholder.
 * In a production environment, you would replace this with actual icon files
 * created by a designer.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Icon sizes required for the PWA manifest
const ICON_SIZES = [
  72, 96, 128, 144, 152, 192, 384, 512
] as const;

// Shortcut icon sizes
const SHORTCUT_SIZES = [
  96
] as const;

// Maskable icon sizes
const MASKABLE_SIZES = [
  192, 512
] as const;

// Type definitions for better type safety
interface IconSize {
  readonly size: number;
  readonly filename: string;
}

interface Shortcut {
  readonly name: string;
  readonly color: string;
}

interface SplashSize {
  readonly width: number;
  readonly height: number;
  readonly form: 'narrow' | 'wide';
}

interface ScreenshotConfig {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly form: 'narrow' | 'wide';
  readonly label: string;
}

type IconType = 'regular' | 'maskable';

// Create placeholder PNG data (base64 encoded minimal PNG)
// This creates a simple colored square with transparent corners
function createPlaceholderPNGData(size: number, type: IconType = 'regular'): string {
  // For demonstration purposes, we'll create simple colored squares
  // In production, these should be properly designed icons
  const canvas = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${type === 'maskable'
    ? `<rect width="${size}" height="${size}" fill="#dc2626" rx="${size * 0.15}"/>`
    : `<rect width="${size}" height="${size}" fill="#1a1a1a" rx="${size * 0.1}"/>`
  }
  <g transform="translate(${size/2}, ${size/2})">
    <rect x="${-size*0.12}" y="${-size*0.16}" width="${size*0.24}" height="${size*0.2}" fill="${type === 'maskable' ? '#ffffff' : '#dc2626'}" rx="${size*0.016}"/>
    <polygon points="${-size*0.08},${-size*0.16} 0,${-size*0.24} ${size*0.08},${-size*0.16} ${size*0.04},${-size*0.16} 0,${-size*0.20} ${-size*0.04},${-size*0.16}" fill="${type === 'maskable' ? '#ffffff' : '#dc2626'}"/>
    ${size >= 96 ? `
      <rect x="${-size*0.04}" y="${-size*0.10}" width="${size*0.03}" height="${size*0.016}" fill="${type === 'maskable' ? '#ff8888' : '#ff4444'}" rx="${size*0.004}"/>
      <rect x="${size*0.01}" y="${-size*0.10}" width="${size*0.03}" height="${size*0.016}" fill="${type === 'maskable' ? '#ff8888' : '#ff4444'}" rx="${size*0.004}"/>
    ` : ''}
  </g>
</svg>`;

  return canvas;
}

// Create icons directory structure
function createDirectories(): void {
  const dirs = [
    '.',
    '../splash',
    '../screenshots'
  ];

  for (const dir of dirs) {
    const fullPath = join(__dirname, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }
}

// Generate regular icons
function generateRegularIcons(): void {
  console.log('Generating regular icons...');

  for (const size of ICON_SIZES) {
    const svgContent = createPlaceholderPNGData(size, 'regular');
    const filename = `icon-${size}x${size}.svg`;
    writeFileSync(join(__dirname, filename), svgContent);
    console.log(`✓ Generated ${filename}`);
  }
}

// Generate maskable icons
function generateMaskableIcons(): void {
  console.log('Generating maskable icons...');

  for (const size of MASKABLE_SIZES) {
    const svgContent = createPlaceholderPNGData(size, 'maskable');
    const filename = `maskable-icon-${size}x${size}.svg`;
    writeFileSync(join(__dirname, filename), svgContent);
    console.log(`✓ Generated ${filename}`);
  }
}

// Generate shortcut icons
function generateShortcutIcons(): void {
  console.log('Generating shortcut icons...');

  const shortcuts: Shortcut[] = [
    { name: 'collection', color: '#3b82f6' },
    { name: 'search', color: '#10b981' },
    { name: 'wishlist', color: '#f59e0b' },
    { name: 'builds', color: '#8b5cf6' }
  ];

  for (const shortcut of shortcuts) {
    const svgContent = `
<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" fill="#1a1a1a" rx="16"/>
  <g transform="translate(48, 48)">
    ${shortcut.name === 'collection' ? `
      <rect x="-20" y="-20" width="40" height="40" fill="${shortcut.color}" rx="8"/>
      <circle cx="0" cy="-8" r="4" fill="#ffffff"/>
      <circle cx="-8" cy="4" r="4" fill="#ffffff"/>
      <circle cx="8" cy="4" r="4" fill="#ffffff"/>
    ` : shortcut.name === 'search' ? `
      <circle cx="0" cy="-8" r="12" stroke="${shortcut.color}" stroke-width="4" fill="none"/>
      <rect x="8" y="0" width="6" height="16" fill="${shortcut.color}" rx="3" transform="rotate(45 8 0)"/>
    ` : shortcut.name === 'wishlist' ? `
      <polygon points="0,-16 6,-4 16,-4 8,4 10,14 0,8 -10,14 -8,4 -16,-4 -6,-4" fill="${shortcut.color}"/>
    ` : `
      <rect x="-16" y="-16" width="32" height="32" fill="${shortcut.color}" rx="8"/>
      <rect x="-12" y="-12" width="10" height="10" fill="#ffffff" rx="2"/>
      <rect x="2" y="-12" width="10" height="10" fill="#ffffff" rx="2"/>
      <rect x="-12" y="2" width="10" height="10" fill="#ffffff" rx="2"/>
      <rect x="2" y="2" width="10" height="10" fill="#ffffff" rx="2"/>
    `}
  </g>
</svg>`;

    const filename = `shortcut-${shortcut.name}-96x96.svg`;
    writeFileSync(join(__dirname, filename), svgContent);
    console.log(`✓ Generated ${filename}`);
  }
}

// Generate placeholder splash screens
function generateSplashScreens(): void {
  console.log('Generating splash screen placeholders...');

  const splashSizes: SplashSize[] = [
    { width: 640, height: 1136, form: 'narrow' },
    { width: 750, height: 1334, form: 'narrow' },
    { width: 1125, height: 2436, form: 'narrow' },
    { width: 1242, height: 2208, form: 'narrow' },
    { width: 1536, height: 2048, form: 'wide' },
    { width: 1668, height: 2224, form: 'wide' },
    { width: 2048, height: 2732, form: 'wide' }
  ];

  for (const { width, height, form } of splashSizes) {
    const svgContent = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#1a1a1a"/>
  <g transform="translate(${width/2}, ${height/2})">
    <rect x="-60" y="-80" width="120" height="100" fill="#dc2626" rx="8"/>
    <polygon points="-40,-80 0,-120 40,-80 20,-80 0,-100 -20,-80" fill="#dc2626"/>
    <rect x="-20" y="-50" width="15" height="8" fill="#ff4444" rx="2"/>
    <rect x="5" y="-50" width="15" height="8" fill="#ff4444" rx="2"/>
    <text x="0" y="100" font-family="system-ui, sans-serif" font-size="24" font-weight="600" fill="#ffffff" text-anchor="middle">Gunpla Collection Manager</text>
    <text x="0" y="130" font-family="system-ui, sans-serif" font-size="16" fill="#999999" text-anchor="middle">Loading...</text>
  </g>
</svg>`;

    const filename = `../splash/splash-${width}x${height}.svg`;
    writeFileSync(join(__dirname, filename), svgContent);
    console.log(`✓ Generated splash-${width}x${height}.svg`);
  }
}

// Generate placeholder screenshots
function generateScreenshots(): void {
  console.log('Generating screenshot placeholders...');

  const screenshots: ScreenshotConfig[] = [
    { name: 'desktop-1', width: 1280, height: 720, form: 'wide', label: 'Main collection view with kit details' },
    { name: 'desktop-2', width: 1280, height: 720, form: 'wide', label: 'Search and filter functionality' },
    { name: 'mobile-1', width: 390, height: 844, form: 'narrow', label: 'Mobile collection view' },
    { name: 'mobile-2', width: 390, height: 844, form: 'narrow', label: 'Mobile kit details view' }
  ];

  for (const { name, width, height, form, label } of screenshots) {
    const svgContent = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#f8f9fa"/>
  <!-- Header -->
  <rect width="${width}" height="60" fill="#dc2626"/>
  <text x="20" y="38" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="#ffffff">Gunpla Collection Manager</text>

  <!-- Content area -->
  <g transform="translate(20, 80)">
    <rect width="${width - 40}" height="${height - 160}" fill="#ffffff" stroke="#e5e7eb" stroke-width="2" rx="8"/>

    <!-- Mock content -->
    ${form === 'wide' ? `
      <rect x="20" y="20" width="200" height="${height - 260}" fill="#f3f4f6" rx="4"/>
      <text x="240" y="50" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#1f2937">${label}</text>
      <rect x="240" y="70" width="300" height="8" fill="#e5e7eb" rx="4"/>
      <rect x="240" y="90" width="250" height="8" fill="#e5e7eb" rx="4"/>
      <rect x="240" y="110" width="280" height="8" fill="#e5e7eb" rx="4"/>

      <!-- Mock cards -->
      ${[1,2,3].map(i => `
        <rect x="240" y="${140 + (i-1)*60}" width="${width - 320}" height="40" fill="#f9fafb" stroke="#e5e7eb" rx="4"/>
        <rect x="${250}" y="${150 + (i-1)*60}" width="60" height="20" fill="#e5e7eb" rx="2"/>
        <rect x="${320}" y="${150 + (i-1)*60}" width="120" height="8" fill="#d1d5db" rx="2"/>
        <rect x="${320}" y="${162 + (i-1)*60}" width="80" height="6" fill="#e5e7eb" rx="2"/>
      `).join('')}
    ` : `
      <text x="20" y="40" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#1f2937">${label}</text>
      ${[1,2,3,4].map(i => `
        <rect x="20" y="${60 + (i-1)*80}" width="${width - 80}" height="60" fill="#f9fafb" stroke="#e5e7eb" rx="4"/>
        <rect x="30" y="${75 + (i-1)*80}" width="40" height="30" fill="#e5e7eb" rx="2"/>
        <text x="80" y="${85 + (i-1)*80}" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#1f2937">Gunpla Kit ${i}</text>
        <rect x="80" y="${95 + (i-1)*80}" width="80" height="4" fill="#d1d5db" rx="2"/>
      `).join('')}
    `}
  </g>

  <!-- Bottom navigation -->
  <rect y="${height - 60}" width="${width}" height="60" fill="#ffffff" stroke="#e5e7eb" stroke-width="2"/>
  ${form === 'wide' ?
    ['Collection', 'Search', 'Wishlist', 'Builds'].map((text, i) => `
      <text x="${width/8 + i * width/4}" y="${height - 20}" font-family="system-ui, sans-serif" font-size="12" fill="#6b7280" text-anchor="middle">${text}</text>
    `).join('')
    :
    ['📱', '🔍', '⭐', '🔧'].map((emoji, i) => `
      <text x="${width/8 + i * width/4}" y="${height - 25}" font-size="20" text-anchor="middle">${emoji}</text>
    `).join('')
  }
</svg>`;

    const filename = `../screenshots/${name}.svg`;
    writeFileSync(join(__dirname, filename), svgContent);
    console.log(`✓ Generated ${name}.svg`);
  }
}

// Create favicon.ico placeholder
function createFavicon(): void {
  console.log('Generating favicon...');

  const svgContent = `
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" fill="#dc2626" rx="6"/>
  <rect x="10" y="8" width="12" height="10" fill="#ffffff" rx="2"/>
  <polygon points="12,8 16,4 20,8 18,8 16,6 14,8" fill="#ffffff"/>
  <rect x="13" y="11" width="3" height="2" fill="#dc2626" rx="0.5"/>
  <rect x="16" y="11" width="3" height="2" fill="#dc2626" rx="0.5"/>
</svg>`;

  writeFileSync(join(__dirname, '../../favicon.ico'), svgContent.replace(/<svg[^>]*>/, '<svg width="32" height="32" ').replace('</svg>', ''));
  console.log('✓ Generated favicon.ico');
}

// Main execution
function main(): void {
  console.log('🚀 Generating PWA icons and assets...\n');

  try {
    createDirectories();
    generateRegularIcons();
    generateMaskableIcons();
    generateShortcutIcons();
    generateSplashScreens();
    generateScreenshots();
    createFavicon();

    console.log('\n✅ All PWA assets generated successfully!');
    console.log('\n⚠️  Note: These are placeholder SVG files for development.');
    console.log('   Replace them with professionally designed PNG files for production.');

  } catch (error) {
    console.error('❌ Error generating assets:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

// Export functions for potential use in other modules
export {
  createPlaceholderPNGData,
  generateRegularIcons,
  generateMaskableIcons,
  generateShortcutIcons,
  generateSplashScreens,
  generateScreenshots,
  createFavicon,
  type IconType,
  type Shortcut,
  type SplashSize,
  type ScreenshotConfig
};