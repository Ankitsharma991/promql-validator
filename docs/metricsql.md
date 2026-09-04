# MetricsQL (VictoriaMetrics)

```ts
validatePromQL(query, { dialect: 'metricsql' });
```

`dialect` defaults to `'promql'` (stable Prometheus PromQL). `'metricsql'` enables a **best-effort, conservative subset** of VictoriaMetrics' PromQL superset — see [`CHANGELOG-GRAMMAR.md`](https://github.com/promql-validator/promql-validator/blob/main/CHANGELOG-GRAMMAR.md#metricsql-victoriametrics-dialect--best-effort-subset) for exactly what is and isn't covered, and why this package doesn't claim full fidelity (it has no live access to verify VictoriaMetrics' ~100-function list against current documentation, and a wrong validator is worse than no validator).

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
