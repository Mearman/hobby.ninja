# API Contracts

**Feature**: Nx Monorepo Webapp Setup
**Date**: 2025-12-03
**Type**: Client-side APIs and Service Contracts

## Overview

This webapp is designed for GitHub Pages static deployment and primarily uses client-side APIs. No backend APIs are required for the core functionality.

## Service Contracts

### Nx Workspace API

#### Initialize Workspace
```typescript
interface NxInitializeOptions {
  name: string;
  packageManager: 'npm' | 'yarn' | 'pnpm';
  style: 'css' | 'scss' | 'none';
  routing?: boolean;
  ci?: 'github' | 'circleci' | 'azure' | 'none';
}

interface NxInitializeResult {
  success: boolean;
  workspacePath: string;
  projects: string[];
  errors?: string[];
}
```

#### Generate Application
```typescript
interface NxGenerateAppOptions {
  name: string;
  style: string;
  routing: boolean;
  unitTestRunner: 'jest' | 'vitest' | 'none';
  e2eTestRunner: 'cypress' | 'playwright' | 'none';
  bundler: 'webpack' | 'vite' | 'esbuild';
}

interface NxGenerateAppResult {
  success: boolean;
  projectPath: string;
  commands: {
    build: string;
    serve: string;
    test: string;
    lint: string;
  };
}
```

### TanStack Router API

#### Router Configuration
```typescript
interface RouterConfig {
  defaultPreload: 'intent' | 'viewport' | 'false';
  caseSensitive: boolean;
  trailingSlash: 'never' | 'always' | 'preserve';
  routerHistoryOptions: {
    type: 'hash'; // Required for GitHub Pages
  };
}
```

#### Route Definitions
```typescript
interface RouteDefinition {
  path: string;
  component: React.ComponentType;
  pendingComponent?: React.ComponentType;
  errorComponent?: React.ComponentType;
  loader?: (params: RouteParams) => Promise<unknown>;
  meta?: RouteMeta[];
}
```

### Mantine UI API

#### Theme Configuration
```typescript
interface MantineThemeConfig {
  primaryColor: MantineColors;
  defaultRadius: number | string;
  focusRing: 'auto' | 'always' | 'never';
  fontFamily: string;
  headings: {
    fontFamily: string;
    fontWeight: string;
    sizes: Record<string, { fontSize: string; lineHeight: string }>;
  };
}
```

#### Component Props
```typescript
interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

// Commonly used Mantine components
interface ButtonProps extends BaseComponentProps {
  variant?: 'filled' | 'outline' | 'light' | 'subtle' | 'transparent' | 'white';
  color?: MantineColors;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}

interface TextInputProps extends BaseComponentProps {
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  value?: string;
  onChange: (value: string) => void;
}
```

### Vanilla Extract CSS API

#### Style Creation
```typescript
interface StyleContract {
  style: React.CSSProperties;
  className: string;
  vars?: Record<string, string | number>;
}

interface CreateStyleOptions {
  displayName?: string;
  vars?: Record<string, CSSVariableValue>;
}

interface CSSVariableValue {
  value: string | number;
  fallback?: string | number;
}
```

#### Theme Integration
```typescript
interface VanillaExtractThemeContract {
  colors: {
    primary: StyleContract;
    secondary: StyleContract;
    accent: StyleContract;
    background: StyleContract;
    surface: StyleContract;
    text: StyleContract;
  };
  spacing: {
    xs: StyleContract;
    sm: StyleContract;
    md: StyleContract;
    lg: StyleContract;
    xl: StyleContract;
  };
  typography: {
    h1: StyleContract;
    h2: StyleContract;
    h3: StyleContract;
    body: StyleContract;
    caption: StyleContract;
  };
}
```

#### Responsive Styles
```typescript
interface ResponsiveStyleContract {
  mobile: StyleContract;
  tablet: StyleContract;
  desktop: StyleContract;
  widescreen: StyleContract;
}

interface MediaBreakpoints {
  mobile: string;
  tablet: string;
  desktop: string;
  widescreen: string;
}
```

#### Component Styling
```typescript
interface ComponentStyleProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

interface ComponentStyleContract {
  container: StyleContract;
  element: StyleContract;
  variants: Record<string, StyleContract>;
  sizes: Record<string, StyleContract>;
  states: Record<string, StyleContract>;
}
```

#### CSS-in-JS Utilities
```typescript
interface CSSUtils {
  createVar: (name: string) => CSSVariableValue;
  createTheme: (contract: ThemeContract) => ThemeInstance;
  style: (styles: CSSProperties) => StyleContract;
  globalStyle: (selector: string, styles: CSSProperties) => void;
  keyframes: (frames: Record<string, CSSProperties>) => string;
  fontFace: (fontFace: FontFaceDefinition) => void;
}

interface FontFaceDefinition {
  fontFamily: string;
  src: string;
  fontWeight?: number | string;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  fontDisplay?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
}
```

### Dexie IndexedDB API

#### Database Configuration
```typescript
interface DatabaseConfig {
  name: string;
  version: number;
  stores: Record<string, string>;
}

interface DexieTable<T> {
  add(item: T): Promise<number>;
  get(id: number): Promise<T | undefined>;
  where(key: string): DexieCollection<T>;
  toArray(): Promise<T[]>;
  delete(id: number): Promise<void>;
  clear(): Promise<void>;
}
```

