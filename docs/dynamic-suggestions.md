# Dynamic Suggestions

Host-supplied, synchronously-available data (services, namespaces, pods, containers, anything your app already has in memory or fetched once) — re-computed only when the array *reference* changes, not on every keystroke.

```tsx
<PromQLInput
  dynamicSuggestions={[
    { category: 'service', values: services },      // string[] or Suggestion[]
    { category: 'namespace', values: namespaces },
    { category: 'container', values: containers, contexts: [{ astContext: 'label-value', activeLabel: 'container' }] },
  ]}
/>
```

## Scoping with `contexts`

Without `contexts`, a group is offered wherever host data generally makes sense (`top-level`, `function-arg`, `label-value`) — never inside `label-name` or `duration` positions, since host data is virtually never a label name or a time unit. For precise scoping (e.g., only offer `container` values when the label being typed is literally `container`), add `contexts`:

```ts
contexts: [{ astContext: 'label-value', activeLabel: 'container' }]
```

## Large datasets (1k–100k+ values)

No special configuration needed — arrays above ~500 items automatically route through a memoized, sorted-prefix index (binary-search lookup) instead of a full linear scan. Real measured numbers (`node scripts/benchmark.mjs`):

| Candidates | Typed-prefix lookup (warm) | Empty-prefix lookup (warm) |
|---|---|---|
| 1,000 | ~0.01ms | ~0.12ms |
| 10,000 | ~0.015ms | ~0.32ms |
| 100,000 | ~0.009ms | ~0.18ms |

The index itself costs ~34ms to build once for 100,000 items — paid only when the array *reference* changes (e.g. fresh data from your backend), never per keystroke. **Keep the array reference stable** (e.g. via `useMemo`/`useState`, not a fresh `.map()` on every render) to get this for free.

## Data ownership

The package never deep-clones your arrays — it reads them and builds a lightweight index alongside (garbage-collected automatically via `WeakMap` once you stop referencing the array). Passing a fresh array reference every render is safe but wasteful (forces a full re-index); passing a stable reference and only replacing it when the underlying data actually changes is the recommended pattern.

## Shorthand strings

```tsx
suggestions={['production', 'staging']}
```
normalizes to `{ label: 'production', value: 'production', category: 'custom' }` internally.
