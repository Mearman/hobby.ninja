import type { Metadata } from 'next';
import { LayoutClient } from '@/components/layout/layout-client';

export const metadata: Metadata = {
  title: 'hobby.ninja - Static Collection Management',
  description: 'Comprehensive hobby collection management with 8,485+ items, search, and tracking features',
  keywords: ['gunpla', 'hobby', 'collection', 'database', 'model kits', 'figure-rise'],
  authors: [{ name: 'hobby.ninja' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1976d2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}