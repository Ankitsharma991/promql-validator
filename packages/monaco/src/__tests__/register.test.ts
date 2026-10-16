import { describe, expect, it, vi } from 'vitest';
import { registerPromQLLanguage } from '../index.js';

/** Just enough of the `monaco` namespace for registerPromQLLanguage. */
function fakeMonaco() {
  let completionProvider: { provideCompletionItems: (...args: unknown[]) => unknown } | undefined;
  const disposable = { dispose: vi.fn() };
  const monaco = {
    languages: {
      getLanguages: () => [],
      register: vi.fn(),
      setMonarchTokensProvider: vi.fn(),
      setLanguageConfiguration: vi.fn(),
      registerCompletionItemProvider: vi.fn((_id: string, provider: typeof completionProvider) => {
        completionProvider = provider;
        return disposable;
      }),
      CompletionItemKind: { Function: 1, Operator: 2, Keyword: 3, Value: 4, Property: 5, Text: 6, Variable: 7, EnumMember: 8 },
      CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
    },
    editor: { getModels: () => [], onDidCreateModel: () => disposable, setModelMarkers: vi.fn() },
    MarkerSeverity: { Error: 8, Warning: 4, Info: 2, Hint: 1 },
  };
  return { monaco: monaco as never, getProvider: () => completionProvider! };
}

function fakeModel(text: string) {
  return {
    getValue: () => text,
    getOffsetAt: () => text.length,
    getWordUntilPosition: () => ({ startColumn: 1, endColumn: text.length + 1 }),
  };
}

describe('registerPromQLLanguage completion', () => {
  const position = { lineNumber: 1, column: 1 };
  const token = { onCancellationRequested: vi.fn() };

  it('offers built-ins plus host dynamic suggestions', async () => {
    const { monaco, getProvider } = fakeMonaco();
    registerPromQLLanguage(monaco, { sources: { dynamicSuggestions: [{ category: 'service', values: ['checkout'] }] } });
    const result = (await getProvider().provideCompletionItems(fakeModel('up{service="'), position, {}, token)) as { suggestions: Array<{ label: string }> };
    expect(result.suggestions.map((s) => s.label)).toContain('checkout');
  });

  it('awaits an async suggestionProvider and merges its results', async () => {
    const { monaco, getProvider } = fakeMonaco();
    const suggestionProvider = vi.fn(async () => [{ label: 'payments', value: 'payments', category: 'service' }]);
    registerPromQLLanguage(monaco, { suggestionProvider });
    const result = (await getProvider().provideCompletionItems(fakeModel('up{service="'), position, {}, token)) as { suggestions: Array<{ label: string }> };
    expect(suggestionProvider).toHaveBeenCalledTimes(1);
    expect(result.suggestions.map((s) => s.label)).toContain('payments');
  });
});
