# ESLint Custom Plugins

This directory contains custom ESLint plugins for the hobby.ninja project.

## Structure

```
eslint-plugins/
├── README.md                           # This file
├── index.ts                            # Plugin exports and index
├── eslint-plugin-no-emoji.ts          # Emoji detection plugin
└── [future-plugins].ts                # Additional custom plugins
```

## Available Plugins

### no-emoji

Detects and bans emoji characters in markdown files.

**Rule:** `no-emoji/no-emoji`

**Configuration:**
- Automatically configured for all `**/*.md` files
- Also applies to code blocks extracted from markdown files
- Reports errors with precise location and the specific emoji found

**Example:**
```markdown
# This will trigger an error
This document has emoji 😊 and 🚀
```

Error output:
```
error: Emoji characters are not allowed in markdown files. Found: 😊 no-emoji/no-emoji
```

## Adding New Plugins

1. Create your plugin file: `eslint-plugin-[name].ts`
2. Export it as default following the ESLint plugin format
3. Add it to `index.ts` exports
4. Import and configure it in `../eslint.config.ts`

### Plugin Template

```typescript
import type { Rule } from 'eslint';

const newRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Description of your rule',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code' | null | undefined,
    schema: [],
    messages: {
      messageId: 'Error message description',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      // Your rule implementation
    };
  },
};

export default {
  rules: {
    'rule-name': newRule,
  },
};
```

## Usage in ESLint Configuration

```typescript
import { eslintPluginNoEmoji } from './eslint-plugins';

// Add to configuration
{
  files: ['**/*.md'],
  plugins: {
    'no-emoji': eslintPluginNoEmoji,
  },
  rules: {
    'no-emoji/no-emoji': 'error',
  },
}
```

