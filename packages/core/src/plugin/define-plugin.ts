import type { PromQLPlugin } from './types.js';

/**
 * Identity helper that gives a plugin object full type checking and inference:
 *
 * ```ts
 * export default definePlugin({ name: 'acme.metric-naming', validators: [...] });
 * ```
 */
export function definePlugin<T extends PromQLPlugin>(plugin: T): T {
  return plugin;
}

export interface PluginConfigurationIssue {
  type: 'duplicate-name' | 'function-conflict' | 'category-conflict';
  plugins: string[];
  message: string;
}

/**
 * Checks a set of plugins for conflicts that would otherwise resolve silently. Plugins are
 * additive, so most combinations are fine; this flags the ones that aren't:
 *
 * - two plugins with the same `name`
 * - a function one plugin adds (`customFunctions`) that another disables (`disabledFunctions`)
 * - two plugins configuring the same suggestion category differently
 *
 * Run it in a unit test or CI step wherever plugins from different teams are combined.
 */
export function validatePluginConfiguration(plugins: readonly PromQLPlugin[]): { ok: boolean; issues: PluginConfigurationIssue[] } {
  const issues: PluginConfigurationIssue[] = [];

  const byName = new Map<string, number>();
  for (const p of plugins) byName.set(p.name, (byName.get(p.name) ?? 0) + 1);
  for (const [name, count] of byName) {
    if (count > 1) issues.push({ type: 'duplicate-name', plugins: [name], message: `${count} plugins are named '${name}'.` });
  }

  for (const adder of plugins) {
    for (const fn of adder.customFunctions ?? []) {
      for (const remover of plugins) {
        if (remover !== adder && remover.disabledFunctions?.includes(fn)) {
          issues.push({
            type: 'function-conflict',
            plugins: [adder.name, remover.name],
            message: `'${adder.name}' adds function '${fn}' but '${remover.name}' disables it.`,
          });
        }
      }
    }
  }

  const seenCategory = new Map<string, { plugin: string; config: string }>();
  for (const p of plugins) {
    for (const [category, config] of Object.entries(p.suggestionCategories ?? {})) {
      const serialized = JSON.stringify(config);
      const previous = seenCategory.get(category);
      if (previous && previous.config !== serialized) {
        issues.push({
          type: 'category-conflict',
          plugins: [previous.plugin, p.name],
          message: `'${previous.plugin}' and '${p.name}' configure suggestion category '${category}' differently; '${p.name}' wins.`,
        });
      } else if (!previous) {
        seenCategory.set(category, { plugin: p.name, config: serialized });
      }
    }
  }

  return { ok: issues.length === 0, issues };
}
