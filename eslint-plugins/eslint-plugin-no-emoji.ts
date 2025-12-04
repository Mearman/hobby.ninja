import type { Rule } from 'eslint';

const noEmojiRule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow emoji characters in markdown files',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: undefined,
    schema: [],
    messages: {
      emojiFound: 'Emoji characters are not allowed in markdown files. Found: {{emoji}}',
    },
  },
  create(context: Rule.RuleContext) {
    // Comprehensive Unicode regex for emoji characters
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu;

    return {
      Program(node) {
        const source = context.getSourceCode().getText();

        // Find all emoji matches using traditional loop for compatibility
        const matches: Array<{ index: number; match: string }> = [];
        let regexMatch: RegExpExecArray | null;

        while ((regexMatch = emojiRegex.exec(source)) !== null) {
          matches.push({
            index: regexMatch.index,
            match: regexMatch[0],
          });
        }

        matches.forEach((matchItem) => {
          // Calculate line and column numbers
          const textBeforeMatch = source.substring(0, matchItem.index);
          const lines = textBeforeMatch.split('\n');
          const lineNumber = lines.length;
          const columnNumber = lines[lines.length - 1].length;

          context.report({
            node,
            loc: {
              start: { line: lineNumber, column: columnNumber },
              end: { line: lineNumber, column: columnNumber + matchItem.match.length },
            },
            messageId: 'emojiFound',
            data: {
              emoji: matchItem.match,
            },
          });
        });
      },
    };
  },
};

export const eslintPluginNoEmoji = {
  rules: {
    'no-emoji': noEmojiRule,
  },
};

export default eslintPluginNoEmoji;