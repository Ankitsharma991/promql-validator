import type { languages } from 'monaco-editor';
import { PROMQL_FUNCTIONS } from '@promql-validator/core';
import { PROMQL_AGGREGATIONS } from '@promql-validator/core';

const FUNCTION_NAMES = PROMQL_FUNCTIONS.map((f) => f.name);
const AGGREGATION_NAMES = PROMQL_AGGREGATIONS.map((a) => a.name);
const KEYWORDS = ['by', 'without', 'on', 'ignoring', 'group_left', 'group_right', 'offset', 'bool', 'and', 'or', 'unless'];

/** A Monarch tokenizer definition — basic, deliberately not a full grammar (Monarch is a
 * regex-based lexer, not a parser; real validation/diagnostics come from `@promql-validator/core`
 * via markers, not from this highlighting layer). */
export const monarchLanguage: languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.promql',
  keywords: KEYWORDS,
  functions: FUNCTION_NAMES,
  aggregations: AGGREGATION_NAMES,
  operators: ['+', '-', '*', '/', '%', '^', '==', '!=', '<=', '<', '>=', '>', '=~', '!~', '='],

  tokenizer: {
    root: [
      [/[a-zA-Z_][a-zA-Z0-9_:]*/, { cases: { '@keywords': 'keyword', '@functions': 'predefined', '@aggregations': 'keyword.aggregation', '@default': 'identifier' } }],
      { include: '@whitespace' },
      [/\d+(\.\d+)?([eE][+-]?\d+)?(ms|ns|us|µs|s|m|h|d|w|y)?/, 'number'],
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

/** Basic editor language configuration (bracket auto-closing, comment toggling is N/A for
 * PromQL since it has no in-expression comment syntax — see PRD Part 13.1). */
export const languageConfiguration: languages.LanguageConfiguration = {
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
