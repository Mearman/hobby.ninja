# PWA (Progressive Web App) Configuration

This document explains the Progressive Web App implementation for the hobby.ninja.

##  PWA Features

### Core PWA Capabilities
- **Offline Support**: Full app functionality when offline
- **App Installation**: Installable as a native app on desktop and mobile
- **App Shortcuts**: Quick access to key app features
- **Background Sync**: Sync data when connection is restored
- **Push Notifications**: Receive updates about your collection
- **Automatic Updates**: Seamlessly update to new versions

### App Shortcuts
The PWA includes 4 app shortcuts for quick access:
- **My Collection**: View and manage your Gunpla collection
- **Search Kits**: Search for Gundam model kits
- **Wishlist**: Manage your wishlist of kits to buy
- **Build Progress**: Track your current build progress

##  Architecture

### File Structure
```
public/
├── manifest.json              # PWA manifest configuration
├── sw.js                      # Service worker (offline support)
├── offline.html               # Offline fallback page
├── browserconfig.xml          # Windows/Edge configuration
├── robots.txt                 # SEO configuration
├── icons/                     # App icons in various sizes
│   ├── icon-72x72.svg
│   ├── icon-96x96.svg
│   ├── icon-128x128.svg
│   ├── icon-144x144.svg
│   ├── icon-152x152.svg
│   ├── icon-192x192.svg
│   ├── icon-384x384.svg
│   ├── icon-512x512.svg
│   ├── maskable-icon-192x192.svg
│   ├── maskable-icon-512x512.svg
│   ├── shortcut-collection-96x96.svg
│   ├── shortcut-search-96x96.svg
│   ├── shortcut-wishlist-96x96.svg
│   ├── shortcut-builds-96x96.svg
│   └── generate-icons.cjs     # Icon generation script
├── splash/                    # Splash screens for various devices
│   ├── splash-640x1136.svg
│   ├── splash-750x1334.svg
│   ├── splash-1125x2436.svg
│   ├── splash-1242x2208.svg
│   ├── splash-1536x2048.svg
│   ├── splash-1668x2224.svg
│   └── splash-2048x2732.svg
└── screenshots/               # App store screenshots
    ├── desktop-1.svg
    ├── desktop-2.svg
    ├── mobile-1.svg
    └── mobile-2.svg
```

### Service Worker Configuration
The service worker (`sw.js`) implements multiple caching strategies:

- **Static Assets**: Cache-first strategy for CSS, JS, images
- **HTML Pages**: Network-first strategy with offline fallback
- **API Requests**: Network-first with 5-minute cache
- **External Fonts**: Cache-first with 1-year expiration
- **CDN Resources**: Cache-first for performance

### PWA Manifest Configuration
Key manifest settings:
- **Display Mode**: Standalone (app-like experience)
- **Orientation**: Portrait-primary (mobile-optimized)
- **Theme Color**: #dc2626 (matching app theme)
- **Background Color**: #1a1a1a (dark theme)
- **Start URL**: / (app homepage)
- **Scope**: / (entire app)

##  Installation

### Automatic Installation
1. Visit the app in a compatible browser (Chrome, Edge, Firefox, Safari)
2. Look for the install icon in the address bar
3. Click "Install" to add the app to your device

### Manual Installation
**Chrome/Edge:**
- Click the menu (⋮) → "Install hobby.ninja"

**Firefox:**
- The install prompt will appear automatically

**Safari (iOS):**
- Tap Share → "Add to Home Screen"

## 🔄 Updates

### Automatic Updates
The PWA automatically checks for updates in the background:
- Service worker updates are downloaded automatically
- Users are prompted when updates are ready
- Updates install when the app is restarted

### Manual Updates
- Restart the app to check for updates
- Updates can be forced from the update banner

## 📊 Performance

### Caching Strategy
- **Static Resources**: 30-day cache for optimal performance
- **Images**: 7-day cache with background refresh
- **API Data**: 5-minute cache for fresh data
- **Fonts**: 1-year cache for consistency

### Offline Experience
- All static assets available offline
- Cached collection data accessible
- Functional offline page with retry options
- Background sync when connection restored

## 🔧 Development

### Icon Generation
To regenerate icons and assets:
```bash
cd public/icons
node generate-icons.cjs
```

### PWA Testing
Test PWA functionality in Chrome DevTools:
1. Open DevTools → Application tab
2. Check "Manifest" for PWA properties
3. Test "Service Workers" for caching
4. Use "Storage" to inspect cached content

### Service Worker Debugging
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(console.log);
navigator.serviceWorker.controller.postMessage({type: 'SKIP_WAITING'});
```

##  Browser Support

### Desktop Browsers
- ✅ Chrome 80+
- ✅ Edge 80+
- ✅ Firefox 75+
- ⚠️ Safari (limited support)

### Mobile Browsers
- ✅ Chrome Mobile 80+
- ✅ Samsung Internet 12+
- ✅ Firefox Mobile 79+
- ✅ Safari 14.3+ (iOS)
- ✅ Edge Mobile 80+

### Feature Support
- ✅ Service Workers
- ✅ Web App Manifest
- ✅ Background Sync
- ✅ Push Notifications
- ✅ App Badges (Chrome/Edge)
- ✅ App Shortcuts (Chrome/Edge)

##  Security

### Content Security Policy
- Strict CSP headers configured
- Only allows resources from trusted origins
- Prevents XSS and injection attacks

### Service Worker Security
- Only caches same-origin resources
- External CDN resources explicitly whitelisted
- No access to sensitive APIs

## 📈 Analytics

### PWA Metrics
Track PWA-specific metrics:
- Installation rate
- Update frequency
- Offline usage patterns
- Shortcut usage statistics

### Performance Monitoring
- Cache hit rates
- Offline fallback usage
- Service worker response times
- Background sync success rates

##  Troubleshooting

### Common Issues

**App won't install:**
- Check HTTPS is enabled (required for PWA)
- Verify manifest.json is accessible
- Ensure service worker is registered

**Service worker not updating:**
- Clear browser cache and data
- Check for registration errors in console
- Verify service worker scope is correct

**Offline content not loading:**
- Check cache storage in DevTools
- Verify assets are precached
- Test network conditions in DevTools

**Update not applying:**
- Force refresh with Ctrl+Shift+R
- Check for conflicting service workers
- Verify update prompt is working

### Debug Commands
```javascript
// Clear all caches
caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))));

// Unregister service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});

// Trigger update check
if (navigator.serviceWorker.controller) {
  navigator.serviceWorker.controller.postMessage({type: 'UPDATE_NEEDED'});
}
```

## 📚 Resources

### Documentation
- [MDN Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [Google PWA Checklist](https://developers.google.com/web/progressive-web-apps/checklist)

### Tools
- [PWA Builder](https://www.pwabuilder.com/)
- [Lighthouse PWA Audit](https://developers.google.com/web/tools/lighthouse)
- [Service Worker Tools](https://github.com/GoogleChromeLabs/serviceworker-tools)

---

**Last Updated:** December 4, 2024
**Version:** 1.0.0