#### Generic Operations
```typescript
interface Repository<T> {
  create(item: Omit<T, 'id'>): Promise<T>;
  findById(id: number): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: number, updates: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
  findWhere(predicate: (item: T) => boolean): Promise<T[]>;
}
```

### Vitest API

#### Test Configuration
```typescript
interface VitestConfig {
  test: {
    environment: 'jsdom' | 'happy-dom' | 'node';
    setupFiles: string[];
    coverage: {
      provider: 'v8' | 'istanbul';
      reporter: ['text', 'json', 'html'];
      thresholds: {
        global: {
          branches: number;
          functions: number;
          lines: number;
          statements: number;
        };
      };
    };
  };
}
```

#### Test Utilities
```typescript
interface RenderOptions {
  wrapper?: React.ComponentType<any>;
  initialProps?: Record<string, any>;
}

interface TestContext {
  render: (component: React.ReactElement, options?: RenderOptions) => RenderResult;
  user: UserEvent;
  waitFor: (callback: () => boolean) => Promise<void>;
}
```

### Playwright API

#### Test Configuration
```typescript
interface PlaywrightConfig {
  testDir: string;
  fullyParallel: boolean;
  forbidOnly: boolean;
  retries: number;
  workers: number;
  reporter: 'list' | 'line' | 'dot' | 'json' | 'junit' | 'html';
  use: {
    baseURL: string;
    trace: 'on-first-retry' | 'on-first-retry' | 'retain-on-failure' | 'on';
    screenshot: 'only-on-failure' | 'always' | 'never';
  };
  projects: PlaywrightProject[];
}
```

#### Page Objects
```typescript
interface PageObject {
  visit(path: string): Promise<void>;
  locator(selector: string): Locator;
  waitForSelector(selector: string): Promise<Locator>;
  click(selector: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  getText(selector: string): Promise<string>;
  isVisible(selector: string): Promise<boolean>;
}
```

### ESLint API

#### Configuration Schema
```typescript
interface ESLintConfig {
  extends: string[];
  plugins: string[];
  rules: Record<string, 'off' | 'warn' | 'error' | ESLintRuleConfig>;
  settings?: Record<string, unknown>;
  env: Record<string, boolean>;
  parser: '@typescript-eslint/parser';
  parserOptions: {
    ecmaVersion: 'latest';
    sourceType: 'module';
    ecmaFeatures: {
      jsx: true;
    };
  };
}
```

#### Custom Rules
```typescript
interface CustomESLintRule {
  meta: ESLintRuleMetaData;
  create: ESLintRuleFunction;
}
```

## Integration Contracts

### Development Workflow

```typescript
interface DevelopmentCommands {
  install: () => Promise<void>;
  dev: () => Promise<void>;
  build: () => Promise<void>;
  test: () => Promise<void>;
  lint: () => Promise<void>;
  e2e: () => Promise<void>;
}

interface DevelopmentServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  reload(): Promise<void>;
  getStatus(): ServerStatus;
}
```

### Build Process

```typescript
interface BuildConfig {
  mode: 'development' | 'production';
  outDir: string;
  assetsDir: string;
  sourcemap: boolean;
  minify: boolean;
  target: string[];
}

interface BuildResult {
  success: boolean;
  outputFiles: BuildOutput[];
  warnings: BuildWarning[];
  errors: BuildError[];
  duration: number;
}
```

## Data Transfer Objects

### Configuration DTOs

```typescript
interface AppConfigDTO {
  name: string;
  version: string;
  routing: {
    type: 'hash';
    basePath: string;
  };
  theme: MantineThemeConfig;
  database: DatabaseConfig;
}
```

### Response DTOs

```typescript
interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}
```

## Error Contracts

### Error Types

```typescript
interface ApplicationError {
  name: string;
  message: string;
  code: string;
  stack?: string;
  context?: Record<string, unknown>;
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}
```

### Error Handling

```typescript
interface ErrorHandler {
  handle(error: ApplicationError): void;
  report(error: ApplicationError): Promise<void>;
  recover(error: ApplicationError): boolean;
}
```

## Event Contracts

### Application Events

```typescript
interface ApplicationEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
  source: string;
}

interface EventListener<T = unknown> {
  (event: ApplicationEvent & { payload: T }): void;
}

interface EventPublisher {
  publish<T>(type: string, payload: T): void;
  subscribe<T>(type: string, listener: EventListener<T>): () => void;
}
```

## Validation Contracts

### Schema Validation

```typescript
interface ValidationSchema<T> {
  parse(data: unknown): T;
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: unknown };
  validate(data: unknown): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: unknown;
}
```

## Security Contracts

### Content Security Policy

```typescript
interface CSPConfig {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'connect-src': string[];
  'font-src': string[];
  'object-src': string[];
  'media-src': string[];
  'frame-src': string[];
}
```

## Notes

- All contracts prioritize TypeScript strict mode for maximum type safety
- Configuration files use TypeScript format where possible
- API contracts assume client-side execution and static deployment
- Error handling follows consistent patterns across all services
- Security considerations are built into all contract definitions