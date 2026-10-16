import type { languages } from 'monaco-editor';
import { PROMQL_AGGREGATIONS, PROMQL_FUNCTIONS } from '@promql-validator/core';

const FUNCTION_NAMES = PROMQL_FUNCTIONS.map((f) => f.name);
const AGGREGATION_NAMES = PROMQL_AGGREGATIONS.map((a) => a.name);
const KEYWORDS = ['by', 'without', 'on', 'ignoring', 'group_left', 'group_right', 'offset', 'bool', 'and', 'or', 'unless', 'atan2'];

/** Monarch tokenizer for highlighting only. Monarch is regex-based, so validation and
 * diagnostics come from `@promql-validator/core` (as markers), not from this layer. */
export const monarchLanguage: languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.promql',
  keywords: KEYWORDS,
  functions: FUNCTION_NAMES,
  aggregations: AGGREGATION_NAMES,
  operators: ['+', '-', '*', '/', '%', '^', '==', '!=', '<=', '<', '>=', '>', '=~', '!~', '='],

  tokenizer: {
    root: [
      [/#.*$/, 'comment'],
      [/[a-zA-Z_][a-zA-Z0-9_:]*/, { cases: { '@keywords': 'keyword', '@functions': 'predefined', '@aggregations': 'keyword.aggregation', '@default': 'identifier' } }],
      { include: '@whitespace' },
      [/0[xX]_?[0-9a-fA-F][0-9a-fA-F_]*/, 'number'],
      [/(\d+(ms|s|m|h|d|w|y))+/, 'number'],
      [/(\d[\d_]*)?\.?\d[\d_]*([eE][+-]?\d+)?/, 'number'],
      [/"([^"\\]|\\.)*"/, 'string'],
      [/'([^'\\]|\\.)*'/, 'string'],
      [/`[^`]*`/, 'string'],
      [/[{}()[\]]/, '@brackets'],
      [/[<>=!~]+/, 'operator'],
      [/[+\-*/%^]/, 'operator'],
      [/[,:@]/, 'delimiter'],
    ],
    whitespace: [[/[ \t\r\n]+/, 'white']],
  },
};

/** Editor language configuration: `#` line comments and bracket/quote auto-closing. */
export const languageConfiguration: languages.LanguageConfiguration = {
  comments: { lineComment: '#' },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '`', close: '`' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
};
