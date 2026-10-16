# Performance

## Measured numbers

Run `node --expose-gc scripts/benchmark.mjs` (after `npm run build`) from the repo root to reproduce these against the *built* package — nothing here is invented.

### Validation latency

| Query | p50 | p95 | p99 |
|---|---|---|---|
| `up` (2 chars) | 0.007ms | 0.021ms | 0.035ms |
| 97-char medium query | 0.027ms | 0.049ms | 0.159ms |
| 389-char large query (8 chained terms) | 0.049ms | 0.082ms | 0.215ms |
| 301-char pathological nesting (150 levels deep) | 0.136ms | 0.270ms | 0.450ms |

All comfortably inside the <5ms per-parse budget with large margin — the 150ms default validation debounce is "wait for the user to pause," not "wait for computation."

### Suggestion filter+rank latency (label-value context)

| Candidates | Empty prefix (warm) | Typed prefix (warm) |
|---|---|---|
| 100 | 0.085ms | 0.099ms |
| 1,000 | 0.129ms | 0.015ms |
| 10,000 | 0.330ms | 0.027ms |
| 100,000 | 0.185ms | 0.013ms |

"Warm" means the source array's index has already been built (the normal steady-state case — see [Dynamic Suggestions](./dynamic-suggestions.md)). One-time index-build cost for a *fresh* array reference:

| Items | Cold build p50 |
|---|---|
| 1,000 | 0.716ms |
| 10,000 | 3.323ms |
| 100,000 | 37.394ms |

This is paid once per array reference, not per keystroke — keep dynamic-suggestion arrays referentially stable across renders to get the warm numbers.

## Techniques in use

- **Debouncing** (150ms validation, 80ms async suggestions) is the single biggest lever — it eliminates redundant work on every keystroke of a fast typist. Synchronous built-in/static filtering is *not* debounced (it's fast enough to run on every keystroke directly).
- **Indexing**: source arrays above 500 items are indexed once (sorted-by-value + binary search for prefix lookup) and memoized per array reference via `WeakMap` — automatic garbage collection, no manual cache eviction.
- **Rendered-item cap**: only the top `maxSuggestions` (default 50) ranked results are ever mounted to the DOM, regardless of how many thousands of candidates matched.
- **Bounded fuzzy matching**: only attempted when the remaining unmatched-candidate count is below `fuzzyMatchThreshold` (default 500), and uses a linear-time subsequence scorer (no regex backtracking risk).
- **Module-level built-in dictionaries**: indexed once per process/page-load, shared immutably across every component instance.

## Optional escalations (opt-in, not defaults — the numbers above show the main thread isn't the bottleneck at realistic scale)

- **Web Worker offload** (`useWorker` prop): built-in syntax/semantic validation runs in a Web Worker instead of the main thread. Ships as a fully self-contained, separately-built bundle (`dist/worker.mjs`, `@promql-validator/core` inlined so no bare-specifier resolution is needed inside a plain `new Worker(url)`) — loaded only when `useWorker` is actually set, falls back transparently to the main thread if `Worker` isn't available (SSR, older environments) or the worker fails. Custom `validators` (plain JS functions can't cross a `postMessage` boundary) still run on the main thread against a fresh, cheap re-parse.
- **Virtualized suggestion list** (`suggestionListMode="virtualized"`): renders via `@tanstack/react-virtual`, an **optional peer dependency** loaded through `React.lazy()` in its own bundler-split chunk — verified (via bundle inspection) to never appear in the main `dist/index.mjs`, so it costs nothing for the default `ranked-cap` mode. Useful when a host specifically wants to let users scroll through hundreds/thousands of candidates rather than relying on ranking to surface the top ~50.
