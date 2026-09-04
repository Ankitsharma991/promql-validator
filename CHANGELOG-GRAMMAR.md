# Grammar / Dictionary Changelog

Tracks changes to the bundled PromQL grammar coverage and built-in dictionaries
(`packages/core/src/suggestions/builtins/*`) — independently of the package's own semver,
since a dictionary update (a new function added, a duration unit tweak) is a **data**
change, not necessarily an API-breaking one.

## v2024.1 — initial dictionary

- Captured against the Prometheus stable query-function list (functions, aggregation
  operators, binary/set operators, vector-matching modifiers, duration units) as of this
  package's initial release.
- Includes the trigonometric functions (`sin`, `cos`, `atan2`, etc.) and native-histogram
  functions (`histogram_avg`, `histogram_stddev`, etc.) added in more recent Prometheus
  releases.
## MetricsQL (VictoriaMetrics) dialect — best-effort subset

`dialect: 'metricsql'` is implemented as a **conservative, best-effort subset** of
VictoriaMetrics' MetricsQL superset — not a verified-against-live-documentation exhaustive
implementation. VictoriaMetrics ships on the order of 100 MetricsQL-specific functions; this
package has no live access to cross-check every signature, and per the correctness-first
principle we'd rather under-cover the dialect than fabricate a function arity we can't
verify (an unrecognized MetricsQL function still degrades to the same configurable
`unknownFunctionSeverity` warning as an unrecognized PromQL one — never a silent false pass).

Covered:
- `WITH (name = expr, ...) body` templates — non-parameterized form only (`name(args) = expr`
  parameterized templates are not supported). Implemented as token-aware textual
  substitution (`packages/core/src/dialects/with-templates.ts`), not deep AST-level
  templating — diagnostics for the body are positioned relative to the *expanded* text, not
  the original source, a documented limitation of this approach.
- The `keep_metric_names` trailing modifier.
- A curated extension function dictionary (`packages/core/src/dialects/metricsql-functions.ts`)
  covering the `rollup_*`/`range_*`/`running_*`/`label_*` families and `histogram_quantiles`.

Not covered (documented gap, not silently mis-validated): the remainder of MetricsQL's
function list, parameterized `WITH` templates, and any MetricsQL-specific operator syntax
beyond what's listed above. Corrections and additions are welcome — see CONTRIBUTING.md.
