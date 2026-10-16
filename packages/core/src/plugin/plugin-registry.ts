import type { ValidationOptions } from '../validator/validate.js';
import type { SuggestionSources } from '../suggestions/engine.js';
import type { SuggestionProvider } from '../suggestions/types.js';
import { combineSuggestionProviders } from './combine-providers.js';
import type { PromQLPlugin } from './types.js';

export function mergeValidationOptions(plugins: PromQLPlugin[], base?: ValidationOptions): ValidationOptions {
  return {
    ...base,
    validators: [...plugins.flatMap((p) => p.validators ?? []), ...(base?.validators ?? [])],
    customFunctions: [...plugins.flatMap((p) => p.customFunctions ?? []), ...(base?.customFunctions ?? [])],
    disabledFunctions: [...plugins.flatMap((p) => p.disabledFunctions ?? []), ...(base?.disabledFunctions ?? [])],
  };
}

/** Merges every plugin's static suggestion data (not `suggestionProvider` — see `mergePluginProviders`
 * for combining async providers, a separate concern since `SuggestionSources` itself has no
 * provider field; async results are already resolved into `providedSuggestions` by the time
 * they reach here). */
export function mergeSuggestionSources(plugins: PromQLPlugin[], base?: SuggestionSources): SuggestionSources {
  return {
    ...base,
    suggestions: [...plugins.flatMap((p) => p.suggestions ?? []), ...(base?.suggestions ?? [])],
    dynamicSuggestions: [...plugins.flatMap((p) => p.dynamicSuggestions ?? []), ...(base?.dynamicSuggestions ?? [])],
    // Later plugins override earlier ones; settings passed directly override every plugin.
    suggestionCategories: { ...plugins.reduce((acc, p) => ({ ...acc, ...p.suggestionCategories }), {}), ...base?.suggestionCategories },
  };
}

/**
 * Merges every plugin's `suggestionProvider` (if any), plus an optional provider of the
 * host's own, into one combined provider — pass the result as `suggestionProvider` to
 * `<PromQLInput/>` or `getSuggestions`'s async wiring, since only one provider is accepted
 * there. Returns `undefined` when nothing has a provider at all (nothing to combine).
 */
export function mergePluginProviders(plugins: PromQLPlugin[], ownProvider?: SuggestionProvider): SuggestionProvider | undefined {
  const providers = [...plugins.flatMap((p) => (p.suggestionProvider ? [p.suggestionProvider] : [])), ...(ownProvider ? [ownProvider] : [])];
  if (providers.length === 0) return undefined;
  if (providers.length === 1) return providers[0];
  return combineSuggestionProviders(providers);
}

/**
 * Runtime registry for dynamically registering/unregistering plugins (e.g. a host app that
 * loads different plugins per tenant/feature-flag). For the common static case, just pass a
 * `plugins` array directly wherever plugins are consumed — this class is only needed when
 * the plugin set itself changes at runtime and something needs to react to that.
 */
export class PluginRegistry {
  private plugins = new Map<string, PromQLPlugin>();
  private listeners = new Set<() => void>();

  register(plugin: PromQLPlugin): () => void {
    this.plugins.set(plugin.name, plugin);
    this.notify();
    return () => this.unregister(plugin.name);
  }

  unregister(name: string): void {
    if (this.plugins.delete(name)) this.notify();
  }

  list(): PromQLPlugin[] {
    return [...this.plugins.values()];
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  /** Notified whenever a plugin is registered/unregistered. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getValidationOptions(base?: ValidationOptions): ValidationOptions {
    return mergeValidationOptions(this.list(), base);
  }

  getSuggestionSources(base?: SuggestionSources): SuggestionSources {
    return mergeSuggestionSources(this.list(), base);
  }

  getSuggestionProvider(ownProvider?: SuggestionProvider): SuggestionProvider | undefined {
    return mergePluginProviders(this.list(), ownProvider);
  }
}
