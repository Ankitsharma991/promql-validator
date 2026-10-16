# Grammar & Dictionary Changelog

Changes to PromQL grammar coverage and the built-in dictionaries (`packages/core/src/suggestions/builtins/`). These are tracked separately from each package's `CHANGELOG.md`: adding a function or vocabulary entry is a data change, not an API change, and ships as a minor or patch release.

## 2026.10: initial public release

### PromQL grammar

Checked against Prometheus `main` (`promql/parser/lex.go` and `functions.go`, October 2026) and pinned by the conformance corpus in `packages/core/conformance/promql.json`.

- Selectors, all four matcher operators, trailing commas, `__name__` matchers.
- Prometheus 3 UTF-8 names: quoted metric names (`{"http.server.duration"}`), quoted label names in matchers and in `by`/`without`/`on`/`ignoring` lists.
- Strings in all three quote styles. Unterminated strings are *incomplete*, not errors.
- Numbers: decimal, scientific, hex, `_` digit separators, `Inf`, `NaN`.
- Durations: `ms s m h d w y`, compound (`1h30m`) with units largest first and each used once, plain numbers as seconds (`[300]`). Ranges and steps must be positive.
- Duration expressions: `+ - * / % ^`, parentheses, `step()`, `range()`, `min_of()`, `max_of()`.
- Range vectors, subqueries with optional step, `offset` (including negative), `@` with timestamps and `start()`/`end()`, each modifier at most once.
- All aggregations with `by`/`without` before or after the arguments, with arity checks (one argument, or parameter plus vector for `topk`, `bottomk`, `quantile`, `count_values`, `limitk`, `limit_ratio`).
- Binary operators with correct precedence and right-associative `^`, `bool`, `on`/`ignoring`, `group_left`/`group_right`, set-operator restrictions.
- `#` line comments.
- Keywords usable as metric names, except `bool`, `on`, `ignoring`, `group_left`, `group_right` (as in Prometheus).

### Functions

All 86 functions Prometheus defines, with arity and argument-type rules, including the native-histogram functions and, flagged as experimental, `info`, `mad_over_time`, `sort_by_label`, `sort_by_label_desc`, `double_exponential_smoothing`, `first_over_time`, `ts_of_first_over_time`, `ts_of_last_over_time`, `ts_of_max_over_time`, `ts_of_min_over_time`, `integral`, `start_timestamp` and `histogram_quantiles`. `holt_winters` is kept for Prometheus 2.x queries.

### Observability vocabulary

- 97 label names: Prometheus, topology, Kubernetes, node_exporter, HTTP/gRPC, OpenTelemetry semantic conventions (Prometheus-translated), span metrics and service graphs, log-derived metrics.
- 41 well-known metric names: Prometheus, process/Go runtime, node_exporter, cAdvisor, kube-state-metrics, OpenTelemetry HTTP/RPC/DB, span metrics, service graphs.
- 32 terms: golden signals, RED/USE, SLOs, percentiles, metric types, resources, traces and logs.

### MetricsQL (`dialect: 'metricsql'`)

- `WITH (name = expr, ...)` templates, non-parameterized form. Implemented as token-aware substitution; diagnostics inside the body point at the expanded text.
- The trailing `keep_metric_names` modifier.
- 31 extension functions covering the `rollup_*`, `range_*`, `running_*` and `label_*` families and `histogram_quantiles`.
- Not covered yet: parameterized templates and the remaining extension functions. Unknown MetricsQL functions are reported through `unknownFunctionSeverity` (a warning by default), never as hard errors.

### Not covered yet

Prometheus' experimental `fill()` modifiers, `anchored`/`smoothed` ranges and `</` / `>/` trim operators. See `docs/roadmap.md`.
