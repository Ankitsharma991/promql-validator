# Diagnostic Codes

Stable, documented, versioned — branch on `code`, never on `message` text (messages may be reworded across minor versions; codes are not, per the project's semver policy).

| Code | Severity | Meaning |
|---|---|---|
| `PQ_UNCLOSED_BRACKET` | error | A `(`, `{`, or `[` was never closed |
| `PQ_UNEXPECTED_TOKEN` | error | A token appeared where the grammar didn't expect one |
| `PQ_UNEXPECTED_EOF` | error | Input ended where a primary expression was expected (surfaced only when *not* a recognized incomplete-typing shape) |
| `PQ_INVALID_DURATION` | error | A range/offset/subquery duration is missing its unit, or isn't a recognized duration |
| `PQ_WRONG_ARITY` | error | A function or aggregation was called with the wrong number of arguments (an unfilled slot such as `rate()` is reported as `incomplete` instead) |
| `PQ_WRONG_ARG_TYPE` | error | e.g. `rate()` called with an instant vector instead of a range vector. Quick fix: *Add range '[5m]'* for a plain selector |
| `PQ_UNKNOWN_FUNCTION` | warning (configurable) | An unrecognized function name — see `unknownFunctionSeverity` |
| `PQ_UNKNOWN_AGGREGATION` | error | Reserved for future use |
| `PQ_MISSING_LABEL_VALUE` | error | A label matcher's `=`/`!=`/`=~`/`!~` has no quoted value following it |
| `PQ_INVALID_LABEL_NAME` | error | Reserved for future use |
| `PQ_INVALID_VECTOR_MATCH` | error | e.g. `group_left`/`group_right` used with a set operator (`and`/`or`/`unless`) |
| `PQ_CONFLICTING_MODIFIERS` | error | Both `by` and `without` (or a repeated grouping clause) on one aggregation |
| `PQ_INVALID_BOOL_MODIFIER` | error | Reserved for future use |
| `PQ_UNTERMINATED_STRING` | — | Reserved; unterminated strings during mid-typing are handled as an *incomplete* state, not this code |
| `PQ_TOO_COMPLEX` | error | Nesting depth exceeded the configured guard (default 100) — a DoS/pathological-input safeguard |
| `PQ_QUERY_TOO_LONG` | info | Query exceeds `maxQueryLength` (default 10,000 chars); live validation was skipped |
| `PQ_EMPTY_LABEL_MATCHER_LIST` | — | Reserved for future use |
| `PQ_DUPLICATE_LABEL_MATCHER` | warning | The same label name appears twice in one matcher list |

## Deprecation policy

A diagnostic code is never removed or repurposed without a major version bump (per `CHANGELOG-GRAMMAR.md`'s separation from the package's own semver) — hosts are expected to build i18n'd or app-specific messaging keyed on `code`.
