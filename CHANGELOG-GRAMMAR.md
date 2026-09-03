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
- `dialect: 'metricsql'` (VictoriaMetrics) is reserved in the public API but not
  implemented — selecting it throws a clear "not yet supported" error rather than silently
  falling back to PromQL semantics.
