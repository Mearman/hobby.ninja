import { createVar, globalStyle, style } from '@vanilla-extract/css';

// CSS Variables for theming
export const primaryColor = createVar('primary-color');
export const backgroundColor = createVar('background-color');
export const textColor = createVar('text-color');
export const borderColor = createVar('border-color');
export const shadowColor = createVar('shadow-color');

// Global styles
export const globalStyles = globalStyle({
  ':root': {
    [primaryColor]: '#2196f3',
    [backgroundColor]: '#ffffff',
    [textColor]: '#1a1a1a',
    [borderColor]: '#e1e5e9',
    [shadowColor]: 'rgba(0, 0, 0, 0.1)',
  },

  '*': {
    boxSizing: 'border-box',
  },

  'html': {
    fontSize: '16px',
    lineHeight: '1.5',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif',
    scrollBehavior: 'smooth',
  },

  'body': {
    margin: 0,
    padding: 0,
    backgroundColor: backgroundColor,
    color: textColor,
    minHeight: '100vh',
    '-webkit-font-smoothing': 'antialiased',
    '-moz-osx-font-smoothing': 'grayscale',
  },

  'a': {
    color: primaryColor,
    textDecoration: 'none',
    ':hover': {
      textDecoration: 'underline',
    },
  },

  'button': {
    fontFamily: 'inherit',
    cursor: 'pointer',
  },

  '.loading': {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#666',
  },

  '.error-boundary': {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'monospace',
    color: '#e74c3c',
    textAlign: 'center',
    padding: '20px',
  },

  '.error-boundary h2': {
    marginBottom: '16px',
  },

  '.error-boundary details': {
    marginTop: '20px',
    textAlign: 'left',
  },

  '.error-boundary pre': {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '16px',
    maxWidth: '800px',
    overflow: 'auto',
  },
});

// Component styles
export const appContainer = style({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
});

export const appLayout = style({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
});

export const appHeader = style({
  backgroundColor: 'white',
  borderBottom: `1px solid ${borderColor}`,
  padding: '1rem 0',
  boxShadow: `0 1px 3px ${shadowColor}`,
  position: 'sticky',
  top: 0,
  zIndex: 100,
});

export const appNav = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 1rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const appTitle = style({
  margin: 0,
  fontSize: '1.5rem',
  fontWeight: '600',

  selectors: {
    '& a': {
      color: primaryColor,
      textDecoration: 'none',
      ':hover': {
        textDecoration: 'none',
      },
    },
  },
});

export const navLinks = style({
  display: 'flex',
  listStyle: 'none',
  margin: 0,
  padding: 0,
  gap: '2rem',

  selectors: {
    '& a': {
      color: textColor,
      textDecoration: 'none',
      padding: '0.5rem 0',
      borderBottom: '2px solid transparent',
      transition: 'border-color 0.2s ease',

      ':hover': {
        borderBottom: `2px solid ${primaryColor}`,
      },
    },
  },
});

export const appMain = style({
  flex: 1,
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem 1rem',
  width: '100%',
});

export const appFooter = style({
  backgroundColor: '#f8f9fa',
  borderTop: `1px solid ${borderColor}`,
  padding: '1rem 0',
  textAlign: 'center',
  color: '#666',
  fontSize: '0.875rem',
});

// Page-specific styles
export const homeContainer = style({
  textAlign: 'center',
  padding: '2rem 0',
});

export const featuresGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '2rem',
  marginTop: '3rem',
  maxWidth: '800px',
  margin: '3rem auto 0',
});

export const featureCard = style({
  backgroundColor: 'white',
  border: `1px solid ${borderColor}`,
  borderRadius: '8px',
  padding: '1.5rem',
  boxShadow: `0 2px 4px ${shadowColor}`,
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',

  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 8px ${shadowColor}`,
  },

  selectors: {
    '& h3': {
      margin: '0 0 0.5rem 0',
      color: primaryColor,
      fontSize: '1.125rem',
    },

    '& p': {
      margin: 0,
      color: '#666',
      lineHeight: '1.6',
    },
  },
});

export const aboutContainer = style({
  maxWidth: '800px',
  margin: '0 auto',
  textAlign: 'left',

  selectors: {
    '& h1': {
      textAlign: 'center',
      marginBottom: '2rem',
    },

    '& > p': {
      fontSize: '1.125rem',
      lineHeight: '1.6',
      color: '#666',
      marginBottom: '2rem',
    },
  },
});

export const techStack = style({
  backgroundColor: '#f8f9fa',
  border: `1px solid ${borderColor}`,
  borderRadius: '8px',
  padding: '1.5rem',

  selectors: {
    '& h3': {
      margin: '0 0 1rem 0',
    },

    '& ul': {
      margin: 0,
      paddingLeft: '1.5rem',

      '& li': {
        marginBottom: '0.5rem',
      },
    },
  },
});

export const notFoundContainer = style({
  textAlign: 'center',
  padding: '4rem 2rem',

  selectors: {
    '& h1': {
      fontSize: '3rem',
      marginBottom: '1rem',
      color: primaryColor,
    },

    '& p': {
      fontSize: '1.25rem',
      color: '#666',
      marginBottom: '2rem',
    },

    '& a': {
      backgroundColor: primaryColor,
      color: 'white',
      padding: '0.75rem 1.5rem',
      borderRadius: '6px',
      textDecoration: 'none',
      fontWeight: '500',
      transition: 'background-color 0.2s ease',

      ':hover': {
        backgroundColor: '#1976d2',
        textDecoration: 'none',
      },
    },
  },
});

// Utility styles
export const textCenter = style({
  textAlign: 'center',
});

export const textMuted = style({
  color: '#666',
});

export const marginTop = style({
  marginTop: '2rem',
});

export const marginBottom = style({
  marginBottom: '2rem',
});

// Responsive styles
export const responsiveGrid = style({
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',

  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
      padding: '0 1rem',
    },
  },
});