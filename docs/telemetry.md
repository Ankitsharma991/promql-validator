# Telemetry Hooks

If you run the editor inside a product, you may want to monitor it like the rest of your stack: how long validation takes, how big suggestion lists get, how often your suggestion backend fails. `telemetryHooks` gives you those events.

```tsx
<PromQLInput
  instanceId="dashboard-panel-7"
  telemetryHooks={{
    onValidation: (e) => histogram('promql_editor_validation_ms', e.durationMs, { valid: e.valid }),
    onSuggestionQuery: (e) => histogram('promql_editor_suggest_ms', e.durationMs),
    onSuggestionProviderError: (e) => counter('promql_editor_provider_errors_total').inc(),
  }}
/>
```

## Events

| Hook | Payload | When |
|---|---|---|
| `onValidation` | `{ durationMs, valid, incomplete, diagnosticCount, instanceId? }` | After each validation pass. `durationMs` is the validation itself, not the debounce delay. |
| `onSuggestionQuery` | `{ durationMs, resultCount, instanceId? }` | After suggestions are filtered and ranked for the cursor position. |
| `onSuggestionProviderError` | `{ error, instanceId? }` | When your `suggestionProvider` rejects. |

## Privacy guarantees

- **Off by default.** Nothing is called unless you pass `telemetryHooks`.
- **No query content.** Payloads contain timings, counts, booleans and your own `instanceId`, never query text or suggestion values. A test checks this.
- **No network.** The hooks are plain function calls in your process. Whatever you do with the events is up to you.

`instanceId` is optional. Use it to tell editors apart when a page has many of them.
