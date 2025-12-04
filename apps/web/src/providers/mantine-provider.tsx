import React from 'react';
import { MantineProvider, createTheme, MantineColorsTuple } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';

// Define custom Gundam-themed colors
const gunplaBlue: MantineColorsTuple = [
  '#e3f2fd',
  '#bbdefb',
  '#90caf9',
  '#64b5f6',
  '#42a5f5',
  '#2196f3',
  '#1e88e5',
  '#1976d2',
  '#1565c0',
  '#0d47a1',
];

const gunplaRed: MantineColorsTuple = [
  '#ffebee',
  '#ffcdd2',
  '#ef9a9a',
  '#e57373',
  '#ef5350',
  '#f44336',
  '#e53935',
  '#d32f2f',
  '#c62828',
  '#b71c1c',
];

const gunplaGray: MantineColorsTuple = [
  '#fafafa',
  '#f5f5f5',
  '#eeeeee',
  '#e0e0e0',
  '#bdbdbd',
  '#9e9e9e',
  '#757575',
  '#616161',
  '#424242',
  '#212121',
];

// Create custom Mantine theme
const theme = createTheme({
  colors: {
    gunplaBlue,
    gunplaRed,
    gunplaGray,
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif',
  primaryColor: 'gunplaBlue',
  defaultRadius: 'md',
  cursorType: 'pointer',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '2.5rem', fontWeight: '700', lineHeight: '1.2' },
      h2: { fontSize: '2rem', fontWeight: '600', lineHeight: '1.3' },
      h3: { fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.4' },
      h4: { fontSize: '1.25rem', fontWeight: '600', lineHeight: '1.4' },
      h5: { fontSize: '1.125rem', fontWeight: '600', lineHeight: '1.5' },
      h6: { fontSize: '1rem', fontWeight: '600', lineHeight: '1.5' },
    },
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: '500',
          transition: 'all 0.2s ease',
        },
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
      styles: {
        root: {
          transition: 'all 0.2s ease',
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    NumberInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'md',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'md',
      },
    },
    Drawer: {
      defaultProps: {
        radius: 'md',
      },
    },
    AppShell: {
      styles: {
        main: {
          backgroundColor: 'var(--mantine-color-white)',
        },
      },
    },
    Header: {
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-white)',
          borderBottom: '1px solid var(--mantine-color-gray-2)',
        },
      },
    },
    Navbar: {
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-white)',
          borderRight: '1px solid var(--mantine-color-gray-2)',
        },
      },
    },
    Footer: {
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-gray-0)',
          borderTop: '1px solid var(--mantine-color-gray-2)',
        },
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: 'md',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Avatar: {
      defaultProps: {
        radius: 'md',
      },
    },
    Chip: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'md',
      },
    },
    Group: {
      defaultProps: {
        gap: 'md',
      },
    },
    Stack: {
      defaultProps: {
        gap: 'md',
      },
    },
    Grid: {
      defaultProps: {
        gutter: 'md',
      },
    },
    Container: {
      defaultProps: {
        size: 'lg',
      },
    },
    Title: {
      defaultProps: {
        order: 2,
      },
    },
    Text: {
      defaultProps: {
        size: 'sm',
      },
    },
    Divider: {
      defaultProps: {
        size: 'sm',
      },
    },
    Space: {
      defaultProps: {
        size: 'md',
      },
    },
    UnstyledButton: {
      styles: {
        root: {
          transition: 'all 0.2s ease',
        },
      },
    },
  },
  focusRing: 'auto',
  autoContrast: false,
  luminanceThreshold: 0.5,
});

// Mantine provider props
interface MantineThemeProviderProps {
  children: React.ReactNode;
}

export function MantineThemeProvider({ children }: MantineThemeProviderProps) {
  return (
    <MantineProvider theme={theme}>
      <ModalsProvider>
        <Notifications
          position="top-right"
          limit={5}
          zIndex={9999}
          containerWidth={400}
        />
        {children}
      </ModalsProvider>
    </MantineProvider>
  );
}

export { theme, gunplaBlue, gunplaRed, gunplaGray };