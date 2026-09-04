import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { AsyncSuggestionController } from '@promql-validator/core';
import type { DynamicSuggestionGroup, SuggestionCategoryConfig, SuggestionCacheOptions, SuggestionInput, SuggestionProvider } from '@promql-validator/core';

export interface SuggestionRegistryValue {
  suggestions?: SuggestionInput[];
  dynamicSuggestions?: DynamicSuggestionGroup[];
  suggestionProvider?: SuggestionProvider;
  suggestionCategories?: SuggestionCategoryConfig;
  suggestionProviderCache?: SuggestionCacheOptions | false;
  /** One `AsyncSuggestionController` shared by every consuming `<PromQLInput/>` that
   * doesn't override `suggestionProvider` itself — the actual point of this provider
   * (Part 28.4): avoids N independent caches/in-flight-request trackers for the same
   * underlying data source across N editors on one page. */
  sharedController?: AsyncSuggestionController | null;
}

const SuggestionRegistryContext = createContext<SuggestionRegistryValue | null>(null);

export interface PromQLSuggestionRegistryProviderProps extends SuggestionRegistryValue {
  children: React.ReactNode;
}

/**
 * Optimization for a page rendering many `<PromQLInput/>` instances that should share the
 * same dynamic data (and, for an async `suggestionProvider`, the same underlying
 * `AsyncSuggestionController` cache) — e.g. a dashboard with 20 query editors, all of which
 * should offer the same live service/namespace list without each instance independently
 * re-fetching or re-indexing it (Part 28.4).
 *
 * This is additive sugar over per-instance props, not a required concept: any prop passed
 * directly to `<PromQLInput/>` overrides the registry's value for that instance, and
 * per-instance props already work correctly without this provider at all.
 *
 * Note: when an instance uses the registry's shared `suggestionProvider`, debouncing is a
 * property of the one shared controller (constructed once, here), so that instance's own
 * `suggestionDebounceMs` prop has no effect — every editor sharing this provider shares one
 * debounce window along with the cache. An instance with its own `suggestionProvider`
 * override gets its own private controller and its own debounce as usual.
 */
export function PromQLSuggestionRegistryProvider({ children, ...value }: PromQLSuggestionRegistryProviderProps) {
  const controllerRef = useRef<AsyncSuggestionController | null>(null);

  useEffect(() => {
    if (!value.suggestionProvider) {
      controllerRef.current?.dispose();
      controllerRef.current = null;
      return;
    }
    const controller = new AsyncSuggestionController({ provider: value.suggestionProvider, cache: value.suggestionProviderCache });
    controllerRef.current = controller;
    return () => controller.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.suggestionProvider]);

  // Only re-create the context value when a caller-supplied prop reference actually
  // changes — avoids forcing every consuming <PromQLInput/> to re-derive its suggestion
  // state on every provider re-render.
  const memoized = useMemo<SuggestionRegistryValue>(
    () => ({ ...value, sharedController: controllerRef.current }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value.suggestions, value.dynamicSuggestions, value.suggestionProvider, value.suggestionCategories, value.suggestionProviderCache, controllerRef.current],
  );
  return <SuggestionRegistryContext.Provider value={memoized}>{children}</SuggestionRegistryContext.Provider>;
}

/** Reads the nearest `PromQLSuggestionRegistryProvider`'s value, or `null` if none is present. */
export function useSuggestionRegistry(): SuggestionRegistryValue | null {
  return useContext(SuggestionRegistryContext);
}
