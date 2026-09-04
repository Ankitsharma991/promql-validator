import type { Suggestion, SuggestionContext, SuggestionProvider, SuggestionProviderOptions } from '../suggestions/types.js';

/**
 * Combines several async suggestion providers (typically one per plugin) into a single
 * provider that runs them concurrently and flattens the results — a provider that throws
 * or rejects doesn't take the others down with it (isolated per-provider, logged to the
 * console rather than silently swallowed, consistent with never crashing the host app on
 * untrusted/fallible async work).
 */
export function combineSuggestionProviders(providers: SuggestionProvider[]): SuggestionProvider {
  return async (context: SuggestionContext, options: SuggestionProviderOptions): Promise<Suggestion[]> => {
    const results = await Promise.allSettled(providers.map((p) => p(context, options)));
    const out: Suggestion[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') out.push(...r.value);
      else if (!(r.reason instanceof Error) || r.reason.name !== 'AbortError') {
        // eslint-disable-next-line no-console
        console.error('[promql-validator] a plugin suggestionProvider rejected:', r.reason);
      }
    }
    return out;
  };
}
