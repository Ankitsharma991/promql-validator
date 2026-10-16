import { describe, expect, it, vi } from 'vitest';
import { validatePromQL } from '../validator/validate.js';
import { getSuggestions } from '../suggestions/engine.js';
import { PluginRegistry, mergeSuggestionSources, mergeValidationOptions, mergePluginProviders } from '../plugin/plugin-registry.js';
import { combineSuggestionProviders } from '../plugin/combine-providers.js';
import type { PromQLPlugin } from '../plugin/types.js';

const allowlistPlugin: PromQLPlugin = {
  name: 'metric-allowlist',
  validators: [
    (_ast, query) =>
      query.includes('forbidden_metric')
        ? [{ severity: 'error', code: 'ORG_FORBIDDEN_METRIC', message: 'forbidden metric', start: 0, end: query.length, line: 1, column: 1 }]
        : [],
  ],
  customFunctions: ['my_custom_func'],
  suggestions: ['production', 'staging'],
  dynamicSuggestions: [{ category: 'team', values: ['infra', 'payments'] }],
};

describe('mergeValidationOptions', () => {
  it('combines validators/customFunctions/disabledFunctions from multiple plugins', () => {
    const plugin2: PromQLPlugin = { name: 'p2', disabledFunctions: ['scalar'] };
    const merged = mergeValidationOptions([allowlistPlugin, plugin2]);
    expect(merged.validators).toHaveLength(1);
    expect(merged.customFunctions).toEqual(['my_custom_func']);
    expect(merged.disabledFunctions).toEqual(['scalar']);
  });

  it('a plugin validator actually runs when passed to validatePromQL', () => {
    const options = mergeValidationOptions([allowlistPlugin]);
    const result = validatePromQL('rate(forbidden_metric[5m])', options);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'ORG_FORBIDDEN_METRIC')).toBe(true);
  });

  it('a plugin customFunction is actually accepted by validatePromQL', () => {
    const options = mergeValidationOptions([allowlistPlugin], { unknownFunctionSeverity: 'error' });
    expect(validatePromQL('my_custom_func(x)', options).valid).toBe(true);
  });
});

describe('mergeSuggestionSources', () => {
  it('combines suggestions/dynamicSuggestions/suggestionCategories from multiple plugins', () => {
    const merged = mergeSuggestionSources([allowlistPlugin]);
    expect(merged.suggestions).toContain('production');
    expect(merged.dynamicSuggestions?.[0]).toMatchObject({ category: 'team' });
  });

  it('a plugin static suggestion actually shows up via getSuggestions', () => {
    const sources = mergeSuggestionSources([allowlistPlugin]);
    const results = getSuggestions('', 0, sources);
    expect(results.some((r) => r.value === 'production')).toBe(true);
  });
});

describe('combineSuggestionProviders / mergePluginProviders', () => {
  it('runs multiple providers concurrently and flattens results', async () => {
    const providerA = vi.fn(async () => [{ label: 'a', value: 'a', category: 'custom' }]);
    const providerB = vi.fn(async () => [{ label: 'b', value: 'b', category: 'custom' }]);
    const combined = combineSuggestionProviders([providerA, providerB]);
    const results = await combined({ query: '', cursorPosition: 0, tokenBeforeCursor: '', astContext: 'top-level' }, { signal: new AbortController().signal });
    expect(results.map((r) => r.value).sort()).toEqual(['a', 'b']);
  });

  it('one provider rejecting does not prevent the others from contributing', async () => {
    const failing = vi.fn(async () => {
      throw new Error('boom');
    });
    const ok = vi.fn(async () => [{ label: 'ok', value: 'ok', category: 'custom' }]);
    const combined = combineSuggestionProviders([failing, ok]);
    const results = await combined({ query: '', cursorPosition: 0, tokenBeforeCursor: '', astContext: 'top-level' }, { signal: new AbortController().signal });
    expect(results.map((r) => r.value)).toEqual(['ok']);
  });

  it('mergePluginProviders returns undefined when nothing has a provider', () => {
    expect(mergePluginProviders([{ name: 'no-provider' }])).toBeUndefined();
  });

  it('mergePluginProviders returns the single provider unwrapped when there is only one', () => {
    const only = async () => [];
    expect(mergePluginProviders([], only)).toBe(only);
  });
});

