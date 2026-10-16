# Monaco Editor

```bash
npm install @promql-validator/monaco monaco-editor
```

```ts
import * as monaco from 'monaco-editor';
import { registerPromQLLanguage } from '@promql-validator/monaco';

const registration = registerPromQLLanguage(monaco, {
  dialect: 'promql',
  sources: { dynamicSuggestions: [{ category: 'job', values: jobs }] },
  suggestionProvider: async (context, { signal }) => fetchLabelValues(context, signal),
});

const editor = monaco.editor.create(container, { value: 'rate(http_requests_total[5m])', language: 'promql' });

// later
registration.dispose();
```

## What's registered

- A Monarch tokenizer (functions, aggregations, keywords, strings, numbers, durations, `#` comments) and language configuration (comment toggling, bracket and quote pairs).
- A completion provider backed by `getSuggestions`. Functions are inserted as snippets with the cursor inside the parentheses. Triggered on typing and on `{ ( [ " ' , =` and space.
- Diagnostics: every model with language `promql` is validated after each change (debounced) and gets markers with the same messages and codes as `validatePromQL`.

## Options

| Option | Type | Default | |
|---|---|---|---|
| `dialect` | `'promql' \| 'metricsql'` | `'promql'` | |
| `validationDebounceMs` | `number` | `150` | |
| `validationOptions` | `ValidationOptions` | | `validators`, `customFunctions`, `disabledFunctions`, `unknownFunctionSeverity`, … |
| `sources` | `SuggestionSources` | | `suggestions`, `dynamicSuggestions`, `suggestionCategories`, `includeBuiltins` |
| `suggestionProvider` | `SuggestionProvider` | | Async; cancelled with Monaco's cancellation token. Output is sanitised. |
| `engineOptions` | `GetSuggestionsOptions` | | `maxSuggestions`, `fuzzyMatchThreshold` |

## Building blocks

If you manage Monaco providers yourself, use the pieces directly: `monarchLanguage`, `languageConfiguration`, `suggestionToCompletionItem(suggestion, monaco, range)`, `diagnosticToMarker(diagnostic, monaco, start, end)` and `PROMQL_LANGUAGE_ID`.

## Plugins

```ts
import { mergeSuggestionSources, mergeValidationOptions, mergePluginProviders } from '@promql-validator/core';

registerPromQLLanguage(monaco, {
  validationOptions: mergeValidationOptions(plugins),
  sources: mergeSuggestionSources(plugins),
  suggestionProvider: mergePluginProviders(plugins),
});
```
