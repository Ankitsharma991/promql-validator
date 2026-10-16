import type { Diagnostic, QuickFix } from '@promql-validator/core';

/**
 * Every user-facing string the component renders. Pass a partial override through the
 * `messages` prop to translate or reword any of them; anything you leave out falls back to
 * the English default. Diagnostic `code`s stay stable across languages, so branch on those in
 * code and use these only for display.
 */
export interface PromQLMessages {
  /** Accessible name of the suggestion list. */
  suggestionsLabel: string;
  /** Screen-reader announcement while the suggestion list is open. */
  suggestionsAvailable: (count: number) => string;
  noMatches: string;
  loading: string;
  loadError: string;
  /** Footer result count. */
  resultCount: (count: number) => string;
  hintNavigate: string;
  hintInsert: string;
  hintClose: string;
  /** Suggestion kind names (`function`, `metric`, `label`, ...), keyed by kind id. */
  kindLabels: Partial<Record<string, string>>;
  /** Tooltip of the valid-query indicator. */
  validQuery: string;
  /** "Show N more" button under the diagnostics list. */
  showMore: (count: number) => string;
  /** Tooltip on a diagnostic's `line:column` position. */
  position: (line: number, column: number) => string;
  /** Display text for a diagnostic. Return `undefined` to keep the built-in message. */
  diagnostic: (diagnostic: Diagnostic) => string | undefined;
  /** Label of a quick-fix button. Return `undefined` to keep the built-in label. */
  quickFix: (fix: QuickFix) => string | undefined;
}

export const defaultMessages: PromQLMessages = {
  suggestionsLabel: 'Suggestions',
  suggestionsAvailable: (count) => `${count} suggestion${count === 1 ? '' : 's'} available`,
  noMatches: 'No matches',
  loading: 'Loading…',
  loadError: "Couldn't load suggestions.",
  resultCount: (count) => `${count} ${count === 1 ? 'result' : 'results'}`,
  hintNavigate: 'navigate',
  hintInsert: 'insert',
  hintClose: 'close',
  kindLabels: {},
  validQuery: 'Valid query',
  showMore: (count) => `Show ${count} more`,
  position: (line, column) => `Line ${line}, column ${column}`,
  diagnostic: () => undefined,
  quickFix: () => undefined,
};

export function resolveMessages(overrides: Partial<PromQLMessages> | undefined): PromQLMessages {
  return overrides ? { ...defaultMessages, ...overrides } : defaultMessages;
}
