# Project Overview

## Introduction

The Gunpla App is a Progressive Web Application (PWA) designed for Gundam model kit enthusiasts to manage, track, and organize their collections. Built as an offline-first application, it provides comprehensive functionality without requiring server connectivity or external data storage.

## 🎯 Core Features

### Collection Management
- **Kit Tracking**: Add, edit, and delete Gundam model kits from your collection
- **Progress Tracking**: Monitor build progress, completion status, and acquisition dates
- **Photo Management**: Store and organize build photos directly in the app
- **Wishlist Management**: Keep track of kits you want to acquire

### Data Organization
- **Categorization**: Organize kits by grade, series, scale, and manufacturer
- **Tagging System**: Custom tags for personal organization
- **Search & Filter**: Powerful search capabilities across all kit properties
- **Sorting Options**: Multiple sorting options for easy browsing

### Offline Functionality
- **Local Storage**: All data stored locally using IndexedDB
- **Offline Sync**: Seamless offline experience with automatic sync when online
- **Background Sync**: Queue actions while offline and execute when connection restores
- **Caching**: Intelligent caching for optimal performance

### PWA Features
- **Installable**: Install as a native app on desktop and mobile devices
- **Responsive Design**: Optimized for all screen sizes and devices
- **Push Notifications**: Reminders for build deadlines and new releases
- **App Shortcuts**: Quick access to common actions

##  Technical Architecture

### Application Structure

```
gunpla-app/
├── apps/
│   └── gunpla-app/           # Main application
│       ├── public/           # Static assets and PWA files
│       ├── src/
│       │   ├── app/          # App shell and routing
│       │   ├── components/   # Reusable UI components
│       │   ├── features/     # Feature-specific modules
│       │   ├── hooks/        # Custom React hooks
│       │   ├── lib/          # Core utilities
│       │   ├── stores/       # State management
│       │   └── styles/       # Global styles and themes
│       ├── tests/            # Application tests
│       └── project.json      # Nx project configuration
├── packages/
│   ├── types/                # Shared TypeScript definitions
│   ├── utils/                # Shared utilities
│   └── cli/                  # Command-line tools
├── docs/                     # Documentation
└── tools/                    # Build and development tools
```

### Technology Stack

#### Frontend Framework
- **React 19**: Latest React version with concurrent features
- **TypeScript 5.x**: Strict typing and modern JavaScript features
- **Nx Monorepo**: Scalable development and build system

#### UI and Styling
- **Mantine UI v7**: Component library with accessible components
- **Vanilla Extract**: CSS-in-JS with TypeScript support
- **React Icons**: Consistent icon system

#### Routing and Navigation
- **TanStack Router v7**: Type-safe routing with excellent DX
- **React Router DOM**: Browser navigation support

#### Data Management
- **Dexie**: IndexedDB wrapper for local storage
- **React Query**: Server state management (for future API integration)
- **Zustand**: Client state management

#### Build and Development
- **Vite**: Fast build tool and development server
- **Vitest**: Unit and integration testing
- **Playwright**: End-to-end testing
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting

### Data Architecture

#### Local Storage Strategy
The application uses IndexedDB through Dexie for persistent local storage:

```typescript
// Database schema
interface GunplaDatabase {
  kits: Table<GunplaKit>;
  categories: Table<Category>;
  tags: Table<Tag>;
  photos: Table<Photo>;
  settings: Table<AppSettings>;
}
```

#### Data Models

**GunplaKit**:
```typescript
interface GunplaKit {
  id: string;
  name: string;
  grade: 'HG' | 'RG' | 'MG' | 'PG' | 'MGSD' | 'RE' | 'SD';
  series: string;
  scale: string;
  manufacturer: 'Bandai' | 'Kotobukiya' | 'Other';
  price: number;
  releaseDate: Date;
  purchaseDate?: Date;
  buildStatus: 'Not Started' | 'In Progress' | 'Completed';
  completionDate?: Date;
  photos: Photo[];
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔧 Development Philosophy

### Offline-First Design
- All core functionality works without internet connectivity
- Data persists locally with automatic backup options
- Progressive enhancement for network-dependent features

### Accessibility First
- WCAG 2.1 AA compliance throughout the application
- Keyboard navigation support
- Screen reader compatibility
- High contrast and font size customization

### Performance Optimization
- Lazy loading of components and images
- Code splitting for reduced initial bundle size
- Optimistic updates for responsive UI
- Efficient data caching strategies

### Developer Experience
- TypeScript for type safety
- Hot module replacement during development
- Comprehensive testing setup
- Automated code quality checks

##  User Experience Design

### Responsive Design
- Mobile-first approach
- Touch-friendly interface elements
- Adaptive layouts for different screen sizes
- PWA installation prompts and app-like experience

### User Onboarding
- Interactive tutorial for new users
- Sample data for exploration
- Progressive disclosure of advanced features
- Contextual help and tooltips

### Internationalization
- Multi-language support (English, Japanese initially)
- Localized date and number formats
- RTL language support preparation

##  Deployment Strategy

### Static Site Deployment
The application is designed for static hosting on platforms like:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

### PWA Distribution
- Web App Manifest for browser installation
- App Store distribution (via PWA wrappers)
- Direct download options

## 📈 Scalability Considerations

### Data Volume
- Efficient indexing for large collections
- Pagination and virtual scrolling
- Data export/import functionality
- Archive features for completed projects

### Feature Expansion
- Plugin architecture for custom features
- Theming system for customization
- API integration for community features
- Social sharing capabilities

## 🔮 Future Roadmap

### Phase 1: Core Functionality
- [x] Basic collection management
- [x] Offline data storage
- [x] PWA installation
- [ ] Photo management
- [ ] Search and filtering

### Phase 2: Enhanced Features
- [ ] Build progress tracking
- [ ] Wishlist management
- [ ] Data export/import
- [ ] Custom themes

### Phase 3: Community Features
- [ ] Social sharing
- [ ] Community database
- [ ] Build galleries
- [ ] Event tracking

### Phase 4: Advanced Features
- [ ] 3D model viewer
- [ ] Build tutorials
- [ ] Price tracking
- [ ] Integration with retailers

## 🎯 Success Metrics

### User Engagement
- Daily active users
- Average session duration
- Feature adoption rates
- User retention

### Technical Performance
- Page load times (< 2 seconds)
- Time to interactive (< 3 seconds)
- Offline functionality success rate
- Crash rate (< 0.1%)

### Accessibility Compliance
- WCAG 2.1 AA audit scores
- Screen reader compatibility
- Keyboard navigation coverage
- User feedback on accessibility

## 📚 Related Documentation

- [Setup Guide](./setup-guide.md) - Get the development environment running
- [Architecture Overview](../architecture/architecture-overview.md) - Detailed technical architecture
- [Development Workflow](./development-workflow.md) - How to contribute to the project
- [API Documentation](../api/api-overview.md) - Internal API reference

---

**Last Updated**: 2025-12-04
**Version**: 1.0.0