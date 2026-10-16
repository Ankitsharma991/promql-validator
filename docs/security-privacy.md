# Security & Privacy

## Privacy commitments

- **Zero network requests made by the package itself.** All network activity (async suggestion providers) is code you write and control.
- **No telemetry by default.** The optional [`telemetryHooks`](./telemetry.md) prop calls *your* functions with timings and counts only, never query text, and nothing fires unless you pass it.
- The no-network rule is enforced by a test that scans every published source file for network APIs (`fetch`, `XMLHttpRequest`, `WebSocket`, …) and fails the build if one appears.
- Everything works offline and in air-gapped environments: parsing, validation, formatting and the built-in dictionaries need nothing external.
- Query text is never persisted outside in-memory component state and the optional, opt-out-able in-memory suggestion cache (never `localStorage`, cookies, or the network; cleared on unmount).
- "Recently used suggestions" ranking (`trackRecentlyUsed`) is off by default and, when enabled, is session-memory only, scoped to that one component instance — never persisted across reloads, never touches `localStorage`.

## Security review

| Risk | Mitigation |
|---|---|
| XSS via suggestion `label`/`description`/`detail` content | Rendered as plain React text nodes, never `dangerouslySetInnerHTML`. Icons are looked up via a host-provided `iconMap` keyed by string identifier, never by rendering host-provided markup. |
| Malicious/huge suggestion payloads | Async provider output (in the React component and both editor adapters) is validated at runtime: malformed entries are dropped one by one, and `label`/`value`/`detail` are capped at 200 characters and `description` at 500. |
| ReDoS | The fuzzy matcher is a bounded, linear-time subsequence algorithm — **not** a regex-based fuzzy matcher, specifically to avoid catastrophic-backtracking risk. Covered by a fuzz test suite (500+ randomized inputs) asserting the validator never throws. |
| Pathological input (deeply nested brackets, huge single tokens) | The parser enforces a max nesting depth (100, `PQ_TOO_COMPLEX`) and a `maxQueryLength` guard (10,000 chars default, `PQ_QUERY_TOO_LONG`) rather than recursing/scanning unbounded. |
| Dependency supply-chain risk | `@promql-validator/core` has zero runtime dependencies. The other packages depend only on core plus their framework as a peer. Releases are published with npm provenance and a CycloneDX SBOM per package. |

## Reporting a vulnerability

See [SECURITY.md](https://github.com/Ankitsharma991/promql-validator/blob/main/SECURITY.md). For a security review, [THREAT_MODEL.md](https://github.com/Ankitsharma991/promql-validator/blob/main/THREAT_MODEL.md) describes data flows, trust boundaries and mitigations.
