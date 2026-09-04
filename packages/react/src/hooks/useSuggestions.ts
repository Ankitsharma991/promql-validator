import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AsyncSuggestionController,
  AsyncSuggestionState,
  DynamicSuggestionGroup,
  Suggestion,
  SuggestionCategoryConfig,
  SuggestionContext,
  SuggestionInput,
  SuggestionProvider,
  extractContext,
  getSuggestionsForContext,
} from '@promql-validator/core';
import type { SuggestionCacheOptions } from '@promql-validator/core';

export interface UseSuggestionsArgs {
  value: string;
  cursorPosition: number;
  suggestions?: SuggestionInput[];
  dynamicSuggestions?: DynamicSuggestionGroup[];
  suggestionProvider?: SuggestionProvider;
  suggestionCategories?: SuggestionCategoryConfig;
  suggestionDebounceMs: number;
  suggestionProviderCache?: SuggestionCacheOptions | false;
  maxSuggestions: number;
  recentlyUsedValues?: string[];
  enabled: boolean;
  /** A controller owned elsewhere (PromQLSuggestionRegistryProvider) to subscribe to
   * instead of creating/disposing a private one — see that provider's docstring. */
  sharedController?: AsyncSuggestionController | null;
}

export interface UseSuggestionsResult {
  context: SuggestionContext;
  results: Suggestion[];
  loading: boolean;
  asyncError: unknown;
}

/**
 * Synchronous built-in/static/dynamic filtering runs on every keystroke (near-instant —
 * Part 27.1). Only the host's async provider, when supplied, is routed through the
 * debounced/cancellable `AsyncSuggestionController`; its results are merged in once they
 * resolve without blanking the already-known synchronous results (Part 30 `suggestions-loading`).
 */
export function useSuggestions(args: UseSuggestionsArgs): UseSuggestionsResult {
  const {
    value,
    cursorPosition,
    suggestions,
    dynamicSuggestions,
    suggestionProvider,
    suggestionCategories,
    suggestionDebounceMs,
    suggestionProviderCache,
    maxSuggestions,
    recentlyUsedValues,
    enabled,
    sharedController,
  } = args;

  const context = useMemo(() => extractContext(value, cursorPosition), [value, cursorPosition]);

  const [asyncState, setAsyncState] = useState<AsyncSuggestionState>({ status: 'idle', results: [] });
  const controllerRef = useRef<AsyncSuggestionController | null>(null);

  useEffect(() => {
    if (sharedController) {
      // Owned by PromQLSuggestionRegistryProvider — subscribe only, never dispose (other
      // instances may still be using it); the provider disposes it on its own unmount.
      controllerRef.current = sharedController;
      return sharedController.subscribe(setAsyncState);
    }

    if (!suggestionProvider) {
      controllerRef.current?.dispose();
      controllerRef.current = null;
      setAsyncState({ status: 'idle', results: [] });
      return;
    }
    const controller = new AsyncSuggestionController({
      provider: suggestionProvider,
      debounceMs: suggestionDebounceMs,
      cache: suggestionProviderCache,
    });
    controllerRef.current = controller;
    const unsubscribe = controller.subscribe(setAsyncState);
    return () => {
      unsubscribe();
      controller.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedController, suggestionProvider, suggestionDebounceMs]);

  useEffect(() => {
    if (!enabled) return;
    controllerRef.current?.request(context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, context.astContext, context.activeLabel, context.activeMetric, context.tokenBeforeCursor]);

  const results = useMemo(() => {
    if (!enabled) return [];
    return getSuggestionsForContext(
      context,
      {
        suggestions,
        dynamicSuggestions,
        providedSuggestions: asyncState.results,
        suggestionCategories,
        recentlyUsedValues,
        includeBuiltins: true,
      },
      { maxSuggestions },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, context, suggestions, dynamicSuggestions, asyncState.results, suggestionCategories, recentlyUsedValues, maxSuggestions]);

  return { context, results, loading: asyncState.status === 'loading', asyncError: asyncState.status === 'error' ? asyncState.error : undefined };
}
