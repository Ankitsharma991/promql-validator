# MetricsQL (VictoriaMetrics)

```ts
validatePromQL(query, { dialect: 'metricsql' });
```

`dialect` defaults to `'promql'`. `'metricsql'` adds the parts of VictoriaMetrics' PromQL superset listed below. MetricsQL has around a hundred extra functions and this package covers the commonly used ones; any function it doesn't know is reported as an unknown-function *warning* (controlled by `unknownFunctionSeverity`), never as a hard error. [`CHANGELOG-GRAMMAR.md`](https://github.com/Ankitsharma991/promql-validator/blob/main/CHANGELOG-GRAMMAR.md) lists exactly what's covered.

## `WITH` templates

```ts
validatePromQL('WITH (commonFilter = {job="api"}) up{commonFilter}', { dialect: 'metricsql' });
// valid: true — expands to `up{job="api"}` internally
```

```ts
validatePromQL('WITH (r = rate(http_requests_total[5m])) sum(r) / sum(rate(errors[5m]))', { dialect: 'metricsql' });
```

Only the simple, non-parameterized form (`name = expr`) is supported. A template whose value is itself a `{...}` filter and is referenced as the *sole* content of another selector's braces (`metric{filterName}`) splices its matchers directly into the surrounding selector, matching MetricsQL's actual filter-template semantics — it does not nest as `metric{({...})}`  (which would be invalid syntax).

**Limitation:** diagnostics for the template body are positioned relative to the *expanded* (substituted) text, not your original source — a consequence of the textual-substitution approach (`expandWithTemplates`, exported from `@promql-validator/core` if you want to inspect the expansion yourself).

## `keep_metric_names`

```ts
validatePromQL('rate(x[5m]) keep_metric_names', { dialect: 'metricsql' }); // valid: true
validatePromQL('rate(x[5m]) keep_metric_names', { dialect: 'promql' });    // valid: false — unexpected trailing token
```

## Extension functions

A curated subset covering the `rollup_*`, `range_*`, `running_*`, and `label_*` families, plus `histogram_quantiles`. Arity is enforced the same way as built-in PromQL functions. Import `METRICSQL_FUNCTIONS` from `@promql-validator/core` if you want to inspect or extend the list yourself (e.g. via `customFunctions`).

## In the editor component

```tsx
<PromQLInput dialect="metricsql" />
```

The Monaco and CodeMirror adapters take the same `dialect` option.

## Not covered yet

Parameterized `WITH` templates (`f(x) = …`) and MetricsQL-only operator syntax beyond the above. See the [roadmap](./roadmap.md).
