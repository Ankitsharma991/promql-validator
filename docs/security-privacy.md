# Security & Privacy

## Privacy commitments

- **Zero network requests made by the package itself.** All network activity (async suggestion providers) is code you write and control.
- **No telemetry, analytics, or usage tracking** of any kind, ever.
- Query text is never persisted outside in-memory component state and the optional, opt-out-able in-memory suggestion cache (never `localStorage`, cookies, or the network; cleared on unmount).
- "Recently used suggestions" ranking (`trackRecentlyUsed`) is off by default and, when enabled, is session-memory only, scoped to that one component instance — never persisted across reloads, never touches `localStorage`.

## Security review

| Risk | Mitigation |
|---|---|
| XSS via suggestion `label`/`description`/`detail` content | Rendered as plain React text nodes, never `dangerouslySetInnerHTML`. Icons are looked up via a host-provided `iconMap` keyed by string identifier, never by rendering host-provided markup. |
| Malicious/huge suggestion payloads | Suggestion label/value length is truncated (200 chars) before rendering; async provider output is defensively validated/coerced at runtime — malformed entries (wrong types, missing fields) are dropped per-item, never crash the component. |
| ReDoS | The fuzzy matcher is a bounded, linear-time subsequence algorithm — **not** a regex-based fuzzy matcher, specifically to avoid catastrophic-backtracking risk. Covered by a fuzz test suite (500+ randomized inputs) asserting the validator never throws. |
| Pathological input (deeply nested brackets, huge single tokens) | The parser enforces a max nesting depth (100, `PQ_TOO_COMPLEX`) and a `maxQueryLength` guard (10,000 chars default, `PQ_QUERY_TOO_LONG`) rather than recursing/scanning unbounded. |
| Dependency supply-chain risk | `@promql-validator/core` has zero runtime dependencies. `@promql-validator/react` depends only on `@promql-validator/core` plus `react`/`react-dom` as peers. |

## Reporting a vulnerability

See [SECURITY.md](https://github.com/promql-validator/promql-validator/blob/main/SECURITY.md) in the repository root.
