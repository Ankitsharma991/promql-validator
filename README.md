# promql-validator

An embeddable, framework-integrated (React-first) PromQL and monitoring-query editing toolkit: real grammar-based validation with typing-tolerant error recovery, context-aware autocomplete that blends built-in PromQL knowledge with your own live infrastructure data, automatic bracket/quote completion, on-demand formatting, and a small, accessible, fully themeable UI.

It is a `npm install` away, not a fork of Grafana or a Monaco language-service build-out.

## Why

Every team building a metrics/observability product ends up re-building the same query-input stack: a text field, ad hoc syntax highlighting, a hand-rolled autocomplete list, and "validation" that's really just "did the backend accept it." `promql-validator` centralizes that into one well-tested package built on a real, hand-written, error-tolerant PromQL parser — not regex.

## Install

```bash
npm install promql-validator
# or, validation-only / no React:
npm install @promql-validator/core
```

Peer dependencies (the React package): `react >= 18`, `react-dom >= 18`.

## Quick start

```tsx
import { PromQLInput } from 'promql-validator';
import 'promql-validator/styles.css';

function App() {
  const [query, setQuery] = useState('rate(http_requests_total[5m])');
  return <PromQLInput value={query} onChange={setQuery} aria-label="PromQL query" />;
}
```

That's it — validation, built-in PromQL/monitoring autocomplete, and bracket completion work with zero further configuration.

## Validation without React

```ts
import { validatePromQL } from '@promql-validator/core';

const result = validatePromQL('rate(http_requests_total[5m)');
// { valid: false, incomplete: false, diagnostics: [{ code: 'PQ_UNCLOSED_BRACKET', ... }] }
```

Useful for CI linting of saved recording rules, server-side validation, etc. — no DOM, no React.

## Dynamic (host) suggestions

```tsx
<PromQLInput
  dynamicSuggestions={[
    { category: 'service', values: services },
    { category: 'namespace', values: namespaces },
  ]}
/>
```

## Async suggestion providers

```tsx
<PromQLInput
  suggestionProvider={async (context, { signal }) => {
    if (context.astContext === 'label-value' && context.activeLabel === 'service') {
      const res = await fetch(`/api/services?prefix=${context.tokenBeforeCursor}`, { signal });
      return (await res.json()).map((s: string) => ({ label: s, value: s, category: 'service' }));
    }
    return [];
  }}
/>
```

Stale, out-of-order responses are discarded automatically (a request-sequence guard backs up `AbortSignal`, since we can't force host code to honor it).

## Formatting

```ts
import { formatPromQL } from '@promql-validator/core';
formatPromQL('rate(x[5m])'); // deterministic, idempotent, semantics-preserving
```

## Custom validators

```tsx
<PromQLInput
  validators={[
    (ast, query) => (query.includes('forbidden_metric') ? [{ severity: 'error', code: 'ORG_FORBIDDEN_METRIC', message: 'This metric is not allowed.', start: 0, end: query.length, line: 1, column: 1 }] : []),
  ]}
/>
```

Custom validators run **alongside** the built-in one (composable) unless you opt out entirely with `disableBuiltInValidation`.

## Theming

```tsx
<PromQLInput theme={{ base: 'dark', tokens: { '--promql-input-radius': '4px' } }} />
```

Everything is CSS custom properties (`--promql-input-*`, `--promql-suggestion-*`, `--promql-diagnostics-*`) — no CSS-in-JS runtime, no forced brand colors. See `packages/react/src/theme/styles.css` for the full token list.

## Architecture

```
promql-validator            (meta package — re-exports @promql-validator/react)
@promql-validator/core      (parser, validator, formatter, suggestion engine — zero deps, no React/DOM)
@promql-validator/react     (<PromQLInput/>, popup, theming, a11y, keyboard nav — React peer dep)
```

The core is a **hand-written, error-tolerant recursive-descent PromQL parser** (not regex, not a generic parser-generator). It's error-tolerant specifically so that a query still being typed (`rate(`, `metric{`, `metric{label=`) produces a partial AST and useful, context-aware autocomplete — not just "syntax error." See `packages/core/src/parser/parser.ts`.

## Privacy

- Zero network requests made by the package itself. All network activity (async suggestion providers) is code you write.
- No telemetry, analytics, or usage tracking.
- Query text is never persisted outside in-memory component state and an optional, opt-out-able in-memory suggestion cache (never `localStorage`, never sent anywhere).

## Browser / Node support

Last 2 versions of evergreen browsers (Chrome, Firefox, Safari, Edge); Node ≥ 18 for `@promql-validator/core` (CLI/server use). No IE11.

## Environment variables

None. The package needs no configuration, API keys, or environment variables to function — every core capability (parsing, validation, formatting, built-in autocomplete) runs fully offline. If you wire up your own `suggestionProvider` against a real backend, any credentials that requires are entirely your own code's concern, not this package's.

## Repository layout

```
packages/
  core/    @promql-validator/core   — parser, validator, formatter, suggestion engine
  react/   @promql-validator/react  — <PromQLInput/>
  meta/    promql-validator         — convenience re-export
examples/
docs/
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Security issues: see [SECURITY.md](./SECURITY.md).

## License

MIT — see [LICENSE](./LICENSE).
