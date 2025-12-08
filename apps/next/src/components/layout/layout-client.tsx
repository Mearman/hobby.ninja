'use client';

import { useState } from 'react';
import { MantineThemeProvider } from '@/providers/mantine-provider';
import { Header } from '@/components/layout/header';
import { Navigation } from '@/components/layout/navigation';
import { appShell, mainContent } from '@/styles/components.css';

interface LayoutClientProps {
  children: React.ReactNode;
}

export function LayoutClient({ children }: LayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <MantineThemeProvider>
      <div className={appShell}>
        <Header
          onMenuToggle={handleMenuToggle}
          mobileMenuOpen={mobileMenuOpen}
        />
        <Navigation
          opened={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
        <main className={mainContent}>
          {children}
        </main>
      </div>
    </MantineThemeProvider>
  );
}