# Diagnostic Codes

Branch on `code`, never on `message`. Messages can be reworded in any release (and translated through the editor's `messages.diagnostic`); codes only change in a major version.

Only the first syntax error in a query is reported. Semantic codes (`PQ_WRONG_ARITY`, `PQ_WRONG_ARG_TYPE`, …) are reported once the syntax is clean.

| Code | Severity | Meaning |
|---|---|---|
| `PQ_UNCLOSED_BRACKET` | error | A `(`, `{`, or `[` was never closed |
| `PQ_UNEXPECTED_TOKEN` | error | A token appeared where the grammar didn't expect one (including a repeated `offset`/`@` and a range with no selector, `rate([5m])`) |
| `PQ_UNEXPECTED_EOF` | error | Input ended where a primary expression was expected (surfaced only when *not* a recognized incomplete-typing shape) |
| `PQ_INVALID_DURATION` | error | A duration is malformed (`5m1h`: units out of order), missing (`x[`, followed by something else) or not positive (`x[-5m]`) |
| `PQ_WRONG_ARITY` | error | A function or aggregation was called with the wrong number of arguments (an unfilled slot such as `rate()` is reported as `incomplete` instead) |
| `PQ_WRONG_ARG_TYPE` | error | e.g. `rate()` called with an instant vector instead of a range vector. Quick fix: *Add range '[5m]'* for a plain selector |
| `PQ_UNKNOWN_FUNCTION` | warning (configurable) | An unrecognized function name; see `unknownFunctionSeverity`. Comes with a "Did you mean …?" suggestion and quick fix when a close match exists |
| `PQ_UNKNOWN_AGGREGATION` | error | Reserved for future use |
| `PQ_MISSING_LABEL_VALUE` | error | A label matcher's `=`/`!=`/`=~`/`!~` has no quoted value following it. Quick fix: *Insert an empty value ""* |
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

A diagnostic code is never removed or repurposed without a major version bump, so it's safe to build translated or app-specific messages keyed on `code`.
