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

## "A valid query is shown as incomplete"

`incomplete: true` means the query has an unfinished part: an unclosed bracket, an operator with nothing after it, or an empty slot such as `rate()` or `x[]`. The editor shows *Insert missing ')'* when the fix is unambiguous. Check `valid && !incomplete` before running or saving a query.

## "Errors don't appear while I'm typing"

That's deliberate in two places. Validation waits `validationDebounceMs` (150 ms) after the last keystroke, and while the suggestion popup is open, an error on the word you're still typing is held back until you finish. `onValidation` always receives the full result.

## "A newer Prometheus function is flagged as unknown"

Unknown functions are warnings, not errors. Add the name with `customFunctions={['new_fn']}` until the dictionary catches up, and please open an issue so it can be added.

## "Highlighting is misaligned with the text"

The highlight layer has to use the same font as the input. If you override fonts, set `--promql-input-font-family`, `--promql-input-font-size` and `--promql-input-line-height` rather than styling the `<input>` directly. Use `syntaxHighlighting={false}` to turn the layer off.

## Common false-positive validator reports

If `validatePromQL` flags a query that Prometheus accepts (or accepts one Prometheus rejects), please open an issue with the **exact query** and your Prometheus version. Correctness bugs are fixed first, and each fix adds the query to the conformance corpus.