describe('PluginRegistry — dynamic register/unregister', () => {
  it('reflects registered plugins in getValidationOptions/getSuggestionSources', () => {
    const registry = new PluginRegistry();
    registry.register(allowlistPlugin);
    expect(registry.getValidationOptions().customFunctions).toContain('my_custom_func');
    expect(registry.getSuggestionSources().suggestions).toContain('production');
  });

  it('unregistering removes the plugin\'s contributions', () => {
    const registry = new PluginRegistry();
    registry.register(allowlistPlugin);
    registry.unregister('metric-allowlist');
    expect(registry.getSuggestionSources().suggestions ?? []).toEqual([]);
    expect(registry.list()).toEqual([]);
  });

  it('notifies subscribers on register and unregister', () => {
    const registry = new PluginRegistry();
    const listener = vi.fn();
    registry.subscribe(listener);
    registry.register(allowlistPlugin);
    registry.unregister('metric-allowlist');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('the unsubscribe function returned by subscribe stops further notifications', () => {
    const registry = new PluginRegistry();
    const listener = vi.fn();
    const unsubscribe = registry.subscribe(listener);
    unsubscribe();
    registry.register(allowlistPlugin);
    expect(listener).not.toHaveBeenCalled();
  });

  it('the unregister function returned by register() works too', () => {
    const registry = new PluginRegistry();
    const unregister = registry.register(allowlistPlugin);
    unregister();
    expect(registry.list()).toEqual([]);
  });
});

describe('validatePluginConfiguration', () => {
  it('accepts plugins that compose cleanly', async () => {
    const { definePlugin, validatePluginConfiguration } = await import('../plugin/define-plugin.js');
    const a = definePlugin({ name: 'acme.naming', customFunctions: ['acme_rate'] });
    const b = definePlugin({ name: 'acme.dictionary', suggestionCategories: { metric: { priorityWeight: 50 } } });
    expect(validatePluginConfiguration([a, b])).toEqual({ ok: true, issues: [] });
  });

  it('reports duplicate names, function conflicts and category conflicts', async () => {
    const { validatePluginConfiguration } = await import('../plugin/define-plugin.js');
    const { ok, issues } = validatePluginConfiguration([
      { name: 'team-a', customFunctions: ['acme_rate'], suggestionCategories: { metric: { enabled: true } } },
      { name: 'team-b', disabledFunctions: ['acme_rate'], suggestionCategories: { metric: { enabled: false } } },
      { name: 'team-b' },
    ]);
    expect(ok).toBe(false);
    expect(issues.map((i) => i.type).sort()).toEqual(['category-conflict', 'duplicate-name', 'function-conflict']);
  });
});

describe('mergeSuggestionSources category precedence', () => {
  it('lets later plugins override earlier ones, and direct settings override all plugins', async () => {
    const { mergeSuggestionSources } = await import('../plugin/plugin-registry.js');
    const plugins = [
      { name: 'a', suggestionCategories: { metric: { priorityWeight: 1 }, 'label-name': { enabled: false } } },
      { name: 'b', suggestionCategories: { metric: { priorityWeight: 2 } } },
    ];
    expect(mergeSuggestionSources(plugins).suggestionCategories).toEqual({ metric: { priorityWeight: 2 }, 'label-name': { enabled: false } });
    expect(mergeSuggestionSources(plugins, { suggestionCategories: { metric: { priorityWeight: 9 } } }).suggestionCategories).toEqual({
      metric: { priorityWeight: 9 },
      'label-name': { enabled: false },
    });
  });
});
