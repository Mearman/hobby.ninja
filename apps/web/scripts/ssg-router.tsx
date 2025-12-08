/**
 * SSG Router Configuration
 *
 * Static router configuration for server-side rendering
 * Uses only the essential routes for static generation
 */

import React from 'react';
import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router';

// Import components
import { HomePage } from '../src/pages/home-page';
import { AboutPage } from '../src/pages/about-page';
import { DatabasePage } from '../src/pages/database-page';
import { GraphNodePage } from '../src/pages/graph-node-page';
import { NotFoundPage } from '../src/pages/not-found-page';

// Create root route
const rootRoute = createRootRoute({
  component: () => {
    // For SSG, we'll let the SSR handle the HTML structure
    return <HomePage />;
  },
});

// Create basic routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
});

const databaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/database',
  component: DatabasePage,
});

// Create graph node route factory
const createGraphNodeRoute = (nodeType: string) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: `/${nodeType}/$id`,
    loader: async ({ params }) => {
      // For SSG, we'll generate the basic structure
      // The actual data will be loaded client-side
      return {
        nodeType,
        nodeId: params.id,
        error: null,
      };
    },
    component: GraphNodePage,
    errorComponent: () => (
      <div>
        <h1>Node Not Found</h1>
        <p>The requested {nodeType} could not be found.</p>
      </div>
    ),
  });

// Create the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  databaseRoute,
  createGraphNodeRoute('brand'),
  createGraphNodeRoute('category'),
  createGraphNodeRoute('item'),
  createGraphNodeRoute('manual'),
  createGraphNodeRoute('series'),
]);

// Create the router
export const ssrRouter = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Export types
export type SsrRouterType = typeof ssrRouter;