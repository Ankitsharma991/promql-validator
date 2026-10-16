# Plugins

A plugin is a plain object that bundles validation rules, function-dictionary changes and suggestion sources, so a team can publish its conventions once (for example as `@acme/promql-plugin`) and every editor that uses it stays in sync.

```ts
import { definePlugin } from '@promql-validator/core';

export const acmePlugin = definePlugin({
  name: 'acme.observability',
  version: '1.2.0',

  // validation
  validators: [
    (ast, query) =>
      /\{[^}]*=~"\.\*"/.test(query)
        ? [{ severity: 'warning', code: 'ACME_UNBOUNDED_REGEX', message: 'Matching everything is expensive; narrow the regex.', start: 0, end: query.length, line: 1, column: 1 }]
        : [],
  ],
  customFunctions: ['acme_rate'],     // treat as known
  disabledFunctions: ['holt_winters'], // reject

  // suggestions
  suggestions: [{ label: 'acme_rate', value: 'acme_rate', category: 'promql-function', insertText: 'acme_rate($0)', description: 'Rate with ACME burst correction.' }],
  dynamicSuggestions: [{ category: 'team', values: ['payments', 'search', 'platform'] }],
  suggestionProvider: async (context, { signal }) => [],
  suggestionCategories: { metric: { priorityWeight: 50 } },
});
```

`definePlugin` only returns its argument; it exists for type checking and editor hints.

## Using plugins

**One editor:**

```tsx
<PromQLInput plugins={[acmePlugin]} />
```

**Every editor on a page or in an app:**

```tsx
import { PromQLValidatorProvider } from 'promql-validator';

<PromQLValidatorProvider plugins={[acmePlugin]} dynamicSuggestions={sharedGroups}>
  <Dashboard />
</PromQLValidatorProvider>
```

Editors below the provider get its plugins plus their own `plugins` prop. Change the array to switch plugin sets at runtime, for example when a user moves to another tenant or workspace.

**Without React** (servers, CI, Monaco, CodeMirror):

```ts
import { mergeValidationOptions, mergeSuggestionSources, mergePluginProviders, validatePromQL, getSuggestions } from '@promql-validator/core';

const validation = mergeValidationOptions([acmePlugin], { unknownFunctionSeverity: 'error' });
validatePromQL(query, validation);

const sources = mergeSuggestionSources([acmePlugin], { dynamicSuggestions });
getSuggestions(query, cursor, sources);

const provider = mergePluginProviders([acmePlugin], myOwnProvider); // runs them all, tolerates failures
```

`PluginRegistry` is a small observable container for plugin sets that change at runtime outside React (`register` returns an unregister function).

## How plugins combine

Plugins are additive. All validators run, all suggestion sources are merged and ranked together, all providers run concurrently, and a provider that fails doesn't affect the others. For `suggestionCategories`, a later plugin overrides an earlier one, and settings you pass directly (the `suggestionCategories` prop or argument) override every plugin.

## Catching conflicts

When plugins come from different teams, check the combination in a test:

```ts
import { validatePluginConfiguration } from '@promql-validator/core';

const { ok, issues } = validatePluginConfiguration([platformPlugin, paymentsPlugin, securityPlugin]);
expect(issues).toEqual([]);
```

It reports:

| `type` | When |
|---|---|
| `duplicate-name` | Two plugins share a `name` |
| `function-conflict` | One plugin adds a function another disables |
| `category-conflict` | Two plugins configure the same suggestion category differently |

## Testing a plugin

Plugins are plain data, so test them with the core functions directly:

```ts
import { validatePromQL, mergeValidationOptions } from '@promql-validator/core';

it('flags unbounded regex matchers', () => {
  const result = validatePromQL('up{job=~".*"}', mergeValidationOptions([acmePlugin]));
  expect(result.diagnostics.map((d) => d.code)).toContain('ACME_UNBOUNDED_REGEX');
});
```
