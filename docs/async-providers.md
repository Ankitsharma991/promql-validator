# Async Suggestion Providers

For label values / metric names that only exist on your real metrics backend:

```tsx
<PromQLInput
  suggestionProvider={async (context, { signal }) => {
    if (context.astContext === 'label-value' && context.activeLabel === 'service') {
      const res = await fetch(`/api/services?prefix=${encodeURIComponent(context.tokenBeforeCursor)}`, { signal });
      return (await res.json()).map((s: string) => ({ label: s, value: s, category: 'service' }));
    }
    return [];
  }}
/>
```

## `SuggestionContext`

```ts
interface SuggestionContext {
  query: string;
  cursorPosition: number;
  tokenBeforeCursor: string;    // the partial text typed so far — works correctly even
                                 // mid-way through an in-progress quoted label value
  astContext: 'top-level' | 'function-arg' | 'label-name' | 'label-value' | 'duration' | 'operator' | 'aggregation-grouping' | 'unknown';
  activeLabel?: string;         // when astContext === 'label-value'
  activeMetric?: string;        // the metric name in scope, if determinable
}
```

## Cancellation & staleness — handled for you

- The debounce (`suggestionDebounceMs`, default 80ms) delays *invoking* your provider, not the synchronous built-in/static filtering, which stays instant.
- Every invocation gets a fresh `AbortController`; the previous in-flight call is aborted the moment a new one starts.
- A monotonically increasing request sequence number is a **second line of defense**: even if your provider ignores `signal` entirely, a response that resolves out of order is discarded, never rendered. You don't need to get this right in your own code for correctness — just for not wasting the network call.

## Loading / error states

While your provider is in flight, the popup shows a lightweight inline spinner appended to the already-known built-in/static results — typing and selecting an already-available result is never blocked. If your provider's promise rejects (and it wasn't an abort), `onSuggestionError` fires and the popup shows "Couldn't load suggestions" — this never surfaces as a validation error.

## Caching

Enabled by default (`suggestionProviderCache`, 30s TTL, 200-entry LRU, in-memory only — never `localStorage`, never sent anywhere). Disable per-instance for highly volatile data:

```tsx
<PromQLInput suggestionProvider={...} suggestionProviderCache={false} />
```

Or customize:

```tsx
<PromQLInput suggestionProviderCache={{ ttlMs: 5000, maxEntries: 50 }} />
```

## Using the async controller outside React

The debounce/cancellation/cache logic is framework-agnostic:

```ts
import { AsyncSuggestionController } from '@promql-validator/core';

const controller = new AsyncSuggestionController({ provider: myProvider, debounceMs: 80 });
const unsubscribe = controller.subscribe((state) => {
  // state: { status: 'idle' | 'loading' | 'success' | 'error', results, error? }
});
controller.request(context);
```
