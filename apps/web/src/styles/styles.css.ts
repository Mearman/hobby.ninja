import { style, globalStyle } from '@vanilla-extract/css';

/**
 * Vanilla Extract styles for custom styling beyond Mantine components.
 *
 * Usage examples:
 * - Use Mantine CSS variables: var(--mantine-color-default-border)
 * - Use Mantine spacing: var(--mantine-spacing-md)
 * - Use Mantine radius: var(--mantine-radius-md)
 * - Use Mantine shadows: var(--mantine-shadow-sm)
 *
 * For descendant selectors, use globalStyle():
 *   const myClass = style({ ... });
 *   globalStyle(`${myClass} h1`, { fontSize: '2rem' });
 */

// Example custom style using Mantine variables
export const exampleCard = style({
  padding: 'var(--mantine-spacing-md)',
  borderRadius: 'var(--mantine-radius-md)',
  border: '1px solid var(--mantine-color-default-border)',
  boxShadow: 'var(--mantine-shadow-sm)',
});

// Example of descendant selector using globalStyle
globalStyle(`${exampleCard} h3`, {
  marginTop: 0,
  marginBottom: 'var(--mantine-spacing-xs)',
});

// Placeholder exports for existing page components
// These can be replaced with real Vanilla Extract styles as needed
export const homeContainer = style({});
export const featuresGrid = style({});
export const featureCard = style({});
export const aboutContainer = style({});
export const techStack = style({});
export const notFoundContainer = style({});
