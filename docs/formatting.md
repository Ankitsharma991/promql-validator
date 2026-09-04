# Formatting

```ts
import { formatPromQL, PromQLFormatError } from '@promql-validator/core';

formatPromQL('rate(x[5m])');
// 'rate(x[5m])'

formatPromQL('sum by (service,namespace) (rate(http_requests_total{service="api"}[5m]))');
// canonical spacing: 'sum by (service, namespace) (rate(http_requests_total{service="api"}[5m]))'
```

## Guarantees

- **Deterministic and idempotent**: `formatPromQL(formatPromQL(q)) === formatPromQL(q)` — enforced as a test invariant across the full fixture corpus.
- **Semantics-preserving**: operates on the parsed AST and re-serializes it; never string-manipulates in a way that could change meaning.
- **Never guesses**: throws `PromQLFormatError` on a query with syntax errors or an incomplete expression, rather than silently producing something wrong.

## Options

```ts
interface FormatOptions {
  indentSize?: number;                    // default: 2
  indentStyle?: 'space' | 'tab';          // default: 'space'
  maxInlineWidth?: number;                // default: 80 — beyond this, an aggregation body breaks onto multiple lines
}
```

Multi-line output example (core library / non-UI consumers):

```
sum by (service, namespace) (
  rate(http_requests_total{service="api"}[5m])
)
```

## In the editor component

`<PromQLInput/>`'s editable surface is a single-line `<input>` (see [Editor Component](./editor-component.md) for why — it's an ARIA-correctness requirement, not an oversight). `.format()` / `formatShortcut` / `formatOnBlur` / `formatOnPaste` all apply `formatPromQL()` and then collapse any resulting line breaks to single spaces before writing the value back — the canonical spacing (`, ` between labels, etc.) is still visible; only the line-break layout is not, since an `<input>` cannot hold one at all.

## Live vs. explicit

The editor **never** reflows or reformats while you're actively typing — only bracket-pairing is live. Formatting only ever runs on explicit intent: the keyboard shortcut, `formatOnBlur`, `formatOnPaste` (all opt-in, default off except the shortcut), or a programmatic `.format()` call.
