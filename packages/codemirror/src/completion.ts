import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { getSuggestions, type Suggestion, type SuggestionSources, type GetSuggestionsOptions } from '@promql-validator/core';

export interface PromQLCompletionOptions {
  sources?: SuggestionSources;
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

function toCompletion(s: Suggestion): Completion {
  return {
    label: s.label,
    apply: s.insertText?.replace(/\$0/g, '') ?? s.value,
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
  return (context: CompletionContext): CompletionResult | null => {
    const text = context.state.doc.toString();
    const pos = context.pos;
    const results = getSuggestions(text, pos, options.sources, options.engineOptions);
    if (results.length === 0 && !context.explicit) return null;

    const wordMatch = context.matchBefore(/[a-zA-Z_][a-zA-Z0-9_:]*/);
    const from = wordMatch ? wordMatch.from : pos;

    return {
      from,
      options: results.map(toCompletion),
      validFor: /^[a-zA-Z0-9_:]*$/,
    };
  };
}
