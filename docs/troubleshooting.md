# Troubleshooting

## "Why isn't my suggestion appearing?"

1. **Check `astContext`.** Suggestions are strictly context-filtered — a PromQL function is never offered inside a label-value position, a host `dynamicSuggestions` group without `contexts` is never offered inside `label-name`/`duration` positions. Call `extractContext(query, cursorPosition)` directly (from `@promql-validator/core`) to see what context the cursor actually classified as.
2. **Check `contexts` scoping** on your `DynamicSuggestionGroup` — if you set `contexts: [{ astContext: 'label-value', activeLabel: 'service' }]`, that group is *only* offered when the label being typed is literally `service`.
3. **Check the typed prefix.** If `tokenBeforeCursor` is non-empty, only exact/prefix/alias matches (plus bounded fuzzy matches, if the candidate count is below `fuzzyMatchThreshold`) are shown — an unrelated value is correctly excluded, not a bug.
4. **Check category `enabled`/`priorityWeight`** in `suggestionCategories` — a category set to `enabled: false` is hidden entirely.

## SSR / hydration issues

The component never accesses `window`/`document` during render or module load — verified by a dedicated test suite that runs under a genuine Node environment (no jsdom) via `renderToString`. If you see a hydration mismatch, check that `value`/`defaultValue` is identical between server and client render (a client-only default like `Date.now()` would legitimately mismatch — that's not a package bug).

## "My async provider fires more than I expected"

The debounce (`suggestionDebounceMs`) delays *invoking* your provider after the last relevant context change (not just keystrokes) — a request may fire once on mount (empty-query context) in addition to once per meaningfully-different typed prefix. This is expected: each request is independently cancellable/cache-able, and stale responses are discarded automatically (see [Async Providers](./async-providers.md#cancellation--staleness--handled-for-you)).

## "Formatting didn't add line breaks in the editor"

Expected — see [Formatting](./formatting.md) and [Editor Component](./editor-component.md#why-input-not-textarea). The editor's single-line `<input>` can't hold a newline at all (browsers strip them); `formatPromQL()` itself fully supports multi-line output for non-UI use (CLI linting, rule-file formatting).

## Common false-positive validator reports

If you believe `validatePromQL` incorrectly flags a valid query (or misses a genuinely invalid one), please file it with the **exact query string** — see the "Bug report" issue template, which requires a minimal reproducing query. Grammar-correctness bugs are treated as high priority.
