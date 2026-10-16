import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';
import {
  extractContext,
  getSuggestions,
  runSuggestionProvider,
  type GetSuggestionsOptions,
  type Suggestion,
  type SuggestionProvider,
  type SuggestionSources,
} from '@promql-validator/core';

export interface PromQLCompletionOptions {
  /** Your own completion data: static `suggestions`, `dynamicSuggestions` groups, category settings. */
  sources?: SuggestionSources;
  /** Async completion source (e.g. label values from your metrics backend). Aborted when
   * CodeMirror abandons the completion request. */
  suggestionProvider?: SuggestionProvider;
  /** Ranking options such as `maxSuggestions`. */
  engineOptions?: GetSuggestionsOptions;
}

const CATEGORY_TYPE: Record<string, string> = {
  'promql-function': 'function',
  aggregation: 'function',
  operator: 'keyword',
  modifier: 'keyword',
  duration: 'constant',
  'label-name': 'property',
  'monitoring-term': 'text',
  metric: 'variable',
};

/** Inserts the suggestion and, for snippets like `rate($0)`, puts the cursor at `$0`. */
function applySnippet(text: string) {
  const caret = text.indexOf('$0');
  const insert = text.replace(/\$0/g, '');
  return (view: EditorView, _completion: Completion, from: number, to: number) => {
    view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + (caret === -1 ? insert.length : caret) }, userEvent: 'input.complete' });
  };
}

function toCompletion(s: Suggestion): Completion {
  return {
    label: s.label,
    apply: s.insertText?.includes('$0') ? applySnippet(s.insertText) : (s.insertText ?? s.value),
    type: (s.category && CATEGORY_TYPE[s.category]) || 'text',
    detail: s.detail,
    info: s.description,
    boost: typeof s.priority === 'number' ? s.priority : undefined,
  };
}

/**
 * A CodeMirror 6 `CompletionSource` — pass to `autocompletion({ override: [promqlCompletionSource(...)] })`
 * or use the bundled `promql()` extension, which wires this up automatically.
 */
export function promqlCompletionSource(options: PromQLCompletionOptions = {}) {
  function complete(context: CompletionContext, providedSuggestions?: Suggestion[]): CompletionResult | null {
    const text = context.state.doc.toString();
    const results = getSuggestions(text, context.pos, { ...options.sources, providedSuggestions }, options.engineOptions);
    if (results.length === 0 && !context.explicit) return null;

    const wordMatch = context.matchBefore(/[a-zA-Z_][a-zA-Z0-9_:]*/);
    return {
      from: wordMatch ? wordMatch.from : context.pos,
      options: results.map(toCompletion),
      validFor: /^[a-zA-Z0-9_:]*$/,
    };
  }

  // Synchronous unless an async provider is configured, so plain usage stays simple.
  return (context: CompletionContext): CompletionResult | null | Promise<CompletionResult | null> => {
    const provider = options.suggestionProvider;
    if (!provider) return complete(context);
    const controller = new AbortController();
    context.addEventListener('abort', () => controller.abort());
    return runSuggestionProvider(provider, extractContext(context.state.doc.toString(), context.pos), controller.signal).then((provided) =>
      context.aborted ? null : complete(context, provided),
    );
  };
}
