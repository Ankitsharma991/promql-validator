import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { AsyncSuggestionController } from '@promql-validator/core';
import type { DynamicSuggestionGroup, PromQLPlugin, SuggestionCategoryConfig, SuggestionCacheOptions, SuggestionInput, SuggestionProvider } from '@promql-validator/core';

export interface SuggestionRegistryValue {
  suggestions?: SuggestionInput[];
  dynamicSuggestions?: DynamicSuggestionGroup[];
  suggestionProvider?: SuggestionProvider;
  suggestionCategories?: SuggestionCategoryConfig;
  suggestionProviderCache?: SuggestionCacheOptions | false;
  /** Plugins applied to every `<PromQLInput/>` below this provider, in addition to each
   * instance's own `plugins`. Swap the array to change plugin sets (e.g. per tenant). */
  plugins?: PromQLPlugin[];
  /** One `AsyncSuggestionController` shared by every `<PromQLInput/>` that doesn't pass its
   * own `suggestionProvider`, so N editors on a page share one cache and one set of
   * in-flight requests instead of N. */
  sharedController?: AsyncSuggestionController | null;
}

const SuggestionRegistryContext = createContext<SuggestionRegistryValue | null>(null);

export interface PromQLSuggestionRegistryProviderProps extends SuggestionRegistryValue {
  children: React.ReactNode;
}

/**
 * Shares configuration across every `<PromQLInput/>` below it: suggestions, an async
 * provider (with one shared cache), category settings and plugins. Built for pages with many
 * editors, such as a dashboard with 20 panels that should all offer the same live
 * service/namespace list without each one fetching and indexing it separately.
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
    [value.suggestions, value.dynamicSuggestions, value.suggestionProvider, value.suggestionCategories, value.suggestionProviderCache, value.plugins, controllerRef.current],
  );
  return <SuggestionRegistryContext.Provider value={memoized}>{children}</SuggestionRegistryContext.Provider>;
}

/** The same component under its shorter name. */
export const PromQLValidatorProvider = PromQLSuggestionRegistryProvider;

/** Reads the nearest provider's value, or `null` if there is none. */
export function useSuggestionRegistry(): SuggestionRegistryValue | null {
  return useContext(SuggestionRegistryContext);
}
