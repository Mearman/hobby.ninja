import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './router';
import { MantineThemeProvider } from './providers/mantine-provider';
import { initializeDatabase } from './db';
import './styles/styles.css';

/**
 * Error boundary component for development environment
 */
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return (
      <div className="error-boundary">
        <h2>Development Error Boundary</h2>
        <p>If you see this, there was an error in the application.</p>
        <details>
          <summary>Error Details</summary>
          <pre>
            Check the browser console for detailed error information.
          </pre>
        </details>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Initialize and start the application
 */
async function startApp() {
  try {
    console.log('🚀 Initializing application...');

    // Initialize IndexedDB database
    console.log('🗄️ Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully');

    // Find root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = createRoot(rootElement);

    // Clear initial loading state safely
    while (rootElement.firstChild) {
      rootElement.removeChild(rootElement.firstChild);
    }

    // Render app with providers and error boundary
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <MantineThemeProvider>
            <AppRouter />
          </MantineThemeProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );

    console.log('✅ Application mounted successfully');

  } catch (error) {
    console.error('❌ Failed to start application:', error);

    // Show error message in the UI
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div class="error-boundary">
          <h2>Application Startup Error</h2>
          <p>Failed to initialize the application. Please check the browser console for details.</p>
          <details>
            <summary>Error Details</summary>
            <pre>${error instanceof Error ? error.message : 'Unknown error'}</pre>
          </details>
        </div>
      `;
    }
  }
}

// Start the application
startApp();

// Enable hot module replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}

/**
 * Handle service worker controller changes
 */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🔄 Service worker controller changed - reloading...');
    window.location.reload();
  });
}

/**
 * Handle visibility changes (app hidden/shown)
 */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('📱 Application hidden');
  } else {
    console.log('📱 Application visible');
  }
});

/**
 * Handle application unmount/cleanup
 */
window.addEventListener('beforeunload', () => {
  console.log('🛑 Application unloading...');
});