# promql-validator

A PromQL editor and validator you can drop into any observability product: a React component with syntax highlighting, real validation, quick fixes and context-aware autocomplete, plus Monaco and CodeMirror 6 adapters and a framework-free core for servers and CI.

[![npm](https://img.shields.io/npm/v/promql-validator.svg)](https://www.npmjs.com/package/promql-validator)
[![license](https://img.shields.io/npm/l/promql-validator.svg)](./LICENSE)

```tsx
import PromQLInput from 'promql-validator';

<PromQLInput value={query} onChange={setQuery} aria-label="PromQL query" />;
```

One install, one import, one component. Default styles are included and can be changed through props, CSS variables or your own CSS.

Every team building a metrics product ends up rebuilding the same query box: a text field, some regex highlighting, a hand-rolled suggestion list, and "validation" that really means "did the backend accept it". This project packages that whole stack, built on a hand-written, error-tolerant PromQL parser that understands half-typed queries.

## Features

**Validation**

- Hand-written lexer and recursive-descent parser. Accepts and rejects the same queries Prometheus does, checked against a [conformance corpus](./packages/core/conformance/promql.json).
- Full PromQL coverage, including Prometheus 3 features: UTF-8 quoted names (`{"http.server.duration"}`), `@ start()` / `@ end()`, negative offsets, subqueries, number literals with `_` separators, plain-second durations (`[300]`) and duration expressions (`[5m * 2]`, `max_of(step(), 5s)`).
- Semantic checks: function and aggregation arity, range-vector arguments, vector matching, conflicting modifiers, out-of-order duration units.
- Understands queries while they're being typed: `rate(`, `sum()`, `up{job="` are reported as *incomplete*, not as errors.
- One error per mistake. Only the first syntax error is reported, like Prometheus.
- Stable diagnostic codes, line/column positions and one-click quick fixes (`rate(up)` → *Add range '[5m]'*).
- MetricsQL (VictoriaMetrics) dialect: `WITH` templates, `keep_metric_names` and extension functions.
- Custom validators and plugins that run alongside the built-in rules.

**Editor (React)**

- Live syntax highlighting with wavy underlines on errors, drawn over a native `<input>`, so typing, selection, undo, IME and screen readers all keep working.
- Suggestion popup with kind badges, match highlighting, a docs pane for the selected item and keyboard hints.
- Smart insertion: functions insert as `rate(|)`, and a metric picked inside a range function becomes `rate(metric[5m])`.
- Bracket and quote auto-closing, on-demand formatting and `onSubmit` on Enter.
- Light, dark and `system` themes, all driven by CSS custom properties.
- WCAG 2.1 AA: ARIA combobox pattern, full keyboard support, axe-tested in CI.
- i18n message catalog, opt-in telemetry hooks and a shared provider for pages with many editors.

**Autocomplete**

- Context-aware: functions where an expression goes, label names inside `{}` and `by (...)`, label values after `=`, durations inside `[]`.
- Built-in vocabulary: all 86 PromQL functions (experimental ones are labelled), 14 aggregations, operators and modifiers, plus 170 well-known label names, metric names and terms from Prometheus, node_exporter, Kubernetes, OpenTelemetry, span metrics and log-derived metrics.
- Your own data: static lists, dynamic groups (indexed for 100k+ values) and async providers with debouncing, cancellation, stale-response protection and caching.

**Everywhere else**

- `@promql-validator/core` runs in Node, browsers, Deno and workers with zero dependencies.
- Monaco and CodeMirror 6 adapters share the same core, so every surface behaves the same way.
- A CLI for linting query files and Prometheus rule files in CI.
- No network requests of its own, no telemetry by default, nothing persisted.

## Packages

| Package | What it is |
|---|---|
| [`promql-validator`](./packages/meta) | The React editor plus everything in core, and the `promql-validator` CLI. Start here. |
| [`@promql-validator/core`](./packages/core) | Parser, validator, formatter and suggestion engine. No React, no DOM, no dependencies. |
| [`@promql-validator/react`](./packages/react) | `<PromQLInput/>` on its own (the meta package re-exports it). |
| [`@promql-validator/monaco`](./packages/monaco) | PromQL language support for Monaco Editor. |
| [`@promql-validator/codemirror`](./packages/codemirror) | PromQL language support for CodeMirror 6. |

## Install

```bash
npm install promql-validator            # React editor + core + CLI
npm install @promql-validator/core      # validation, formatting and suggestions only, no React
```

The React packages need `react` and `react-dom` 18 or newer.

## Usage

### React editor

```tsx
import { useState } from 'react';
import { PromQLInput } from 'promql-validator';

export function QueryEditor() {
  const [query, setQuery] = useState('sum by (job) (rate(http_requests_total[5m]))');

  return (
    <PromQLInput
      value={query}
      onChange={setQuery}
      onSubmit={(q) => runQuery(q)}
      theme="system"
      dynamicSuggestions={[
        { category: 'job', values: ['api-server', 'checkout', 'payments'] },
        { category: 'namespace', values: namespaces },
      ]}
      aria-label="PromQL query"
    />
  );
}
```

### Validate without a UI

```ts
import { validatePromQL } from '@promql-validator/core';

validatePromQL('rate(http_requests_total[5m)');
// {
//   valid: false,
//   incomplete: false,
//   diagnostics: [{
//     severity: 'error', code: 'PQ_UNCLOSED_BRACKET',
//     message: "Expected closing ']' to match '[' opened at position 24.",
//     start: 27, end: 28, line: 1, column: 28
//   }]
// }

const { valid, incomplete } = validatePromQL(query);
if (valid && !incomplete) save(query);
```

### Load suggestions from your backend

```tsx
<PromQLInput
  suggestionProvider={async (context, { signal }) => {
    if (context.astContext !== 'label-value') return [];
    const res = await fetch(`/api/v1/label/${context.activeLabel}/values`, { signal });
    const { data } = await res.json();
    return data.map((v: string) => ({ label: v, value: v, category: context.activeLabel }));
  }}
/>
```

Requests are debounced, cancelled when the user keeps typing, cached for 30 seconds and protected against out-of-order responses.

### Monaco and CodeMirror

```ts
import { registerPromQLLanguage } from '@promql-validator/monaco';
registerPromQLLanguage(monaco, { sources: { dynamicSuggestions }, suggestionProvider });
```

```ts
import { promql } from '@promql-validator/codemirror';
new EditorView({ extensions: [promql({ completion: { sources: { dynamicSuggestions }, suggestionProvider } })] });
```

### Lint in CI

```bash
npx promql-validator lint queries.txt               # one query per line
npx promql-validator lint rules.yml --rules         # every expr: in a Prometheus rule file
npx promql-validator lint queries.txt --format json
```

The command exits with code 1 when any query is invalid.

## Documentation

The [`docs/`](./docs) folder covers everything in detail:

- [Installation](./docs/installation.md) · [Quick start](./docs/quick-start.md)
- [Editor component](./docs/editor-component.md): every prop, the ref API and keyboard shortcuts
- [Validation](./docs/validation.md) · [Diagnostic codes](./docs/diagnostic-codes.md) · [PromQL support](./docs/syntax-support.md)
- [Dynamic suggestions](./docs/dynamic-suggestions.md) · [Async providers](./docs/async-providers.md) · [Plugins](./docs/plugins.md)
- [Theming](./docs/theming.md) · [i18n](./docs/i18n.md) · [Telemetry hooks](./docs/telemetry.md) · [Accessibility](./docs/accessibility.md)
- [Monaco](./docs/monaco.md) · [CodeMirror](./docs/codemirror.md) · [CLI](./docs/cli.md) · [MetricsQL](./docs/metricsql.md) · [Formatting](./docs/formatting.md)
- [Performance](./docs/performance.md) · [Security & privacy](./docs/security-privacy.md) · [Compatibility & support](./docs/compatibility.md) · [Roadmap](./docs/roadmap.md)

## Examples

- [`examples/vite-react-ts`](./examples/vite-react-ts): the editor with dynamic and async suggestions, formatting and worker mode, plus the Monaco and CodeMirror adapters side by side.
- [`examples/nextjs-app-router`](./examples/nextjs-app-router) and [`examples/nextjs-pages-router`](./examples/nextjs-pages-router): server-rendered pages with the editor as a client component.

```bash
npm install && npm run build
npm run dev --workspace=examples/vite-react-ts
```

## Development

```bash
npm install
npm run build        # build every package
npm test             # unit, component, conformance and accessibility tests
npm run typecheck
npm run lint
npm run size         # bundle size budgets
npm run e2e          # Playwright, against the Vite example
npm run benchmark    # latency benchmarks
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how the repo is organised and how to add functions, tests and changesets.

## Author

Built and maintained by **Ankit Sharma**.

- GitHub: [@ankitsharma991](https://github.com/Ankitsharma991)
- Portfolio: [ankitsharma991.com.np](https://ankitsharma991.com.np)
- Email: [sharmaa7861@gmail.com](mailto:sharmaa7861@gmail.com)

Bug reports and pull requests are welcome on [GitHub](https://github.com/Ankitsharma991/promql-validator/issues). For security issues, see [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © Ankit Sharma
