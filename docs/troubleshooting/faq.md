# Frequently Asked Questions (FAQ)

This FAQ covers common questions about the Gunpla App, from basic usage to advanced technical topics.

##  Table of Contents

- [General Questions](#general-questions)
- [Installation and Setup](#installation-and-setup)
- [Features and Usage](#features-and-usage)
- [Data and Storage](#data-and-storage)
- [PWA and Offline](#pwa-and-offline)
- [Development and Contributing](#development-and-contributing)
- [Troubleshooting](#troubleshooting)
- [Technical Support](#technical-support)

---

## ❓ General Questions

### Q: What is the Gunpla App?

**A:** The Gunpla App is a Progressive Web Application (PWA) designed for Gundam model kit enthusiasts to manage, track, and organize their collections. It's built as an offline-first application, meaning all data is stored locally on your device and you can use it without an internet connection.

### Q: Is the Gunpla App free?

**A:** Yes! The Gunpla App is completely free and open-source. There are no hidden costs, premium features, or subscriptions required.

### Q: Do I need an account to use the app?

**A:** No account required! Since the app stores all data locally on your device using IndexedDB, you can start using it immediately without registration.

### Q: Can I use the app on multiple devices?

**A:** Currently, each device maintains its own local database. We're working on synchronization features for multi-device support. For now, you can export your data and import it on another device.

### Q: Is my data private?

**A:** Yes! All data is stored locally on your device and never sent to any servers. The app doesn't collect personal information or usage analytics (unless you explicitly enable them).

---

##  Installation and Setup

### Q: How do I install the Gunpla App?

**A:** You have several options:

1. **Web App**: Visit the website and use it directly in your browser
2. **PWA Installation**: Click the install icon in your browser's address bar
3. **Direct Download**: Download the app for your platform from our releases page

### Q: What browsers are supported?

**A:** The Gunpla App works on all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Q: Can I use the app on mobile devices?

**A:** Absolutely! The app is fully responsive and works great on phones and tablets. You can also install it as a native app on iOS and Android.

### Q: Do I need to install anything to use the app?

**A:** No installation is required to use the web version. However, installing it as a PWA provides a better experience with offline access and app-like behavior.

### Q: What are the system requirements?

**A:** Minimum requirements:
- **Browser**: Any modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Memory**: 4GB RAM recommended
- **Storage**: 100MB available space for data and photos
- **Internet**: Required for initial installation, optional for use

---

## 🎯 Features and Usage

### Q: What types of Gundam kits can I track?

**A:** You can track all types of Gundam model kits:
- **Grades**: HG, RG, MG, PG, SD, EG, RE/100, MGSD
- **Manufacturers**: Bandai, Kotobukiya, Dragon Momoko, and others
- **Scales**: 1/144, 1/100, 1/60, 1/48, and custom scales
- **Series**: All Gundam series from 1979 to present

### Q: Can I add photos to my kits?

**A:** Yes! You can add multiple photos to each kit, including:
- Box art photos
- Build progress pictures
- Completed model photos
- Detail shots
- Comparison photos

Photos are stored locally and optimized automatically.

### Q: How do I organize my collection?

**A:** You can organize your collection using:
- **Categories**: Create custom categories for different types of kits
- **Tags**: Add descriptive tags for easy searching
- **Filters**: Filter by grade, manufacturer, scale, build status
- **Search**: Powerful search across all kit properties
- **Sorting**: Sort by name, date, grade, price, and custom criteria

### Q: Can I track my build progress?

**A:** Yes! The app includes comprehensive build tracking:
- **Build Status**: Not Started, In Progress, On Hold, Completed
- **Build Logs**: Detailed logs of your building sessions
- **Time Tracking**: Track time spent on each build
- **Materials**: Keep track of paints, tools, and materials used
- **Photos**: Document your build progress with photos

### Q: Does the app support wishlists?

**A:** Yes! You can create wishlists of kits you want to acquire:
- Separate wishlist from your main collection
- Add desired kits with price tracking
- Set purchase reminders
- Move kits from wishlist to collection when purchased

### Q: Can I import/export my data?

**A:** Yes! The app supports data import/export:
- **Export formats**: JSON, CSV, Excel
- **Import formats**: JSON, CSV
- **Backup**: Create automatic backups
- **Restore**: Restore from backups
- **Migration**: Migrate data between devices

---

## 💾 Data and Storage

### Q: Where is my data stored?

**A:** All data is stored locally on your device using IndexedDB, a browser-based database system. This means:
- Your data is private and secure
- The app works offline
- No internet connection required
- Data persists between sessions

### Q: How much data can I store?

**A:** Storage limits depend on your browser and device:
- **Chrome/Edge**: Typically unlimited with user permission
- **Firefox**: Usually 2GB+ with user permission
- **Safari**: Around 1GB limit
- **Mobile**: Varies by device, typically 500MB+

The app will notify you when storage is running low.

### Q: Will I lose my data if I clear my browser cache?

**A:** No! IndexedDB data is separate from browser cache and won't be cleared when you clear cache. However, clearing all site data will remove your app data. Always export a backup before clearing site data.

### Q: Can I backup my data?

**A:** Yes! We recommend regular backups:
- **Manual Backup**: Export your data anytime from settings
- **Auto Backup**: Configure automatic backups
- **Cloud Backup**: Save backup files to cloud storage
- **Multiple Versions**: Keep multiple backup versions

### Q: How do I restore my data from a backup?

**A:** Restoring data is simple:
1. Go to Settings → Data Management
2. Click "Import Data"
3. Select your backup file
4. Choose import options (merge or replace)
5. Confirm the import

---

##  PWA and Offline

### Q: What is a Progressive Web App (PWA)?

**A:** A PWA is a web application that provides a native app-like experience:
- Installable on your device
- Works offline
- Fast and reliable
- Supports push notifications
- Accessible from your home screen

### Q: How do I install the app as a PWA?

**A:** Installation varies by device:

**Desktop (Chrome/Edge):**
1. Visit the app website
2. Click the install icon (⊕) in the address bar
3. Click "Install"

**Mobile (Chrome):**
1. Visit the app website
2. Tap the menu (⋮) and select "Add to Home screen"
3. Tap "Add"

**iOS Safari:**
1. Visit the app website
2. Tap Share (□↑)
3. Select "Add to Home Screen"
4. Tap "Add"

### Q: Does the app work offline?

**A:** Yes! The app is designed to work completely offline:
- View and edit your collection
- Add new kits and photos
- Search and filter
- All features work without internet

Changes made offline will sync when you're back online (if cloud sync is enabled).

### Q: What features work offline?

**A**: Nearly all features work offline:
- ✅ View and manage collection
- ✅ Add/edit kits
- ✅ Add photos
- ✅ Search and filter
- ✅ Build tracking
- ❌ Cloud sync (obviously needs internet)
- ❌ External data import (for some formats)

### Q: How do I update the PWA?

**A:** PWA updates happen automatically:
- App checks for updates when launched
- Updates download in the background
- You'll be notified when an update is ready
- Click the update notification to refresh

You can also manually check for updates in the settings.

---

## 👨‍💻 Development and Contributing

### Q: Is the Gunpla App open source?

**A:** Yes! The Gunpla App is fully open source and available on GitHub. We welcome contributions from the community.

### Q: How can I contribute to the project?

**A:** There are many ways to contribute:
- **Code**: Submit pull requests for new features and bug fixes
- **Documentation**: Improve documentation and help guides
- **Testing**: Report bugs and test new features
- **Design**: Suggest UI/UX improvements
- **Translation**: Help translate the app to other languages
- **Feedback**: Provide feedback and suggestions

### Q: What technology stack does the app use?

**A:** The Gunpla App is built with:
- **Frontend**: React 19 with TypeScript
- **Build System**: Nx monorepo with Vite
- **UI Library**: Mantine UI
- **Routing**: TanStack Router
- **Storage**: IndexedDB via Dexie
- **Styling**: Vanilla Extract CSS-in-JS
- **Testing**: Vitest + Playwright

### Q: How do I set up a development environment?

**A:** See our [Setup Guide](../guides/setup-guide.md) for detailed instructions:
1. Clone the repository
2. Install Node.js 20+
3. Install dependencies with npm
4. Start the development server
5. Follow the development workflow

### Q: Can I request new features?

**A:** Absolutely! We love feature requests:
1. Check existing GitHub issues first
2. Create a new issue with "Feature Request" label
3. Describe the feature in detail
4. Explain why it would be useful
5. Provide mockups or examples if possible

---

## 🔧 Troubleshooting

### Q: The app is running slowly. What can I do?

**A:** Try these performance improvements:
1. **Clear cache**: Clear browser cache and restart the app
2. **Reduce data**: Archive old or unused kits
3. **Optimize photos**: Compress large images
4. **Update browser**: Ensure you're using the latest browser version
5. **Restart app**: Close and reopen the app

### Q: The app isn't loading. What should I do?

**A:** Try these steps:
1. **Check internet**: Ensure you have internet for initial load
2. **Clear cache**: Clear browser cache and cookies
3. **Try another browser**: Test in a different browser
4. **Check console**: Open developer tools for error messages
5. **Disable extensions**: Some browser extensions may interfere

### Q: I lost my data. Can I recover it?

**A:** Data recovery options:
1. **Check backups**: Look for automatic backup files
2. **Cloud sync**: If you enabled cloud sync, check there
3. **Browser storage**: Check if data exists in another browser
4. **Device backup**: Check device backup (iCloud, Google Drive, etc.)

**Always keep regular backups to prevent data loss!**

### Q: Photos aren't loading correctly. What's wrong?

**A:** Photo issues solutions:
1. **Check file format**: Use JPG, PNG, or WebP formats
2. **Check file size**: Keep images under 10MB
3. **Clear photo cache**: Clear the photo cache in settings
4. **Check permissions**: Ensure browser has file access permissions
5. **Try re-uploading**: Delete and re-upload problematic photos

### Q: The app won't install as PWA. Why?

**A:** PWA installation issues:
1. **Browser support**: Ensure your browser supports PWA installation
2. **HTTPS requirement**: PWA requires HTTPS (localhost is exception)
3. **Service worker**: Check that service worker is registered
4. **Manifest**: Verify the web app manifest is accessible
5. **Try refresh**: Refresh the page and try again

### Q: Build/install failed during development. What's wrong?

**A:** Common development issues:
1. **Node version**: Ensure you have Node.js 20+
2. **Dependencies**: Try `npm install` to refresh dependencies
3. **Clear cache**: Run `npm run clean` and try again
4. **Permissions**: Check file permissions
5. **Check logs**: Look at error messages for specific issues

---

##  Technical Support

### Q: Where can I get help?

**A:** Multiple support channels:
- **Documentation**: Check our comprehensive documentation first
- **GitHub Issues**: Report bugs and request features
- **Community**: Join our Discord community for discussions
- **Email**: Contact support at support@gunpla-app.com
- **FAQ**: Check this FAQ and our troubleshooting guides

### Q: How do I report a bug?

**A:** When reporting bugs, include:
- **Description**: What happened and what you expected
- **Steps to reproduce**: Detailed reproduction steps
- **Environment**: Browser, OS, and app version
- **Screenshots**: Screenshots or screen recordings if helpful
- **Console errors**: Any error messages from browser console

### Q: Can I request a feature?

**A:** Yes! We welcome feature requests:
1. Check existing issues to avoid duplicates
2. Use "Feature Request" label
3. Provide clear description of the feature
4. Explain the use case and benefits
5. Include mockups or examples if possible

### Q: How can I stay updated with the app?

**A:** Stay connected:
- **GitHub**: Watch the repository for updates
- **Releases**: Subscribe to GitHub releases
- **Newsletter**: Sign up for our newsletter
- **Social Media**: Follow us on social platforms
- **In-App**: Check the app settings for update notifications

### Q: Is there a community forum?

**A:** Yes! Join our community:
- **Discord**: Real-time discussions and help
- **GitHub Discussions**: Feature requests and general discussions
- **Reddit**: r/Gunpla for general Gundam discussions
- **Twitter/X**: Follow for updates and announcements

---

## 🔗 Additional Resources

### Documentation
- [Getting Started Guide](../guides/getting-started.md)
- [Setup Guide](../guides/setup-guide.md)
- [Troubleshooting Guide](./common-issues.md)
- [API Documentation](../api/api-overview.md)

### Community
- [GitHub Repository](https://github.com/your-username/gunpla-app)
- [Discord Server](https://discord.gg/gunpla-app)
- [Reddit Community](https://reddit.com/r/Gunpla)

### Support
- [Bug Reports](https://github.com/your-username/gunpla-app/issues)
- [Feature Requests](https://github.com/your-username/gunpla-app/issues/new?template=feature_request.md)
- [Email Support](mailto:support@gunpla-app.com)

---

**Still have questions?** Don't hesitate to reach out through any of our support channels. We're here to help!

**Last Updated**: 2025-12-04
**Version**: 1.0.0