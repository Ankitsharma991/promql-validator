export interface EditorSelection {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface PairingResult {
  value: string;
  cursorStart: number;
  cursorEnd: number;
  /** true when the default keypress should be suppressed (we already applied the edit) */
  handled: true;
}

const BRACKET_PAIRS: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
const QUOTE_PAIRS: Record<string, string> = { '"': '"', "'": "'", '`': '`' };
const ALL_OPENERS: Record<string, string> = { ...BRACKET_PAIRS, ...QUOTE_PAIRS };
const CLOSERS = new Set(Object.values(ALL_OPENERS));

export interface BracketPairingOptions {
  autoCloseBrackets: boolean;
  autoCloseQuotes: boolean;
}

/**
 * Pure state-transition logic for bracket/quote auto-completion (PRD Part 15.2). Kept
 * independent of React so it's directly unit-testable and reusable by any future
 * editor-shell binding (Monaco/CodeMirror adapters).
 */
export function handleTypedCharacter(key: string, ctx: EditorSelection, options: BracketPairingOptions): PairingResult | null {
  const { value, selectionStart, selectionEnd } = ctx;
  const hasSelection = selectionStart !== selectionEnd;

  const isBracketOpener = Object.prototype.hasOwnProperty.call(BRACKET_PAIRS, key);
  const isQuoteOpener = Object.prototype.hasOwnProperty.call(QUOTE_PAIRS, key);

  if ((isBracketOpener && options.autoCloseBrackets) || (isQuoteOpener && options.autoCloseQuotes)) {
    const closer = ALL_OPENERS[key]!;
    if (hasSelection) {
      const selected = value.slice(selectionStart, selectionEnd);
      const before = value.slice(0, selectionStart);
      const after = value.slice(selectionEnd);
      const newValue = `${before}${key}${selected}${closer}${after}`;
      const cursor = selectionStart + 1 + selected.length;
      return { value: newValue, cursorStart: cursor, cursorEnd: cursor, handled: true };
    }
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionStart);
    const newValue = `${before}${key}${closer}${after}`;
    return { value: newValue, cursorStart: selectionStart + 1, cursorEnd: selectionStart + 1, handled: true };
  }

  if (CLOSERS.has(key) && !hasSelection) {
    const nextChar = value[selectionStart];
    const bracketsEnabled = Object.values(BRACKET_PAIRS).includes(key) ? options.autoCloseBrackets : options.autoCloseQuotes;
    if (bracketsEnabled && nextChar === key) {
      // Type-over: move past the existing closer instead of inserting a duplicate.
      return { value, cursorStart: selectionStart + 1, cursorEnd: selectionStart + 1, handled: true };
    }
  }

  return null;
}

/** Backspace between an empty, just-created pair deletes both characters as one unit. */
export function handleBackspace(ctx: EditorSelection, options: BracketPairingOptions): PairingResult | null {
  const { value, selectionStart, selectionEnd } = ctx;
  if (selectionStart !== selectionEnd || selectionStart === 0) return null;

  const prevChar = value[selectionStart - 1];
  const nextChar = value[selectionStart];
  if (!prevChar || !nextChar) return null;

  const expectedCloser = ALL_OPENERS[prevChar];
  if (!expectedCloser || expectedCloser !== nextChar) return null;

  const isBracket = Object.prototype.hasOwnProperty.call(BRACKET_PAIRS, prevChar);
  if (isBracket && !options.autoCloseBrackets) return null;
  if (!isBracket && !options.autoCloseQuotes) return null;

  const newValue = value.slice(0, selectionStart - 1) + value.slice(selectionStart + 1);
  return { value: newValue, cursorStart: selectionStart - 1, cursorEnd: selectionStart - 1, handled: true };
}
