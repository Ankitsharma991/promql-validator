# @promql-validator/core

PromQL parser, validator, formatter and autocomplete engine. No React, no DOM, no runtime dependencies. Use it in Node, the browser, Deno, web workers, CI scripts or behind your own editor.

```bash
npm install @promql-validator/core
```

```ts
import { validatePromQL, formatPromQL, getSuggestions } from '@promql-validator/core';

validatePromQL('rate(http_requests_total[5m)');
// {
//   valid: false, incomplete: false,
//   diagnostics: [{ severity: 'error', code: 'PQ_UNCLOSED_BRACKET',
//     message: "Expected closing ']' to match '[' opened at position 24.", start: 27, end: 28, line: 1, column: 28 }]
// }

formatPromQL('sum by (job,code) (rate(x[5m]))');
// 'sum by (job, code) (rate(x[5m]))'

getSuggestions('http_requests_total{', 20).map((s) => s.label);
// ['__name__', 'job', 'instance', ...]   label names, because the cursor is inside {}
```

## What it covers

- **All of PromQL**: selectors and matchers, ranges, subqueries, `offset` (including negative), `@` with timestamps and `start()`/`end()`, every aggregation with `by`/`without`, every binary operator with `bool`, `on`/`ignoring` and `group_left`/`group_right`, comments, number formats (`0x8f`, `1e3`, `1_000`, `Inf`, `NaN`) and plain-second durations.
- **Prometheus 3**: UTF-8 quoted metric and label names (`{"http.server.duration", "service.name"="api"}`), duration expressions (`[5m * 2]`, `[max_of(step(), 5s)]`) and the experimental functions.
- **Semantic checks**: function and aggregation arity, range-vector arguments (`rate(x)` vs `rate(x[5m])`), vector-matching rules, duplicate or conflicting modifiers, invalid durations.
- **Half-typed queries**: `rate(`, `sum()`, `up{job="` come back as `incomplete: true` with no errors, so editors stay quiet while the user types. Check `valid && !incomplete` before treating a query as final.
- **MetricsQL**: pass `{ dialect: 'metricsql' }` for `WITH` templates, `keep_metric_names` and the VictoriaMetrics extension functions.

## API

### Validation

| Export | Description |
|---|---|
| `validatePromQL(query, options?)` | Returns `{ valid, incomplete, diagnostics }`. Options: `validators`, `customFunctions`, `disabledFunctions`, `unknownFunctionSeverity`, `dialect`, `maxQueryLength`, `disableBuiltInValidation`. |
| `getQuickFix(diagnostic, query?)` | A one-click fix for a diagnostic, or `null`. Each fix has a `label` and `apply(query)`. |
| `getIncompleteBracketFix(result, query)` | "Insert missing ')'"-style fix for an unfinished query. |
| `validateRecordingRuleFile(yaml)` | Validates every `expr:` in a Prometheus rule file. |
| `DiagnosticCode` | Stable codes such as `PQ_UNCLOSED_BRACKET` and `PQ_WRONG_ARITY`. Branch on these, not on message text. |

### Formatting

| Export | Description |
|---|---|
| `formatPromQL(query, options?)` | Deterministic and idempotent. Throws `PromQLFormatError` instead of guessing on invalid input. Options: `indentSize`, `indentStyle`, `maxInlineWidth`. |

### Autocomplete

| Export | Description |
|---|---|
| `getSuggestions(query, cursor, sources?, options?)` | Ranked suggestions for the cursor position. `sources` adds your `suggestions`, `dynamicSuggestions`, `suggestionCategories`. |
| `extractContext(query, cursor)` | Where the cursor is: `astContext` (`label-value`, `function-arg`, …), `activeLabel`, `activeMetric`, `tokenBeforeCursor`. |
| `AsyncSuggestionController` | Debounced, cancellable, cached async provider runner. |
| `runSuggestionProvider(provider, context, signal)` | Calls a provider once and sanitises the result. |
| `PROMQL_FUNCTIONS`, `PROMQL_AGGREGATIONS`, `PROMQL_OPERATORS` | The built-in dictionaries, with arity and docs. |
| `BUILTIN_LABEL_NAMES`, `BUILTIN_METRICS`, `BUILTIN_MONITORING_TERMS` | The observability vocabulary (Prometheus, Kubernetes, OpenTelemetry, traces, logs). |

### Plugins

| Export | Description |
|---|---|
| `definePlugin(plugin)` | Typed helper for a bundle of validators, functions and suggestion sources. |
| `validatePluginConfiguration(plugins)` | Finds duplicate names, add/disable conflicts and clashing category settings. |
| `PluginRegistry`, `mergeValidationOptions`, `mergeSuggestionSources`, `mergePluginProviders` | Building blocks for composing plugins yourself. |

### Lower level

`parsePromQL`, `Parser`, `tokenize`, `TokenType`, the AST types (`Expr`, `Call`, `VectorSelector`, …), `fuzzyScore`, `indexedLookup`, `SuggestionCache`, `expandWithTemplates`.

## Custom rules

```ts
import { validatePromQL, type Validator } from '@promql-validator/core';

const noUnboundedRegex: Validator = (ast, query) =>
  query.includes('=~".*"')
    ? [{ severity: 'warning', code: 'ORG_UNBOUNDED_REGEX', message: 'Matching everything is expensive.', start: 0, end: query.length, line: 1, column: 1 }]
    : [];

validatePromQL(query, { validators: [noUnboundedRegex], customFunctions: ['acme_rate'] });
```

## Documentation

Full docs, the React editor, Monaco and CodeMirror adapters: **<https://github.com/Ankitsharma991/promql-validator>**

## Author

**Ankit Sharma**: [GitHub](https://github.com/Ankitsharma991) · [Portfolio](https://ankitsharma991.com.np) · [sharmaa7861@gmail.com](mailto:sharmaa7861@gmail.com)

## License

MIT © Ankit Sharma
