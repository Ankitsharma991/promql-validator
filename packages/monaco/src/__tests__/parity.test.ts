import { describe, expect, it, vi } from 'vitest';
import { getSuggestions } from '@promql-validator/core';
import { registerPromQLLanguage } from '../index.js';

// The adapter must offer exactly what core offers for the same text and cursor.
const CURSORS = ['rat', 'up{', 'up{job="', 'rate(x[', 'sum by (', 'up '];

function completionsFor(text: string): Promise<{ suggestions: Array<{ label: string }> }> {
  let provider: { provideCompletionItems: (...args: unknown[]) => unknown } | undefined;
  const disposable = { dispose: vi.fn() };
  const monaco = {
    languages: {
      getLanguages: () => [],
      register: vi.fn(),
      setMonarchTokensProvider: vi.fn(),
      setLanguageConfiguration: vi.fn(),
      registerCompletionItemProvider: (_id: string, p: typeof provider) => ((provider = p), disposable),
      CompletionItemKind: { Function: 1, Operator: 2, Keyword: 3, Value: 4, Property: 5, Text: 6, Variable: 7, EnumMember: 8 },
      CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
    },
    editor: { getModels: () => [], onDidCreateModel: () => disposable, setModelMarkers: vi.fn() },
    MarkerSeverity: { Error: 8, Warning: 4, Info: 2, Hint: 1 },
  };
  registerPromQLLanguage(monaco as never);
  const model = { getValue: () => text, getOffsetAt: () => text.length, getWordUntilPosition: () => ({ startColumn: 1, endColumn: 1 }) };
  return provider!.provideCompletionItems(model, { lineNumber: 1, column: text.length + 1 }, {}, { onCancellationRequested: vi.fn() }) as Promise<{ suggestions: Array<{ label: string }> }>;
}

describe('Monaco adapter parity with core', () => {
  it.each(CURSORS)('suggestions for %s', async (q) => {
    const { suggestions } = await completionsFor(q);
    expect(suggestions.map((s) => s.label)).toEqual(getSuggestions(q, q.length).map((s) => s.label));
  });
});
