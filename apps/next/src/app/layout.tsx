import type { Metadata } from 'next';
import { MantineThemeProvider } from '@/providers/mantine-provider';

export const metadata: Metadata = {
  title: 'hobby.ninja - Static',
  description: 'Static HTML generation for hobby.ninja graph data',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <MantineThemeProvider>
          <div id="root">
            {children}
          </div>
        </MantineThemeProvider>
      </body>
    </html>
  );
}