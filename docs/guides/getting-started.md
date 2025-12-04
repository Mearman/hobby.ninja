# Getting Started

Welcome to the Gunpla App! This guide will help you get the application running on your local machine in just a few minutes.

##  Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x or higher
- **npm** 10.x or higher (comes with Node.js)
- **Git** for version control

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/gunpla-app.git
   cd gunpla-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:4200](http://localhost:4200)

That's it! You now have the Gunpla App running locally.

##  System Requirements

### Minimum Requirements
- **Node.js**: 20.11.0 or higher
- **Memory**: 4GB RAM
- **Storage**: 500MB free disk space
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Recommended Requirements
- **Node.js**: Latest LTS version
- **Memory**: 8GB RAM
- **Storage**: 2GB free disk space
- **Browser**: Latest version of Chrome, Firefox, Safari, or Edge

### Supported Platforms
- **Operating Systems**: Windows 10+, macOS 10.15+, Ubuntu 20.04+
- **Mobile Devices**: iOS 14.4+, Android 8.0+

##  Development Setup

### For Detailed Setup

For a comprehensive development environment setup, including IDE configuration, linting, and testing tools, please refer to our [Setup Guide](./setup-guide.md).

### IDE Extensions (Recommended)

We recommend installing these extensions for the best development experience:

#### Visual Studio Code
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "nrwl.angular-console",
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "ms-vscode-remote.remote-containers"
  ]
}
```

#### WebStorm/IntelliJ IDEA
- TypeScript and JavaScript language features
- Prettier plugin for code formatting
- ESLint plugin for code quality

## 📦 Project Structure

Once installed, you'll see this structure:

```
gunpla-app/
├── apps/
│   └── gunpla-app/           # Main application
├── packages/
│   ├── types/                # Shared TypeScript definitions
│   ├── utils/                # Shared utilities
│   └── cli/                  # Command-line tools
├── docs/                     # Documentation
├── tools/                    # Build and development tools
├── nx.json                   # Nx configuration
├── package.json              # Dependencies and scripts
└── tsconfig.base.json        # TypeScript configuration
```

## 🎯 First Steps with the App

### 1. Add Your First Gunpla Kit

1. Click the "Add Kit" button on the main dashboard
2. Fill in the kit details:
   - **Name**: "RX-78-2 Gundam"
   - **Grade**: "MG" (Master Grade)
   - **Series**: "Mobile Suit Gundam"
   - **Scale**: "1/100"
3. Click "Save" to add it to your collection

### 2. Explore the Interface

- **Dashboard**: Overview of your collection statistics
- **Collection**: Browse all your kits
- **Wishlist**: Kits you want to acquire
- **Settings**: Configure app preferences

### 3. Try PWA Features

1. Click the install icon in your browser's address bar
2. Install the app to your device
3. Try using it offline - it works without internet!

## 🔧 Common Commands

Here are the most commonly used commands during development:

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Clean build artifacts
npm run clean
```

##  Testing on Mobile

To test the PWA features on your mobile device:

1. Ensure your computer and mobile device are on the same Wi-Fi network
2. Find your computer's local IP address:
   ```bash
   # On macOS/Linux
   ipconfig getifaddr en0

   # On Windows
   ipconfig
   ```
3. Access the app on your mobile device using the IP address:
   ```
   http://YOUR_IP_ADDRESS:4200
   ```

## 🐛 Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill processes using port 4200
npx kill-port 4200

# Or use a different port
npm run dev -- --port 4300
```

**Node.js version mismatch**
```bash
# Check your Node.js version
node --version

# Update Node.js using nvm
nvm install 20
nvm use 20
```

**Dependency installation fails**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Build fails with TypeScript errors**
```bash
# Check for TypeScript errors
npm run type-check

# Auto-fix linting issues
npm run lint:fix
```

### Getting Help

If you encounter any issues not covered here:

1. Check our [Troubleshooting Guide](../troubleshooting/common-issues.md)
2. Search [existing issues](https://github.com/your-username/gunpla-app/issues)
3. [Create a new issue](https://github.com/your-username/gunpla-app/issues/new) with details about your problem

## 📚 Next Steps

Now that you have the app running, here are some suggested next steps:

1. **Read the Documentation**: Explore our comprehensive [documentation](../README.md)
2. **Understand the Architecture**: Learn about our [technical architecture](../architecture/architecture-overview.md)
3. **Contribute**: See our [development workflow](./development-workflow.md) to contribute
4. **Explore Features**: Check out our [feature documentation](../guides/features/README.md)

## 🎉 Welcome to the Community!

We're excited to have you here! Here are some ways to get involved:

- **Star the repository** on GitHub if you find it useful
- **Join our discussions** for questions and ideas
- **Contribute code** or documentation
- **Report bugs** and request features
- **Share your feedback** about your experience

##  Support

- **Documentation**: [Full documentation](../README.md)
- **Issues**: [GitHub Issues](https://github.com/your-username/gunpla-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/gunpla-app/discussions)
- **Email**: support@gunpla-app.com

---

**Need more help?** Check out our [FAQ](../troubleshooting/faq.md) or [contact us](mailto:support@gunpla-app.com).

**Happy building!** 🤖✨

---

**Last Updated**: 2025-12-04
**Version**: 1.0.0