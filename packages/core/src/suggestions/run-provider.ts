import { sanitizeResults } from './async-controller.js';
import type { Suggestion, SuggestionContext, SuggestionProvider } from './types.js';

/**
 * Calls a host `suggestionProvider` once and returns sanitized suggestions (malformed entries
 * dropped, long strings capped). A provider that throws or rejects yields `[]` rather than
 * breaking completion. Used by the Monaco and CodeMirror adapters; the React component uses
 * `AsyncSuggestionController`, which adds debouncing and caching on top.
 */
export async function runSuggestionProvider(provider: SuggestionProvider, context: SuggestionContext, signal: AbortSignal): Promise<Suggestion[]> {
  try {
    const result = await provider(context, { signal });
    return signal.aborted ? [] : sanitizeResults(result);
  } catch {
    return [];
  }
}
